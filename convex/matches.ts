import { query, internalQuery, mutation } from "./_generated/server";
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

export const getByExternalId = internalQuery({
  args: {
    externalId: v.number(),
    homeTeamName: v.optional(v.string()),
    awayTeamName: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // 1. Busca direta por externalId na partida
    const match = await ctx.db
      .query("matches")
      .withIndex("by_externalId", (q) => q.eq("externalId", args.externalId))
      .first();

    if (match) return match;

    // 2. Fallback: Se não encontrar por externalId, busca pelos nomes dos times/seleções
    if (args.homeTeamName && args.awayTeamName) {
      const homeNorm = args.homeTeamName.trim().toLowerCase();
      const awayNorm = args.awayTeamName.trim().toLowerCase();

      const allTeams = await ctx.db.query("teams").collect();
      const homeTeam = allTeams.find(
        (t) =>
          t.name.trim().toLowerCase() === homeNorm ||
          t.shortName?.trim().toLowerCase() === homeNorm
      );
      const awayTeam = allTeams.find(
        (t) =>
          t.name.trim().toLowerCase() === awayNorm ||
          t.shortName?.trim().toLowerCase() === awayNorm
      );

      if (homeTeam && awayTeam) {
        return await ctx.db
          .query("matches")
          .filter((q) =>
            q.and(
              q.eq(q.field("homeTeamId"), homeTeam._id),
              q.eq(q.field("awayTeamId"), awayTeam._id)
            )
          )
          .first();
      }
    }

    return null;
  },
});

