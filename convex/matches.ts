import { query } from "./_generated/server";
import { v } from "convex/values";

export const listMatches = query({
  args: {
    statusFilter: v.optional(v.string()),
    leagueId: v.optional(v.id("leagues")),
    startTimestamp: v.optional(v.number()),
    endTimestamp: v.optional(v.number()),
  },
  handler: async () => {
    return [];
  },
});

export const listMatchesByRound = query({
  args: {
    leagueId: v.id("leagues"),
    round: v.union(v.number(), v.string()),
  },
  handler: async () => {
    return [];
  },
});

export const getMatchDetails = query({
  args: {
    matchId: v.optional(v.id("matches")),
  },
  handler: async () => {
    return null;
  },
});

export const getTopScorers = query({
  args: {
    leagueId: v.optional(v.id("leagues")),
  },
  handler: async () => {
    return [];
  },
});
