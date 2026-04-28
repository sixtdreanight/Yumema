import type { ReactNode } from "react";

interface Props {
  children: ReactNode;
  className?: string;
  style?: React.CSSProperties;
  onClick?: (e: React.MouseEvent) => void;
}

export default function GlassPanel({ children, className = "", style, onClick }: Props) {
  return (
    <div
      className={`glass rounded-2xl border border-zinc-200/60 dark:border-zinc-700/60 shadow-lg ${className}`}
      style={style}
      onClick={onClick}
    >
      {children}
    </div>
  );
}
