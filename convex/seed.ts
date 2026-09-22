import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import type { Doc, Id } from "./_generated/dataModel";
import { computeStandingsData } from "./leagues";
import { normalizeRoundName } from "./ingestion";

export const populateMockData = mutation({
  args: {},
  handler: async (ctx) => {
    // 1. Limpa tabelas existentes para recomeçar do zero
    const existingMatches = await ctx.db.query("matches").collect();
    for (const m of existingMatches) await ctx.db.delete(m._id);

    const existingEvents = await ctx.db.query("matchEvents").collect();
    for (const e of existingEvents) await ctx.db.delete(e._id);

    const existingTeams = await ctx.db.query("teams").collect();
    for (const t of existingTeams) await ctx.db.delete(t._id);

    const existingLeagues = await ctx.db.query("leagues").collect();
    for (const l of existingLeagues) await ctx.db.delete(l._id);

    // 2. Insere as Ligas (Pontos Corridos e Copas)
    const brasId = await ctx.db.insert("leagues", {
      name: "Brasileirão Série A",
      country: "Brasil",
      logoUrl: "https://media.api-sports.io/football/leagues/71.png",
      season: 2026,
      type: "league",
      externalId: 71,
      priority: 1,
    });

    const uclId = await ctx.db.insert("leagues", {
      name: "UEFA Champions League",
      country: "Europa",
      logoUrl: "https://media.api-sports.io/football/leagues/2.png",
      season: 2026,
      type: "cup",
      externalId: 2,
      priority: 2,
    });

    const plId = await ctx.db.insert("leagues", {
      name: "Premier League",
      country: "Inglaterra",
      logoUrl: "https://media.api-sports.io/football/leagues/39.png",
      season: 2026,
      type: "league",
      externalId: 39,
      priority: 3,
    });

    // 3. Insere Times
    const flamengoId = await ctx.db.insert("teams", {
      name: "Flamengo",
      code: "FLA",
      logoUrl: "https://media.api-sports.io/football/teams/127.png",
      externalId: 127,
    });

    const palmeirasId = await ctx.db.insert("teams", {
      name: "Palmeiras",
      code: "PAL",
      logoUrl: "https://media.api-sports.io/football/teams/121.png",
      externalId: 121,
    });

    const realMadridId = await ctx.db.insert("teams", {
      name: "Real Madrid",
      code: "RMA",
      logoUrl: "https://media.api-sports.io/football/teams/541.png",
      externalId: 541,
    });

    const manCityId = await ctx.db.insert("teams", {
      name: "Manchester City",
      code: "MCI",
      logoUrl: "https://media.api-sports.io/football/teams/50.png",
      externalId: 50,
    });

    const arsenalId = await ctx.db.insert("teams", {
      name: "Arsenal",
      code: "ARS",
      logoUrl: "https://media.api-sports.io/football/teams/42.png",
      externalId: 42,
    });

    const chelseaId = await ctx.db.insert("teams", {
      name: "Chelsea",
      code: "CHE",
      logoUrl: "https://media.api-sports.io/football/teams/49.png",
      externalId: 49,
    });

    const now = Date.now();

    // 4. Insere Jogos (1 Ao Vivo no Brasileirão, 1 Ao Vivo na Champions e 1 Agendado na Premier League)
    const match1 = await ctx.db.insert("matches", {
      externalId: 1001,
      leagueId: brasId,
      round: "Rodada 26",
      homeTeamId: flamengoId,
      awayTeamId: palmeirasId,
      status: "IN_PLAY",
      statusShort: "2H",
      minute: 68,
      homeScore: 2,
      awayScore: 1,
      homeHalftimeScore: 1,
      awayHalftimeScore: 1,
      startTime: now - 70 * 60 * 1000,
    });

    await ctx.db.insert("matches", {
      externalId: 1002,
      leagueId: uclId,
      round: "Quartas de Final",
      homeTeamId: realMadridId,
      awayTeamId: manCityId,
      status: "IN_PLAY",
      statusShort: "1H",
      minute: 34,
      homeScore: 0,
      awayScore: 0,
      startTime: now - 35 * 60 * 1000,
    });

    await ctx.db.insert("matches", {
      externalId: 1003,
      leagueId: plId,
      round: "Rodada 8",
      homeTeamId: arsenalId,
      awayTeamId: chelseaId,
      status: "SCHEDULED",
      statusShort: "NS",
      homeScore: 0,
      awayScore: 0,
      startTime: now + 3 * 60 * 60 * 1000,
    });

    // 5. Insere Eventos do jogo do Brasileirão
    await ctx.db.insert("matchEvents", {
      matchId: match1,
      minute: 22,
      teamId: flamengoId,
      playerName: "Pedro",
      type: "GOAL",
      detail: "Normal Goal",
    });

    await ctx.db.insert("matchEvents", {
      matchId: match1,
      minute: 41,
      teamId: palmeirasId,
      playerName: "Raphael Veiga",
      type: "GOAL",
      detail: "Penalty",
    });

    await ctx.db.insert("matchEvents", {
      matchId: match1,
      minute: 57,
      teamId: flamengoId,
      playerName: "Arrascaeta",
      type: "GOAL",
      detail: "Normal Goal",
    });

    return { success: true, message: "Banco populado com sucesso!" };
  },
});

// Mutation auxiliar para simular um gol em tempo real
export const simulateGoal = mutation({
  args: {
    matchId: v.id("matches"),
    isHome: v.boolean(),
    playerName: v.string(),
  },
  handler: async (ctx, args) => {
    const match = await ctx.db.get(args.matchId);
    if (!match) throw new Error("Partida não encontrada");

    const newHomeScore = args.isHome ? match.homeScore + 1 : match.homeScore;
    const newAwayScore = !args.isHome ? match.awayScore + 1 : match.awayScore;
    const newMinute = (match.minute ?? 70) + 2;

    await ctx.db.patch(args.matchId, {
      homeScore: newHomeScore,
      awayScore: newAwayScore,
      minute: newMinute,
    });

    await ctx.db.insert("matchEvents", {
      matchId: args.matchId,
      minute: newMinute,
      teamId: args.isHome ? match.homeTeamId : match.awayTeamId,
      playerName: args.playerName,
      type: "GOAL",
      detail: "Normal Goal",
    });

    return { success: true, homeScore: newHomeScore, awayScore: newAwayScore };
  },
});

export const populateSerieBStandings = mutation({
  args: {},
  handler: async (ctx) => {
    let serieB = await ctx.db
      .query("leagues")
      .withIndex("by_externalId", (q) => q.eq("externalId", 72))
      .first();

    if (!serieB) {
      const id = await ctx.db.insert("leagues", {
        name: "Brasileirão Série B",
        country: "Brasil",
        logoUrl: "https://media.api-sports.io/football/leagues/72.png",
        season: 2026,
        type: "league",
        externalId: 72,
        priority: 2,
      });
      serieB = await ctx.db.get(id);
    }

    if (!serieB) return;

    // 1. Limpa registros anteriores para não duplicar
    const existing = await ctx.db
      .query("standings")
      .withIndex("by_league_season", (q) =>
        q.eq("leagueId", serieB._id).eq("season", 2026)
      )
      .collect();

    for (const r of existing) {
      await ctx.db.delete(r._id);
    }

    // 2. Reparos preventivos no banco:
    // Garante que o time 134 não fique como Goiás (134 é Athletico-PR)
    const team134 = await ctx.db
      .query("teams")
      .withIndex("by_externalId", (q) => q.eq("externalId", 134))
      .first();
    if (team134 && team134.name.toLowerCase().includes("goi")) {
      await ctx.db.patch(team134._id, {
        name: "Athletico-PR",
      });
    }

    // Garante que o time 140 não fique como Criciuma (140 é Botafogo-SP)
    const team140 = await ctx.db
      .query("teams")
      .withIndex("by_externalId", (q) => q.eq("externalId", 140))
      .first();
    if (team140 && team140.name.toLowerCase().includes("cric")) {
      await ctx.db.patch(team140._id, {
        name: "Botafogo-SP",
      });
    }

    // 3. Dados oficiais extraídos do Sofascore
    const realStandings = [
      { id: 155, rank: 1, previousRank: 2, name: "Vila Nova", j: 29, v: 15, e: 6, d: 8, sg: 10, gf: 41, ga: 31, form: "WLWDW", pts: 51, logo: "https://media.api-sports.io/football/teams/155.png" },
      { id: 154, rank: 2, previousRank: 1, name: "Fortaleza", j: 29, v: 14, e: 9, d: 6, sg: 9, gf: 33, ga: 24, form: "DWWDW", pts: 51, logo: "https://media.api-sports.io/football/teams/154.png" },
      { id: 145, rank: 3, previousRank: 3, name: "Novorizontino", j: 29, v: 14, e: 8, d: 7, sg: 22, gf: 49, ga: 27, form: "WWWDL", pts: 50, logo: "https://media.api-sports.io/football/teams/145.png" },
      { id: 152, rank: 4, previousRank: 5, name: "Juventude", j: 29, v: 14, e: 8, d: 7, sg: 12, gf: 31, ga: 19, form: "DDWLL", pts: 50, logo: "https://media.api-sports.io/football/teams/152.png" },
      { id: 142, rank: 5, previousRank: 4, name: "Criciúma", j: 28, v: 13, e: 8, d: 7, sg: 3, gf: 28, ga: 25, form: "LLWLL", pts: 47, logo: "https://media.api-sports.io/football/teams/142.png" },
      { id: 148, rank: 6, previousRank: 6, name: "Atlético-GO", j: 29, v: 12, e: 10, d: 7, sg: 9, gf: 36, ga: 27, form: "WDWWL", pts: 46, logo: "https://media.api-sports.io/football/teams/148.png" },
      { id: 132, rank: 7, previousRank: 8, name: "CRB", j: 29, v: 13, e: 6, d: 10, sg: 1, gf: 42, ga: 41, form: "WWLWL", pts: 45, logo: "https://media.api-sports.io/football/teams/132.png" },
      { id: 151, rank: 8, previousRank: 7, name: "Operário-PR", j: 28, v: 12, e: 8, d: 8, sg: 3, gf: 39, ga: 36, form: "DDWWD", pts: 44, logo: "https://media.api-sports.io/football/teams/151.png" },
      { id: 138, rank: 9, previousRank: 9, name: "Sport Recife", j: 29, v: 11, e: 11, d: 7, sg: 10, gf: 39, ga: 29, form: "LLWLW", pts: 44, logo: "https://media.api-sports.io/football/teams/138.png" },
      { id: 144, rank: 10, previousRank: 12, name: "Goiás", j: 29, v: 12, e: 6, d: 11, sg: -5, gf: 30, ga: 35, form: "WLLWW", pts: 42, logo: "https://media.api-sports.io/football/teams/144.png" },
      { id: 10255, rank: 11, previousRank: 10, name: "São Bernardo", j: 29, v: 11, e: 8, d: 10, sg: 9, gf: 40, ga: 31, form: "LWLWW", pts: 41, logo: "https://media.api-sports.io/football/teams/10255.png" },
      { id: 10265, rank: 12, previousRank: 11, name: "Athletic", j: 29, v: 10, e: 11, d: 8, sg: 3, gf: 34, ga: 31, form: "LWLWD", pts: 41, logo: "https://media.api-sports.io/football/teams/10265.png" },
      { id: 136, rank: 13, previousRank: 13, name: "Cuiabá", j: 28, v: 9, e: 13, d: 6, sg: 5, gf: 27, ga: 22, form: "DWLWD", pts: 40, logo: "https://media.api-sports.io/football/teams/136.png" },
      { id: 150, rank: 14, previousRank: 14, name: "Náutico", j: 28, v: 10, e: 8, d: 10, sg: 2, gf: 35, ga: 33, form: "DWWLD", pts: 38, logo: "https://media.api-sports.io/football/teams/150.png" },
      { id: 129, rank: 15, previousRank: 16, name: "Ceará", j: 29, v: 9, e: 8, d: 12, sg: -6, gf: 31, ga: 37, form: "LWLDW", pts: 35, logo: "https://media.api-sports.io/football/teams/129.png" },
      { id: 140, rank: 16, previousRank: 15, name: "Botafogo-SP", j: 29, v: 8, e: 8, d: 13, sg: -4, gf: 32, ga: 36, form: "LLLLD", pts: 32, logo: "https://media.api-sports.io/football/teams/140.png" },
      { id: 123, rank: 17, previousRank: 17, name: "Avaí", j: 29, v: 8, e: 6, d: 15, sg: -8, gf: 30, ga: 38, form: "LLLDL", pts: 30, logo: "https://media.api-sports.io/football/teams/123.png" },
      { id: 139, rank: 18, previousRank: 18, name: "Londrina", j: 29, v: 7, e: 7, d: 15, sg: -2, gf: 39, ga: 41, form: "DLWWL", pts: 28, logo: "https://media.api-sports.io/football/teams/139.png" },
      { id: 120, rank: 19, previousRank: 19, name: "América-MG", j: 29, v: 4, e: 5, d: 20, sg: -28, gf: 21, ga: 49, form: "WLWLL", pts: 17, logo: "https://media.api-sports.io/football/teams/120.png" },
      { id: 147, rank: 20, previousRank: 20, name: "Ponte Preta", j: 29, v: 3, e: 4, d: 22, sg: -45, gf: 17, ga: 62, form: "LLLLW", pts: 13, logo: "https://media.api-sports.io/football/teams/147.png" },
    ];

    const TEAM_ALIASES: Record<string, string> = {
      "america mineiro": "america mg",
      "america-mg": "america mg",
      "athletic club": "athletic",
      "atletico goianiense": "atletico go",
      "atletico-go": "atletico go",
      "botafogo sp": "botafogo sp",
      "botafogo-sp": "botafogo sp",
      "operario pr": "operario pr",
      "operario-pr": "operario pr",
      "operario ferroviario": "operario pr",
      "goias": "goias",
      "criciuma": "criciuma",
    };

    const normalizeTeamName = (str: string) => {
      const cleanStr = str
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[-_]/g, " ")
        .trim();
      return TEAM_ALIASES[cleanStr] || cleanStr;
    };

    const allTeams = await ctx.db.query("teams").collect();

    for (const item of realStandings) {
      const targetNorm = normalizeTeamName(item.name);
      let team: (typeof allTeams)[number] | null =
        allTeams.find((t) => normalizeTeamName(t.name) === targetNorm) ?? null;

      if (!team) {
        team =
          allTeams.find(
            (t) =>
              t.externalId === item.id &&
              !t.name.toLowerCase().includes("paranaense") &&
              !t.name.toLowerCase().includes("flamengo")
          ) ?? null;
      }

      if (team) {
        await ctx.db.patch(team._id, {
          name: item.name,
          externalId: item.id,
          // Se não tiver escudo customizado ou se tiver escudo vazio, atualiza
          ...(!team.customLogoStorageId && !team.logoUrl ? { logoUrl: item.logo } : {}),
        });
      } else {
        const teamId = await ctx.db.insert("teams", {
          name: item.name,
          logoUrl: item.logo,
          externalId: item.id,
        });
        team = await ctx.db.get(teamId);
      }

      if (team) {
        await ctx.db.insert("standings", {
          leagueId: serieB._id,
          season: 2026,
          rank: item.rank,
          previousRank: item.previousRank,
          teamId: team._id,
          points: item.pts,
          played: item.j,
          win: item.v,
          draw: item.e,
          lose: item.d,
          goalsDiff: item.sg,
          goalsFor: item.gf,
          goalsAgainst: item.ga,
          form: item.form,
        });
      }
    }

    return { success: true, total: realStandings.length };
  },
});

export const seedGlobalLeagues = mutation({
  args: {},
  handler: async (ctx) => {
    const globalLeagues = [
      // --- DESTAQUES BRASIL & AMÉRICA DO SUL (Prioridade Máxima) ---
      { name: "Brasileirão Série A", country: "Brasil", externalId: 71, season: 2026, type: "league" as const, priority: 1, logoUrl: "https://media.api-sports.io/football/leagues/71.png" },
      { name: "Brasileirão Série B", country: "Brasil", externalId: 72, season: 2026, type: "league" as const, priority: 2, logoUrl: "https://media.api-sports.io/football/leagues/72.png" },
      { name: "Copa do Brasil", country: "Brasil", externalId: 73, season: 2026, type: "cup" as const, priority: 3, logoUrl: "https://media.api-sports.io/football/leagues/73.png" },
      { name: "Copa Libertadores", country: "América do Sul", externalId: 13, season: 2026, type: "cup" as const, priority: 4, logoUrl: "https://media.api-sports.io/football/leagues/13.png" },
      { name: "Copa Sul-Americana", country: "América do Sul", externalId: 11, season: 2026, type: "cup" as const, priority: 5, logoUrl: "https://media.api-sports.io/football/leagues/11.png" },

      // --- DESTAQUES EUROPA ---
      { name: "UEFA Champions League", country: "Europa", externalId: 2, season: 2026, type: "cup" as const, priority: 6, logoUrl: "https://media.api-sports.io/football/leagues/2.png" },
      { name: "Premier League", country: "Inglaterra", externalId: 39, season: 2026, type: "league" as const, priority: 7, logoUrl: "https://media.api-sports.io/football/leagues/39.png" },
      { name: "La Liga", country: "Espanha", externalId: 140, season: 2026, type: "league" as const, priority: 8, logoUrl: "https://media.api-sports.io/football/leagues/140.png" },
      { name: "Serie A", country: "Itália", externalId: 135, season: 2026, type: "league" as const, priority: 9, logoUrl: "https://media.api-sports.io/football/leagues/135.png" },
      { name: "Bundesliga", country: "Alemanha", externalId: 78, season: 2026, type: "league" as const, priority: 10, logoUrl: "https://media.api-sports.io/football/leagues/78.png" },

      // --- OUTRAS LIGAS POPULARES ---
      { name: "Ligue 1", country: "França", externalId: 61, season: 2026, type: "league" as const, priority: 20, logoUrl: "https://media.api-sports.io/football/leagues/61.png" },
      { name: "Liga Portugal", country: "Portugal", externalId: 94, season: 2026, type: "league" as const, priority: 21, logoUrl: "https://media.api-sports.io/football/leagues/94.png" },
      { name: "UEFA Europa League", country: "Europa", externalId: 3, season: 2026, type: "cup" as const, priority: 22, logoUrl: "https://media.api-sports.io/football/leagues/3.png" },
      { name: "MLS", country: "Estados Unidos", externalId: 253, season: 2026, type: "league" as const, priority: 25, logoUrl: "https://media.api-sports.io/football/leagues/253.png" },
      { name: "Saudi Pro League", country: "Arábia Saudita", externalId: 307, season: 2026, type: "league" as const, priority: 26, logoUrl: "https://media.api-sports.io/football/leagues/307.png" },
    ];

    for (const lg of globalLeagues) {
      const existing = await ctx.db
        .query("leagues")
        .withIndex("by_externalId", (q) => q.eq("externalId", lg.externalId))
        .first();

      if (existing) {
        await ctx.db.patch(existing._id, {
          priority: lg.priority,
          logoUrl: lg.logoUrl,
          name: lg.name,
          country: lg.country,
        });
      } else {
        await ctx.db.insert("leagues", lg);
      }
    }

    return { success: true, total: globalLeagues.length };
  },
});

