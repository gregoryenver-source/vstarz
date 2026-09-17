import { getAuthUserId } from "@convex-dev/auth/server";
import { query, mutation, QueryCtx } from "./_generated/server";
import { v } from "convex/values";
import type { Doc } from "./_generated/dataModel";

async function requireUser(ctx: QueryCtx) {
  const userId = await getAuthUserId(ctx);
  if (userId === null) throw new Error("Not authenticated");
  const user = await ctx.db.get(userId);
  if (user === null) throw new Error("User not found");
  if (user.isBanned) throw new Error("Account suspended");
  return { userId, user };
}

export const listForEntry = query({
  args: { entryId: v.id("entries"), limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const messages = await ctx.db
      .query("entryComments")
      .withIndex("by_entry", (q) => q.eq("entryId", args.entryId))
      .order("desc")
      .take(args.limit ?? 30);
    messages.reverse();
    return await Promise.all(
      messages.map(async (m) => {
        const author: Doc<"users"> | null = await ctx.db.get(m.userId);
        return {
          _id: m._id,
          body: m.body,
          createdAt: m.createdAt,
          userId: m.userId,
          authorName: author?.name ?? author?.username ?? "Guest",
          authorImage: author?.image,
        };
      }),
    );
  },
});

export const add = mutation({
  args: { entryId: v.id("entries"), body: v.string() },
  handler: async (ctx, args) => {
    const { userId } = await requireUser(ctx);
    const body = args.body.trim().slice(0, 500);
    if (!body) throw new Error("Comment is empty");

    const entry = await ctx.db.get(args.entryId);
    if (!entry) throw new Error("Entry not found");

    const id = await ctx.db.insert("entryComments", {
      entryId: args.entryId,
      userId,
      body,
      createdAt: Date.now(),
    });

    // Notify the performer when someone else comments on their audition
    if (entry.userId !== userId) {
      await ctx.db.insert("notifications", {
        userId: entry.userId,
        type: "system",
        title: "New comment on your audition",
        body: body.slice(0, 120),
        link: `/competitions/${entry.competitionId}`,
        createdAt: Date.now(),
      });
    }

    return id;
  },
});

export const remove = mutation({
  args: { commentId: v.id("entryComments") },
  handler: async (ctx, args) => {
    const { userId, user } = await requireUser(ctx);
    const comment = await ctx.db.get(args.commentId);
    if (!comment) throw new Error("Comment not found");
    if (comment.userId !== userId && user.role !== "admin") {
      throw new Error("Not authorized");
    }
    await ctx.db.delete(args.commentId);
  },
});
