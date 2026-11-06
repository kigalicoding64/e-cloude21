// Approximate list prices in USD per 1M tokens [input, output]. Unknown models → null cost.
const PRICES: Record<string, [number, number]> = {
  "gpt-4o": [2.5, 10],
  "gpt-4o-mini": [0.15, 0.6],
  "gpt-4.1": [2, 8],
  "gpt-4.1-mini": [0.4, 1.6],
  "gpt-4.1-nano": [0.1, 0.4],
  "o3-mini": [1.1, 4.4],
  "claude-3-5-sonnet": [3, 15],
  "claude-3-5-haiku": [0.8, 4],
  "claude-sonnet-4": [3, 15],
  "claude-opus-4": [15, 75],
  "gemini-1.5-flash": [0.075, 0.3],
  "gemini-1.5-pro": [1.25, 5],
  "gemini-2.0-flash": [0.1, 0.4],
  "gemini-2.5-flash": [0.3, 2.5],
  "gemini-2.5-pro": [1.25, 10],
  "deepseek-chat": [0.27, 1.1],
  "deepseek-reasoner": [0.55, 2.19],
  "mistral-large": [2, 6],
  "mistral-small": [0.2, 0.6],
  "llama-3.1-8b-instant": [0.05, 0.08],
  "llama-3.3-70b-versatile": [0.59, 0.79],
};

/** Longest known price key that prefixes the model name (handles dated suffixes). */
export function priceFor(model: string): [number, number] | null {
  const m = model.toLowerCase().split("/").pop() ?? "";
  let best: string | null = null;
  for (const k of Object.keys(PRICES)) if (m.startsWith(k) && (!best || k.length > best.length)) best = k;
  return best ? PRICES[best] : null;
}

export function estimateCost(model: string, promptTokens: number | null, completionTokens: number | null): number | null {
  const p = priceFor(model);
  if (!p || promptTokens == null || completionTokens == null) return null;
  return Number(((promptTokens * p[0] + completionTokens * p[1]) / 1_000_000).toFixed(6));
}
