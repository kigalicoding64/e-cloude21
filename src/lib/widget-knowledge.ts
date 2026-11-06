export const KNOWLEDGE_MAX_CHARS = 60_000;

/** Turn an HTML page into readable plain text. */
export function htmlToText(html: string): string {
  return html
    .replace(/<(script|style|noscript|svg|iframe)[\s\S]*?<\/\1>/gi, " ")
    .replace(/<\/(p|div|h[1-6]|li|tr|section|article|br)>/gi, "\n")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/[ \t]+/g, " ")
    .replace(/\n\s*\n+/g, "\n")
    .trim();
}

/** Same-site page links found in HTML, absolute, without hashes. */
export function sameSiteLinks(html: string, base: string): string[] {
  const origin = new URL(base).origin;
  const out = new Set<string>();
  for (const m of html.matchAll(/href=["']([^"'#]+)["']/gi)) {
    try {
      const u = new URL(m[1], base);
      if (u.origin === origin && !/\.(png|jpe?g|gif|svg|pdf|zip|css|js|ico|webp|mp4)$/i.test(u.pathname)) out.add(u.origin + u.pathname);
    } catch {
      /* ignore bad links */
    }
  }
  return [...out];
}

/** System prompt with the widget's knowledge attached. */
export function buildSystemPrompt(instructions: string, knowledge: string): string {
  if (!knowledge.trim()) return instructions;
  return `${instructions}\n\nAnswer using ONLY the information below about this business. If the answer is not there, say you don't know and suggest contacting them.\n\n--- INFORMATION ---\n${knowledge.slice(0, KNOWLEDGE_MAX_CHARS)}\n--- END ---`;
}
