import { getAuthUserId } from "@convex-dev/auth/server";
import { query, mutation, action, QueryCtx } from "./_generated/server";
import { v } from "convex/values";
import { api } from "./_generated/api";

async function requireUser(ctx: QueryCtx) {
  const userId = await getAuthUserId(ctx);
  if (userId === null) throw new Error("Not authenticated");
  const user = await ctx.db.get(userId);
  if (user === null) throw new Error("User not found");
  if (user.isBanned) throw new Error("Account suspended");
  return { userId, user };
}

// Catalog: credits packs and premium plans
export const CREDIT_PACKS = [
  { id: "starter", credits: 50, priceCents: 499, label: "Starter" },
  { id: "fan", credits: 150, priceCents: 1199, label: "Fan Favorite" },
  { id: "superfan", credits: 500, priceCents: 3499, label: "Superfan" },
  { id: "starpower", credits: 1500, priceCents: 8999, label: "Starpower" },
] as const;

export const PREMIUM_PLANS = [
  {
    id: "premium",
    label: "Premium",
    priceCents: 799,
    perks: [
      "500 bonus credits every month",
      "Ad-free browsing",
      "Exclusive premium badge",
      "Early access to competitions",
    ],
  },
  {
    id: "premium_pro",
    label: "Premium Pro",
    priceCents: 1999,
    perks: [
      "1,500 bonus credits every month",
      "Everything in Premium",
      "Featured placement on the leaderboard",
      "Priority audition review",
    ],
  },
] as const;

export const getCatalog = query({
  args: {},
  handler: async () => ({ creditPacks: CREDIT_PACKS, premiumPlans: PREMIUM_PLANS }),
});

// Creates a Stripe Checkout session through the vly payments gateway.
// For the MVP, if the payments gateway is unavailable, we fail gracefully
// and the UI offers a simulated purchase path so the flow stays testable.
export const createCheckout = action({
  args: {
    kind: v.union(v.literal("credits"), v.literal("premium")),
    packId: v.optional(v.string()),
    planId: v.optional(v.string()),
  },
  handler: async (ctx, args): Promise<{ url?: string; txId: string; simulated?: boolean }> => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) throw new Error("Not authenticated");

    let amountCents = 0;
    let description = "";
    let credits: number | undefined;
    if (args.kind === "credits") {
      const pack = CREDIT_PACKS.find((p) => p.id === args.packId);
      if (!pack) throw new Error("Unknown credit pack");
      amountCents = pack.priceCents;
      credits = pack.credits;
      description = `${pack.label} voting credits (${pack.credits})`;
    } else {
      const plan = PREMIUM_PLANS.find((p) => p.id === args.planId);
      if (!plan) throw new Error("Unknown premium plan");
      amountCents = plan.priceCents;
      description = `${plan.label} membership (monthly)`;
    }

    // Record a pending transaction before hitting the gateway
    const txId = await ctx.runMutation(api.transactions.recordPending, {
      kind: args.kind === "credits" ? "credit_purchase" : "premium_subscription",
      amountCents,
      credits,
      description,
    });

    const key = process.env.VLY_INTEGRATION_KEY;
    const baseUrl =
      process.env.VLY_INTEGRATION_BASE_URL ?? "https://integrations.freebuff.com";

    if (key) {
      try {
        const res = await fetch(`${baseUrl}payments/checkout-sessions`, {
          method: "POST",
          headers: {
            "content-type": "application/json",
            authorization: `Bearer ${key}`,
          },
          body: JSON.stringify({
            amount: amountCents,
            currency: "usd",
            description,
            success_url: `${process.env.CONVEX_SITE_URL}/dashboard?purchase=success`,
            cancel_url: `${process.env.CONVEX_SITE_URL}/boost?purchase=cancelled`,
            metadata: { txId, userId, kind: args.kind, packId: args.packId, planId: args.planId },
          }),
        });
        if (res.ok) {
          const data = (await res.json()) as { url?: string; id?: string };
          await ctx.runMutation(api.transactions.attachProviderRef, {
            txId,
            providerRef: data.id ?? "session",
            provider: "stripe",
          });
          if (data.url) return { url: data.url, txId };
        }
      } catch (err) {
        console.warn("Checkout gateway unavailable:", err);
      }
    }

    // Gateway not configured — return a marker so the client can run the
    // simulated purchase flow (dev/test mode) and still exercise the app.
    return { simulated: true, txId };
  },
});

export const getMyTransactions = query({
  args: {},
  handler: async (ctx) => {
    const { userId } = await requireUser(ctx);
    const txs = await ctx.db
      .query("transactions")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();
    txs.sort((a, b) => b.createdAt - a.createdAt);
    return txs.slice(0, 50);
  },
});
