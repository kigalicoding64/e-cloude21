import { createFileRoute } from "@tanstack/react-router";
import { corsPreflight } from "@/lib/cors";
import { summarizeUsage, compareProviders, GB } from "@/lib/storage-usage";

// GET /api/public/v1/storage/usage — usage, growth forecast and cost estimate for the key owner.
export const Route = createFileRoute("/api/public/v1/storage/usage")({
  server: {
    handlers: {
      OPTIONS: async () => corsPreflight(),
      GET: async ({ request }) => {
        const { authorize, apiError, json } = await import("@/lib/api-auth.server");
        const { caller, error } = await authorize(request, "read");
        if (error) return error;
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const [prof, files] = await Promise.all([
          supabaseAdmin.from("profiles").select("storage_used, storage_quota").eq("id", caller.userId).maybeSingle(),
          supabaseAdmin.from("files").select("size, mime_type, created_at").eq("user_id", caller.userId).eq("is_trashed", false).limit(50000),
        ]);
        if (files.error) return apiError("internal_error", files.error.message);
        const summary = summarizeUsage(files.data ?? [], Number(prof.data?.storage_used ?? 0), Number(prof.data?.storage_quota ?? 0));
        const egress = Number(new URL(request.url).searchParams.get("egress_gb") ?? 0) || 0;
        return json({ ...summary, cost_estimate: compareProviders({ storageGb: summary.used_bytes / GB, egressGb: egress, uploadsPerMonth: 0 }) });
      },
    },
  },
});
