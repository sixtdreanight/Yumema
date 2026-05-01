/**
 * 将长文本按句子边界拆成短气泡，模拟真人微信聊天
 * 一句一气泡，每段不超过 50 字
 */
export function splitForChat(text: string): string[] {
  if (!text || text.length === 0) return [""];

  // 移除中文全角括号内容（心理/动作描写残留），保留半角括号（颜文字用）
  let cleaned = text.replace(/（[^）]*）/g, "");
  // 移除 *动作* _心理_ 标记
  cleaned = cleaned.replace(/\*[^*]+\*/g, "").replace(/_[^_]+_/g, "");

  // 按中文标点拆分
  const meaningful = (s: string) => {
    const t = s.trim();
    if (t.length === 0) return false;
    if (t === ".") return false;
    return true;
  };
  const sentences = cleaned
    .split(/(?<=[。！？…\.!\?～~\n])\s*/)
    .map((s) => s.trim())
    .filter(meaningful);

  if (sentences.length === 0) return [cleaned.trim() || text];

  // 合并纯标点符号段到前一个有意义段
  const merged: string[] = [];
  const punctOnly = /^[！？。…\.!\?～~、，,；;：:]+$/;
  for (const s of sentences) {
    if (punctOnly.test(s) && merged.length > 0) {
      merged[merged.length - 1] += s;
    } else {
      merged.push(s);
    }
  }

  // 每段不超过 50 字
  const result: string[] = [];
  for (const s of merged) {
    if (s.length <= 50) {
      result.push(s);
    } else {
      const parts = s
        .split(/(?<=[，,；;])/)
        .map((p) => p.trim())
        .filter(meaningful);
      result.push(...parts);
    }
  }

  return result.length > 0 ? result : [text];
}
