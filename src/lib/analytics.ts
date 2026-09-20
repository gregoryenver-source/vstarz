import { track as vaTrack } from "@vercel/analytics";

/**
 * App download / install funnel tracking.
 *
 * Every event is recorded twice, fire-and-forget (never throws):
 *  1. Vercel Web Analytics  — visible in the Vercel dashboard under the
 *     project's Analytics tab (Events: download_page_view, app_install_started,
 *     app_install_completed).
 *  2. First-party `appInstalls` table in Convex — surfaced as the
 *     "App downloads" stat card in the Admin portal, so the number is visible
 *     inside the app itself without touching any external dashboard.
 *
 * Only the event kind, platform family and referrer are recorded — never any
 * user-identifying data.
 */

type InstallEvent = "page_view" | "install_started" | "install_completed";

const CONVEX_URL = (import.meta.env.VITE_CONVEX_URL as string | undefined) ?? "";

const PLATFORM =
  typeof navigator === "undefined"
    ? undefined
    : /iphone|ipad|ipod/i.test(navigator.userAgent)
      ? "ios"
      : /android/i.test(navigator.userAgent)
        ? "android"
        : "desktop";

// Module-level guard so React StrictMode remounts in dev don't double-count.
let pageViewCounted = false;

export function trackAppDownload(kind: InstallEvent) {
  try {
    vaTrack(
      kind === "page_view" ? "download_page_view" : `app_${kind}`,
      { platform: PLATFORM ?? "unknown" },
    );
  } catch {
    // Vercel Analytics unavailable (e.g. non-Vercel host) — the first-party
    // counter below still records the event.
  }

  if (!CONVEX_URL) return;
  void fetch(`${CONVEX_URL}/api/mutation`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      path: "admin:trackInstall",
      args: {
        kind,
        platform: PLATFORM,
        referrer:
          typeof document !== "undefined" && document.referrer
            ? document.referrer
            : undefined,
      },
      format: "json",
    }),
    keepalive: true,
  }).catch(() => {
    // tracking must never break the UX
  });
}

export function trackDownloadPageView() {
  if (pageViewCounted) return;
  pageViewCounted = true;
  trackAppDownload("page_view");
}
