// Shared, browser-safe catalog of external AI providers reachable through the
// E-Cloud unified gateway (OpenAI-compatible chat completions).
export type ProviderId =
  | "openai" | "anthropic" | "gemini" | "groq" | "deepseek"
  | "mistral" | "openrouter" | "together" | "custom";

export const PROVIDERS: Record<ProviderId, { name: string; baseUrl: string; placeholder: string; example: string }> = {
  openai: { name: "OpenAI", baseUrl: "https://api.openai.com/v1", placeholder: "sk-proj-...", example: "gpt-4o-mini" },
  anthropic: { name: "Anthropic Claude", baseUrl: "https://api.anthropic.com/v1", placeholder: "sk-ant-...", example: "claude-3-5-sonnet-latest" },
  gemini: { name: "Google Gemini", baseUrl: "https://generativelanguage.googleapis.com/v1beta/openai", placeholder: "AIza...", example: "gemini-2.0-flash" },
  groq: { name: "Groq", baseUrl: "https://api.groq.com/openai/v1", placeholder: "gsk_...", example: "llama-3.1-8b-instant" },
  deepseek: { name: "DeepSeek", baseUrl: "https://api.deepseek.com/v1", placeholder: "sk-...", example: "deepseek-chat" },
  mistral: { name: "Mistral", baseUrl: "https://api.mistral.ai/v1", placeholder: "...", example: "mistral-small-latest" },
  openrouter: { name: "OpenRouter", baseUrl: "https://openrouter.ai/api/v1", placeholder: "sk-or-...", example: "meta-llama/llama-3.1-8b-instruct" },
  together: { name: "Together AI", baseUrl: "https://api.together.xyz/v1", placeholder: "...", example: "meta-llama/Llama-3-8b-chat-hf" },
  custom: { name: "Custom / Ollama (OpenAI-compatible)", baseUrl: "", placeholder: "optional key", example: "my-model" },
};

export const PROVIDER_IDS = Object.keys(PROVIDERS) as ProviderId[];

export function isProviderId(v: unknown): v is ProviderId {
  return typeof v === "string" && v in PROVIDERS;
}

/** "openai/gpt-4o" → { provider: "openai", model: "gpt-4o" }. Model part may contain slashes. */
export function parseModelRef(ref: unknown): { provider: ProviderId; model: string } | null {
  if (typeof ref !== "string") return null;
  const i = ref.indexOf("/");
  if (i <= 0 || i === ref.length - 1) return null;
  const provider = ref.slice(0, i).toLowerCase();
  const model = ref.slice(i + 1);
  return isProviderId(provider) ? { provider, model } : null;
}

/** Only public https endpoints (no localhost/private ranges) may be targeted. */
export function isSafeBaseUrl(url: string): boolean {
  try {
    const u = new URL(url);
    if (u.protocol !== "https:") return false;
    const h = u.hostname.toLowerCase();
    if (h === "localhost" || h.endsWith(".local") || h.endsWith(".internal")) return false;
    if (/^(10\.|127\.|0\.|169\.254\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.)/.test(h)) return false;
    if (h.includes(":") || h === "[::1]") return false;
    return true;
  } catch {
    return false;
  }
}

export function keyHint(key: string): string {
  return key.length > 8 ? `••••${key.slice(-4)}` : "••••";
}
