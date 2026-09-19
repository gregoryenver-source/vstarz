import { getAuthUserId } from "@convex-dev/auth/server";
import { query, mutation, QueryCtx } from "./_generated/server";
import { v } from "convex/values";
import type { Doc } from "./_generated/dataModel";

/**
 * Community — brought to you exclusively by Meta.
 *
 * Creators, Voters and the Public engage in one feed: post, like, comment.
 * Every engagement requires a connected account: a vStarz account (mobile
 * / email sign-in) or a Meta account (Facebook / Instagram OAuth).
 */

const MAX_POST = 1000;
const MAX_COMMENT = 500;

async function requireConnectedUser(ctx: QueryCtx) {
  const userId = await getAuthUserId(ctx);
  if (userId === null) {
    throw new Error(
      "Connect your vStarz, Facebook or Instagram account to join the community.",
    );
  }
  const user = await ctx.db.get(userId);
  if (user === null) throw new Error("User not found");
  if (user.isBanned) throw new Error("Account suspended");
  return { userId, user };
}

export const listFeed = query({
  args: {
    audience: v.optional(
      v.union(v.literal("creator"), v.literal("voter"), v.literal("public")),
    ),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const posts = await ctx.db
      .query("communityPosts")
      .withIndex("by_status_created", (q) => q.eq("status", "visible"))
      .order("desc")
      .take(args.limit ?? 50);

    const filtered =
      args.audience === undefined
        ? posts
        : posts.filter((p) => p.audience === args.audience);

    return await Promise.all(
      filtered.map(async (p) => {
        const author: Doc<"users"> | null = await ctx.db.get(p.authorId);
        return {
          _id: p._id,
          body: p.body,
          audience: p.audience,
          likeCount: p.likeCount,
          commentCount: p.commentCount,
          createdAt: p.createdAt,
          authorId: p.authorId,
          authorName: author?.name ?? author?.username ?? "Guest",
          authorImage: author?.image,
          authorRole: author?.role,
        };
      }),
    );
  },
});

export const stats = query({
  args: {},
  handler: async (ctx) => {
    const posts = await ctx.db
      .query("communityPosts")
      .withIndex("by_status_created", (q) => q.eq("status", "visible"))
      .collect();
    const members = new Set(posts.map((p) => p.authorId));
    const comments = await ctx.db.query("communityComments").collect();
    return {
      posts: posts.length,
      members: members.size,
      comments: comments.length,
    };
  },
});

export const createPost = mutation({
  args: {
    body: v.string(),
    audience: v.union(
      v.literal("creator"),
      v.literal("voter"),
      v.literal("public"),
    ),
  },
  handler: async (ctx, args) => {
    const { userId } = await requireConnectedUser(ctx);
    const body = args.body.trim().slice(0, MAX_POST);
    if (!body) throw new Error("Post is empty");

    return await ctx.db.insert("communityPosts", {
      authorId: userId,
      body,
      audience: args.audience,
      likeCount: 0,
      commentCount: 0,
      status: "visible",
      createdAt: Date.now(),
    });
  },
});

export const removePost = mutation({
  args: { postId: v.id("communityPosts") },
  handler: async (ctx, args) => {
    const { userId, user } = await requireConnectedUser(ctx);
    const post = await ctx.db.get(args.postId);
    if (!post) throw new Error("Post not found");
    if (post.authorId !== userId && user.role !== "admin") {
      throw new Error("Not authorized");
    }
    // Cascade: likes + comments
    const likes = await ctx.db
      .query("communityLikes")
      .withIndex("by_post", (q) => q.eq("postId", args.postId))
      .collect();
    for (const l of likes) await ctx.db.delete(l._id);
    const comments = await ctx.db
      .query("communityComments")
      .withIndex("by_post", (q) => q.eq("postId", args.postId))
      .collect();
    for (const c of comments) await ctx.db.delete(c._id);
    await ctx.db.delete(args.postId);
  },
});

export const toggleLike = mutation({
  args: { postId: v.id("communityPosts") },
  handler: async (ctx, args) => {
    const { userId } = await requireConnectedUser(ctx);
    const post = await ctx.db.get(args.postId);
    if (!post) throw new Error("Post not found");

    const existing = await ctx.db
      .query("communityLikes")
      .withIndex("by_post_user", (q) =>
        q.eq("postId", args.postId).eq("userId", userId),
      )
      .first();

    if (existing) {
      await ctx.db.delete(existing._id);
      await ctx.db.patch(args.postId, { likeCount: Math.max(0, post.likeCount - 1) });
      return { liked: false };
    }
    await ctx.db.insert("communityLikes", {
      postId: args.postId,
      userId,
      createdAt: Date.now(),
    });
    await ctx.db.patch(args.postId, { likeCount: post.likeCount + 1 });
    return { liked: true };
  },
});

export const listComments = query({
  args: { postId: v.id("communityPosts"), limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const messages = await ctx.db
      .query("communityComments")
      .withIndex("by_post", (q) => q.eq("postId", args.postId))
      .order("desc")
      .take(args.limit ?? 50);
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

export const addComment = mutation({
  args: { postId: v.id("communityPosts"), body: v.string() },
  handler: async (ctx, args) => {
    const { userId } = await requireConnectedUser(ctx);
    const body = args.body.trim().slice(0, MAX_COMMENT);
    if (!body) throw new Error("Comment is empty");

    const post = await ctx.db.get(args.postId);
    if (!post) throw new Error("Post not found");

    const id = await ctx.db.insert("communityComments", {
      postId: args.postId,
      userId,
      body,
      createdAt: Date.now(),
    });
    await ctx.db.patch(args.postId, { commentCount: post.commentCount + 1 });

    // Notify the author when someone else joins the conversation
    if (post.authorId !== userId) {
      await ctx.db.insert("notifications", {
        userId: post.authorId,
        type: "system",
        title: "New comment on your community post",
        body: body.slice(0, 120),
        link: "/community",
        createdAt: Date.now(),
      });
    }
    return id;
  },
});

export const removeComment = mutation({
  args: { commentId: v.id("communityComments") },
  handler: async (ctx, args) => {
    const { userId, user } = await requireConnectedUser(ctx);
    const comment = await ctx.db.get(args.commentId);
    if (!comment) throw new Error("Comment not found");
    if (comment.userId !== userId && user.role !== "admin") {
      throw new Error("Not authorized");
    }
    const post = await ctx.db.get(comment.postId);
    await ctx.db.delete(args.commentId);
    if (post) {
      await ctx.db.patch(post._id, {
        commentCount: Math.max(0, post.commentCount - 1),
      });
    }
  },
});
