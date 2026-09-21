import { query } from "./_generated/server";
import { v } from "convex/values";

// Retorna todas as partidas enriquecidas com os dados dos times e da liga
export const listMatches = query({
  args: {
    statusFilter: v.optional(
      v.union(
        v.literal("ALL"),
        v.literal("LIVE"),
        v.literal("FINISHED"),
        v.literal("SCHEDULED")
      )
    ),
    leagueId: v.optional(v.id("leagues")), // Filtro opcional por campeonato
  },
  handler: async (ctx, args) => {
    const rawMatches = await ctx.db.query("matches").collect();

    // Filtra por liga se selecionada
    let matches = args.leagueId
      ? rawMatches.filter((m) => m.leagueId === args.leagueId)
      : rawMatches;

    // Filtra por status
    if (args.statusFilter && args.statusFilter !== "ALL") {
      matches = matches.filter((m) => {
        if (args.statusFilter === "LIVE") {
          return ["IN_PLAY", "PAUSED", "EXTRA_TIME", "PENALTY_SHOOTOUT"].includes(m.status);
        }
        if (args.statusFilter === "FINISHED") {
          return m.status === "FINISHED";
        }
        if (args.statusFilter === "SCHEDULED") {
          return m.status === "SCHEDULED";
        }
        return true;
      });
    }

    // Hidrata com times e liga
    const hydratedMatches = await Promise.all(
      matches.map(async (match) => {
        const [homeTeam, awayTeam, league] = await Promise.all([
          ctx.db.get(match.homeTeamId),
          ctx.db.get(match.awayTeamId),
          ctx.db.get(match.leagueId),
        ]);

        return {
          ...match,
          homeTeam,
          awayTeam,
          league,
        };
      })
    );

    // Ordenação: primeiro os ao vivo, depois por prioridade de liga e horário
    return hydratedMatches.sort((a, b) => {
      const isLiveA = ["IN_PLAY", "PAUSED", "EXTRA_TIME", "PENALTY_SHOOTOUT"].includes(a.status);
      const isLiveB = ["IN_PLAY", "PAUSED", "EXTRA_TIME", "PENALTY_SHOOTOUT"].includes(b.status);
      if (isLiveA && !isLiveB) return -1;
      if (!isLiveA && isLiveB) return 1;

      const prioA = a.league?.priority ?? 99;
      const prioB = b.league?.priority ?? 99;
      if (prioA !== prioB) return prioA - prioB;

      return b.startTime - a.startTime;
    });
  },
});

  // Retorna os dados completos de uma partida específica junto com seus lances/eventos em ordem cronológica
  export const getMatchDetails = query({
    args: {
      matchId: v.optional(v.id("matches")),
    },
    handler: async (ctx, args) => {
      if (!args.matchId) return null;

      const match = await ctx.db.get(args.matchId);
      if (!match) return null;

      const [homeTeam, awayTeam, league] = await Promise.all([
        ctx.db.get(match.homeTeamId),
        ctx.db.get(match.awayTeamId),
        ctx.db.get(match.leagueId),
      ]);

    // Busca todos os eventos associados a essa partida
    const events = await ctx.db
      .query("matchEvents")
      .withIndex("by_match", (q) => q.eq("matchId", match._id))
      .collect();

    // Ordena do primeiro minuto até o último
    events.sort((a, b) => a.minute - b.minute);

    const statistics = await ctx.db
      .query("matchStatistics")
      .withIndex("by_match", (q) => q.eq("matchId", match._id))
      .first();

    return {
      ...match,
      homeTeam,
      awayTeam,
      league,
      events,
      statistics: statistics ?? null,
    };
  },
});