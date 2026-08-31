# AI 创作工作台（轻量版）

一个「文本 → 结果」的流式 AI 应用 Demo，用于展示 AI 协作开发的完整闭环：**流式调用 · Token 成本 · 工具调用 · 上下文管理**。基于 Next.js（App Router）构建，默认以**纯前端离线演示**运行，无需任何密钥，打开即见效果。

## 功能特性

- **流式响应**：前端 `runMock` 逐 token 生成（打字机效果），无需服务端
- **Token 成本面板**：实时估算输入/输出 token 与费用、耗时，纯 CSS 动效
- **工具调用（Function Calling）**：内置 `calculator` 与 `current_time` 工具，多轮工具闭环 + 可视化卡片
- **上下文管理**：对话历史窗口化，超限自动摘要压缩
- **离线兜底**：无密钥时回退内置 `runMock`，保证评审人打开即见效果
- **Premium UI**：玻璃拟态、磁吸按钮、暗/亮/系统三态主题（平滑切换，无闪烁）
- **状态完备**：加载骨架、空态引导、错误态重试、触感反馈

## 本地运行

```bash
npm install
npm run dev          # http://localhost:3000
```

无需任何密钥即可体验完整离线演示。若想本地接真实模型，复制 `.env.example` 为 `.env.local` 并填入密钥后，将 `Studio.send()` 切回 `fetch('/api/chat')` 调用（代码已预留 `runAgent` 逻辑，见「接入真实模型」）。

## 环境变量（真实模型可选）

| 变量 | 说明 | 必填 |
|---|---|---|
| `AI_API_KEY` | OpenAI 兼容服务密钥，**仅服务端使用** | 否（无则离线） |
| `AI_BASE_URL` | 兼容接口地址，如 `https://api.openai.com/v1` | 否 |
| `AI_MODEL` | 模型名，如 `gpt-3.5-turbo` / `deepseek-chat` | 否 |

## 架构

```
浏览器(Studio)
   │  runMock（纯前端，离线兜底）
   ▼
lib/ai.ts（逐 token 生成 + 工具闭环）
lib/tools.ts / lib/context.ts / lib/token.ts
```

当前为静态导出，所有逻辑在浏览器端完成：前端 `Studio` 直接调用 `runMock`，生成 `token` / `tool` / `meta` 事件增量更新界面。**无后端、无密钥即可完整演示。**

> 进阶：若部署到支持 Serverless 的平台，可恢复 `app/api/chat` 路由作为密钥代理，由 `runAgent` 调用真实模型（密钥不落地前端），前端改回 `fetch('/api/chat')` 即可。

## AI 调用逻辑

1. **流式**：`lib/ai.ts` 的 `runMock` 在浏览器端逐块产出 `token` 事件，前端增量渲染。
2. **Token 成本**：`lib/token.ts` 用 `字符数/4` 启发式估算，按模型单价换算费用（`calcCost`）。
3. **工具调用（Function Calling）**：命中 `calculator` / `current_time` 时本地执行并展示结果卡片；离线演示中由前端 `executeTool` 直接求值。
4. **上下文管理**：`lib/context.ts` 的 `trimContext` 保留最近 N 轮，更早的消息做摘要占位。

## 关键 Prompt 与 Vibe 思路

- **Vibe**：不做「又一个聊天框」，定位「创作工作台」，把 AI 能力（流式/工具/成本）显性化。
- **核心开发 Prompt（节选）**：
  - “用 Next.js App Router 写流式 AI 应用，优先纯前端离线兜底，打开即见效果。”
  - “实现 token 估算面板，输入按字符/4、输出按流式接收字符累加，并显示费用。”
  - “给对话加工具调用：模型可调用 calculator 与 current_time，前端可视化过程。”
  - “UI 用玻璃拟态 + 磁吸按钮，单一强调色，暗亮双主题，禁止 emoji。”
- **取舍**：放弃多模型切换 UI，保留单模型 + 环境变量切换；动效采用纯 CSS 驱动以减少依赖、保证 60fps；为兼容静态托管，默认前端离线演示，真实模型走可插拔的服务端代理。

## 部署步骤（DNS / HTTPS）

**任意静态托管（即时预览）**
1. `npm run build` 生成静态产物 `out/`；
2. 上传 `out/`（含 `index.html`）至静态托管平台（CloudStudio / GitHub Pages / OSS 等），平台启静态服务并返回 HTTPS 链接。

**Vercel（自动 HTTPS，适合接入真实模型）**
1. `npm run build` 本地验证；
2. `vercel` 登录并 `vercel --prod`（或 Git 推送触发自动部署）；
3. 自动签发 HTTPS，获 `*.vercel.app` 域名；
4. 自定义域名（可选）：Vercel 添加域名 → DNS 商加 `CNAME` → 等证书下发；
5. 在 Vercel 项目 Settings → Environment Variables 配置上述三个变量；
6. 验证：`curl -I https://your.domain` 返回 `200` 且含 `strict-transport-security`。

## 接入真实模型（进阶）

1. 新建 `app/api/chat/route.ts`，复用 `lib/ai.ts` 的 `runAgent`，从 `process.env.AI_API_KEY` 读取密钥（不暴露前端）；
2. 将 `Studio.send()` 改为 `fetch('/api/chat')` 并解析 NDJSON 事件流；
3. 部署到支持 Serverless 的平台（Vercel / 腾讯云函数等），配置三个环境变量。

## 目录结构

```
app/
  layout.tsx            # 主题初始化（防闪烁）
  page.tsx              # 入口
components/
  Studio.tsx            # 主编排（状态 + 事件处理）
  ChatPanel.tsx         # 对话区 + 流式渲染
  Toolbar.tsx           # 工具开关 / 模式
  TokenMeter.tsx        # token 与费用面板
  ThemeToggle.tsx       # 暗/亮/系统
  ui/MagneticButton.tsx # 磁吸按钮
lib/
  ai.ts                 # AI 逻辑（runMock 离线 + runAgent 真实模型预留）
  tools.ts              # function calling 定义与执行
  context.ts            # 上下文窗口管理
  token.ts              # token 估算与费用
```

## 技术栈

Next.js 16（App Router）· React 19 · Tailwind CSS v4 · TypeScript。

## 许可

MIT
