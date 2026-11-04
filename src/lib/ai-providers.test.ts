import { describe, it, expect } from "vitest";
import { parseModelRef, isSafeBaseUrl } from "./ai-providers";

describe("ai providers", () => {
  it("parses provider/model with nested slashes", () => {
    expect(parseModelRef("openrouter/meta-llama/llama-3")).toEqual({ provider: "openrouter", model: "meta-llama/llama-3" });
  });
  it("rejects unknown providers", () => {
    expect(parseModelRef("evil/model")).toBeNull();
  });
  it("blocks private and non-https base URLs", () => {
    expect(isSafeBaseUrl("http://api.openai.com")).toBe(false);
    expect(isSafeBaseUrl("https://127.0.0.1")).toBe(false);
    expect(isSafeBaseUrl("https://api.groq.com/openai/v1")).toBe(true);
  });
});
