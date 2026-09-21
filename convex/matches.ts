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
  },
  handler: async (ctx, args) => {
    const rawMatches = await ctx.db.query("matches").collect();

    // Filtra pelo status se solicitado
    const filteredMatches = rawMatches.filter((m) => {
      if (!args.statusFilter || args.statusFilter === "ALL") return true;

      const isLive = ["IN_PLAY", "PAUSED", "EXTRA_TIME", "PENALTY_SHOOTOUT"].includes(
        m.status
      );

      if (args.statusFilter === "LIVE") return isLive;
      if (args.statusFilter === "FINISHED") return m.status === "FINISHED";
      if (args.statusFilter === "SCHEDULED") return m.status === "SCHEDULED";
      return true;
    });

    // Enriquece cada partida com time mandante, visitante e liga
    const enriched = await Promise.all(
      filteredMatches.map(async (match) => {
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

    // Ordenação: Jogos AO VIVO primeiro, depois por horário de início
    return enriched.sort((a, b) => {
      const isLiveA = ["IN_PLAY", "PAUSED", "EXTRA_TIME", "PENALTY_SHOOTOUT"].includes(
        a.status
      );
      const isLiveB = ["IN_PLAY", "PAUSED", "EXTRA_TIME", "PENALTY_SHOOTOUT"].includes(
        b.status
      );

      if (isLiveA && !isLiveB) return -1;
      if (!isLiveA && isLiveB) return 1;
      return a.startTime - b.startTime;
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

      return {
        ...match,
        homeTeam,
        awayTeam,
        league,
        events,
      };
    },
  });