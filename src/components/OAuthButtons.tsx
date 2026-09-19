import { useAuthActions } from "@convex-dev/auth/react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Button } from "@/components/ui/button";
import { Loader2, Link2, CheckCircle2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

export type MetaProvider = "facebook" | "instagram";

interface OAuthButtonsProps {
  /** Path to land on after consent completes. */
  redirectTo?: string;
  /** Full-width stacked buttons (sign-in card) vs inline (profile). */
  stacked?: boolean;
  label?: "signIn" | "link";
  /** "icon" renders compact circular brand icons — for page headers. */
  variant?: "full" | "icon";
  /** Provider (e.g. from ?connect=facebook) to start automatically once config loads. */
  autoStart?: MetaProvider | null;
  /** Called after the auto-start handoff so the caller can clean the URL. */
  onAutoStarted?: () => void;
}

const BRAND: Record<
  MetaProvider,
  { name: string; logo: string }
> = {
  facebook: { name: "Facebook", logo: "facebook-logo.svg" },
  instagram: { name: "Instagram", logo: "instagram-logo.svg" },
};

const PROVIDERS: MetaProvider[] = ["facebook", "instagram"];

/**
 * "Continue with Facebook / Instagram" buttons using the official brand
 * artwork. Convex Auth runs the full OAuth dance: the button hands off to
 * Meta's consent screen; on return, the account is linked to the current
 * session (if signed in) or signs the user up/in directly.
 *
 * The buttons are always visible. If a Meta app credential pair has not been
 * added to the environment yet, clicking shows a friendly message instead of
 * a dead link.
 */
export function OAuthButtons({
  redirectTo,
  stacked = true,
  label = "signIn",
  variant = "full",
  autoStart = null,
  onAutoStarted,
}: OAuthButtonsProps) {
  const { signIn } = useAuthActions();
  const configured = useQuery(api.authProviders.configured);
  const [busy, setBusy] = useState<MetaProvider | null>(null);
  const autoStartFired = useRef(false);

  const start = async (provider: MetaProvider) => {
    if (configured !== undefined && !configured[provider]) {
      toast.error(
        `${BRAND[provider].name} sign-in is being connected. Please continue with your mobile number or email for now.`,
      );
      return;
    }
    setBusy(provider);
    try {
      await signIn(provider, redirectTo ? { redirectTo } : undefined);
    } catch {
      toast.error(`Could not start ${BRAND[provider].name} sign-in.`);
      setBusy(null);
    }
  };

  // Deep-link support: /auth?connect=facebook starts that provider's OAuth
  // as soon as we know whether it is configured.
  useEffect(() => {
    if (!autoStart || configured === undefined || autoStartFired.current) return;
    autoStartFired.current = true;
    if (configured[autoStart]) {
      void start(autoStart);
    } else {
      toast.error(
        `${BRAND[autoStart].name} sign-in is being connected. You can sign up with your mobile number or email meanwhile.`,
      );
    }
    onAutoStarted?.();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoStart, configured]);

  const iconButton = (provider: MetaProvider) => (
    <button
      key={provider}
      type="button"
      aria-label={`Connect with ${BRAND[provider].name}`}
      title={`Connect with ${BRAND[provider].name}`}
      disabled={busy !== null}
      onClick={() => void start(provider)}
      className="flex size-9 items-center justify-center rounded-full border border-border/60 bg-white/95 shadow-sm transition-transform hover:scale-105 hover:shadow disabled:opacity-60"
    >
      {busy === provider ? (
        <Loader2 className="size-5 animate-spin text-primary" />
      ) : (
        <img
          src={`${import.meta.env.BASE_URL}${BRAND[provider].logo}`}
          alt=""
          aria-hidden
          className="size-5"
        />
      )}
    </button>
  );

  if (variant === "icon") {
    return (
      <div className="flex items-center gap-1.5">
        {PROVIDERS.map(iconButton)}
      </div>
    );
  }

  const buttons = PROVIDERS.map((provider) => (
    <Button
      key={provider}
      type="button"
      variant="outline"
      className={
        provider === "facebook"
          ? `h-12 gap-3 border-[#0866ff]/40 bg-white text-[#0866ff] hover:bg-[#f0f4ff] hover:text-[#0866ff] ${
              stacked ? "w-full" : ""
            }`
          : `h-12 gap-3 border-white/20 bg-white text-neutral-800 hover:bg-neutral-100 hover:text-neutral-800 ${
              stacked ? "w-full" : ""
            }`
      }
      disabled={busy !== null}
      onClick={() => void start(provider)}
    >
      {busy === provider ? (
        <Loader2 className="size-5 animate-spin" />
      ) : (
        <img
          src={`${import.meta.env.BASE_URL}${BRAND[provider].logo}`}
          alt=""
          aria-hidden
          className="size-6"
        />
      )}
      <span className="font-semibold">
        {label === "link"
          ? `Link ${BRAND[provider].name}`
          : `Continue with ${BRAND[provider].name}`}
      </span>
    </Button>
  ));

  return <div className="flex flex-col gap-2">{buttons}</div>;
}

/**
 * Linked social accounts panel for the profile page.
 */
export function LinkedAccounts() {
  const linked = useQuery(api.authProviders.myLinkedAccounts);
  const configured = useQuery(api.authProviders.configured);

  if (configured === undefined || linked === undefined) return null;

  const accounts = new Map(
    (linked ?? []).map((a) => [a.provider, a] as const),
  );
  const rows = [
    { id: "facebook", name: "Facebook", logo: "facebook-logo.svg" },
    { id: "instagram", name: "Instagram", logo: "instagram-logo.svg" },
  ];

  return (
    <div className="space-y-2">
      {rows.map((r) => {
        const account = accounts.get(r.id);
        return (
          <div
            key={r.id}
            className="flex items-center justify-between rounded-xl border border-border/60 bg-card/60 px-4 py-3"
          >
            <div className="flex items-center gap-3">
              <img
                src={`${import.meta.env.BASE_URL}${r.logo}`}
                alt=""
                aria-hidden
                className="size-7"
              />
              <div className="text-sm">
                <p className="font-medium">{r.name}</p>
                <p className="text-xs text-muted-foreground">
                  {account
                    ? `Linked ${new Date(account.linkedAt).toLocaleDateString()}`
                    : "Not connected"}
                </p>
              </div>
            </div>
            {account ? (
              <span className="flex items-center gap-1.5 text-xs font-medium text-emerald-400">
                <CheckCircle2 className="size-4" />
                Connected
              </span>
            ) : (
              <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Link2 className="size-4" />
                Use sign-in to link
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
}
