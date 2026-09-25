import { query } from "./_generated/server";
import { v } from "convex/values";

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
    leagueId: v.optional(v.id("leagues")),
    startTimestamp: v.optional(v.number()),
    endTimestamp: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    let matches = args.leagueId
      ? await ctx.db
          .query("matches")
          .withIndex("by_league", (q) => q.eq("leagueId", args.leagueId!))
          .collect()
      : await ctx.db.query("matches").collect();

    // Filtro de data
    if (args.startTimestamp !== undefined && args.endTimestamp !== undefined) {
      matches = matches.filter(
        (m) => m.startTime >= args.startTimestamp! && m.startTime <= args.endTimestamp!
      );
    }

    // Filtro de status
    if (args.statusFilter && args.statusFilter !== "ALL") {
      matches = matches.filter((m) => {
        if (args.statusFilter === "LIVE") {
          return [
            "IN_PLAY",
            "LIVE",
            "HALFTIME",
            "PAUSED",
            "EXTRA_TIME",
            "PENALTY_SHOOTOUT",
          ].includes(m.status);
        }
        if (args.statusFilter === "FINISHED") return m.status === "FINISHED";
        if (args.statusFilter === "SCHEDULED") return m.status === "SCHEDULED";
        return true;
      });
    }

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

    return hydratedMatches.sort((a, b) => {
      const isLiveA = [
        "IN_PLAY",
        "LIVE",
        "HALFTIME",
        "PAUSED",
        "EXTRA_TIME",
        "PENALTY_SHOOTOUT",
      ].includes(a.status);
      const isLiveB = [
        "IN_PLAY",
        "LIVE",
        "HALFTIME",
        "PAUSED",
        "EXTRA_TIME",
        "PENALTY_SHOOTOUT",
      ].includes(b.status);
      if (isLiveA && !isLiveB) return -1;
      if (!isLiveA && isLiveB) return 1;

      const prioA = a.league?.priority ?? 99;
      const prioB = b.league?.priority ?? 99;
      if (prioA !== prioB) return prioA - prioB;

      return b.startTime - a.startTime;
    });
  },
});

export const listMatchesByRound = query({
  args: {
    leagueId: v.id("leagues"),
    round: v.union(v.number(), v.string()),
    division: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const roundStr = String(args.round);
    const roundNum = roundStr.replace(/\D/g, "");
    const searchRounds = [
      roundStr,
      roundNum ? `Rodada ${roundNum}` : roundStr,
      roundNum,
    ].filter(Boolean);

    const allMatches = await ctx.db
      .query("matches")
      .withIndex("by_league", (q) => q.eq("leagueId", args.leagueId))
      .collect();

    let matches = allMatches.filter((m) =>
      searchRounds.some(
        (sr) => m.round.trim().toLowerCase() === sr.trim().toLowerCase()
      )
    );

    if (args.division) {
      matches = matches.filter(
        (m) =>
          m.division === args.division ||
          m.group?.startsWith(args.division!)
      );
    }

    const hydrated = await Promise.all(
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

        return {
          ...m,
          homeTeam,
          awayTeam,
          stadium,
          events,
        };
      })
    );

    return hydrated.sort((a, b) => {
      const getMinutes = (m: any): number => {
        if (typeof m.statusShort === "string" && m.statusShort.includes(":")) {
          const [h, min] = m.statusShort.split(":").map(Number);
          if (!isNaN(h) && !isNaN(min)) return h * 60 + min;
        }
        const ts = typeof m.startTime === "number" && m.startTime > 0
          ? m.startTime
          : (m as any).matchDate
          ? new Date((m as any).matchDate).getTime()
          : 0;
        if (ts > 0) {
          const d = new Date(ts);
          return d.getUTCHours() * 60 + d.getUTCMinutes();
        }
        return 9999;
      };

      const minA = getMinutes(a);
      const minB = getMinutes(b);
      if (minA !== minB) return minA - minB;

      const timeA = typeof a.startTime === "number" && a.startTime > 0
        ? a.startTime
        : (a as any).matchDate
        ? new Date((a as any).matchDate).getTime()
        : 0;
      const timeB = typeof b.startTime === "number" && b.startTime > 0
        ? b.startTime
        : (b as any).matchDate
        ? new Date((b as any).matchDate).getTime()
        : 0;
      if (timeA !== timeB) return timeA - timeB;

      return (a.group || "").localeCompare(b.group || "");
    });
  },
});

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

    const events = await ctx.db
      .query("matchEvents")
      .withIndex("by_match", (q) => q.eq("matchId", match._id))
      .collect();

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

export const getTopScorers = query({
  args: {
    leagueId: v.optional(v.id("leagues")),
  },
  handler: async (ctx, args) => {
    let leagueId = args.leagueId;

    if (!leagueId) {
      const allLeagues = await ctx.db.query("leagues").collect();
      if (allLeagues.length > 0) leagueId = allLeagues[0]._id;
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
