/**
 * 设计令牌 — 复用桌面端 CSS 变量命名，适配 React Native。
 *
 * 桌面端用 CSS 自定义属性（--vp-*），移动端用 JS 常量。
 * 暗色模式通过 useColorScheme() 自动切换。
 */

import { useColorScheme } from "react-native";

export interface ThemeTokens {
  primary: string;
  primaryLight: string;
  accent: string;
  bg: string;
  surface: string;
  border: string;
  text: string;
  textSecondary: string;
  textMuted: string;
  success: string;
  warning: string;
  error: string;
}

const light: ThemeTokens = {
  primary: "#ec4899",
  primaryLight: "#f9a8d4",
  accent: "#8b5cf6",
  bg: "#fafafa",
  surface: "#ffffff",
  border: "#e5e7eb",
  text: "#18181b",
  textSecondary: "#52525b",
  textMuted: "#a1a1aa",
  success: "#22c55e",
  warning: "#f59e0b",
  error: "#ef4444",
};

const dark: ThemeTokens = {
  primary: "#f472b6",
  primaryLight: "#be185d",
  accent: "#a78bfa",
  bg: "#09090b",
  surface: "#18181b",
  border: "#27272a",
  text: "#fafafa",
  textSecondary: "#a1a1aa",
  textMuted: "#71717a",
  success: "#4ade80",
  warning: "#fbbf24",
  error: "#f87171",
};

export function useTheme(): ThemeTokens {
  const scheme = useColorScheme();
  return scheme === "dark" ? dark : light;
}

export { light, dark };
