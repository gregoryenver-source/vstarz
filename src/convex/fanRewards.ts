import { v } from "convex/values";
import { internalMutation, query } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";
import type { QueryCtx } from "./_generated/server";
import type { Id } from "./_generated/dataModel";

async function requireUser(ctx: QueryCtx) {
  const userId = await getAuthUserId(ctx);
  if (userId === null) throw new Error("Not authenticated");
  const user = await ctx.db.get(userId);
  if (user === null) throw new Error("User not found");
  return { userId, user };
}

// Called from other modules (auditionRooms.apply) via ctx.scheduler
export const award = internalMutation({
  args: {
    userId: v.id("users"),
    kind: v.union(
      v.literal("early_discovery"),
      v.literal("vote"),
      v.literal("share"),
      v.literal("referral"),
      v.literal("community"),
    ),
    points: v.number(),
    note: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await ctx.db.insert("fanRewards", {
      ...args,
      createdAt: Date.now(),
    });
  },
});

export const myRewards = query({
  args: {},
  handler: async (ctx) => {
    const { userId } = await requireUser(ctx);
    const rewards = await ctx.db
      .query("fanRewards")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();
    const points = rewards.reduce((sum, r) => sum + r.points, 0);
    const tier =
      points >= 500 ? "Platinum" : points >= 250 ? "Gold" : points >= 100 ? "Silver" : "Bronze";
    return { rewards: rewards.sort((a, b) => b.createdAt - a.createdAt), points, tier };
  },
});

// Public leaderboard of fan-stakeholders
export const leaderboard = query({
  args: {},
  handler: async (ctx) => {
    const all = await ctx.db.query("fanRewards").collect();
    const byUser = new Map<Id<"users">, number>();
    for (const r of all) byUser.set(r.userId, (byUser.get(r.userId) ?? 0) + r.points);
    const entries = await Promise.all(
      [...byUser.entries()].map(async ([userId, points]) => {
        const user = await ctx.db.get(userId);
        return { userId, name: user?.name ?? "Fan", points };
      }),
    );
    return entries.sort((a, b) => b.points - a.points).slice(0, 10);
  },
});
