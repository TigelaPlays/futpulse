import { action, internalMutation } from "./_generated/server";
import { api, internal } from "./_generated/api";
import { v } from "convex/values";

// IDs das ligas monitoradas (incluindo Série B - 72)
const TRACKED_LEAGUE_IDS = [71, 72, 2, 39, 13, 73, 140, 135, 78, 11, 45];

// 1. Action: busca dados externos via HTTP Fetch
export const syncLiveMatches = action({
  args: {},
  handler: async (ctx) => {
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

      // Filtra apenas os jogos das nossas 10 ligas
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