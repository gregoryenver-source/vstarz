import { getAuthUserId } from "@convex-dev/auth/server";
import { query } from "./_generated/server";
import { v } from "convex/values";

/**
 * Which social providers are usable right now. Driven by env vars read at
 * deploy time — the client uses this to show/hide the official buttons.
 */
export const configured = query({
  args: {},
  handler: async () => {
    return {
      facebook: Boolean(
        process.env.AUTH_FACEBOOK_ID && process.env.AUTH_FACEBOOK_SECRET,
      ),
      instagram: Boolean(
        process.env.AUTH_INSTAGRAM_ID && process.env.AUTH_INSTAGRAM_SECRET,
      ),
    };
  },
});

export const linkedAccount = v.object({
  provider: v.string(),
  linkedAt: v.number(),
});

/**
 * Social accounts linked to the current user (from the authAccounts table).
 * Empty for anonymous users.
 */
export const myLinkedAccounts = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) return [];
    const accounts = await ctx.db
      .query("authAccounts")
      .withIndex("userIdAndProvider", (q) => q.eq("userId", userId))
      .collect();
    return accounts
      .filter((a) => a.provider === "facebook" || a.provider === "instagram")
      .map((a) => ({
        provider: a.provider,
        linkedAt: a._creationTime,
      }));
  },
  returns: v.array(linkedAccount),
});
