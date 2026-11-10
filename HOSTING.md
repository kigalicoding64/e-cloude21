# E-Cloud on Vercel

This repository deploys the full app, not a forwarding proxy. Its custom domain remains `https://cloud.egreedtech.org`.

## Deployment settings

- Framework preset: Other
- Node.js: 22.x
- Build command: `bun run build:hosting`
- Output directory: leave unset; Nitro writes Vercel's Build Output API to `.vercel/output`.
- Remove any old output-directory override such as `dist/client` or `.` and any catch-all proxy rewrite when hosting the full app.

Set these environment names in the Vercel project's Production environment using the values from your own backend project:

| Name | Available to |
| --- | --- |
| VITE_SUPABASE_URL | Build/public |
| VITE_SUPABASE_PUBLISHABLE_KEY | Build/public |
| SUPABASE_URL | Server runtime |
| SUPABASE_PUBLISHABLE_KEY | Server runtime |
| SUPABASE_SERVICE_ROLE_KEY | Server runtime only |

All five must belong to the same backend project. Never prefix a private key with `VITE_`, commit it, or put it into the connection page. On Lovable Cloud the privileged key is managed and cannot be exported; these external-hosting settings apply only to your own backend account.

Redeploy after changing the settings: public settings are bundled at build time, so restarting an old deployment is not enough.

## Check the actual failure

The generic “This page didn't load” page is the application's error fallback, not proof that Vercel itself failed. In Vercel's runtime logs for the failing request, find the original exception logged by the server wrapper. Common causes include missing environment settings, a wrong output directory, or a database migration that has not been applied. Do not infer a missing variable solely from the fallback page.

Verify `/`, `/api/public/v1/health`, and `/api/public/v1/ready` return successful responses at the custom domain. Then test an owner-scoped E-Cloud API key with `/api/public/v1/me` and `/api/public/v1/files`.

## Connection keys are not drop-in backend credentials

The developer connection page generates E-Cloud storage API keys. Both read-only and server keys act only as their owner. They are not anonymous browser credentials, do not bypass RLS, and do not implement the `/rest/v1`, `/auth/v1`, or `/storage/v1` contracts expected by other SDKs. Keep these keys server-side.