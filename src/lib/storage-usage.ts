// Pure storage usage + planning math (shared by API, UI and tests).
export const GB = 1024 ** 3;

export type ProviderPrice = { id: string; label: string; storagePerGb: number; egressPerGb: number; requestsPer1k: number };

// USD per GB-month / per GB egress / per 1k write requests. Rough public list prices.
export const PROVIDER_PRICES: ProviderPrice[] = [
  { id: "ecloud", label: "E-Cloud", storagePerGb: 0.021, egressPerGb: 0.09, requestsPer1k: 0.005 },
  { id: "s3", label: "AWS S3 Standard", storagePerGb: 0.023, egressPerGb: 0.09, requestsPer1k: 0.005 },
  { id: "r2", label: "Cloudflare R2", storagePerGb: 0.015, egressPerGb: 0, requestsPer1k: 0.0045 },
  { id: "b2", label: "Backblaze B2", storagePerGb: 0.006, egressPerGb: 0.01, requestsPer1k: 0.004 },
];

export type CostInput = { storageGb: number; egressGb: number; uploadsPerMonth: number };

export function monthlyCost(p: ProviderPrice, i: CostInput): number {
  const v = Math.max(0, i.storageGb) * p.storagePerGb + Math.max(0, i.egressGb) * p.egressPerGb +
    (Math.max(0, i.uploadsPerMonth) / 1000) * p.requestsPer1k;
  return Math.round(v * 100) / 100;
}

export function compareProviders(i: CostInput) {
  return PROVIDER_PRICES.map((p) => ({ id: p.id, label: p.label, monthly: monthlyCost(p, i), yearly: Math.round(monthlyCost(p, i) * 1200) / 100 }))
    .sort((a, b) => a.monthly - b.monthly);
}

/** Days until quota is full given average bytes/day growth; null when not growing. */
export function daysUntilFull(usedBytes: number, quotaBytes: number, bytesPerDay: number): number | null {
  if (usedBytes >= quotaBytes) return 0;
  if (bytesPerDay <= 0) return null;
  return Math.floor((quotaBytes - usedBytes) / bytesPerDay);
}

export const TIERS = [
  { id: "free", label: "Free", quotaGb: 5 },
  { id: "pro", label: "Pro", quotaGb: 100 },
  { id: "business", label: "Business", quotaGb: 1024 },
  { id: "enterprise", label: "Enterprise", quotaGb: 10240 },
];

/** Smallest tier that still has 20% headroom after `months` of growth. */
export function recommendTier(usedBytes: number, bytesPerDay: number, months = 12) {
  const projected = usedBytes + Math.max(0, bytesPerDay) * 30 * months;
  return TIERS.find((t) => t.quotaGb * GB * 0.8 >= projected) ?? TIERS[TIERS.length - 1];
}

export function categoryFor(mime: string | null): string {
  if (!mime) return "other";
  if (mime.startsWith("image/")) return "images";
  if (mime.startsWith("video/")) return "video";
  if (mime.startsWith("audio/")) return "audio";
  if (mime === "application/pdf" || /document|word|text/.test(mime)) return "documents";
  if (/zip|tar|compress/.test(mime)) return "archives";
  return "other";
}

export type UsageFile = { size: number; mime_type: string | null; created_at: string };

export function summarizeUsage(files: UsageFile[], usedBytes: number, quotaBytes: number, now = Date.now()) {
  const byCategory: Record<string, { bytes: number; count: number }> = {};
  let last30 = 0;
  for (const f of files) {
    const c = categoryFor(f.mime_type);
    byCategory[c] ??= { bytes: 0, count: 0 };
    byCategory[c].bytes += Number(f.size);
    byCategory[c].count++;
    if (now - Date.parse(f.created_at) <= 30 * 864e5) last30 += Number(f.size);
  }
  const perDay = last30 / 30;
  return {
    used_bytes: usedBytes,
    quota_bytes: quotaBytes,
    percent_used: quotaBytes > 0 ? Math.round((usedBytes / quotaBytes) * 1000) / 10 : 0,
    file_count: files.length,
    by_category: byCategory,
    growth_bytes_per_day: Math.round(perDay),
    days_until_full: daysUntilFull(usedBytes, quotaBytes, perDay),
    recommended_tier: recommendTier(usedBytes, perDay).id,
  };
}
