
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/lib/auth-middleware";

/** Admin-only. Returns values only for browser-published settings; private secrets are never returned. */
const SECRETS = [
  { name: "SUPABASE_URL", purpose: "Address of the identity database and sign-in service.", sensitive: false },
  { name: "SUPABASE_PUBLISHABLE_KEY", purpose: "Public key used by browsers and servers to reach sign-in.", sensitive: false },
  { name: "SUPABASE_SERVICE_ROLE_KEY", purpose: "Privileged server key for token issuing and admin work.", sensitive: true },
  { name: "LOVABLE_API_KEY", purpose: "Powers the AI setup assistant.", sensitive: true },
  { name: "EGREED_ISSUER", purpose: "Optional override of the public OIDC issuer address.", sensitive: false },
] as const;

/**
 * Lists secret names, public values, and whether they are configured.
 * Private secret values are never returned.
 * Access is restricted to authenticated administrators.
 */
export const listProjectSecrets = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "admin",
    });
    requireCredentialAdmin(data, Boolean(error));

    const connection = {
      SUPABASE_URL:
        import.meta.env.VITE_SUPABASE_URL as string | undefined,
      SUPABASE_PUBLISHABLE_KEY:
        import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined,
    };

    return SECRETS.map((s) => {
      const value = s.sensitive
        ? undefined
        : connection[s.name as keyof typeof connection] ??
          process.env[s.name];

      const configured = Boolean(process.env[s.name]) || Boolean(value);

      return {
        name: s.name,
        purpose: s.purpose,
        sensitive: s.sensitive,
        configured,
        value: s.sensitive ? null : value ?? null,
        maskedValue: configured
          ? value
            ? `${value.slice(0, 4)}••••••••${value.slice(-4)}`
            : "•••••••• (hidden)"
          : null,
      };
    });
  });
