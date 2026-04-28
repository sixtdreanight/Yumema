interface Props {
  emoji?: string;
  size?: "sm" | "md" | "lg" | "xl";
  gradient?: boolean;
  className?: string;
}

const sizes = { sm: "w-7 h-7 text-xs", md: "w-9 h-9 text-sm", lg: "w-12 h-12 text-lg", xl: "w-16 h-16 text-2xl" };

export default function Avatar({ emoji = "💕", size = "md", gradient = true, className = "" }: Props) {
  return (
    <div
      className={`${sizes[size]} rounded-full flex items-center justify-center shrink-0 select-none ${className}`}
      style={
        gradient
          ? { background: "linear-gradient(135deg, var(--vp-primary-soft), #ede9fe)" }
          : { background: "var(--vp-surface-hover)" }
      }
    >
      {emoji}
    </div>
  );
}
