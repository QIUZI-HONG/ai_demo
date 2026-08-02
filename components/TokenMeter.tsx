"use client";

type Metrics = {
  inputTokens: number;
  outputTokens: number;
  cost: number;
  durationMs: number;
  model: string;
};

export default function TokenMeter({ metrics }: { metrics: Metrics | null }) {
  const total = metrics ? metrics.inputTokens + metrics.outputTokens : 0;
  // 以 8000 token 为满刻度做可视化
  const pct = Math.min(100, (total / 8000) * 100);

  return (
    <div className="glass rounded-2xl p-4">
      <div className="mb-3 flex items-center justify-between">
        <span className="text-xs font-medium uppercase tracking-wider text-[var(--muted)]">
          可观测指标
        </span>
        <span className="text-[10px] text-[var(--muted)]">
          {metrics?.model === "mock-offline" ? "离线兜底" : (metrics?.model ?? "—")}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Stat label="输入 token" value={metrics?.inputTokens ?? 0} />
        <Stat label="输出 token" value={metrics?.outputTokens ?? 0} />
        <Stat label="本次费用" value={metrics ? `$${metrics.cost.toFixed(5)}` : "$0.00000"} />
        <Stat label="耗时" value={metrics ? `${metrics.durationMs}ms` : "—"} />
      </div>

      <div className="mt-4">
        <div className="mb-1 flex justify-between text-[11px] text-[var(--muted)]">
          <span>上下文 / 成本占用</span>
          <span>{total} token</span>
        </div>
        <div className="h-2 w-full overflow-hidden rounded-full bg-[var(--border)]">
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{
              width: `${pct}%`,
              background: "linear-gradient(90deg, var(--accent), var(--accent-2))",
            }}
          />
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-xl bg-[var(--bg-soft)]/40 px-3 py-2">
      <div className="text-[11px] text-[var(--muted)]">{label}</div>
      <div className="mt-0.5 font-mono text-sm font-semibold tabular-nums">{value}</div>
    </div>
  );
}
