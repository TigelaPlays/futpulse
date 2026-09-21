import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  // 1. Campeonatos (Pontos corridos e Copas)
  leagues: defineTable({
    name: v.string(),
    country: v.string(),
    logoUrl: v.string(),
    season: v.number(),
    type: v.union(v.literal("league"), v.literal("cup")),
    externalId: v.number(),
    priority: v.number(),
  })
    .index("by_externalId", ["externalId"])
    .index("by_priority", ["priority"]),

  // 2. Clubes
  teams: defineTable({
    name: v.string(),
    shortName: v.optional(v.string()),
    code: v.optional(v.string()),
    logoUrl: v.string(),
    externalId: v.number(),
  }).index("by_externalId", ["externalId"]),

  // 3. Partidas
  matches: defineTable({
    externalId: v.number(),
    leagueId: v.id("leagues"),
    round: v.string(),
    homeTeamId: v.id("teams"),
    awayTeamId: v.id("teams"),

    status: v.union(
      v.literal("SCHEDULED"),
      v.literal("IN_PLAY"),
      v.literal("PAUSED"),
      v.literal("EXTRA_TIME"),
      v.literal("PENALTY_SHOOTOUT"),
      v.literal("FINISHED"),
      v.literal("POSTPONED")
    ),

    statusShort: v.string(),
    minute: v.optional(v.number()),

    homeScore: v.number(),
    awayScore: v.number(),
    homeHalftimeScore: v.optional(v.number()),
    awayHalftimeScore: v.optional(v.number()),

    // Específico para copas e prorrogações
    homeExtraTimeScore: v.optional(v.number()),
    awayExtraTimeScore: v.optional(v.number()),
    homePenaltyScore: v.optional(v.number()),
    awayPenaltyScore: v.optional(v.number()),

    startTime: v.number(),
    elapsedSecondsUpdatedAt: v.optional(v.number()),
  })
    .index("by_externalId", ["externalId"])
    .index("by_status", ["status"])
    .index("by_league_and_status", ["leagueId", "status"])
    .index("by_startTime", ["startTime"]),

  // 4. Lances em Tempo Real
  matchEvents: defineTable({
    matchId: v.id("matches"),
    externalId: v.optional(v.string()),
    minute: v.number(),
    extraMinute: v.optional(v.number()),
    teamId: v.id("teams"),
    playerName: v.string(),
    assistPlayerName: v.optional(v.string()),
    type: v.union(
      v.literal("GOAL"),
      v.literal("YELLOW_CARD"),
      v.literal("RED_CARD"),
      v.literal("SUBSTITUTION"),
      v.literal("VAR")
    ),
    detail: v.optional(v.string()),
  })
    .index("by_match", ["matchId", "minute"])
    .index("by_externalId", ["externalId"]),
});