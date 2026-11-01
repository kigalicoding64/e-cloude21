import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { credentialInventory, requireCredentialAdmin } from "./credential-inventory";

export const getCredentialInventory = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "admin",
    });
    requireCredentialAdmin(data, Boolean(error));
    return credentialInventory((name) => {
      if (name === "VITE_SUPABASE_URL") return Boolean(import.meta.env.VITE_SUPABASE_URL);
      if (name === "VITE_SUPABASE_PUBLISHABLE_KEY") return Boolean(import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY);
      return Boolean(process.env[name]);
    });
  });