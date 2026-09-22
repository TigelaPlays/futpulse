import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import type { Doc, Id } from "./_generated/dataModel";

export const listLeagues = query({
  args: {},
  handler: async (ctx) => {
    const leagues = await ctx.db.query("leagues").collect();
    return leagues.sort((a, b) => (a.priority ?? 99) - (b.priority ?? 99));
  },
});

interface TeamStatAccumulator {
  teamId: Id<"teams">;
  played: number;
  win: number;
  draw: number;
  lose: number;
  goalsFor: number;
  goalsAgainst: number;
  goalsDiff: number;
  points: number;
  formMatches: { startTime: number; result: "W" | "D" | "L" }[];
}

function calculateStandingsRaw(
  matches: Doc<"matches">[],
  allTeamIds: Id<"teams">[],
  filter: "all" | "home" | "away"
) {
  const statsMap = new Map<
    string,
    {
      teamId: Id<"teams">;
      played: number;
      win: number;
      draw: number;
      lose: number;
      goalsFor: number;
      goalsAgainst: number;
      goalsDiff: number;
      points: number;
    }
  >();

  for (const tid of allTeamIds) {
    statsMap.set(tid, {
      teamId: tid,
      played: 0,
      win: 0,
      draw: 0,
      lose: 0,
      goalsFor: 0,
      goalsAgainst: 0,
      goalsDiff: 0,
      points: 0,
    });
  }

  for (const match of matches) {
    const homeStats = statsMap.get(match.homeTeamId);
    const awayStats = statsMap.get(match.awayTeamId);

    const homeWon = match.homeScore > match.awayScore;
    const draw = match.homeScore === match.awayScore;
    const awayWon = match.awayScore > match.homeScore;

    if (homeStats && (filter === "all" || filter === "home")) {
      homeStats.played += 1;
      homeStats.goalsFor += match.homeScore;
      homeStats.goalsAgainst += match.awayScore;
      if (homeWon) {
        homeStats.win += 1;
        homeStats.points += 3;
      } else if (draw) {
        homeStats.draw += 1;
        homeStats.points += 1;
      } else {
        homeStats.lose += 1;
      }
    }

    if (awayStats && (filter === "all" || filter === "away")) {
      awayStats.played += 1;
      awayStats.goalsFor += match.awayScore;
      awayStats.goalsAgainst += match.homeScore;
      if (awayWon) {
        awayStats.win += 1;
        awayStats.points += 3;
      } else if (draw) {
        awayStats.draw += 1;
        awayStats.points += 1;
      } else {
        awayStats.lose += 1;
      }
    }
  }

  return Array.from(statsMap.values()).map((s) => ({
    ...s,
    goalsDiff: s.goalsFor - s.goalsAgainst,
  }));
}

