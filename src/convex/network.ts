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

async function requireAdmin(ctx: QueryCtx) {
  const { userId, user } = await requireUser(ctx);
  if (user.role !== "admin") throw new Error("Admin access required");
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

// ── Fan Clubs ────────────────────────────────────────────────────────────

export const listFanClubs = query({
  args: {},
  handler: async (ctx) => {
    const clubs = await ctx.db.query("fanClubs").collect();
    return Promise.all(
      clubs.map(async (club: Doc<"fanClubs">) => {
        const artist = await ctx.db.get(club.artistId);
        return {
          ...club,
          artist: artist
            ? { _id: artist._id, name: artist.name, username: artist.username, image: artist.image }
            : null,
        };
      }),
    );
  },
});

export const myMemberships = query({
  args: {},
  handler: async (ctx) => {
    const { userId } = await requireUser(ctx);
    const memberships = await ctx.db
      .query("fanClubMembers")
      .withIndex("by_member", (q) => q.eq("userId", userId))
      .collect();
    return memberships.map((m) => m.clubId);
  },
});

export const createFanClub = mutation({
  args: {
    name: v.string(),
    description: v.string(),
    tier: v.union(v.literal("free"), v.literal("gold")),
  },
  handler: async (ctx, args) => {
    const { userId, user } = await requireUser(ctx);
    if (!user.isTalent && user.role !== "artist" && user.role !== "admin") {
      throw new Error("Only verified talent can create a fan club");
    }
    const slug = slugify(args.name);
    const existing = await ctx.db
      .query("fanClubs")
      .withIndex("by_slug", (q) => q.eq("slug", slug))
      .first();
    if (existing) throw new Error("A fan club with this name already exists");
    const clubId = await ctx.db.insert("fanClubs", {
      name: args.name,
      slug,
      artistId: userId,
      description: args.description,
      tier: args.tier,
      memberCount: 0,
      createdAt: Date.now(),
    });
    await ctx.db.insert("fanClubMembers", { clubId, userId, joinedAt: Date.now() });
    await ctx.db.patch(clubId, { memberCount: 1 });
    return clubId;
  },
});

export const joinFanClub = mutation({
  args: { clubId: v.id("fanClubs") },
  handler: async (ctx, args) => {
    const { userId, user } = await requireUser(ctx);
    const club = await ctx.db.get(args.clubId);
    if (!club) throw new Error("Fan club not found");
    if (club.tier === "gold" && user.plan !== "gold") {
      throw new Error("This fan club requires a VStarz Gold membership");
    }
    const existing = await ctx.db
      .query("fanClubMembers")
      .withIndex("by_club_user", (q) => q.eq("clubId", args.clubId).eq("userId", userId))
      .first();
    if (existing) return { joined: false };
    await ctx.db.insert("fanClubMembers", { clubId: args.clubId, userId, joinedAt: Date.now() });
    await ctx.db.patch(args.clubId, { memberCount: club.memberCount + 1 });
    return { joined: true };
  },
});

export const leaveFanClub = mutation({
  args: { clubId: v.id("fanClubs") },
  handler: async (ctx, args) => {
    const { userId } = await requireUser(ctx);
    const club = await ctx.db.get(args.clubId);
    if (!club) throw new Error("Fan club not found");
    const membership = await ctx.db
      .query("fanClubMembers")
      .withIndex("by_club_user", (q) => q.eq("clubId", args.clubId).eq("userId", userId))
      .first();
    if (!membership) return { left: false };
    await ctx.db.delete(membership._id);
    await ctx.db.patch(args.clubId, {
      memberCount: Math.max(0, club.memberCount - 1),
    });
    return { left: true };
  },
});

// ── Artist Verification ──────────────────────────────────────────────────

export const requestVerification = mutation({
  args: {
    stageName: v.string(),
    categorySlug: v.string(),
    evidenceUrl: v.string(),
    statement: v.string(),
  },
  handler: async (ctx, args) => {
    const { userId } = await requireUser(ctx);
    const pending = await ctx.db
      .query("verificationRequests")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();
    if (pending.some((r) => r.status === "pending")) {
      throw new Error("You already have a verification request under review");
    }
    return await ctx.db.insert("verificationRequests", {
      userId,
      stageName: args.stageName,
      categorySlug: args.categorySlug,
      evidenceUrl: args.evidenceUrl,
      statement: args.statement,
      status: "pending",
      createdAt: Date.now(),
    });
  },
});

export const myVerification = query({
  args: {},
  handler: async (ctx) => {
    const { userId } = await requireUser(ctx);
    const requests = await ctx.db
      .query("verificationRequests")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .order("desc")
      .collect();
    return requests[0] ?? null;
  },
});

export const listVerificationRequests = query({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);
    const requests = await ctx.db
      .query("verificationRequests")
      .withIndex("by_status", (q) => q.eq("status", "pending"))
      .collect();
    return Promise.all(
      requests.map(async (r) => {
        const user = await ctx.db.get(r.userId);
        return {
          ...r,
          user: user ? { _id: user._id, name: user.name, email: user.email } : null,
        };
      }),
    );
  },
});

