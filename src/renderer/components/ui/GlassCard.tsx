import type { ReactNode, CSSProperties } from "react";

/**
 * 统一卡片 — 两种视觉变体
 *
 * variant="glass" (默认) — 玻璃态，rounded-2xl (16px)，用作弹窗/大面积面板
 * variant="solid" — 实体态，rounded-xl (12px)，边框+背景，用作设置/表单内嵌卡片
 *
 * 间距对齐 8px 软网格：glass 默认 p-6 (24px)，solid 默认 p-4 (16px)
 */

interface GlassCardProps {
  children: ReactNode;
  /** 视觉变体 */
  variant?: "glass" | "solid";
  /** Tailwind 内边距类，覆盖 variant 默认值 */
  padding?: string;
  className?: string;
  style?: CSSProperties;
  onClick?: (e: React.MouseEvent) => void;
}

export function GlassCard({
  children,
  variant = "glass",
  padding,
  className = "",
  style,
  onClick,
}: GlassCardProps) {
  const interactiveProps = onClick
    ? {
        role: "button" as const,
        tabIndex: 0,
        onClick,
        onKeyDown: (e: React.KeyboardEvent) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            onClick(e as unknown as React.MouseEvent);
          }
        },
      }
    : {};

  if (variant === "solid") {
    return (
      <div
        className={`rounded-xl border bg-card border-border shadow-sm overflow-hidden ${onClick ? "cursor-pointer focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none" : ""} ${className}`}
        style={style}
        {...interactiveProps}
      >
        <div className={padding ?? "p-4"}>{children}</div>
      </div>
    );
  }

  return (
    <div
      className={`glass-shine rounded-2xl overflow-hidden ${onClick ? "cursor-pointer focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none" : ""} ${className}`}
      style={style}
      {...interactiveProps}
    >
      <div className={padding ?? "p-6"}>{children}</div>
    </div>
  );
}

/**
 * 弹窗/卡片标题栏 — 统一布局：左侧标题 + 右侧关闭按钮
 * 关闭按钮：w-10 h-10，保证足够大的点击区域
 */
interface HeaderProps {
  title: string;
  onClose: () => void;
}

export function CardHeader({ title, onClose }: HeaderProps) {
  return (
    <div
      className="flex items-center justify-between px-6 py-5"
      style={{ WebkitAppRegion: "no-drag" as unknown as string }}
    >
      <h3 className="text-base font-semibold">{title}</h3>
      <button
        onClick={onClose}
        className="w-10 h-10 flex items-center justify-center rounded-lg hover:bg-muted transition-colors"
        aria-label="关闭"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="18" y1="6" x2="6" y2="18" />
          <line x1="6" y1="6" x2="18" y2="18" />
        </svg>
      </button>
    </div>
  );
}

/**
 * 弹窗遮罩层（半透明背景 + 居中内容）
 * 自动处理 WebkitAppRegion 防止 macOS 拖拽区域拦截点击
 */
interface OverlayProps {
  children: ReactNode;
  onClose: () => void;
  /** 内容区距顶部偏移，默认 pt-20 */
  offset?: string;
}

export function DialogOverlay({ children, onClose, offset = "pt-20" }: OverlayProps) {
  return (
    <div
      className={`fixed inset-0 z-50 flex items-start justify-center ${offset} bg-black/20 backdrop-blur-sm fade-in`}
      style={{ WebkitAppRegion: "no-drag" as unknown as string }}
      onClick={onClose}
    >
      {children}
    </div>
  );
}
