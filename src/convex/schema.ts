import { authTables } from "@convex-dev/auth/server";
import { defineSchema, defineTable } from "convex/server";
import { Infer, v } from "convex/values";

// default user roles. can add / remove based on the project as needed
export const ROLES = {
  ADMIN: "admin",
  JUDGE: "judge",
  ARTIST: "artist",
  FAN: "fan",
  USER: "user",
  MEMBER: "member",
} as const;

export const roleValidator = v.union(
  v.literal(ROLES.ADMIN),
  v.literal(ROLES.JUDGE),
  v.literal(ROLES.ARTIST),
  v.literal(ROLES.FAN),
  v.literal(ROLES.USER),
  v.literal(ROLES.MEMBER),
);
export type Role = Infer<typeof roleValidator>;

export const planValidator = v.union(
  v.literal("free"),
  v.literal("gold"),
);
export type Plan = Infer<typeof planValidator>;

// Audition video length options (seconds)
export const DURATIONS = {
  S30: 30,
  S60: 60,
  M3: 180,
  M5: 300,
} as const;

export const durationValidator = v.union(
  v.literal(30),
  v.literal(60),
 v.literal(180),
  v.literal(300),
);

const schema = defineSchema(
  {
    // default auth tables using convex auth.
    ...authTables, // do not remove or modify

    // the users table is the default users table that is brought in by the authTables
    users: defineTable({
      name: v.optional(v.string()), // name of the user. do not remove
      image: v.optional(v.string()), // image of the user. do not remove
      email: v.optional(v.string()), // email of the user. do not remove
      emailVerificationTime: v.optional(v.number()), // email verification time. do not remove
      phone: v.optional(v.string()), // E.164 phone number, e.g. +27794999885
      phoneVerificationTime: v.optional(v.number()), // phone verification time
      isAnonymous: v.optional(v.boolean()), // is the user anonymous. do not remove

      role: v.optional(roleValidator), // role of the user. do not remove

      // VStarz profile fields
      username: v.optional(v.string()),
      bio: v.optional(v.string()),
      talents: v.optional(v.array(v.string())), // talent category slugs
      socials: v.optional(
        v.object({
          instagram: v.optional(v.string()),
          youtube: v.optional(v.string()),
          tiktok: v.optional(v.string()),
        }),
      ),
      isTalent: v.optional(v.boolean()),
      isBanned: v.optional(v.boolean()),
      plan: v.optional(planValidator), // "free" | "gold" (VStarz Gold)
      planExpiresAt: v.optional(v.number()),
      votingCredits: v.optional(v.number()),
      badges: v.optional(v.array(v.string())),
      country: v.optional(v.string()), // Global Championship qualifiers
    })
      .index("email", ["email"]) // index for the email. do not remove or modify
      .index("phone", ["phone"]) // index for phone sign-in / account linking. do not remove
      .index("username", ["username"])
      .index("role", ["role"]),

    talentCategories: defineTable({
      name: v.string(),
      slug: v.string(),
      description: v.optional(v.string()),
      icon: v.optional(v.string()),
      sortOrder: v.optional(v.number()),
    }).index("slug", ["slug"]),

    follows: defineTable({
      followerId: v.id("users"),
      followingId: v.id("users"),
      createdAt: v.number(),
    })
      .index("by_follower", ["followerId"])
      .index("by_following", ["followingId"])
      .index("by_pair", ["followerId", "followingId"]),

    competitions: defineTable({
      title: v.string(),
      description: v.string(),
      categorySlug: v.optional(v.string()),
      status: v.union(
        v.literal("draft"),
        v.literal("submissions_open"),
        v.literal("voting_open"),
        v.literal("closed"),
      ),
      coverImage: v.optional(v.string()),
      createdBy: v.id("users"),
      submissionsOpenAt: v.optional(v.number()),
      votingOpenAt: v.optional(v.number()),
      endsAt: v.optional(v.number()),
      prize: v.optional(v.string()),
      entryCount: v.optional(v.number()),
      // Weighted scoring configuration (defaults 40% public / 60% judges)
      publicVoteWeight: v.optional(v.number()),
      judgeScoreWeight: v.optional(v.number()),
    })
      .index("status", ["status"])
      .index("by_creator", ["createdBy"]),

    entries: defineTable({
      competitionId: v.id("competitions"),
      userId: v.id("users"),
      title: v.string(),
      description: v.optional(v.string()),
      videoUrl: v.string(), // uploaded via Convex storage
      thumbnailStorageId: v.optional(v.id("_storage")),
      videoStorageId: v.optional(v.id("_storage")),
      durationSeconds: v.optional(v.number()), // 30 | 60 | 180 | 300
      status: v.union(
        v.literal("pending"),
        v.literal("approved"),
        v.literal("rejected"),
      ),
      voteCount: v.number(),
      createdAt: v.number(),
    })
      .index("by_competition", ["competitionId"])
      .index("by_user", ["userId"])
      .index("by_competition_status", ["competitionId", "status"]),

    votes: defineTable({
      entryId: v.id("entries"),
      competitionId: v.id("competitions"),
      voterId: v.id("users"),
      creditsSpent: v.number(),
      createdAt: v.number(),
    })
      .index("by_entry", ["entryId"])
      .index("by_voter", ["voterId", "competitionId"])
      .index("by_competition", ["competitionId"]),

    liveRooms: defineTable({
      hostId: v.id("users"),
      title: v.string(),
      description: v.optional(v.string()),
      categorySlug: v.optional(v.string()),
      status: v.union(
        v.literal("scheduled"),
        v.literal("live"),
        v.literal("ended"),
      ),
      streamUrl: v.optional(v.string()), // HLS or provider URL; placeholder for MVP
      startedAt: v.optional(v.number()),
      endedAt: v.optional(v.number()),
      viewerCount: v.number(),
      scheduledAt: v.optional(v.number()),
    })
      .index("status", ["status"])
      .index("by_host", ["hostId"]),

    liveChatMessages: defineTable({
      roomId: v.id("liveRooms"),
      userId: v.id("users"),
      body: v.string(),
      createdAt: v.number(),
    }).index("by_room", ["roomId", "createdAt"]),

    liveVotes: defineTable({
      roomId: v.id("liveRooms"),
      userId: v.id("users"),
      choice: v.string(), // e.g. contestant A/B or rating
      creditsSpent: v.number(),
      createdAt: v.number(),
    })
      .index("by_room", ["roomId"])
      .index("by_room_user", ["roomId", "userId"]),

    transactions: defineTable({
      userId: v.id("users"),
      kind: v.union(
        v.literal("credit_purchase"),
        v.literal("premium_subscription"),
        v.literal("vote_spend"),
        v.literal("merch_order"),
        v.literal("event_ticket"),
      ),
      amountCents: v.number(),
      credits: v.optional(v.number()),
      provider: v.optional(v.string()), // "stripe" | "iap"
      providerRef: v.optional(v.string()), // checkout session / payment intent id
      status: v.union(
        v.literal("pending"),
        v.literal("completed"),
        v.literal("failed"),
        v.literal("refunded"),
      ),
      createdAt: v.number(),
    })
      .index("by_user", ["userId"])
      .index("status", ["status"]),

    notifications: defineTable({
      userId: v.id("users"),
      type: v.string(), // competition_alert | judge_feedback | system | follow | vote
      title: v.string(),
      body: v.optional(v.string()),
      link: v.optional(v.string()),
      readAt: v.optional(v.number()),
      createdAt: v.number(),
    }).index("by_user", ["userId", "createdAt"]),

    judgeFeedback: defineTable({
      entryId: v.id("entries"),
      judgeId: v.id("users"),
      score: v.number(), // 0-100
      comment: v.optional(v.string()),
      createdAt: v.number(),
    })
      .index("by_entry", ["entryId"])
      .index("by_judge", ["judgeId"]),

    entryComments: defineTable({
      entryId: v.id("entries"),
      userId: v.id("users"),
      body: v.string(),
      createdAt: v.number(),
    }).index("by_entry", ["entryId", "createdAt"]),

    moderationFlags: defineTable({
      reporterId: v.id("users"),
      targetType: v.union(v.literal("entry"), v.literal("user"), v.literal("message")),
      targetId: v.id("entries"), // or users / messages id as string
      reason: v.string(),
      status: v.union(
        v.literal("open"),
        v.literal("resolved"),
        v.literal("dismissed"),
      ),
      createdAt: v.number(),
    }).index("status", ["status"]),

    revenueStats: defineTable({
      month: v.string(), // e.g. "2026-09"
      grossCents: v.number(),
      netCents: v.number(),
      subscriptions: v.number(),
      creditSales: v.number(),
    }).index("by_month", ["month"]),

    // ── Fan Clubs ────────────────────────────────────────────────────────
    fanClubs: defineTable({
      name: v.string(),
      slug: v.string(),
      artistId: v.id("users"),
      description: v.string(),
      tier: v.union(v.literal("free"), v.literal("gold")), // gold clubs require VStarz Gold
      memberCount: v.number(),
      createdAt: v.number(),
    })
      .index("by_slug", ["slug"])
      .index("by_artist", ["artistId"]),

    fanClubMembers: defineTable({
      clubId: v.id("fanClubs"),
      userId: v.id("users"),
      joinedAt: v.number(),
    })
      .index("by_club", ["clubId"])
      .index("by_club_user", ["clubId", "userId"])
      .index("by_member", ["userId"]),

    // ── Artist Verification ──────────────────────────────────────────────
    verificationRequests: defineTable({
      userId: v.id("users"),
      stageName: v.string(),
      categorySlug: v.string(),
      evidenceUrl: v.string(), // press / streaming profile / social proof
      statement: v.string(),
      status: v.union(
        v.literal("pending"),
        v.literal("approved"),
        v.literal("rejected"),
      ),
      reviewNote: v.optional(v.string()),
      reviewedAt: v.optional(v.number()),
      createdAt: v.number(),
    })
      .index("by_status", ["status"])
      .index("by_user", ["userId"]),

    // ── Merchandise Store ────────────────────────────────────────────────
    merchProducts: defineTable({
      name: v.string(),
      slug: v.string(),
      description: v.string(),
      priceCents: v.number(),
      emoji: v.optional(v.string()), // visual placeholder for MVP
      kind: v.union(v.literal("merch"), v.literal("ticket")),
      active: v.boolean(),
      createdAt: v.number(),
    })
      .index("by_slug", ["slug"])
      .index("by_kind", ["kind"]),

    orders: defineTable({
      userId: v.id("users"),
      productId: v.id("merchProducts"),
      productName: v.string(),
      quantity: v.number(),
      amountCents: v.number(),
      status: v.union(
        v.literal("pending"),
        v.literal("paid"),
        v.literal("fulfilled"),
        v.literal("cancelled"),
      ),
      createdAt: v.number(),
    })
      .index("by_user", ["userId"])
      .index("by_status", ["status"]),

    // ── Ticketing (live events) ──────────────────────────────────────────
    events: defineTable({
      title: v.string(),
      description: v.string(),
      venue: v.string(),
      city: v.string(),
      startsAt: v.number(),
      priceCents: v.number(),
      capacity: v.number(),
      ticketsSold: v.number(),
      productId: v.id("merchProducts"), // linked ticket product
      createdAt: v.number(),
    }).index("by_starts", ["startsAt"]),

    // ── Roc Nation Africa Artist Network ─────────────────────────────────
    networkPosts: defineTable({
      authorId: v.id("users"),
      kind: v.union(
        v.literal("milestone"),
        v.literal("opportunity"),
        v.literal("announcement"),
      ),
      body: v.string(),
      createdAt: v.number(),
    }).index("by_created", ["createdAt"]),

    // ── Digital Record Label Submissions ─────────────────────────────────
    labelSubmissions: defineTable({
      userId: v.id("users"),
      artistName: v.string(),
      categorySlug: v.string(),
      links: v.string(), // streaming / social links
      pitch: v.string(),
      status: v.union(
        v.literal("submitted"),
        v.literal("in_review"),
        v.literal("signed"),
        v.literal("declined"),
      ),
      note: v.optional(v.string()),
      createdAt: v.number(),
    })
      .index("by_status", ["status"])
      .index("by_user", ["userId"]),

    // ── Digital Real Estate (brand takeovers) ────────────────────────────
    banners: defineTable({
      title: v.string(),
      subtitle: v.string(),
      advertiser: v.string(),
      ctaLabel: v.string(),
      ctaUrl: v.string(), // internal route ("/network#partnerships") or external URL
      placement: v.union(
        v.literal("home_hero"),
        v.literal("home_feed"),
        v.literal("competitions"),
        v.literal("live"),
      ),
      active: v.boolean(),
      weight: v.number(), // higher weight wins when multiple are active
      impressions: v.number(),
      clicks: v.number(),
      startsAt: v.optional(v.number()),
      endsAt: v.optional(v.number()),
      createdAt: v.number(),
    })
      .index("by_placement", ["placement"])
      .index("by_active", ["active"]),

    // ── AI engine output (Talent Radar, judge assistant, moderation) ─────
    aiInsights: defineTable({
      kind: v.union(
        v.literal("talent_radar"),
        v.literal("judge_assistant"),
        v.literal("engagement"),
        v.literal("trend"),
      ),
      competitionId: v.optional(v.id("competitions")),
      entryId: v.optional(v.id("entries")),
      userId: v.optional(v.id("users")), // insight targeted at a specific artist
      title: v.string(),
      body: v.string(),
      score: v.optional(v.number()), // 0-100 composite
      createdAt: v.number(),
    }).index("by_kind", ["kind"]),

    // ── VStarz Academy (Creator OS: learning & certification) ────────────
    academyCourses: defineTable({
      title: v.string(),
      slug: v.string(),
      track: v.union(
        v.literal("vocal"),
        v.literal("songwriting"),
        v.literal("dance"),
        v.literal("acting"),
        v.literal("content"),
        v.literal("branding"),
        v.literal("business"),
      ),
      level: v.union(v.literal("starter"), v.literal("pro"), v.literal("elite")),
      description: v.string(),
      lessons: v.number(),
      badge: v.string(), // badge slug awarded on completion
      active: v.boolean(),
      sortOrder: v.number(),
      createdAt: v.number(),
    }).index("by_slug", ["slug"]).index("by_active", ["active"]),

    academyEnrollments: defineTable({
      userId: v.id("users"),
      courseId: v.id("academyCourses"),
      completedLessons: v.number(),
      completedAt: v.optional(v.number()),
      createdAt: v.number(),
    })
      .index("by_user", ["userId"])
      .index("by_user_course", ["userId", "courseId"]),

    // ── Digital Audition Rooms (labels, brands, agencies, casting) ──────
    auditionRooms: defineTable({
      title: v.string(),
      brand: v.string(),
      kind: v.union(
        v.literal("casting_call"),
        v.literal("brand_challenge"),
        v.literal("private_competition"),
        v.literal("label_audition"),
      ),
      description: v.string(),
      status: v.union(v.literal("open"), v.literal("screening"), v.literal("closed")),
      hostId: v.id("users"),
      talentCategory: v.optional(v.string()),
      prize: v.optional(v.string()),
      deadlineAt: v.optional(v.number()),
      createdAt: v.number(),
    })
      .index("by_status", ["status"])
      .index("by_host", ["hostId"]),

    auditionInvites: defineTable({
      roomId: v.id("auditionRooms"),
      userId: v.id("users"),
      status: v.union(
        v.literal("applied"), // talent applied
        v.literal("invited"), // host invited
        v.literal("accepted"),
        v.literal("declined"),
      ),
      createdAt: v.number(),
    })
      .index("by_room", ["roomId"])
      .index("by_user", ["userId"]),

    // ── Team Competitions (crews, choirs, schools, countries) ───────────
    teams: defineTable({
      name: v.string(),
      kind: v.union(
        v.literal("choir"),
        v.literal("dance_crew"),
        v.literal("band"),
        v.literal("school"),
        v.literal("university"),
        v.literal("province"),
        v.literal("country"),
      ),
      affiliation: v.string(), // "Durban", "UCT", "Nigeria"…
      captainId: v.id("users"),
      memberCount: v.number(),
      createdAt: v.number(),
    }).index("by_kind", ["kind"]),

    teamMembers: defineTable({
      teamId: v.id("teams"),
      userId: v.id("users"),
      createdAt: v.number(),
    })
      .index("by_team", ["teamId"])
      .index("by_user", ["userId"]),

    // ── Creator Marketplace 2.0 (services & digital goods) ──────────────
    marketListings: defineTable({
      sellerId: v.id("users"),
      title: v.string(),
      category: v.union(
        v.literal("beats"),
        v.literal("lyrics"),
        v.literal("artwork"),
        v.literal("logos"),
        v.literal("video_editing"),
        v.literal("vocal_feature"),
        v.literal("session_musician"),
        v.literal("choreography"),
      ),
      description: v.string(),
      priceCents: v.number(),
      active: v.boolean(),
      salesCount: v.number(),
      createdAt: v.number(),
    })
      .index("by_active", ["active"])
      .index("by_seller", ["sellerId"]),

    marketOrders: defineTable({
      listingId: v.id("marketListings"),
      listingTitle: v.string(),
      buyerId: v.id("users"),
      sellerId: v.id("users"),
      amountCents: v.number(),
      status: v.union(v.literal("pending"), v.literal("completed"), v.literal("cancelled")),
      createdAt: v.number(),
    })
      .index("by_buyer", ["buyerId"])
      .index("by_seller", ["sellerId"]),

    // ── Franchise Model (VStarz Durban, Nigeria, Gospel…) ───────────────
    franchises: defineTable({
      name: v.string(),
      slug: v.string(),
      kind: v.union(
        v.literal("city"),
        v.literal("country"),
        v.literal("gospel"),
        v.literal("schools"),
        v.literal("universities"),
      ),
      region: v.string(),
      ownerId: v.id("users"),
      description: v.string(),
      status: v.union(v.literal("pending"), v.literal("approved")),
      memberCount: v.number(),
      createdAt: v.number(),
    }).index("by_status", ["status"]),

    // ── VStarz Originals (media arm) ─────────────────────────────────────
    originals: defineTable({
      title: v.string(),
      kind: v.union(
        v.literal("documentary"),
        v.literal("behind_the_scenes"),
        v.literal("winner_journey"),
        v.literal("interview"),
      ),
      videoUrl: v.string(),
      description: v.string(),
      featured: v.boolean(),
      publishedAt: v.number(),
    }).index("by_published", ["publishedAt"]),

    // ── Creator Protection Suite (rights, contracts, royalties) ─────────
    protectionItems: defineTable({
      userId: v.id("users"),
      kind: v.union(
        v.literal("copyright"),
        v.literal("contract"),
        v.literal("royalty"),
        v.literal("license"),
      ),
      title: v.string(),
      details: v.string(),
      reference: v.optional(v.string()), // registration ref / counterparty
      amountCents: v.optional(v.number()), // royalty amounts
      status: v.union(v.literal("active"), v.literal("pending"), v.literal("archived")),
      createdAt: v.number(),
    }).index("by_user", ["userId"]),

    // ── Fan Ownership Economy (rewards ledger) ───────────────────────────
    fanRewards: defineTable({
      userId: v.id("users"),
      kind: v.union(
        v.literal("early_discovery"),
        v.literal("vote"),
        v.literal("share"),
        v.literal("referral"),
        v.literal("community"),
      ),
      points: v.number(),
      note: v.optional(v.string()),
      createdAt: v.number(),
    }).index("by_user", ["userId"]),

    // ── Community (brought to you exclusively by Meta) ───────────────────
    // Open social space for Creators, Voters and the Public. Engaging
    // requires a connected account: vStarz (phone/email) or Meta (Facebook
    // / Instagram via Convex Auth OAuth).
    communityPosts: defineTable({
      authorId: v.id("users"),
      body: v.string(),
      audience: v.union(
        v.literal("creator"),
        v.literal("voter"),
        v.literal("public"),
      ),
      likeCount: v.number(),
      commentCount: v.number(),
      status: v.union(v.literal("visible"), v.literal("hidden")), // moderation
      createdAt: v.number(),
    })
      .index("by_status_created", ["status", "createdAt"])
      .index("by_author", ["authorId"]),

    communityLikes: defineTable({
      postId: v.id("communityPosts"),
      userId: v.id("users"),
      createdAt: v.number(),
    })
      .index("by_post_user", ["postId", "userId"])
      .index("by_post", ["postId"]),

    communityComments: defineTable({
      postId: v.id("communityPosts"),
      userId: v.id("users"),
      body: v.string(),
      createdAt: v.number(),
    }).index("by_post", ["postId", "createdAt"]),
  },
  {
    schemaValidation: false,
  },
);

export default schema;
