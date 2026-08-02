"use client";

export default function Toolbar({
  useTools,
  onToggleTools,
  mode,
}: {
  useTools: boolean;
  onToggleTools: (v: boolean) => void;
  mode: "live" | "offline" | "idle";
}) {
  return (
    <div className="glass flex flex-wrap items-center gap-3 rounded-2xl px-3 py-2">
      <button
        onClick={() => onToggleTools(!useTools)}
        className={`magnetic flex items-center gap-2 rounded-full px-3 py-1.5 text-sm transition-colors ${
          useTools
            ? "bg-[var(--accent)] text-white"
            : "text-[var(--muted)] hover:text-[var(--fg)]"
        }`}
      >
        <span
          className={`h-2 w-2 rounded-full ${
            useTools ? "bg-white" : "bg-[var(--muted)]"
          }`}
        />
        工具调用
      </button>

      <div className="ml-auto flex items-center gap-2 text-xs text-[var(--muted)]">
        <span
          className={`h-2 w-2 rounded-full ${
            mode === "offline"
              ? "bg-amber-400"
              : mode === "live"
              ? "bg-emerald-400"
              : "bg-[var(--muted)]"
          }`}
        />
        {mode === "offline"
          ? "离线演示（无需密钥）"
          : mode === "live"
          ? "真实模型流式"
          : "待命"}
      </div>
    </div>
  );
}
