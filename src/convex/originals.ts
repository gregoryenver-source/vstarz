import { query } from "./_generated/server";

// Public catalogue of VStarz Originals programming
export const list = query({
  args: {},
  handler: async (ctx) => {
    const all = await ctx.db.query("originals").collect();
    return all.sort((a, b) => b.publishedAt - a.publishedAt);
  },
});

export const featured = query({
  args: {},
  handler: async (ctx) => {
    const all = await ctx.db.query("originals").collect();
    return all.filter((o) => o.featured).sort((a, b) => b.publishedAt - a.publishedAt);
  },
});
