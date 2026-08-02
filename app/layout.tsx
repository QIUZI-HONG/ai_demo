import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "AI 创作工作台 · 轻量版",
  description:
    "一个文本 → 结果的流式 AI 应用 Demo：展示流式调用、token 成本、function calling 与上下文管理。",
};

// 在首屏绘制前设置主题，避免闪烁
const themeScript = `
(function(){
  try {
    var t = localStorage.getItem('theme');
    if (!t) t = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    document.documentElement.classList.toggle('dark', t === 'dark');
    document.documentElement.style.colorScheme = t;
  } catch(e){}
})();
`;

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh-CN" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