// Mutação para popular rodadas completas enviadas via payload estruturado (ex: a partir de prints/dados do Sofascore)
export const populateRoundMatches = mutation({
  args: {
    leagueName: v.string(),
    season: v.optional(v.number()),
    round: v.union(v.string(), v.number()),
    matches: v.array(
      v.object({
        homeTeamName: v.string(),
        awayTeamName: v.string(),
        homeScore: v.number(),
        awayScore: v.number(),
        status: v.union(
          v.literal("SCHEDULED"),
          v.literal("IN_PLAY"),
          v.literal("PAUSED"),
          v.literal("EXTRA_TIME"),
          v.literal("PENALTY_SHOOTOUT"),
          v.literal("FINISHED"),
          v.literal("POSTPONED")
        ),
        statusShort: v.optional(v.string()),
        minute: v.optional(v.number()),
        startTimeStr: v.optional(v.string()),
        events: v.optional(
          v.array(
            v.object({
              playerName: v.string(),
              minute: v.number(),
              team: v.union(v.literal("home"), v.literal("away")),
              detail: v.optional(v.string()),
            })
          )
        ),
      })
    ),
  },
  handler: async (ctx, args) => {
    const clean = (str: string) =>
      str
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[-_]/g, " ")
        .trim();

    const targetLeagueNorm = clean(args.leagueName);
    const allLeagues = await ctx.db.query("leagues").collect();
    const league = allLeagues.find(
      (l) => clean(l.name) === targetLeagueNorm || clean(l.name).includes(targetLeagueNorm)
    );

    if (!league) {
      throw new Error(`Liga "${args.leagueName}" não encontrada no banco.`);
    }

    const roundNum = String(args.round).replace(/\D/g, "");
    const roundStr = roundNum ? `Rodada ${roundNum}` : String(args.round);

    const TEAM_ALIASES: Record<string, string> = {
      "america mineiro": "america mg",
      "america-mg": "america mg",
      "athletic club": "athletic",
      "atletico goianiense": "atletico go",
      "atletico-go": "atletico go",
      "botafogo sp": "botafogo sp",
      "botafogo-sp": "botafogo sp",
      "operario pr": "operario pr",
      "operario-pr": "operario pr",
      "operario ferroviario": "operario pr",
      "goias": "goias",
      "criciuma": "criciuma",
    };

    const normalizeTeamName = (str: string) => {
      const cleanStr = clean(str);
      return TEAM_ALIASES[cleanStr] || cleanStr;
    };

    const allTeams = await ctx.db.query("teams").collect();

    const getOrCreateTeam = async (name: string) => {
      const targetNorm = normalizeTeamName(name);
      let team = allTeams.find((t) => normalizeTeamName(t.name) === targetNorm);
      if (!team) {
        const id = await ctx.db.insert("teams", {
          name,
          logoUrl: "",
        });
        team = (await ctx.db.get(id))!;
        allTeams.push(team);
      }
      return team;
    };

    // Remove partidas anteriores dessa rodada para evitar duplicidade
    const existingMatches = await ctx.db
      .query("matches")
      .withIndex("by_league_and_round", (q) => q.eq("leagueId", league._id))
      .collect();

    const toDelete = existingMatches.filter(
      (m) =>
        m.round.toLowerCase() === roundStr.toLowerCase() ||
        (roundNum && m.round.replace(/\D/g, "") === roundNum)
    );

    for (const m of toDelete) {
      const oldEvents = await ctx.db
        .query("matchEvents")
        .withIndex("by_match", (q) => q.eq("matchId", m._id))
        .collect();
      for (const e of oldEvents) await ctx.db.delete(e._id);
      await ctx.db.delete(m._id);
    }

    const insertedMatches = [];
    const now = Date.now();

    for (const m of args.matches) {
      const homeTeam = await getOrCreateTeam(m.homeTeamName);
      const awayTeam = await getOrCreateTeam(m.awayTeamName);

      const matchId = await ctx.db.insert("matches", {
        leagueId: league._id,
        round: roundStr,
        homeTeamId: homeTeam._id,
        awayTeamId: awayTeam._id,
        status: m.status,
        statusShort:
          m.statusShort ??
          (m.status === "FINISHED" ? "FT" : m.status === "IN_PLAY" ? "2H" : "NS"),
        minute: m.minute,
        homeScore: m.homeScore,
        awayScore: m.awayScore,
        startTime: now,
      });

      if (m.events && m.events.length > 0) {
        for (const ev of m.events) {
          await ctx.db.insert("matchEvents", {
            matchId,
            minute: ev.minute,
            teamId: ev.team === "home" ? homeTeam._id : awayTeam._id,
            playerName: ev.playerName,
            type: "GOAL",
            detail: ev.detail ?? "Normal Goal",
          });
        }
      }

      insertedMatches.push(matchId);
    }

    return {
      success: true,
      league: league.name,
      round: roundStr,
      totalMatches: insertedMatches.length,
    };
  },
});

export const clearAllMatches = mutation({
  args: {},
  handler: async (ctx) => {
    const allMatches = await ctx.db.query("matches").collect();
    for (const m of allMatches) {
      await ctx.db.delete(m._id);
    }
    const allEvents = await ctx.db.query("matchEvents").collect();
    for (const e of allEvents) {
      await ctx.db.delete(e._id);
    }
    const allStats = await ctx.db.query("matchStatistics").collect();
    for (const s of allStats) {
      await ctx.db.delete(s._id);
    }
    return {
      success: true,
      deletedMatches: allMatches.length,
      deletedEvents: allEvents.length,
      deletedStats: allStats.length,
    };
  },
});

export const cleanLegacyMatches = mutation({
  args: {},
  handler: async (ctx) => {
    const allMatches = await ctx.db.query("matches").collect();
    const legacy = allMatches.filter((m) => !m.round.toLowerCase().startsWith("rodada"));
    for (const m of legacy) {
      await ctx.db.delete(m._id);
    }
    return { deleted: legacy.length };
  },
});

export const seedSerieBRound1Real = mutation({
  args: {},
  handler: async (ctx) => {
    // 1. Limpa todas as partidas e eventos anteriores
    const allMatches = await ctx.db.query("matches").collect();
    for (const m of allMatches) {
      await ctx.db.delete(m._id);
    }
    const allEvents = await ctx.db.query("matchEvents").collect();
    for (const e of allEvents) {
      await ctx.db.delete(e._id);
    }
    const allStats = await ctx.db.query("matchStatistics").collect();
    for (const s of allStats) {
      await ctx.db.delete(s._id);
    }

    // 2. Busca a liga Série B
    let serieB = await ctx.db
      .query("leagues")
      .withIndex("by_externalId", (q) => q.eq("externalId", 72))
      .first();

    if (!serieB) {
      const allLeagues = await ctx.db.query("leagues").collect();
      serieB = allLeagues.find((l) => l.name.toLowerCase().includes("série b")) ?? null;
    }

    if (!serieB) {
      const id = await ctx.db.insert("leagues", {
        name: "Brasileirão Série B",
        country: "Brasil",
        logoUrl: "https://media.api-sports.io/football/leagues/72.png",
        season: 2026,
        type: "league",
        externalId: 72,
        priority: 2,
      });
      serieB = (await ctx.db.get(id))!;
    }

    // 3. Normalização de times
    const clean = (str: string) =>
      str
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[-_]/g, " ")
        .trim();

    const TEAM_ALIASES: Record<string, string> = {
      "america mineiro": "america mg",
      "america-mg": "america mg",
      "athletic club": "athletic",
      "atletico goianiense": "atletico go",
      "atletico-go": "atletico go",
      "botafogo sp": "botafogo sp",
      "botafogo-sp": "botafogo sp",
      "operario pr": "operario pr",
      "operario-pr": "operario pr",
      "operario ferroviario": "operario pr",
      "goias": "goias",
      "criciuma": "criciuma",
    };

    const normalizeTeamName = (str: string) => {
      const cleanStr = clean(str);
      return TEAM_ALIASES[cleanStr] || cleanStr;
    };

    const allTeams = await ctx.db.query("teams").collect();

    const getTeam = (name: string) => {
      const targetNorm = normalizeTeamName(name);
      const team = allTeams.find((t) => normalizeTeamName(t.name) === targetNorm);
      if (!team) {
        throw new Error(`Time "${name}" não encontrado no banco!`);
      }
      return team;
    };

    // 4. Os 10 jogos reais da 1ª Rodada do Brasileirão Série B 2026
    const round1Matches = [
      {
        homeTeam: "Vila Nova",
        awayTeam: "CRB",
        homeScore: 2,
        awayScore: 2,
        startTime: new Date("2026-03-21T16:00:00-03:00").getTime(),
        events: [
          { minute: 18, team: "home", player: "Dellatorre", type: "GOAL" as const, detail: "Normal Goal" },
          { minute: 34, team: "away", player: "Mikael", type: "GOAL" as const, detail: "Normal Goal" },
          { minute: 61, team: "home", player: "Dudu", type: "GOAL" as const, detail: "Normal Goal" },
          { minute: 79, team: "away", player: "João Neto", type: "GOAL" as const, detail: "Normal Goal" },
          { minute: 84, team: "home", player: "Vila Nova", type: "RED_CARD" as const, detail: "Direct Red" },
        ],
      },
      {
        homeTeam: "Ceará",
        awayTeam: "São Bernardo",
        homeScore: 1,
        awayScore: 1,
        startTime: new Date("2026-03-21T16:00:00-03:00").getTime(),
        events: [
          { minute: 7, team: "home", player: "Vinícius Zanocelo", type: "GOAL" as const, detail: "Penalty" },
          { minute: 55, team: "away", player: "Pará", type: "GOAL" as const, detail: "Normal Goal" },
        ],
      },
      {
        homeTeam: "Operário-PR",
        awayTeam: "Atlético-GO",
        homeScore: 1,
        awayScore: 0,
        startTime: new Date("2026-03-21T18:30:00-03:00").getTime(),
        events: [
          { minute: 23, team: "home", player: "Pablo", type: "GOAL" as const, detail: "Normal Goal" },
        ],
      },
      {
        homeTeam: "Botafogo-SP",
        awayTeam: "Fortaleza",
        homeScore: 4,
        awayScore: 0,
        startTime: new Date("2026-03-21T19:00:00-03:00").getTime(),
        events: [
          { minute: 12, team: "home", player: "Everton Morelli", type: "GOAL" as const, detail: "Normal Goal" },
          { minute: 28, team: "home", player: "Hygor", type: "GOAL" as const, detail: "Normal Goal" },
          { minute: 41, team: "home", player: "Vilar", type: "GOAL" as const, detail: "Normal Goal" },
          { minute: 45, team: "away", player: "Mailton", type: "RED_CARD" as const, detail: "Direct Red" },
          { minute: 67, team: "home", player: "Everton Morelli", type: "GOAL" as const, detail: "Normal Goal" },
        ],
      },
      {
        homeTeam: "Cuiabá",
        awayTeam: "Sport Recife",
        homeScore: 0,
        awayScore: 0,
        startTime: new Date("2026-03-21T20:30:00-03:00").getTime(),
        events: [],
      },
      {
        homeTeam: "Avaí",
        awayTeam: "Juventude",
        homeScore: 2,
        awayScore: 0,
        startTime: new Date("2026-03-22T16:00:00-03:00").getTime(),
        events: [
          { minute: 37, team: "home", player: "Felipe Avenatti", type: "GOAL" as const, detail: "Normal Goal" },
          { minute: 58, team: "home", player: "Walace França", type: "GOAL" as const, detail: "Normal Goal" },
        ],
      },
      {
        homeTeam: "Náutico",
        awayTeam: "Criciúma",
        homeScore: 0,
        awayScore: 1,
        startTime: new Date("2026-03-22T16:00:00-03:00").getTime(),
        events: [
          { minute: 6, team: "away", player: "Waguininho", type: "GOAL" as const, detail: "Normal Goal" },
          { minute: 49, team: "home", player: "Samuel Félix", type: "RED_CARD" as const, detail: "Direct Red" },
        ],
      },
      {
        homeTeam: "Athletic",
        awayTeam: "Ponte Preta",
        homeScore: 2,
        awayScore: 1,
        startTime: new Date("2026-03-22T18:00:00-03:00").getTime(),
        events: [
          { minute: 27, team: "home", player: "Ian Luccas", type: "GOAL" as const, detail: "Normal Goal" },
          { minute: 44, team: "away", player: "Bryan Borges", type: "GOAL" as const, detail: "Normal Goal" },
          { minute: 45, extraMinute: 1, team: "home", player: "Jota", type: "GOAL" as const, detail: "Normal Goal" },
        ],
      },
      {
        homeTeam: "Goiás",
        awayTeam: "América-MG",
        homeScore: 3,
        awayScore: 1,
        startTime: new Date("2026-03-22T18:30:00-03:00").getTime(),
        events: [
          { minute: 8, team: "home", player: "Anselmo Ramon", type: "GOAL" as const, detail: "Penalty" },
          { minute: 29, team: "home", player: "Tadeu", type: "GOAL" as const, detail: "Penalty" },
          { minute: 42, team: "home", player: "Filipe Machado", type: "RED_CARD" as const, detail: "Direct Red" },
          { minute: 85, team: "home", player: "Gegê", type: "GOAL" as const, detail: "Normal Goal" },
          { minute: 90, extraMinute: 2, team: "away", player: "Gonzalo Mastriani", type: "GOAL" as const, detail: "Normal Goal" },
        ],
      },
      {
        homeTeam: "Novorizontino",
        awayTeam: "Londrina",
        homeScore: 1,
        awayScore: 3,
        startTime: new Date("2026-03-22T19:00:00-03:00").getTime(),
        events: [
          { minute: 48, team: "away", player: "Bruno Santos", type: "GOAL" as const, detail: "Normal Goal" },
          { minute: 57, team: "away", player: "Lucas Marques", type: "GOAL" as const, detail: "Normal Goal" },
          { minute: 85, team: "away", player: "André Luiz", type: "GOAL" as const, detail: "Normal Goal" },
          { minute: 90, extraMinute: 6, team: "home", player: "Carlão", type: "GOAL" as const, detail: "Normal Goal" },
        ],
      },
    ];

    let insertedCount = 0;
    let eventsCount = 0;

    for (const m of round1Matches) {
      const homeTeamDoc = getTeam(m.homeTeam);
      const awayTeamDoc = getTeam(m.awayTeam);

      const matchId = await ctx.db.insert("matches", {
        leagueId: serieB._id,
        round: "Rodada 1",
        homeTeamId: homeTeamDoc._id,
        awayTeamId: awayTeamDoc._id,
        status: "FINISHED",
        statusShort: "FT",
        minute: 90,
        homeScore: m.homeScore,
        awayScore: m.awayScore,
        startTime: m.startTime,
      });
      insertedCount++;

      for (const ev of m.events) {
        await ctx.db.insert("matchEvents", {
          matchId,
          minute: ev.minute,
          extraMinute: ev.extraMinute,
          teamId: ev.team === "home" ? homeTeamDoc._id : awayTeamDoc._id,
          playerName: ev.player,
          type: ev.type,
          detail: ev.detail,
        });
        eventsCount++;
      }
    }

    return {
      success: true,
      league: serieB.name,
      round: "Rodada 1",
      matchesInserted: insertedCount,
      eventsInserted: eventsCount,
    };
  },
});

