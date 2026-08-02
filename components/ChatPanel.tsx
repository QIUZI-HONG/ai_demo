"use client";

import { useEffect, useRef } from "react";
import type { Message } from "@/lib/context";
import MagneticButton from "./ui/MagneticButton";

const TOOL_LABELS: Record<string, string> = {
  calculator: "计算器",
  current_time: "当前时间",
};

export default function ChatPanel({
  messages,
  input,
  loading,
  onInput,
  onSend,
  onStop,
}: {
  messages: Message[];
  input: string;
  loading: boolean;
  onInput: (v: string) => void;
  onSend: () => void;
  onStop: () => void;
}) {
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages]);

  return (
    <div className="glass flex min-h-0 flex-1 flex-col rounded-3xl p-4">
      {/* 消息区 */}
      <div className="flex-1 space-y-4 overflow-y-auto pr-1">
        {messages.length === 0 && (
          <EmptyState />
        )}

        {messages.map((m, i) => {
          if (m.role === "system") return null;
          if (m.role === "user") {
            return (
              <div key={i} className="flex justify-end rise">
                <div className="max-w-[80%] rounded-2xl rounded-br-md bg-[var(--accent)] px-4 py-2.5 text-white">
                  <p className="whitespace-pre-wrap text-sm leading-relaxed">{m.content}</p>
                </div>
              </div>
            );
          }
          // assistant / tool
          return (
            <div key={i} className="flex justify-start rise">
              <div className="max-w-[88%] space-y-2">
                {m.toolCalls?.map((tc) => (
                  <ToolCard key={tc.id} name={tc.name} args={tc.args} result={tc.result} />
                ))}
                {m.content && (
                  <div className="rounded-2xl rounded-bl-md bg-[var(--bg-soft)]/60 px-4 py-2.5 text-[var(--fg)]">
                    <p className={`whitespace-pre-wrap text-sm leading-relaxed ${
                      loading && i === messages.length - 1 ? "caret" : ""
                    }`}>
                      {m.content}
                    </p>
                  </div>
                )}
              </div>
            </div>
          );
        })}

        {loading && messages[messages.length - 1]?.role !== "assistant" && (
          <div className="flex justify-start">
            <div className="rounded-2xl rounded-bl-md bg-[var(--bg-soft)]/60 px-4 py-3">
              <div className="flex gap-1.5">
                <Dot /> <Dot d={0.15} /> <Dot d={0.3} />
              </div>
            </div>
          </div>
        )}
        <div ref={endRef} />
      </div>

      {/* 输入区 */}
      <div className="mt-3 flex items-end gap-2">
        <textarea
          value={input}
          onChange={(e) => onInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              if (!loading && input.trim()) onSend();
            }
          }}
          rows={1}
          placeholder="输入想法 / 笔记 / 需求，例如：帮我算一下 23 * 4 + 1.5"
          className="max-h-32 min-h-[44px] flex-1 resize-none rounded-2xl border border-[var(--border)] bg-[var(--bg-soft)]/50 px-4 py-3 text-sm outline-none transition focus:border-[var(--accent)]"
        />
        {loading ? (
          <MagneticButton
            onClick={onStop}
            className="h-11 rounded-2xl bg-red-500/90 px-5 text-sm font-medium text-white"
          >
            停止
          </MagneticButton>
        ) : (
          <MagneticButton
            onClick={onSend}
            disabled={!input.trim()}
            className="h-11 rounded-2xl bg-[var(--accent)] px-5 text-sm font-medium text-white disabled:opacity-40"
          >
            发送
          </MagneticButton>
        )}
      </div>
    </div>
  );
}

function ToolCard({
  name,
  args,
  result,
}: {
  name: string;
  args: string;
  result?: string;
}) {
  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-soft)]/40 p-3 text-xs">
      <div className="mb-1 flex items-center gap-1.5 font-medium text-[var(--accent)]">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M14.7 6.3a4 4 0 0 0-5.4 5.4L3 18l3 3 6.3-6.3a4 4 0 0 0 5.4-5.4l-2.6 2.6-2-2 2.6-2.6z" />
        </svg>
        工具调用 · {TOOL_LABELS[name] ?? name}
      </div>
      <div className="text-[var(--muted)]">
        <span className="font-mono">参数: </span>
        <span className="font-mono break-all">{args}</span>
      </div>
      {result !== undefined && (
        <div className="mt-1 text-[var(--fg)]">
          <span className="font-mono text-[var(--muted)]">结果: </span>
          <span className="font-mono break-all">{result}</span>
        </div>
      )}
    </div>
  );
}

function Dot({ d = 0 }: { d?: number }) {
  return (
    <span
      className="h-2 w-2 rounded-full bg-[var(--muted)]"
      style={{ animation: `blink 1s ${d}s steps(2, start) infinite` }}
    />
  );
}

function EmptyState() {
  return (
    <div className="flex h-full flex-col items-center justify-center py-10 text-center">
      <div className="mb-3 rounded-2xl bg-[var(--accent)]/10 p-3 text-[var(--accent)]">
        <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 3l1.9 4.6L18.5 9l-4.6 1.9L12 15l-1.9-4.1L5.5 9l4.6-1.4z" />
          <path d="M19 14l.8 2 2 .8-2 .8-.8 2-.8-2-2-.8 2-.8z" />
        </svg>
      </div>
      <p className="text-sm font-medium">文本 → 结果</p>
      <p className="mt-1 max-w-xs text-xs text-[var(--muted)]">
        输入零散想法，模型以流式生成结构化结果。试试「帮我算一下 23 * 4 + 1.5」触发工具调用。
      </p>
    </div>
  );
}
