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

function slugify(input: string) {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

// ── Catalog ──────────────────────────────────────────────────────────────

export const listProducts = query({
  args: {},
  handler: async (ctx) => {
    const products = await ctx.db.query("merchProducts").collect();
    return products.sort((a, b) => a.priceCents - b.priceCents);
  },
});

export const listEvents = query({
  args: {},
  handler: async (ctx) => {
    const events = await ctx.db
      .query("events")
      .withIndex("by_starts")
      .order("asc")
      .collect();
    return events.filter((e) => e.startsAt > Date.now() - 24 * 60 * 60 * 1000);
  },
});

export const myOrders = query({
  args: {},
  handler: async (ctx) => {
    const { userId } = await requireUser(ctx);
    return await ctx.db
      .query("orders")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .order("desc")
      .collect();
  },
});

// ── Orders (MVP: direct simulated purchase, mirrors credits flow) ────────

export const purchase = mutation({
  args: {
    productId: v.id("merchProducts"),
    quantity: v.number(),
  },
  handler: async (ctx, args) => {
    const { userId } = await requireUser(ctx);
    if (args.quantity < 1 || args.quantity > 10) throw new Error("Quantity must be between 1 and 10");
    const product = await ctx.db.get(args.productId);
    if (!product || !product.active) throw new Error("Product unavailable");

    const now = Date.now();
    const amountCents = product.priceCents * args.quantity;

    const orderId = await ctx.db.insert("orders", {
      userId,
      productId: product._id,
      productName: product.name,
      quantity: args.quantity,
      amountCents,
      status: "paid", // MVP: simulated instant payment; Stripe webhook swaps to pending→paid
      createdAt: now,
    });

    await ctx.db.insert("transactions", {
      userId,
      kind: product.kind === "ticket" ? "event_ticket" : "merch_order",
      amountCents,
      status: "completed",
      provider: "simulated",
      createdAt: now,
    });

    if (product.kind === "ticket") {
      const events = await ctx.db
        .query("events")
        .collect();
      const event = events.find((e) => e.productId === product._id);
      if (!event) throw new Error("Event not found for this ticket");
      if (event.ticketsSold + args.quantity > event.capacity) {
        throw new Error("Not enough tickets remaining");
      }
      await ctx.db.patch(event._id, { ticketsSold: event.ticketsSold + args.quantity });
      await ctx.db.insert("notifications", {
        userId,
        type: "system",
        title: "Ticket confirmed",
        body: `Your ticket${args.quantity > 1 ? "s" : ""} for ${event.title} at ${event.venue}, ${event.city} is confirmed. Show this screen at the door.`,
        link: "/store",
        createdAt: now,
      });
    }

    return orderId;
  },
});

// ── Admin: product + event management ────────────────────────────────────

async function requireAdmin(ctx: QueryCtx) {
  const { userId, user } = await requireUser(ctx);
  if (user.role !== "admin") throw new Error("Admin access required");
  return { userId, user };
}

export const createProduct = mutation({
  args: {
    name: v.string(),
    description: v.string(),
    priceCents: v.number(),
    emoji: v.optional(v.string()),
    kind: v.union(v.literal("merch"), v.literal("ticket")),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const slug = slugify(args.name);
    const existing = await ctx.db
      .query("merchProducts")
      .withIndex("by_slug", (q) => q.eq("slug", slug))
      .first();
    if (existing) throw new Error("A product with this name already exists");
    return await ctx.db.insert("merchProducts", {
      name: args.name,
      slug,
      description: args.description,
      priceCents: args.priceCents,
      emoji: args.emoji,
      kind: args.kind,
      active: true,
      createdAt: Date.now(),
    });
  },
});

export const setActive = mutation({
  args: { productId: v.id("merchProducts"), active: v.boolean() },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    await ctx.db.patch(args.productId, { active: args.active });
  },
});

export const createEvent = mutation({
  args: {
    title: v.string(),
    description: v.string(),
    venue: v.string(),
    city: v.string(),
    startsAt: v.number(),
    priceCents: v.number(),
    capacity: v.number(),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    // Create the linked ticket product automatically
    const slug = slugify(`${args.title}-ticket`);
    const existing = await ctx.db
      .query("merchProducts")
      .withIndex("by_slug", (q) => q.eq("slug", slug))
      .first();
    let productId: typeof existing extends null ? never : NonNullable<typeof existing>["_id"];
    if (existing) {
      productId = existing._id;
    } else {
      productId = await ctx.db.insert("merchProducts", {
        name: `${args.title} — Ticket`,
        slug,
        description: `Admission to ${args.title} at ${args.venue}, ${args.city}.`,
        priceCents: args.priceCents,
        emoji: "🎟️",
        kind: "ticket",
        active: true,
        createdAt: Date.now(),
      });
    }
    return await ctx.db.insert("events", {
      title: args.title,
      description: args.description,
      venue: args.venue,
      city: args.city,
      startsAt: args.startsAt,
      priceCents: args.priceCents,
      capacity: args.capacity,
      ticketsSold: 0,
      productId,
      createdAt: Date.now(),
    });
  },
});