export const seedSerieBRounds2to5Real = mutation({
  args: {},
  handler: async (ctx) => {
    // 1. Busca a liga Série B
    let serieB = await ctx.db
      .query("leagues")
      .withIndex("by_externalId", (q) => q.eq("externalId", 72))
      .first();

    if (!serieB) {
      const allLeagues = await ctx.db.query("leagues").collect();
      serieB = allLeagues.find((l) => l.name.toLowerCase().includes("série b")) ?? null;
    }

    if (!serieB) {
      throw new Error("Liga Brasileirão Série B não encontrada!");
    }

    // 2. Normalização de times
    const clean = (str: string) =>
      str
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[-_]/g, " ")
        .trim();

    const TEAM_ALIASES: Record<string, string> = {
      "america mineiro": "america mg",
      "america-mg": "america mg",
      "athletic club": "athletic",
      "atletico goianiense": "atletico go",
      "atletico-go": "atletico go",
      "botafogo sp": "botafogo sp",
      "botafogo-sp": "botafogo sp",
      "operario pr": "operario pr",
      "operario-pr": "operario pr",
      "operario ferroviario": "operario pr",
      "goias": "goias",
      "criciuma": "criciuma",
    };

    const normalizeTeamName = (str: string) => {
      const cleanStr = clean(str);
      return TEAM_ALIASES[cleanStr] || cleanStr;
    };

    const allTeams = await ctx.db.query("teams").collect();

    const getTeam = (name: string) => {
      const targetNorm = normalizeTeamName(name);
      const team = allTeams.find((t) => normalizeTeamName(t.name) === targetNorm);
      if (!team) {
        throw new Error(`Time "${name}" não encontrado no banco!`);
      }
      return team;
    };

    // 3. Remove partidas antigas das rodadas 2, 3, 4 e 5 para evitar duplicações
    const existingMatches = await ctx.db
      .query("matches")
      .withIndex("by_league", (q) => q.eq("leagueId", serieB._id))
      .collect();

    const targetRounds = ["Rodada 2", "Rodada 3", "Rodada 4", "Rodada 5"];
    for (const m of existingMatches) {
      if (targetRounds.includes(m.round)) {
        const events = await ctx.db
          .query("matchEvents")
          .withIndex("by_match", (q) => q.eq("matchId", m._id))
          .collect();
        for (const ev of events) await ctx.db.delete(ev._id);
        await ctx.db.delete(m._id);
      }
    }

    // 4. Definição completa das 40 partidas das Rodadas 2 a 5
    const roundsData = [
      {
        roundName: "Rodada 2",
        matches: [
          {
            homeTeam: "Juventude",
            awayTeam: "Novorizontino",
            homeScore: 0,
            awayScore: 0,
            startTime: new Date("2026-03-31T19:00:00-03:00").getTime(),
            events: [],
          },
          {
            homeTeam: "Fortaleza",
            awayTeam: "Cuiabá",
            homeScore: 0,
            awayScore: 0,
            startTime: new Date("2026-03-31T21:30:00-03:00").getTime(),
            events: [],
          },
          {
            homeTeam: "América-MG",
            awayTeam: "Botafogo-SP",
            homeScore: 1,
            awayScore: 2,
            startTime: new Date("2026-04-01T19:00:00-03:00").getTime(),
            events: [
              { minute: 14, team: "home", player: "Gonzalo Mastriani", type: "GOAL" as const, detail: "Normal Goal" },
              { minute: 48, team: "away", player: "Everton Morelli", type: "GOAL" as const, detail: "Normal Goal" },
              { minute: 76, team: "away", player: "Zé Hugo", type: "GOAL" as const, detail: "Normal Goal" },
            ],
          },
          {
            homeTeam: "Atlético-GO",
            awayTeam: "Náutico",
            homeScore: 1,
            awayScore: 2,
            startTime: new Date("2026-04-01T19:00:00-03:00").getTime(),
            events: [
              { minute: 22, team: "home", player: "Léo Jacó", type: "GOAL" as const, detail: "Normal Goal" },
              { minute: 38, team: "away", player: "Vinícius", type: "GOAL" as const, detail: "Normal Goal" },
              { minute: 65, team: "away", player: "Igor Fernandes", type: "GOAL" as const, detail: "Normal Goal" },
              { minute: 82, team: "away", player: "Náutico", type: "RED_CARD" as const, detail: "Direct Red" },
            ],
          },
          {
            homeTeam: "Londrina",
            awayTeam: "Goiás",
            homeScore: 2,
            awayScore: 2,
            startTime: new Date("2026-04-01T19:00:00-03:00").getTime(),
            events: [
              { minute: 19, team: "home", player: "Bruno Santos", type: "GOAL" as const, detail: "Normal Goal" },
              { minute: 31, team: "away", player: "Anselmo Ramon", type: "GOAL" as const, detail: "Normal Goal" },
              { minute: 54, team: "home", player: "Lucas Marques", type: "GOAL" as const, detail: "Normal Goal" },
              { minute: 73, team: "away", player: "Esli Garcia", type: "GOAL" as const, detail: "Normal Goal" },
            ],
          },
          {
            homeTeam: "Sport Recife",
            awayTeam: "Vila Nova",
            homeScore: 1,
            awayScore: 1,
            startTime: new Date("2026-04-01T20:00:00-03:00").getTime(),
            events: [
              { minute: 42, team: "away", player: "Janderson", type: "GOAL" as const, detail: "Normal Goal" },
              { minute: 68, team: "home", player: "Pedro Perotti", type: "GOAL" as const, detail: "Normal Goal" },
              { minute: 74, team: "home", player: "Sport Recife", type: "RED_CARD" as const, detail: "Direct Red" },
              { minute: 88, team: "away", player: "Vila Nova", type: "RED_CARD" as const, detail: "Direct Red" },
            ],
          },
          {
            homeTeam: "Ponte Preta",
            awayTeam: "Ceará",
            homeScore: 1,
            awayScore: 1,
            startTime: new Date("2026-04-01T20:00:00-03:00").getTime(),
            events: [
              { minute: 44, team: "away", player: "Lucas Lima", type: "RED_CARD" as const, detail: "Direct Red" },
              { minute: 53, team: "home", player: "Luis Phelipe", type: "GOAL" as const, detail: "Normal Goal" },
              { minute: 79, team: "away", player: "Sánchez", type: "GOAL" as const, detail: "Normal Goal" },
            ],
          },
          {
            homeTeam: "CRB",
            awayTeam: "Avaí",
            homeScore: 0,
            awayScore: 1,
            startTime: new Date("2026-04-01T21:30:00-03:00").getTime(),
            events: [
              { minute: 35, team: "away", player: "Felipe Avenatti", type: "GOAL" as const, detail: "Normal Goal" },
              { minute: 78, team: "away", player: "Avaí", type: "RED_CARD" as const, detail: "Direct Red" },
            ],
          },
          {
            homeTeam: "Criciúma",
            awayTeam: "Athletic",
            homeScore: 1,
            awayScore: 1,
            startTime: new Date("2026-04-01T21:30:00-03:00").getTime(),
            events: [
              { minute: 15, team: "home", player: "Waguininho", type: "GOAL" as const, detail: "Normal Goal" },
              { minute: 58, team: "away", player: "Jota", type: "GOAL" as const, detail: "Normal Goal" },
              { minute: 85, team: "away", player: "Athletic", type: "RED_CARD" as const, detail: "Direct Red" },
            ],
          },
          {
            homeTeam: "São Bernardo",
            awayTeam: "Operário-PR",
            homeScore: 1,
            awayScore: 2,
            startTime: new Date("2026-04-02T19:00:00-03:00").getTime(),
            events: [
              { minute: 27, team: "home", player: "Pará", type: "GOAL" as const, detail: "Normal Goal" },
              { minute: 41, team: "away", player: "Pablo", type: "GOAL" as const, detail: "Normal Goal" },
              { minute: 80, team: "away", player: "Rodrigo Rodrigues", type: "GOAL" as const, detail: "Normal Goal" },
            ],
          },
        ],
      },
      {
        roundName: "Rodada 3",
        matches: [
          {
            homeTeam: "Fortaleza",
            awayTeam: "Juventude",
            homeScore: 2,
            awayScore: 1,
            startTime: new Date("2026-04-04T16:00:00-03:00").getTime(),
            events: [
              { minute: 24, team: "home", player: "Lucero", type: "GOAL" as const, detail: "Normal Goal" },
              { minute: 49, team: "away", player: "Jean Carlos", type: "GOAL" as const, detail: "Normal Goal" },
              { minute: 63, team: "home", player: "Moisés", type: "GOAL" as const, detail: "Normal Goal" },
            ],
          },
          {
            homeTeam: "Cuiabá",
            awayTeam: "Ceará",
            homeScore: 0,
            awayScore: 2,
            startTime: new Date("2026-04-04T16:00:00-03:00").getTime(),
            events: [
              { minute: 32, team: "away", player: "Vinícius Zanocelo", type: "GOAL" as const, detail: "Penalty" },
              { minute: 71, team: "away", player: "Sánchez", type: "GOAL" as const, detail: "Normal Goal" },
            ],
          },
          {
            homeTeam: "Náutico",
            awayTeam: "Ponte Preta",
            homeScore: 1,
            awayScore: 0,
            startTime: new Date("2026-04-04T18:30:00-03:00").getTime(),
            events: [
              { minute: 40, team: "home", player: "Vinícius", type: "GOAL" as const, detail: "Normal Goal" },
              { minute: 55, team: "away", player: "Ponte Preta", type: "RED_CARD" as const, detail: "Direct Red" },
              { minute: 82, team: "away", player: "Ponte Preta", type: "RED_CARD" as const, detail: "Second Yellow" },
            ],
          },
          {
            homeTeam: "Vila Nova",
            awayTeam: "Atlético-GO",
            homeScore: 2,
            awayScore: 1,
            startTime: new Date("2026-04-04T18:30:00-03:00").getTime(),
            events: [
              { minute: 15, team: "home", player: "Dellatorre", type: "GOAL" as const, detail: "Normal Goal" },
              { minute: 53, team: "away", player: "Shaylon", type: "GOAL" as const, detail: "Normal Goal" },
              { minute: 67, team: "home", player: "Dudu", type: "GOAL" as const, detail: "Normal Goal" },
            ],
          },
          {
            homeTeam: "Londrina",
            awayTeam: "Sport Recife",
            homeScore: 1,
            awayScore: 2,
            startTime: new Date("2026-04-04T20:30:00-03:00").getTime(),
            events: [
              { minute: 34, team: "home", player: "Lucas Marques", type: "GOAL" as const, detail: "Normal Goal" },
              { minute: 45, team: "away", player: "Chrystian Barletta", type: "GOAL" as const, detail: "Normal Goal" },
              { minute: 78, team: "away", player: "Pedro Perotti", type: "GOAL" as const, detail: "Normal Goal" },
            ],
          },
          {
            homeTeam: "Avaí",
            awayTeam: "Operário-PR",
            homeScore: 0,
            awayScore: 0,
            startTime: new Date("2026-04-05T16:00:00-03:00").getTime(),
            events: [],
          },
          {
            homeTeam: "Novorizontino",
            awayTeam: "CRB",
            homeScore: 1,
            awayScore: 1,
            startTime: new Date("2026-04-05T16:00:00-03:00").getTime(),
            events: [
              { minute: 29, team: "home", player: "Carlão", type: "GOAL" as const, detail: "Normal Goal" },
              { minute: 62, team: "away", player: "João Neto", type: "GOAL" as const, detail: "Normal Goal" },
            ],
          },
          {
            homeTeam: "Athletic",
            awayTeam: "América-MG",
            homeScore: 1,
            awayScore: 1,
            startTime: new Date("2026-04-05T18:00:00-03:00").getTime(),
            events: [
              { minute: 38, team: "home", player: "Ian Luccas", type: "GOAL" as const, detail: "Normal Goal" },
              { minute: 57, team: "away", player: "Gonzalo Mastriani", type: "GOAL" as const, detail: "Normal Goal" },
              { minute: 75, team: "home", player: "Athletic", type: "RED_CARD" as const, detail: "Direct Red" },
            ],
          },
          {
            homeTeam: "Botafogo-SP",
            awayTeam: "São Bernardo",
            homeScore: 1,
            awayScore: 2,
            startTime: new Date("2026-04-05T18:30:00-03:00").getTime(),
            events: [
              { minute: 22, team: "home", player: "Hygor", type: "GOAL" as const, detail: "Normal Goal" },
              { minute: 44, team: "away", player: "Pará", type: "GOAL" as const, detail: "Normal Goal" },
              { minute: 83, team: "away", player: "Kayke", type: "GOAL" as const, detail: "Normal Goal" },
            ],
          },
          {
            homeTeam: "Goiás",
            awayTeam: "Criciúma",
            homeScore: 1,
            awayScore: 0,
            startTime: new Date("2026-04-06T20:00:00-03:00").getTime(),
            events: [
              { minute: 70, team: "home", player: "Anselmo Ramon", type: "GOAL" as const, detail: "Normal Goal" },
            ],
          },
        ],
      },
      {
        roundName: "Rodada 4",
        matches: [
          {
            homeTeam: "Criciúma",
            awayTeam: "Botafogo-SP",
            homeScore: 1,
            awayScore: 0,
            startTime: new Date("2026-04-10T19:00:00-03:00").getTime(),
            events: [
              { minute: 31, team: "home", player: "Waguininho", type: "GOAL" as const, detail: "Normal Goal" },
              { minute: 68, team: "home", player: "Criciúma", type: "RED_CARD" as const, detail: "Direct Red" },
            ],
          },
          {
            homeTeam: "Juventude",
            awayTeam: "Goiás",
            homeScore: 2,
            awayScore: 0,
            startTime: new Date("2026-04-11T16:00:00-03:00").getTime(),
            events: [
              { minute: 18, team: "home", player: "Gilberto", type: "GOAL" as const, detail: "Normal Goal" },
              { minute: 39, team: "away", player: "Goiás", type: "RED_CARD" as const, detail: "Direct Red" },
              { minute: 65, team: "home", player: "Jean Carlos", type: "GOAL" as const, detail: "Normal Goal" },
              { minute: 84, team: "away", player: "Goiás", type: "RED_CARD" as const, detail: "Second Yellow" },
            ],
          },
          {
            homeTeam: "Ponte Preta",
            awayTeam: "Vila Nova",
            homeScore: 0,
            awayScore: 1,
            startTime: new Date("2026-04-11T16:00:00-03:00").getTime(),
            events: [
              { minute: 72, team: "away", player: "Dellatorre", type: "GOAL" as const, detail: "Normal Goal" },
            ],
          },
          {
            homeTeam: "Sport Recife",
            awayTeam: "Avaí",
            homeScore: 2,
            awayScore: 2,
            startTime: new Date("2026-04-11T18:30:00-03:00").getTime(),
            events: [
              { minute: 21, team: "home", player: "Pedro Perotti", type: "GOAL" as const, detail: "Normal Goal" },
              { minute: 38, team: "away", player: "Felipe Avenatti", type: "GOAL" as const, detail: "Normal Goal" },
              { minute: 59, team: "home", player: "Chrystian Barletta", type: "GOAL" as const, detail: "Normal Goal" },
              { minute: 77, team: "away", player: "Walace França", type: "GOAL" as const, detail: "Normal Goal" },
            ],
          },
          {
            homeTeam: "Ceará",
            awayTeam: "Náutico",
            homeScore: 1,
            awayScore: 0,
            startTime: new Date("2026-04-11T19:00:00-03:00").getTime(),
            events: [
              { minute: 52, team: "home", player: "Vinícius Zanocelo", type: "GOAL" as const, detail: "Normal Goal" },
            ],
          },
          {
            homeTeam: "América-MG",
            awayTeam: "Novorizontino",
            homeScore: 0,
            awayScore: 3,
            startTime: new Date("2026-04-12T16:00:00-03:00").getTime(),
            events: [
              { minute: 14, team: "away", player: "Carlão", type: "GOAL" as const, detail: "Normal Goal" },
              { minute: 49, team: "away", player: "Rodolfo", type: "GOAL" as const, detail: "Normal Goal" },
              { minute: 81, team: "away", player: "Lucas Tocantins", type: "GOAL" as const, detail: "Normal Goal" },
            ],
          },
          {
            homeTeam: "Operário-PR",
            awayTeam: "Cuiabá",
            homeScore: 0,
            awayScore: 0,
            startTime: new Date("2026-04-12T16:00:00-03:00").getTime(),
            events: [
              { minute: 70, team: "away", player: "Cuiabá", type: "RED_CARD" as const, detail: "Direct Red" },
            ],
          },
          {
            homeTeam: "São Bernardo",
            awayTeam: "Fortaleza",
            homeScore: 0,
            awayScore: 1,
            startTime: new Date("2026-04-12T18:00:00-03:00").getTime(),
            events: [
              { minute: 61, team: "away", player: "Lucero", type: "GOAL" as const, detail: "Normal Goal" },
            ],
          },
          {
            homeTeam: "CRB",
            awayTeam: "Athletic",
            homeScore: 2,
            awayScore: 3,
            startTime: new Date("2026-04-12T18:30:00-03:00").getTime(),
            events: [
              { minute: 18, team: "home", player: "Mikael", type: "GOAL" as const, detail: "Normal Goal" },
              { minute: 26, team: "away", player: "Ian Luccas", type: "GOAL" as const, detail: "Normal Goal" },
              { minute: 45, team: "away", player: "Jota", type: "GOAL" as const, detail: "Normal Goal" },
              { minute: 64, team: "home", player: "João Neto", type: "GOAL" as const, detail: "Normal Goal" },
              { minute: 83, team: "away", player: "Jonathas", type: "GOAL" as const, detail: "Normal Goal" },
            ],
          },
          {
            homeTeam: "Atlético-GO",
            awayTeam: "Londrina",
            homeScore: 2,
            awayScore: 1,
            startTime: new Date("2026-04-12T19:00:00-03:00").getTime(),
            events: [
              { minute: 33, team: "home", player: "Shaylon", type: "GOAL" as const, detail: "Normal Goal" },
              { minute: 51, team: "away", player: "Bruno Santos", type: "GOAL" as const, detail: "Normal Goal" },
              { minute: 75, team: "home", player: "Léo Jacó", type: "GOAL" as const, detail: "Normal Goal" },
            ],
          },
        ],
      },
      {
        roundName: "Rodada 5",
        matches: [
          {
            homeTeam: "América-MG",
            awayTeam: "Sport Recife",
            homeScore: 0,
            awayScore: 0,
            startTime: new Date("2026-04-18T16:00:00-03:00").getTime(),
            events: [],
          },
          {
            homeTeam: "Náutico",
            awayTeam: "São Bernardo",
            homeScore: 0,
            awayScore: 3,
            startTime: new Date("2026-04-18T16:00:00-03:00").getTime(),
            events: [
              { minute: 19, team: "away", player: "Pará", type: "GOAL" as const, detail: "Normal Goal" },
              { minute: 43, team: "away", player: "Kayke", type: "GOAL" as const, detail: "Normal Goal" },
              { minute: 78, team: "away", player: "Alan Santos", type: "GOAL" as const, detail: "Normal Goal" },
            ],
          },
          {
            homeTeam: "Vila Nova",
            awayTeam: "Operário-PR",
            homeScore: 2,
            awayScore: 1,
            startTime: new Date("2026-04-18T18:00:00-03:00").getTime(),
            events: [
              { minute: 32, team: "home", player: "Dellatorre", type: "GOAL" as const, detail: "Normal Goal" },
              { minute: 56, team: "away", player: "Pablo", type: "GOAL" as const, detail: "Normal Goal" },
              { minute: 70, team: "home", player: "Dudu", type: "GOAL" as const, detail: "Normal Goal" },
            ],
          },
          {
            homeTeam: "Avaí",
            awayTeam: "Ponte Preta",
            homeScore: 1,
            awayScore: 2,
            startTime: new Date("2026-04-18T18:30:00-03:00").getTime(),
            events: [
              { minute: 28, team: "home", player: "Walace França", type: "GOAL" as const, detail: "Normal Goal" },
              { minute: 47, team: "away", player: "Bryan Borges", type: "GOAL" as const, detail: "Normal Goal" },
              { minute: 82, team: "away", player: "Luis Phelipe", type: "GOAL" as const, detail: "Normal Goal" },
            ],
          },
          {
            homeTeam: "CRB",
            awayTeam: "Juventude",
            homeScore: 0,
            awayScore: 1,
            startTime: new Date("2026-04-18T20:30:00-03:00").getTime(),
            events: [
              { minute: 67, team: "away", player: "Jean Carlos", type: "GOAL" as const, detail: "Normal Goal" },
              { minute: 74, team: "home", player: "CRB", type: "RED_CARD" as const, detail: "Direct Red" },
            ],
          },
          {
            homeTeam: "Botafogo-SP",
            awayTeam: "Atlético-GO",
            homeScore: 1,
            awayScore: 1,
            startTime: new Date("2026-04-19T16:00:00-03:00").getTime(),
            events: [
              { minute: 39, team: "home", player: "Everton Morelli", type: "GOAL" as const, detail: "Normal Goal" },
              { minute: 61, team: "away", player: "Shaylon", type: "GOAL" as const, detail: "Normal Goal" },
            ],
          },
          {
            homeTeam: "Londrina",
            awayTeam: "Ceará",
            homeScore: 0,
            awayScore: 0,
            startTime: new Date("2026-04-19T16:00:00-03:00").getTime(),
            events: [],
          },
          {
            homeTeam: "Goiás",
            awayTeam: "Cuiabá",
            homeScore: 0,
            awayScore: 2,
            startTime: new Date("2026-04-19T18:00:00-03:00").getTime(),
            events: [
              { minute: 35, team: "away", player: "Pitta", type: "GOAL" as const, detail: "Normal Goal" },
              { minute: 73, team: "away", player: "Clayson", type: "GOAL" as const, detail: "Normal Goal" },
            ],
          },
          {
            homeTeam: "Fortaleza",
            awayTeam: "Criciúma",
            homeScore: 3,
            awayScore: 2,
            startTime: new Date("2026-04-19T18:30:00-03:00").getTime(),
            events: [
              { minute: 12, team: "home", player: "Moisés", type: "GOAL" as const, detail: "Normal Goal" },
              { minute: 27, team: "away", player: "Waguininho", type: "GOAL" as const, detail: "Normal Goal" },
              { minute: 44, team: "home", player: "Lucero", type: "GOAL" as const, detail: "Normal Goal" },
              { minute: 69, team: "away", player: "Bolasie", type: "GOAL" as const, detail: "Normal Goal" },
              { minute: 81, team: "home", player: "Yago Pikachu", type: "GOAL" as const, detail: "Normal Goal" },
            ],
          },
          {
            homeTeam: "Novorizontino",
            awayTeam: "Athletic",
            homeScore: 2,
            awayScore: 1,
            startTime: new Date("2026-04-19T19:00:00-03:00").getTime(),
            events: [
              { minute: 33, team: "home", player: "Carlão", type: "GOAL" as const, detail: "Normal Goal" },
              { minute: 52, team: "away", player: "Ian Luccas", type: "GOAL" as const, detail: "Normal Goal" },
              { minute: 60, team: "home", player: "Rodolfo", type: "GOAL" as const, detail: "Normal Goal" },
              { minute: 71, team: "away", player: "Athletic", type: "RED_CARD" as const, detail: "Direct Red" },
              { minute: 89, team: "away", player: "Athletic", type: "RED_CARD" as const, detail: "Second Yellow" },
            ],
          },
        ],
      },
    ];

    let totalMatchesInserted = 0;
    let totalEventsInserted = 0;

    for (const round of roundsData) {
      for (const m of round.matches) {
        const homeTeamDoc = getTeam(m.homeTeam);
        const awayTeamDoc = getTeam(m.awayTeam);

        const matchId = await ctx.db.insert("matches", {
          leagueId: serieB._id,
          round: round.roundName,
          homeTeamId: homeTeamDoc._id,
          awayTeamId: awayTeamDoc._id,
          status: "FINISHED",
          statusShort: "FT",
          minute: 90,
          homeScore: m.homeScore,
          awayScore: m.awayScore,
          startTime: m.startTime,
        });
        totalMatchesInserted++;

        for (const ev of m.events) {
          await ctx.db.insert("matchEvents", {
            matchId,
            minute: ev.minute,
            teamId: ev.team === "home" ? homeTeamDoc._id : awayTeamDoc._id,
            playerName: ev.player,
            type: ev.type,
            detail: ev.detail,
          });
          totalEventsInserted++;
        }
      }
    }

    // 5. Recalcula e atualiza a tabela de classificação oficial
    const allMatches = await ctx.db
      .query("matches")
      .withIndex("by_league", (q) => q.eq("leagueId", serieB._id))
      .collect();

    const finishedMatches = allMatches.filter((m) => m.status === "FINISHED");
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
      serieB.name
    );

    const oldStandings = await ctx.db
      .query("standings")
      .withIndex("by_league_rank", (q) => q.eq("leagueId", serieB._id))
      .collect();

    for (const r of oldStandings) await ctx.db.delete(r._id);

    for (const row of standingsList) {
      await ctx.db.insert("standings", {
        leagueId: serieB._id,
        season: serieB.season,
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

    return {
      success: true,
      league: serieB.name,
      matchesInserted: totalMatchesInserted,
      eventsInserted: totalEventsInserted,
      standingsUpdated: standingsList.length,
    };
  },
});

export const seedSerieBRounds6to8Real = mutation({
  args: {},
  handler: async (ctx) => {
    // 1. Busca a liga Série B
    let serieB = await ctx.db
      .query("leagues")
      .withIndex("by_externalId", (q) => q.eq("externalId", 72))
      .first();

    if (!serieB) {
      const allLeagues = await ctx.db.query("leagues").collect();
      serieB = allLeagues.find((l) => l.name.toLowerCase().includes("série b")) ?? null;
    }

    if (!serieB) {
      throw new Error("Liga Brasileirão Série B não encontrada!");
    }

    // 2. Normalização de times
    const clean = (str: string) =>
      str
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[-_]/g, " ")
        .trim();

    const TEAM_ALIASES: Record<string, string> = {
      "america mineiro": "america mg",
      "america-mg": "america mg",
      "athletic club": "athletic",
      "atletico goianiense": "atletico go",
      "atletico-go": "atletico go",
      "botafogo sp": "botafogo sp",
      "botafogo-sp": "botafogo sp",
      "operario pr": "operario pr",
      "operario-pr": "operario pr",
      "operario ferroviario": "operario pr",
      "goias": "goias",
      "criciuma": "criciuma",
    };

    const normalizeTeamName = (str: string) => {
      const cleanStr = clean(str);
      return TEAM_ALIASES[cleanStr] || cleanStr;
    };

    const allTeams = await ctx.db.query("teams").collect();

    const getTeam = (name: string) => {
      const targetNorm = normalizeTeamName(name);
      const team = allTeams.find((t) => normalizeTeamName(t.name) === targetNorm);
      if (!team) {
        throw new Error(`Time "${name}" não encontrado no banco!`);
      }
      return team;
    };

    // 3. Remove partidas antigas das rodadas 6, 7 e 8 para evitar duplicações
    const existingMatches = await ctx.db
      .query("matches")
      .withIndex("by_league", (q) => q.eq("leagueId", serieB._id))
      .collect();

    const targetRounds = ["Rodada 6", "Rodada 7", "Rodada 8"];
    for (const m of existingMatches) {
      if (targetRounds.includes(m.round)) {
        const events = await ctx.db
          .query("matchEvents")
          .withIndex("by_match", (q) => q.eq("matchId", m._id))
          .collect();
        for (const ev of events) await ctx.db.delete(ev._id);
        await ctx.db.delete(m._id);
      }
    }

    // 4. Definição completa das 30 partidas das Rodadas 6 a 8
    const roundsData = [
      {
        roundName: "Rodada 6",
        matches: [
          {
            homeTeam: "Cuiabá",
            awayTeam: "Botafogo-SP",
            homeScore: 1,
            awayScore: 1,
            startTime: new Date("2026-04-22T19:00:00-03:00").getTime(),
            events: [
              { minute: 31, team: "home", player: "Pitta", type: "GOAL" as const, detail: "Normal Goal" },
              { minute: 68, team: "away", player: "Everton Morelli", type: "GOAL" as const, detail: "Normal Goal" },
            ],
          },
          {
            homeTeam: "Ponte Preta",
            awayTeam: "América-MG",
            homeScore: 1,
            awayScore: 0,
            startTime: new Date("2026-04-24T19:00:00-03:00").getTime(),
            events: [
              { minute: 56, team: "home", player: "Luis Phelipe", type: "GOAL" as const, detail: "Normal Goal" },
            ],
          },
          {
            homeTeam: "Sport Recife",
            awayTeam: "Novorizontino",
            homeScore: 1,
            awayScore: 0,
            startTime: new Date("2026-04-25T16:00:00-03:00").getTime(),
            events: [
              { minute: 74, team: "home", player: "Pedro Perotti", type: "GOAL" as const, detail: "Normal Goal" },
            ],
          },
          {
            homeTeam: "Juventude",
            awayTeam: "Londrina",
            homeScore: 1,
            awayScore: 0,
            startTime: new Date("2026-04-25T18:30:00-03:00").getTime(),
            events: [
              { minute: 43, team: "home", player: "Jean Carlos", type: "GOAL" as const, detail: "Normal Goal" },
            ],
          },
          {
            homeTeam: "São Bernardo",
            awayTeam: "Goiás",
            homeScore: 1,
            awayScore: 0,
            startTime: new Date("2026-04-26T16:00:00-03:00").getTime(),
            events: [
              { minute: 62, team: "home", player: "Kayke", type: "GOAL" as const, detail: "Normal Goal" },
            ],
          },
          {
            homeTeam: "Ceará",
            awayTeam: "Vila Nova",
            homeScore: 3,
            awayScore: 3,
            startTime: new Date("2026-04-26T16:00:00-03:00").getTime(),
            events: [
              { minute: 11, team: "away", player: "Rafa Silva", type: "GOAL" as const, detail: "Normal Goal" },
              { minute: 22, team: "home", player: "Lucas Lima", type: "GOAL" as const, detail: "Normal Goal" },
              { minute: 39, team: "away", player: "Rafa Silva", type: "GOAL" as const, detail: "Normal Goal" },
              { minute: 54, team: "home", player: "Matheus Araújo", type: "GOAL" as const, detail: "Normal Goal" },
              { minute: 72, team: "away", player: "João Vieira", type: "GOAL" as const, detail: "Normal Goal" },
              { minute: 81, team: "home", player: "Matheus Araújo", type: "GOAL" as const, detail: "Normal Goal" },
            ],
          },
          {
            homeTeam: "Operário-PR",
            awayTeam: "Fortaleza",
            homeScore: 0,
            awayScore: 0,
            startTime: new Date("2026-04-26T18:00:00-03:00").getTime(),
            events: [],
          },
          {
            homeTeam: "Atlético-GO",
            awayTeam: "Avaí",
            homeScore: 2,
            awayScore: 1,
            startTime: new Date("2026-04-26T18:30:00-03:00").getTime(),
            events: [
              { minute: 19, team: "away", player: "Walace", type: "GOAL" as const, detail: "Normal Goal" },
              { minute: 48, team: "home", player: "Gustavo Coutinho", type: "GOAL" as const, detail: "Normal Goal" },
              { minute: 74, team: "home", player: "Guilherme Marques", type: "GOAL" as const, detail: "Normal Goal" },
            ],
          },
          {
            homeTeam: "Criciúma",
            awayTeam: "CRB",
            homeScore: 3,
            awayScore: 1,
            startTime: new Date("2026-04-26T19:00:00-03:00").getTime(),
            events: [
              { minute: 28, team: "home", player: "Bruno Alves", type: "GOAL" as const, detail: "Normal Goal" },
              { minute: 44, team: "away", player: "Mikael", type: "GOAL" as const, detail: "Normal Goal" },
              { minute: 59, team: "home", player: "Nicolas", type: "GOAL" as const, detail: "Normal Goal" },
              { minute: 83, team: "home", player: "Waguininho", type: "GOAL" as const, detail: "Normal Goal" },
            ],
          },
          {
            homeTeam: "Athletic",
            awayTeam: "Náutico",
            homeScore: 0,
            awayScore: 1,
            startTime: new Date("2026-04-27T20:00:00-03:00").getTime(),
            events: [
              { minute: 67, team: "away", player: "Vinícius", type: "GOAL" as const, detail: "Normal Goal" },
            ],
          },
        ],
      },
      {
        roundName: "Rodada 7",
        matches: [
          {
            homeTeam: "Botafogo-SP",
            awayTeam: "Náutico",
            homeScore: 1,
            awayScore: 1,
            startTime: new Date("2026-05-02T16:00:00-03:00").getTime(),
            events: [
              { minute: 37, team: "home", player: "Hygor", type: "GOAL" as const, detail: "Normal Goal" },
              { minute: 71, team: "away", player: "Dodô", type: "GOAL" as const, detail: "Normal Goal" },
            ],
          },
          {
            homeTeam: "Cuiabá",
            awayTeam: "Criciúma",
            homeScore: 1,
            awayScore: 1,
            startTime: new Date("2026-05-02T16:00:00-03:00").getTime(),
            events: [
              { minute: 24, team: "home", player: "Pitta", type: "GOAL" as const, detail: "Normal Goal" },
              { minute: 63, team: "away", player: "Waguininho", type: "GOAL" as const, detail: "Normal Goal" },
            ],
          },
          {
            homeTeam: "Fortaleza",
            awayTeam: "Goiás",
            homeScore: 4,
            awayScore: 1,
            startTime: new Date("2026-05-02T18:30:00-03:00").getTime(),
            events: [
              { minute: 14, team: "away", player: "Gegê", type: "GOAL" as const, detail: "Normal Goal" },
              { minute: 35, team: "home", player: "Vitinho", type: "GOAL" as const, detail: "Normal Goal" },
              { minute: 52, team: "home", player: "Juan Miritello", type: "GOAL" as const, detail: "Normal Goal" },
              { minute: 60, team: "away", player: "Goiás", type: "RED_CARD" as const, detail: "Direct Red" },
              { minute: 68, team: "home", player: "Vitinho", type: "GOAL" as const, detail: "Normal Goal" },
              { minute: 82, team: "home", player: "Juan Miritello", type: "GOAL" as const, detail: "Normal Goal" },
            ],
          },
          {
            homeTeam: "Operário-PR",
            awayTeam: "Londrina",
            homeScore: 3,
            awayScore: 0,
            startTime: new Date("2026-05-03T16:00:00-03:00").getTime(),
            events: [
              { minute: 18, team: "home", player: "Pablo", type: "GOAL" as const, detail: "Normal Goal" },
              { minute: 49, team: "home", player: "Rodrigo Rodrigues", type: "GOAL" as const, detail: "Normal Goal" },
              { minute: 76, team: "home", player: "Felipe Augusto", type: "GOAL" as const, detail: "Normal Goal" },
            ],
          },
          {
            homeTeam: "São Bernardo",
            awayTeam: "Ponte Preta",
            homeScore: 3,
            awayScore: 0,
            startTime: new Date("2026-05-03T16:00:00-03:00").getTime(),
            events: [
              { minute: 22, team: "home", player: "Pará", type: "GOAL" as const, detail: "Normal Goal" },
              { minute: 58, team: "home", player: "Kayke", type: "GOAL" as const, detail: "Normal Goal" },
              { minute: 84, team: "home", player: "Alan Santos", type: "GOAL" as const, detail: "Normal Goal" },
            ],
          },
          {
            homeTeam: "Sport Recife",
            awayTeam: "Ceará",
            homeScore: 2,
            awayScore: 0,
            startTime: new Date("2026-05-03T18:00:00-03:00").getTime(),
            events: [
              { minute: 31, team: "home", player: "Chrystian Barletta", type: "GOAL" as const, detail: "Normal Goal" },
              { minute: 67, team: "home", player: "Pedro Perotti", type: "GOAL" as const, detail: "Normal Goal" },
            ],
          },
          {
            homeTeam: "Atlético-GO",
            awayTeam: "Juventude",
            homeScore: 0,
            awayScore: 0,
            startTime: new Date("2026-05-03T18:30:00-03:00").getTime(),
            events: [
              { minute: 73, team: "home", player: "Atlético-GO", type: "RED_CARD" as const, detail: "Direct Red" },
            ],
          },
          {
            homeTeam: "América-MG",
            awayTeam: "CRB",
            homeScore: 1,
            awayScore: 2,
            startTime: new Date("2026-05-03T18:30:00-03:00").getTime(),
            events: [
              { minute: 29, team: "away", player: "Mikael", type: "GOAL" as const, detail: "Normal Goal" },
              { minute: 41, team: "home", player: "Gonzalo Mastriani", type: "GOAL" as const, detail: "Normal Goal" },
              { minute: 75, team: "away", player: "João Neto", type: "GOAL" as const, detail: "Normal Goal" },
            ],
          },
          {
            homeTeam: "Avaí",
            awayTeam: "Novorizontino",
            homeScore: 3,
            awayScore: 3,
            startTime: new Date("2026-05-03T19:00:00-03:00").getTime(),
            events: [
              { minute: 17, team: "home", player: "Luiz Henrique", type: "GOAL" as const, detail: "Normal Goal" },
              { minute: 32, team: "away", player: "Robson", type: "GOAL" as const, detail: "Normal Goal" },
              { minute: 45, team: "away", player: "Rômulo", type: "GOAL" as const, detail: "Normal Goal" },
              { minute: 56, team: "home", player: "Rafael Bilú", type: "GOAL" as const, detail: "Normal Goal" },
              { minute: 64, team: "home", player: "Avaí", type: "RED_CARD" as const, detail: "Direct Red" },
              { minute: 79, team: "away", player: "Leo Naldi", type: "GOAL" as const, detail: "Normal Goal" },
              { minute: 85, team: "away", player: "Novorizontino", type: "RED_CARD" as const, detail: "Direct Red" },
              { minute: 88, team: "home", player: "Paulo Vitor", type: "GOAL" as const, detail: "Normal Goal" },
            ],
          },
          {
            homeTeam: "Vila Nova",
            awayTeam: "Athletic",
            homeScore: 1,
            awayScore: 1,
            startTime: new Date("2026-05-04T20:00:00-03:00").getTime(),
            events: [
              { minute: 34, team: "home", player: "Dellatorre", type: "GOAL" as const, detail: "Normal Goal" },
              { minute: 69, team: "away", player: "Ian Luccas", type: "GOAL" as const, detail: "Normal Goal" },
              { minute: 78, team: "away", player: "Athletic", type: "RED_CARD" as const, detail: "Direct Red" },
            ],
          },
        ],
      },
      {
        roundName: "Rodada 8",
        matches: [
          {
            homeTeam: "Goiás",
            awayTeam: "Vila Nova",
            homeScore: 1,
            awayScore: 0,
            startTime: new Date("2026-05-09T16:00:00-03:00").getTime(),
            events: [
              { minute: 48, team: "home", player: "Goiás", type: "RED_CARD" as const, detail: "Direct Red" },
              { minute: 79, team: "home", player: "Anselmo Ramon", type: "GOAL" as const, detail: "Normal Goal" },
            ],
          },
          {
            homeTeam: "Athletic",
            awayTeam: "Cuiabá",
            homeScore: 0,
            awayScore: 0,
            startTime: new Date("2026-05-09T16:00:00-03:00").getTime(),
            events: [],
          },
          {
            homeTeam: "Ponte Preta",
            awayTeam: "Sport Recife",
            homeScore: 1,
            awayScore: 3,
            startTime: new Date("2026-05-09T18:30:00-03:00").getTime(),
            events: [
              { minute: 19, team: "away", player: "Pedro Perotti", type: "GOAL" as const, detail: "Normal Goal" },
              { minute: 42, team: "home", player: "Bryan Borges", type: "GOAL" as const, detail: "Normal Goal" },
              { minute: 61, team: "away", player: "Chrystian Barletta", type: "GOAL" as const, detail: "Normal Goal" },
              { minute: 70, team: "away", player: "Sport Recife", type: "RED_CARD" as const, detail: "Direct Red" },
              { minute: 83, team: "away", player: "Zé Roberto", type: "GOAL" as const, detail: "Normal Goal" },
            ],
          },
          {
            homeTeam: "Ceará",
            awayTeam: "Atlético-GO",
            homeScore: 0,
            awayScore: 1,
            startTime: new Date("2026-05-09T18:30:00-03:00").getTime(),
            events: [
              { minute: 54, team: "away", player: "Shaylon", type: "GOAL" as const, detail: "Normal Goal" },
              { minute: 76, team: "away", player: "Atlético-GO", type: "RED_CARD" as const, detail: "Direct Red" },
            ],
          },
          {
            homeTeam: "CRB",
            awayTeam: "Operário-PR",
            homeScore: 3,
            awayScore: 0,
            startTime: new Date("2026-05-09T20:30:00-03:00").getTime(),
            events: [
              { minute: 12, team: "away", player: "Mikael", type: "GOAL" as const, detail: "Normal Goal" },
              { minute: 44, team: "home", player: "Anselmo Ramon", type: "GOAL" as const, detail: "Normal Goal" },
              { minute: 73, team: "home", player: "João Neto", type: "GOAL" as const, detail: "Normal Goal" },
            ],
          },
          {
            homeTeam: "Juventude",
            awayTeam: "Criciúma",
            homeScore: 0,
            awayScore: 0,
            startTime: new Date("2026-05-09T20:30:00-03:00").getTime(),
            events: [],
          },
          {
            homeTeam: "Náutico",
            awayTeam: "América-MG",
            homeScore: 4,
            awayScore: 0,
            startTime: new Date("2026-05-10T16:00:00-03:00").getTime(),
            events: [
              { minute: 16, team: "home", player: "Vinícius", type: "GOAL" as const, detail: "Normal Goal" },
              { minute: 38, team: "home", player: "Wenderson", type: "GOAL" as const, detail: "Normal Goal" },
              { minute: 55, team: "home", player: "Vinícius", type: "GOAL" as const, detail: "Normal Goal" },
              { minute: 62, team: "away", player: "América-MG", type: "RED_CARD" as const, detail: "Direct Red" },
              { minute: 78, team: "home", player: "Dodô", type: "GOAL" as const, detail: "Normal Goal" },
            ],
          },
          {
            homeTeam: "Avaí",
            awayTeam: "Fortaleza",
            homeScore: 0,
            awayScore: 0,
            startTime: new Date("2026-05-10T16:00:00-03:00").getTime(),
            events: [
              { minute: 81, team: "away", player: "Fortaleza", type: "RED_CARD" as const, detail: "Direct Red" },
            ],
          },
          {
            homeTeam: "Novorizontino",
            awayTeam: "Botafogo-SP",
            homeScore: 1,
            awayScore: 0,
            startTime: new Date("2026-05-10T18:00:00-03:00").getTime(),
            events: [
              { minute: 47, team: "home", player: "Carlão", type: "GOAL" as const, detail: "Normal Goal" },
            ],
          },
          {
            homeTeam: "Londrina",
            awayTeam: "São Bernardo",
            homeScore: 1,
            awayScore: 3,
            startTime: new Date("2026-05-12T20:00:00-03:00").getTime(),
            events: [
              { minute: 15, team: "away", player: "Pará", type: "GOAL" as const, detail: "Normal Goal" },
              { minute: 31, team: "home", player: "Lucas Marques", type: "GOAL" as const, detail: "Normal Goal" },
              { minute: 52, team: "away", player: "Kayke", type: "GOAL" as const, detail: "Normal Goal" },
              { minute: 79, team: "away", player: "Alan Santos", type: "GOAL" as const, detail: "Normal Goal" },
            ],
          },
        ],
      },
    ];

    let totalMatchesInserted = 0;
    let totalEventsInserted = 0;

    for (const round of roundsData) {
      for (const m of round.matches) {
        const homeTeamDoc = getTeam(m.homeTeam);
        const awayTeamDoc = getTeam(m.awayTeam);

        const matchId = await ctx.db.insert("matches", {
          leagueId: serieB._id,
          round: round.roundName,
          homeTeamId: homeTeamDoc._id,
          awayTeamId: awayTeamDoc._id,
          status: "FINISHED",
          statusShort: "FT",
          minute: 90,
          homeScore: m.homeScore,
          awayScore: m.awayScore,
          startTime: m.startTime,
        });
        totalMatchesInserted++;

        for (const ev of m.events) {
          await ctx.db.insert("matchEvents", {
            matchId,
            minute: ev.minute,
            teamId: ev.team === "home" ? homeTeamDoc._id : awayTeamDoc._id,
            playerName: ev.player,
            type: ev.type,
            detail: ev.detail,
          });
          totalEventsInserted++;
        }
      }
    }

    // 5. Recalcula e atualiza a tabela de classificação oficial
    const allMatches = await ctx.db
      .query("matches")
      .withIndex("by_league", (q) => q.eq("leagueId", serieB._id))
      .collect();

    const finishedMatches = allMatches.filter((m) => m.status === "FINISHED");
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
      serieB.name
    );

    const oldStandings = await ctx.db
      .query("standings")
      .withIndex("by_league_rank", (q) => q.eq("leagueId", serieB._id))
      .collect();

    for (const r of oldStandings) await ctx.db.delete(r._id);

    for (const row of standingsList) {
      await ctx.db.insert("standings", {
        leagueId: serieB._id,
        season: serieB.season,
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

    return {
      success: true,
      league: serieB.name,
      matchesInserted: totalMatchesInserted,
      eventsInserted: totalEventsInserted,
      standingsUpdated: standingsList.length,
    };
  },
});

// Popula o ranking de artilheiros oficial do Brasileirão Série B conforme a fonte do GE
export const seedTopScorers = mutation({
  args: {},
  handler: async (ctx) => {
    // 1. Localiza a liga Série B
    let serieB = await ctx.db
      .query("leagues")
      .withIndex("by_externalId", (q) => q.eq("externalId", 72))
      .first();

    if (!serieB) {
      const allLeagues = await ctx.db.query("leagues").collect();
      serieB = allLeagues.find((l) => l.name.toLowerCase().includes("série b")) ?? null;
    }

    if (!serieB) {
      throw new Error("Campeonato Brasileirão Série B não encontrado.");
    }

    // 2. Limpa artilharia anterior da liga
    const existingScorers = await ctx.db
      .query("topScorers")
      .withIndex("by_league", (q) => q.eq("leagueId", serieB._id))
      .collect();
    for (const sc of existingScorers) {
      await ctx.db.delete(sc._id);
    }

    // 3. Busca todos os times para associação de escudo e id
    const allTeams = await ctx.db.query("teams").collect();
    const clean = (str: string) =>
      str
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[-_]/g, " ")
        .trim();

    const findTeam = (name: string) => {
      const target = clean(name);
      return (
        allTeams.find((t) => clean(t.name) === target) ||
        allTeams.find((t) => clean(t.name).includes(target) || target.includes(clean(t.name))) ||
        null
      );
    };

    // 4. Dados Oficiais de Artilharia (Fonte GE - Brasileirão Série B 2026)
    const officialScorers = [
      { rank: 1, playerName: "Mikael", teamName: "CRB", teamCode: "CRB", goals: 16, assists: 3, matches: 26 },
      { rank: 2, playerName: "Robson Fernandes", teamName: "Novorizontino", teamCode: "NOV", goals: 15, assists: 4, matches: 27 },
      { rank: 3, playerName: "Gustavo Coutinho", teamName: "Atlético-GO", teamCode: "ACG", goals: 13, assists: 2, matches: 24 },
      { rank: 4, playerName: "Gabriel Boschilia", teamName: "Operário-PR", teamCode: "OPE", goals: 12, assists: 5, matches: 25 },
      { rank: 5, playerName: "Bruno Santos", teamName: "Londrina", teamCode: "LON", goals: 11, assists: 1, matches: 23 },
      { rank: 6, playerName: "Perotti", teamName: "Sport", teamCode: "SPO", goals: 11, assists: 2, matches: 25 },
      { rank: 7, playerName: "Chrystian Barletta", teamName: "Sport", teamCode: "SPO", goals: 11, assists: 4, matches: 26 },
      { rank: 8, playerName: "Caio Dantas", teamName: "Operário-PR", teamCode: "OPE", goals: 10, assists: 1, matches: 22 },
      { rank: 9, playerName: "Shaylon", teamName: "Atlético-GO", teamCode: "ACG", goals: 9, assists: 6, matches: 25 },
      { rank: 10, playerName: "Lucas Lima", teamName: "Sport", teamCode: "SPO", goals: 9, assists: 7, matches: 27 },
    ];

    let inserted = 0;
    for (const sc of officialScorers) {
      const team = findTeam(sc.teamName);
      await ctx.db.insert("topScorers", {
        leagueId: serieB._id,
        rank: sc.rank,
        playerName: sc.playerName,
        teamId: team?._id,
        teamName: team?.name ?? sc.teamName,
        teamCode: team?.code ?? sc.teamCode,
        teamLogoUrl: team?.logoUrl,
        goals: sc.goals,
        assists: sc.assists,
        matches: sc.matches,
      });
      inserted++;
    }

    return {
      success: true,
      league: serieB.name,
      scorersInserted: inserted,
    };
  },
});

// ─── Rodadas 9 a 13 — Brasileirão Série B 2026 (Fonte: ge.globo.com) ───────
export const seedSerieBRounds9to13 = mutation({
  args: {},
  handler: async (ctx) => {
    // Localiza a liga Série B
    let serieB = await ctx.db
      .query("leagues")
      .withIndex("by_externalId", (q) => q.eq("externalId", 72))
      .first();

    if (!serieB) {
      const allLeagues = await ctx.db.query("leagues").collect();
      serieB = allLeagues.find((l) => l.name.toLowerCase().includes("série b")) ?? null;
    }

    if (!serieB) throw new Error("Liga Série B não encontrada. Execute seedGlobalLeagues primeiro.");

    const clean = (str: string) =>
      str
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[-_]/g, " ")
        .trim();

    const ALIASES: Record<string, string> = {
      "america mineiro": "america mg",
      "america-mg": "america mg",
      "athletic club": "athletic",
      "atletico goianiense": "atletico go",
      "atletico-go": "atletico go",
      "botafogo sp": "botafogo sp",
      "botafogo-sp": "botafogo sp",
      "operario pr": "operario pr",
      "operario-pr": "operario pr",
      "operario ferroviario": "operario pr",
      "sport recife": "sport",
    };

    const normalize = (s: string) => { const c = clean(s); return ALIASES[c] ?? c; };

    const allTeams = await ctx.db.query("teams").collect();

    const getOrCreate = async (name: string) => {
      const norm = normalize(name);
      let team = allTeams.find((t) => normalize(t.name) === norm);
      if (!team) {
        const id = await ctx.db.insert("teams", { name, logoUrl: "" });
        team = (await ctx.db.get(id))!;
        allTeams.push(team);
      }
      return team;
    };

    type MatchInput = {
      home: string;
      away: string;
      hs: number;
      as: number;
      date: string; // ISO
    };

    const rounds: { round: string; matches: MatchInput[] }[] = [
      {
        round: "Rodada 9",
        matches: [
          { home: "São Bernardo",  away: "América-MG",    hs: 1, as: 1, date: "2026-05-16T16:00:00-03:00" },
          { home: "Operário-PR",   away: "Náutico",       hs: 2, as: 6, date: "2026-05-16T16:00:00-03:00" },
          { home: "Goiás",         away: "Botafogo-SP",   hs: 1, as: 0, date: "2026-05-16T18:30:00-03:00" },
          { home: "Cuiabá",        away: "Novorizontino", hs: 0, as: 0, date: "2026-05-16T20:30:00-03:00" },
          { home: "Athletic",      away: "Juventude",     hs: 1, as: 1, date: "2026-05-17T16:00:00-03:00" },
          { home: "Vila Nova",     away: "Avaí",          hs: 2, as: 0, date: "2026-05-17T18:00:00-03:00" },
          { home: "Ceará",         away: "Fortaleza",     hs: 2, as: 1, date: "2026-05-17T18:30:00-03:00" },
          { home: "Criciúma",      away: "Atlético-GO",   hs: 1, as: 1, date: "2026-05-17T18:30:00-03:00" },
          { home: "Sport",         away: "CRB",           hs: 1, as: 2, date: "2026-05-17T20:30:00-03:00" },
          { home: "Ponte Preta",   away: "Londrina",      hs: 1, as: 4, date: "2026-05-18T19:00:00-03:00" },
        ],
      },
      {
        round: "Rodada 10",
        matches: [
          { home: "Náutico",       away: "Cuiabá",        hs: 1, as: 0, date: "2026-05-22T19:00:00-03:00" },
          { home: "Novorizontino", away: "Ceará",         hs: 2, as: 1, date: "2026-05-23T16:00:00-03:00" },
          { home: "Fortaleza",     away: "Londrina",      hs: 3, as: 0, date: "2026-05-23T18:30:00-03:00" },
          { home: "Juventude",     away: "Sport",         hs: 0, as: 1, date: "2026-05-23T20:30:00-03:00" },
          { home: "Atlético-GO",   away: "São Bernardo",  hs: 0, as: 1, date: "2026-05-24T16:00:00-03:00" },
          { home: "CRB",           away: "Ponte Preta",   hs: 4, as: 2, date: "2026-05-24T16:30:00-03:00" },
          { home: "América-MG",    away: "Vila Nova",     hs: 1, as: 2, date: "2026-05-24T18:30:00-03:00" },
          { home: "Avaí",          away: "Goiás",         hs: 0, as: 2, date: "2026-05-24T19:00:00-03:00" },
          { home: "Operário-PR",   away: "Criciúma",      hs: 1, as: 1, date: "2026-05-24T20:30:00-03:00" },
          { home: "Botafogo-SP",   away: "Athletic",      hs: 1, as: 2, date: "2026-05-25T19:00:00-03:00" },
        ],
      },
      {
        round: "Rodada 11",
        matches: [
          { home: "Juventude",     away: "América-MG",    hs: 3, as: 0, date: "2026-05-29T21:00:00-03:00" },
          { home: "Atlético-GO",   away: "Goiás",         hs: 1, as: 1, date: "2026-05-30T16:00:00-03:00" },
          { home: "Avaí",          away: "Criciúma",      hs: 1, as: 2, date: "2026-05-30T16:00:00-03:00" },
          { home: "Athletic",      away: "Fortaleza",     hs: 1, as: 0, date: "2026-05-30T18:00:00-03:00" },
          { home: "Sport",         away: "Náutico",       hs: 2, as: 0, date: "2026-05-30T20:30:00-03:00" },
          { home: "São Bernardo",  away: "Novorizontino", hs: 1, as: 1, date: "2026-05-31T11:00:00-03:00" },
          { home: "Londrina",      away: "Vila Nova",     hs: 0, as: 1, date: "2026-05-31T11:00:00-03:00" },
          { home: "Ceará",         away: "Operário-PR",   hs: 1, as: 2, date: "2026-05-31T16:00:00-03:00" },
          { home: "Cuiabá",        away: "CRB",           hs: 2, as: 0, date: "2026-05-31T20:30:00-03:00" },
          { home: "Ponte Preta",   away: "Botafogo-SP",   hs: 0, as: 0, date: "2026-06-01T19:00:00-03:00" },
        ],
      },
      {
        round: "Rodada 12",
        matches: [
          { home: "Operário-PR",   away: "Juventude",     hs: 2, as: 1, date: "2026-06-05T20:00:00-03:00" },
          { home: "Criciúma",      away: "Londrina",      hs: 1, as: 0, date: "2026-06-06T11:00:00-03:00" },
          { home: "CRB",           away: "São Bernardo",  hs: 2, as: 3, date: "2026-06-07T16:00:00-03:00" },
          { home: "América-MG",    away: "Atlético-GO",   hs: 1, as: 2, date: "2026-06-08T20:00:00-03:00" },
          { home: "Vila Nova",     away: "Botafogo-SP",   hs: 1, as: 0, date: "2026-06-08T20:00:00-03:00" },
          { home: "Ponte Preta",   away: "Cuiabá",        hs: 1, as: 2, date: "2026-06-09T19:00:00-03:00" },
          { home: "Náutico",       away: "Fortaleza",     hs: 0, as: 1, date: "2026-06-09T19:00:00-03:00" },
          { home: "Ceará",         away: "Avaí",          hs: 2, as: 1, date: "2026-06-10T20:00:00-03:00" },
          { home: "Goiás",         away: "Novorizontino", hs: 0, as: 4, date: "2026-06-10T20:00:00-03:00" },
          { home: "Sport",         away: "Athletic",      hs: 1, as: 1, date: "2026-06-10T21:00:00-03:00" },
        ],
      },
      {
        round: "Rodada 13",
        matches: [
          { home: "Atlético-GO",   away: "CRB",           hs: 3, as: 3, date: "2026-06-12T19:00:00-03:00" },
          { home: "São Bernardo",  away: "Sport",         hs: 0, as: 0, date: "2026-06-14T11:00:00-03:00" },
          { home: "Juventude",     away: "Ponte Preta",   hs: 3, as: 0, date: "2026-06-14T11:00:00-03:00" },
          { home: "Athletic",      away: "Goiás",         hs: 1, as: 1, date: "2026-06-14T16:00:00-03:00" },
          { home: "Cuiabá",        away: "Vila Nova",     hs: 1, as: 0, date: "2026-06-14T17:00:00-03:00" },
          { home: "Botafogo-SP",   away: "Operário-PR",   hs: 2, as: 1, date: "2026-06-14T19:00:00-03:00" },
          { home: "Novorizontino", away: "Náutico",       hs: 2, as: 2, date: "2026-06-14T19:00:00-03:00" },
          { home: "Londrina",      away: "Avaí",          hs: 3, as: 2, date: "2026-06-15T21:00:00-03:00" },
          { home: "Criciúma",      away: "Ceará",         hs: 1, as: 1, date: "2026-06-15T21:00:00-03:00" },
          { home: "Fortaleza",     away: "América-MG",    hs: 0, as: 3, date: "2026-06-16T20:00:00-03:00" },
        ],
      },
    ];

    let totalInserted = 0;

    for (const roundData of rounds) {
      // Remove partidas anteriores desta rodada para evitar duplicatas
      const existing = await ctx.db
        .query("matches")
        .withIndex("by_league_and_round", (q) => q.eq("leagueId", serieB!._id))
        .collect();

      const roundNum = roundData.round.replace(/\D/g, "");
      const toDelete = existing.filter(
        (m) =>
          m.round.toLowerCase() === roundData.round.toLowerCase() ||
          m.round.replace(/\D/g, "") === roundNum
      );

      for (const m of toDelete) {
        const events = await ctx.db
          .query("matchEvents")
          .withIndex("by_match", (q) => q.eq("matchId", m._id))
          .collect();
        for (const e of events) await ctx.db.delete(e._id);
        await ctx.db.delete(m._id);
      }

      // Insere as novas partidas
      for (const m of roundData.matches) {
        const homeTeam = await getOrCreate(m.home);
        const awayTeam = await getOrCreate(m.away);

        await ctx.db.insert("matches", {
          leagueId: serieB!._id,
          round: roundData.round,
          homeTeamId: homeTeam._id,
          awayTeamId: awayTeam._id,
          status: "FINISHED",
          statusShort: "FT",
          homeScore: m.hs,
          awayScore: m.as,
          startTime: new Date(m.date).getTime(),
        });

        totalInserted++;
      }
    }

    return {
      success: true,
      rounds: rounds.map((r) => r.round),
      totalMatches: totalInserted,
    };
  },
});

