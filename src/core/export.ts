/**
 * 聊天记录导出
 * 支持 TXT 和 Markdown 格式
 */

import { loadShortTerm } from "./memory.js";
import type { Profile } from "./config.js";

function formatTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString("zh-CN", {
    year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit",
  });
}

export function exportToTXT(userId: string, profile?: Profile | null): string {
  const history = loadShortTerm(userId, 9999);
  const lines: string[] = [];
  const partnerName = profile?.name || "TA";

  lines.push(`=== 梦间 Yumema 聊天记录 ===`);
  lines.push(`对方: ${partnerName}`);
  lines.push(`导出时间: ${new Date().toLocaleString("zh-CN")}`);
  lines.push("=".repeat(40));
  lines.push("");

  for (const turn of history) {
    const name = turn.role === "user"
      ? (profile?.user_nickname || "你")
      : partnerName;
    const time = turn.timestamp ? formatTime(turn.timestamp) : "";
    lines.push(`[${time}] ${name}:`);
    lines.push(turn.content);
    lines.push("");
  }

  return lines.join("\n");
}

export function exportToMarkdown(userId: string, profile?: Profile | null): string {
  const history = loadShortTerm(userId, 9999);
  const lines: string[] = [];
  const partnerName = profile?.name || "TA";

  lines.push(`# 梦间 Yumema 聊天记录`);
  lines.push("");
  lines.push(`**对方**: ${partnerName}`);
  lines.push(`**导出时间**: ${new Date().toLocaleString("zh-CN")}`);
  lines.push("");
  lines.push("---");
  lines.push("");

  for (const turn of history) {
    const name = turn.role === "user"
      ? (profile?.user_nickname || "你")
      : partnerName;
    const time = turn.timestamp ? formatTime(turn.timestamp) : "";
    lines.push(`### ${name} \`${time}\``);
    lines.push("");
    lines.push(turn.content);
    lines.push("");
  }

  return lines.join("\n");
}
