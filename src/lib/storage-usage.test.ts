import { describe, it, expect } from "vitest";
import { monthlyCost, PROVIDER_PRICES, daysUntilFull, recommendTier, summarizeUsage, GB } from "./storage-usage";

describe("storage usage", () => {
  it("prices 100GB stored + 50GB egress on E-Cloud", () => {
    expect(monthlyCost(PROVIDER_PRICES[0], { storageGb: 100, egressGb: 50, uploadsPerMonth: 0 })).toBe(6.6);
  });
  it("forecasts days until quota is full", () => {
    expect(daysUntilFull(4 * GB, 5 * GB, GB / 10)).toBe(10);
    expect(daysUntilFull(1, 5, 0)).toBeNull();
    expect(daysUntilFull(6, 5, 1)).toBe(0);
  });
  it("recommends a larger tier when growth exceeds headroom", () => {
    expect(recommendTier(1 * GB, 0).id).toBe("free");
    expect(recommendTier(1 * GB, GB / 3).id).toBe("pro");
  });
  it("only counts last 30 days toward growth", () => {
    const now = Date.parse("2026-11-08T00:00:00Z");
    const s = summarizeUsage([
      { size: 3000, mime_type: "image/png", created_at: "2026-11-01T00:00:00Z" },
      { size: 9999, mime_type: "video/mp4", created_at: "2026-01-01T00:00:00Z" },
    ], 12999, 100000, now);
    expect(s.growth_bytes_per_day).toBe(100);
    expect(s.by_category.images.count).toBe(1);
  });
});