// ─── Rodadas 14 a 18 — Brasileirão Série B 2026 (Fonte: ge.globo.com) ───────
export const seedSerieBRounds14to18 = mutation({
  args: {},
  handler: async (ctx) => {
    let serieB = await ctx.db
      .query("leagues")
      .withIndex("by_externalId", (q) => q.eq("externalId", 72))
      .first();

    if (!serieB) {
      const allLeagues = await ctx.db.query("leagues").collect();
      serieB = allLeagues.find((l) => l.name.toLowerCase().includes("série b")) ?? null;
    }

    if (!serieB) throw new Error("Liga Série B não encontrada.");

    const clean = (str: string) =>
      str
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[-_]/g, " ")
        .trim();

    const ALIASES: Record<string, string> = {
      "america mineiro": "america mg",
      "america-mg": "america mg",
      "athletic club": "athletic",
      "atletico goianiense": "atletico go",
      "atletico-go": "atletico go",
      "botafogo sp": "botafogo sp",
      "botafogo-sp": "botafogo sp",
      "operario pr": "operario pr",
      "operario-pr": "operario pr",
      "operario ferroviario": "operario pr",
      "sport recife": "sport",
    };

    const normalize = (s: string) => { const c = clean(s); return ALIASES[c] ?? c; };

    const allTeams = await ctx.db.query("teams").collect();

    const getOrCreate = async (name: string) => {
      const norm = normalize(name);
      let team = allTeams.find((t) => normalize(t.name) === norm);
      if (!team) {
        const id = await ctx.db.insert("teams", { name, logoUrl: "" });
        team = (await ctx.db.get(id))!;
        allTeams.push(team);
      }
      return team;
    };

    type MatchInput = {
      home: string;
      away: string;
      hs: number;
      as: number;
      date: string; // ISO
    };

    const rounds: { round: string; matches: MatchInput[] }[] = [
      {
        round: "Rodada 14",
        matches: [
          { home: "Sport",         away: "Atlético-GO",   hs: 1, as: 1, date: "2026-06-18T21:00:00-03:00" },
          { home: "Londrina",      away: "Athletic",      hs: 2, as: 0, date: "2026-06-20T11:00:00-03:00" },
          { home: "Ceará",         away: "Botafogo-SP",   hs: 0, as: 1, date: "2026-06-20T19:00:00-03:00" },
          { home: "Vila Nova",     away: "Náutico",       hs: 4, as: 3, date: "2026-06-20T19:00:00-03:00" },
          { home: "Avaí",          away: "Cuiabá",        hs: 1, as: 0, date: "2026-06-21T11:00:00-03:00" },
          { home: "CRB",           away: "Fortaleza",     hs: 1, as: 1, date: "2026-06-21T16:00:00-03:00" },
          { home: "São Bernardo",  away: "Juventude",     hs: 0, as: 1, date: "2026-06-21T17:00:00-03:00" },
          { home: "Goiás",         away: "Operário-PR",   hs: 0, as: 3, date: "2026-06-21T18:30:00-03:00" },
          { home: "Ponte Preta",   away: "Novorizontino", hs: 0, as: 2, date: "2026-06-22T20:00:00-03:00" },
          { home: "América-MG",    away: "Criciúma",      hs: 0, as: 1, date: "2026-06-23T20:00:00-03:00" },
        ],
      },
      {
        round: "Rodada 15",
        matches: [
          { home: "Cuiabá",        away: "Londrina",      hs: 2, as: 2, date: "2026-06-25T20:30:00-03:00" },
          { home: "Novorizontino", away: "Vila Nova",     hs: 2, as: 1, date: "2026-06-26T19:00:00-03:00" },
          { home: "Operário-PR",   away: "América-MG",    hs: 1, as: 0, date: "2026-06-27T11:00:00-03:00" },
          { home: "Criciúma",      away: "São Bernardo",  hs: 1, as: 0, date: "2026-06-27T16:00:00-03:00" },
          { home: "Athletic",      away: "Avaí",          hs: 1, as: 0, date: "2026-06-28T16:00:00-03:00" },
          { home: "Atlético-GO",   away: "Ponte Preta",   hs: 2, as: 0, date: "2026-06-28T16:00:00-03:00" },
          { home: "Juventude",     away: "Ceará",         hs: 2, as: 0, date: "2026-06-28T16:00:00-03:00" },
          { home: "Fortaleza",     away: "Sport",         hs: 2, as: 1, date: "2026-06-28T18:30:00-03:00" },
          { home: "Náutico",       away: "Goiás",         hs: 0, as: 1, date: "2026-06-28T18:30:00-03:00" },
          { home: "Botafogo-SP",   away: "CRB",           hs: 0, as: 1, date: "2026-06-30T20:00:00-03:00" },
        ],
      },
      {
        round: "Rodada 16",
        matches: [
          { home: "Cuiabá",        away: "América-MG",    hs: 1, as: 0, date: "2026-07-02T20:00:00-03:00" },
          { home: "Fortaleza",     away: "Ponte Preta",   hs: 2, as: 0, date: "2026-07-02T21:00:00-03:00" },
          { home: "Novorizontino", away: "Atlético-GO",   hs: 3, as: 0, date: "2026-07-04T16:00:00-03:00" },
          { home: "Londrina",      away: "CRB",           hs: 5, as: 0, date: "2026-07-04T16:00:00-03:00" },
          { home: "Criciúma",      away: "Sport",         hs: 1, as: 0, date: "2026-07-04T16:00:00-03:00" },
          { home: "Goiás",         away: "Ceará",         hs: 2, as: 0, date: "2026-07-04T20:00:00-03:00" },
          { home: "Náutico",       away: "Juventude",     hs: 0, as: 0, date: "2026-07-05T20:30:00-03:00" },
          { home: "Botafogo-SP",   away: "Avaí",          hs: 3, as: 1, date: "2026-07-06T19:00:00-03:00" },
          { home: "Vila Nova",     away: "São Bernardo",  hs: 2, as: 1, date: "2026-07-06T19:00:00-03:00" },
          { home: "Athletic",      away: "Operário-PR",   hs: 0, as: 1, date: "2026-07-07T20:00:00-03:00" },
        ],
      },
      {
        round: "Rodada 17",
        matches: [
          { home: "Ponte Preta",   away: "Criciúma",      hs: 1, as: 2, date: "2026-07-08T20:00:00-03:00" },
          { home: "Juventude",     away: "Vila Nova",     hs: 1, as: 0, date: "2026-07-10T19:00:00-03:00" },
          { home: "Sport",         away: "Botafogo-SP",   hs: 3, as: 3, date: "2026-07-10T20:00:00-03:00" },
          { home: "Operário-PR",   away: "Novorizontino", hs: 2, as: 1, date: "2026-07-12T11:00:00-03:00" },
          { home: "São Bernardo",  away: "Cuiabá",        hs: 2, as: 2, date: "2026-07-12T16:00:00-03:00" },
          { home: "Avaí",          away: "Náutico",       hs: 2, as: 0, date: "2026-07-12T16:00:00-03:00" },
          { home: "Atlético-GO",   away: "Fortaleza",     hs: 1, as: 0, date: "2026-07-12T18:00:00-03:00" },
          { home: "CRB",           away: "Goiás",         hs: 2, as: 2, date: "2026-07-12T19:00:00-03:00" },
          { home: "América-MG",    away: "Londrina",      hs: 1, as: 1, date: "2026-07-13T19:00:00-03:00" },
          { home: "Ceará",         away: "Athletic",      hs: 0, as: 0, date: "2026-07-13T20:30:00-03:00" },
        ],
      },
      {
        round: "Rodada 18",
        matches: [
          { home: "CRB",           away: "Náutico",       hs: 2, as: 1, date: "2026-07-16T20:00:00-03:00" },
          { home: "São Bernardo",  away: "Avaí",          hs: 1, as: 1, date: "2026-07-17T19:00:00-03:00" },
          { home: "América-MG",    away: "Ceará",         hs: 1, as: 1, date: "2026-07-17T19:00:00-03:00" },
          { home: "Juventude",     away: "Cuiabá",        hs: 2, as: 0, date: "2026-07-17T19:00:00-03:00" },
          { home: "Londrina",      away: "Botafogo-SP",   hs: 0, as: 0, date: "2026-07-17T21:00:00-03:00" },
          { home: "Fortaleza",     away: "Novorizontino", hs: 1, as: 0, date: "2026-07-17T21:00:00-03:00" },
          { home: "Ponte Preta",   away: "Goiás",         hs: 1, as: 2, date: "2026-07-18T16:00:00-03:00" },
          { home: "Criciúma",      away: "Vila Nova",     hs: 2, as: 0, date: "2026-07-18T16:00:00-03:00" },
          { home: "Sport",         away: "Operário-PR",   hs: 2, as: 2, date: "2026-07-18T16:00:00-03:00" },
          { home: "Atlético-GO",   away: "Athletic",      hs: 0, as: 0, date: "2026-07-18T18:00:00-03:00" },
        ],
      },
    ];

    let totalInserted = 0;

    for (const roundData of rounds) {
      const existing = await ctx.db
        .query("matches")
        .withIndex("by_league_and_round", (q) => q.eq("leagueId", serieB!._id))
        .collect();

      const roundNum = roundData.round.replace(/\D/g, "");
      const toDelete = existing.filter(
        (m) =>
          m.round.toLowerCase() === roundData.round.toLowerCase() ||
          m.round.replace(/\D/g, "") === roundNum
      );

      for (const m of toDelete) {
        const events = await ctx.db
          .query("matchEvents")
          .withIndex("by_match", (q) => q.eq("matchId", m._id))
          .collect();
        for (const e of events) await ctx.db.delete(e._id);
        await ctx.db.delete(m._id);
      }

      for (const m of roundData.matches) {
        const homeTeam = await getOrCreate(m.home);
        const awayTeam = await getOrCreate(m.away);

        await ctx.db.insert("matches", {
          leagueId: serieB!._id,
          round: roundData.round,
          homeTeamId: homeTeam._id,
          awayTeamId: awayTeam._id,
          status: "FINISHED",
          statusShort: "FT",
          homeScore: m.hs,
          awayScore: m.as,
          startTime: new Date(m.date).getTime(),
        });

        totalInserted++;
      }
    }

    return {
      success: true,
      rounds: rounds.map((r) => r.round),
      totalMatches: totalInserted,
    };
  },
});

