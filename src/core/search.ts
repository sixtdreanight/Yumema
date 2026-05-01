/**
 * 联网搜索 — 简单的 DuckDuckGo 搜索 + 自定义 API 支持
 *
 * 管道层检测搜索意图 → 调用搜索 → 结果注入系统提示词
 */

import { logger } from "./utils.js";

export interface SearchResult {
  title: string;
  snippet: string;
  url?: string;
}

/**
 * 检测用户消息是否需要联网搜索
 */
export function needsSearch(msg: string): boolean {
  return /查一下|搜索|搜一下|帮我找|今天.*新闻|最近.*发生|实时|最新|天气|现在.*温度|股价|汇率/.test(msg);
}

/**
 * 从用户消息中提取搜索关键词
 */
export function extractSearchQuery(msg: string): string {
  // 去掉常见的指令前缀
  return msg
    .replace(/^(帮我|请|麻烦|能不能|可以|查一下|搜索|搜一下)\s*/g, "")
    .replace(/[？?！!。.]/g, "")
    .trim()
    .slice(0, 100);
}

/**
 * 使用 DuckDuckGo Instant Answer API 搜索（免费，无需 Key）
 */
async function searchDuckDuckGo(query: string): Promise<SearchResult[]> {
  const url = `https://api.duckduckgo.com/?q=${encodeURIComponent(query)}&format=json&no_html=1&skip_disambig=1`;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 5000);
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": "yumema/1.0" },
      signal: controller.signal,
    });

    if (!res.ok) {
      throw new Error(`DuckDuckGo 返回 ${res.status}`);
    }

    const data = (await res.json()) as {
    AbstractText?: string;
    AbstractURL?: string;
    RelatedTopics?: { Text?: string; FirstURL?: string }[];
  };

  const results: SearchResult[] = [];

  if (data.AbstractText) {
    results.push({
      title: "摘要",
      snippet: data.AbstractText,
      url: data.AbstractURL,
    });
  }

  if (data.RelatedTopics) {
    for (const topic of data.RelatedTopics.slice(0, 5)) {
      if (topic.Text) {
        results.push({
          title: "相关",
          snippet: topic.Text,
          url: topic.FirstURL,
        });
      }
    }
  }

    return results;
  } finally {
    clearTimeout(timeout);
  }
}

/**
 * 联网搜索主入口
 * 优先用配置的 API，否则用 DuckDuckGo
 */
export async function searchWeb(query: string): Promise<string> {
  logger.info(`搜索: "${query}"`);

  try {
    const results = await searchDuckDuckGo(query);

    if (results.length === 0) {
      return "(未找到相关结果)";
    }

    // 格式化为提示词可用的文本
    return results
      .map((r) => {
        let text = r.snippet;
        if (r.url) text += ` [来源: ${r.url}]`;
        return text;
      })
      .join("\n\n");
  } catch (err) {
    logger.warn("搜索失败:", err);
    return "(搜索服务暂时不可用)";
  }
}
