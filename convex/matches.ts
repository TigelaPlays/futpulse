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
    startTimestamp: v.optional(v.number()), // Início do dia (timestamp ms)
    endTimestamp: v.optional(v.number()), // Fim do dia (timestamp ms)
  },
  handler: async (ctx, args) => {
    const rawMatches = await ctx.db.query("matches").collect();

    // Filtra por liga se selecionada
    let matches = args.leagueId
      ? rawMatches.filter((m) => m.leagueId === args.leagueId)
      : rawMatches;

    // Filtro por intervalo de datas (ex: dia de hoje, ontem, etc.)
    if (args.startTimestamp !== undefined && args.endTimestamp !== undefined) {
      matches = matches.filter(
        (m) => m.startTime >= args.startTimestamp! && m.startTime <= args.endTimestamp!
      );
    } else if (!args.leagueId) {
      // Se estiver em "Todas as Ligas" sem filtro de data explícito,
      // exibe apenas as partidas da rodada mais recente/ativa de cada liga para não poluir
      const leagueActiveRounds = new Map<string, string>();
      for (const m of matches) {
        const lid = m.leagueId;
        const currentR = leagueActiveRounds.get(lid);
        const num = parseInt(m.round.replace(/\D/g, ""), 10) || 0;
        const currentNum = currentR ? parseInt(currentR.replace(/\D/g, ""), 10) || 0 : 0;
        if (!currentR || num > currentNum) {
          leagueActiveRounds.set(lid, m.round);
        }
      }
      matches = matches.filter((m) => leagueActiveRounds.get(m.leagueId) === m.round);
    }

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

    // Hidrata com times, liga, estádio e eventos
    const hydratedMatches = await Promise.all(
      matches.map(async (match) => {
        const [homeTeam, awayTeam, league, stadium, events] = await Promise.all([
          ctx.db.get(match.homeTeamId),
          ctx.db.get(match.awayTeamId),
          ctx.db.get(match.leagueId),
          match.stadiumId ? ctx.db.get(match.stadiumId) : null,
          ctx.db
            .query("matchEvents")
            .withIndex("by_match", (q) => q.eq("matchId", match._id))
            .collect(),
        ]);

        events.sort((a, b) => a.minute - b.minute);

        return {
          ...match,
          homeTeam,
          awayTeam,
          league,
          stadium,
          events: events.filter((e) =>
            ["GOAL", "RED_CARD", "YELLOW_CARD"].includes(e.type)
          ),
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

// Retorna o ranking de artilheiros oficial do campeonato (Fonte GE)
export const getTopScorers = query({
  args: {
    leagueId: v.optional(v.id("leagues")),
  },
  handler: async (ctx, args) => {
    let leagueId = args.leagueId;

    if (!leagueId) {
      // Busca a liga Série B por padrão
      const serieB = await ctx.db
        .query("leagues")
        .withIndex("by_externalId", (q) => q.eq("externalId", 72))
        .first();
      if (serieB) {
        leagueId = serieB._id;
      } else {
        const allLeagues = await ctx.db.query("leagues").collect();
        const found = allLeagues.find((l) => l.name.toLowerCase().includes("série b"));
        if (found) leagueId = found._id;
        else if (allLeagues.length > 0) leagueId = allLeagues[0]._id;
      }
    }

    if (!leagueId) return [];

    const scorers = await ctx.db
      .query("topScorers")
      .withIndex("by_league", (q) => q.eq("leagueId", leagueId!))
      .collect();

    scorers.sort((a, b) => a.rank - b.rank);
    return scorers;
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

      const [homeTeam, awayTeam, league, stadium] = await Promise.all([
        ctx.db.get(match.homeTeamId),
        ctx.db.get(match.awayTeamId),
        ctx.db.get(match.leagueId),
        match.stadiumId ? ctx.db.get(match.stadiumId) : null,
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
      stadium,
      events,
      statistics: statistics ?? null,
    };
  },
});

// Retorna as partidas de uma rodada específica de um campeonato
export const listMatchesByRound = query({
  args: {
    leagueId: v.id("leagues"),
    round: v.string(),
  },
  handler: async (ctx, args) => {
    const roundNum = args.round.replace(/\D/g, "");
    const searchRounds = [
      args.round,
      roundNum ? `Rodada ${roundNum}` : args.round,
      roundNum,
    ].filter(Boolean);

    const allMatches = await ctx.db
      .query("matches")
      .withIndex("by_league_and_round", (q) => q.eq("leagueId", args.leagueId))
      .collect();

    const matches = allMatches.filter((m) =>
      searchRounds.some(
        (sr) => m.round.trim().toLowerCase() === sr.trim().toLowerCase()
      )
    );

    return await Promise.all(
      matches.map(async (m) => {
        const [homeTeam, awayTeam, stadium, events] = await Promise.all([
          ctx.db.get(m.homeTeamId),
          ctx.db.get(m.awayTeamId),
          m.stadiumId ? ctx.db.get(m.stadiumId) : null,
          ctx.db
            .query("matchEvents")
            .withIndex("by_match", (q) => q.eq("matchId", m._id))
            .collect(),
        ]);

        events.sort((a, b) => a.minute - b.minute);

        return {
          ...m,
          homeTeam,
          awayTeam,
          stadium,
          events: events.filter(
            (e) => e.type === "GOAL" || e.type === "RED_CARD"
          ),
        };
      })
    );
  },
});