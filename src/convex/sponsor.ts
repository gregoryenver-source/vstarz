import { getAuthUserId } from "@convex-dev/auth/server";
import { query, QueryCtx } from "./_generated/server";
import { v } from "convex/values";
import type { Doc, Id } from "./_generated/dataModel";

// ── Sponsor Intelligence Platform ─────────────────────────────────────────
// Live, measurable creator-performance and ROI numbers for sponsors and
// brand partners. Every figure is computed from real platform data.

async function requireViewer(ctx: QueryCtx) {
  const userId = await getAuthUserId(ctx);
  if (userId === null) throw new Error("Not authenticated");
  const user = await ctx.db.get(userId);
  if (user === null) throw new Error("User not found");
  return { userId, user };
}

function fmtDate(ts: number) {
  return new Date(ts).toLocaleDateString("en-ZA", {
    day: "numeric",
    month: "short",
  });
}

// ── Platform KPIs ─────────────────────────────────────────────────────────

export const platformKpis = query({
  args: {},
  handler: async (ctx) => {
    await requireViewer(ctx);

    const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;

    const [users, competitions, entries, banners, transactions] =
      await Promise.all([
        ctx.db.query("users").collect(),
        ctx.db.query("competitions").collect(),
        ctx.db.query("entries").collect(),
        ctx.db.query("banners").collect(),
        ctx.db.query("transactions").collect(),
      ]);

    const creators = users.filter(
      (u) => !u.isBanned && u.username && (u.talents?.length ?? 0) > 0,
    ).length;
    const totalVotes = entries.reduce((s, e) => s + e.voteCount, 0);
    const auditionsThisWeek = entries.filter((e) => e.createdAt >= weekAgo).length;
    const newCreatorsThisWeek = users.filter(
      (u) => (u.emailVerificationTime ?? 0) >= weekAgo,
    ).length;
    const liveRooms = await ctx.db
      .query("liveRooms")
      .withIndex("status", (q) => q.eq("status", "live"))
      .collect();
    const viewersNow = liveRooms.reduce((s, r) => s + r.viewerCount, 0);

    const adImpressions = banners.reduce((s, b) => s + b.impressions, 0);
    const adClicks = banners.reduce((s, b) => s + b.clicks, 0);
    const revenueCents = transactions
      .filter((t) => t.status === "completed")
      .reduce((s, t) => s + t.amountCents, 0);

    return {
      creators,
      totalAuditions: entries.length,
      totalVotes,
      auditionsThisWeek,
      newCreatorsThisWeek,
      viewersNow,
      liveRooms: liveRooms.length,
      adImpressions,
      adClicks,
      ctr: adImpressions > 0 ? Math.round((adClicks / adImpressions) * 1000) / 10 : 0,
      revenueCents,
      openCompetitions: competitions.filter((c) => c.status !== "closed").length,
    };
  },
});

// ── Campaign performance: sponsor banner analytics ────────────────────────

export const campaignPerformance = query({
  args: {},
  handler: async (ctx) => {
    await requireViewer(ctx);

    const banners = await ctx.db
      .query("banners")
      .withIndex("by_active", (q) => q.eq("active", true))
      .collect();

    return banners
      .map((b) => ({
        _id: b._id,
        advertiser: b.advertiser,
        title: b.title,
        placement: b.placement,
        impressions: b.impressions,
        clicks: b.clicks,
        ctr:
          b.impressions > 0
            ? Math.round((b.clicks / b.impressions) * 1000) / 10
            : 0,
        startsAt: b.startsAt ?? b.createdAt,
        endsAt: b.endsAt,
        active: b.active,
      }))
      .sort((a, b) => b.impressions - a.impressions);
  },
});

// ── Creator leaderboard: the recruitment pool brands browse ───────────────

