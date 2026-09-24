import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  // 1. Campeonatos (Pontos corridos e Copas)
  leagues: defineTable({
    name: v.string(),
    code: v.optional(v.string()),
    country: v.string(),
    logoUrl: v.string(),
    customLogoStorageId: v.optional(v.id("_storage")), // Imagem no Convex File Storage
    season: v.number(),
    type: v.union(v.literal("league"), v.literal("cup")),
    externalId: v.optional(v.number()),
    priority: v.optional(v.number()),
    format: v.optional(v.string()), // Ex: "league_phase" (UCL), "group_knockout" (Libertadores), "knockout" (Copa do Brasil)
    currentStage: v.optional(v.string()),
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
    stage: v.optional(v.string()), // Ex: "Fase de Liga", "Fase de Grupos", "Oitavas de Final"
    group: v.optional(v.string()), // Ex: "Grupo A", "Grupo B"
    homeTeamId: v.id("teams"),
    awayTeamId: v.id("teams"),
    stadiumId: v.optional(v.id("stadiums")), // Vínculo com estádio

    status: v.union(
      v.literal("SCHEDULED"),
      v.literal("IN_PLAY"),
      v.literal("LIVE"),
      v.literal("HALFTIME"),
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
    homeYellowCards: v.optional(v.number()),
    awayYellowCards: v.optional(v.number()),
    homeRedCards: v.optional(v.number()),
    awayRedCards: v.optional(v.number()),
    homePasses: v.optional(v.number()),
    awayPasses: v.optional(v.number()),
    homePassAccuracy: v.optional(v.number()),
    awayPassAccuracy: v.optional(v.number()),
  }).index("by_match", ["matchId"]),

  // 7. Tabela de Classificação
  standings: defineTable({
    leagueId: v.optional(v.string()), // ID ou slug identificando a Nations League
    division: v.union(v.literal("A"), v.literal("B"), v.literal("C"), v.literal("D")),
    group: v.string(), // "A1", "A2", "B1", "C1", "D1", etc.
    teamId: v.optional(v.id("teams")),
    teamName: v.string(),
    teamFlag: v.optional(v.string()),
    points: v.number(),
    played: v.number(),
    won: v.number(),
    drawn: v.number(),
    lost: v.number(),
    goalsFor: v.number(),
    goalsAgainst: v.number(),
    goalDifference: v.number(),
    form: v.optional(v.array(v.string())), // ex: ["W", "D", "L"]
    zone: v.union(
      v.literal("QUARTER_FINALS"),
      v.literal("PROMOTION"),
      v.literal("PROMOTION_PLAYOFF"),
      v.literal("RELEGATION_PLAYOFF"),
      v.literal("RELEGATION"),
      v.literal("NONE")
    ),
  })
    .index("by_division_group", ["division", "group"])
    .index("by_division", ["division"]),

  // 8. Artilharia / Top Scorers (Fonte Oficial GE)
  topScorers: defineTable({
    leagueId: v.id("leagues"),
    rank: v.number(),
    playerName: v.string(),
    teamId: v.optional(v.id("teams")),
    teamName: v.string(),
    teamCode: v.optional(v.string()),
    teamLogoUrl: v.optional(v.string()),
    goals: v.number(),
    assists: v.optional(v.number()),
    matches: v.optional(v.number()),
    penalties: v.optional(v.number()),
  })
    .index("by_league", ["leagueId"])
    .index("by_league_rank", ["leagueId", "rank"]),

  // 9. Simulação de Partidas em Tempo Real
  simulations: defineTable({
    matchId: v.id("matches"),
    isActive: v.boolean(),
    isPaused: v.boolean(),
    speedMultiplier: v.number(),
    runId: v.string(),
    stepMinutes: v.number(),
    lastTickAt: v.number(),
  }).index("by_match", ["matchId"]),

  // 10. Controle de Quota e Rate Limiting de APIs Externas
  apiQuota: defineTable({
    provider: v.string(), // ex: "api-football", "football-data"
    remainingRequests: v.number(),
    totalLimit: v.optional(v.number()),
    resetAt: v.number(), // timestamp ms do reset (meia-noite UTC)
    lastRequestAt: v.number(),
    isBlocked: v.boolean(),
  }).index("by_provider", ["provider"]),
});