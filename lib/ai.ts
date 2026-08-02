// AI 客户端封装：OpenAI 兼容流式调用 + function calling 多轮闭环 + 离线兜底
import { estimateTokens, calcCost } from "./token";
import { TOOLS, executeTool } from "./tools";
import type { Message } from "./context";

export type AgentEvent =
  | { type: "token"; value: string }
  | { type: "tool"; id: string; name: string; args: string; result: string }
  | {
      type: "meta";
      inputTokens: number;
      outputTokens: number;
      model: string;
      cost: number;
      durationMs: number;
    }
  | { type: "error"; message: string };

interface RunArgs {
  messages: Message[]; // 含完整对话（含已发生的 tool 视图）用于重建 API 消息
  apiKey: string;
  baseUrl: string;
  model: string;
  useTools: boolean;
  signal?: AbortSignal;
  onEvent: (e: AgentEvent) => void;
}

// 把展示用 Message 转成 OpenAI API 消息
function toApiMessages(messages: Message[]) {
  return messages
    .filter((m) => m.role !== "system") // system 单独处理
    .map((m) => {
      if (m.role === "tool") {
        return {
          role: "tool" as const,
          tool_call_id: m.toolCallId ?? "call_local",
          name: m.name ?? "tool",
          content: m.content,
        };
      }
      if (m.role === "assistant" && m.toolCalls?.length) {
        return {
          role: "assistant" as const,
          content: m.content || null,
          tool_calls: m.toolCalls.map((tc) => ({
            id: tc.id,
            type: "function" as const,
            function: { name: tc.name, arguments: tc.args },
          })),
        };
      }
      return { role: m.role, content: m.content };
    });
}

