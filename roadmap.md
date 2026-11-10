# Roadmap

- [x] Add developer connection settings using owner-scoped E-Cloud keys, without claiming drop-in SDK compatibility.
- [x] Prepare Vercel deployment configuration and reproduce the custom-domain outage.
- [ ] Test key generation signed in (blocked: no requester account available for a test session).
- [ ] Deploy on Vercel and confirm custom-domain recovery (blocked: no hosting connection or runtime logs available).

- [x] Add an admin credential inventory with names and configuration status only; private values remain hidden.

- [x] Verify the Lovable preview API and hosted backend
- [x] Verify third-party CORS and API-key error handling
- [x] Publish the current Lovable project build
- [ ] Make `cloud.egreedtech.org` serve the current full app (blocked: external Vercel deployment access).
- [x] Point public application addresses at cloud.egreedtech.org only.
- [ ] Re-test the custom domain after deployment (blocked: external hosting access).
- [x] Admin platform health page: live /health, /ready, /metrics probes on both live addresses
- [x] Show missing managed configuration by name only (never values)
- [x] In-browser endpoint tester (cross-origin, API key, secure links)
- [x] Automatic post-publish verification of the official live domains, with history
- [x] AI assistant that analyses logs and names the missing configuration plus next steps
