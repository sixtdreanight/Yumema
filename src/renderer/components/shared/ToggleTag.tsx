import type { ReactNode } from "react";

type TagVariant = "primary" | "destructive" | "violet" | "amber" | "rose";

interface ToggleTagProps {
  active: boolean;
  onClick: () => void;
  children: ReactNode;
  variant?: TagVariant;
  size?: "sm" | "md" | "lg";
}

const sizeMap = {
  sm: "px-3 py-1.5 text-xs",
  md: "px-4 py-2 text-sm",
  lg: "px-5 py-2.5 text-sm",
};

const activeClasses: Record<TagVariant, string> = {
  primary: "bg-primary text-primary-foreground border-primary",
  destructive: "bg-destructive text-destructive-foreground border-destructive",
  violet: "bg-violet-500 text-white border-violet-500",
  amber: "bg-amber-500 text-white border-amber-500",
  rose: "bg-rose-500 text-white border-rose-500",
};

export default function ToggleTag({
  active,
  onClick,
  children,
  variant = "primary",
  size = "md",
}: ToggleTagProps) {
  return (
    <button
      onClick={onClick}
      className={`rounded-lg font-medium transition-all active:scale-95 border ${sizeMap[size]} ${
        active
          ? activeClasses[variant]
          : "bg-secondary text-muted-foreground border-border hover:bg-muted"
      }`}
    >
      {children}
    </button>
  );
}
