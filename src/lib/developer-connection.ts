import type { ApiScope } from "./api-errors";
import { PUBLIC_BASE_URL } from "./site";

export type ConnectionKeyKind = "read-only" | "server";

// These are owner-scoped application keys, never database service-role credentials.
export function connectionKeyScopes(kind: ConnectionKeyKind): ApiScope[] {
  return kind === "read-only" ? ["read", "download"] : ["read", "download", "upload", "manage"];
}

export function connectionEnvironment(key: string): string {
  return `ECLOUD_URL=${PUBLIC_BASE_URL}\nECLOUD_API_KEY=${key}`;
}

export function connectionExample(): string {
  return `const response = await fetch(process.env.ECLOUD_URL + '/api/public/v1/files', {
  headers: { 'X-API-Key': process.env.ECLOUD_API_KEY }
});
if (!response.ok) throw new Error('E-Cloud request failed: ' + response.status);
const files = await response.json();`;
}