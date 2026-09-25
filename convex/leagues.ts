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

  const sortedMatches = [...finishedMatches].sort((a, b) => a.startTime - b.startTime);

  for (const match of sortedMatches) {
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

  list.sort((a, b) => {
    if (b.points !== a.points) return b.points - a.points;
    if (b.win !== a.win) return b.win - a.win;
    if (b.goalsDiff !== a.goalsDiff) return b.goalsDiff - a.goalsDiff;
    if (b.goalsFor !== a.goalsFor) return b.goalsFor - a.goalsFor;
    const nameA = teamDocMap.get(a.teamId)?.name ?? "";
    const nameB = teamDocMap.get(b.teamId)?.name ?? "";
    return nameA.localeCompare(nameB, "pt-BR");
  });

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

    const allMatches = await ctx.db
      .query("matches")
      .withIndex("by_league", (q) => q.eq("leagueId", args.leagueId))
      .collect();

    const finishedMatches = allMatches.filter((m) => m.status === "FINISHED");

    const teamIdSet = new Set<Id<"teams">>();
    for (const m of allMatches) {
      teamIdSet.add(m.homeTeamId);
      teamIdSet.add(m.awayTeamId);
    }

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

    return [];
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

    return { success: true, count: standingsList.length };
  },
});

export const getStandingsByRound = query({
  args: {
    leagueId: v.id("leagues"),
    upToRound: v.optional(v.number()),
    filter: v.optional(
      v.union(v.literal("all"), v.literal("home"), v.literal("away"))
    ),
  },
  handler: async (ctx, args) => {
    const filter = args.filter ?? "all";
    const league = await ctx.db.get(args.leagueId);

    const allMatches = await ctx.db
      .query("matches")
      .withIndex("by_league", (q) => q.eq("leagueId", args.leagueId))
      .collect();

    const finishedMatches = allMatches.filter((m) => {
      if (m.status !== "FINISHED") return false;
      if (args.upToRound === undefined) return true;
      const num = parseInt(m.round.replace(/\D/g, ""), 10);
      if (isNaN(num)) return true;
      return num <= args.upToRound;
    });

    if (finishedMatches.length === 0) return [];

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

export const getLatestFinishedRound = query({
  args: {
    leagueId: v.id("leagues"),
  },
  handler: async (ctx, args) => {
    const matches = await ctx.db
      .query("matches")
      .withIndex("by_league", (q) => q.eq("leagueId", args.leagueId))
      .collect();

    const rodadaMatches = matches.filter(
      (m) => m.status === "FINISHED" && m.round.toLowerCase().startsWith("rodada")
    );

    const candidates =
      rodadaMatches.length > 0
        ? rodadaMatches
        : matches.filter((m) => m.status === "FINISHED");

    if (candidates.length === 0) return 1;

    let maxRound = 1;
    for (const m of candidates) {
      const num = parseInt(m.round.replace(/\D/g, ""), 10);
      if (!isNaN(num) && num > maxRound) {
        maxRound = num;
      }
    }

    return maxRound;
  },
});

export const deleteChampionsLeague = mutation({
  args: {},
  handler: async (ctx) => {
    const leagues = await ctx.db.query("leagues").collect();
    const uclLeagues = leagues.filter((l) =>
      l.name.toLowerCase().includes("champions league")
    );

    let deletedMatchesCount = 0;
    let deletedEventsCount = 0;
    let deletedStatsCount = 0;
    let deletedStandingsCount = 0;
    let deletedTopScorersCount = 0;
    let deletedLeaguesCount = 0;

    for (const ucl of uclLeagues) {
      const matches = await ctx.db
        .query("matches")
        .withIndex("by_league", (q) => q.eq("leagueId", ucl._id))
        .collect();

      for (const m of matches) {
        const events = await ctx.db
          .query("matchEvents")
          .withIndex("by_match", (q) => q.eq("matchId", m._id))
          .collect();
        for (const ev of events) {
          await ctx.db.delete(ev._id);
          deletedEventsCount++;
        }

        const stats = await ctx.db
          .query("matchStatistics")
          .withIndex("by_match", (q) => q.eq("matchId", m._id))
          .collect();
        for (const st of stats) {
          await ctx.db.delete(st._id);
          deletedStatsCount++;
        }

        await ctx.db.delete(m._id);
        deletedMatchesCount++;
      }

      const standings = await ctx.db
        .query("standings")
        .withIndex("by_league", (q) => q.eq("leagueId", ucl._id))
        .collect();
      for (const st of standings) {
        await ctx.db.delete(st._id);
        deletedStandingsCount++;
      }

      const scorers = await ctx.db
        .query("topScorers")
        .withIndex("by_league", (q) => q.eq("leagueId", ucl._id))
        .collect();
      for (const sc of scorers) {
        await ctx.db.delete(sc._id);
        deletedTopScorersCount++;
      }

      await ctx.db.delete(ucl._id);
      deletedLeaguesCount++;
    }

    return {
      deletedLeaguesCount,
      deletedMatchesCount,
      deletedEventsCount,
      deletedStatsCount,
      deletedStandingsCount,
      deletedTopScorersCount,
    };
  },
});

