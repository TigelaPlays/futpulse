import { mutation } from "./_generated/server";
import { v } from "convex/values";

export const saveSofascoreMatchData = mutation({
  args: {
    matchId: v.id("matches"),
    incidents: v.array(
      v.object({
        minute: v.number(),
        extraMinute: v.optional(v.number()),
        isHome: v.boolean(),
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
        sofascoreId: v.optional(v.number()),
      })
    ),
    statistics: v.optional(
      v.object({
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
      })
    ),
    scores: v.optional(
      v.object({
        homeScore: v.number(),
        awayScore: v.number(),
        homeHalftimeScore: v.optional(v.number()),
        awayHalftimeScore: v.optional(v.number()),
      })
    ),
  },
  handler: async (ctx, args) => {
    const match = await ctx.db.get(args.matchId);
    if (!match) {
      throw new Error(`Partida não encontrada para o id: ${args.matchId}`);
    }

    // 1. Salva ou atualiza os lances/eventos em matchEvents
    let insertedEvents = 0;
    for (const inc of args.incidents) {
      const teamId = inc.isHome ? match.homeTeamId : match.awayTeamId;
      const externalId = inc.sofascoreId
        ? `sofascore-${inc.sofascoreId}`
        : `sofascore-${args.matchId}-${inc.minute}-${inc.playerName}-${inc.type}`;

      const existingEvent = await ctx.db
        .query("matchEvents")
        .withIndex("by_externalId", (q) => q.eq("externalId", externalId))
        .first();

      const eventData = {
        matchId: args.matchId,
        externalId,
        minute: inc.minute,
        extraMinute: inc.extraMinute,
        teamId,
        playerName: inc.playerName,
        assistPlayerName: inc.assistPlayerName,
        type: inc.type,
        detail: inc.detail,
      };

      if (existingEvent) {
        await ctx.db.patch(existingEvent._id, eventData);
      } else {
        await ctx.db.insert("matchEvents", eventData);
        insertedEvents++;
      }
    }

    // 2. Salva estatísticas comparativas em matchStatistics
    let updatedStats = false;
    if (args.statistics) {
      const existingStats = await ctx.db
        .query("matchStatistics")
        .withIndex("by_match", (q) => q.eq("matchId", args.matchId))
        .first();

      const statData = {
        matchId: args.matchId,
        ...args.statistics,
      };

      if (existingStats) {
        await ctx.db.patch(existingStats._id, args.statistics);
      } else {
        await ctx.db.insert("matchStatistics", statData);
      }
      updatedStats = true;
    }

    // 3. Atualiza placares se informados
    if (args.scores) {
      await ctx.db.patch(args.matchId, {
        homeScore: args.scores.homeScore,
        awayScore: args.scores.awayScore,
        homeHalftimeScore: args.scores.homeHalftimeScore ?? match.homeHalftimeScore,
        awayHalftimeScore: args.scores.awayHalftimeScore ?? match.awayHalftimeScore,
        status: match.status === "SCHEDULED" ? "FINISHED" : match.status,
      });
    }

    return {
      success: true,
      matchId: args.matchId,
      totalIncidentsProcessed: args.incidents.length,
      insertedEvents,
      updatedStats,
    };
  },
});

