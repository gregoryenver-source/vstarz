import { query } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";
import type { QueryCtx } from "./_generated/server";

// Africa Talent Championship — live country standings.
// Qualifiers: South Africa, Nigeria, Kenya, Ghana, Tanzania, Uganda.
const QUALIFIER_COUNTRIES = [
  "South Africa",
  "Nigeria",
  "Kenya",
  "Ghana",
  "Tanzania",
  "Uganda",
] as const;

const QUALIFIERS = new Set<string>(QUALIFIER_COUNTRIES);

async function getStandings(ctx: QueryCtx) {
  const [users, entries] = await Promise.all([
    ctx.db.query("users").collect(),
    ctx.db.query("entries").collect(),
  ]);

  const userById = new Map(users.map((u) => [u._id, u]));
  const byCountry = new Map<string, { creators: Set<string>; votes: number; auditions: number }>();

  for (const country of QUALIFIER_COUNTRIES) {
    byCountry.set(country, { creators: new Set(), votes: 0, auditions: 0 });
  }

  for (const entry of entries) {
    if (entry.status !== "approved") continue;
    const owner = userById.get(entry.userId);
    const country =
      owner?.country && QUALIFIERS.has(owner.country) ? owner.country : "South Africa";
    const bucket = byCountry.get(country);
    if (bucket) {
      bucket.creators.add(entry.userId);
      bucket.votes += entry.voteCount ?? 0;
      bucket.auditions += 1;
    }
  }

  return [...byCountry.entries()]
    .map(([country, data]) => ({
      country,
      creators: data.creators.size,
      votes: data.votes,
      auditions: data.auditions,
      score: data.votes * 2 + data.auditions * 50 + data.creators.size * 25,
    }))
    .sort((a, b) => b.score - a.score)
    .map((row, i) => ({ rank: i + 1, ...row }));
}

export const standings = query({
  args: {},
  handler: async (ctx) => {
    return await getStandings(ctx);
  },
});

// My country qualifier status
export const myCountry = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) return null;
    const user = await ctx.db.get(userId);
    if (!user) return null;
    const country =
      user.country && QUALIFIERS.has(user.country) ? user.country : "South Africa";
    const standings = await getStandings(ctx);
    return {
      country,
      standing: standings.find((s) => s.country === country) ?? null,
    };
  },
});
