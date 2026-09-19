import { getAuthUserId } from "@convex-dev/auth/server";
import { query, mutation, QueryCtx } from "./_generated/server";
import { v } from "convex/values";
import { paginationOptsValidator } from "convex/server";

// Public shape used across the app
export const publicUserFields = {
  name: true,
  username: true,
  image: true,
  bio: true,
  talents: true,
  isTalent: true,
} as const;

async function requireUser(ctx: QueryCtx) {
  const userId = await getAuthUserId(ctx);
  if (userId === null) throw new Error("Not authenticated");
  const user = await ctx.db.get(userId);
  if (user === null) throw new Error("User not found");
  if (user.isBanned) throw new Error("Account suspended");
  return { userId, user };
}

export const currentProfile = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) return null;
    return await ctx.db.get(userId);
  },
});

export const updateProfile = mutation({
  args: {
    name: v.optional(v.string()),
    username: v.optional(v.string()),
    bio: v.optional(v.string()),
    talents: v.optional(v.array(v.string())),
    isTalent: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const { userId } = await requireUser(ctx);

    if (args.username !== undefined) {
      const slug = args.username.trim().toLowerCase();
      if (!/^[a-z0-9_]{3,20}$/.test(slug)) {
        throw new Error("Username must be 3-20 chars: a-z, 0-9, _");
      }
      const existing = await ctx.db
        .query("users")
        .withIndex("username", (q) => q.eq("username", slug))
        .first();
      if (existing && existing._id !== userId) {
        throw new Error("Username already taken");
      }
      await ctx.db.patch(userId, { username: slug });
    }

    const patch: Record<string, unknown> = {};
    if (args.name !== undefined) patch.name = args.name;
    if (args.bio !== undefined) patch.bio = args.bio;
    if (args.talents !== undefined) patch.talents = args.talents;
    if (args.isTalent !== undefined) patch.isTalent = args.isTalent;
    if (Object.keys(patch).length > 0) {
      await ctx.db.patch(userId, patch);
    }
  },
});

export const getPublicProfile = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.userId);
    if (!user || user.isBanned) return null;
    const followerCount = await countFollowers(ctx, args.userId);
    const followingCount = await countFollowing(ctx, args.userId);
    return { user, followerCount, followingCount };
  },
});

async function countFollowers(ctx: QueryCtx, userId: string) {
  const followers = await ctx.db
    .query("follows")
    .withIndex("by_following", (q) => q.eq("followingId", userId as never))
    .collect();
  return followers.length;
}

async function countFollowing(ctx: QueryCtx, userId: string) {
  const following = await ctx.db
    .query("follows")
    .withIndex("by_follower", (q) => q.eq("followerId", userId as never))
    .collect();
  return following.length;
}

export const isFollowing = query({
  args: { targetId: v.id("users") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) return false;
    const pair = await ctx.db
      .query("follows")
      .withIndex("by_pair", (q) =>
        q.eq("followerId", userId).eq("followingId", args.targetId),
      )
      .first();
    return pair !== null;
  },
});

export const toggleFollow = mutation({
  args: { targetId: v.id("users") },
  handler: async (ctx, args) => {
    const { userId } = await requireUser(ctx);
    if (userId === args.targetId) throw new Error("You cannot follow yourself");

    const existing = await ctx.db
      .query("follows")
      .withIndex("by_pair", (q) =>
        q.eq("followerId", userId).eq("followingId", args.targetId),
      )
      .first();

    if (existing) {
      await ctx.db.delete(existing._id);
      return { following: false };
    }

    await ctx.db.insert("follows", {
      followerId: userId,
      followingId: args.targetId,
      createdAt: Date.now(),
    });

    await ctx.db.insert("notifications", {
      userId: args.targetId,
      type: "follow",
      title: "New follower",
      body: "Someone just followed your profile.",
      createdAt: Date.now(),
    });

    return { following: true };
  },
});

export const searchTalent = query({
  args: {
    categorySlug: v.optional(v.string()),
    searchTerm: v.optional(v.string()),
    paginationOpts: paginationOptsValidator,
  },
  handler: async (ctx, args) => {
    const results = await ctx.db
      .query("users")
      .filter((q) => q.eq(q.field("isBanned"), false))
      .filter((q) =>
        args.searchTerm
          ? q.or(
              q.eq(q.field("username"), args.searchTerm.toLowerCase()),
              q.neq(q.field("name"), undefined),
            )
          : q.neq(q.field("name"), undefined),
      )
      .paginate(args.paginationOpts);

    const filtered = args.categorySlug
      ? results.page.filter((u) =>
          (u.talents ?? []).includes(args.categorySlug!),
        )
      : results.page;

    return {
      ...results,
      page: filtered.map((u) => ({
        _id: u._id,
        name: u.name,
        username: u.username,
        image: u.image,
        bio: u.bio,
        talents: u.talents ?? [],
        isTalent: u.isTalent ?? false,
      })),
    };
  },
});

export const getCategories = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("talentCategories").collect();
  },
});

export const seedCategories = mutation({
  args: {},
  handler: async (ctx) => {
    const existing = await ctx.db.query("talentCategories").first();
    if (existing) return;
    const categories = [
      { name: "Singing", slug: "singing", icon: "mic", sortOrder: 1 },
      { name: "Dancing", slug: "dancing", icon: "footprints", sortOrder: 2 },
      { name: "Comedy", slug: "comedy", icon: "laugh", sortOrder: 3 },
      { name: "Magic", slug: "magic", icon: "wand", sortOrder: 4 },
      { name: "Music", slug: "music", icon: "music", sortOrder: 5 },
      { name: "Acting", slug: "acting", icon: "drama", sortOrder: 6 },
      { name: "Acrobatics", slug: "acrobatics", icon: "zap", sortOrder: 7 },
      { name: "Other", slug: "other", icon: "sparkles", sortOrder: 8 },
    ];
    for (const c of categories) {
      await ctx.db.insert("talentCategories", c);
    }
  },
});