export const creatorLeaderboard = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    await requireViewer(ctx);
    const limit = Math.min(args.limit ?? 10, 25);

    const entries = await ctx.db.query("entries").collect();

    // Aggregate per-creator performance
    type Agg = {
      userId: Id<"users">;
      auditions: number;
      votes: number;
      approved: number;
      lastActive: number;
    };
    const byUser = new Map<Id<"users">, Agg>();
    for (const e of entries) {
      const agg = byUser.get(e.userId) ?? {
        userId: e.userId,
        auditions: 0,
        votes: 0,
        approved: 0,
        lastActive: 0,
      };
      agg.auditions += 1;
      agg.votes += e.voteCount;
      if (e.status === "approved") agg.approved += 1;
      agg.lastActive = Math.max(agg.lastActive, e.createdAt);
      byUser.set(e.userId, agg);
    }

    const ranked = [...byUser.values()]
      .sort((a, b) => b.votes - a.votes)
      .slice(0, limit * 2);

    return Promise.all(
      ranked.slice(0, limit).map(async (agg, idx) => {
        const user: Doc<"users"> | null = await ctx.db.get(agg.userId);
        if (!user) return null;

        // Completion rate: approved / submitted
        const completion =
          agg.auditions > 0 ? Math.round((agg.approved / agg.auditions) * 100) : 0;

        // Momentum: active in the last 14 days
        const daysSinceActive = Math.floor(
          (Date.now() - agg.lastActive) / (24 * 60 * 60 * 1000),
        );
        const momentum = daysSinceActive <= 3 ? "hot" : daysSinceActive <= 14 ? "warm" : "cooling";

        return {
          rank: idx + 1,
          _id: user._id,
          name: user.name ?? user.username ?? "Unnamed Star",
          username: user.username ?? "—",
          image: user.image,
          talents: (user.talents ?? []).slice(0, 3),
          country: user.country,
          plan: user.plan ?? "free",
          votes: agg.votes,
          auditions: agg.auditions,
          completion,
          momentum,
          lastActiveDays: daysSinceActive,
        };
      }),
    ).then((rows) => rows.filter((r): r is NonNullable<typeof r> => r !== null));
  },
});

// ── Weekly audience trend for the reach chart (last 8 weeks) ─────────────

export const audienceTrend = query({
  args: {},
  handler: async (ctx) => {
    await requireViewer(ctx);

    const entries = await ctx.db.query("entries").collect();
    const votes = await ctx.db.query("votes").collect();

    const now = Date.now();
    const weeks: { label: string; auditions: number; interactions: number }[] = [];

    for (let w = 7; w >= 0; w--) {
      const start = now - (w + 1) * 7 * 24 * 60 * 60 * 1000;
      const end = now - w * 7 * 24 * 60 * 60 * 1000;
      const auditions = entries.filter(
        (e) => e.createdAt >= start && e.createdAt < end,
      ).length;
      const interactions = votes.filter(
        (v) => v.createdAt >= start && v.createdAt < end,
      ).length;
      weeks.push({
        label: w === 0 ? "This wk" : `${fmtDate(end)}`,
        auditions,
        interactions,
      });
    }
    return weeks;
  },
});

// ── Creator-side: how the creator's own appeal looks to sponsors ─────────

export const mySponsorAppeal = query({
  args: {},
  handler: async (ctx) => {
    const { userId } = await requireViewer(ctx);

    const entries = await ctx.db
      .query("entries")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();
    const votes = entries.reduce((s, e) => s + e.voteCount, 0);
    const approved = entries.filter((e) => e.status === "approved").length;

    const clubs = await ctx.db
      .query("fanClubs")
      .withIndex("by_artist", (q) => q.eq("artistId", userId))
      .collect();
    const fanClubMembers = clubs.reduce((s, c) => s + c.memberCount, 0);

    const flags = (await ctx.db
      .query("moderationFlags")
      .withIndex("status", (q) => q.eq("status", "resolved"))
      .collect()
    ).filter((f) => f.targetId === (userId as unknown as string));

    // Sponsors read the credit score; reuse the same weights as the Passport.
    const professionalism = Math.max(0, Math.min(100, 50 + approved * 12));
    const engagement = Math.min(100, Math.round(Math.sqrt(votes) * 6));
    const reliability = Math.min(100, entries.length === 0 ? 0 : 40 + entries.length * 10);
    const brandSafety = Math.max(0, 100 - flags.length * 25);
    const appeal = Math.round(
      professionalism * 0.3 + engagement * 0.35 + reliability * 0.2 + brandSafety * 0.15,
    );

    return {
      votes,
      auditions: entries.length,
      approved,
      fanClubMembers,
      appeal,
      flags: flags.length,
    };
  },
});
