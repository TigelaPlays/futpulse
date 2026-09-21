import { mutation } from "./_generated/server";
import { v } from "convex/values";

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

    // Limpa registros anteriores para não duplicar
    const existing = await ctx.db
      .query("standings")
      .withIndex("by_league_season", (q) =>
        q.eq("leagueId", serieB._id).eq("season", 2026)
      )
      .collect();

    for (const r of existing) {
      await ctx.db.delete(r._id);
    }

    // Dados oficiais extraídos do Sofascore
    const realStandings = [
      { id: 155, rank: 1, name: "Vila Nova", j: 29, v: 15, e: 6, d: 8, sg: 10, gf: 41, ga: 31, form: "WLWDW", pts: 51, logo: "https://media.api-sports.io/football/teams/155.png" },
      { id: 154, rank: 2, name: "Fortaleza", j: 29, v: 14, e: 9, d: 6, sg: 9, gf: 33, ga: 24, form: "DWWDW", pts: 51, logo: "https://media.api-sports.io/football/teams/154.png" },
      { id: 145, rank: 3, name: "Novorizontino", j: 29, v: 14, e: 8, d: 7, sg: 22, gf: 49, ga: 27, form: "WWWDL", pts: 50, logo: "https://media.api-sports.io/football/teams/145.png" },
      { id: 152, rank: 4, name: "Juventude", j: 29, v: 14, e: 8, d: 7, sg: 12, gf: 31, ga: 19, form: "DDWLL", pts: 50, logo: "https://media.api-sports.io/football/teams/152.png" },
      { id: 142, rank: 5, name: "Criciúma", j: 28, v: 13, e: 8, d: 7, sg: 3, gf: 28, ga: 25, form: "LLWLL", pts: 47, logo: "https://media.api-sports.io/football/teams/142.png" },
      { id: 148, rank: 6, name: "Atlético-GO", j: 29, v: 12, e: 10, d: 7, sg: 9, gf: 36, ga: 27, form: "WDWWL", pts: 46, logo: "https://media.api-sports.io/football/teams/148.png" },
      { id: 132, rank: 7, name: "CRB", j: 29, v: 13, e: 6, d: 10, sg: 1, gf: 42, ga: 41, form: "WWLWL", pts: 45, logo: "https://media.api-sports.io/football/teams/132.png" },
      { id: 151, rank: 8, name: "Operário-PR", j: 28, v: 12, e: 8, d: 8, sg: 3, gf: 39, ga: 36, form: "DDWWD", pts: 44, logo: "https://media.api-sports.io/football/teams/151.png" },
      { id: 138, rank: 9, name: "Sport Recife", j: 29, v: 11, e: 11, d: 7, sg: 10, gf: 39, ga: 29, form: "LLWLW", pts: 44, logo: "https://media.api-sports.io/football/teams/138.png" },
      { id: 134, rank: 10, name: "Goiás", j: 29, v: 12, e: 6, d: 11, sg: -5, gf: 30, ga: 35, form: "WLLWW", pts: 42, logo: "https://media.api-sports.io/football/teams/134.png" },
      { id: 10255, rank: 11, name: "São Bernardo", j: 29, v: 11, e: 8, d: 10, sg: 9, gf: 40, ga: 31, form: "LWLWW", pts: 41, logo: "https://media.api-sports.io/football/teams/10255.png" },
      { id: 10265, rank: 12, name: "Athletic", j: 29, v: 10, e: 11, d: 8, sg: 3, gf: 34, ga: 31, form: "LWLWD", pts: 41, logo: "https://media.api-sports.io/football/teams/10265.png" },
      { id: 136, rank: 13, name: "Cuiabá", j: 28, v: 9, e: 13, d: 6, sg: 5, gf: 27, ga: 22, form: "DWLWD", pts: 40, logo: "https://media.api-sports.io/football/teams/136.png" },
      { id: 150, rank: 14, name: "Náutico", j: 28, v: 10, e: 8, d: 10, sg: 2, gf: 35, ga: 33, form: "DWWLD", pts: 38, logo: "https://media.api-sports.io/football/teams/150.png" },
      { id: 129, rank: 15, name: "Ceará", j: 29, v: 9, e: 8, d: 12, sg: -6, gf: 31, ga: 37, form: "LWLDW", pts: 35, logo: "https://media.api-sports.io/football/teams/129.png" },
      { id: 140, rank: 16, name: "Botafogo-SP", j: 29, v: 8, e: 8, d: 13, sg: -4, gf: 32, ga: 36, form: "LLLLD", pts: 32, logo: "https://media.api-sports.io/football/teams/140.png" },
      { id: 123, rank: 17, name: "Avaí", j: 29, v: 8, e: 6, d: 15, sg: -8, gf: 30, ga: 38, form: "LLLDL", pts: 30, logo: "https://media.api-sports.io/football/teams/123.png" },
      { id: 139, rank: 18, name: "Londrina", j: 29, v: 7, e: 7, d: 15, sg: -2, gf: 39, ga: 41, form: "DLWWL", pts: 28, logo: "https://media.api-sports.io/football/teams/139.png" },
      { id: 120, rank: 19, name: "América-MG", j: 29, v: 4, e: 5, d: 20, sg: -28, gf: 21, ga: 49, form: "WLWLL", pts: 17, logo: "https://media.api-sports.io/football/teams/120.png" },
      { id: 147, rank: 20, name: "Ponte Preta", j: 29, v: 3, e: 4, d: 22, sg: -45, gf: 17, ga: 62, form: "LLLLW", pts: 13, logo: "https://media.api-sports.io/football/teams/147.png" },
    ];

    for (const item of realStandings) {
      const externalId =
        item.id ||
        parseInt(item.logo.split("/").pop()?.replace(/\D/g, "") || "0", 10);

      let team = await ctx.db
        .query("teams")
        .withIndex("by_externalId", (q) => q.eq("externalId", externalId))
        .first();

      if (!team) {
        team = await ctx.db
          .query("teams")
          .filter((q) => q.eq(q.field("name"), item.name))
          .first();
      }

      if (!team) {
        const teamId = await ctx.db.insert("teams", {
          name: item.name,
          logoUrl: item.logo,
          externalId: externalId,
        });
        team = await ctx.db.get(teamId);
      } else if (!team.logoUrl) {
        await ctx.db.patch(team._id, { logoUrl: item.logo });
      }

      if (team) {
        await ctx.db.insert("standings", {
          leagueId: serieB._id,
          season: 2026,
          rank: item.rank,
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