import { getAuthUserId } from "@convex-dev/auth/server";
import { mutation, QueryCtx, MutationCtx } from "./_generated/server";
import type { Id } from "./_generated/dataModel";

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
    // Demo content is seeded for everyone — signed-out visitors included — so
    // the landing page and dashboard are never empty. Credit goes to the
    // signed-in user when available, otherwise to a shared "VStarz Studio"
    // house account.
    let userId = await getAuthUserId(ctx);
    if (userId === null) {
      const house = await ctx.db
        .query("users")
        .withIndex("username", (q) => q.eq("username", "vstarz-studio"))
        .first();
      userId =
        house?._id ??
        (await ctx.db.insert("users", {
          username: "vstarz-studio",
          name: "VStarz Studio",
          isTalent: false,
          role: "user",
        }));
    }
    const comps = await ctx.db.query("competitions").collect();
    const compsEmpty = comps.length === 0;

    const now = Date.now();
    const day = 24 * 60 * 60 * 1000;

    const openId = compsEmpty
      ? await ctx.db.insert("competitions", {
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
    })
    : undefined;

    if (compsEmpty) {
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
    }

    // ── Demo audition entries for the "Hottest auditions this week" carousel ──
    const existingEntries = await ctx.db.query("entries").collect();
    if (existingEntries.length === 0) {
      const [openComp, votingComp, closedComp] = await Promise.all([
        ctx.db
          .query("competitions")
          .withIndex("status", (q) => q.eq("status", "submissions_open"))
          .first(),
        ctx.db
          .query("competitions")
          .withIndex("status", (q) => q.eq("status", "voting_open"))
          .first(),
        ctx.db
          .query("competitions")
          .withIndex("status", (q) => q.eq("status", "closed"))
          .first(),
      ]);
      const fallbackComp = openComp ?? votingComp ?? closedComp;

      const getOrCreateDemoUser = async (username: string, name: string) => {
        const existing = await ctx.db
          .query("users")
          .withIndex("username", (q) => q.eq("username", username))
          .first();
        if (existing) return existing._id;
        return await ctx.db.insert("users", {
          username,
          name,
          isTalent: true,
          role: "artist",
        });
      };

      const VIDEO = (name: string) =>
        `https://storage.googleapis.com/gtv-videos-bucket/sample/${name}.mp4`;

      const demoEntries = [
        {
          comp: votingComp ?? fallbackComp,
          username: "amo",
          name: "Amo",
          title: "Golden buzzer moment — amapiano freestyle",
          description: "60 seconds of pure amapiano footwork. The crowd went wild.",
          votes: 842,
          daysAgo: 1,
          video: VIDEO("ForBiggerJoyrides"),
        },
        {
          comp: openComp ?? fallbackComp,
          username: "zee",
          name: "Zee",
          title: "Opera meets gqom",
          description: "Soprano runs over Durban drums — a genre-bending audition.",
          votes: 776,
          daysAgo: 2,
          video: VIDEO("ForBiggerBlazes"),
        },
        {
          comp: openComp ?? fallbackComp,
          username: "thabo",
          name: "Thabo",
          title: "Midnight cypher — 60s rap",
          description: "Multilingual flow: Zulu, Sesotho and English in one take.",
          votes: 713,
          daysAgo: 2,
          video: VIDEO("ForBiggerEscapes"),
        },
        {
          comp: closedComp ?? fallbackComp,
          username: "lerato",
          name: "Lerato",
          title: "Load-shedding diaries (stand-up)",
          description: "The set that won Comedy Clash's audience vote.",
          votes: 655,
          daysAgo: 4,
          video: VIDEO("ForBiggerFun"),
        },
        {
          comp: openComp ?? fallbackComp,
          username: "kamo",
          name: "Kamo",
          title: "Marimba glow — instrumental loop",
          description: "Live-looped marimba with a house drop at the 45s mark.",
          votes: 590,
          daysAgo: 5,
          video: VIDEO("ForBiggerMeltdowns"),
        },
        {
          comp: openComp ?? fallbackComp,
          username: "naledi",
          name: "Naledi",
          title: "Spoken word: Daughter of the Soil",
          description: "A commanding piece about home, exile and returning.",
          votes: 512,
          daysAgo: 5,
          video: VIDEO("Sintel"),
        },
      ];

      const counts = new Map<Id<"competitions">, number>();
      for (const d of demoEntries) {
        if (!d.comp) continue;
        await ctx.db.insert("entries", {
          competitionId: d.comp._id,
          userId: await getOrCreateDemoUser(d.username, d.name),
          title: d.title,
          description: d.description,
          videoUrl: d.video,
          status: "approved",
          voteCount: d.votes,
          createdAt: now - d.daysAgo * day,
        });
        counts.set(d.comp._id, (counts.get(d.comp._id) ?? 0) + 1);
      }

      for (const [compId, count] of counts) {
        const comp = await ctx.db.get(compId);
        if (comp && (comp.entryCount ?? 0) < count) {
          await ctx.db.patch(comp._id, { entryCount: count });
        }
      }
    }

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
        title: "Ignite the Stage",
        subtitle:
          "Ignition Group powers the next generation of African stars — sponsor of the VStarz Season 1 spotlight.",
        advertiser: "Ignition Group",
        ctaLabel: "Explore Ignition Group",
        ctaUrl: "https://www.ignitiongroup.co.za",
        placement: "home_hero",
        active: true,
        weight: 10,
        impressions: 0,
        clicks: 0,
        createdAt: now,
      });
    }

    // ── VStarz Academy course catalog (Creator OS) ──
    const existingCourses = await ctx.db.query("academyCourses").collect();
    if (existingCourses.length === 0) {
      const courses = [
        {
          title: "Find Your Voice: Vocal Foundations",
          slug: "vocal-foundations",
          track: "vocal" as const,
          level: "starter" as const,
          description:
            "Breathing, pitch control and mic technique from working vocal coaches. Your voice is the instrument — learn to own it.",
          lessons: 6,
          badge: "vocal-foundations",
        },
        {
          title: "Songwriting That Sticks",
          slug: "songwriting-that-sticks",
          track: "songwriting" as const,
          level: "starter" as const,
          description:
            "Hooks, melody, and the 8-bar rule. Write songs people hum after one listen.",
          lessons: 5,
          badge: "songwriting",
        },
        {
          title: "Stage Presence & Movement",
          slug: "stage-presence",
          track: "dance" as const,
          level: "starter" as const,
          description:
            "Own the frame. Choreography basics, camera awareness and the confidence to perform cold.",
          lessons: 4,
          badge: "stage-presence",
        },
        {
          title: "Content Engine: Post Like a Pro",
          slug: "content-engine",
          track: "content" as const,
          level: "starter" as const,
          description:
            "The weekly posting system that grows a fanbase from zero — hooks, formats and repurposing.",
          lessons: 5,
          badge: "content-engine",
        },
        {
          title: "Personal Branding for Artists",
          slug: "personal-branding",
          track: "branding" as const,
          level: "pro" as const,
          description:
            "Positioning, visual identity and a story brands want to attach to. Become the artist sponsors pick.",
          lessons: 6,
          badge: "personal-branding",
        },
        {
          title: "Copyright & Owning Your Masters",
          slug: "copyright-masters",
          track: "business" as const,
          level: "pro" as const,
          description:
            "Register your works, understand publishing splits, and never sign blind again.",
          lessons: 4,
          badge: "copyright",
        },
        {
          title: "The Music Business: Deals & Royalties",
          slug: "music-business",
          track: "business" as const,
          level: "elite" as const,
          description:
            "Record deals, distribution splits, royalty flows and negotiating from strength.",
          lessons: 7,
          badge: "music-business",
        },
        {
          title: "Going Pro: From Contest to Career",
          slug: "going-pro",
          track: "branding" as const,
          level: "elite" as const,
          description:
            "The capstone: press kits, rate cards, brand outreach and running yourself like a business.",
          lessons: 6,
          badge: "going-pro",
        },
      ];
      for (const [i, c] of courses.entries()) {
        await ctx.db.insert("academyCourses", {
          ...c,
          active: true,
          sortOrder: i,
          createdAt: now,
        });
      }
    }

    return { created: true, openId };
  },
});

