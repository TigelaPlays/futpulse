import { query, mutation } from "./_generated/server";
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

    // Termos que identificam fases preliminares amadoras (FA Cup, etc.)
    // Apenas fases profissionais (1st Round Proper em diante) devem aparecer na grade
    const AMATEUR_ROUND_TERMS = [
      "qualifying",
      "preliminary",
      "qualifier",
      "extra preliminary",
      "pre-qualifying",
    ];
    const isAmateurRound = (round: string) => {
      const r = round.toLowerCase();
      return AMATEUR_ROUND_TERMS.some((t) => r.includes(t));
    };

    // Filtra por liga se selecionada
    let matches = args.leagueId
      ? rawMatches.filter((m) => m.leagueId === args.leagueId)
      : rawMatches;

    // Remove fases preliminares amadoras de todas as visualizações
    // (exceto quando a liga está selecionada explicitamente pelo utilizador)
    if (!args.leagueId) {
      matches = matches.filter((m) => !isAmateurRound(m.round));
    }

    // Filtro por intervalo de datas (ex: dia de hoje, ontem, etc.)
    if (args.startTimestamp !== undefined && args.endTimestamp !== undefined) {
      matches = matches.filter(
        (m) => m.startTime >= args.startTimestamp! && m.startTime <= args.endTimestamp!
      );
      // Na grade diária, exibe apenas jogos sincronizados via API (com externalId)
      // para não vazar partidas de seed manual de outras datas
      matches = matches.filter((m) => m.externalId !== undefined && m.externalId !== null);
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

      const [homeTeam, awayTeam, league] = await Promise.all([
        ctx.db.get(match.homeTeamId),
        ctx.db.get(match.awayTeamId),
        ctx.db.get(match.leagueId),
      ]);

      let stadium = match.stadiumId ? await ctx.db.get(match.stadiumId) : null;
      if (!stadium && match.homeTeamId) {
        stadium = await ctx.db
          .query("stadiums")
          .withIndex("by_team", (q) => q.eq("teamId", match.homeTeamId))
          .first();
      }

      if (stadium && stadium.customImageStorageId) {
        const freshUrl = await ctx.storage.getUrl(stadium.customImageStorageId);
        if (freshUrl) {
          stadium = { ...stadium, imageUrl: freshUrl };
        }
      }

    // Busca todos os eventos associados a essa partida
    const events = await ctx.db
      .query("matchEvents")
      .withIndex("by_match", (q) => q.eq("matchId", match._id))
      .collect();

    // Ordena do primeiro minuto até o último cronologicamente
    events.sort((a, b) => {
      if (a.minute !== b.minute) return a.minute - b.minute;
      return (a.extraMinute ?? 0) - (b.extraMinute ?? 0);
    });

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

// Registra os gols da partida e sincroniza a artilharia da liga
export const registerMatchGoals = mutation({
  args: {
    matchId: v.id("matches"),
    goals: v.array(
      v.object({
        team: v.union(v.literal("home"), v.literal("away")),
        playerName: v.string(),
        minute: v.number(),
        isPenalty: v.optional(v.boolean()),
        isOwnGoal: v.optional(v.boolean()),
      })
    ),
  },
  handler: async (ctx, args) => {
    const match = await ctx.db.get(args.matchId);
    if (!match) throw new Error("Partida não encontrada.");

    // 1. Remove eventos antigos de gol para evitar duplicação
    const existingEvents = await ctx.db
      .query("matchEvents")
      .withIndex("by_match", (q) => q.eq("matchId", args.matchId))
      .collect();

    for (const ev of existingEvents) {
      if (ev.type === "GOAL") {
        await ctx.db.delete(ev._id);
      }
    }

    // 2. Insere os novos gols em matchEvents
    const homeTeam = await ctx.db.get(match.homeTeamId);
    const awayTeam = await ctx.db.get(match.awayTeamId);

    const insertedEventIds = [];
    for (const g of args.goals) {
      const teamId = g.team === "home" ? match.homeTeamId : match.awayTeamId;
      let detail = "Gol Normal";
      if (g.isPenalty) detail = "Pênalti";
      else if (g.isOwnGoal) detail = "Gol Contra";

      const evId = await ctx.db.insert("matchEvents", {
        matchId: args.matchId,
        minute: g.minute,
        teamId,
        playerName: g.playerName.trim(),
        type: "GOAL",
        detail,
      });
      insertedEventIds.push(evId);
    }

    // 3. Atualiza placar da partida
    const homeGoalsCount = args.goals.filter(
      (g) => (g.team === "home" && !g.isOwnGoal) || (g.team === "away" && g.isOwnGoal)
    ).length;
    const awayGoalsCount = args.goals.filter(
      (g) => (g.team === "away" && !g.isOwnGoal) || (g.team === "home" && g.isOwnGoal)
    ).length;

    await ctx.db.patch(match._id, {
      homeScore: homeGoalsCount,
      awayScore: awayGoalsCount,
      status: match.status === "SCHEDULED" ? "FINISHED" : match.status,
    });

    // 4. Sincroniza artilheiros (topScorers) da liga
    const validGoalsByPlayer = new Map<
      string,
      { count: number; penalties: number; teamId?: any; teamName: string; teamCode?: string; teamLogoUrl?: string }
    >();

    for (const g of args.goals) {
      if (g.isOwnGoal) continue;
      const key = g.playerName.trim();
      const isHome = g.team === "home";
      const targetTeam = isHome ? homeTeam : awayTeam;

      const current = validGoalsByPlayer.get(key) || {
        count: 0,
        penalties: 0,
        teamId: targetTeam?._id,
        teamName: targetTeam?.name ?? (isHome ? "Mandante" : "Visitante"),
        teamCode: targetTeam?.code,
        teamLogoUrl: targetTeam?.logoUrl,
      };

      current.count += 1;
      if (g.isPenalty) current.penalties += 1;
      validGoalsByPlayer.set(key, current);
    }

    if (validGoalsByPlayer.size > 0) {
      const existingScorers = await ctx.db
        .query("topScorers")
        .withIndex("by_league", (q) => q.eq("leagueId", match.leagueId))
        .collect();

      const cleanStr = (s: string) =>
        s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();

      for (const [playerName, data] of validGoalsByPlayer.entries()) {
        const cleanPlayer = cleanStr(playerName);
        const existing = existingScorers.find(
          (sc) => cleanStr(sc.playerName) === cleanPlayer
        );

        if (existing) {
          await ctx.db.patch(existing._id, {
            goals: existing.goals + data.count,
            penalties: (existing.penalties ?? 0) + data.penalties,
          });
        } else {
          await ctx.db.insert("topScorers", {
            leagueId: match.leagueId,
            rank: 999,
            playerName,
            teamId: data.teamId,
            teamName: data.teamName,
            teamCode: data.teamCode,
            teamLogoUrl: data.teamLogoUrl,
            goals: data.count,
            penalties: data.penalties,
          });
        }
      }

      // Re-ranqueia a artilharia da liga
      const allScorers = await ctx.db
        .query("topScorers")
        .withIndex("by_league", (q) => q.eq("leagueId", match.leagueId))
        .collect();

      allScorers.sort((a, b) => b.goals - a.goals);

      for (let i = 0; i < allScorers.length; i++) {
        const newRank = i + 1;
        if (allScorers[i].rank !== newRank) {
          await ctx.db.patch(allScorers[i]._id, { rank: newRank });
        }
      }
    }

    return {
      success: true,
      registeredGoals: insertedEventIds.length,
      homeScore: homeGoalsCount,
      awayScore: awayGoalsCount,
    };
  },
});

// Salva estatísticas e lances normalizados a partir do Sofascore
export const saveMatchDetailsFromSofascore = mutation({
  args: {
    matchId: v.id("matches"),
    statistics: v.optional(
      v.object({
        possession: v.object({ home: v.number(), away: v.number() }),
        shotsTotal: v.object({ home: v.number(), away: v.number() }),
        shotsOnTarget: v.object({ home: v.number(), away: v.number() }),
        corners: v.object({ home: v.number(), away: v.number() }),
        fouls: v.object({ home: v.number(), away: v.number() }),
        passes: v.object({ home: v.number(), away: v.number() }),
      })
    ),
    events: v.optional(
      v.array(
        v.object({
          minute: v.number(),
          extraTime: v.optional(v.union(v.number(), v.null())),
          type: v.string(),
          text: v.string(),
          isHome: v.boolean(),
        })
      )
    ),
  },
  handler: async (ctx, args) => {
    const match = await ctx.db.get(args.matchId);
    if (!match) {
      throw new Error(`Partida não encontrada para o id: ${args.matchId}`);
    }

    // 1. Atualiza ou cria o registro em matchStatistics
    let updatedStats = false;
    if (args.statistics) {
      const statsPayload = {
        matchId: args.matchId,
        homePossession: args.statistics.possession.home,
        awayPossession: args.statistics.possession.away,
        homeTotalShots: args.statistics.shotsTotal.home,
        awayTotalShots: args.statistics.shotsTotal.away,
        homeShotsOnTarget: args.statistics.shotsOnTarget.home,
        awayShotsOnTarget: args.statistics.shotsOnTarget.away,
        homeCorners: args.statistics.corners.home,
        awayCorners: args.statistics.corners.away,
        homeFouls: args.statistics.fouls.home,
        awayFouls: args.statistics.fouls.away,
        homePasses: args.statistics.passes.home,
        awayPasses: args.statistics.passes.away,
      };

      const existingStats = await ctx.db
        .query("matchStatistics")
        .withIndex("by_match", (q) => q.eq("matchId", args.matchId))
        .first();

      if (existingStats) {
        await ctx.db.patch(existingStats._id, statsPayload);
      } else {
        await ctx.db.insert("matchStatistics", statsPayload);
      }
      updatedStats = true;
    }

    // 2. Deleta eventos antigos dessa partida em matchEvents e insere os novos lances processados
    let insertedEventsCount = 0;
    if (args.events) {
      const existingEvents = await ctx.db
        .query("matchEvents")
        .withIndex("by_match", (q) => q.eq("matchId", args.matchId))
        .collect();

      for (const ev of existingEvents) {
        await ctx.db.delete(ev._id);
      }

      for (const ev of args.events) {
        const teamId = ev.isHome ? match.homeTeamId : match.awayTeamId;

        let normalizedType: "GOAL" | "YELLOW_CARD" | "RED_CARD" | "SUBSTITUTION" | "VAR" = "VAR";
        if (ev.type === "GOAL_HOME" || ev.type === "GOAL_AWAY" || ev.type === "GOAL") {
          normalizedType = "GOAL";
        } else if (ev.type === "YELLOW_CARD") {
          normalizedType = "YELLOW_CARD";
        } else if (ev.type === "RED_CARD") {
          normalizedType = "RED_CARD";
        } else if (ev.type === "SUBSTITUTION") {
          normalizedType = "SUBSTITUTION";
        }

        await ctx.db.insert("matchEvents", {
          matchId: args.matchId,
          minute: ev.minute,
          extraMinute: ev.extraTime ?? undefined,
          teamId,
          playerName: ev.text || "Jogador",
          type: normalizedType,
          detail: ev.type,
          externalId: `sofascore-${args.matchId}-${ev.minute}-${ev.text}-${ev.type}`,
        });
        insertedEventsCount++;
      }
    }

    return {
      success: true,
      matchId: args.matchId,
      updatedStats,
      insertedEventsCount,
    };
  },
});
