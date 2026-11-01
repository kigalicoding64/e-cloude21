import { describe, expect, it } from "vitest";
import { credentialInventory, requireCredentialAdmin, publicConnectionValue } from "./credential-inventory";

describe("credential inventory security", () => {
  it("allows only the four public connection aliases to reveal values", () => {
    const connection = { url: "https://public.example", publishableKey: "public-test-key" };
    for (const name of ["VITE_SUPABASE_URL", "SUPABASE_URL"]) {
      expect(publicConnectionValue(name, connection)).toBe("https://public.example");
    }
    for (const name of ["VITE_SUPABASE_PUBLISHABLE_KEY", "SUPABASE_PUBLISHABLE_KEY"]) {
      expect(publicConnectionValue(name, connection)).toBe("public-test-key");
    }
    for (const name of ["SUPABASE_SERVICE_ROLE_KEY", "LOVABLE_API_KEY", "STREAMTAPE_LOGIN", "STREAMTAPE_KEY", "UNKNOWN"]) {
      expect(publicConnectionValue(name, connection)).toBeNull();
    }
    expect(publicConnectionValue("SUPABASE_URL", {})).toBeNull();
  });
  it("includes all five requested connection credential names", () => {
    const names = credentialInventory(() => false).map((item) => item.name);
    expect(names).toEqual(expect.arrayContaining([
      "VITE_SUPABASE_URL", "VITE_SUPABASE_PUBLISHABLE_KEY", "SUPABASE_URL",
      "SUPABASE_PUBLISHABLE_KEY", "SUPABASE_SERVICE_ROLE_KEY",
    ]));
  });
  it("returns only names, descriptions and status, never private values", () => {
    for (const row of credentialInventory(() => true)) {
      expect(Object.keys(row).sort()).toEqual(["kind", "name", "purpose", "status", "value"]);
      expect(row.value).toBe("Not displayed");
    }
    expect(credentialInventory(() => true).find((row) => row.name === "SUPABASE_SERVICE_ROLE_KEY")?.status)
      .toBe("Platform managed · not viewable");
  });
  it("rejects a non-admin and fails closed on role lookup errors", () => {
    expect(() => requireCredentialAdmin(false, false)).toThrow("Administrator access required");
    expect(() => requireCredentialAdmin(null, false)).toThrow();
    expect(() => requireCredentialAdmin(true, true)).toThrow();
    expect(() => requireCredentialAdmin(true, false)).not.toThrow();
  });
});