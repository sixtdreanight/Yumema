import * as React from "react";
import * as AvatarPrimitive from "@radix-ui/react-avatar";
import { cn } from "src/renderer/lib/utils";

const Avatar = React.forwardRef<
  React.ElementRef<typeof AvatarPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof AvatarPrimitive.Root>
>(({ className, ...props }, ref) => (
  <AvatarPrimitive.Root
    ref={ref}
    className={cn(
      "relative flex shrink-0 overflow-hidden rounded-full",
      className,
    )}
    {...props}
  />
));
Avatar.displayName = AvatarPrimitive.Root.displayName;

const AvatarImage = React.forwardRef<
  React.ElementRef<typeof AvatarPrimitive.Image>,
  React.ComponentPropsWithoutRef<typeof AvatarPrimitive.Image>
>(({ className, ...props }, ref) => (
  <AvatarPrimitive.Image
    ref={ref}
    className={cn("aspect-square h-full w-full", className)}
    {...props}
  />
));
AvatarImage.displayName = AvatarPrimitive.Image.displayName;

const AvatarFallback = React.forwardRef<
  React.ElementRef<typeof AvatarPrimitive.Fallback>,
  React.ComponentPropsWithoutRef<typeof AvatarPrimitive.Fallback>
>(({ className, ...props }, ref) => (
  <AvatarPrimitive.Fallback
    ref={ref}
    className={cn(
      "flex h-full w-full items-center justify-center rounded-full bg-muted",
      className,
    )}
    {...props}
  />
));
AvatarFallback.displayName = AvatarPrimitive.Fallback.displayName;

// Backward-compat wrapper that accepts old props (emoji, size, gradient)
interface LegacyProps {
  emoji?: string;
  size?: "sm" | "md" | "lg" | "xl";
  gradient?: boolean;
  className?: string;
}

const sizeMap: Record<string, string> = {
  sm: "w-7 h-7 text-xs",
  md: "w-9 h-9 text-sm",
  lg: "w-12 h-12 text-lg",
  xl: "w-16 h-16 text-2xl",
};

const LegacyAvatar = ({ emoji = "💕", size = "md", gradient = true, className = "" }: LegacyProps) => {
  return (
    <Avatar
      className={`${sizeMap[size]} ${className}`}
      style={
        gradient
          ? { background: "var(--vp-primary-soft)" }
          : { background: "var(--muted)" }
      }
    >
      <AvatarFallback className="bg-transparent">{emoji}</AvatarFallback>
    </Avatar>
  );
};

export default LegacyAvatar;
export { Avatar, AvatarImage, AvatarFallback };
