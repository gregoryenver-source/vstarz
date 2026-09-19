import { toast } from "sonner";

// ── Social share helpers ───────────────────────────────────────────────────
// Facebook: official Share dialog (sharer.php) — works for any public URL.
// Instagram: no web share intent exists, so we use the Web Share API with
// file support (shares the actual video/photo into the IG app on mobile)
// and fall back to copying a ready-to-paste caption on desktop.

/** Absolute, base-aware URL for sharing (works at "/" and "/vstarz/"). */
export function absoluteUrl(path: string): string {
  const base = import.meta.env.BASE_URL.replace(/\/$/, "");
  const clean = path.startsWith("/") ? path : `/${path}`;
  return `${window.location.origin}${base}${clean}`;
}

/** Open the Facebook Share dialog in a centered popup. */
export function shareToFacebook(url: string, quote?: string): void {
  const sharer = new URL("https://www.facebook.com/sharer/sharer.php");
  sharer.searchParams.set("u", url);
  if (quote) sharer.searchParams.set("quote", quote);
  window.open(
    sharer.toString(),
    "facebook-share",
    "width=600,height=580,noopener,noreferrer",
  );
  toast.success("Facebook share dialog opened");
}

type InstagramShare = {
  url: string;
  text: string;
  /** Optional media (video/image) URL — shared as a file when the device
   *  supports it (mobile Instagram). Cross-origin fetch failures are safe. */
  fileUrl?: string;
  fileName?: string;
  fileType?: string;
};

/**
 * Instagram sharing. Strategy:
 * 1. If the device supports the Web Share API with files, fetch the media and
 *    hand the real file to the OS share sheet (user picks Instagram).
 * 2. Else if the Web Share API supports text/url, open it.
 * 3. Else (desktop), copy a paste-ready caption and open instagram.com.
 */
export async function shareToInstagram(opts: InstagramShare): Promise<void> {
  const { url, text, fileUrl, fileName = "vstarz.mp4", fileType = "video/mp4" } = opts;
  const nav = navigator as Navigator;

  // 1. File-level share (the real "post this video to Instagram" path)
  if (fileUrl && nav.canShare) {
    try {
      const res = await fetch(fileUrl, { mode: "cors" });
      if (!res.ok) throw new Error(`fetch ${res.status}`);
      const blob = await res.blob();
      const file = new File([blob], fileName, { type: blob.type || fileType });
      if (nav.canShare({ files: [file] })) {
        await nav.share({ files: [file], text, url });
        toast.success("Shared — pick Instagram in the share sheet");
        return;
      }
    } catch {
      // CORS / unsupported — fall through to the lighter paths.
    }
  }

  // 2. Plain Web Share (mobile share sheet includes Instagram if installed)
  if (nav.share) {
    try {
      await nav.share({ title: "VStarz", text, url });
      toast.success("Shared — pick Instagram in the share sheet");
      return;
    } catch (e) {
      if (e instanceof DOMException && e.name === "AbortError") return; // user dismissed
    }
  }

  // 3. Desktop fallback: caption + link to clipboard, then open Instagram
  try {
    await navigator.clipboard.writeText(`${text}\n${url}`);
    toast.info("Caption copied — paste it into a new Instagram post", {
      description: "Instagram link copied to your clipboard too.",
    });
  } catch {
    toast.info("Open Instagram and paste your caption");
  }
  window.open("https://www.instagram.com/", "_blank", "noopener,noreferrer");
}

/** Copy any link with a toast (used as a generic fallback). */
export async function copyLink(url: string): Promise<void> {
  try {
    await navigator.clipboard.writeText(url);
    toast.success("Link copied to clipboard");
  } catch {
    toast.error("Could not copy the link");
  }
}
