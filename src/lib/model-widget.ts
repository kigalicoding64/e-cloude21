// Shared, browser-safe helpers for GGUF model chat widgets.

/** True when the filename is a GGUF model file. */
export function isGgufFile(name: string): boolean {
  return /\.gguf$/i.test(name.trim());
}

/** Quantization tag guessed from a GGUF filename, e.g. "Q4_K_M". */
export function ggufQuant(name: string): string | null {
  const m = name.toUpperCase().match(/(?:^|[-_.])(I?Q\d(?:_[A-Z0-9]+)*|F16|F32|BF16)(?=[-_.]|\.GGUF$)/);
  return m ? m[1] : null;
}

/**
 * Inference servers must be public https URLs. Blocks plain http and
 * local/private hosts so the chat relay can't be aimed at internal networks.
 */
export function isSafeInferenceUrl(raw: string): boolean {
  let u: URL;
  try {
    u = new URL(raw);
  } catch {
    return false;
  }
  if (u.protocol !== "https:") return false;
  const h = u.hostname.toLowerCase();
  if (h === "localhost" || h.endsWith(".localhost") || h.endsWith(".internal") || h.endsWith(".local")) return false;
  if (/^\d+\.\d+\.\d+\.\d+$/.test(h)) {
    const [a, b] = h.split(".").map(Number);
    if (a === 10 || a === 127 || a === 0 || (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168)) return false;
  }
  if (h.startsWith("[")) return false;
  return true;
}

/** Origin allowed when the list is empty or contains it (or "*"). */
export function originAllowed(allowed: string[], origin: string | null): boolean {
  if (!allowed.length || allowed.includes("*")) return true;
  if (!origin) return false;
  return allowed.some((a) => a.replace(/\/+$/, "").toLowerCase() === origin.toLowerCase());
}

export function widgetSnippet(base: string, widgetId: string): string {
  return `<!-- E-Cloud AI chat widget: paste before </body> -->\n<script src="${base}/widget.js" data-widget-id="${widgetId}" defer></script>`;
}
