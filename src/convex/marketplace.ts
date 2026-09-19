import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";
import type { QueryCtx } from "./_generated/server";

async function requireUser(ctx: QueryCtx) {
  const userId = await getAuthUserId(ctx);
  if (userId === null) throw new Error("Not authenticated");
  const user = await ctx.db.get(userId);
  if (user === null) throw new Error("User not found");
  return { userId, user };
}

// Public marketplace listings
export const list = query({
  args: {},
  handler: async (ctx) => {
    const listings = await ctx.db
      .query("marketListings")
      .withIndex("by_active", (q) => q.eq("active", true))
      .collect();
    return await Promise.all(
      listings.map(async (l) => {
        const seller = await ctx.db.get(l.sellerId);
        return {
          ...l,
          sellerName: seller?.name ?? "VStarz Creator",
          sellerCountry: seller?.country,
        };
      }),
    );
  },
});

export const mySales = query({
  args: {},
  handler: async (ctx) => {
    const { userId } = await requireUser(ctx);
    const orders = await ctx.db
      .query("marketOrders")
      .withIndex("by_seller", (q) => q.eq("sellerId", userId))
      .collect();
    return orders.sort((a, b) => b.createdAt - a.createdAt);
  },
});

export const myPurchases = query({
  args: {},
  handler: async (ctx) => {
    const { userId } = await requireUser(ctx);
    const orders = await ctx.db
      .query("marketOrders")
      .withIndex("by_buyer", (q) => q.eq("buyerId", userId))
      .collect();
    return orders.sort((a, b) => b.createdAt - a.createdAt);
  },
});

export const create = mutation({
  args: {
    title: v.string(),
    category: v.union(
      v.literal("beats"),
      v.literal("lyrics"),
      v.literal("artwork"),
      v.literal("logos"),
      v.literal("video_editing"),
      v.literal("vocal_feature"),
      v.literal("session_musician"),
      v.literal("choreography"),
    ),
    description: v.string(),
    priceCents: v.number(),
  },
  handler: async (ctx, args) => {
    const { userId } = await requireUser(ctx);
    if (args.priceCents < 0) throw new Error("Price cannot be negative");
    const listingId = await ctx.db.insert("marketListings", {
      ...args,
      sellerId: userId,
      active: true,
      salesCount: 0,
      createdAt: Date.now(),
    });
    return { listingId };
  },
});

export const purchase = mutation({
  args: { listingId: v.id("marketListings") },
  handler: async (ctx, { listingId }) => {
    const { userId } = await requireUser(ctx);
    const listing = await ctx.db.get(listingId);
    if (!listing) throw new Error("Listing not found");
    if (!listing.active) throw new Error("Listing is no longer active");
    if (listing.sellerId === userId) throw new Error("You cannot buy your own listing");

    await ctx.db.insert("marketOrders", {
      listingId,
      listingTitle: listing.title,
      buyerId: userId,
      sellerId: listing.sellerId,
      amountCents: listing.priceCents,
      status: "pending",
      createdAt: Date.now(),
    });
    await ctx.db.patch(listingId, { salesCount: listing.salesCount + 1 });
    return { ok: true };
  },
});

export const closeListing = mutation({
  args: { listingId: v.id("marketListings") },
  handler: async (ctx, { listingId }) => {
    const { userId } = await requireUser(ctx);
    const listing = await ctx.db.get(listingId);
    if (!listing) throw new Error("Listing not found");
    if (listing.sellerId !== userId) throw new Error("Only the seller can close this listing");
    await ctx.db.patch(listingId, { active: false });
    return { ok: true };
  },
});
