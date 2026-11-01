import { describe, expect, it } from "vitest";
import { credentialInventory, requireCredentialAdmin } from "./credential-inventory";

describe("credential inventory security", () => {
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