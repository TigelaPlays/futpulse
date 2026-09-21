import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  // 1. Campeonatos (Pontos corridos e Copas)
  leagues: defineTable({
    name: v.string(),
    country: v.string(),
    logoUrl: v.string(),
    customLogoStorageId: v.optional(v.id("_storage")), // Imagem no Convex File Storage
    season: v.number(),
    type: v.union(v.literal("league"), v.literal("cup")),
    externalId: v.optional(v.number()),
    priority: v.optional(v.number()),
  })
    .index("by_externalId", ["externalId"])
    .index("by_priority", ["priority"]),

  // 2. Clubes
  teams: defineTable({
    name: v.string(),
    shortName: v.optional(v.string()),
    code: v.optional(v.string()),
    logoUrl: v.string(),
    customLogoStorageId: v.optional(v.id("_storage")), // Imagem no Convex File Storage
    externalId: v.optional(v.number()),
  }).index("by_externalId", ["externalId"]),

  // 3. Estádios
  stadiums: defineTable({
    name: v.string(),
    city: v.string(),
    capacity: v.optional(v.number()),
    imageUrl: v.string(),
    customImageStorageId: v.optional(v.id("_storage")),
    teamId: v.optional(v.id("teams")),
  }).index("by_team", ["teamId"]),

  // 4. Partidas
  matches: defineTable({
    externalId: v.optional(v.number()),
    leagueId: v.id("leagues"),
    round: v.string(),
    homeTeamId: v.id("teams"),
    awayTeamId: v.id("teams"),
    stadiumId: v.optional(v.id("stadiums")), // Vínculo com estádio

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
    .index("by_league", ["leagueId"])
    .index("by_league_and_status", ["leagueId", "status"])
    .index("by_league_and_round", ["leagueId", "round"])
    .index("by_startTime", ["startTime"]),

  // 5. Lances em Tempo Real
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

  // 6. Estatísticas Comparativas da Partida
  matchStatistics: defineTable({
    matchId: v.id("matches"),
    homePossession: v.number(),
    awayPossession: v.number(),
    homeShotsOnTarget: v.number(),
    awayShotsOnTarget: v.number(),
    homeTotalShots: v.number(),
    awayTotalShots: v.number(),
    homeCorners: v.number(),
    awayCorners: v.number(),
    homeFouls: v.number(),
    awayFouls: v.number(),
  }).index("by_match", ["matchId"]),

  // 7. Tabela de Classificação
  standings: defineTable({
    leagueId: v.id("leagues"),
    season: v.number(),
    rank: v.number(),
    previousRank: v.optional(v.number()), // Posição na rodada anterior
    teamId: v.id("teams"),
    points: v.number(),
    goalsDiff: v.number(),
    form: v.optional(v.string()), // Ex: "WWDLW"
    played: v.number(),
    win: v.number(),
    draw: v.number(),
    lose: v.number(),
    goalsFor: v.number(),
    goalsAgainst: v.number(),
    description: v.optional(v.string()), // Ex: "Libertadores", "Rebaixamento"
  })
    .index("by_league_season", ["leagueId", "season"])
    .index("by_league_rank", ["leagueId", "rank"]),
});