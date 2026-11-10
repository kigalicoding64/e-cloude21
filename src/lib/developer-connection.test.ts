import { describe, expect, it } from "vitest";
import { connectionKeyScopes, connectionEnvironment } from "./developer-connection";

describe("developer connection key permissions", () => {
  it("read-only keys cannot upload or manage", () => {
    expect(connectionKeyScopes("read-only")).toEqual(["read", "download"]);
  });
  it("server keys grant storage permissions without an admin bypass", () => {
    expect(connectionKeyScopes("server")).toEqual(["read", "download", "upload", "manage"]);
  });
  it("uses only the official custom domain", () => {
    expect(connectionEnvironment("test-key")).toBe("ECLOUD_URL=https://cloud.egreedtech.org\nECLOUD_API_KEY=test-key");
  });
});