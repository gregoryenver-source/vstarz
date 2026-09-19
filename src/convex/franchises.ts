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

// Public directory of approved franchises
export const listApproved = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db
      .query("franchises")
      .withIndex("by_status", (q) => q.eq("status", "approved"))
      .collect();
  },
});

export const myFranchises = query({
  args: {},
  handler: async (ctx) => {
    const { userId } = await requireUser(ctx);
    const all = await ctx.db.query("franchises").collect();
    return all.filter((f) => f.ownerId === userId);
  },
});

// Anyone can apply to run a VStarz franchise in their city/country/niche
export const apply = mutation({
  args: {
    name: v.string(),
    kind: v.union(
      v.literal("city"),
      v.literal("country"),
      v.literal("gospel"),
      v.literal("schools"),
      v.literal("universities"),
    ),
    region: v.string(),
    description: v.string(),
  },
  handler: async (ctx, args) => {
    const { userId } = await requireUser(ctx);
    const slug = `${args.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")}-${Date.now().toString(36)}`;
    const franchiseId = await ctx.db.insert("franchises", {
      ...args,
      slug,
      ownerId: userId,
      status: "pending",
      memberCount: 0,
      createdAt: Date.now(),
    });
    return { franchiseId };
  },
});
