# Real-Debrid Mobile SPA

A browser-only SPA for Real-Debrid focused on a clean mobile experience.

## Goals
- Use Real-Debrid API directly from the browser (no backend).
- Support device/opensource OAuth flow and token paste.
- Bootstrap via CDN only. No custom CSS classes beyond Bootstrap.
- Theme picker (start with light/dark), user-selectable.
- Test-driven design with unit and system tests.

## Status
- CORS test page is in `tests/cors.html`.
- App scaffolding is complete.

## Planned Pages
Based on the Real-Debrid API namespaces (https://api.real-debrid.com):
- Downloads: Review completed downloads and open or delete links.
- Torrents: Add, inspect, and manage active or completed torrents.
- Unrestrict: Check links and unrestrict files, folders, or containers.
- Traffic: Inspect usage limits and traffic details per hoster.
- Streaming: Fetch transcodes and media info for streamable files.
- Hosts: See supported hosters, availability status, and regex metadata.
- Account: View or update user preferences and account assets.

## Tech
- Vite + React + TypeScript
- Bootstrap via CDN (theme swapping)
- Vitest + React Testing Library (unit)
- Playwright (system)

## Development
- Install: `npm install`
- Dev server: `npm run dev`
- Unit tests: `npm run test`
- System tests: `npm run test:e2e`
- Build production assets: `npm run build`
- Deploy SPA to Cloudflare Pages: `npx wrangler pages deploy dist --project-name rd-static`
- Legacy/optional S3 deploy: `npm run deploy:s3`

## Cloudflare Worker Proxy (for CORS)

When deployed outside localhost, Real-Debrid CORS can fail. This project now includes a Worker-based proxy.

### 1) Deploy the Worker
- Login once: `npm run proxy:login`
- Check account status: `npm run proxy:whoami`
- Deploy: `npm run proxy:deploy`

This uses [cloudflare/wrangler.toml](cloudflare/wrangler.toml). Default worker name is `rd-proxy`.

### 2) Frontend proxy configuration
- The frontend uses the Golle proxy URL directly in code:
	- `https://rd-proxy.golle.workers.dev`

### 3) Restrict browser origins (recommended)
- In `cloudflare/wrangler.toml`, set `ALLOWED_ORIGINS` to a comma-separated list:
	- `ALLOWED_ORIGINS = "https://your-app.com,https://www.your-app.com"`
- Re-deploy after changes: `npm run proxy:deploy`

### Useful commands
- Local proxy dev server: `npm run proxy:dev`
- Live logs: `npm run proxy:tail`
- Proxy health URL: `https://rd-proxy.golle.workers.dev/time`
- Curl health check: `npm run proxy:test:time`
- Curl upstream check: `npm run proxy:test:upstream`

## Cloudflare Pages Hosting + DNS (golle.com)

Cloudflare can host both DNS and SSL for free (standard/free plan), and Pages can host this SPA at the apex domain (`https://golle.com`).

### Commands used
- Confirm Cloudflare auth: `npx wrangler whoami`
- Build site: `npm run build`
- Create Pages project (one-time): `npx wrangler pages project create rd-static --production-branch main`
- Deploy static assets: `npx wrangler pages deploy dist --project-name rd-static`
- List Pages projects: `npx wrangler pages project list`

### Current live Pages URLs
- `https://rd-static.pages.dev`
- `https://master.rd-static.pages.dev`

### Attach apex domain (`golle.com`)
Wrangler v4 no longer exposes the old `pages domain add` command. Use the Cloudflare dashboard:
1. `Workers & Pages` → `rd-static` project
2. `Custom domains` → `Set up a custom domain`
3. Add `golle.com` (and `www.golle.com` if desired)
4. If asked, move DNS to Cloudflare nameservers at your registrar

Cloudflare will provision SSL automatically once DNS is active.

## Notes
- Do not store a client secret in the browser. Use the opensource device flow.
- If Real-Debrid removes CORS in the future, a local proxy will be needed.
