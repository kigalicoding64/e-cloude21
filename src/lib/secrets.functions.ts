import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { CREDENTIAL_DEFINITIONS, publicConnectionValue, requireCredentialAdmin } from "./credential-inventory";

/** Admin-only. Returns values only for browser-published settings; private secrets are never returned. */
export const listProjectSecrets = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "admin",
    });
    requireCredentialAdmin(data, Boolean(error));
    const connection = {
      url: import.meta.env.VITE_SUPABASE_URL as string | undefined,
      publishableKey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined,
    };
    return CREDENTIAL_DEFINITIONS.map((d) => {
      const value = publicConnectionValue(d.name, connection);
      const configured = d.name.startsWith("VITE_") ? Boolean(value) : Boolean(process.env[d.name]) || Boolean(value);
      const sensitive = d.kind.startsWith("Private");
      return {
        name: d.name,
        purpose: `${d.purpose} · ${d.kind}`,
        sensitive,
        configured,
        value: sensitive ? null : value,
        maskedValue: configured
          ? sensitive
            ? "•••••••• (private)"
            : value
              ? `${value.slice(0, 4)}••••••••${value.slice(-4)}`
              : "•••••••• (hidden)"
          : null,
      };
    });
  });
