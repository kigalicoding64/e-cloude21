import { expect, it } from "vitest";
import { missingBuildSettings } from "./hosting-preflight.mjs";

it("rejects a build without both public connection settings", () => {
  expect(missingBuildSettings({})).toEqual(["VITE_SUPABASE_URL", "VITE_SUPABASE_PUBLISHABLE_KEY"]);
  expect(missingBuildSettings({ VITE_SUPABASE_URL: "https://example.test", VITE_SUPABASE_PUBLISHABLE_KEY: "public-test" })).toEqual([]);
});