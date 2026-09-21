import { query } from "./_generated/server";
import { v } from "convex/values";

export const listLeagues = query({
  args: {},
  handler: async (ctx) => {
    const leagues = await ctx.db.query("leagues").collect();
    return leagues.sort((a, b) => (a.priority ?? 99) - (b.priority ?? 99));
  },
});

export const getStandings = query({
  args: {
    leagueId: v.id("leagues"),
  },
  handler: async (ctx, args) => {
    const standings = await ctx.db
      .query("standings")
      .withIndex("by_league_rank", (q) => q.eq("leagueId", args.leagueId))
      .collect();

    // Hidrata com dados dos times
    return await Promise.all(
      standings.map(async (row) => {
        const team = await ctx.db.get(row.teamId);
        return {
          ...row,
          team,
        };
      })
    );
  },
});
