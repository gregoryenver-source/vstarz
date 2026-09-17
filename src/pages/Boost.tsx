import { useQuery, useMutation, useAction } from "convex/react";
import { api } from "@/convex/_generated/api";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/use-auth";
import { toast } from "sonner";
import {
  Crown,
  Coins,
  Zap,
  Star,
  Check,
  Loader2,
  CreditCard,
  History,
  Sparkles,
} from "lucide-react";
import { useState } from "react";
import type { Id } from "@/convex/_generated/dataModel";

interface Catalog {
  creditPacks: readonly { id: string; credits: number; priceCents: number; label: string }[];
  premiumPlans: readonly { id: string; label: string; priceCents: number; perks: readonly string[] }[];
}

export default function Boost() {
  const { user } = useAuth();
  const catalog = useQuery(api.payments.getCatalog, {}) as Catalog | undefined;
  const txs = useQuery(api.payments.getMyTransactions, {}) ?? [];

  const createCheckout = useAction(api.payments.createCheckout);
  const completeTx = useMutation(api.transactions.complete);

  const [busy, setBusy] = useState<string | null>(null);

  const usd = (cents: number) => `$${(cents / 100).toFixed(2)}`;

  const handlePurchase = async (kind: "credits" | "premium", id: string) => {
    setBusy(id);
    try {
      const res = await createCheckout({
        kind,
        packId: kind === "credits" ? id : undefined,
        planId: kind === "premium" ? id : undefined,
      });

      if (res && typeof res === "object" && "url" in res && res.url) {
        // Real Stripe checkout session
        window.location.href = res.url as string;
        return;
      }

      // Simulated completion (gateway not configured yet)
      if (res && typeof res === "object" && "txId" in res) {
        await completeTx({ txId: res.txId as Id<"transactions"> });
        toast.success(
          kind === "credits"
            ? "Credits added! (test mode — connect Stripe keys to charge real cards)"
            : "Premium activated! (test mode — connect Stripe keys to charge real cards)",
        );
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Purchase failed");
    } finally {
      setBusy(null);
    }
  };

  const plan = user?.plan ?? "free";
  const credits = user?.votingCredits ?? 0;

  return (
    <AppShell>
      {/* Current standing */}
      <div className="card-spot mb-8 flex flex-col items-start gap-4 rounded-3xl p-6 sm:flex-row sm:items-center sm:p-8">
        <div className="flex size-14 items-center justify-center rounded-2xl bg-primary/15 text-primary shadow-glow-gold">
          <Coins className="size-7" />
        </div>
        <div className="flex-1">
          <p className="text-sm text-muted-foreground">Your balance</p>
          <p className="font-display text-4xl font-bold">{credits.toLocaleString()} credits</p>
        </div>
        <div className="text-sm text-muted-foreground">
          Votes cost 1 credit in competitions · 2 credits in live rooms
        </div>
      </div>

      {/* Premium plans */}
      <div className="mb-10">
        <div className="mb-5 flex items-center gap-2">
          <Crown className="size-5 text-primary" />
          <h2 className="font-display text-2xl font-bold">Premium membership</h2>
          {plan !== "free" && (
            <Badge className="border border-primary/40 bg-primary/15 text-primary">
              <Zap className="mr-1 size-3" />
              You're {plan === "premium_pro" ? "Premium Pro" : "Premium"}
            </Badge>
          )}
        </div>
        <div className="grid gap-5 md:grid-cols-2">
          {(catalog?.premiumPlans ?? []).map((p) => {
            const isCurrent = plan === p.id;
            return (
              <div
                key={p.id}
                className={`card-spot relative flex flex-col rounded-2xl p-6 ${p.id === "premium_pro" ? "border-primary/40" : ""}`}
              >
                {p.id === "premium_pro" && (
                  <Badge className="absolute right-4 top-4 bg-primary text-primary-foreground">
                    <Star className="mr-1 size-3 fill-current" /> Best value
                  </Badge>
                )}
                <h3 className="font-display text-xl font-semibold">{p.label}</h3>
                <p className="mt-2">
                  <span className="font-display text-3xl font-bold">{usd(p.priceCents)}</span>
                  <span className="text-muted-foreground">/mo</span>
                </p>
                <ul className="mt-4 flex-1 space-y-2.5 text-sm">
                  {p.perks.map((perk) => (
                    <li key={perk} className="flex items-start gap-2">
                      <Check className="mt-0.5 size-4 shrink-0 text-primary" />
                      {perk}
                    </li>
                  ))}
                </ul>
                <Button
                  onClick={() => handlePurchase("premium", p.id)}
                  disabled={busy !== null || isCurrent}
                  className={`mt-6 font-semibold ${p.id === "premium_pro" ? "shadow-glow-gold" : ""}`}
                  variant={isCurrent ? "outline" : "default"}
                >
                  {busy === p.id ? (
                    <Loader2 className="mr-2 size-4 animate-spin" />
                  ) : (
                    <CreditCard className="mr-2 size-4" />
                  )}
                  {isCurrent ? "Current plan" : `Subscribe to ${p.label}`}
                </Button>
              </div>
            );
          })}
        </div>
      </div>

      {/* Credit packs */}
      <div className="mb-10">
        <div className="mb-5 flex items-center gap-2">
          <Coins className="size-5 text-primary" />
          <h2 className="font-display text-2xl font-bold">Voting credit packs</h2>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {(catalog?.creditPacks ?? []).map((pack) => (
            <div key={pack.id} className="card-spot flex flex-col rounded-2xl p-5">
              <p className="text-sm text-muted-foreground">{pack.label}</p>
              <p className="mt-1 font-display text-2xl font-bold text-gradient-gold">
                {pack.credits.toLocaleString()}
              </p>
              <p className="text-sm text-muted-foreground">credits</p>
              <Button
                onClick={() => handlePurchase("credits", pack.id)}
                disabled={busy !== null}
                variant="outline"
                className="mt-4 font-semibold"
              >
                {busy === pack.id ? (
                  <Loader2 className="mr-2 size-4 animate-spin" />
                ) : (
                  <Sparkles className="mr-2 size-4 text-primary" />
                )}
                {usd(pack.priceCents)}
              </Button>
            </div>
          ))}
        </div>
      </div>

      {/* History */}
      <div>
        <div className="mb-4 flex items-center gap-2">
          <History className="size-5 text-primary" />
          <h2 className="font-display text-xl font-bold">Purchase history</h2>
        </div>
        {txs.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No purchases yet. Grab a credit pack to start boosting your favorites.
          </p>
        ) : (
          <div className="card-spot divide-y divide-border/50 overflow-hidden rounded-2xl">
            {txs.map((t) => (
              <div key={t._id} className="flex items-center gap-4 px-5 py-3.5 text-sm">
                <span className="flex-1 truncate">
                  {t.kind === "credit_purchase"
                    ? `Credit pack (+${t.credits})`
                    : t.kind === "premium_subscription"
                      ? "Premium subscription"
                      : "Votes cast"}
                </span>
                <span className="text-muted-foreground">
                  {t.amountCents > 0 ? usd(t.amountCents) : "—"}
                </span>
                <Badge
                  variant="outline"
                  className={
                    t.status === "completed"
                      ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-400"
                      : t.status === "pending"
                        ? "border-primary/30 bg-primary/10 text-primary"
                        : "border-destructive/30 text-destructive"
                  }
                >
                  {t.status}
                </Badge>
              </div>
            ))}
          </div>
        )}
      </div>

      <p className="mt-8 text-xs text-muted-foreground">
        Payments run through Stripe. Connect your Stripe keys in the project's
        Keys tab to enable live checkout — until then purchases complete in
        test mode. In-app purchases on iOS/Android arrive with the mobile apps.
      </p>
    </AppShell>
  );
}