// ─── Rodadas 19 a 23 — Brasileirão Série B 2026 (Fonte: ge.globo.com) ───────
export const seedSerieBRounds19to23 = mutation({
  args: {},
  handler: async (ctx) => {
    let serieB = await ctx.db
      .query("leagues")
      .withIndex("by_externalId", (q) => q.eq("externalId", 72))
      .first();

    if (!serieB) {
      const allLeagues = await ctx.db.query("leagues").collect();
      serieB = allLeagues.find((l) => l.name.toLowerCase().includes("série b")) ?? null;
    }

    if (!serieB) throw new Error("Liga Série B não encontrada.");

    const clean = (str: string) =>
      str
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[-_]/g, " ")
        .trim();

    const ALIASES: Record<string, string> = {
      "america mineiro": "america mg",
      "america-mg": "america mg",
      "athletic club": "athletic",
      "atletico goianiense": "atletico go",
      "atletico-go": "atletico go",
      "botafogo sp": "botafogo sp",
      "botafogo-sp": "botafogo sp",
      "operario pr": "operario pr",
      "operario-pr": "operario pr",
      "operario ferroviario": "operario pr",
      "sport recife": "sport",
    };

    const normalize = (s: string) => { const c = clean(s); return ALIASES[c] ?? c; };

    const allTeams = await ctx.db.query("teams").collect();

    const getOrCreate = async (name: string) => {
      const norm = normalize(name);
      let team = allTeams.find((t) => normalize(t.name) === norm);
      if (!team) {
        const id = await ctx.db.insert("teams", { name, logoUrl: "" });
        team = (await ctx.db.get(id))!;
        allTeams.push(team);
      }
      return team;
    };

    const allStadiums = await ctx.db.query("stadiums").collect();
    const getOrCreateStadium = async (name: string) => {
      let stadium = allStadiums.find((s) => s.name.toLowerCase() === name.toLowerCase());
      if (!stadium) {
        const id = await ctx.db.insert("stadiums", { name, city: "Brasil", imageUrl: "" });
        stadium = (await ctx.db.get(id))!;
        allStadiums.push(stadium);
      }
      return stadium;
    };

    type MatchInput = {
      stadium: string;
      home: string;
      away: string;
      hs: number;
      as: number;
      date: string; // ISO
    };

    const rounds: { round: string; matches: MatchInput[] }[] = [
      {
        round: "Rodada 19",
        matches: [
          { stadium: "Jorge Ismael de Biasi",     home: "Novorizontino", away: "Criciúma",      hs: 0, as: 1, date: "2026-07-21T19:30:00-03:00" },
          { stadium: "Ressacada",                 home: "Avaí",          away: "América-MG",    hs: 2, as: 1, date: "2026-07-21T19:30:00-03:00" },
          { stadium: "OBA",                       home: "Vila Nova",     away: "Fortaleza",     hs: 2, as: 1, date: "2026-07-21T21:35:00-03:00" },
          { stadium: "Germano Krüger",            home: "Operário-PR",   away: "Ponte Preta",   hs: 3, as: 2, date: "2026-07-22T19:30:00-03:00" },
          { stadium: "Presidente Vargas (CE)",    home: "Ceará",         away: "CRB",           hs: 0, as: 1, date: "2026-07-22T19:30:00-03:00" },
          { stadium: "Hailé Pinheiro (Serrinha)", home: "Goiás",         away: "Sport",         hs: 1, as: 1, date: "2026-07-22T20:30:00-03:00" },
          { stadium: "Esportes da Sorte Aflitos", home: "Náutico",       away: "Londrina",      hs: 2, as: 1, date: "2026-07-22T21:30:00-03:00" },
          { stadium: "Arena Sicredi",             home: "Athletic Club", away: "São Bernardo",  hs: 2, as: 1, date: "2026-07-23T19:30:00-03:00" },
          { stadium: "Arena Pantanal",            home: "Cuiabá",        away: "Atlético-GO",   hs: 0, as: 1, date: "2026-07-23T20:30:00-03:00" },
          { stadium: "Arena Nicnet (Santa Cruz)", home: "Botafogo-SP",   away: "Juventude",     hs: 4, as: 2, date: "2026-07-23T21:30:00-03:00" },
        ],
      },
      {
        round: "Rodada 20",
        matches: [
          { stadium: "Primeiro de Maio", home: "São Bernardo",  away: "Ceará",         hs: 3, as: 4, date: "2026-07-26T16:00:00-03:00" },
          { stadium: "Heriberto Hülse",  home: "Criciúma",      away: "Náutico",       hs: 0, as: 0, date: "2026-07-26T16:00:00-03:00" },
          { stadium: "Independência",    home: "América-MG",    away: "Goiás",         hs: 1, as: 0, date: "2026-07-26T18:30:00-03:00" },
          { stadium: "VGD",              home: "Londrina",      away: "Novorizontino", hs: 1, as: 4, date: "2026-07-26T18:30:00-03:00" },
          { stadium: "Antônio Accioly",  home: "Atlético-GO",   away: "Operário-PR",   hs: 3, as: 1, date: "2026-07-27T19:30:00-03:00" },
          { stadium: "Ilha do Retiro",   home: "Sport",         away: "Cuiabá",        hs: 1, as: 1, date: "2026-07-27T19:30:00-03:00" },
          { stadium: "Rei Pelé (AL)",    home: "CRB",           away: "Vila Nova",     hs: 2, as: 0, date: "2026-07-27T19:30:00-03:00" },
          { stadium: "Moisés Lucarelli", home: "Ponte Preta",   away: "Athletic Club", hs: 1, as: 1, date: "2026-07-28T19:30:00-03:00" },
          { stadium: "Alfredo Jaconi",   home: "Juventude",     away: "Avaí",          hs: 1, as: 0, date: "2026-07-28T19:30:00-03:00" },
          { stadium: "Castelão (CE)",    home: "Fortaleza",     away: "Botafogo-SP",   hs: 1, as: 0, date: "2026-07-28T21:35:00-03:00" },
        ],
      },
      {
        round: "Rodada 21",
        matches: [
          { stadium: "Germano Krüger",            home: "Operário-PR",   away: "São Bernardo",  hs: 1, as: 3, date: "2026-08-07T19:30:00-03:00" },
          { stadium: "Castelão (CE)",             home: "Ceará",         away: "Ponte Preta",   hs: 2, as: 0, date: "2026-08-07T20:30:00-03:00" },
          { stadium: "OBA",                       home: "Vila Nova",     away: "Sport",         hs: 0, as: 1, date: "2026-08-08T16:00:00-03:00" },
          { stadium: "Arena Nicnet (Santa Cruz)", home: "Botafogo-SP",   away: "América-MG",    hs: 2, as: 1, date: "2026-08-08T18:30:00-03:00" },
          { stadium: "Arena Sicredi",             home: "Athletic Club", away: "Criciúma",      hs: 2, as: 0, date: "2026-08-09T11:00:00-03:00" },
          { stadium: "Jorge Ismael de Biasi",     home: "Novorizontino", away: "Juventude",     hs: 0, as: 1, date: "2026-08-09T16:00:00-03:00" },
          { stadium: "Esportes da Sorte Aflitos", home: "Náutico",       away: "Atlético-GO",   hs: 1, as: 1, date: "2026-08-09T16:00:00-03:00" },
          { stadium: "Arena Pantanal",            home: "Cuiabá",        away: "Fortaleza",     hs: 1, as: 1, date: "2026-08-09T18:00:00-03:00" },
          { stadium: "Hailé Pinheiro (Serrinha)", home: "Goiás",         away: "Londrina",      hs: 1, as: 0, date: "2026-08-10T19:30:00-03:00" },
          { stadium: "Ressacada",                 home: "Avaí",          away: "CRB",           hs: 0, as: 1, date: "2026-08-11T19:30:00-03:00" },
        ],
      },
      {
        round: "Rodada 22",
        matches: [
          { stadium: "Moisés Lucarelli", home: "Ponte Preta",   away: "Náutico",       hs: 1, as: 1, date: "2026-08-14T19:30:00-03:00" },
          { stadium: "Primeiro de Maio", home: "São Bernardo",  away: "Botafogo-SP",   hs: 0, as: 1, date: "2026-08-14T19:30:00-03:00" },
          { stadium: "Ilha do Retiro",   home: "Sport",         away: "Londrina",      hs: 2, as: 1, date: "2026-08-14T20:30:00-03:00" },
          { stadium: "Castelão (CE)",    home: "Ceará",         away: "Cuiabá",        hs: 1, as: 3, date: "2026-08-15T16:00:00-03:00" },
          { stadium: "Antônio Accioly",  home: "Atlético-GO",   away: "Vila Nova",     hs: 0, as: 2, date: "2026-08-15T16:00:00-03:00" },
          { stadium: "Heriberto Hülse",  home: "Criciúma",      away: "Goiás",         hs: 1, as: 0, date: "2026-08-15T16:00:00-03:00" },
          { stadium: "Alfredo Jaconi",   home: "Juventude",     away: "Fortaleza",     hs: 0, as: 0, date: "2026-08-15T18:30:00-03:00" },
          { stadium: "Germano Krüger",   home: "Operário-PR",   away: "Avaí",          hs: 1, as: 2, date: "2026-08-16T11:00:00-03:00" },
          { stadium: "Independência",    home: "América-MG",    away: "Athletic Club", hs: 1, as: 3, date: "2026-08-16T18:30:00-03:00" },
          { stadium: "Rei Pelé (AL)",    home: "CRB",           away: "Novorizontino", hs: 0, as: 0, date: "2026-08-16T18:30:00-03:00" },
        ],
      },
      {
        round: "Rodada 23",
        matches: [
          { stadium: "VGD",                       home: "Londrina",      away: "Atlético-GO",   hs: 0, as: 0, date: "2026-08-18T19:30:00-03:00" },
          { stadium: "Esportes da Sorte Aflitos", home: "Náutico",       away: "Ceará",         hs: 1, as: 0, date: "2026-08-18T21:30:00-03:00" },
          { stadium: "Hailé Pinheiro (Serrinha)", home: "Goiás",         away: "Juventude",     hs: 0, as: 1, date: "2026-08-18T21:35:00-03:00" },
          { stadium: "Castelão (CE)",             home: "Fortaleza",     away: "São Bernardo",  hs: 1, as: 1, date: "2026-08-19T19:30:00-03:00" },
          { stadium: "Ressacada",                 home: "Avaí",          away: "Sport",         hs: 2, as: 1, date: "2026-08-19T19:30:00-03:00" },
          { stadium: "Arena Pantanal",            home: "Cuiabá",        away: "Operário-PR",   hs: 1, as: 0, date: "2026-08-19T20:30:00-03:00" },
          { stadium: "OBA",                       home: "Vila Nova",     away: "Ponte Preta",   hs: 6, as: 0, date: "2026-08-19T20:30:00-03:00" },
          { stadium: "Arena Nicnet (Santa Cruz)", home: "Botafogo-SP",   away: "Criciúma",      hs: 1, as: 1, date: "2026-08-19T21:30:00-03:00" },
          { stadium: "Arena Sicredi",             home: "Athletic Club", away: "CRB",           hs: 0, as: 2, date: "2026-08-20T19:30:00-03:00" },
          { stadium: "Jorge Ismael de Biasi",     home: "Novorizontino", away: "América-MG",    hs: 3, as: 0, date: "2026-08-20T20:30:00-03:00" },
        ],
      },
    ];

    let totalInserted = 0;

    for (const roundData of rounds) {
      const existing = await ctx.db
        .query("matches")
        .withIndex("by_league_and_round", (q) => q.eq("leagueId", serieB!._id))
        .collect();

      const roundNum = roundData.round.replace(/\D/g, "");
      const toDelete = existing.filter(
        (m) =>
          m.round.toLowerCase() === roundData.round.toLowerCase() ||
          m.round.replace(/\D/g, "") === roundNum
      );

      for (const m of toDelete) {
        const events = await ctx.db
          .query("matchEvents")
          .withIndex("by_match", (q) => q.eq("matchId", m._id))
          .collect();
        for (const e of events) await ctx.db.delete(e._id);
        await ctx.db.delete(m._id);
      }

      for (const m of roundData.matches) {
        const homeTeam = await getOrCreate(m.home);
        const awayTeam = await getOrCreate(m.away);
        const stadiumDoc = await getOrCreateStadium(m.stadium);

        await ctx.db.insert("matches", {
          leagueId: serieB!._id,
          round: roundData.round,
          homeTeamId: homeTeam._id,
          awayTeamId: awayTeam._id,
          stadiumId: stadiumDoc._id,
          status: "FINISHED",
          statusShort: "FT",
          homeScore: m.hs,
          awayScore: m.as,
          startTime: new Date(m.date).getTime(),
        });

        totalInserted++;
      }
    }

    return {
      success: true,
      rounds: rounds.map((r) => r.round),
      totalMatches: totalInserted,
    };
  },
});

