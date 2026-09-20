import { getAuthUserId } from "@convex-dev/auth/server";
import { query, mutation, QueryCtx } from "./_generated/server";
import { v } from "convex/values";

async function requireAdmin(ctx: QueryCtx) {
  const userId = await getAuthUserId(ctx);
  if (userId === null) throw new Error("Not authenticated");
  const user = await ctx.db.get(userId);
  if (!user) throw new Error("User not found");
  if (user.role !== "admin") throw new Error("Admin only");
  return { userId, user };
}

export const isUserAdmin = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) return false;
    const user = await ctx.db.get(userId);
    return user?.role === "admin";
  },
});

export const listUsers = query({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);
    const users = await ctx.db.query("users").collect();
    return users.map((u) => ({
      _id: u._id,
      name: u.name,
      username: u.username,
      email: u.email,
      image: u.image,
      role: u.role,
      plan: u.plan,
      votingCredits: u.votingCredits ?? 0,
      isBanned: u.isBanned ?? false,
      isAnonymous: u.isAnonymous ?? false,
    }));
  },
});

export const setUserRole = mutation({
  args: { userId: v.id("users"), role: v.union(v.literal("admin"), v.literal("user"), v.literal("member")) },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    await ctx.db.patch(args.userId, { role: args.role });
  },
});

export const setUserBanned = mutation({
  args: { userId: v.id("users"), banned: v.boolean() },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    await ctx.db.patch(args.userId, { isBanned: args.banned });
  },
});

export const grantCredits = mutation({
  args: { userId: v.id("users"), credits: v.number() },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const user = await ctx.db.get(args.userId);
    if (!user) throw new Error("User not found");
    await ctx.db.patch(args.userId, {
      votingCredits: (user.votingCredits ?? 0) + args.credits,
    });
  },
});

export const moderationQueue = query({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);
    // pending entries across all competitions (single-status index would
    // require competitionId, so collect and filter)
    const allEntries = await ctx.db.query("entries").collect();
    const allPending = allEntries.filter((e) => e.status === "pending");
    return await Promise.all(
      allPending.map(async (e) => {
        const owner = await ctx.db.get(e.userId);
        const comp = await ctx.db.get(e.competitionId);
        return {
          _id: e._id,
          title: e.title,
          videoUrl: e.videoUrl,
          createdAt: e.createdAt,
          owner: owner ? { name: owner.name, username: owner.username } : null,
          competition: comp ? { _id: comp._id, title: comp.title } : null,
        };
      }),
    );
  },
});

export const revenue = query({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);
    const txs = await ctx.db.query("transactions").collect();
    const completed = txs.filter((t) => t.status === "completed");
    const now = new Date();
    const month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

    let grossCents = 0;
    let subs = 0;
    let creditSalesCents = 0;
    let creditSalesCount = 0;
    let subsCents = 0;

    for (const t of completed) {
      if (t.kind === "vote_spend") continue;
      grossCents += t.amountCents;
      if (t.kind === "premium_subscription") {
        subs += 1;
        subsCents += t.amountCents;
      } else if (t.kind === "credit_purchase") {
        creditSalesCents += t.amountCents;
        creditSalesCount += 1;
      }
    }

    // revenue by month for the chart
    const byMonth: Record<string, number> = {};
    for (const t of completed) {
      if (t.kind === "vote_spend") continue;
      const d = new Date(t.createdAt);
      const m = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      byMonth[m] = (byMonth[m] ?? 0) + t.amountCents;
    }
    const monthly = Object.entries(byMonth)
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-6)
      .map(([m, cents]) => ({ month: m, cents }));

    return {
      month,
      grossCents,
      subs,
      subsCents,
      creditSalesCents,
      creditSalesCount,
      monthly,
      totalUsers: (await ctx.db.query("users").collect()).length,
    };
  },
});

export const platformStats = query({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);
    const [users, comps, entries, rooms, installs] = await Promise.all([
      ctx.db.query("users").collect(),
      ctx.db.query("competitions").collect(),
      ctx.db.query("entries").collect(),
      ctx.db.query("liveRooms").collect(),
      ctx.db.query("appInstalls").collect(),
    ]);
    return {
      users: users.length,
      competitions: comps.length,
      entries: entries.length,
      liveRooms: rooms.filter((r) => r.status === "live").length,
      // App download funnel from the /download page (Vercel link)
      appInstalls: installs.length,
      installs: installs.filter((i) => i.kind === "install_completed").length,
    };
  },
});

// Public, no-auth event sink for the /download page. Anonymous-safe: it only
// records the event kind, platform family and referrer — never user data.
export const trackInstall = mutation({
  args: {
    kind: v.union(
      v.literal("page_view"),
      v.literal("install_started"),
      v.literal("install_completed"),
    ),
    platform: v.optional(v.string()),
    referrer: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await ctx.db.insert("appInstalls", {
      kind: args.kind,
      platform: args.platform,
      referrer: args.referrer,
      createdAt: Date.now(),
    });
  },
});
