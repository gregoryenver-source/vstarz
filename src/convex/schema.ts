import { authTables } from "@convex-dev/auth/server";
import { defineSchema, defineTable } from "convex/server";
import { Infer, v } from "convex/values";

// default user roles. can add / remove based on the project as needed
export const ROLES = {
  ADMIN: "admin",
  USER: "user",
  MEMBER: "member",
} as const;

export const roleValidator = v.union(
  v.literal(ROLES.ADMIN),
  v.literal(ROLES.USER),
  v.literal(ROLES.MEMBER),
);
export type Role = Infer<typeof roleValidator>;

export const planValidator = v.union(
  v.literal("free"),
  v.literal("premium"),
  v.literal("premium_pro"),
);
export type Plan = Infer<typeof planValidator>;

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
      isAnonymous: v.optional(v.boolean()), // is the user anonymous. do not remove

      role: v.optional(roleValidator), // role of the user. do not remove

      // vStarz profile fields
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
      plan: v.optional(planValidator),
      planExpiresAt: v.optional(v.number()),
      votingCredits: v.optional(v.number()),
    })
      .index("email", ["email"]) // index for the email. do not remove or modify
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
  },
  {
    schemaValidation: false,
  },
);

export default schema;
