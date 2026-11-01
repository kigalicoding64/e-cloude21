export const CREDENTIAL_DEFINITIONS = [
  { name: "VITE_SUPABASE_URL", purpose: "Browser connection", kind: "Public configuration" },
  { name: "VITE_SUPABASE_PUBLISHABLE_KEY", purpose: "Browser access", kind: "Publishable key" },
  { name: "SUPABASE_URL", purpose: "Server connection", kind: "Server configuration" },
  { name: "SUPABASE_PUBLISHABLE_KEY", purpose: "Server authentication", kind: "Publishable key" },
  { name: "SUPABASE_SERVICE_ROLE_KEY", purpose: "Privileged server operations", kind: "Private · platform managed" },
  { name: "LOVABLE_API_KEY", purpose: "AI services", kind: "Private · platform managed" },
  { name: "STREAMTAPE_LOGIN", purpose: "Video storage account", kind: "Private integration credential" },
  { name: "STREAMTAPE_KEY", purpose: "Video storage access", kind: "Private integration credential" },
] as const;

export function credentialInventory(isConfigured: (name: string) => boolean) {
  return CREDENTIAL_DEFINITIONS.map((entry) => ({
    ...entry,
    status: entry.name === "SUPABASE_SERVICE_ROLE_KEY"
      ? "Platform managed · not viewable"
      : isConfigured(entry.name) ? "Configured" : "Not detected",
    value: "Not displayed",
  }));
}

export function requireCredentialAdmin(isAdmin: boolean | null, hasError: boolean) {
  if (hasError || isAdmin !== true) throw new Error("Administrator access required");
}