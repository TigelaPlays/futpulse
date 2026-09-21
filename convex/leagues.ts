import { query } from "./_generated/server";

export const listLeagues = query({
  args: {},
  handler: async (ctx) => {
    const leagues = await ctx.db.query("leagues").collect();
    return leagues.sort((a, b) => (a.priority ?? 99) - (b.priority ?? 99));
  },
});
