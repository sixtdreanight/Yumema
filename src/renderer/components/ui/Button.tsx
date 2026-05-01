import { Button as RadixButton } from "@radix-ui/themes";
import type { ButtonProps as RadixButtonProps } from "@radix-ui/themes";
import type { ReactNode } from "react";

type LegacyVariant = "default" | "primary" | "secondary" | "outline" | "ghost" | "link" | "destructive" | "danger";
type LegacySize = "default" | "sm" | "lg" | "icon";

function mapVariant(v?: LegacyVariant | string): RadixButtonProps["variant"] {
  if (!v || v === "default" || v === "primary" || v === "secondary") return "solid";
  if (v === "outline") return "outline";
  if (v === "ghost" || v === "link") return "ghost";
  if (v === "destructive" || v === "danger") return "soft";
  return "solid";
}

function mapColor(v?: LegacyVariant | string): RadixButtonProps["color"] {
  if (v === "destructive" || v === "danger") return "red";
  return undefined; // default accent color
}

function mapSize(s?: LegacySize | string): RadixButtonProps["size"] {
  if (s === "sm") return "2";
  if (s === "lg") return "4";
  if (s === "icon") return "2";
  return "3";
}

interface ButtonProps extends Omit<RadixButtonProps, "variant" | "size" | "color"> {
  variant?: LegacyVariant | string;
  size?: LegacySize | string;
  loading?: boolean;
  iconOnly?: boolean;
  children?: ReactNode;
}

const Button = ({ variant, size, loading, disabled, iconOnly, children, ...props }: ButtonProps) => {
  if (iconOnly) {
    return (
      <button
        className="w-10 h-10 flex items-center justify-center rounded-lg hover:bg-muted transition-colors"
        disabled={disabled || loading}
        {...(props as Record<string, unknown>)}
      >
        {loading ? "..." : children}
      </button>
    );
  }
  return (
    <RadixButton
      variant={mapVariant(variant)}
      color={mapColor(variant)}
      size={mapSize(size)}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? "..." : children}
    </RadixButton>
  );
};
Button.displayName = "Button";

export { Button };
export type { ButtonProps };
export default Button;
