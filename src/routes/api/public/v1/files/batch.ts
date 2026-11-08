import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { corsPreflight } from "@/lib/cors";

// POST /api/public/v1/files/batch — { action: "move"|"trash"|"restore"|"delete", ids: [...], folder_id? }
const Body = z.object({
  action: z.enum(["move", "trash", "restore", "delete"]),
  ids: z.array(z.string().uuid()).min(1).max(200),
  folder_id: z.string().uuid().nullable().optional(),
});

export const Route = createFileRoute("/api/public/v1/files/batch")({
  server: {
    handlers: {
      OPTIONS: async () => corsPreflight(),
      POST: async ({ request }) => {
        const { authorize, apiError, json } = await import("@/lib/api-auth.server");
        const { caller, error } = await authorize(request, "manage");
        if (error) return error;
        const parsed = Body.safeParse(await request.json().catch(() => null));
        if (!parsed.success) return apiError("validation_failed", "Invalid body", parsed.error.flatten());
        const { action, ids, folder_id } = parsed.data;
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { data: owned } = await supabaseAdmin.from("files").select("id, size, storage_path")
          .eq("user_id", caller.userId).in("id", ids);
        const rows = owned ?? [];
        const okIds = rows.map((r) => r.id);
        const missing = ids.filter((id) => !okIds.includes(id));
        if (okIds.length) {
          if (action === "move") {
            if (folder_id) {
              const { data: f } = await supabaseAdmin.from("folders").select("id").eq("id", folder_id).eq("user_id", caller.userId).maybeSingle();
              if (!f) return apiError("not_found", "Folder not found");
            }
            await supabaseAdmin.from("files").update({ folder_id: folder_id ?? null }).in("id", okIds);
          } else if (action === "trash" || action === "restore") {
            await supabaseAdmin.from("files").update({ is_trashed: action === "trash" }).in("id", okIds);
          } else {
            await supabaseAdmin.storage.from("user-files").remove(rows.map((r) => r.storage_path));
            await supabaseAdmin.from("files").delete().in("id", okIds);
            const freed = rows.reduce((s, r) => s + Number(r.size), 0);
            const { data: p } = await supabaseAdmin.from("profiles").select("storage_used").eq("id", caller.userId).maybeSingle();
            await supabaseAdmin.from("profiles").update({ storage_used: Math.max(0, Number(p?.storage_used ?? 0) - freed) }).eq("id", caller.userId);
          }
        }
        return json({ action, processed: okIds, not_found: missing });
      },
    },
  },
});
