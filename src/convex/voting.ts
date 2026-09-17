import { getAuthUserId } from "@convex-dev/auth/server";
import { query, mutation, QueryCtx } from "./_generated/server";
import { v } from "convex/values";

async function requireUser(ctx: QueryCtx) {
  const userId = await getAuthUserId(ctx);
  if (userId === null) throw new Error("Not authenticated");
  const user = await ctx.db.get(userId);
  if (user === null) throw new Error("User not found");
  if (user.isBanned) throw new Error("Account suspended");
  return { userId, user };
}

const VOTE_COST = 1; // credits per vote

export const vote = mutation({
  args: { entryId: v.id("entries"), packs: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const { userId, user } = await requireUser(ctx);
    const packs = Math.max(1, Math.floor(args.packs ?? 1));
    const cost = packs * VOTE_COST;

    const credits = user.votingCredits ?? 0;
    if (credits < cost) {
      throw new Error("Not enough voting credits. Top up on the Boost page.");
    }

    const entry = await ctx.db.get(args.entryId);
    if (!entry) throw new Error("Entry not found");
    if (entry.status !== "approved") throw new Error("This entry is not open for votes");

    const comp = await ctx.db.get(entry.competitionId);
    if (!comp || comp.status !== "voting_open") {
      throw new Error("Voting is not open for this competition");
    }

    // duplicate-vote guard: one vote pack per user per entry
    const existing = await ctx.db
      .query("votes")
      .withIndex("by_voter", (q) =>
        q.eq("voterId", userId).eq("competitionId", entry.competitionId),
      )
      .collect();
    if (existing.some((v) => v.entryId === args.entryId)) {
      throw new Error("You already voted for this entry");
    }

    await ctx.db.patch(args.entryId, {
      voteCount: entry.voteCount + packs,
    });
    await ctx.db.patch(userId, { votingCredits: credits - cost });
    await ctx.db.insert("votes", {
      entryId: args.entryId,
      competitionId: entry.competitionId,
      voterId: userId,
      creditsSpent: cost,
      createdAt: Date.now(),
    });
    await ctx.db.insert("transactions", {
      userId,
      kind: "vote_spend",
      amountCents: 0,
      credits: -cost,
      status: "completed",
      createdAt: Date.now(),
    });

    return { success: true, creditsLeft: credits - cost };
  },
});

export const getMyVotes = query({
  args: { competitionId: v.id("competitions") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) return [];
    const votes = await ctx.db
      .query("votes")
      .withIndex("by_voter", (q) =>
        q.eq("voterId", userId).eq("competitionId", args.competitionId),
      )
      .collect();
    return votes.map((v) => v.entryId);
  },
});
