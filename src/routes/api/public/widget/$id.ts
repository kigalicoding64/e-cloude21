import { createFileRoute } from "@tanstack/react-router";
import { CORS_HEADERS, corsPreflight } from "@/lib/cors";
import { originAllowed } from "@/lib/model-widget";

// GET /api/public/widget/:id -> public display settings for an embedded chat widget.
// Returns only appearance fields; never the model server address or owner.
export const Route = createFileRoute("/api/public/widget/$id")({
  server: {
    handlers: {
      OPTIONS: async () => corsPreflight(),
      GET: async ({ request, params }) => {
        const j = (b: unknown, s = 200) =>
          new Response(JSON.stringify(b), { status: s, headers: { "Content-Type": "application/json", ...CORS_HEADERS } });
        if (!/^[0-9a-f-]{36}$/i.test(params.id)) return j({ error: "not_found" }, 404);
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { data } = await supabaseAdmin
          .from("model_widgets")
          .select("id, title, greeting, primary_color, theme, is_active, allowed_origins, inference_url")
          .eq("id", params.id)
          .maybeSingle();
        if (!data || !data.is_active) return j({ error: "not_found" }, 404);
        if (!originAllowed(data.allowed_origins ?? [], request.headers.get("origin")))
          return j({ error: "origin_not_allowed" }, 403);
        return j({
          id: data.id,
          title: data.title,
          greeting: data.greeting,
          primary_color: data.primary_color,
          theme: data.theme,
          online: !!data.inference_url,
        });
      },
    },
  },
});
