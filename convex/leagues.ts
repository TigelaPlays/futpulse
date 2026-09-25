import { query } from "./_generated/server";
import { v } from "convex/values";

export const listLeagues = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("leagues").collect();
  },
});

export const getLatestFinishedRound = query({
  args: {
    leagueId: v.id("leagues"),
  },
  handler: async () => {
    return 1;
  },
});

export const getStandingsByRound = query({
  args: {
    leagueId: v.id("leagues"),
    upToRound: v.optional(v.number()),
    filter: v.optional(v.union(v.literal("all"), v.literal("home"), v.literal("away"))),
  },
  handler: async () => {
    return [];
  },
});
