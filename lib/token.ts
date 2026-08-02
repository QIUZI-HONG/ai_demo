// token 估算与费用换算（启发式：约 字符数/4）
// 仅用于界面展示成本，非精确计费。

export function estimateTokens(text: string): number {
  if (!text) return 0;
  // 中文按字符计，英文按词计更准；这里用通用启发式
  return Math.max(1, Math.ceil(text.length / 4));
}

// 常见模型单价（美元 / 1K token），用于换算展示
// 价格随厂商变动，这里给常见默认值，可在服务端按环境变量覆盖
export const PRICING: Record<string, { in: number; out: number }> = {
  "gpt-3.5-turbo": { in: 0.0005, out: 0.0015 },
  "gpt-4o-mini": { in: 0.00015, out: 0.0006 },
  "gpt-4o": { in: 0.0025, out: 0.01 },
  "deepseek-chat": { in: 0.00014, out: 0.00028 },
  "default": { in: 0.0005, out: 0.0015 },
};

export function priceFor(model: string) {
  return PRICING[model] ?? PRICING.default;
}

export function calcCost(
  model: string,
  inputTokens: number,
  outputTokens: number
): number {
  const p = priceFor(model);
  return (inputTokens / 1000) * p.in + (outputTokens / 1000) * p.out;
}

export function formatCost(usd: number): string {
  if (usd === 0) return "$0.0000";
  if (usd < 0.01) return `$${usd.toFixed(5)}`;
  return `$${usd.toFixed(4)}`;
}
