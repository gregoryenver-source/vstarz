import { getAuthUserId } from "@convex-dev/auth/server";
import { query, mutation, QueryCtx } from "./_generated/server";
import { v } from "convex/values";
import { paginationOptsValidator } from "convex/server";

async function requireUser(ctx: QueryCtx) {
  const userId = await getAuthUserId(ctx);
  if (userId === null) throw new Error("Not authenticated");
  const user = await ctx.db.get(userId);
  if (user === null) throw new Error("User not found");
  if (user.isBanned) throw new Error("Account suspended");
  return { userId, user };
}

export const list = query({
  args: {
    status: v.optional(
      v.union(
        v.literal("draft"),
        v.literal("submissions_open"),
        v.literal("voting_open"),
        v.literal("closed"),
      ),
    ),
    categorySlug: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    let comps;
    if (args.status) {
      comps = await ctx.db
        .query("competitions")
        .withIndex("status", (q) => q.eq("status", args.status!))
        .collect();
    } else {
      comps = await ctx.db.query("competitions").collect();
    }
    if (args.categorySlug) {
      comps = comps.filter((c) => c.categorySlug === args.categorySlug);
    }
    return comps.sort((a, b) => (b.endsAt ?? 0) - (a.endsAt ?? 0));
  },
});

export const get = query({
  args: { id: v.id("competitions") },
  handler: async (ctx, args) => {
    const comp = await ctx.db.get(args.id);
    if (!comp) return null;
    const creator = await ctx.db.get(comp.createdBy);
    const entryCount = await ctx.db
      .query("entries")
      .withIndex("by_competition", (q) => q.eq("competitionId", args.id))
      .collect();
    return {
      ...comp,
      creatorName: creator?.name ?? creator?.username ?? "Unknown",
      entryCount: entryCount.filter((e) => e.status === "approved").length,
    };
  },
});

export const create = mutation({
  args: {
    title: v.string(),
    description: v.string(),
    categorySlug: v.optional(v.string()),
    prize: v.optional(v.string()),
    submissionsOpenAt: v.optional(v.number()),
    votingOpenAt: v.optional(v.number()),
    endsAt: v.optional(v.number()),
    startNow: v.boolean(),
  },
  handler: async (ctx, args) => {
    const { userId } = await requireUser(ctx);
    const id = await ctx.db.insert("competitions", {
      title: args.title.trim(),
      description: args.description.trim(),
      categorySlug: args.categorySlug,
      prize: args.prize,
      submissionsOpenAt: args.submissionsOpenAt,
      votingOpenAt: args.votingOpenAt,
      endsAt: args.endsAt,
      createdBy: userId,
      status: args.startNow ? "submissions_open" : "draft",
      entryCount: 0,
    });
    return id;
  },
});

export const setStatus = mutation({
  args: {
    id: v.id("competitions"),
    status: v.union(
      v.literal("draft"),
      v.literal("submissions_open"),
      v.literal("voting_open"),
      v.literal("closed"),
    ),
  },
  handler: async (ctx, args) => {
    const { userId, user } = await requireUser(ctx);
    const comp = await ctx.db.get(args.id);
    if (!comp) throw new Error("Competition not found");
    if (comp.createdBy !== userId && user.role !== "admin") {
      throw new Error("Not authorized");
    }
    await ctx.db.patch(args.id, {
      status: args.status,
      votingOpenAt:
        args.status === "voting_open" ? Date.now() : comp.votingOpenAt,
      endsAt: args.status === "closed" ? Date.now() : comp.endsAt,
    });

    if (args.status === "closed") {
      // Notify top contestants with results
      const entries = await ctx.db
        .query("entries")
        .withIndex("by_competition", (q) => q.eq("competitionId", args.id))
        .order("desc")
        .collect();
      const top = entries
        .filter((e) => e.status === "approved")
        .sort((a, b) => b.voteCount - a.voteCount)
        .slice(0, 3);
      for (let i = 0; i < top.length; i++) {
        await ctx.db.insert("notifications", {
          userId: top[i].userId,
          type: "competition_alert",
          title: `You finished #${i + 1} in ${comp.title}!`,
          body: "Check the results and share your win.",
          link: `/competitions/${comp._id}`,
          createdAt: Date.now(),
        });
      }
    }
  },
});

export const getLeaderboard = query({
  args: { competitionId: v.id("competitions"), limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const entries = await ctx.db
      .query("entries")
      .withIndex("by_competition_status", (q) =>
        q.eq("competitionId", args.competitionId).eq("status", "approved"),
      )
      .collect();

    // Combined weighted score: 40% public vote, 60% judge score (defaults).
    const comp = await ctx.db.get(args.competitionId);
    const publicWeight = (comp?.publicVoteWeight ?? 40) / 100;
    const judgeWeight = (comp?.judgeScoreWeight ?? 60) / 100;

    const maxVotes = Math.max(...entries.map((e) => e.voteCount), 1);
    const decorated = await Promise.all(
      entries.map(async (e) => {
        const u = await ctx.db.get(e.userId);
        const feedback = await ctx.db
          .query("judgeFeedback")
          .withIndex("by_entry", (q) => q.eq("entryId", e._id))
          .collect();
        const judgeScore =
          feedback.length > 0
            ? Math.round(
                feedback.reduce((sum, f) => sum + f.score, 0) / feedback.length,
              )
            : null;
        const publicScore = Math.round((e.voteCount / maxVotes) * 100);
        const combined =
          judgeScore === null
            ? publicScore
            : Math.round(publicScore * publicWeight + judgeScore * judgeWeight);
        return {
          _id: e._id,
          title: e.title,
          videoUrl: e.videoUrl,
          voteCount: e.voteCount,
          judgeScore,
          publicScore,
          combinedScore: combined,
          user: u
            ? {
                _id: u._id,
                name: u.name,
                username: u.username,
                image: u.image,
              }
            : null,
        };
      }),
    );
    decorated.sort((a, b) => b.combinedScore - a.combinedScore);
    return decorated.slice(0, args.limit ?? 20);
  },
});

export const getResults = query({
  args: { competitionId: v.id("competitions") },
  handler: async (ctx, args) => {
    const comp = await ctx.db.get(args.competitionId);
    if (!comp) return null;
    const entries = await ctx.db
      .query("entries")
      .withIndex("by_competition_status", (q) =>
        q.eq("competitionId", args.competitionId).eq("status", "approved"),
      )
      .collect();
    entries.sort((a, b) => b.voteCount - a.voteCount);
    const totalVotes = entries.reduce((sum, e) => sum + e.voteCount, 0);
    return {
      status: comp.status,
      totalVotes,
      totalEntries: entries.length,
      winners: entries.slice(0, 3).map((e, i) => ({
        rank: i + 1,
        entryId: e._id,
        title: e.title,
        voteCount: e.voteCount,
        userId: e.userId,
      })),
    };
  },
});
