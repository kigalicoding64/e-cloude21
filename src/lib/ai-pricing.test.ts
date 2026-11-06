import { describe, it, expect } from "vitest";
import { estimateCost, priceFor } from "./ai-pricing";

describe("ai pricing", () => {
  it("prices gpt-4o-mini at 0.15/0.6 per 1M tokens", () => {
    expect(estimateCost("gpt-4o-mini", 1_000_000, 1_000_000)).toBe(0.75);
  });
  it("prefers the longest matching model name", () => {
    expect(priceFor("gpt-4o-mini-2024-07-18")).toEqual([0.15, 0.6]);
  });
  it("returns null for unknown models", () => {
    expect(estimateCost("my-local-model", 10, 10)).toBeNull();
  });
  it("returns null when token counts are missing", () => {
    expect(estimateCost("gpt-4o", null, 5)).toBeNull();
  });
});
