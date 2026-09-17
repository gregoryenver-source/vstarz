import { getAuthUserId } from "@convex-dev/auth/server";
import { mutation, QueryCtx } from "./_generated/server";
import { v } from "convex/values";

async function requireUser(ctx: QueryCtx) {
  const userId = await getAuthUserId(ctx);
  if (userId === null) throw new Error("Not authenticated");
  const user = await ctx.db.get(userId);
  if (user === null) throw new Error("User not found");
  if (user.isBanned) throw new Error("Account suspended");
  return { userId, user };
}

export const recordPending = mutation({
  args: {
    kind: v.union(
      v.literal("credit_purchase"),
      v.literal("premium_subscription"),
      v.literal("vote_spend"),
    ),
    amountCents: v.number(),
    credits: v.optional(v.number()),
    description: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { userId } = await requireUser(ctx);
    return await ctx.db.insert("transactions", {
      userId,
      kind: args.kind,
      amountCents: args.amountCents,
      credits: args.credits,
      status: "pending",
      createdAt: Date.now(),
    });
  },
});

export const attachProviderRef = mutation({
  args: {
    txId: v.id("transactions"),
    providerRef: v.string(),
    provider: v.string(),
  },
  handler: async (ctx, args) => {
    const { userId } = await requireUser(ctx);
    const tx = await ctx.db.get(args.txId);
    if (!tx || tx.userId !== userId) throw new Error("Not authorized");
    await ctx.db.patch(args.txId, {
      providerRef: args.providerRef,
      provider: args.provider,
    });
  },
});

// Called by the client after a successful (or simulated) payment. In
// production this is invoked by the Stripe webhook; here it is exposed as a
// user-triggered completion path guarded by transaction ownership.
export const complete = mutation({
  args: { txId: v.id("transactions") },
  handler: async (ctx, args) => {
    const { userId, user } = await requireUser(ctx);
    const tx = await ctx.db.get(args.txId);
    if (!tx || tx.userId !== userId) throw new Error("Not authorized");
    if (tx.status === "completed") return { alreadyCompleted: true };

    const now = Date.now();

    if (tx.kind === "credit_purchase" && tx.credits) {
      await ctx.db.patch(userId, {
        votingCredits: (user.votingCredits ?? 0) + tx.credits,
      });
    }

    if (tx.kind === "premium_subscription") {
      // VStarz Gold — the platform's premium tier
      const expiresAt = now + 30 * 24 * 60 * 60 * 1000;
      await ctx.db.patch(userId, {
        plan: "gold",
        planExpiresAt: expiresAt,
        votingCredits: (user.votingCredits ?? 0) + 500,
      });
    }

    await ctx.db.patch(args.txId, {
      status: "completed",
      provider: tx.provider ?? "simulated",
    });

    await ctx.db.insert("notifications", {
      userId,
      type: "system",
      title:
        tx.kind === "credit_purchase"
          ? `+${tx.credits} voting credits added`
          : "Premium activated!",
      body:
        tx.kind === "credit_purchase"
          ? "Your credits are ready to use."
          : "Enjoy your premium perks and monthly credits.",
      link: "/boost",
      createdAt: now,
    });

    return { completed: true };
  },
});