export const saveMatchDetailsFromSofascore = mutation({
  args: {
    matchId: v.id("matches"),
    homeScore: v.optional(v.number()),
    awayScore: v.optional(v.number()),
    status: v.optional(
      v.union(
        v.literal("SCHEDULED"),
        v.literal("IN_PLAY"),
        v.literal("LIVE"),
        v.literal("HALFTIME"),
        v.literal("PAUSED"),
        v.literal("EXTRA_TIME"),
        v.literal("PENALTY_SHOOTOUT"),
        v.literal("FINISHED"),
        v.literal("POSTPONED")
      )
    ),
    statusShort: v.optional(v.string()),
    minute: v.optional(v.number()),
    statistics: v.optional(
      v.union(
        v.null(),
        v.object({
          possession: v.optional(v.object({ home: v.number(), away: v.number() })),
          shotsTotal: v.optional(v.object({ home: v.number(), away: v.number() })),
          shotsOnTarget: v.optional(v.object({ home: v.number(), away: v.number() })),
          corners: v.optional(v.object({ home: v.number(), away: v.number() })),
          fouls: v.optional(v.object({ home: v.number(), away: v.number() })),
          passes: v.optional(v.object({ home: v.number(), away: v.number() })),
          homePossession: v.optional(v.number()),
          awayPossession: v.optional(v.number()),
          homeShotsOnTarget: v.optional(v.number()),
          awayShotsOnTarget: v.optional(v.number()),
          homeTotalShots: v.optional(v.number()),
          awayTotalShots: v.optional(v.number()),
          homeCorners: v.optional(v.number()),
          awayCorners: v.optional(v.number()),
          homeFouls: v.optional(v.number()),
          awayFouls: v.optional(v.number()),
          homePasses: v.optional(v.number()),
          awayPasses: v.optional(v.number()),
          homeYellowCards: v.optional(v.number()),
          awayYellowCards: v.optional(v.number()),
          homeRedCards: v.optional(v.number()),
          awayRedCards: v.optional(v.number()),
        })
      )
    ),
    events: v.optional(
      v.array(
        v.object({
          minute: v.number(),
          extraMinute: v.optional(v.union(v.number(), v.null())),
          extraTime: v.optional(v.union(v.number(), v.null())),
          type: v.string(),
          text: v.optional(v.string()),
          playerName: v.optional(v.string()),
          assistPlayerName: v.optional(v.string()),
          isHome: v.optional(v.boolean()),
          teamId: v.optional(v.id("teams")),
          detail: v.optional(v.string()),
        })
      )
    ),
  },
  handler: async (ctx, args) => {
    const match = await ctx.db.get(args.matchId);
    if (!match) throw new Error(`Partida não encontrada: ${args.matchId}`);

    // 1. Atualiza dados da partida
    const matchPatch: Record<string, any> = {};
    if (args.homeScore !== undefined) matchPatch.homeScore = args.homeScore;
    if (args.awayScore !== undefined) matchPatch.awayScore = args.awayScore;
    if (args.status !== undefined) matchPatch.status = args.status;
    if (args.statusShort !== undefined) matchPatch.statusShort = args.statusShort;
    if (args.minute !== undefined) matchPatch.minute = args.minute;

    if (args.status === "IN_PLAY" || args.status === "LIVE") {
      matchPatch.elapsedSecondsUpdatedAt = Date.now();
    }

    if (Object.keys(matchPatch).length > 0) {
      await ctx.db.patch(match._id, matchPatch);
    }

    // 2. Upsert de estatísticas na tabela matchStatistics
    let updatedStats = false;
    if (args.statistics) {
      const s = args.statistics;
      const statsPayload = {
        matchId: match._id,
        homePossession: s.homePossession ?? s.possession?.home ?? 50,
        awayPossession: s.awayPossession ?? s.possession?.away ?? 50,
        homeShotsOnTarget: s.homeShotsOnTarget ?? s.shotsOnTarget?.home ?? 0,
        awayShotsOnTarget: s.awayShotsOnTarget ?? s.shotsOnTarget?.away ?? 0,
        homeTotalShots: s.homeTotalShots ?? s.shotsTotal?.home ?? 0,
        awayTotalShots: s.awayTotalShots ?? s.shotsTotal?.away ?? 0,
        homeCorners: s.homeCorners ?? s.corners?.home ?? 0,
        awayCorners: s.awayCorners ?? s.corners?.away ?? 0,
        homeFouls: s.homeFouls ?? s.fouls?.home ?? 0,
        awayFouls: s.awayFouls ?? s.fouls?.away ?? 0,
        homePasses: s.homePasses ?? s.passes?.home,
        awayPasses: s.awayPasses ?? s.passes?.away,
        homeYellowCards: s.homeYellowCards,
        awayYellowCards: s.awayYellowCards,
        homeRedCards: s.homeRedCards,
        awayRedCards: s.awayRedCards,
      };

      const existingStats = await ctx.db
        .query("matchStatistics")
        .withIndex("by_match", (q) => q.eq("matchId", match._id))
        .first();

      if (existingStats) {
        await ctx.db.patch(existingStats._id, statsPayload);
      } else {
        await ctx.db.insert("matchStatistics", statsPayload);
      }
      updatedStats = true;
    }

    // 3. Sincronização de eventos na tabela matchEvents (evitando duplicidades)
    let insertedEventsCount = 0;
    if (args.events && args.events.length > 0) {
      const existingEvents = await ctx.db
        .query("matchEvents")
        .withIndex("by_match", (q) => q.eq("matchId", match._id))
        .collect();

      for (const ev of args.events) {
        let normType: "GOAL" | "YELLOW_CARD" | "RED_CARD" | "SUBSTITUTION" | "VAR" = "VAR";
        const rawType = ev.type?.toUpperCase() || "";
        if (rawType.includes("GOAL")) normType = "GOAL";
        else if (rawType.includes("RED") || rawType === "RED_CARD") normType = "RED_CARD";
        else if (rawType.includes("YELLOW") || rawType === "YELLOW_CARD") normType = "YELLOW_CARD";
        else if (rawType.includes("SUB")) normType = "SUBSTITUTION";
        else if (rawType.includes("VAR")) normType = "VAR";

        const playerName = (ev.playerName || ev.text || "Jogador").trim();
        const teamId = ev.teamId ?? (ev.isHome === false ? match.awayTeamId : match.homeTeamId);
        const extraMinute = ev.extraMinute ?? (ev.extraTime ? Number(ev.extraTime) : undefined);

        const isDuplicate = existingEvents.some(
          (ex) =>
            ex.minute === ev.minute &&
            ex.type === normType &&
            ex.teamId === teamId &&
            ex.playerName.toLowerCase() === playerName.toLowerCase()
        );

        if (!isDuplicate) {
          await ctx.db.insert("matchEvents", {
            matchId: match._id,
            minute: ev.minute,
            extraMinute,
            teamId,
            playerName,
            assistPlayerName: ev.assistPlayerName,
            type: normType,
            detail: ev.detail || (normType === "GOAL" && ev.text?.toLowerCase().includes("pen") ? "Pênalti" : undefined),
          });
          insertedEventsCount++;
        }
      }
    }

    return {
      matchId: match._id,
      updatedStats,
      insertedEventsCount,
    };
  },
});
