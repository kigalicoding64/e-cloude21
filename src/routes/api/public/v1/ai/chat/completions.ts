// Unified OpenAI-compatible gateway: callers use ONE E-Cloud API key and pick
// "provider/model"; E-Cloud injects the caller's stored provider key.
import { createFileRoute } from "@tanstack/react-router";
import { authorize, apiError } from "@/lib/api-auth.server";
import { corsPreflight, withCors } from "@/lib/cors";
import { PROVIDERS, parseModelRef, isSafeBaseUrl } from "@/lib/ai-providers";

export const Route = createFileRoute("/api/public/v1/ai/chat/completions")({
  server: {
    handlers: {
      OPTIONS: async () => corsPreflight(),
      POST: async ({ request }) => {
        const auth = await authorize(request, "read");
        if (auth.error) return auth.error;
        let body: Record<string, unknown>;
        try {
          body = (await request.json()) as Record<string, unknown>;
        } catch {
          return apiError("invalid_json", "Body must be JSON.");
        }
        const ref = parseModelRef(body.model);
        if (!ref) {
          return apiError("validation_failed", "model must look like 'provider/model', e.g. 'openai/gpt-4o-mini'.", {
            providers: Object.keys(PROVIDERS),
          });
        }
        if (!Array.isArray(body.messages)) return apiError("validation_failed", "messages must be an array.");

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { data: row } = await supabaseAdmin
          .from("ai_provider_keys")
          .select("id, base_url, key_ciphertext, key_iv, request_count")
          .eq("owner_id", auth.caller.userId)
          .eq("provider", ref.provider)
          .eq("is_active", true)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();
        if (!row) {
          return apiError("not_found", `No active ${PROVIDERS[ref.provider].name} key stored. Add one in AI Hub → Provider Keys.`);
        }
        const base = (row.base_url || PROVIDERS[ref.provider].baseUrl).replace(/\/+$/, "");
        if (!isSafeBaseUrl(base)) return apiError("validation_failed", "Stored base URL is not allowed.");

        const { decryptSecret } = await import("@/lib/ai-vault.server");
        const key = await decryptSecret(row.key_ciphertext, row.key_iv);
        const headers: Record<string, string> = { "Content-Type": "application/json" };
        if (key) headers["Authorization"] = `Bearer ${key}`;
        if (ref.provider === "anthropic" && key) headers["x-api-key"] = key;

        const started = Date.now();
        const streamed = body.stream === true;
        const logRequest = async (status: number, pt: number | null, ct: number | null) => {
          const { estimateCost } = await import("@/lib/ai-pricing");
          await Promise.all([
            supabaseAdmin.from("ai_provider_requests").insert({
              owner_id: auth.caller.userId,
              key_id: row.id,
              provider: ref.provider,
              model: ref.model,
              status,
              latency_ms: Date.now() - started,
              prompt_tokens: pt,
              completion_tokens: ct,
              estimated_cost_usd: estimateCost(ref.model, pt, ct),
              streamed,
            }),
            supabaseAdmin
              .from("ai_provider_keys")
              .update({ last_used_at: new Date().toISOString(), request_count: (row.request_count ?? 0) + 1 })
              .eq("id", row.id),
          ]).catch(() => {});
        };
        let upstream: Response;
        try {
          upstream = await fetch(`${base}/chat/completions`, {
            method: "POST",
            headers,
            body: JSON.stringify({ ...body, model: ref.model }),
          });
        } catch {
          await logRequest(502, null, null);
          return apiError("service_unavailable", "Could not reach the AI provider.");
        }
        const contentType = upstream.headers.get("content-type") ?? "application/json";
        if (streamed) {
          await logRequest(upstream.status, null, null);
          return withCors(new Response(upstream.body, { status: upstream.status, headers: { "Content-Type": contentType } }));
        }
        const text = await upstream.text();
        let pt: number | null = null;
        let ct: number | null = null;
        try {
          const usage = (JSON.parse(text) as { usage?: { prompt_tokens?: number; completion_tokens?: number } }).usage;
          pt = usage?.prompt_tokens ?? null;
          ct = usage?.completion_tokens ?? null;
        } catch {
          /* non-JSON upstream body */
        }
        await logRequest(upstream.status, pt, ct);
        return withCors(new Response(text, { status: upstream.status, headers: { "Content-Type": contentType } }));
      },
    },
  },
});
