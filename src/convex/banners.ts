import { getAuthUserId } from "@convex-dev/auth/server";
import { query, mutation, QueryCtx } from "./_generated/server";
import { v } from "convex/values";

async function requireUser(ctx: QueryCtx) {
  const userId = await getAuthUserId(ctx);
  if (userId === null) throw new Error("Not authenticated");
  const user = await ctx.db.get(userId);
  if (user === null) throw new Error("User not found");
  if (user.isBanned) throw new Error("Account suspended");
  return { userId, user };
}

function requireAdminUser(user: { role?: string; isBanned?: boolean }) {
  if (user.role !== "admin") throw new Error("Admin access required");
}

// ── Public: active banners (digital real estate) ─────────────────────────

export const getActiveBanners = query({
  args: { placement: v.string() },
  handler: async (ctx, args) => {
    const now = Date.now();
    const banners = await ctx.db
      .query("banners")
      .withIndex("by_active", (q) => q.eq("active", true))
      .collect();
    return banners
      .filter(
        (b) =>
          b.placement === args.placement &&
          (b.startsAt === undefined || b.startsAt <= now) &&
          (b.endsAt === undefined || b.endsAt >= now),
      )
      .sort((a, b) => b.weight - a.weight);
  },
});

export const recordImpression = mutation({
  args: { bannerId: v.id("banners") },
  handler: async (ctx, args) => {
    const banner = await ctx.db.get(args.bannerId);
    if (!banner) return;
    await ctx.db.patch(args.bannerId, { impressions: banner.impressions + 1 });
  },
});

export const recordClick = mutation({
  args: { bannerId: v.id("banners") },
  handler: async (ctx, args) => {
    const banner = await ctx.db.get(args.bannerId);
    if (!banner) return;
    await ctx.db.patch(args.bannerId, { clicks: banner.clicks + 1 });
  },
});

// ── Admin: banner management ─────────────────────────────────────────────

export const listAll = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) throw new Error("Not authenticated");
    const user = await ctx.db.get(userId);
    if (!user) throw new Error("User not found");
    requireAdminUser(user);
    return await ctx.db
      .query("banners")
      .withIndex("by_active", (q) => q.eq("active", true))
      .collect();
  },
});

export const create = mutation({
  args: {
    title: v.string(),
    subtitle: v.string(),
    advertiser: v.string(),
    ctaLabel: v.string(),
    ctaUrl: v.string(),
    placement: v.union(
      v.literal("home_hero"),
      v.literal("home_feed"),
      v.literal("competitions"),
      v.literal("live"),
    ),
    weight: v.number(),
    startsAt: v.optional(v.number()),
    endsAt: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) throw new Error("Not authenticated");
    const user = await ctx.db.get(userId);
    if (!user) throw new Error("User not found");
    requireAdminUser(user);
    return await ctx.db.insert("banners", {
      ...args,
      active: true,
      impressions: 0,
      clicks: 0,
      createdAt: Date.now(),
    });
  },
});

export const setActive = mutation({
  args: { bannerId: v.id("banners"), active: v.boolean() },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) throw new Error("Not authenticated");
    const user = await ctx.db.get(userId);
    if (!user) throw new Error("User not found");
    requireAdminUser(user);
    await ctx.db.patch(args.bannerId, { active: args.active });
  },
});