export function computeStandingsData(
  finishedMatches: Doc<"matches">[],
  allTeamIds: Id<"teams">[],
  teamDocMap: Map<string, Doc<"teams">>,
  filter: "all" | "home" | "away" = "all",
  leagueName = ""
) {
  const statsMap = new Map<string, TeamStatAccumulator>();

  for (const tid of allTeamIds) {
    statsMap.set(tid, {
      teamId: tid,
      played: 0,
      win: 0,
      draw: 0,
      lose: 0,
      goalsFor: 0,
      goalsAgainst: 0,
      goalsDiff: 0,
      points: 0,
      formMatches: [],
    });
  }

  // Ordena partidas cronologicamente
  const sortedMatches = [...finishedMatches].sort((a, b) => a.startTime - b.startTime);

  for (const match of sortedMatches) {
    const homeStats = statsMap.get(match.homeTeamId);
    const awayStats = statsMap.get(match.awayTeamId);

    const homeWon = match.homeScore > match.awayScore;
    const draw = match.homeScore === match.awayScore;
    const awayWon = match.awayScore > match.homeScore;

    // Se filtro for 'all' ou 'home', computa para o mandante
    if (homeStats && (filter === "all" || filter === "home")) {
      homeStats.played += 1;
      homeStats.goalsFor += match.homeScore;
      homeStats.goalsAgainst += match.awayScore;
      if (homeWon) {
        homeStats.win += 1;
        homeStats.points += 3;
        homeStats.formMatches.push({ startTime: match.startTime, result: "W" });
      } else if (draw) {
        homeStats.draw += 1;
        homeStats.points += 1;
        homeStats.formMatches.push({ startTime: match.startTime, result: "D" });
      } else {
        homeStats.lose += 1;
        homeStats.formMatches.push({ startTime: match.startTime, result: "L" });
      }
    }

    // Se filtro for 'all' ou 'away', computa para o visitante
    if (awayStats && (filter === "all" || filter === "away")) {
      awayStats.played += 1;
      awayStats.goalsFor += match.awayScore;
      awayStats.goalsAgainst += match.homeScore;
      if (awayWon) {
        awayStats.win += 1;
        awayStats.points += 3;
        awayStats.formMatches.push({ startTime: match.startTime, result: "W" });
      } else if (draw) {
        awayStats.draw += 1;
        awayStats.points += 1;
        awayStats.formMatches.push({ startTime: match.startTime, result: "D" });
      } else {
        awayStats.lose += 1;
        awayStats.formMatches.push({ startTime: match.startTime, result: "L" });
      }
    }
  }

  const list = Array.from(statsMap.values()).map((s) => ({
    teamId: s.teamId,
    played: s.played,
    win: s.win,
    draw: s.draw,
    lose: s.lose,
    goalsFor: s.goalsFor,
    goalsAgainst: s.goalsAgainst,
    goalsDiff: s.goalsFor - s.goalsAgainst,
    points: s.points,
    form: s.formMatches.slice(-5).map((f) => f.result).join(""),
  }));

  // Ordenação oficial da CBF / Sofascore
  list.sort((a, b) => {
    // 1. Maior número de pontos
    if (b.points !== a.points) return b.points - a.points;
    // 2. Maior número de vitórias
    if (b.win !== a.win) return b.win - a.win;
    // 3. Maior saldo de gols
    if (b.goalsDiff !== a.goalsDiff) return b.goalsDiff - a.goalsDiff;
    // 4. Maior número de gols pró
    if (b.goalsFor !== a.goalsFor) return b.goalsFor - a.goalsFor;
    // 5. Nome do clube (ordem alfabética)
    const nameA = teamDocMap.get(a.teamId)?.name ?? "";
    const nameB = teamDocMap.get(b.teamId)?.name ?? "";
    return nameA.localeCompare(nameB, "pt-BR");
  });

  // Cálculo da rodada anterior para ranking movement (▲, ▼, —)
  const prevRankMap = new Map<string, number>();

  if (filter === "all") {
    const roundNumbers = Array.from(
      new Set(
        finishedMatches
          .map((m) => {
            const num = m.round.replace(/\D/g, "");
            return num ? parseInt(num, 10) : 0;
          })
          .filter((n) => n > 0)
      )
    ).sort((a, b) => a - b);

    const maxRound = roundNumbers.length > 0 ? roundNumbers[roundNumbers.length - 1] : 1;

    if (maxRound > 1) {
      const prevMatches = finishedMatches.filter((m) => {
        const num = m.round.replace(/\D/g, "");
        return num ? parseInt(num, 10) < maxRound : false;
      });

      const prevList = calculateStandingsRaw(prevMatches, allTeamIds, "all");
      prevList.sort((a, b) => {
        if (b.points !== a.points) return b.points - a.points;
        if (b.win !== a.win) return b.win - a.win;
        if (b.goalsDiff !== a.goalsDiff) return b.goalsDiff - a.goalsDiff;
        if (b.goalsFor !== a.goalsFor) return b.goalsFor - a.goalsFor;
        const nameA = teamDocMap.get(a.teamId)?.name ?? "";
        const nameB = teamDocMap.get(b.teamId)?.name ?? "";
        return nameA.localeCompare(nameB, "pt-BR");
      });
      prevList.forEach((item, idx) => {
        prevRankMap.set(item.teamId, idx + 1);
      });
    }
  }

  const isSerieB =
    leagueName.toLowerCase().includes("série b") ||
    leagueName.toLowerCase().includes("serie b");

  const totalTeams = list.length;

  return list.map((item, index) => {
    const rank = index + 1;
    let description: string | undefined = undefined;

    if (isSerieB) {
      if (rank <= 2) description = "Promoção";
      else if (rank <= 6) description = "Play-off para Promoção";
      else if (rank > totalTeams - 4) description = "Rebaixamento";
    } else {
      if (rank <= 4) description = "Fase de Grupos (Libertadores)";
      else if (rank <= 6) description = "Qualificação (Libertadores)";
      else if (rank <= 12) description = "Copa Sul-Americana";
      else if (rank > totalTeams - 4) description = "Rebaixamento";
    }

    return {
      _id: `dynamic-${item.teamId}-${filter}`,
      rank,
      previousRank:
        prevRankMap.get(item.teamId) ??
        (filter === "all" && prevRankMap.size === 0 ? rank : undefined),
      teamId: item.teamId,
      team: teamDocMap.get(item.teamId) ?? null,
      played: item.played,
      win: item.win,
      draw: item.draw,
      lose: item.lose,
      goalsFor: item.goalsFor,
      goalsAgainst: item.goalsAgainst,
      goalsDiff: item.goalsDiff,
      points: item.points,
      form: item.form,
      description,
    };
  });
}