// ─── Rodadas 24 a 28 — Brasileirão Série B 2026 (Fonte: ge.globo.com) ───────
export const seedSerieBRounds24to28 = mutation({
  args: {},
  handler: async (ctx) => {
    let serieB = await ctx.db
      .query("leagues")
      .withIndex("by_externalId", (q) => q.eq("externalId", 72))
      .first();

    if (!serieB) {
      const allLeagues = await ctx.db.query("leagues").collect();
      serieB = allLeagues.find((l) => l.name.toLowerCase().includes("série b")) ?? null;
    }

    if (!serieB) throw new Error("Liga Série B não encontrada.");

    const clean = (str: string) =>
      str
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[-_]/g, " ")
        .trim();

    const ALIASES: Record<string, string> = {
      "america mineiro": "america mg",
      "america-mg": "america mg",
      "athletic club": "athletic",
      "atletico goianiense": "atletico go",
      "atletico-go": "atletico go",
      "botafogo sp": "botafogo sp",
      "botafogo-sp": "botafogo sp",
      "operario pr": "operario pr",
      "operario-pr": "operario pr",
      "operario ferroviario": "operario pr",
      "sport recife": "sport",
    };

    const normalize = (s: string) => { const c = clean(s); return ALIASES[c] ?? c; };

    const allTeams = await ctx.db.query("teams").collect();

    const getOrCreate = async (name: string) => {
      const norm = normalize(name);
      let team = allTeams.find((t) => normalize(t.name) === norm);
      if (!team) {
        const id = await ctx.db.insert("teams", { name, logoUrl: "" });
        team = (await ctx.db.get(id))!;
        allTeams.push(team);
      }
      return team;
    };

    const allStadiums = await ctx.db.query("stadiums").collect();
    const getOrCreateStadium = async (name: string) => {
      let stadium = allStadiums.find((s) => s.name.toLowerCase() === name.toLowerCase());
      if (!stadium) {
        const id = await ctx.db.insert("stadiums", { name, city: "Brasil", imageUrl: "" });
        stadium = (await ctx.db.get(id))!;
        allStadiums.push(stadium);
      }
      return stadium;
    };

    type MatchInput = {
      stadium: string;
      home: string;
      away: string;
      hs: number;
      as: number;
      date: string; // ISO
    };

    const rounds: { round: string; matches: MatchInput[] }[] = [
      {
        round: "Rodada 24",
        matches: [
          { stadium: "Castelão (CE)",             home: "Ceará",         away: "Londrina",      hs: 2, as: 1, date: "2026-08-22T18:00:00-03:00" },
          { stadium: "Arena Pantanal",            home: "Cuiabá",        away: "Goiás",         hs: 1, as: 1, date: "2026-08-22T18:30:00-03:00" },
          { stadium: "Moisés Lucarelli",          home: "Ponte Preta",   away: "Avaí",          hs: 0, as: 2, date: "2026-08-23T16:00:00-03:00" },
          { stadium: "Primeiro de Maio",          home: "São Bernardo",  away: "Náutico",       hs: 1, as: 1, date: "2026-08-23T16:00:00-03:00" },
          { stadium: "Germano Krüger",            home: "Operário-PR",   away: "Vila Nova",     hs: 0, as: 0, date: "2026-08-23T18:00:00-03:00" },
          { stadium: "Heriberto Hülse",           home: "Criciúma",      away: "Fortaleza",     hs: 0, as: 2, date: "2026-08-23T18:30:00-03:00" },
          { stadium: "Arena Sicredi",             home: "Athletic Club", away: "Novorizontino", hs: 1, as: 4, date: "2026-08-24T19:30:00-03:00" },
          { stadium: "Ilha do Retiro",            home: "Sport",         away: "América-MG",    hs: 3, as: 0, date: "2026-08-24T19:30:00-03:00" },
          { stadium: "Antônio Accioly",           home: "Atlético-GO",   away: "Botafogo-SP",   hs: 3, as: 0, date: "2026-08-25T19:30:00-03:00" },
          { stadium: "Alfredo Jaconi",            home: "Juventude",     away: "CRB",           hs: 2, as: 1, date: "2026-08-25T19:30:00-03:00" },
        ],
      },
      {
        round: "Rodada 25",
        matches: [
          { stadium: "Hailé Pinheiro (Serrinha)", home: "Goiás",         away: "São Bernardo",  hs: 2, as: 1, date: "2026-08-28T19:30:00-03:00" },
          { stadium: "Jorge Ismael de Biasi",     home: "Novorizontino", away: "Sport",         hs: 2, as: 1, date: "2026-08-28T20:30:00-03:00" },
          { stadium: "Esportes da Sorte Aflitos", home: "Náutico",       away: "Athletic Club", hs: 2, as: 1, date: "2026-08-28T20:30:00-03:00" },
          { stadium: "Arena Nicnet (Santa Cruz)", home: "Botafogo-SP",   away: "Cuiabá",        hs: 1, as: 2, date: "2026-08-29T18:30:00-03:00" },
          { stadium: "Independência",             home: "América-MG",    away: "Ponte Preta",   hs: 2, as: 0, date: "2026-08-30T16:00:00-03:00" },
          { stadium: "Ressacada",                 home: "Avaí",          away: "Atlético-GO",   hs: 0, as: 1, date: "2026-08-30T16:00:00-03:00" },
          { stadium: "Rei Pelé (AL)",             home: "CRB",           away: "Criciúma",      hs: 2, as: 1, date: "2026-08-30T18:00:00-03:00" },
          { stadium: "OBA",                       home: "Vila Nova",     away: "Ceará",         hs: 2, as: 0, date: "2026-08-30T18:30:00-03:00" },
          { stadium: "Castelão (CE)",             home: "Fortaleza",     away: "Operário-PR",   hs: 1, as: 1, date: "2026-08-31T19:30:00-03:00" },
          { stadium: "VGD",                       home: "Londrina",      away: "Juventude",     hs: 0, as: 0, date: "2026-09-01T19:30:00-03:00" },
        ],
      },
      {
        round: "Rodada 26",
        matches: [
          { stadium: "Esportes da Sorte Aflitos", home: "Náutico",       away: "Botafogo-SP",   hs: 1, as: 0, date: "2026-09-03T20:00:00-03:00" },
          { stadium: "Heriberto Hülse",           home: "Criciúma",      away: "Cuiabá",        hs: 2, as: 0, date: "2026-09-04T19:30:00-03:00" },
          { stadium: "Arena Sicredi",             home: "Athletic Club", away: "Vila Nova",     hs: 5, as: 0, date: "2026-09-04T20:30:00-03:00" },
          { stadium: "Rei Pelé (AL)",             home: "CRB",           away: "América-MG",    hs: 3, as: 1, date: "2026-09-04T21:30:00-03:00" },
          { stadium: "Jorge Ismael de Biasi",     home: "Novorizontino", away: "Avaí",          hs: 3, as: 1, date: "2026-09-05T16:00:00-03:00" },
          { stadium: "Hailé Pinheiro (Serrinha)", home: "Goiás",         away: "Fortaleza",     hs: 0, as: 1, date: "2026-09-05T16:00:00-03:00" },
          { stadium: "Alfredo Jaconi",            home: "Juventude",     away: "Atlético-GO",   hs: 2, as: 2, date: "2026-09-05T18:00:00-03:00" },
          { stadium: "Castelão (CE)",             home: "Ceará",         away: "Sport",         hs: 2, as: 1, date: "2026-09-05T18:30:00-03:00" },
          { stadium: "VGD",                       home: "Londrina",      away: "Operário-PR",   hs: 1, as: 2, date: "2026-09-06T11:00:00-03:00" },
          { stadium: "Moisés Lucarelli",          home: "Ponte Preta",   away: "São Bernardo",  hs: 0, as: 2, date: "2026-09-06T18:30:00-03:00" },
        ],
      },
      {
        round: "Rodada 27",
        matches: [
          { stadium: "Arena Pantanal",            home: "Cuiabá",        away: "Athletic Club", hs: 3, as: 0, date: "2026-09-08T20:30:00-03:00" },
          { stadium: "Heriberto Hülse",           home: "Criciúma",      away: "Juventude",     hs: 0, as: 2, date: "2026-09-08T21:00:00-03:00" },
          { stadium: "Arena Nicnet (Santa Cruz)", home: "Botafogo-SP",   away: "Novorizontino", hs: 1, as: 3, date: "2026-09-09T19:30:00-03:00" },
          { stadium: "Castelão (CE)",             home: "Fortaleza",     away: "Avaí",          hs: 1, as: 0, date: "2026-09-09T19:30:00-03:00" },
          { stadium: "Independência",             home: "América-MG",    away: "Náutico",       hs: 2, as: 1, date: "2026-09-09T20:30:00-03:00" },
          { stadium: "Germano Krüger",            home: "Operário-PR",   away: "CRB",           hs: 3, as: 0, date: "2026-09-09T20:30:00-03:00" },
          { stadium: "Antônio Accioly",           home: "Atlético-GO",   away: "Ceará",         hs: 2, as: 1, date: "2026-09-09T21:30:00-03:00" },
          { stadium: "Primeiro de Maio",          home: "São Bernardo",  away: "Londrina",      hs: 1, as: 2, date: "2026-09-10T19:30:00-03:00" },
          { stadium: "OBA",                       home: "Vila Nova",     away: "Goiás",         hs: 2, as: 0, date: "2026-09-10T19:30:00-03:00" },
          { stadium: "Ilha do Retiro",            home: "Sport",         away: "Ponte Preta",   hs: 2, as: 0, date: "2026-09-10T21:30:00-03:00" },
        ],
      },
      {
        round: "Rodada 28",
        matches: [
          { stadium: "Antônio Accioly",           home: "Atlético-GO",   away: "Criciúma",      hs: 4, as: 0, date: "2026-09-13T16:00:00-03:00" },
          { stadium: "Alfredo Jaconi",            home: "Juventude",     away: "Athletic Club", hs: 0, as: 2, date: "2026-09-13T18:00:00-03:00" },
          { stadium: "Jorge Ismael de Biasi",     home: "Novorizontino", away: "Cuiabá",        hs: 1, as: 1, date: "2026-09-13T18:30:00-03:00" },
          { stadium: "Castelão (CE)",             home: "Fortaleza",     away: "Ceará",         hs: 1, as: 1, date: "2026-09-13T18:30:00-03:00" },
          { stadium: "Arena Nicnet (Santa Cruz)", home: "Botafogo-SP",   away: "Goiás",         hs: 1, as: 3, date: "2026-09-14T19:30:00-03:00" },
          { stadium: "Independência",             home: "América-MG",    away: "São Bernardo",  hs: 0, as: 2, date: "2026-09-14T19:30:00-03:00" },
          { stadium: "Ressacada",                 home: "Avaí",          away: "Vila Nova",     hs: 1, as: 1, date: "2026-09-14T21:30:00-03:00" },
          { stadium: "VGD",                       home: "Londrina",      away: "Ponte Preta",   hs: 6, as: 0, date: "2026-09-15T19:30:00-03:00" },
          { stadium: "Esportes da Sorte Aflitos", home: "Náutico",       away: "Operário-PR",   hs: 3, as: 3, date: "2026-09-15T19:30:00-03:00" },
          { stadium: "Rei Pelé (AL)",             home: "CRB",           away: "Sport",         hs: 2, as: 1, date: "2026-09-15T21:00:00-03:00" },
        ],
      },
    ];

    let totalInserted = 0;

    for (const roundData of rounds) {
      const existing = await ctx.db
        .query("matches")
        .withIndex("by_league_and_round", (q) => q.eq("leagueId", serieB!._id))
        .collect();

      const roundNum = roundData.round.replace(/\D/g, "");
      const toDelete = existing.filter(
        (m) =>
          m.round.toLowerCase() === roundData.round.toLowerCase() ||
          m.round.replace(/\D/g, "") === roundNum
      );

      for (const m of toDelete) {
        const events = await ctx.db
          .query("matchEvents")
          .withIndex("by_match", (q) => q.eq("matchId", m._id))
          .collect();
        for (const e of events) await ctx.db.delete(e._id);
        await ctx.db.delete(m._id);
      }

      for (const m of roundData.matches) {
        const homeTeam = await getOrCreate(m.home);
        const awayTeam = await getOrCreate(m.away);
        const stadiumDoc = await getOrCreateStadium(m.stadium);

        await ctx.db.insert("matches", {
          leagueId: serieB!._id,
          round: roundData.round,
          homeTeamId: homeTeam._id,
          awayTeamId: awayTeam._id,
          stadiumId: stadiumDoc._id,
          status: "FINISHED",
          statusShort: "FT",
          homeScore: m.hs,
          awayScore: m.as,
          startTime: new Date(m.date).getTime(),
        });

        totalInserted++;
      }
    }

    return {
      success: true,
      rounds: rounds.map((r) => r.round),
      totalMatches: totalInserted,
    };
  },
});

