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

function requireAdminUser(user: { role?: string; isBanned?: boolean }) {
  if (user.role !== "admin") throw new Error("Admin access required");
}

// ── AI Talent Radar: surfaces rising talent for scouts and judges ────────

export const talentRadar = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const { user } = await requireUser(ctx);
    void user;

    // Composite discovery score: momentum = recent votes, quality = judge scores.
    const entries = await ctx.db.query("entries").collect();
    const oneWeekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;

    const perUser = new Map<
      Id<"users">,
      { userId: Id<"users">; votes: number; recentVotes: number; judgeTotal: number; judgeCount: number; entryCount: number }
    >();

    for (const entry of entries) {
      const key = entry.userId;
      const agg = perUser.get(key) ?? {
        userId: entry.userId,
        votes: 0,
        recentVotes: 0,
        judgeTotal: 0,
        judgeCount: 0,
        entryCount: 0,
      };
      agg.votes += entry.voteCount;
      agg.entryCount += 1;
      perUser.set(key, agg);

      if (entry.createdAt >= oneWeekAgo) {
        agg.recentVotes += entry.voteCount;
      }
    }

    // Attach judge scores per entry owner
    const judgeAgg = new Map<Id<"users">, { total: number; count: number }>();
    for (const entry of entries) {
      const fbs = await ctx.db
        .query("judgeFeedback")
        .withIndex("by_entry", (q) => q.eq("entryId", entry._id))
        .collect();
      if (fbs.length === 0) continue;
      const total = fbs.reduce((sum, fb) => sum + fb.score, 0);
      const cur = judgeAgg.get(entry.userId) ?? { total: 0, count: 0 };
      cur.total += total;
      cur.count += fbs.length;
      judgeAgg.set(entry.userId, cur);
    }

    const insights = await ctx.db
      .query("aiInsights")
      .withIndex("by_kind", (q) => q.eq("kind", "talent_radar"))
      .order("desc")
      .take(10);

    // Build the ranked radar list
    const radar = [...perUser.values()].map((agg) => {
      const judge = judgeAgg.get(agg.userId);
      const avgJudge = judge && judge.count > 0 ? judge.total / judge.count : null;
      const publicScore = Math.min(100, agg.votes * 2);
      const judgeScore = avgJudge === null ? null : avgJudge;
      const composite =
        judgeScore === null
          ? publicScore
          : Math.round(publicScore * 0.4 + judgeScore * 0.6);
      const momentum =
        agg.votes > 0
          ? Math.round((agg.recentVotes / agg.votes) * 100)
          : 0;
      return {
        userId: agg.userId,
        votes: agg.votes,
        recentVotes: agg.recentVotes,
        entryCount: agg.entryCount,
        avgJudgeScore: avgJudge === null ? null : Math.round(avgJudge),
        composite,
        momentum,
      };
    });

    radar.sort((a, b) => b.composite - a.composite);

    const top = radar.slice(0, args.limit ?? 6);

    // Decorate with artist profiles
    return Promise.all(
      top.map(async (t) => {
        const artist: Doc<"users"> | null = await ctx.db.get(t.userId);
        void insights;
        return {
          ...t,
          artist: artist
            ? {
                _id: artist._id,
                name: artist.name,
                username: artist.username,
                image: artist.image,
                talents: artist.talents ?? [],
                badges: artist.badges ?? [],
              }
            : null,
        };
      }),
    );
  },
});

// ── AI Judge Assistant: pre-review analysis for a competition entry ──────

export const judgeAssistant = query({
  args: { entryId: v.id("entries") },
  handler: async (ctx, args) => {
    const entry = await ctx.db.get(args.entryId);
    if (!entry) throw new Error("Entry not found");

    // Engagement signals the "AI" analyzes for the judge
    const comments = await ctx.db
      .query("entryComments")
      .withIndex("by_entry", (q) => q.eq("entryId", entry._id))
      .collect();
    const feedbacks = await ctx.db
      .query("judgeFeedback")
      .withIndex("by_entry", (q) => q.eq("entryId", entry._id))
      .collect();

    const publicScore = Math.min(100, entry.voteCount * 2);
    const avgJudge =
      feedbacks.length > 0
        ? Math.round(feedbacks.reduce((s, fb) => s + fb.score, 0) / feedbacks.length)
        : null;
    const engagement = Math.min(100, comments.length * 8 + entry.voteCount);

    // Duration pacing heuristic: 60-180s auditions historically score best
    const duration = entry.durationSeconds ?? 0;
    const pacing =
      duration === 0
        ? null
        : duration >= 60 && duration <= 180
          ? "Strong pacing window (60s–3min) — the format judges and fans score highest."
          : duration < 60
            ? "Short format — hook lands fast, but may underdevelop the performance."
            : "Long format — ensure the opening 30 seconds hold attention.";

    return {
      publicScore,
      avgJudge,
      engagement,
      commentCount: comments.length,
      pacing,
      recommendation:
        avgJudge === null
          ? "No judge scores yet — this entry needs its first professional review."
          : avgJudge >= 80
            ? "High-priority candidate: strong professional and public signals."
            : avgJudge >= 60
              ? "Contender — solid scores, worth a second review."
              : "Below callback threshold based on current signals.",
    };
  },
});

