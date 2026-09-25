import { mutation } from "./_generated/server";
import { v } from "convex/values";

export const setScore = mutation({
  args: {
    homeTeamName: v.string(),
    homeScore: v.number(),
    awayScore: v.number(),
    status: v.string(), // "IN_PLAY" ou "FINISHED"
    minute: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    // Acha a seleção mandante
    const team = await ctx.db
      .query("teams")
      .filter((q) => q.eq(q.field("name"), args.homeTeamName))
      .first();

    if (!team) throw new Error(`Time "${args.homeTeamName}" não encontrado`);

    // Acha o jogo correspondente
    const match = await ctx.db
      .query("matches")
      .filter((q) => q.eq(q.field("homeTeamId"), team._id))
      .first();

    if (!match) throw new Error(`Partida com mandante "${args.homeTeamName}" não encontrada`);

    type MatchStatus =
      | "SCHEDULED"
      | "IN_PLAY"
      | "LIVE"
      | "HALFTIME"
      | "PAUSED"
      | "EXTRA_TIME"
      | "PENALTY_SHOOTOUT"
      | "FINISHED"
      | "POSTPONED";

    const validStatus: MatchStatus = [
      "SCHEDULED",
      "IN_PLAY",
      "LIVE",
      "HALFTIME",
      "PAUSED",
      "EXTRA_TIME",
      "PENALTY_SHOOTOUT",
      "FINISHED",
      "POSTPONED",
    ].includes(args.status as MatchStatus)
      ? (args.status as MatchStatus)
      : "IN_PLAY";

    await ctx.db.patch(match._id, {
      homeScore: args.homeScore,
      awayScore: args.awayScore,
      status: validStatus,
      minute: args.minute ?? 15,
      elapsedSecondsUpdatedAt: Date.now(),
    });

    return {
      success: true,
      updated: `${args.homeTeamName} ${args.homeScore} x ${args.awayScore}`,
      status: validStatus,
      minute: args.minute ?? 15,
    };
  },
});

export const resetScores = mutation({
  args: {},
  handler: async (ctx) => {
    const unlMatches = await ctx.db.query("matches").collect();
    let count = 0;
    for (const m of unlMatches) {
      if (m.round === "Rodada 1") {
        await ctx.db.patch(m._id, {
          homeScore: 0,
          awayScore: 0,
          status: "SCHEDULED",
          minute: undefined,
        });
        count++;
      }
    }
    return { success: true, resetCount: count };
  },
});
