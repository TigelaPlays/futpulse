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