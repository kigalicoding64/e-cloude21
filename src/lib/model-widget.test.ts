import { describe, it, expect } from "vitest";
import { isGgufFile, ggufQuant, isSafeInferenceUrl, originAllowed } from "./model-widget";

describe("model widgets", () => {
  it("accepts only .gguf files", () => {
    expect(isGgufFile("llama-3.2-1b.Q4_K_M.gguf")).toBe(true);
    expect(isGgufFile("notes.pdf")).toBe(false);
  });
  it("reads the quant tag", () => {
    expect(ggufQuant("qwen2.5-0.5b-instruct-q4_k_m.gguf")).toBe("Q4_K_M");
  });
  it("blocks private or non-https inference servers", () => {
    expect(isSafeInferenceUrl("https://llm.example.com")).toBe(true);
    expect(isSafeInferenceUrl("http://llm.example.com")).toBe(false);
    expect(isSafeInferenceUrl("https://127.0.0.1:8080")).toBe(false);
    expect(isSafeInferenceUrl("https://192.168.1.5")).toBe(false);
  });
  it("enforces allowed websites", () => {
    expect(originAllowed([], "https://a.com")).toBe(true);
    expect(originAllowed(["https://a.com"], "https://b.com")).toBe(false);
    expect(originAllowed(["https://a.com/"], "https://a.com")).toBe(true);
  });
});