export const getStandings = query({
  args: {
    leagueId: v.id("leagues"),
    filter: v.optional(
      v.union(v.literal("all"), v.literal("home"), v.literal("away"))
    ),
  },
  handler: async (ctx, args) => {
    const filter = args.filter ?? "all";
    const league = await ctx.db.get(args.leagueId);

    // 1. Busca todas as partidas da liga
    const allMatches = await ctx.db
      .query("matches")
      .withIndex("by_league", (q) => q.eq("leagueId", args.leagueId))
      .collect();

    const finishedMatches = allMatches.filter((m) => m.status === "FINISHED");

    // 2. Coleta todos os times participantes
    const teamIdSet = new Set<Id<"teams">>();
    for (const m of allMatches) {
      teamIdSet.add(m.homeTeamId);
      teamIdSet.add(m.awayTeamId);
    }

    const storedStandings = await ctx.db
      .query("standings")
      .withIndex("by_league_rank", (q) => q.eq("leagueId", args.leagueId))
      .collect();

    for (const s of storedStandings) {
      teamIdSet.add(s.teamId);
    }

    // Se houver partidas finalizadas, computa dinamicamente!
    if (finishedMatches.length > 0 && teamIdSet.size > 0) {
      const teamDocMap = new Map<string, Doc<"teams">>();
      await Promise.all(
        Array.from(teamIdSet).map(async (tid) => {
          const team = await ctx.db.get(tid);
          if (team) teamDocMap.set(tid, team);
        })
      );

      return computeStandingsData(
        finishedMatches,
        Array.from(teamIdSet),
        teamDocMap,
        filter,
        league?.name ?? ""
      );
    }

    // Fallback: se não houver partidas cadastradas, retorna a tabela armazenada
    return await Promise.all(
      storedStandings.map(async (row) => {
        const team = await ctx.db.get(row.teamId);
        return {
          ...row,
          team,
        };
      })
    );
  },
});

export const recalculateAndSaveStandings = mutation({
  args: {
    leagueId: v.id("leagues"),
  },
  handler: async (ctx, args) => {
    const league = await ctx.db.get(args.leagueId);
    if (!league) return { success: false, reason: "LEAGUE_NOT_FOUND" };

    const allMatches = await ctx.db
      .query("matches")
      .withIndex("by_league", (q) => q.eq("leagueId", args.leagueId))
      .collect();

    const finishedMatches = allMatches.filter((m) => m.status === "FINISHED");
    if (finishedMatches.length === 0) {
      return { success: false, reason: "NO_FINISHED_MATCHES" };
    }

    const teamIdSet = new Set<Id<"teams">>();
    for (const m of allMatches) {
      teamIdSet.add(m.homeTeamId);
      teamIdSet.add(m.awayTeamId);
    }

    const teamDocMap = new Map<string, Doc<"teams">>();
    await Promise.all(
      Array.from(teamIdSet).map(async (tid) => {
        const team = await ctx.db.get(tid);
        if (team) teamDocMap.set(tid, team);
      })
    );

    const standingsList = computeStandingsData(
      finishedMatches,
      Array.from(teamIdSet),
      teamDocMap,
      "all",
      league.name
    );

    // Limpa a tabela standings antiga desta liga
    const existing = await ctx.db
      .query("standings")
      .withIndex("by_league_rank", (q) => q.eq("leagueId", args.leagueId))
      .collect();

    for (const row of existing) {
      await ctx.db.delete(row._id);
    }

    // Insere as linhas recalculadas
    for (const row of standingsList) {
      await ctx.db.insert("standings", {
        leagueId: args.leagueId,
        season: league.season,
        rank: row.rank,
        previousRank: row.previousRank,
        teamId: row.teamId,
        points: row.points,
        goalsDiff: row.goalsDiff,
        form: row.form,
        played: row.played,
        win: row.win,
        draw: row.draw,
        lose: row.lose,
        goalsFor: row.goalsFor,
        goalsAgainst: row.goalsAgainst,
        description: row.description,
      });
    }

    return { success: true, count: standingsList.length };
  },
});

// Retorna a classificação calculada dinamicamente a partir das partidas até a rodada indicada
export const getStandingsByRound = query({
  args: {
    leagueId: v.id("leagues"),
    upToRound: v.number(),
    filter: v.optional(
      v.union(v.literal("all"), v.literal("home"), v.literal("away"))
    ),
  },
  handler: async (ctx, args) => {
    const filter = args.filter ?? "all";
    const league = await ctx.db.get(args.leagueId);

    // Busca todas as partidas da liga
    const allMatches = await ctx.db
      .query("matches")
      .withIndex("by_league", (q) => q.eq("leagueId", args.leagueId))
      .collect();

    // Filtra apenas partidas finalizadas até a rodada selecionada
    const finishedMatches = allMatches.filter((m) => {
      if (m.status !== "FINISHED") return false;
      const num = parseInt(m.round.replace(/\D/g, ""), 10);
      if (isNaN(num)) return false;
      return num <= args.upToRound;
    });

    if (finishedMatches.length === 0) return [];

    // Coleta todos os times que participaram até esta rodada
    const teamIdSet = new Set<Id<"teams">>();
    for (const m of finishedMatches) {
      teamIdSet.add(m.homeTeamId);
      teamIdSet.add(m.awayTeamId);
    }

    const teamDocMap = new Map<string, Doc<"teams">>();
    await Promise.all(
      Array.from(teamIdSet).map(async (tid) => {
        const team = await ctx.db.get(tid);
        if (team) teamDocMap.set(tid, team);
      })
    );

    return computeStandingsData(
      finishedMatches,
      Array.from(teamIdSet),
      teamDocMap,
      filter,
      league?.name ?? ""
    );
  },
});