// 单次流式补全，返回累积的 tool_calls
async function streamOnce(args: {
  apiKey: string;
  baseUrl: string;
  model: string;
  apiMessages: any[];
  useTools: boolean;
  signal?: AbortSignal;
  onContent: (s: string) => void;
}) {
  const url = args.baseUrl.replace(/\/$/, "") + "/chat/completions";
  const body: any = {
    model: args.model,
    messages: args.apiMessages,
    stream: true,
    temperature: 0.7,
  };
  if (args.useTools) body.tools = TOOLS;

  const res = await fetch(url, {
    method: "POST",
    signal: args.signal,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${args.apiKey}`,
    },
    body: JSON.stringify(body),
  });
  if (!res.ok || !res.body) {
    const txt = await res.text().catch(() => "");
    throw new Error(`API ${res.status}: ${txt.slice(0, 240)}`);
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buf = "";
  const acc = new Map<number, { id: string; name: string; args: string }>();
  let content = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buf += decoder.decode(value, { stream: true });
    let nl: number;
    while ((nl = buf.indexOf("\n")) >= 0) {
      const line = buf.slice(0, nl).trim();
      buf = buf.slice(nl + 1);
      if (!line.startsWith("data:")) continue;
      const data = line.slice(5).trim();
      if (data === "[DONE]") continue;
      let json: any;
      try {
        json = JSON.parse(data);
      } catch {
        continue;
      }
      const delta = json.choices?.[0]?.delta;
      if (!delta) continue;
      if (delta.content) {
        content += delta.content;
        args.onContent(delta.content);
      }
      if (delta.tool_calls) {
        for (const tc of delta.tool_calls) {
          const i = tc.index ?? 0;
          const cur = acc.get(i) ?? { id: "", name: "", args: "" };
          if (tc.id) cur.id = tc.id;
          if (tc.function?.name) cur.name = tc.function.name;
          if (tc.function?.arguments) cur.args += tc.function.arguments;
          acc.set(i, cur);
        }
      }
    }
  }

  const toolCalls = [...acc.values()].map((a) => ({
    id: a.id || "call_" + Math.random().toString(36).slice(2),
    name: a.name,
    arguments: a.args,
  }));
  return { content, toolCalls };
}

export async function runAgent(a: RunArgs) {
  const t0 = Date.now();
  const systemMsg = a.messages.find((m) => m.role === "system");
  const apiMessages: any[] = [];
  if (systemMsg) apiMessages.push({ role: "system", content: systemMsg.content });
  apiMessages.push(...toApiMessages(a.messages));

  let inputTokens = estimateTokens(
    apiMessages.map((m) => (typeof m.content === "string" ? m.content : "") + (m.name ?? "")).join("\n")
  );
  let outputTokens = 0;
  let lastAssistant: { content: string; toolCalls: any[] } = { content: "", toolCalls: [] };

  try {
    // 最多两轮工具调用闭环
    for (let round = 0; round < 3; round++) {
      const r = await streamOnce({
        apiKey: a.apiKey,
        baseUrl: a.baseUrl,
        model: a.model,
        apiMessages,
        useTools: a.useTools,
        signal: a.signal,
        onContent: (s) => a.onEvent({ type: "token", value: s }),
      });
      outputTokens += estimateTokens(r.content);
      lastAssistant = r;

      if (r.toolCalls.length && a.useTools) {
        // 助手消息带上 tool_calls
        apiMessages.push({
          role: "assistant",
          content: r.content || null,
          tool_calls: r.toolCalls.map((t) => ({
            id: t.id,
            type: "function",
            function: { name: t.name, arguments: t.arguments },
          })),
        });
        for (const tc of r.toolCalls) {
          let parsed: any = {};
          try {
            parsed = JSON.parse(tc.arguments || "{}");
          } catch {
            parsed = { raw: tc.arguments };
          }
          const result = executeTool(tc.name, parsed);
          a.onEvent({
            type: "tool",
            id: tc.id,
            name: tc.name,
            args: tc.arguments || "{}",
            result,
          });
          outputTokens += estimateTokens(String(result));
          apiMessages.push({
            role: "tool",
            tool_call_id: tc.id,
            name: tc.name,
            content: String(result),
          });
        }
        continue; // 带着工具结果再问一次
      }
      break;
    }

    a.onEvent({
      type: "meta",
      inputTokens,
      outputTokens,
      model: a.model,
      cost: calcCost(a.model, inputTokens, outputTokens),
      durationMs: Date.now() - t0,
    });
  } catch (err: any) {
    a.onEvent({ type: "error", message: err?.message || "调用失败" });
  }
}

// 离线兜底：无 API Key 时逐 token 吐出示例回答，可模拟一次工具调用
export async function runMock(a: RunArgs) {
  const t0 = Date.now();
  const lastUser = [...a.messages].reverse().find((m) => m.role === "user");
  const text = lastUser?.content ?? "";
  const inputTokens = estimateTokens(text);
  const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

  const wantsCalc =
    a.useTools && /计算|算一下|calculate|=|[\d.]+(\s*[+\-*/]\s*[\d.]+)+/.test(text);

  if (wantsCalc) {
    const m = text.match(/[\d.]+(\s*[+\-*/]\s*[\d.]+)+/);
    if (m) {
      const expr = m[0];
      const result = executeTool("calculator", { expression: expr });
      a.onEvent({
        type: "tool",
        id: "call_demo",
        name: "calculator",
        args: JSON.stringify({ expression: expr }),
        result: String(result),
      });
      await sleep(150);
    }
  }

  const answer =
    `（离线演示模式）已收到你的输入：${text.slice(0, 40) || "（空）"}…\n\n` +
    `这是一个无需 API Key 也能运行的兜底响应，用于展示「文本 → 结果」的流式体验。` +
    (wantsCalc ? `\n工具调用结果已在上方面板展示。` : "") +
    `\n配置 AI_API_KEY 后将切换为真实模型流式输出，并支持 function calling 与上下文管理。`;

  // 逐 token（按字符块）吐出
  for (let i = 0; i < answer.length; i += 2) {
    if (a.signal?.aborted) break;
    a.onEvent({ type: "token", value: answer.slice(i, i + 2) });
    await sleep(12);
  }

  const outputTokens = estimateTokens(answer);
  a.onEvent({
    type: "meta",
    inputTokens,
    outputTokens,
    model: "mock-offline",
    cost: 0,
    durationMs: Date.now() - t0,
  });
}