// ─── Rodada 29 — Brasileirão Série B 2026 (Fonte: ge.globo.com) ─────────────
export const seedSerieBRound29 = mutation({
  args: {},
  handler: async (ctx) => {
    let serieB = await ctx.db
      .query("leagues")
      .withIndex("by_externalId", (q) => q.eq("externalId", 72))
      .first();

    if (!serieB) {
      const allLeagues = await ctx.db.query("leagues").collect();
      serieB = allLeagues.find((l) => l.name.toLowerCase().includes("série b")) ?? null;
    }

    if (!serieB) throw new Error("Liga Série B não encontrada.");

    const clean = (str: string) =>
      str
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[-_]/g, " ")
        .trim();

    const ALIASES: Record<string, string> = {
      "america mineiro": "america mg",
      "america-mg": "america mg",
      "athletic club": "athletic",
      "atletico goianiense": "atletico go",
      "atletico-go": "atletico go",
      "botafogo sp": "botafogo sp",
      "botafogo-sp": "botafogo sp",
      "operario pr": "operario pr",
      "operario-pr": "operario pr",
      "operario ferroviario": "operario pr",
      "sport recife": "sport",
    };

    const normalize = (s: string) => { const c = clean(s); return ALIASES[c] ?? c; };

    const allTeams = await ctx.db.query("teams").collect();

    const getOrCreate = async (name: string) => {
      const norm = normalize(name);
      let team = allTeams.find((t) => normalize(t.name) === norm);
      if (!team) {
        const id = await ctx.db.insert("teams", { name, logoUrl: "" });
        team = (await ctx.db.get(id))!;
        allTeams.push(team);
      }
      return team;
    };

    const allStadiums = await ctx.db.query("stadiums").collect();
    const getOrCreateStadium = async (name: string) => {
      let stadium = allStadiums.find((s) => s.name.toLowerCase() === name.toLowerCase());
      if (!stadium) {
        const id = await ctx.db.insert("stadiums", { name, city: "Brasil", imageUrl: "" });
        stadium = (await ctx.db.get(id))!;
        allStadiums.push(stadium);
      }
      return stadium;
    };

    type MatchInput = {
      stadium: string;
      home: string;
      away: string;
      hs: number;
      as: number;
      date: string; // ISO
      status: "FINISHED" | "SCHEDULED";
      statusShort: string;
    };

    const matches: MatchInput[] = [
      { stadium: "OBA",                       home: "Vila Nova",     away: "América-MG",    hs: 1, as: 0, date: "2026-09-18T19:30:00-03:00", status: "FINISHED",  statusShort: "FT" },
      { stadium: "Castelão (CE)",             home: "Ceará",         away: "Novorizontino", hs: 2, as: 1, date: "2026-09-18T20:30:00-03:00", status: "FINISHED",  statusShort: "FT" },
      { stadium: "Primeiro de Maio",          home: "São Bernardo",  away: "Atlético-GO",   hs: 1, as: 0, date: "2026-09-18T21:00:00-03:00", status: "FINISHED",  statusShort: "FT" },
      { stadium: "Ilha do Retiro",            home: "Sport",         away: "Juventude",     hs: 2, as: 1, date: "2026-09-19T16:30:00-03:00", status: "FINISHED",  statusShort: "FT" },
      { stadium: "Arena Sicredi",             home: "Athletic Club", away: "Botafogo-SP",   hs: 1, as: 1, date: "2026-09-19T18:30:00-03:00", status: "FINISHED",  statusShort: "FT" },
      { stadium: "Moisés Lucarelli",          home: "Ponte Preta",   away: "CRB",           hs: 1, as: 0, date: "2026-09-20T11:00:00-03:00", status: "FINISHED",  statusShort: "FT" },
      { stadium: "Hailé Pinheiro (Serrinha)", home: "Goiás",         away: "Avaí",          hs: 2, as: 1, date: "2026-09-20T16:00:00-03:00", status: "FINISHED",  statusShort: "FT" },
      { stadium: "VGD",                       home: "Londrina",      away: "Fortaleza",     hs: 1, as: 2, date: "2026-09-20T18:30:00-03:00", status: "FINISHED",  statusShort: "FT" },
      { stadium: "Arena Pantanal",            home: "Cuiabá",        away: "Náutico",       hs: 3, as: 0, date: "2026-09-21T21:30:00-03:00", status: "FINISHED",  statusShort: "FT" },
      { stadium: "Heriberto Hülse",           home: "Criciúma",      away: "Operário-PR",   hs: 0, as: 0, date: "2026-09-22T19:30:00-03:00", status: "SCHEDULED", statusShort: "19:30" },
    ];

    const existing = await ctx.db
      .query("matches")
      .withIndex("by_league_and_round", (q) => q.eq("leagueId", serieB!._id))
      .collect();

    const toDelete = existing.filter(
      (m) =>
        m.round.toLowerCase() === "rodada 29" ||
        m.round.replace(/\D/g, "") === "29"
    );

    for (const m of toDelete) {
      const events = await ctx.db
        .query("matchEvents")
        .withIndex("by_match", (q) => q.eq("matchId", m._id))
        .collect();
      for (const e of events) await ctx.db.delete(e._id);
      await ctx.db.delete(m._id);
    }

    let totalInserted = 0;
    for (const m of matches) {
      const homeTeam = await getOrCreate(m.home);
      const awayTeam = await getOrCreate(m.away);
      const stadiumDoc = await getOrCreateStadium(m.stadium);

      await ctx.db.insert("matches", {
        leagueId: serieB!._id,
        round: "Rodada 29",
        homeTeamId: homeTeam._id,
        awayTeamId: awayTeam._id,
        stadiumId: stadiumDoc._id,
        status: m.status,
        statusShort: m.statusShort,
        homeScore: m.hs,
        awayScore: m.as,
        startTime: new Date(m.date).getTime(),
      });

      totalInserted++;
    }

    return {
      success: true,
      round: "Rodada 29",
      totalMatches: totalInserted,
    };
  },
});

