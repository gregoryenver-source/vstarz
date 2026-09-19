import { getAuthUserId } from "@convex-dev/auth/server";
import { query, QueryCtx } from "./_generated/server";
import { v } from "convex/values";
import type { Id } from "./_generated/dataModel";

// ── Creator Credit Score ───────────────────────────────────────────────────
// A trust metric computed from real platform behavior. Brands and labels use
// it to decide who to recruit, book and sign.

export type CreditScore = {
  total: number;
  professionalism: number; // follows the rules, entries approved, no flags
  engagement: number; // community participation
  reliability: number; // consistency of output over time
  completion: number; // follows through on submissions
  brandSafety: number; // no moderation incidents
  grade: "Bronze" | "Silver" | "Gold" | "Platinum";
};

export type CareerStage =
  | "unknown"
  | "discovery"
  | "competition"
  | "mentorship"
  | "distribution"
  | "professional";

const STAGE_ORDER: Record<CareerStage, number> = {
  unknown: 0,
  discovery: 1,
  competition: 2,
  mentorship: 3,
  distribution: 4,
  professional: 5,
};

const STAGE_META: Record<
  CareerStage,
  { title: string; description: string; unlock: string }
> = {
  unknown: {
    title: "Unknown",
    description: "Create your performer profile to start the pipeline.",
    unlock: "Set your username and talent categories",
  },
  discovery: {
    title: "Discovery",
    description: "Your first audition is on stage and gathering fans.",
    unlock: "Submit your first audition",
  },
  competition: {
    title: "Competition",
    description: "You're competing, collecting votes and judge scores.",
    unlock: "Collect 100 total votes across contests",
  },
  mentorship: {
    title: "Mentorship",
    description: "Judges are coaching you and the Academy is sharpening you.",
    unlock: "Earn 2 Academy certifications",
  },
  distribution: {
    title: "Distribution",
    description: "Your catalog is live and fans are spending on you.",
    unlock: "Reach a Creator Credit Score of 650+",
  },
  professional: {
    title: "Professional",
    description: "You're booked, branded and earning on VStarz.",
    unlock: "Score 750+ and complete the full pipeline",
  },
};

function gradeFor(total: number): CreditScore["grade"] {
  if (total >= 750) return "Platinum";
  if (total >= 650) return "Gold";
  if (total >= 500) return "Silver";
  return "Bronze";
}

async function computeCreditScore(
  ctx: QueryCtx,
  userId: Id<"users">,
): Promise<CreditScore> {
  const entries = await ctx.db
    .query("entries")
    .withIndex("by_user", (q) => q.eq("userId", userId))
    .collect();

  const votes = entries.reduce((s, e) => s + e.voteCount, 0);
  const approved = entries.filter((e) => e.status === "approved").length;
  const rejected = entries.filter((e) => e.status === "rejected").length;

  const resolvedFlags = await ctx.db
    .query("moderationFlags")
    .withIndex("status", (q) => q.eq("status", "resolved"))
    .collect();
  const flags = resolvedFlags.filter((f) => f.targetId === (userId as unknown as string));

  // ── Component scores (0-100 each) ──
  const professionalism = Math.max(
    0,
    Math.min(100, 50 + approved * 12 - rejected * 15),
  );
  const engagement = Math.min(100, Math.round(Math.sqrt(votes) * 6));
  const reliability = Math.min(
    100,
    entries.length === 0 ? 0 : 40 + entries.length * 10,
  );
  const completion = Math.max(
    0,
    Math.min(100, entries.length === 0 ? 0 : Math.round((approved / entries.length) * 100)),
  );
  const brandSafety = Math.max(0, 100 - flags.length * 25);

  const total = Math.round(
    professionalism * 0.25 +
      engagement * 0.25 +
      reliability * 0.2 +
      completion * 0.2 +
      brandSafety * 0.1,
  );

  return {
    total,
    professionalism,
    engagement,
    reliability,
    completion,
    brandSafety,
    grade: gradeFor(total),
  };
}

// ── Passport query: the verified creative CV ───────────────────────────────

export const myPassport = query({
  args: { userId: v.optional(v.id("users")) },
  handler: async (ctx, args) => {
    // Own passport by default; admins/others can view by id via profile links.
    const viewerId = await getAuthUserId(ctx);
    if (viewerId === null) throw new Error("Not authenticated");
    const targetId = args.userId ?? viewerId;
    const user = await ctx.db.get(targetId);
    if (!user) throw new Error("User not found");

    const credit = await computeCreditScore(ctx, targetId);

    const entries = await ctx.db
      .query("entries")
      .withIndex("by_user", (q) => q.eq("userId", targetId))
      .collect();
    entries.sort((a, b) => b.createdAt - a.createdAt);

    const history = await Promise.all(
      entries.slice(0, 10).map(async (e) => {
        const comp = await ctx.db.get(e.competitionId);
        return {
          _id: e._id,
          title: e.title,
          status: e.status,
          votes: e.voteCount,
          createdAt: e.createdAt,
          competition: comp ? { _id: comp._id, title: comp.title } : null,
        };
      }),
    );

    // ── Career pipeline stage ──
    const certs = await ctx.db
      .query("academyEnrollments")
      .withIndex("by_user", (q) => q.eq("userId", targetId))
      .collect()
      .then((all) => all.filter((e) => e.completedAt !== undefined).length);

    const totalVotes = entries.reduce((s, e) => s + e.voteCount, 0);
    const hasProfile = Boolean(user.username && (user.talents?.length ?? 0) > 0);

    let stage: CareerStage = "unknown";
    if (hasProfile) stage = "discovery";
    if (stage === "discovery" && entries.length > 0) stage = "competition";
    if (stage === "competition" && totalVotes >= 100 && certs >= 2) stage = "mentorship";
    if (stage === "mentorship" && credit.total >= 650) stage = "distribution";
    if (stage === "distribution" && credit.total >= 750 && certs >= 4) stage = "professional";

    const pipeline = (Object.keys(STAGE_ORDER) as CareerStage[]).map((key) => ({
      key,
      ...STAGE_META[key],
      reached: STAGE_ORDER[key] <= STAGE_ORDER[stage],
      current: key === stage,
    }));

    return {
      user: {
        _id: user._id,
        name: user.name,
        username: user.username,
        image: user.image,
        talents: user.talents ?? [],
        badges: user.badges ?? [],
        plan: user.plan ?? "free",
      },
      credit,
      stage,
      pipeline,
      history,
      stats: {
        totalAuditions: entries.length,
        totalVotes,
        certifications: certs,
      },
    };
  },
});
