import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { corsPreflight } from "@/lib/cors";
import { randomToken } from "@/lib/hash";

// POST /api/public/v1/files/import-url — { url, name?, folder_id? } fetches a public https file into storage.
const Body = z.object({
  url: z.string().url().max(2000),
  name: z.string().min(1).max(200).optional(),
  folder_id: z.string().uuid().nullable().optional(),
});
const MAX = 100 * 1024 * 1024;

function blockedHost(h: string) {
  return /^(localhost|127\.|10\.|192\.168\.|169\.254\.|0\.|\[?::1)/i.test(h) || /^172\.(1[6-9]|2\d|3[01])\./.test(h) || h.endsWith(".internal");
}

export const Route = createFileRoute("/api/public/v1/files/import-url")({
  server: {
    handlers: {
      OPTIONS: async () => corsPreflight(),
      POST: async ({ request }) => {
        const { authorize, apiError, json } = await import("@/lib/api-auth.server");
        const { caller, error } = await authorize(request, "upload");
        if (error) return error;
        const parsed = Body.safeParse(await request.json().catch(() => null));
        if (!parsed.success) return apiError("validation_failed", "Invalid body", parsed.error.flatten());
        const src = new URL(parsed.data.url);
        if (src.protocol !== "https:" || blockedHost(src.hostname)) return apiError("validation_failed", "Only public https URLs are allowed");

        const res = await fetch(src, { redirect: "follow" }).catch(() => null);
        if (!res || !res.ok) return apiError("bad_request", `Could not fetch URL (${res?.status ?? "network error"})`);
        const len = Number(res.headers.get("content-length") ?? 0);
        if (len > MAX) return apiError("payload_too_large", "Remote file too large (max 100MB)");
        const buf = new Uint8Array(await res.arrayBuffer());
        if (buf.byteLength > MAX) return apiError("payload_too_large", "Remote file too large (max 100MB)");

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { data: prof } = await supabaseAdmin.from("profiles").select("storage_used, storage_quota").eq("id", caller.userId).maybeSingle();
        if (prof && Number(prof.storage_used) + buf.byteLength > Number(prof.storage_quota)) return apiError("quota_exceeded", "Storage quota exceeded");

        const name = (parsed.data.name ?? decodeURIComponent(src.pathname.split("/").pop() || "download")).slice(0, 200);
        const mime = res.headers.get("content-type")?.split(";")[0] || "application/octet-stream";
        const path = `${caller.userId}/${randomToken(16)}-${name}`;
        const { error: upErr } = await supabaseAdmin.storage.from("user-files").upload(path, buf, { contentType: mime });
        if (upErr) return apiError("storage_error", upErr.message);
        const { data: row, error: dbErr } = await supabaseAdmin.from("files").insert({
          user_id: caller.userId, folder_id: parsed.data.folder_id ?? null, name, size: buf.byteLength, mime_type: mime, storage_path: path,
        }).select("id,name,size,mime_type,folder_id,created_at").single();
        if (dbErr) { await supabaseAdmin.storage.from("user-files").remove([path]); return apiError("internal_error", dbErr.message); }
        await supabaseAdmin.from("profiles").update({ storage_used: Number(prof?.storage_used ?? 0) + buf.byteLength }).eq("id", caller.userId);
        return json({ ...row, source_url: src.toString() }, 201);
      },
    },
  },
});