// Limpeza Imediata de duplicatas e registros com "Regular Season"
export const cleanupDuplicateMatches = mutation({
  args: {},
  handler: async (ctx) => {
    const allMatches = await ctx.db.query("matches").collect();
    const removed: any[] = [];
    const normalized: any[] = [];

    // 1. Remove qualquer partida cujo round contenha "Regular Season"
    for (const m of allMatches) {
      if (m.round && /Regular\s+Season/i.test(m.round)) {
        // Remove eventos vinculados
        const events = await ctx.db
          .query("matchEvents")
          .withIndex("by_match", (q) => q.eq("matchId", m._id))
          .collect();
        for (const ev of events) {
          await ctx.db.delete(ev._id);
        }

        // Remove estatísticas vinculadas
        const stats = await ctx.db
          .query("matchStatistics")
          .withIndex("by_match", (q) => q.eq("matchId", m._id))
          .collect();
        for (const st of stats) {
          await ctx.db.delete(st._id);
        }

        await ctx.db.delete(m._id);
        removed.push({
          id: m._id,
          round: m.round,
          reason: "Regular Season round",
        });
      } else {
        const normRound = normalizeRoundName(m.round);
        if (normRound !== m.round) {
          await ctx.db.patch(m._id, { round: normRound });
          normalized.push({ id: m._id, old: m.round, new: normRound });
        }
      }
    }

    // 2. Remove partidas conflitantes onde um time jogaria 2 vezes na mesma rodada/dia
    const remainingMatches = await ctx.db.query("matches").collect();
    const duplicateRemoved: any[] = [];
    const leagueRounds = new Map<string, typeof remainingMatches[0]>();

    for (const m of remainingMatches) {
      const keyHome = `${m.leagueId}_${m.round}_${m.homeTeamId}`;
      const keyAway = `${m.leagueId}_${m.round}_${m.awayTeamId}`;

      const existingHome = leagueRounds.get(keyHome);
      const existingAway = leagueRounds.get(keyAway);
      const conflict = existingHome || existingAway;

      if (conflict && conflict._id !== m._id) {
        // Prioriza o registro com estádio cadastrado e com status oficial
        const mScore = (m.stadiumId ? 10 : 0) + (m.externalId ? 5 : 0);
        const conflictScore = (conflict.stadiumId ? 10 : 0) + (conflict.externalId ? 5 : 0);

        if (mScore > conflictScore) {
          await ctx.db.delete(conflict._id);
          duplicateRemoved.push({
            id: conflict._id,
            round: conflict.round,
            reason: "Duplicate clash in round",
          });
          leagueRounds.set(keyHome, m);
          leagueRounds.set(keyAway, m);
        } else {
          await ctx.db.delete(m._id);
          duplicateRemoved.push({
            id: m._id,
            round: m.round,
            reason: "Duplicate clash in round",
          });
        }
      } else {
        leagueRounds.set(keyHome, m);
        leagueRounds.set(keyAway, m);
      }
    }

    return {
      success: true,
      removedRegularSeasonCount: removed.length,
      removedRegularSeason: removed,
      duplicateRemovedCount: duplicateRemoved.length,
      duplicateRemoved,
      normalizedCount: normalized.length,
    };
  },
});

// Query para auditoria dos jogos da Série B e verificação da Grade de Hoje
export const checkSerieBMatches = query({
  args: {},
  handler: async (ctx) => {
    const serieB = await ctx.db
      .query("leagues")
      .filter((q) => q.eq(q.field("name"), "Brasileirão Série B"))
      .first();
    if (!serieB) return { error: "Série B não encontrada" };

    const matches = await ctx.db
      .query("matches")
      .withIndex("by_league", (q) => q.eq("leagueId", serieB._id))
      .collect();

    const teamsMap = new Map<string, string>();
    const teams = await ctx.db.query("teams").collect();
    for (const t of teams) {
      teamsMap.set(t._id, t.name);
    }

    const todayStart = new Date(2026, 8, 22, 0, 0, 0, 0).getTime();
    const todayEnd = new Date(2026, 8, 22, 23, 59, 59, 999).getTime();

    const todayMatches = matches
      .filter((m) => m.startTime >= todayStart && m.startTime <= todayEnd)
      .map((m) => ({
        id: m._id,
        round: m.round,
        home: teamsMap.get(m.homeTeamId),
        away: teamsMap.get(m.awayTeamId),
        status: m.status,
        startTime: new Date(m.startTime).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" }),
        externalId: m.externalId,
      }));

    const regularSeasonMatches = matches
      .filter((m) => m.round.includes("Regular Season"))
      .map((m) => ({
        id: m._id,
        round: m.round,
        home: teamsMap.get(m.homeTeamId),
        away: teamsMap.get(m.awayTeamId),
      }));

    return {
      totalSerieBMatches: matches.length,
      todayMatches,
      regularSeasonMatches,
    };
  },
});



