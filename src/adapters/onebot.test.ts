import { describe, it, expect, vi } from "vitest";

// onebot.ts imports `logger` and `sleep` from the companion-engine barrel (a
// TypeScript-source-only package). Stub them so the test never has to resolve
// that heavy dependency graph — extractText itself performs no I/O.
vi.mock("@sixtdreamnight/companion-engine", () => ({
  logger: {
    debug: () => {},
    info: () => {},
    warn: () => {},
    error: () => {},
  },
  sleep: async () => {},
}));

import { extractText } from "./onebot";

describe("onebot extractText", () => {
  it("extracts a text segment verbatim", () => {
    expect(extractText([{ type: "text", data: { text: "你好" } }])).toBe("你好");
  });

  it("concatenates multiple text segments", () => {
    expect(
      extractText([
        { type: "text", data: { text: "你好" } },
        { type: "text", data: { text: "世界" } },
      ]),
    ).toBe("你好世界");
  });

  it("trims surrounding whitespace", () => {
    expect(extractText([{ type: "text", data: { text: "  你好  " } }])).toBe("你好");
  });

  it("maps image/face/record/video segments to placeholders", () => {
    expect(
      extractText([
        { type: "image", data: {} },
        { type: "face", data: {} },
        { type: "record", data: {} },
        { type: "video", data: {} },
      ]),
    ).toBe("[图片][表情][语音][视频]");
  });

  it("maps an at segment to @qq", () => {
    expect(extractText([{ type: "at", data: { qq: "123456" } }])).toBe("@123456");
  });

  it("returns a bare @ for an at segment without qq", () => {
    expect(extractText([{ type: "at", data: {} }])).toBe("@");
  });

  it("drops unknown segment types", () => {
    expect(extractText([{ type: "unknown", data: { text: "x" } }])).toBe("");
  });

  it("handles a mixed message", () => {
    expect(
      extractText([
        { type: "text", data: { text: "你好" } },
        { type: "image", data: {} },
        { type: "text", data: { text: "世界" } },
      ]),
    ).toBe("你好[图片]世界");
  });

  it("returns an empty string for no segments", () => {
    expect(extractText([])).toBe("");
  });
});
