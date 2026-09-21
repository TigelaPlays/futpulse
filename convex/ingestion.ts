import { action, internalMutation, type ActionCtx } from "./_generated/server";
import { api, internal } from "./_generated/api";
import { v } from "convex/values";

// IDs das ligas monitoradas (incluindo Série B - 72)
const TRACKED_LEAGUE_IDS = [71, 72, 2, 39, 13, 73, 140, 135, 78, 11, 45];

// Helper compartilhado para sincronização de jogos ao vivo
export async function performLiveSync(ctx: ActionCtx) {
  const apiKey = (globalThis as typeof globalThis & { process?: { env?: Record<string, string | undefined> } }).process?.env?.API_FOOTBALL_KEY;
  if (!apiKey) {
    console.warn("API_FOOTBALL_KEY não configurada no ambiente do Convex.");
    return { success: false, reason: "API_FOOTBALL_KEY_MISSING" };
  }

  try {
    // 1 única chamada busca TODOS os jogos ao vivo no mundo
    const response = await fetch("https://v3.football.api-sports.io/fixtures?live=all", {
      headers: {
        "x-apisports-key": apiKey,
      },
    });

    if (!response.ok) {
      throw new Error(`Erro na API externa: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    const fixtures = data.response || [];

    // Filtra apenas os jogos das nossas ligas
    const relevantFixtures = fixtures.filter((item: any) =>
      TRACKED_LEAGUE_IDS.includes(item.league?.id)
    );

    console.log(
      `Jogos ao vivo no mundo: ${fixtures.length} | Jogos nas nossas ligas: ${relevantFixtures.length}`
    );

    // Dispara a mutação interna para persistir no banco
    await ctx.runMutation(internal.ingestion.saveSyncedFixtures, {
      fixtures: relevantFixtures,
    });

    return {
      success: true,
      totalLiveWorld: fixtures.length,
      syncedCount: relevantFixtures.length,
    };
  } catch (error: any) {
    console.error("Falha ao sincronizar partidas ao vivo:", error);
    return { success: false, error: error.message };
  }
}

// 1. Action: busca dados externos via HTTP Fetch
export const syncLiveMatches = action({
  args: {},
  handler: async (ctx) => {
    return await performLiveSync(ctx);
  },
});

// 2. Mutation Interna: Normaliza e persiste os dados com idempotência
export const saveSyncedFixtures = internalMutation({
  args: {
    fixtures: v.any(),
  },
  handler: async (ctx, args) => {
    for (const item of args.fixtures) {
      const { fixture, league, teams, goals } = item;

      // 1. Garante a existência da Liga no banco
      let dbLeague = await ctx.db
        .query("leagues")
        .withIndex("by_externalId", (q) => q.eq("externalId", league.id))
        .first();

      if (!dbLeague) {
        const isCup = [2, 13, 73, 11, 45].includes(league.id);
        const leagueId = await ctx.db.insert("leagues", {
          name: league.name,
          country: league.country ?? "Internacional",
          logoUrl: league.logo ?? "",
          season: league.season ?? 2026,
          type: isCup ? "cup" : "league",
          externalId: league.id,
          priority: 50,
        });
        dbLeague = await ctx.db.get(leagueId);
      }

      if (!dbLeague) continue;

      // 2. Garante a existência do Mandante
      let dbHomeTeam = await ctx.db
        .query("teams")
        .withIndex("by_externalId", (q) => q.eq("externalId", teams.home.id))
        .first();

      if (!dbHomeTeam) {
        const teamId = await ctx.db.insert("teams", {
          name: teams.home.name,
          code: teams.home.code ?? undefined,
          logoUrl: teams.home.logo ?? "",
          externalId: teams.home.id,
        });
        dbHomeTeam = await ctx.db.get(teamId);
      }

      // 3. Garante a existência do Visitante
      let dbAwayTeam = await ctx.db
        .query("teams")
        .withIndex("by_externalId", (q) => q.eq("externalId", teams.away.id))
        .first();

      if (!dbAwayTeam) {
        const teamId = await ctx.db.insert("teams", {
          name: teams.away.name,
          code: teams.away.code ?? undefined,
          logoUrl: teams.away.logo ?? "",
          externalId: teams.away.id,
        });
        dbAwayTeam = await ctx.db.get(teamId);
      }

      if (!dbHomeTeam || !dbAwayTeam) continue;

      // 4. Mapeamento de status da API-Football para o schema do FutPulse
      const shortStatus = fixture.status?.short ?? "1H";
      let normalizedStatus:
        | "SCHEDULED"
        | "IN_PLAY"
        | "PAUSED"
        | "EXTRA_TIME"
        | "PENALTY_SHOOTOUT"
        | "FINISHED"
        | "POSTPONED" = "IN_PLAY";

      if (["1H", "2H"].includes(shortStatus)) normalizedStatus = "IN_PLAY";
      else if (shortStatus === "HT") normalizedStatus = "PAUSED";
      else if (shortStatus === "ET") normalizedStatus = "EXTRA_TIME";
      else if (shortStatus === "PEN") normalizedStatus = "PENALTY_SHOOTOUT";
      else if (["FT", "AET", "PEN_FT"].includes(shortStatus)) normalizedStatus = "FINISHED";
      else if (["PST", "CANC", "ABD"].includes(shortStatus)) normalizedStatus = "POSTPONED";
      else if (["NS", "TBD"].includes(shortStatus)) normalizedStatus = "SCHEDULED";

      // 5. Atualiza ou insere a partida
      const existingMatch = await ctx.db
        .query("matches")
        .withIndex("by_externalId", (q) => q.eq("externalId", fixture.id))
        .first();

      const matchPayload = {
        externalId: fixture.id,
        leagueId: dbLeague._id,
        round: league.round ?? "Rodada Regular",
        homeTeamId: dbHomeTeam._id,
        awayTeamId: dbAwayTeam._id,
        status: normalizedStatus,
        statusShort: shortStatus,
        minute: fixture.status?.elapsed ?? undefined,
        homeScore: goals.home ?? 0,
        awayScore: goals.away ?? 0,
        startTime: fixture.timestamp ? fixture.timestamp * 1000 : Date.now(),
      };

      if (existingMatch) {
        await ctx.db.patch(existingMatch._id, matchPayload);
      } else {
        await ctx.db.insert("matches", matchPayload);
      }
    }
  },
});

// Sincroniza todas as partidas do dia atual (encerradas, ao vivo e agendadas)
export const syncDailyFixtures = action({
  args: {
    date: v.optional(v.string()), // Formato YYYY-MM-DD (opcional, padrão: hoje)
  },
  handler: async (ctx, args) => {
    const apiKey = (globalThis as typeof globalThis & { process?: { env?: Record<string, string | undefined> } }).process?.env?.API_FOOTBALL_KEY;

    if (!apiKey) {
      console.warn("API_FOOTBALL_KEY não configurada no ambiente do Convex.");
      return { success: false, reason: "API_FOOTBALL_KEY_MISSING" };
    }

    // Define a data no formato YYYY-MM-DD
    const targetDate = args.date ?? new Date().toISOString().split("T")[0];

    try {
      // 1 única chamada busca toda a grade global do dia selecionado
      const response = await fetch(`https://v3.football.api-sports.io/fixtures?date=${targetDate}`, {
        headers: {
          "x-apisports-key": apiKey,
        },
      });

      if (!response.ok) {
        throw new Error(`Erro na API externa: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      const fixtures = data.response || [];

      // Filtra apenas as nossas 10 competições
      const relevantFixtures = fixtures.filter((item: any) =>
        TRACKED_LEAGUE_IDS.includes(item.league?.id)
      );

      console.log(
        `[Grade Diária] Total no mundo em ${targetDate}: ${fixtures.length} | Nas nossas ligas: ${relevantFixtures.length}`
      );

      // Persiste no banco com idempotência
      await ctx.runMutation(internal.ingestion.saveSyncedFixtures, {
        fixtures: relevantFixtures,
      });

      return {
        success: true,
        date: targetDate,
        totalWorld: fixtures.length,
        syncedCount: relevantFixtures.length,
      };
    } catch (error: any) {
      console.error("Falha ao sincronizar grade diária:", error);
      return { success: false, error: error.message };
    }
  },
});

// Sincroniza eventos (golos, cartões, substituições) para um jogo específico sob demanda
export const syncMatchEvents = action({
  args: {
    matchId: v.id("matches"),
  },
  handler: async (ctx, args) => {
    const apiKey = (globalThis as typeof globalThis & { process?: { env?: Record<string, string | undefined> } }).process?.env?.API_FOOTBALL_KEY;

    if (!apiKey) {
      return { success: false, reason: "API_FOOTBALL_KEY_MISSING" };
    }

    const match = await ctx.runQuery(api.matches.getMatchDetails, { matchId: args.matchId });
    if (!match || !match.externalId) {
      return { success: false, reason: "MATCH_NOT_FOUND_OR_NO_EXTERNAL_ID" };
    }

    try {
      const response = await fetch(
        `https://v3.football.api-sports.io/fixtures/events?fixture=${match.externalId}`,
        {
          headers: {
            "x-apisports-key": apiKey,
          },
        }
      );

      if (!response.ok) {
        throw new Error(`Erro na API externa: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      const rawEvents = data.response || [];

      await ctx.runMutation(internal.ingestion.saveSyncedEvents, {
        matchId: args.matchId,
        events: rawEvents,
      });

      return {
        success: true,
        eventCount: rawEvents.length,
      };
    } catch (error: any) {
      console.error("Falha ao sincronizar eventos:", error);
      return { success: false, error: error.message };
    }
  },
});

// Mutação interna para gravar os lances sem duplicação
export const saveSyncedEvents = internalMutation({
  args: {
    matchId: v.id("matches"),
    events: v.any(),
  },
  handler: async (ctx, args) => {
    const match = await ctx.db.get(args.matchId);
    if (!match) return;

    for (const item of args.events) {
      const eventTeamExternalId = item.team?.id;

      let matchedTeamId = match.homeTeamId;
      const homeTeam = await ctx.db.get(match.homeTeamId);
      if (homeTeam && homeTeam.externalId !== eventTeamExternalId) {
        matchedTeamId = match.awayTeamId;
      }

      let eventType: "GOAL" | "YELLOW_CARD" | "RED_CARD" | "SUBSTITUTION" | "VAR" = "GOAL";
      const apiType = item.type?.toLowerCase();
      const apiDetail = item.detail?.toLowerCase() || "";

      if (apiType === "goal") {
        eventType = "GOAL";
      } else if (apiType === "card") {
        eventType = apiDetail.includes("red") ? "RED_CARD" : "YELLOW_CARD";
      } else if (apiType === "subst") {
        eventType = "SUBSTITUTION";
      } else if (apiType === "var") {
        eventType = "VAR";
      }

      const playerName = item.player?.name ?? "Jogador";
      const eventKey = `${args.matchId}-${item.time?.elapsed ?? 0}-${playerName}-${eventType}`;

      const existing = await ctx.db
        .query("matchEvents")
        .withIndex("by_externalId", (q) => q.eq("externalId", eventKey))
        .first();

      const eventData = {
        matchId: args.matchId,
        externalId: eventKey,
        minute: item.time?.elapsed ?? 0,
        extraMinute: item.time?.extra ?? undefined,
        teamId: matchedTeamId,
        playerName,
        assistPlayerName: item.assist?.name ?? undefined,
        type: eventType,
        detail: item.detail ?? undefined,
      };

      if (existing) {
        await ctx.db.patch(existing._id, eventData);
      } else {
        await ctx.db.insert("matchEvents", eventData);
      }
    }
  },
});

// Sincroniza estatísticas da partida sob demanda
export const syncMatchStatistics = action({
  args: {
    matchId: v.id("matches"),
  },
  handler: async (ctx, args) => {
    const apiKey = (globalThis as typeof globalThis & { process?: { env?: Record<string, string | undefined> } }).process?.env?.API_FOOTBALL_KEY;

    if (!apiKey) {
      return { success: false, reason: "API_FOOTBALL_KEY_MISSING" };
    }

    const match = await ctx.runQuery(api.matches.getMatchDetails, { matchId: args.matchId });
    if (!match || !match.externalId) {
      return { success: false, reason: "MATCH_NOT_FOUND_OR_NO_EXTERNAL_ID" };
    }

    try {
      const response = await fetch(
        `https://v3.football.api-sports.io/fixtures/statistics?fixture=${match.externalId}`,
        {
          headers: {
            "x-apisports-key": apiKey,
          },
        }
      );

      if (!response.ok) {
        throw new Error(`Erro na API externa: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      const rawStats = data.response || [];

      if (rawStats.length < 2) {
        return { success: false, reason: "INSUFFICIENT_DATA" };
      }

      const homeApiId = match.homeTeam?.externalId;
      const homeRaw = rawStats.find((s: any) => s.team?.id === homeApiId) || rawStats[0];
      const awayRaw = rawStats.find((s: any) => s.team?.id !== homeApiId) || rawStats[1];

      const getStat = (teamStats: any, type: string) => {
        const item = teamStats.statistics?.find((s: any) => s.type?.toLowerCase() === type.toLowerCase());
        if (!item || item.value === null || item.value === undefined) return 0;
        if (typeof item.value === "string") {
          return parseInt(item.value.replace("%", ""), 10) || 0;
        }
        return item.value;
      };

      await ctx.runMutation(internal.ingestion.saveSyncedStatistics, {
        matchId: args.matchId,
        homePossession: getStat(homeRaw, "Ball Possession"),
        awayPossession: getStat(awayRaw, "Ball Possession"),
        homeShotsOnTarget: getStat(homeRaw, "Shots on Goal"),
        awayShotsOnTarget: getStat(awayRaw, "Shots on Goal"),
        homeTotalShots: getStat(homeRaw, "Total Shots"),
        awayTotalShots: getStat(awayRaw, "Total Shots"),
        homeCorners: getStat(homeRaw, "Corner Kicks"),
        awayCorners: getStat(awayRaw, "Corner Kicks"),
        homeFouls: getStat(homeRaw, "Fouls"),
        awayFouls: getStat(awayRaw, "Fouls"),
      });

      return { success: true };
    } catch (error: any) {
      console.error("Falha ao sincronizar estatísticas:", error);
      return { success: false, error: error.message };
    }
  },
});

export const saveSyncedStatistics = internalMutation({
  args: {
    matchId: v.id("matches"),
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
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("matchStatistics")
      .withIndex("by_match", (q) => q.eq("matchId", args.matchId))
      .first();

    const { matchId, ...stats } = args;

    if (existing) {
      await ctx.db.patch(existing._id, stats);
    } else {
      await ctx.db.insert("matchStatistics", { matchId, ...stats });
    }
  },
});

// Polling inteligente que só consome a API se houver partidas ao vivo dentro do horário de jogos
export const smartLivePolling = action({
  args: {},
  handler: async (ctx) => {
    // Horário de Brasília (UTC-3)
    const now = new Date();
    const utcHours = now.getUTCHours();
    const brHours = (utcHours - 3 + 24) % 24;

    // Se estiver fora da janela de jogos (entre 00:00 e 08:59 BRT), aborta
    if (brHours < 9) {
      console.log(`[Smart Polling] Madrugada (${brHours}h BRT). Polling desativado.`);
      return { skipped: true, reason: "OFF_HOURS" };
    }

    // Checa se tem jogos com status ao vivo no banco local
    const activeMatches: any[] = (await ctx.runQuery(api.matches.listMatches, {
      statusFilter: "LIVE",
    })) ?? [];

    if (!activeMatches || activeMatches.length === 0) {
      console.log("[Smart Polling] Nenhum jogo ao vivo ativo no momento.");
      return { skipped: true, reason: "NO_ACTIVE_MATCHES" };
    }

    console.log(`[Smart Polling] ${activeMatches.length} jogos ao vivo detectados (${brHours}h BRT). Sincronizando...`);
    const syncResult = await performLiveSync(ctx);
    return { skipped: false, result: syncResult };
  },
});

// Sincroniza a tabela de classificação de uma liga sob demanda
export const syncLeagueStandings = action({
  args: {
    leagueId: v.id("leagues"),
  },
  handler: async (ctx, args) => {
    const apiKey = (globalThis as typeof globalThis & { process?: { env?: Record<string, string | undefined> } }).process?.env?.API_FOOTBALL_KEY;

    if (!apiKey) {
      console.warn("API_FOOTBALL_KEY em falta");
      return { success: false, reason: "API_FOOTBALL_KEY_MISSING" };
    }

    const leagues: any[] = (await ctx.runQuery(api.leagues.listLeagues, {})) ?? [];
    const leagueDoc = leagues.find((l: any) => l._id === args.leagueId);

    if (!leagueDoc || !leagueDoc.externalId) {
      console.warn("Liga não encontrada ou sem externalId:", args.leagueId);
      return { success: false, reason: "LEAGUE_NOT_FOUND" };
    }

    // Usa a temporada registada ou o ano corrente caso seja indefinido/inválido
    const currentYear = new Date().getFullYear();
    let season = leagueDoc.season || currentYear;

    console.log(`[Standings] A consultar liga ${leagueDoc.externalId} (${leagueDoc.name}), época ${season}...`);

    try {
      let response = await fetch(
        `https://v3.football.api-sports.io/standings?league=${leagueDoc.externalId}&season=${season}`,
        {
          headers: {
            "x-apisports-key": apiKey,
          },
        }
      );

      if (!response.ok) {
        throw new Error(`Erro na API externa: ${response.status} ${response.statusText}`);
      }

      let data = await response.json();
      const hasErrors = data.errors && (Array.isArray(data.errors) ? data.errors.length > 0 : Object.keys(data.errors).length > 0);
      console.log(
        "[Standings] Resposta recebida da API:",
        hasErrors ? JSON.stringify(data.errors) : (data.response?.[0]?.league?.name ?? JSON.stringify(data.errors))
      );

      let rawStandings = data.response?.[0]?.league?.standings?.[0] || [];

      // Suporte para múltiplos grupos ou copas (Champions League, Libertadores, etc.)
      if (rawStandings.length === 0 && Array.isArray(data.response?.[0]?.league?.standings)) {
        rawStandings = data.response[0].league.standings.flat();
      }

      // Se a época pesquisada retornar vazia, tenta a época anterior (comum em calendários europeus e transições)
      if (rawStandings.length === 0 && (!data.response || data.response.length === 0)) {
        const fallbackSeason = season - 1;
        console.log(`[Standings] Nenhum dado para época ${season}. Tentando época anterior (${fallbackSeason})...`);
        const fallbackRes = await fetch(
          `https://v3.football.api-sports.io/standings?league=${leagueDoc.externalId}&season=${fallbackSeason}`,
          {
            headers: {
              "x-apisports-key": apiKey,
            },
          }
        );

        if (fallbackRes.ok) {
          const fallbackData = await fallbackRes.json();
          let fallbackStandings = fallbackData.response?.[0]?.league?.standings?.[0] || [];
          if (fallbackStandings.length === 0 && Array.isArray(fallbackData.response?.[0]?.league?.standings)) {
            fallbackStandings = fallbackData.response[0].league.standings.flat();
          }

          if (fallbackStandings.length > 0) {
            console.log(`[Standings] Sucesso com a época ${fallbackSeason}! Total de times: ${fallbackStandings.length}`);
            data = fallbackData;
            rawStandings = fallbackStandings;
            season = fallbackSeason;
          }
        }
      }

      if (rawStandings.length === 0) {
        console.warn("[Standings] Nenhum registo encontrado na resposta para esta época/liga.", {
          season,
          externalId: leagueDoc.externalId,
          errors: data.errors,
          responseLength: data.response?.length,
        });
        return { success: false, reason: "EMPTY_STANDINGS", data };
      }

      await ctx.runMutation(internal.ingestion.saveSyncedStandings, {
        leagueId: args.leagueId,
        season: season,
        standings: rawStandings,
      });

      return {
        success: true,
        count: rawStandings.length,
      };
    } catch (error: any) {
      console.error("Falha ao sincronizar classificação:", error);
      return { success: false, error: error.message };
    }
  },
});

export const saveSyncedStandings = internalMutation({
  args: {
    leagueId: v.id("leagues"),
    season: v.number(),
    standings: v.any(),
  },
  handler: async (ctx, args) => {
    // Mantém a temporada da liga sincronizada
    await ctx.db.patch(args.leagueId, { season: args.season });

    const existing = await ctx.db
      .query("standings")
      .withIndex("by_league_rank", (q) => q.eq("leagueId", args.leagueId))
      .collect();

    for (const row of existing) {
      await ctx.db.delete(row._id);
    }

    for (const item of args.standings) {
      const teamExternalId = item.team?.id;

      let team = await ctx.db
        .query("teams")
        .withIndex("by_externalId", (q) => q.eq("externalId", teamExternalId))
        .first();

      if (!team) {
        const teamId = await ctx.db.insert("teams", {
          name: item.team?.name ?? "Time",
          logoUrl: item.team?.logo ?? "",
          externalId: teamExternalId,
        });
        team = await ctx.db.get(teamId);
      }

      if (team) {
        await ctx.db.insert("standings", {
          leagueId: args.leagueId,
          season: args.season,
          rank: item.rank,
          teamId: team._id,
          points: item.points ?? 0,
          goalsDiff: item.goalsDiff ?? 0,
          form: item.form ?? undefined,
          played: item.all?.played ?? 0,
          win: item.all?.win ?? 0,
          draw: item.all?.draw ?? 0,
          lose: item.all?.lose ?? 0,
          goalsFor: item.all?.goals?.for ?? 0,
          goalsAgainst: item.all?.goals?.against ?? 0,
          description: item.description ?? undefined,
        });
      }
    }
  },
});