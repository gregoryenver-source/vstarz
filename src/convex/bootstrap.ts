import { getAuthUserId } from "@convex-dev/auth/server";
import { mutation, QueryCtx } from "./_generated/server";
import { v } from "convex/values";

// One-time seeding. Safe to call repeatedly; every step is idempotent.

const DEFAULT_CATEGORIES = [
  { name: "Singing", slug: "singing", icon: "mic", sortOrder: 1 },
  { name: "Rap", slug: "rap", icon: "audio-lines", sortOrder: 2 },
  { name: "Dance", slug: "dance", icon: "footprints", sortOrder: 3 },
  { name: "DJ", slug: "dj", icon: "disc-3", sortOrder: 4 },
  { name: "Comedy", slug: "comedy", icon: "laugh", sortOrder: 5 },
  { name: "Acting", slug: "acting", icon: "drama", sortOrder: 6 },
  { name: "Spoken Word", slug: "spoken-word", icon: "quote", sortOrder: 7 },
  { name: "Gospel", slug: "gospel", icon: "church", sortOrder: 8 },
  { name: "Instrumentalist", slug: "instrumentalist", icon: "guitar", sortOrder: 9 },
  { name: "Fashion", slug: "fashion", icon: "shirt", sortOrder: 10 },
  { name: "Content Creator", slug: "content-creator", icon: "camera", sortOrder: 11 },
  { name: "Open Category", slug: "open", icon: "sparkles", sortOrder: 12 },
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
    const existingCats = await ctx.db.query("talentCategories").collect();
    const existingSlugs = new Set(existingCats.map((c) => c.slug));
    for (const c of DEFAULT_CATEGORIES) {
      if (!existingSlugs.has(c.slug)) {
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
        "The flagship open-call of Season 1. Submit your audition video (30 seconds to 5 minutes), rally your fans, and let the 40% public vote and 60% judge score decide who takes the crown.",
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
        "30-second dance routines from Mzansi's best movers. Voting is now open — back your favorite performer with voting credits.",
      categorySlug: "dance",
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
        "Last season's comedy showdown has wrapped. Relive the winning sets and see the final combined leaderboard.",
      categorySlug: "comedy",
      prize: "Headline slot at Starz Live",
      status: "closed",
      createdBy: userId,
      endsAt: now - 3 * day,
      entryCount: 3,
    });

    // ── Merch + tickets + launch banner (independent of demo comps) ──
    const existingProducts = await ctx.db.query("merchProducts").collect();
    if (existingProducts.length === 0) {
      await ctx.db.insert("merchProducts", {
        name: "VStarz Signature Tee",
        slug: "vstarz-signature-tee",
        description:
          "Heavyweight black tee with the red V emblem across the chest. Worn on stage by the Season 1 finalists.",
        priceCents: 49900,
        emoji: "👕",
        kind: "merch",
        active: true,
        createdAt: now,
      });
      await ctx.db.insert("merchProducts", {
        name: "ROC Cap",
        slug: "roc-cap",
        description:
          "Structured snapback with ROC Red embroidery. Adjustable, one size fits all.",
        priceCents: 34900,
        emoji: "🧢",
        kind: "merch",
        active: true,
        createdAt: now,
      });
      await ctx.db.insert("merchProducts", {
        name: "Starz Live Poster (Limited)",
        slug: "starz-live-poster",
        description:
          "Numbered A2 print of the Starz Live launch artwork. 200 printed, shipped rolled.",
        priceCents: 24900,
        emoji: "🖼️",
        kind: "merch",
        active: true,
        createdAt: now,
      });
    }

    const existingEvents = await ctx.db.query("events").collect();
    if (existingEvents.length === 0) {
      const teeSlug = "starz-live-johannesburg-ticket";
      let productId = (
        await ctx.db
          .query("merchProducts")
          .withIndex("by_slug", (q) => q.eq("slug", teeSlug))
          .first()
      )?._id;
      productId ??= await ctx.db.insert("merchProducts", {
        name: "Starz Live Johannesburg — Ticket",
        slug: teeSlug,
        description: "General admission to the Starz Live showcase at Constitution Hill.",
        priceCents: 29900,
        emoji: "🎟️",
        kind: "ticket",
        active: true,
        createdAt: now,
      });
      await ctx.db.insert("events", {
        title: "Starz Live: Johannesburg",
        description:
          "The first live VStarz showcase. Top 10 contestants perform for the crown, with surprise guests from the Roc Nation Africa network.",
        venue: "Constitution Hill",
        city: "Johannesburg",
        startsAt: now + 30 * day,
        priceCents: 29900,
        capacity: 500,
        ticketsSold: 0,
        productId,
        createdAt: now,
      });

      const cptSlug = "starz-live-cape-town-ticket";
      let productIdCpt = (
        await ctx.db
          .query("merchProducts")
          .withIndex("by_slug", (q) => q.eq("slug", cptSlug))
          .first()
      )?._id;
      productIdCpt ??= await ctx.db.insert("merchProducts", {
        name: "Starz Live Cape Town — Ticket",
        slug: cptSlug,
        description: "General admission to the Cape Town leg of the Starz Live tour.",
        priceCents: 29900,
        emoji: "🎟️",
        kind: "ticket",
        active: true,
        createdAt: now,
      });
      await ctx.db.insert("events", {
        title: "Starz Live: Cape Town",
        description:
          "Starz Live hits the Mother City. Live voting decides the season's wildcard finalist on the night.",
        venue: "The Good Hope Hall",
        city: "Cape Town",
        startsAt: now + 44 * day,
        priceCents: 29900,
        capacity: 350,
        ticketsSold: 0,
        productId: productIdCpt,
        createdAt: now,
      });
    }

    const existingBanners = await ctx.db.query("banners").collect();
    if (existingBanners.length === 0) {
      await ctx.db.insert("banners", {
        title: "Your brand on the V",
        subtitle:
          "Digital real estate on Africa's fastest-growing talent platform. Brand takeovers, competition sponsorship, and live-show placements.",
        advertiser: "VStarz Partnerships",
        ctaLabel: "Become a partner",
        ctaUrl: "/network#partnerships",
        placement: "home_hero",
        active: true,
        weight: 10,
        impressions: 0,
        clicks: 0,
        createdAt: now,
      });
    }

    return { created: true, openId };
  },
});