// ── AI Talent Agent: personalized career coach for the creator ───────────

export const careerCoach = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) throw new Error("Not authenticated");
    const user = await ctx.db.get(userId);
    if (!user) throw new Error("User not found");

    const entries = await ctx.db
      .query("entries")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();
    entries.sort((a, b) => b.createdAt - a.createdAt);

    const totalVotes = entries.reduce((s, e) => s + e.voteCount, 0);
    const approved = entries.filter((e) => e.status === "approved").length;
    const pending = entries.filter((e) => e.status === "pending").length;
    const rejected = entries.filter((e) => e.status === "rejected").length;

    const certs = await ctx.db
      .query("academyEnrollments")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect()
      .then((all) => all.filter((e) => e.completedAt !== undefined).length);

    const daysSinceLastEntry =
      entries.length === 0
        ? null
        : Math.floor((Date.now() - entries[0].createdAt) / 86_400_000);

    // ── Signal-driven coaching plan ──
    const actions: { title: string; body: string; link: string; icon: string }[] = [];

    if (entries.length === 0) {
      actions.push({
        title: "Post your first audition",
        body: "The pipeline starts on stage. A 60-second audition is the fastest way to get discovered.",
        link: "/competitions",
        icon: "video",
      });
    }
    if (daysSinceLastEntry !== null && daysSinceLastEntry >= 14) {
      actions.push({
        title: "You've been quiet on stage",
        body: `Your last audition was ${daysSinceLastEntry} days ago. Consistency is the #1 predictor of breakthrough.`,
        link: "/competitions",
        icon: "clock",
      });
    }
    if (pending > 0) {
      actions.push({
        title: "Auditions awaiting review",
        body: `${pending} audition${pending > 1 ? "s" : ""} pending review. Judges score faster when momentum is fresh — share your entry to build early votes.`,
        link: "/competitions",
        icon: "sparkles",
      });
    }
    if (certs < 2) {
      actions.push({
        title: "Level up in the Academy",
        body: `You have ${certs} certification${certs === 1 ? "" : "s"}. Two certifications unlock the Mentorship stage — start with a Starter track.`,
        link: "/academy",
        icon: "graduation",
      });
    }
    if (totalVotes < 100 && entries.length > 0) {
      actions.push({
        title: "Rally your fanbase",
        body: `${100 - totalVotes} more votes to the competition stage. Share your entry and go live to convert followers into voters.`,
        link: "/competitions",
        icon: "users",
      });
    }
    if (rejected > 0) {
      actions.push({
        title: "Study the guidelines",
        body: "A recent audition didn't pass review. Re-read the contest guidelines and re-enter — most rejections are fixable format issues.",
        link: "/competitions",
        icon: "shield",
      });
    }
    if (approved >= 2 && certs >= 2 && totalVotes >= 100) {
      actions.push({
        title: "Ready for distribution",
        body: "Your signals are strong. Submit to the Digital Record Label pipeline in the Network to get your catalog heard.",
        link: "/network",
        icon: "disc",
      });
    }

    // ── Coach summary ──
    const summary =
      entries.length === 0
        ? "Welcome to the Creator OS. Your first move: post a 60-second audition to an open contest."
        : pending > 0
          ? "Momentum phase: get eyes on your pending auditions while you stack Academy certifications."
          : totalVotes >= 100
            ? "Growth phase: your fanbase is real — keep weekly auditions and push toward distribution."
            : "Build phase: stack votes and certifications. Consistency beats talent when talent isn't consistent.";

    return {
      summary,
      actions: actions.slice(0, 4),
      signals: { totalAuditions: entries.length, totalVotes, pending, approved, rejected, certifications: certs },
    };
  },
});

// ── Public AI insight feed (radar highlights + trends) ───────────────────

export const insightFeed = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db
      .query("aiInsights")
      .withIndex("by_kind", (q) => q.eq("kind", "trend"))
      .order("desc")
      .take(5);
  },
});

// ── Admin: seed insights for the feed ────────────────────────────────────

export const createInsight = mutation({
  args: {
    kind: v.union(
      v.literal("talent_radar"),
      v.literal("judge_assistant"),
      v.literal("engagement"),
      v.literal("trend"),
    ),
    title: v.string(),
    body: v.string(),
    score: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) throw new Error("Not authenticated");
    const user = await ctx.db.get(userId);
    if (!user) throw new Error("User not found");
    requireAdminUser(user);
    return await ctx.db.insert("aiInsights", {
      kind: args.kind,
      title: args.title,
      body: args.body,
      score: args.score,
      createdAt: Date.now(),
    });
  },
});
