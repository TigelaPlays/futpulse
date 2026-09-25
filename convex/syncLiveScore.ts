import { action, internalMutation } from "./_generated/server";
import { internal } from "./_generated/api";
import { v } from "convex/values";

declare const process: { env: Record<string, string | undefined> };

/**
 * Mutation interna que faz o patch apenas dos placares e status no banco
 */
export const updateMatchScore = internalMutation({
  args: {
    matchId: v.id("matches"),
    externalId: v.optional(v.number()),
    homeScore: v.number(),
    awayScore: v.number(),
    status: v.union(
      v.literal("SCHEDULED"),
      v.literal("IN_PLAY"),
      v.literal("LIVE"),
      v.literal("HALFTIME"),
      v.literal("PAUSED"),
      v.literal("EXTRA_TIME"),
      v.literal("PENALTY_SHOOTOUT"),
      v.literal("FINISHED"),
      v.literal("POSTPONED")
    ),
    statusShort: v.optional(v.string()),
    minute: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const patchData: Record<string, any> = {
      homeScore: args.homeScore,
      awayScore: args.awayScore,
      status: args.status,
    };

    if (args.externalId !== undefined) {
      patchData.externalId = args.externalId;
    }
    if (args.minute !== undefined) {
      patchData.minute = args.minute;
    }
    if (args.statusShort) {
      patchData.statusShort = args.statusShort;
    }
    if (args.status === "IN_PLAY" || args.status === "LIVE") {
      patchData.elapsedSecondsUpdatedAt = Date.now();
    }

    await ctx.db.patch(args.matchId, patchData);
  },
});

/**
 * Action que consulta a API-Football e atualiza exclusivamente o placar
 */
export const syncLiveScores = action({
  args: {
    leagueExternalId: v.optional(v.number()), // ID da liga na API-Football (ex: 5 para UNL)
    fixtureId: v.optional(v.number()), // Fixture específico opcional
  },
  handler: async (ctx, args) => {
    const apiKey = process.env.API_FOOTBALL_KEY;
    if (!apiKey) {
      throw new Error("Chave API_FOOTBALL_KEY não encontrada nas variáveis de ambiente do Convex.");
    }

    let url: string;
    if (args.fixtureId) {
      url = `https://v3.football.api-sports.io/fixtures?id=${args.fixtureId}`;
    } else {
      const leagueId = args.leagueExternalId ?? 5; // Default: UEFA Nations League (5)
      url = `https://v3.football.api-sports.io/fixtures?league=${leagueId}&season=2026&live=all`;
    }

    const response = await fetch(url, {
      method: "GET",
      headers: {
        "x-apisports-key": apiKey,
      },
    });

    if (!response.ok) {
      throw new Error(`Erro na API-Football: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    const fixtures = data.response || [];

    let updatedCount = 0;

    for (const item of fixtures) {
      const externalMatchId = item.fixture?.id;
      const homeScore = item.goals?.home ?? 0;
      const awayScore = item.goals?.away ?? 0;
      const statusShort = item.fixture?.status?.short; // 1H, 2H, HT, FT, etc.
      const elapsed = item.fixture?.status?.elapsed;

      // Normaliza status para o enum exato do schema do FutPulse
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

      let status: MatchStatus = "SCHEDULED";
      if (["1H", "2H", "LIVE"].includes(statusShort)) {
        status = "IN_PLAY";
      } else if (["HT"].includes(statusShort)) {
        status = "HALFTIME";
      } else if (["ET"].includes(statusShort)) {
        status = "EXTRA_TIME";
      } else if (["BT", "P"].includes(statusShort)) {
        status = "PENALTY_SHOOTOUT";
      } else if (["FT", "AET", "PEN"].includes(statusShort)) {
        status = "FINISHED";
      } else if (["PST", "CANC", "ABD"].includes(statusShort)) {
        status = "POSTPONED";
      } else if (["INT", "SUSP"].includes(statusShort)) {
        status = "PAUSED";
      }

      // Procura a partida pelo externalId ou pelos nomes dos times no banco
      const match = await ctx.runQuery(internal.matches.getByExternalId, {
        externalId: externalMatchId,
        homeTeamName: item.teams?.home?.name,
        awayTeamName: item.teams?.away?.name,
      });

      if (match) {
        let displayStatusShort = statusShort;
        if (status === "FINISHED") {
          displayStatusShort = "FIM";
        } else if (status === "HALFTIME") {
          displayStatusShort = "INT";
        } else if (status === "IN_PLAY" && elapsed) {
          displayStatusShort = `${elapsed}'`;
        }

        await ctx.runMutation(internal.syncLiveScore.updateMatchScore, {
          matchId: match._id,
          externalId: externalMatchId,
          homeScore,
          awayScore,
          status,
          statusShort: displayStatusShort,
          minute: elapsed ?? undefined,
        });
        updatedCount++;
      }
    }

    return {
      success: true,
      updatedCount,
      totalLiveFixtures: fixtures.length,
    };
  },
});
