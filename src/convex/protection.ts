import { getAuthUserId } from "@convex-dev/auth/server";
import { query, mutation, QueryCtx } from "./_generated/server";
import { v } from "convex/values";
import type { Doc, Id } from "./_generated/dataModel";

async function requireUser(ctx: QueryCtx) {
  const userId = await getAuthUserId(ctx);
  if (userId === null) throw new Error("Not authenticated");
  const user = await ctx.db.get(userId);
  if (user === null) throw new Error("User not found");
  if (user.isBanned) throw new Error("Account suspended");
  return { userId, user };
}

// ── Vault: all protection items for the signed-in creator ─────────────────

export const myVault = query({
  args: {},
  handler: async (ctx) => {
    const { userId } = await requireUser(ctx);

    const items = await ctx.db
      .query("protectionItems")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();
    items.sort((a, b) => b.createdAt - a.createdAt);

    const works = items.filter((i) => i.kind === "copyright");
    const contracts = items.filter(
      (i) => i.kind === "contract" || i.kind === "license",
    );
    const royalties = items.filter((i) => i.kind === "royalty");

    const royaltyTotalCents = royalties.reduce(
      (s, r) => s + (r.amountCents ?? 0),
      0,
    );

    return {
      works,
      contracts,
      royalties,
      summary: {
        registeredWorks: works.length,
        activeContracts: contracts.filter((c) => c.status === "active").length,
        royaltyStreams: royalties.filter((r) => r.status === "active").length,
        royaltyTotalCents,
      },
    };
  },
});

// ── Register a copyright claim (proof-of-creation timestamp) ──────────────

export const registerWork = mutation({
  args: {
    title: v.string(),
    details: v.string(),
    reference: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { userId } = await requireUser(ctx);
    if (args.title.trim().length < 2) throw new Error("Title is required");

    const id = await ctx.db.insert("protectionItems", {
      userId,
      kind: "copyright",
      title: args.title.trim(),
      details: args.details.trim(),
      reference: args.reference?.trim() || undefined,
      status: "pending",
      createdAt: Date.now(),
    });

    await ctx.db.insert("notifications", {
      userId,
      type: "system",
      title: "Copyright claim filed",
      body: `"${args.title.trim()}" is timestamped in the VStarz Protection Vault while ownership is verified.`,
      link: "/protection",
      createdAt: Date.now(),
    });

    return id;
  },
});

// ── Store a contract or licensing agreement ───────────────────────────────

export const addContract = mutation({
  args: {
    kind: v.union(v.literal("contract"), v.literal("license")),
    title: v.string(),
    details: v.string(),
    reference: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { userId } = await requireUser(ctx);
    if (args.title.trim().length < 2) throw new Error("Title is required");

    return await ctx.db.insert("protectionItems", {
      userId,
      kind: args.kind,
      title: args.title.trim(),
      details: args.details.trim(),
      reference: args.reference?.trim() || undefined,
      status: "active",
      createdAt: Date.now(),
    });
  },
});

// ── Track a royalty stream ────────────────────────────────────────────────

export const addRoyalty = mutation({
  args: {
    title: v.string(),
    details: v.string(),
    reference: v.optional(v.string()),
    amountCents: v.number(),
  },
  handler: async (ctx, args) => {
    const { userId } = await requireUser(ctx);
    if (args.title.trim().length < 2) throw new Error("Title is required");
    if (args.amountCents < 0) throw new Error("Amount must be positive");

    return await ctx.db.insert("protectionItems", {
      userId,
      kind: "royalty",
      title: args.title.trim(),
      details: args.details.trim(),
      reference: args.reference?.trim() || undefined,
      amountCents: args.amountCents,
      status: "active",
      createdAt: Date.now(),
    });
  },
});

// ── Record a royalty payout against an existing stream ────────────────────

export const recordRoyaltyPayment = mutation({
  args: { itemId: v.id("protectionItems"), amountCents: v.number() },
  handler: async (ctx, args) => {
    const { userId } = await requireUser(ctx);
    const item = await ctx.db.get(args.itemId);
    if (!item) throw new Error("Item not found");
    if (item.userId !== userId) throw new Error("Not your item");
    if (item.kind !== "royalty") throw new Error("Not a royalty stream");
    if (args.amountCents <= 0) throw new Error("Amount must be positive");

    await ctx.db.patch(args.itemId, {
      amountCents: (item.amountCents ?? 0) + args.amountCents,
    });
    return (item.amountCents ?? 0) + args.amountCents;
  },
});

// ── Lifecycle: archive / reactivate any item ──────────────────────────────

export const setStatus = mutation({
  args: {
    itemId: v.id("protectionItems"),
    status: v.union(
      v.literal("active"),
      v.literal("pending"),
      v.literal("archived"),
    ),
  },
  handler: async (ctx, args) => {
    const { userId } = await requireUser(ctx);
    const item = await ctx.db.get(args.itemId);
    if (!item) throw new Error("Item not found");
    if (item.userId !== userId) throw new Error("Not your item");

    await ctx.db.patch(args.itemId, { status: args.status });
  },
});

export const removeItem = mutation({
  args: { itemId: v.id("protectionItems") },
  handler: async (ctx, args) => {
    const { userId } = await requireUser(ctx);
    const item = await ctx.db.get(args.itemId);
    if (!item) throw new Error("Item not found");
    if (item.userId !== userId) throw new Error("Not your item");

    await ctx.db.delete(args.itemId);
  },
});

// ── Brand-safety attestation used by the Sponsor Intelligence dashboard ───

export const protectionAttestation = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args): Promise<{ works: number; active: number }> => {
    const items: Doc<"protectionItems">[] = await ctx.db
      .query("protectionItems")
      .withIndex("by_user", (q) => q.eq("userId", args.userId as Id<"users">))
      .collect();
    return {
      works: items.filter((i) => i.kind === "copyright").length,
      active: items.filter((i) => i.status === "active").length,
    };
  },
});
