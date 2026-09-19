import { getAuthUserId } from "@convex-dev/auth/server";
import { query, mutation, QueryCtx } from "./_generated/server";
import { v } from "convex/values";

async function requireUser(ctx: QueryCtx) {
  const userId = await getAuthUserId(ctx);
  if (userId === null) throw new Error("Not authenticated");
  return userId;
}

export const listMine = query({
  args: {},
  handler: async (ctx) => {
    // Signed-out visitors (e.g. the /community connection gate) see an
    // empty list instead of an error.
    const userId = await getAuthUserId(ctx);
    if (userId === null) return [];
    const items = await ctx.db
      .query("notifications")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();
    items.sort((a, b) => b.createdAt - a.createdAt);
    return items.slice(0, 30);
  },
});

export const unreadCount = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) return 0;
    const items = await ctx.db
      .query("notifications")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();
    return items.filter((n) => !n.readAt).length;
  },
});

export const markRead = mutation({
  args: { id: v.id("notifications") },
  handler: async (ctx, args) => {
    const userId = await requireUser(ctx);
    const n = await ctx.db.get(args.id);
    if (!n || n.userId !== userId) throw new Error("Not authorized");
    await ctx.db.patch(args.id, { readAt: Date.now() });
  },
});

export const markAllRead = mutation({
  args: {},
  handler: async (ctx) => {
    const userId = await requireUser(ctx);
    const items = await ctx.db
      .query("notifications")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();
    for (const n of items) {
      if (!n.readAt) await ctx.db.patch(n._id, { readAt: Date.now() });
    }
  },
});

// In-app notification center. Browser push requires a service worker +
// permission flow; for the MVP we surface notifications in-app and expose a
// helper the UI can use to request browser notification permission.
export const requestPushPermission = mutation({
  args: {},
  handler: async () => {
    return { note: "handled client-side" };
  },
});
