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

export const listByCompetition = query({
  args: { competitionId: v.id("competitions") },
  handler: async (ctx, args) => {
    const entries = await ctx.db
      .query("entries")
      .withIndex("by_competition_status", (q) =>
        q.eq("competitionId", args.competitionId).eq("status", "approved"),
      )
      .collect();
    entries.sort((a, b) => b.voteCount - a.voteCount);
    return await Promise.all(
      entries.map(async (e) => {
        const u = await ctx.db.get(e.userId);
        return {
          _id: e._id,
          title: e.title,
          description: e.description,
          videoUrl: e.videoUrl,
          voteCount: e.voteCount,
          createdAt: e.createdAt,
          user: u ? { _id: u._id, name: u.name, username: u.username, image: u.image } : null,
        };
      }),
    );
  },
});

export const listMine = query({
  args: {},
  handler: async (ctx) => {
    const { userId } = await requireUser(ctx);
    const entries = await ctx.db
      .query("entries")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();
    entries.sort((a, b) => b.createdAt - a.createdAt);
    return await Promise.all(
      entries.map(async (e) => {
        const comp = await ctx.db.get(e.competitionId);
        return {
          _id: e._id,
          title: e.title,
          status: e.status,
          voteCount: e.voteCount,
          createdAt: e.createdAt,
          competition: comp
            ? { _id: comp._id, title: comp.title, status: comp.status }
            : null,
        };
      }),
    );
  },
});

// Step 1: generate an upload URL for the audition video
export const generateVideoUploadUrl = mutation({
  args: {},
  handler: async (ctx) => {
    await requireUser(ctx);
    return await ctx.storage.generateUploadUrl();
  },
});

// Step 2: persist the entry after the client uploaded the file
export const create = mutation({
  args: {
    competitionId: v.id("competitions"),
    title: v.string(),
    description: v.optional(v.string()),
    videoStorageId: v.id("_storage"),
    videoUrl: v.string(),
  },
  handler: async (ctx, args) => {
    const { userId } = await requireUser(ctx);
    const comp = await ctx.db.get(args.competitionId);
    if (!comp) throw new Error("Competition not found");
    if (comp.status !== "submissions_open") {
      throw new Error("Submissions are not open for this competition");
    }

    const myEntries = await ctx.db
      .query("entries")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();
    const already = myEntries.some(
      (e) => e.competitionId === args.competitionId,
    );
    if (already) {
      throw new Error("You already submitted an entry to this competition");
    }

    const id = await ctx.db.insert("entries", {
      competitionId: args.competitionId,
      userId,
      title: args.title.trim(),
      description: args.description?.trim(),
      videoUrl: args.videoUrl,
      videoStorageId: args.videoStorageId,
      status: "pending",
      voteCount: 0,
      createdAt: Date.now(),
    });

    await ctx.db.patch(args.competitionId, {
      entryCount: (comp.entryCount ?? 0) + 1,
    });

    await ctx.db.insert("notifications", {
      userId,
      type: "competition_alert",
      title: "Audition submitted",
      body: `Your audition "${args.title}" is pending review.`,
      link: `/competitions/${args.competitionId}`,
      createdAt: Date.now(),
    });

    return id;
  },
});

export const moderate = mutation({
  args: {
    id: v.id("entries"),
    status: v.union(
      v.literal("approved"),
      v.literal("rejected"),
      v.literal("pending"),
    ),
  },
  handler: async (ctx, args) => {
    const { user } = await requireUser(ctx);
    if (user.role !== "admin") throw new Error("Admin only");
    const entry = await ctx.db.get(args.id);
    if (!entry) throw new Error("Entry not found");
    await ctx.db.patch(args.id, { status: args.status });

    await ctx.db.insert("notifications", {
      userId: entry.userId,
      type: "judge_feedback",
      title:
        args.status === "approved"
          ? "Your audition was approved!"
          : "Your audition was not approved",
      body:
        args.status === "approved"
          ? "It is now live in the competition. Share it with your fans!"
          : "Our team reviewed your submission. Please review the guidelines and try again.",
      link: `/competitions/${entry.competitionId}`,
      createdAt: Date.now(),
    });
  },
});

export const addJudgeFeedback = mutation({
  args: {
    entryId: v.id("entries"),
    score: v.number(),
    comment: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { user } = await requireUser(ctx);
    if (user.role !== "admin") throw new Error("Admin only");
    if (args.score < 0 || args.score > 100) {
      throw new Error("Score must be between 0 and 100");
    }
    const entry = await ctx.db.get(args.entryId);
    if (!entry) throw new Error("Entry not found");

    await ctx.db.insert("judgeFeedback", {
      entryId: args.entryId,
      judgeId: user._id,
      score: args.score,
      comment: args.comment,
      createdAt: Date.now(),
    });

    await ctx.db.insert("notifications", {
      userId: entry.userId,
      type: "judge_feedback",
      title: "New judge feedback on your audition",
      body: args.comment ?? `You received a score of ${args.score}/100.`,
      link: `/competitions/${entry.competitionId}`,
      createdAt: Date.now(),
    });
  },
});

export const getFeedbackForEntry = query({
  args: { entryId: v.id("entries") },
  handler: async (ctx, args) => {
    const feedback = await ctx.db
      .query("judgeFeedback")
      .withIndex("by_entry", (q) => q.eq("entryId", args.entryId))
      .collect();
    feedback.sort((a, b) => b.createdAt - a.createdAt);
    return await Promise.all(
      feedback.map(async (f) => {
        const judge = await ctx.db.get(f.judgeId);
        return {
          _id: f._id,
          score: f.score,
          comment: f.comment,
          createdAt: f.createdAt,
          judgeName: judge?.name ?? "Judge",
        };
      }),
    );
  },
});
