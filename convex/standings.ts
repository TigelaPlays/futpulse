import { query } from "./_generated/server";
import { v } from "convex/values";

export const getStandingsByLeague = query({
  args: {
    leagueId: v.string(),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("standings")
      .withIndex("by_league", (q) => q.eq("leagueId", args.leagueId))
      .collect();
  },
});
