import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  leagues: defineTable({
    name: v.string(),
    code: v.optional(v.string()),
    country: v.string(),
    logoUrl: v.string(),
    season: v.number(),
    type: v.union(v.literal("league"), v.literal("cup")),
    priority: v.optional(v.number()),
  }),

  teams: defineTable({
    name: v.string(),
    shortName: v.optional(v.string()),
    code: v.optional(v.string()),
    logoUrl: v.string(),
  }),

  matches: defineTable({
    leagueId: v.id("leagues"),
    round: v.string(),
    homeTeamId: v.id("teams"),
    awayTeamId: v.id("teams"),
    homeScore: v.number(),
    awayScore: v.number(),
    status: v.string(),
    statusShort: v.string(),
    minute: v.optional(v.number()),
    startTime: v.number(),
  }).index("by_league", ["leagueId"]),

  standings: defineTable({
    leagueId: v.optional(v.string()),
    division: v.optional(v.string()),
    group: v.optional(v.string()),
    teamName: v.string(),
    points: v.number(),
    played: v.number(),
    won: v.number(),
    drawn: v.number(),
    lost: v.number(),
    goalsFor: v.number(),
    goalsAgainst: v.number(),
    goalDifference: v.number(),
  }),
});