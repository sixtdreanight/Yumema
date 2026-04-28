import type { ReactNode } from "react";

type Variant = "default" | "primary" | "success" | "warning" | "error";

interface Props {
  children: ReactNode;
  variant?: Variant;
  size?: "sm" | "md";
  dot?: boolean;
  className?: string;
}

const variants: Record<Variant, string> = {
  default:
    "bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 border-zinc-200 dark:border-zinc-700",
  primary:
    "bg-violet-50 dark:bg-violet-950 text-violet-600 dark:text-violet-400 border-violet-200 dark:border-violet-800",
  success:
    "bg-emerald-50 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800",
  warning:
    "bg-amber-50 dark:bg-amber-950 text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-800",
  error:
    "bg-red-50 dark:bg-red-950 text-red-600 dark:text-red-400 border-red-200 dark:border-red-800",
};

const dotColors: Record<Variant, string> = {
  default: "bg-zinc-400",
  primary: "bg-violet-500",
  success: "bg-emerald-500",
  warning: "bg-amber-500",
  error: "bg-red-500",
};

export default function Badge({ children, variant = "default", size = "sm", dot, className = "" }: Props) {
  const sizeClass = size === "sm" ? "px-2 py-0.5 text-[11px]" : "px-3 py-1 text-xs";
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border font-medium ${sizeClass} ${variants[variant]} ${className}`}
    >
      {dot && <span className={`w-1.5 h-1.5 rounded-full ${dotColors[variant]}`} />}
      {children}
    </span>
  );
}
