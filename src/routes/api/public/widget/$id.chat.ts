import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { CORS_HEADERS, corsPreflight } from "@/lib/cors";
import { isSafeInferenceUrl, originAllowed } from "@/lib/model-widget";

const Body = z.object({
  messages: z
    .array(z.object({ role: z.enum(["user", "assistant"]), content: z.string().min(1).max(4000) }))
    .min(1)
    .max(30),
});

// Simple per-instance limiter: 20 messages / minute per widget+visitor IP.
const hits = new Map<string, number[]>();
function limited(key: string): boolean {
  const now = Date.now();
  const arr = (hits.get(key) ?? []).filter((t) => now - t < 60_000);
  arr.push(now);
  hits.set(key, arr);
  if (hits.size > 5000) hits.clear();
  return arr.length > 20;
}

// POST /api/public/widget/:id/chat -> relays a visitor's chat to the owner's
// GGUF inference server (llama.cpp / Ollama, OpenAI-compatible) and streams back.
export const Route = createFileRoute("/api/public/widget/$id/chat")({
  server: {
    handlers: {
      OPTIONS: async () => corsPreflight(),
      POST: async ({ request, params }) => {
        const j = (b: unknown, s: number) =>
          new Response(JSON.stringify(b), { status: s, headers: { "Content-Type": "application/json", ...CORS_HEADERS } });
        if (!/^[0-9a-f-]{36}$/i.test(params.id)) return j({ error: "not_found" }, 404);
        const ip = request.headers.get("cf-connecting-ip") ?? request.headers.get("x-forwarded-for") ?? "anon";
        if (limited(`${params.id}:${ip}`)) return j({ error: "rate_limited", message: "Too many messages, wait a minute." }, 429);

        const parsed = Body.safeParse(await request.json().catch(() => null));
        if (!parsed.success) return j({ error: "invalid_request" }, 400);

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { data: w } = await supabaseAdmin
          .from("model_widgets")
          .select("id, is_active, allowed_origins, inference_url, system_prompt, temperature, max_tokens, files(name)")
          .eq("id", params.id)
          .maybeSingle();
        if (!w || !w.is_active) return j({ error: "not_found" }, 404);
        if (!originAllowed(w.allowed_origins ?? [], request.headers.get("origin")))
          return j({ error: "origin_not_allowed" }, 403);
        if (!w.inference_url || !isSafeInferenceUrl(w.inference_url))
          return j({ error: "model_offline", message: "This assistant is not connected to a model server yet." }, 503);

        const base = w.inference_url.replace(/\/+$/, "").replace(/\/v1$/, "");
        const modelName = (w as { files?: { name?: string } | null }).files?.name ?? "model";
        let upstream: Response;
        try {
          upstream = await fetch(`${base}/v1/chat/completions`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              model: modelName.replace(/\.gguf$/i, ""),
              stream: true,
              temperature: Number(w.temperature),
              max_tokens: w.max_tokens,
              messages: [{ role: "system", content: w.system_prompt }, ...parsed.data.messages],
            }),
            signal: AbortSignal.timeout(60_000),
          });
        } catch {
          return j({ error: "model_unreachable", message: "The model server did not respond." }, 502);
        }
        if (!upstream.ok || !upstream.body)
          return j({ error: "model_error", message: `Model server returned ${upstream.status}.` }, 502);
        return new Response(upstream.body, {
          status: 200,
          headers: { "Content-Type": "text/event-stream", "Cache-Control": "no-cache", ...CORS_HEADERS },
        });
      },
    },
  },
});
