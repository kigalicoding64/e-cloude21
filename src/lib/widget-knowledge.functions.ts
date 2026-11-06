import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { htmlToText, sameSiteLinks } from "@/lib/widget-knowledge";

function isPublicHttpUrl(raw: string): boolean {
  try {
    const u = new URL(raw);
    if (!/^https?:$/.test(u.protocol)) return false;
    const h = u.hostname;
    return !(h === "localhost" || /^(127\.|10\.|192\.168\.|169\.254\.|0\.)/.test(h) || /^172\.(1[6-9]|2\d|3[01])\./.test(h) || h.endsWith(".internal"));
  } catch {
    return false;
  }
}

async function getPage(url: string): Promise<string | null> {
  try {
    const r = await fetch(url, { headers: { "User-Agent": "EGREED-Cloud-Widget/1.0" }, signal: AbortSignal.timeout(10_000) });
    if (!r.ok || !(r.headers.get("content-type") ?? "").includes("html")) return null;
    return (await r.text()).slice(0, 2_000_000);
  } catch {
    return null;
  }
}

/** Reads a website (start page + up to 9 same-site pages) and returns its text. */
export const readWebsite = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ url: z.string().url().max(500) }).parse(i))
  .handler(async ({ data }) => {
    if (!isPublicHttpUrl(data.url)) return { ok: false as const, error: "Use a public website address." };
    const first = await getPage(data.url);
    if (!first) return { ok: false as const, error: "Could not read that website." };
    const pages = [{ url: data.url, text: htmlToText(first) }];
    const links = sameSiteLinks(first, data.url).filter((l) => l !== data.url).slice(0, 9);
    const more = await Promise.all(links.map(async (l) => ({ url: l, html: await getPage(l) })));
    for (const m of more) if (m.html) pages.push({ url: m.url, text: htmlToText(m.html) });
    const text = pages.map((p) => `# ${p.url}\n${p.text}`).join("\n\n");
    return { ok: true as const, pages: pages.length, text };
  });