// ── Creator OS demo data (rooms, teams, marketplace, franchises, originals,
// fan rewards, protection vault). Idempotent per table; runs on demand. ──
async function getOrCreateHost(ctx: MutationCtx) {
  const house = await ctx.db
    .query("users")
    .withIndex("email", (q) => q.eq("email", "studio@vstarz.africa"))
    .first();
  if (house) return house;
  const id = await ctx.db.insert("users", {
    email: "studio@vstarz.africa",
    name: "VStarz Studio",
    country: "South Africa",
    role: "user",
  });
  return (await ctx.db.get(id))!;
}

export const createCreatorOsDemoData = mutation({
  args: {},
  handler: async (ctx) => {
    const houseAccount = await getOrCreateHost(ctx);

    // Demo users for teams & marketplace attribution
    const demoUsers: Array<{ id: Id<"users">; name: string; country?: string }> = [];
    const seedUsers = [
      { email: "amara@example.com", name: "Amara Okafor", country: "Nigeria", talent: "Singer" },
      { email: "thabo@example.com", name: "Thabo Mokoena", country: "South Africa", talent: "Dancer" },
      { email: "zawadi@example.com", name: "Zawadi Otieno", country: "Kenya", talent: "Rapper" },
    ];
    for (const su of seedUsers) {
      const existing = await ctx.db
        .query("users")
        .withIndex("email", (q) => q.eq("email", su.email))
        .first();
      if (!existing) {
        const id = await ctx.db.insert("users", {
          email: su.email,
          name: su.name,
          country: su.country,
          talents: [su.talent],
          role: "user",
        });
        demoUsers.push({ id, name: su.name, country: su.country });
      } else {
        demoUsers.push({ id: existing._id, name: su.name, country: su.country });
      }
    }
    const [amara, thabo, zawadi] = demoUsers;

    // ── Digital Audition Rooms ──
    const roomCount = await ctx.db.query("auditionRooms").collect();
    if (roomCount.length === 0) {
      const roomSeeds = [
        {
          title: "Universal Music Africa Challenge",
          brand: "Universal Music Group",
          kind: "label_audition" as const,
          description:
            "Universal Music Africa is scouting the continent's next recording artist. Submit your strongest original performance.",
          talentCategory: "Music",
          prize: "Recording contract + A&R mentorship",
        },
        {
          title: "Netflix Africa Casting Call",
          brand: "Netflix",
          kind: "casting_call" as const,
          description:
            "Casting for upcoming African original productions. All languages welcome — show us your range.",
          talentCategory: "Acting",
          prize: "Role in a Netflix Africa production",
        },
        {
          title: "Nike Creator Search",
          brand: "Nike",
          kind: "brand_challenge" as const,
          description:
            "Move like you mean it. Nike wants dance crews and athletes creating culture across Africa.",
          talentCategory: "Dance",
          prize: "Brand ambassadorship + gear drop",
        },
        {
          title: "MTN Creator Challenge",
          brand: "MTN",
          kind: "brand_challenge" as const,
          description:
            "Create short-form content that stops the scroll. MTN is backing the boldest mobile-first creators.",
          talentCategory: "Content Creation",
          prize: "R50,000 + MTN creator contract",
        },
      ];
      for (const room of roomSeeds) {
        await ctx.db.insert("auditionRooms", {
          ...room,
          status: "open" as const,
          hostId: houseAccount._id,
          deadlineAt: Date.now() + 30 * 24 * 3600 * 1000,
          createdAt: Date.now() - Math.floor(Math.random() * 10) * 24 * 3600 * 1000,
        });
      }
    }

    // ── Team Competitions ──
    const teamCount = await ctx.db.query("teams").collect();
    if (teamCount.length === 0) {
      const teamSeeds = [
        { name: "Jozi Stars Collective", kind: "dance_crew" as const, affiliation: "Johannesburg" },
        { name: "Durban Vibrations", kind: "choir" as const, affiliation: "Durban" },
        { name: "UCT Sons & Daughters", kind: "university" as const, affiliation: "UCT" },
        { name: "Wits Voices", kind: "university" as const, affiliation: "Wits" },
        { name: "Naija Heatwave", kind: "band" as const, affiliation: "Nigeria" },
        { name: "RSA All-Stars", kind: "country" as const, affiliation: "South Africa" },
      ];
      const teamCaptains = [amara, thabo, zawadi];
      for (let i = 0; i < teamSeeds.length; i++) {
        const captain = teamCaptains[i % teamCaptains.length];
        await ctx.db.insert("teams", {
          ...teamSeeds[i],
          captainId: captain.id,
          memberCount: 1,
          createdAt: Date.now(),
        });
      }
    }

    // ── Creator Marketplace 2.0 ──
    const listingCount = await ctx.db.query("marketListings").collect();
    if (listingCount.length === 0) {
      const marketSeeds = [
        { seller: amara, title: "Afrobeat Type Beat — Lagos Nights", category: "beats" as const, priceCents: 35000, description: "80 BPM Afrobeat instrumental with live percussion. WAV + stems included." },
        { seller: zawadi, title: "Hook Writing Service", category: "lyrics" as const, priceCents: 50000, description: "I write a catchy hook for your track in English, Swahili or Zulu. 2 revisions." },
        { seller: thabo, title: "Custom Choreo for Your Crew", category: "choreography" as const, priceCents: 85000, description: "Full dance routine designed for your crew's next performance or video." },
        { seller: amara, title: "Vocal Feature — Female Lead", category: "vocal_feature" as const, priceCents: 120000, description: "Studio-quality lead vocals on your production. Remote session, 48h delivery." },
        { seller: thabo, title: "Logo & Cover Art Pack", category: "logos" as const, priceCents: 45000, description: "Artist logo + 3 cover-art concepts sized for all platforms." },
      ];
      for (const m of marketSeeds) {
        await ctx.db.insert("marketListings", {
          sellerId: m.seller.id,
          title: m.title,
          category: m.category,
          description: m.description,
          priceCents: m.priceCents,
          active: true,
          salesCount: 0,
          createdAt: Date.now() - Math.floor(Math.random() * 7) * 24 * 3600 * 1000,
        });
      }
    }

    // ── Franchise Model ──
    const franchiseCount = await ctx.db.query("franchises").collect();
    if (franchiseCount.length === 0) {
      const franchiseSeeds = [
        { name: "VStarz Durban", kind: "city" as const, region: "Durban, South Africa" },
        { name: "VStarz Cape Town", kind: "city" as const, region: "Cape Town, South Africa" },
        { name: "VStarz Nigeria", kind: "country" as const, region: "Lagos, Nigeria" },
        { name: "VStarz Gospel", kind: "gospel" as const, region: "Pan-African" },
        { name: "VStarz Schools", kind: "schools" as const, region: "National Schools Circuit" },
        { name: "VStarz Universities", kind: "universities" as const, region: "UCT • Wits • UNILAG" },
      ];
      for (const f of franchiseSeeds) {
        await ctx.db.insert("franchises", {
          name: f.name,
          slug: f.name.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
          kind: f.kind,
          region: f.region,
          ownerId: houseAccount._id,
          description: `${f.name} — powered by the VStarz platform for ${f.region}.`,
          status: "approved" as const,
          memberCount: Math.floor(Math.random() * 400) + 50,
          createdAt: Date.now(),
        });
      }
    }

    // ── VStarz Originals ──
    const originalCount = await ctx.db.query("originals").collect();
    if (originalCount.length === 0) {
      const originalSeeds = [
        { title: "The First Audition", kind: "documentary" as const, featured: true, videoUrl: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4", description: "The stories behind the very first VStarz auditions — raw talent, raw nerves, pure magic." },
        { title: "Road to the Finals", kind: "behind_the_scenes" as const, featured: false, videoUrl: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4", description: "Behind the curtain of Season 1: rehearsals, rivalries and the friendships that formed." },
        { title: "Winner's Journey: Thabo M.", kind: "winner_journey" as const, featured: false, videoUrl: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4", description: "From a township dance crew to the national stage — the full arc of a VStarz champion." },
        { title: "In the Booth with Amara", kind: "interview" as const, featured: false, videoUrl: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4", description: "An intimate studio session with one of Africa's rising voices." },
      ];
      for (const o of originalSeeds) {
        await ctx.db.insert("originals", {
          ...o,
          publishedAt: Date.now() - Math.floor(Math.random() * 30) * 24 * 3600 * 1000,
        });
      }
    }

    // ── Fan Ownership Economy ──
    const rewardCount = await ctx.db.query("fanRewards").collect();
    if (rewardCount.length === 0) {
      const rewardSeeds = [
        { user: amara, kind: "early_discovery" as const, points: 50, note: "Discovered a creator before 100 votes" },
        { user: amara, kind: "referral" as const, points: 40, note: "Referred a new creator" },
        { user: thabo, kind: "vote" as const, points: 25, note: "Voted across 25 auditions" },
        { user: zawadi, kind: "community" as const, points: 30, note: "Community building streak" },
        { user: zawadi, kind: "share" as const, points: 15, note: "Shared auditions to socials" },
      ];
      for (const r of rewardSeeds) {
        await ctx.db.insert("fanRewards", {
          userId: r.user.id,
          kind: r.kind,
          points: r.points,
          note: r.note,
          createdAt: Date.now() - Math.floor(Math.random() * 14) * 24 * 3600 * 1000,
        });
      }
    }

    // ── Creator Protection Suite examples ──
    const protectionCount = await ctx.db.query("protectionItems").collect();
    if (protectionCount.length === 0) {
      await ctx.db.insert("protectionItems", {
        userId: houseAccount._id,
        kind: "copyright" as const,
        title: "Lagos Nights — Master Recording",
        details: "Copyright registration for the Season 1 showcase master.",
        reference: "CIPC-2026-004821",
        status: "active" as const,
        createdAt: Date.now(),
      });
      await ctx.db.insert("protectionItems", {
        userId: houseAccount._id,
        kind: "royalty" as const,
        title: "Streaming royalties — Q3 2026",
        details: "Aggregated streaming royalties from platform distribution.",
        amountCents: 1240000,
        status: "active" as const,
        createdAt: Date.now(),
      });
    }

    return { created: true };
  },
});
