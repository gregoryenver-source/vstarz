import { getAuthUserId } from "@convex-dev/auth/server";
import { query, mutation, QueryCtx } from "./_generated/server";
import { v } from "convex/values";
import type { Doc, Id } from "./_generated/dataModel";

async function requireUser(ctx: QueryCtx) {
  const userId = await getAuthUserId(ctx);
  if (userId === null) throw new Error("Not authenticated");
  const user = await ctx.db.get(userId);
  if (user === null) throw new Error("User not found");
  if (user.isBanned) throw new Error("Account suspended");
  return { userId, user };
}

export const listLive = query({
  args: {},
  handler: async (ctx) => {
    const decorate = async (rooms: Doc<"liveRooms">[]) =>
      Promise.all(
        rooms.map(async (r) => {
          const host: Doc<"users"> | null = await ctx.db.get(r.hostId);
          return {
            ...r,
            host: host
              ? { _id: host._id, name: host.name, username: host.username, image: host.image }
              : null,
          };
        }),
      );

    const live = await decorate(
      await ctx.db
        .query("liveRooms")
        .withIndex("status", (q) => q.eq("status", "live"))
        .collect(),
    );
    const scheduled = await decorate(
      await ctx.db
        .query("liveRooms")
        .withIndex("status", (q) => q.eq("status", "scheduled"))
        .collect(),
    );
    return { live, scheduled };
  },
});

export const get = query({
  args: { id: v.id("liveRooms") },
  handler: async (ctx, args) => {
    const room = await ctx.db.get(args.id);
    if (!room) return null;
    const host = await ctx.db.get(room.hostId);
    return {
      ...room,
      host: host
        ? { _id: host._id, name: host.name, username: host.username, image: host.image }
        : null,
    };
  },
});

export const create = mutation({
  args: {
    title: v.string(),
    description: v.optional(v.string()),
    categorySlug: v.optional(v.string()),
    scheduledAt: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const { userId, user } = await requireUser(ctx);
    if (!user.isTalent && user.role !== "admin") {
      throw new Error("Only talent accounts can host live rooms");
    }
    return await ctx.db.insert("liveRooms", {
      hostId: userId,
      title: args.title.trim(),
      description: args.description?.trim(),
      categorySlug: args.categorySlug,
      status: "scheduled",
      scheduledAt: args.scheduledAt,
      viewerCount: 0,
    });
  },
});

export const goLive = mutation({
  args: { id: v.id("liveRooms") },
  handler: async (ctx, args) => {
    const { userId } = await requireUser(ctx);
    const room = await ctx.db.get(args.id);
    if (!room) throw new Error("Room not found");
    if (room.hostId !== userId) throw new Error("Not authorized");
    await ctx.db.patch(args.id, {
      status: "live",
      startedAt: Date.now(),
      streamUrl:
        room.streamUrl ??
        "https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8", // demo HLS stream for MVP
    });

    // notify followers
    const followers = await ctx.db
      .query("follows")
      .withIndex("by_following", (q) => q.eq("followingId", userId))
      .collect();
    for (const f of followers.slice(0, 50)) {
      await ctx.db.insert("notifications", {
        userId: f.followerId,
        type: "competition_alert",
        title: "You're live now!",
        body: `${room.title} just went live. Join the room!`,
        link: `/live/${room._id}`,
        createdAt: Date.now(),
      });
    }
  },
});

export const end = mutation({
  args: { id: v.id("liveRooms") },
  handler: async (ctx, args) => {
    const { userId } = await requireUser(ctx);
    const room = await ctx.db.get(args.id);
    if (!room) throw new Error("Room not found");
    if (room.hostId !== userId) throw new Error("Not authorized");
    await ctx.db.patch(args.id, {
      status: "ended",
      endedAt: Date.now(),
    });
  },
});

export const listChat = query({
  args: { roomId: v.id("liveRooms"), limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const messages = await ctx.db
      .query("liveChatMessages")
      .withIndex("by_room", (q) => q.eq("roomId", args.roomId))
      .order("desc")
      .take(args.limit ?? 50);
    messages.reverse();
    return await Promise.all(
      messages.map(async (m) => {
        const u = await ctx.db.get(m.userId);
        return {
          _id: m._id,
          body: m.body,
          createdAt: m.createdAt,
          userId: m.userId,
          userName: u?.name ?? u?.username ?? "Fan",
          userImage: u?.image,
        };
      }),
    );
  },
});

export const sendChat = mutation({
  args: { roomId: v.id("liveRooms"), body: v.string() },
  handler: async (ctx, args) => {
    const { userId } = await requireUser(ctx);
    const body = args.body.trim().slice(0, 300);
    if (!body) throw new Error("Message is empty");
    await ctx.db.insert("liveChatMessages", {
      roomId: args.roomId,
      userId,
      body,
      createdAt: Date.now(),
    });
  },
});

const LIVE_VOTE_COST = 2;

export const castLiveVote = mutation({
  args: { roomId: v.id("liveRooms"), choice: v.string() },
  handler: async (ctx, args) => {
    const { userId, user } = await requireUser(ctx);
    const room = await ctx.db.get(args.roomId);
    if (!room || room.status !== "live") {
      throw new Error("This room is not live");
    }

    const credits = user.votingCredits ?? 0;
    if (credits < LIVE_VOTE_COST) {
      throw new Error("Not enough voting credits. Top up on the Boost page.");
    }

    await ctx.db.patch(userId, { votingCredits: credits - LIVE_VOTE_COST });
    await ctx.db.insert("liveVotes", {
      roomId: args.roomId,
      userId,
      choice: args.choice,
      creditsSpent: LIVE_VOTE_COST,
      createdAt: Date.now(),
    });
    await ctx.db.insert("transactions", {
      userId,
      kind: "vote_spend",
      amountCents: 0,
      credits: -LIVE_VOTE_COST,
      status: "completed",
      createdAt: Date.now(),
    });

    const tally = await ctx.db
      .query("liveVotes")
      .withIndex("by_room", (q) => q.eq("roomId", args.roomId))
      .collect();
    const counts: Record<string, number> = {};
    for (const tv of tally) {
      counts[tv.choice] = (counts[tv.choice] ?? 0) + 1;
    }
    return counts;
  },
});

export const getLiveTally = query({
  args: { roomId: v.id("liveRooms") },
  handler: async (ctx, args) => {
    const tally = await ctx.db
      .query("liveVotes")
      .withIndex("by_room", (q) => q.eq("roomId", args.roomId))
      .collect();
    const counts: Record<string, number> = {};
    for (const tv of tally) {
      counts[tv.choice] = (counts[tv.choice] ?? 0) + 1;
    }
    return counts;
  },
});

export const heartbeat = mutation({
  args: { roomId: v.id("liveRooms") },
  handler: async (ctx, args) => {
    const room = await ctx.db.get(args.roomId);
    if (!room) return;
    // naive viewer count for MVP; real product would track sessions
    if (room.status === "live") {
      await ctx.db.patch(args.roomId, {
        viewerCount: room.viewerCount + 1,
      });
    }
  },
});
