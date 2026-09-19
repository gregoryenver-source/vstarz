import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { internal } from "./_generated/api";
import { getAuthUserId } from "@convex-dev/auth/server";
import type { QueryCtx } from "./_generated/server";

async function requireUser(ctx: QueryCtx) {
  const userId = await getAuthUserId(ctx);
  if (userId === null) throw new Error("Not authenticated");
  const user = await ctx.db.get(userId);
  if (user === null) throw new Error("User not found");
  return { userId, user };
}

// Public: browse open audition rooms
export const listOpen = query({
  args: {},
  handler: async (ctx) => {
    const rooms = await ctx.db
      .query("auditionRooms")
      .withIndex("by_status", (q) => q.eq("status", "open"))
      .collect();
    const withHost = await Promise.all(
      rooms.map(async (room) => {
        const host = await ctx.db.get(room.hostId);
        const applicantCount = (
          await ctx.db
            .query("auditionInvites")
            .withIndex("by_room", (q) => q.eq("roomId", room._id))
            .collect()
        ).length;
        return {
          ...room,
          hostName: host?.name ?? "VStarz Partner",
          applicantCount,
        };
      }),
    );
    return withHost.sort((a, b) => b.createdAt - a.createdAt);
  },
});

// Public: room detail + applicants (talent visible to hosts)
export const get = query({
  args: { roomId: v.id("auditionRooms") },
  handler: async (ctx, { roomId }) => {
    const room = await ctx.db.get(roomId);
    if (!room) return null;
    const invites = await ctx.db
      .query("auditionInvites")
      .withIndex("by_room", (q) => q.eq("roomId", roomId))
      .collect();
    const applicants = await Promise.all(
      invites.map(async (inv) => {
        const user = await ctx.db.get(inv.userId);
        return {
          inviteId: inv._id,
          status: inv.status,
          userId: inv.userId,
          name: user?.name ?? "Unknown",
          createdAt: inv.createdAt,
        };
      }),
    );
    return { ...room, applicants };
  },
});

// Talent: my invites/applications
export const myInvites = query({
  args: {},
  handler: async (ctx) => {
    const { userId } = await requireUser(ctx);
    const invites = await ctx.db
      .query("auditionInvites")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();
    return await Promise.all(
      invites.map(async (inv) => {
        const room = await ctx.db.get(inv.roomId);
        return { ...inv, room };
      }),
    );
  },
});

// Talent applies to a room
export const apply = mutation({
  args: { roomId: v.id("auditionRooms") },
  handler: async (ctx, { roomId }) => {
    const { userId } = await requireUser(ctx);
    const room = await ctx.db.get(roomId);
    if (!room) throw new Error("Room not found");
    if (room.status !== "open") throw new Error("This audition room is not open");

    const existing = await ctx.db
      .query("auditionInvites")
      .withIndex("by_room", (q) => q.eq("roomId", roomId))
      .collect();
    if (existing.some((i) => i.userId === userId)) {
      throw new Error("You have already applied to this audition");
    }
    await ctx.db.insert("auditionInvites", {
      roomId,
      userId,
      status: "applied",
      createdAt: Date.now(),
    });
    // Fan-reward the hustle: auditions count as community building
    await ctx.scheduler.runAfter(0, internal.fanRewards.award, {
      userId,
      kind: "community",
      points: 5,
      note: `Applied to ${room.title}`,
    });
    return { ok: true };
  },
});

// Host: create a room (Digital Audition Room)
export const create = mutation({
  args: {
    title: v.string(),
    brand: v.string(),
    kind: v.union(
      v.literal("casting_call"),
      v.literal("brand_challenge"),
      v.literal("private_competition"),
      v.literal("label_audition"),
    ),
    description: v.string(),
    talentCategory: v.optional(v.string()),
    prize: v.optional(v.string()),
    deadlineAt: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const { userId } = await requireUser(ctx);
    const roomId = await ctx.db.insert("auditionRooms", {
      ...args,
      status: "open",
      hostId: userId,
      createdAt: Date.now(),
    });
    return { roomId };
  },
});

// Host: invite specific talent
export const invite = mutation({
  args: { roomId: v.id("auditionRooms"), userId: v.id("users") },
  handler: async (ctx, { roomId, userId }) => {
    const { userId: hostId } = await requireUser(ctx);
    const room = await ctx.db.get(roomId);
    if (!room) throw new Error("Room not found");
    if (room.hostId !== hostId) throw new Error("Only the host can invite talent");
    await ctx.db.insert("auditionInvites", {
      roomId,
      userId,
      status: "invited",
      createdAt: Date.now(),
    });
    return { ok: true };
  },
});

// Talent responds to an invite
export const respond = mutation({
  args: { inviteId: v.id("auditionInvites"), accept: v.boolean() },
  handler: async (ctx, { inviteId, accept }) => {
    const { userId } = await requireUser(ctx);
    const invite = await ctx.db.get(inviteId);
    if (!invite) throw new Error("Invite not found");
    if (invite.userId !== userId) throw new Error("Not your invite");
    await ctx.db.patch(inviteId, { status: accept ? "accepted" : "declined" });
    return { ok: true };
  },
});
