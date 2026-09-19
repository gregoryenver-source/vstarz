import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";
import type { QueryCtx } from "./_generated/server";

async function requireUser(ctx: QueryCtx) {
  const userId = await getAuthUserId(ctx);
  if (userId === null) throw new Error("Not authenticated");
  const user = await ctx.db.get(userId);
  if (user === null) throw new Error("User not found");
  return { userId, user };
}

// Public leaderboard of teams
export const list = query({
  args: {},
  handler: async (ctx) => {
    const teams = await ctx.db.query("teams").collect();
    const withMeta = await Promise.all(
      teams.map(async (team) => {
        const members = await ctx.db
          .query("teamMembers")
          .withIndex("by_team", (q) => q.eq("teamId", team._id))
          .collect();
        const memberDetails = await Promise.all(
          members.map(async (m) => {
            const user = await ctx.db.get(m.userId);
            return { userId: m.userId, name: user?.name ?? "Member" };
          }),
        );
        return {
          ...team,
          memberDetails,
          currentSize: memberDetails.length,
        };
      }),
    );
    return withMeta.sort((a, b) => b.memberCount - a.memberCount);
  },
});

export const myTeams = query({
  args: {},
  handler: async (ctx) => {
    const { userId } = await requireUser(ctx);
    const memberships = await ctx.db
      .query("teamMembers")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();
    return await Promise.all(
      memberships.map((m) => ctx.db.get(m.teamId)),
    );
  },
});

export const create = mutation({
  args: {
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
    affiliation: v.string(),
    memberCount: v.number(),
  },
  handler: async (ctx, args) => {
    const { userId } = await requireUser(ctx);
    const teamId = await ctx.db.insert("teams", {
      ...args,
      captainId: userId,
      createdAt: Date.now(),
    });
    await ctx.db.insert("teamMembers", { teamId, userId, createdAt: Date.now() });
    return { teamId };
  },
});

export const join = mutation({
  args: { teamId: v.id("teams") },
  handler: async (ctx, { teamId }) => {
    const { userId } = await requireUser(ctx);
    const team = await ctx.db.get(teamId);
    if (!team) throw new Error("Team not found");

    const existing = await ctx.db
      .query("teamMembers")
      .withIndex("by_team", (q) => q.eq("teamId", teamId))
      .collect();
    if (existing.some((m) => m.userId === userId)) {
      throw new Error("You are already in this team");
    }
    await ctx.db.insert("teamMembers", { teamId, userId, createdAt: Date.now() });
    await ctx.db.patch(teamId, { memberCount: team.memberCount + 1 });
    return { ok: true };
  },
});

export const leave = mutation({
  args: { teamId: v.id("teams") },
  handler: async (ctx, { teamId }) => {
    const { userId } = await requireUser(ctx);
    const team = await ctx.db.get(teamId);
    if (!team) throw new Error("Team not found");
    if (team.captainId === userId) throw new Error("Captains cannot leave their own team");

    const memberships = await ctx.db
      .query("teamMembers")
      .withIndex("by_team", (q) => q.eq("teamId", teamId))
      .collect();
    const membership = memberships.find((m) => m.userId === userId);
    if (!membership) throw new Error("You are not in this team");
    await ctx.db.delete(membership._id);
    await ctx.db.patch(teamId, { memberCount: Math.max(0, team.memberCount - 1) });
    return { ok: true };
  },
});
