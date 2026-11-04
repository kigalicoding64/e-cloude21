import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { PROVIDER_IDS, isSafeBaseUrl, keyHint } from "@/lib/ai-providers";

const AddSchema = z.object({
  provider: z.enum(PROVIDER_IDS as [string, ...string[]]),
  label: z.string().trim().min(1).max(80),
  api_key: z.string().trim().max(4000),
  base_url: z.string().trim().max(500).optional().nullable(),
});

export const addProviderKey = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => AddSchema.parse(input))
  .handler(async ({ data, context }) => {
    const base = data.base_url ? data.base_url.replace(/\/+$/, "") : null;
    if (data.provider === "custom" && !base) throw new Error("Custom providers need a base URL");
    if (base && !isSafeBaseUrl(base)) throw new Error("Base URL must be a public https:// address");
    if (data.provider !== "custom" && !data.api_key) throw new Error("API key is required");
    const { encryptSecret } = await import("@/lib/ai-vault.server");
    const { ciphertext, iv } = await encryptSecret(data.api_key);
    const { error } = await context.supabase.from("ai_provider_keys").insert({
      owner_id: context.userId,
      provider: data.provider,
      label: data.label,
      base_url: base,
      key_ciphertext: ciphertext,
      key_iv: iv,
      key_hint: data.api_key ? keyHint(data.api_key) : "none",
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });
