// Function Calling 工具定义与本地执行
// 安全注意：calculator 不直用 eval，自实现算术求值器。

export interface ToolDef {
  type: "function";
  function: {
    name: string;
    description: string;
    parameters: Record<string, unknown>;
  };
}

export const TOOLS: ToolDef[] = [
  {
    type: "function",
    function: {
      name: "calculator",
      description: "对算术表达式求值，支持 + - * / ( ) 与小数",
      parameters: {
        type: "object",
        properties: {
          expression: {
            type: "string",
            description: "例如 '23 * 4 + 1.5'",
          },
        },
        required: ["expression"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "current_time",
      description: "返回当前服务器时间（ISO8601）",
      parameters: { type: "object", properties: {} },
    },
  },
];

// 极简安全算术求值：仅允许数字与 + - * / ( ) . 与空白
export function safeEval(expr: string): number | string {
  if (!/^[\d+\-*/().\s]+$/.test(expr)) {
    return "错误：仅支持数字与 + - * / ( )";
  }
  try {
    // 用 Function 构造器执行纯算术（输入已白名单过滤）
    // eslint-disable-next-line no-new-func
    const fn = new Function(`"use strict"; return (${expr});`);
    const v = fn();
    if (typeof v !== "number" || !isFinite(v)) return "错误：结果非法";
    return v;
  } catch {
    return "错误：表达式无法求值";
  }
}

export function executeTool(name: string, args: any): string {
  switch (name) {
    case "calculator": {
      const expr = String(args?.expression ?? "");
      const r = safeEval(expr);
      return typeof r === "number" ? String(r) : r;
    }
    case "current_time":
      return new Date().toISOString();
    default:
      return `未知工具: ${name}`;
  }
}