export const reviewVerification = mutation({
  args: {
    requestId: v.id("verificationRequests"),
    approve: v.boolean(),
    note: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { userId } = await requireAdmin(ctx);
    const request = await ctx.db.get(args.requestId);
    if (!request || request.status !== "pending") throw new Error("Request not found or already reviewed");

    await ctx.db.patch(args.requestId, {
      status: args.approve ? "approved" : "rejected",
      reviewNote: args.note,
      reviewedAt: Date.now(),
    });

    if (args.approve) {
      await ctx.db.patch(request.userId, { isTalent: true, badges: ["verified"] });
      await ctx.db.insert("notifications", {
        userId: request.userId,
        type: "system",
        title: "You're verified",
        body: "Your VStarz artist verification was approved. Your profile now carries the verified badge.",
        link: "/network",
        createdAt: Date.now(),
      });
    }

    void userId;
  },
});

// ── Roc Nation Africa Artist Network ─────────────────────────────────────

export const listNetworkPosts = query({
  args: {},
  handler: async (ctx) => {
    const posts = await ctx.db
      .query("networkPosts")
      .withIndex("by_created")
      .order("desc")
      .take(50);
    return Promise.all(
      posts.map(async (post: Doc<"networkPosts">) => {
        const author = await ctx.db.get(post.authorId);
        return {
          ...post,
          author: author
            ? { _id: author._id, name: author.name, username: author.username, image: author.image }
            : null,
        };
      }),
    );
  },
});

export const createNetworkPost = mutation({
  args: {
    kind: v.union(v.literal("milestone"), v.literal("opportunity"), v.literal("announcement")),
    body: v.string(),
  },
  handler: async (ctx, args) => {
    const { userId, user } = await requireUser(ctx);
    if (!user.isTalent && user.role !== "artist" && user.role !== "admin") {
      throw new Error("Only network members can post");
    }
    return await ctx.db.insert("networkPosts", {
      authorId: userId,
      kind: args.kind,
      body: args.body,
      createdAt: Date.now(),
    });
  },
});

// ── Digital Record Label Submissions ─────────────────────────────────────

export const submitToLabel = mutation({
  args: {
    artistName: v.string(),
    categorySlug: v.string(),
    links: v.string(),
    pitch: v.string(),
  },
  handler: async (ctx, args) => {
    const { userId } = await requireUser(ctx);
    const existing = await ctx.db
      .query("labelSubmissions")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();
    if (existing.some((s) => s.status === "submitted" || s.status === "in_review")) {
      throw new Error("You already have an active submission with the label");
    }
    return await ctx.db.insert("labelSubmissions", {
      userId,
      artistName: args.artistName,
      categorySlug: args.categorySlug,
      links: args.links,
      pitch: args.pitch,
      status: "submitted",
      createdAt: Date.now(),
    });
  },
});

export const myLabelSubmissions = query({
  args: {},
  handler: async (ctx) => {
    const { userId } = await requireUser(ctx);
    return await ctx.db
      .query("labelSubmissions")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .order("desc")
      .collect();
  },
});

export const listLabelSubmissions = query({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);
    const submissions = await ctx.db
      .query("labelSubmissions")
      .withIndex("by_status", (q) => q.eq("status", "submitted"))
      .collect();
    return Promise.all(
      submissions.map(async (s) => {
        const user = await ctx.db.get(s.userId);
        return {
          ...s,
          user: user ? { _id: user._id, name: user.name, email: user.email } : null,
        };
      }),
    );
  },
});

export const reviewLabelSubmission = mutation({
  args: {
    submissionId: v.id("labelSubmissions"),
    status: v.union(v.literal("in_review"), v.literal("signed"), v.literal("declined")),
    note: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const submission = await ctx.db.get(args.submissionId);
    if (!submission) throw new Error("Submission not found");
    await ctx.db.patch(args.submissionId, { status: args.status, note: args.note });
    await ctx.db.insert("notifications", {
      userId: submission.userId,
      type: "system",
      title:
        args.status === "signed"
          ? "Label submission signed"
          : args.status === "in_review"
            ? "Label submission in review"
            : "Label submission update",
      body:
        args.status === "signed"
          ? "Congratulations — the Roc Nation Africa digital label team wants to sign you. Check your email for next steps."
          : (args.note ?? "Your record label submission status has been updated."),
      link: "/network",
      createdAt: Date.now(),
    });
  },
});
