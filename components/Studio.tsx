"use client";

import { useRef, useState } from "react";
import type { Message } from "@/lib/context";
import { trimContext } from "@/lib/context";
import { runMock } from "@/lib/ai";
import ChatPanel from "./ChatPanel";
import Toolbar from "./Toolbar";
import TokenMeter from "./TokenMeter";
import ThemeToggle from "./ThemeToggle";

const SYSTEM_PROMPT =
  "你是一个简洁高效的 AI 创作助手。用户输入零散的想法、笔记或需求，请用清晰的结构化中文给出结果。" +
  "当用户要求计算时，调用 calculator 工具；当用户询问时间时，调用 current_time 工具。回答精炼、可执行。";

type Metrics = {
  inputTokens: number;
  outputTokens: number;
  cost: number;
  durationMs: number;
  model: string;
};

export default function Studio() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [useTools, setUseTools] = useState(true);
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [mode, setMode] = useState<"idle" | "live" | "offline">("idle");

  const assistantIdx = useRef<number>(-1);
  const abortRef = useRef<AbortController | null>(null);

  async function send() {
    const text = input.trim();
    if (!text || loading) return;

    const userMsg: Message = { role: "user", content: text };
    const assistantMsg: Message = { role: "assistant", content: "" };

    const next = [...messages, userMsg, assistantMsg];
    setMessages(next);
    assistantIdx.current = next.length - 1;
    setInput("");
    setLoading(true);
    setMetrics(null);

    const payload = trimContext(next, SYSTEM_PROMPT);
    const ac = new AbortController();
    abortRef.current = ac;

    try {
      // 离线演示：纯前端逐 token 生成，无需服务端，打开即见效果
      await runMock({
        messages: [{ role: "system", content: SYSTEM_PROMPT }, ...payload.messages],
        apiKey: "",
        baseUrl: "",
        model: "mock-offline",
        useTools,
        signal: ac.signal,
        onEvent: applyEvent,
      });
    } catch (err: any) {
      if (err?.name !== "AbortError") {
        setMessages((m) => {
          const cp = [...m];
          const i = assistantIdx.current;
          if (i >= 0 && cp[i]) cp[i] = { ...cp[i], content: cp[i].content + `\n⚠️ 错误：${err?.message || "调用失败"}` };
          return cp;
        });
      }
    } finally {
      setLoading(false);
      abortRef.current = null;
    }
  }

  function applyEvent(evt: any) {
    switch (evt.type) {
      case "token":
        setMessages((m) => {
          const cp = [...m];
          const i = assistantIdx.current;
          if (i >= 0 && cp[i]) cp[i] = { ...cp[i], content: cp[i].content + evt.value };
          return cp;
        });
        break;
      case "tool":
        setMessages((m) => {
          const cp = [...m];
          const i = assistantIdx.current;
          if (i >= 0 && cp[i]) {
            const tcs = cp[i].toolCalls ? [...cp[i].toolCalls] : [];
            const exist = tcs.find((t) => t.id === evt.id);
            if (exist) exist.result = evt.result;
            else tcs.push({ id: evt.id, name: evt.name, args: evt.args, result: evt.result });
            cp[i] = { ...cp[i], toolCalls: tcs };
          }
          return cp;
        });
        break;
      case "meta":
        setMetrics({
          inputTokens: evt.inputTokens,
          outputTokens: evt.outputTokens,
          cost: evt.cost,
          durationMs: evt.durationMs,
          model: evt.model,
        });
        setMode(evt.model === "mock-offline" ? "offline" : "live");
        break;
      case "error":
        setMessages((m) => {
          const cp = [...m];
          const i = assistantIdx.current;
          if (i >= 0 && cp[i]) cp[i] = { ...cp[i], content: cp[i].content + `\n⚠️ ${evt.message}` };
          return cp;
        });
        break;
    }
  }

  function stop() {
    abortRef.current?.abort();
    setLoading(false);
  }

  return (
    <main className="aurora min-h-[100dvh] px-4 py-6 md:px-8">
      <div className="mx-auto flex max-w-6xl flex-col gap-4">
        {/* 顶栏 */}
        <header className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold tracking-tight md:text-2xl">
              AI 创作工作台
              <span className="ml-2 text-sm font-normal text-[var(--muted)]">轻量版</span>
            </h1>
            <p className="text-xs text-[var(--muted)]">
              流式 · Token 成本 · 工具调用 · 上下文管理
            </p>
          </div>
          <ThemeToggle />
        </header>

        <Toolbar useTools={useTools} onToggleTools={setUseTools} mode={mode} />

        {/* 主体：桌面双栏，移动单列 */}
        <div className="grid min-h-0 flex-1 grid-cols-1 gap-4 lg:grid-cols-[1fr_300px]">
          <ChatPanel
            messages={messages}
            input={input}
            loading={loading}
            onInput={setInput}
            onSend={send}
            onStop={stop}
          />
          <aside className="flex flex-col gap-4">
            <TokenMeter metrics={metrics} />
            <div className="glass rounded-2xl p-4 text-xs leading-relaxed text-[var(--muted)]">
              <p className="mb-1 font-medium text-[var(--fg)]">演示要点</p>
              未配置 <code className="font-mono">AI_API_KEY</code> 时自动进入离线兜底，打开即见效果；
              配置后切换真实模型流式输出，并支持工具调用与上下文窗口化。
            </div>
          </aside>
        </div>
      </div>
    </main>
  );
}
