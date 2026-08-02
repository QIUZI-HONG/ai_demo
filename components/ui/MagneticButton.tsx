"use client";

import { useRef, type ReactNode } from "react";

// 磁吸按钮：光标靠近时轻微吸附（仅 transform，尊重 reduced-motion）
export default function MagneticButton({
  children,
  onClick,
  className = "",
  strength = 0.25,
  disabled = false,
}: {
  children: ReactNode;
  onClick?: () => void;
  className?: string;
  strength?: number;
  disabled?: boolean;
}) {
  const ref = useRef<HTMLButtonElement>(null);

  function onMove(e: React.MouseEvent) {
    const el = ref.current;
    if (!el || disabled) return;
    const r = el.getBoundingClientRect();
    const x = e.clientX - (r.left + r.width / 2);
    const y = e.clientY - (r.top + r.height / 2);
    el.style.transform = `translate(${x * strength}px, ${y * strength}px)`;
  }
  function reset() {
    const el = ref.current;
    if (el) el.style.transform = "translate(0,0)";
  }

  return (
    <button
      ref={ref}
      onClick={onClick}
      onMouseMove={onMove}
      onMouseLeave={reset}
      disabled={disabled}
      className={`magnetic ${className}`}
    >
      {children}
    </button>
  );
}
