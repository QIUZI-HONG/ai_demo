// 上下文窗口管理：滚动历史 + 超限截断/摘要
import { estimateTokens } from "./token";

export type Role = "system" | "user" | "assistant" | "tool";
export interface Message {
  role: Role;
  content: string;
  // tool 调用可视化用
  toolCalls?: ToolCallView[];
  name?: string; // tool 消息的 tool 名
  toolCallId?: string; // tool 消息关联的 tool_call_id
}

export interface ToolCallView {
  id: string;
  name: string;
  args: string;
  result?: string;
}

export interface ContextState {
  messages: Message[];
  truncated: boolean;
  keptRounds: number;
  summary?: string;
}

const MAX_TOKENS = 6000; // 演示用上限

// 估算一组消息的 token 占用
export function countTokens(messages: Message[]): number {
  return messages.reduce(
    (sum, m) => sum + estimateTokens(m.content) + estimateTokens(m.name ?? ""),
    0
  );
}

// 超出上限时：保留最近 N 轮，更早的做本地摘要压缩
export function trimContext(
  messages: Message[],
  systemPrompt: string
): ContextState {
  const base = [systemPrompt];
  const total = countTokens([
    { role: "system", content: systemPrompt },
    ...messages,
  ]);

  if (total <= MAX_TOKENS) {
    return { messages, truncated: false, keptRounds: messages.length };
  }

  // 从尾部保留，直到接近上限
  const kept: Message[] = [];
  let used = estimateTokens(systemPrompt);
  for (let i = messages.length - 1; i >= 0; i--) {
    const m = messages[i];
    const t = estimateTokens(m.content) + estimateTokens(m.name ?? "");
    if (used + t > MAX_TOKENS && kept.length >= 2) break;
    kept.unshift(m);
    used += t;
  }

  const dropped = messages.length - kept.length;
  const summary =
    dropped > 0
      ? `（已对最早 ${dropped} 条消息做摘要压缩，保留最近 ${kept.length} 条上下文）`
      : undefined;

  // 用一条 system 摘要占位，控制体积
  const withSummary: Message[] = summary
    ? [{ role: "system", content: `[上下文摘要] ${summary}` }, ...kept]
    : kept;

  return {
    messages: withSummary,
    truncated: dropped > 0,
    keptRounds: kept.length,
    summary,
  };
}
