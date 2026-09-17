import { getAuthUserId } from "@convex-dev/auth/server";
import { mutation, QueryCtx } from "./_generated/server";
import { v } from "convex/values";

// One-time seeding. Safe to call repeatedly; every step is idempotent.

const DEFAULT_CATEGORIES = [
  { name: "Singing", slug: "singing", icon: "mic", sortOrder: 1 },
  { name: "Dancing", slug: "dancing", icon: "footprints", sortOrder: 2 },
  { name: "Comedy", slug: "comedy", icon: "laugh", sortOrder: 3 },
  { name: "Magic", slug: "magic", icon: "wand-sparkles", sortOrder: 4 },
  { name: "Music", slug: "music", icon: "music", sortOrder: 5 },
  { name: "Acting", slug: "acting", icon: "drama", sortOrder: 6 },
  { name: "Acrobatics", slug: "acrobatics", icon: "zap", sortOrder: 7 },
  { name: "Other", slug: "other", icon: "sparkles", sortOrder: 8 },
];

async function requireUser(ctx: QueryCtx) {
  const userId = await getAuthUserId(ctx);
  if (userId === null) throw new Error("Not authenticated");
  const user = await ctx.db.get(userId);
  if (user === null) throw new Error("User not found");
  return { userId, user };
}

export const seedAll = mutation({
  args: {},
  handler: async (ctx) => {
    const existingCats = await ctx.db.query("talentCategories").first();
    if (!existingCats) {
      for (const c of DEFAULT_CATEGORIES) {
        await ctx.db.insert("talentCategories", c);
      }
    }

    const { userId, user } = await requireUser(ctx);

    // If there is no admin yet, this user becomes the first admin.
    const admins = await ctx.db
      .query("users")
      .withIndex("role", (q) => q.eq("role", "admin"))
      .collect();
    if (admins.length === 0 && user.role !== "admin") {
      await ctx.db.patch(userId, { role: "admin" });
      return { promotedToAdmin: true };
    }
    return { promotedToAdmin: false };
  },
});

export const createDemoData = mutation({
  args: {},
  handler: async (ctx) => {
    const { userId } = await requireUser(ctx);
    const comps = await ctx.db.query("competitions").collect();
    if (comps.length > 0) return { created: false };

    const now = Date.now();
    const day = 24 * 60 * 60 * 1000;

    const openId = await ctx.db.insert("competitions", {
      title: "Rising Starz: Season 1",
      description:
        "Our flagship open-call competition. Submit your audition video, rally your fans, and take the stage. Top 3 win a featured showcase on the vStarz homepage.",
      categorySlug: "singing",
      prize: "Featured showcase + 10,000 credits",
      status: "submissions_open",
      createdBy: userId,
      submissionsOpenAt: now,
      endsAt: now + 21 * day,
      entryCount: 0,
    });

    await ctx.db.insert("competitions", {
      title: "Dance Floor Blitz",
      description:
        "30-second dance routines, judged by the community. Voting is now open — back your favorite performer with voting credits.",
      categorySlug: "dancing",
      prize: "Pro studio session",
      status: "voting_open",
      createdBy: userId,
      votingOpenAt: now - 2 * day,
      endsAt: now + 7 * day,
      entryCount: 0,
    });

    await ctx.db.insert("competitions", {
      title: "Comedy Clash: Finals",
      description:
        "Last season's comedy showdown has wrapped. Relive the winning sets and see the final leaderboard.",
      categorySlug: "comedy",
      prize: "Headline slot at Starz Live",
      status: "closed",
      createdBy: userId,
      endsAt: now - 3 * day,
      entryCount: 3,
    });

    return { created: true, openId };
  },
});
