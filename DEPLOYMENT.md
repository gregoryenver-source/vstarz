# VStarz — Deploying to judahcorporation.co.za/vstarz

This app is configured to live at **`https://www.judahcorporation.co.za/vstarz`**.

The Judah Corporation site is a Vite/React SPA served through **Cloudflare**,
so the cleanest integration is: host this app on its own URL, then proxy the
`/vstarz` subpath to it with a Cloudflare Worker route. The build is already
subpath-aware — no code changes needed at deploy time beyond the env var.

Canonical tags, Open Graph tags, and the PWA manifest already point at
`judahcorporation.co.za/vstarz`, so SEO and link previews work as soon as the
proxy is live.

---

## 1. Build for the subpath

The Vite `base` is controlled by one environment variable, so the same codebase
serves both the Freebuff preview (root path) and production (`/vstarz/`):

```bash
VITE_APP_BASE=/vstarz/ bun run build
```

This produces a `dist/` folder whose `index.html` references every asset under
`/vstarz/assets/...` and whose router mounts at the `/vstarz` basename.

> Do **not** set `VITE_APP_BASE` in `.env` — that would break the Freebuff
> preview, which serves from the root. Pass it only on the build/deploy host.

## 2. Host the build

Two options, both already wired up:

### Option A — Vercel (recommended, `vercel.json` included)

```bash
bunx vercel --prod
```

- Everything is preconfigured in `vercel.json`: the build injects
  `VITE_APP_BASE=/vstarz/` and the Convex URL, mirrors the output under
  `dist/vstarz/` so every `/vstarz/...` path exists on disk, redirects the bare
  upstream root to `/vstarz/`, rewrites deep links to the SPA entry, and sets
  immutable caching on hashed assets.
- Only the Vercel CLI token (`VERCEL_TOKEN`) is needed — nothing else.

The app will be live at `https://<project>.vercel.app/vstarz` — the proxy in
step 3 points at it.

### Option B — Cloudflare Pages

- Build command: `VITE_APP_BASE=/vstarz/ bun run build`
- Output directory: `dist`
- Add the same SPA rewrite behaviour (Pages serves `_redirects` or uses the
  `vercel.json`-equivalent in the dashboard: `/* → /index.html` for
  non-asset routes).

## 3. Proxy the subpath on Judah Corporation's Cloudflare

Add a **Worker route** on the `judahcorporation.co.za` zone matching
`www.judahcorporation.co.za/vstarz*`, with this worker:

```js
// vstarz-proxy worker
const UPSTREAM = "https://<your-project>.vercel.app"; // no trailing slash

export default {
  async fetch(request) {
    const url = new URL(request.url);
    // Forward the path as-is: /vstarz/... exists on the upstream too.
    const upstream = new URL(url.pathname + url.search, UPSTREAM);

    const res = await fetch(upstream, request);

    // Re-clone with CORS-safe headers so the SPA can call its Convex backend.
    const headers = new Headers(res.headers);
    headers.set("x-vstarz-proxy", "1");
    return new Response(res.body, { status: res.status, headers });
  },
};
```

Then in the Cloudflare dashboard: **Workers & Pages → Routes → Add route**

- Route: `www.judahcorporation.co.za/vstarz*`
- Zone: `judahcorporation.co.za`
- Worker: `vstarz-proxy`

Result: `https://www.judahcorporation.co.za/vstarz` serves the app, while the
main Judah Corporation site is untouched.

## 4. Backend (Convex) — already external, nothing to host

Convex functions run on their own deployment (`VITE_CONVEX_URL`), not inside
this build, so the proxy does not need to touch them. Just make sure the
deployed build has the same `VITE_CONVEX_URL` value as the preview
environment.

## 5. Post-deploy checklist

```bash
# 1. The SPA entry loads
curl -sI https://www.judahcorporation.co.za/vstarz | head -5

# 2. Assets resolve under the subpath
curl -s https://www.judahcorporation.co.za/vstarz | grep -o '/vstarz/assets/[^"]*' | head -3

# 3. Deep links fall back to the SPA (not 404)
curl -sI https://www.judahcorporation.co.za/vstarz/dashboard | head -3
```

Also verify in a browser:
- Sign-in loop works (`/vstarz/auth` → `/vstarz/dashboard`)
- Link previews show the VStarz title/description (canonical + OG tags)
- Installing to home screen opens `/vstarz` (manifest scope)
