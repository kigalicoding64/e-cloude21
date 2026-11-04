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

        let upstream: Response;
        try {
          upstream = await fetch(`${base}/chat/completions`, {
            method: "POST",
            headers,
            body: JSON.stringify({ ...body, model: ref.model }),
          });
        } catch {
          return apiError("service_unavailable", "Could not reach the AI provider.");
        }
        supabaseAdmin
          .from("ai_provider_keys")
          .update({ last_used_at: new Date().toISOString(), request_count: (row.request_count ?? 0) + 1 })
          .eq("id", row.id)
          .then(() => {});
        return withCors(
          new Response(upstream.body, {
            status: upstream.status,
            headers: { "Content-Type": upstream.headers.get("content-type") ?? "application/json" },
          }),
        );
      },
    },
  },
});
