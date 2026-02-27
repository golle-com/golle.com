# Real-Debrid Mobile (golle.com)

[![Build](https://github.com/golle-com/golle.com/actions/workflows/build.yml/badge.svg)](https://github.com/golle-com/golle.com/actions/workflows/build.yml)
[![Lint](https://github.com/golle-com/golle.com/actions/workflows/lint.yml/badge.svg)](https://github.com/golle-com/golle.com/actions/workflows/lint.yml)

Mobile-first React SPA for Real-Debrid account management and link workflows, with a Cloudflare Worker proxy for CORS-safe API access.

## What this project includes

- Device flow authentication and token paste login
- Downloads, Torrents, Unrestrict, Hosts, and Account panels
- Theme switching using Bootstrap + Bootswatch CDN themes
- Local token storage and authenticated API calls
- Cloudflare Worker proxy for `/rest/*` and `/oauth/*`

## Tech stack

- React 19 + TypeScript + Vite
- React Router
- ESLint
- Cloudflare Workers + Wrangler

## CI

GitHub Actions runs two checks on push and pull requests:

- `Lint` → `npm run lint`
- `Build` → `npm run build`

Workflows:

- `.github/workflows/lint.yml`
- `.github/workflows/build.yml`

## Local development

### Prerequisites

- Node.js 22+
- npm

### Install

```bash
npm ci
```

### Run app

```bash
npm run dev
```

### Lint

```bash
npm run lint
```

### Build

```bash
npm run build
```

### Preview production build

```bash
npm run preview
```

## Cloudflare Worker proxy

Worker source lives in `cloudflare/src/index.ts`.

### Useful commands

```bash
npm run login
npm run whoami
npm run devw
npm run deploy:worker
npm run tail
```

### Health checks

```bash
npm run test:time
npm run test:upstream
```

### CORS origin allowlist

Set `ALLOWED_ORIGINS` in `cloudflare/wrangler.toml` as a comma-separated list:

```toml
ALLOWED_ORIGINS = "https://your-app.com,https://www.your-app.com"
```

## Deploy

### Cloudflare Pages preview deploy

```bash
npm run deploy:preview
```

### Cloudflare Pages production deploy

```bash
npm run deploy:prod
```

## Security notes

- Do not put a Real-Debrid client secret in frontend code.
- Use device flow / token-based auth only.
- Limit allowed browser origins in Worker configuration.
