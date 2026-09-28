import { mutation } from "./_generated/server";

export const runSeed = mutation({
  handler: async (ctx) => {
    // 1. Limpa dados anteriores do Brasileirão para evitar duplicações
    let league = await ctx.db
      .query("leagues")
      .filter((q) =>
        q.or(
          q.eq(q.field("code"), "BSA"),
          q.eq(q.field("name"), "Brasileirão Betano"),
          q.eq(q.field("name"), "Brasileirão Série A")
        )
      )
      .first();

    if (!league) {
      const leagueId = await ctx.db.insert("leagues", {
        name: "Brasileirão Betano",
        code: "BSA",
        country: "Brasil",
        logoUrl: "https://img.sofascore.com/api/v1/unique-tournament/325/image",
        season: 2026,
        type: "league",
        priority: 1,
        format: "round_robin",
        currentStage: "Rodada 1",
      });
      league = (await ctx.db.get(leagueId))!;
    } else {
      await ctx.db.patch(league._id, {
        name: "Brasileirão Betano",
        code: "BSA",
        country: "Brasil",
        logoUrl: "https://img.sofascore.com/api/v1/unique-tournament/325/image",
        season: 2026,
        type: "league",
        priority: 1,
        format: "round_robin",
        currentStage: "Rodada 1",
      });
    }

    // 2. Cadastro dos 20 Clubes
    const clubsData = [
      { name: "Atlético-MG", shortName: "Atlético-MG", code: "CAM", externalId: 1977 },
      { name: "Palmeiras", shortName: "Palmeiras", code: "PAL", externalId: 1963 },
      { name: "Coritiba", shortName: "Coritiba", code: "CFC", externalId: 1982 },
      { name: "RB Bragantino", shortName: "Bragantino", code: "RBB", externalId: 1999 },
      { name: "Internacional", shortName: "Inter", code: "INT", externalId: 1966 },
      { name: "Athletico", shortName: "Athletico-PR", code: "CAP", externalId: 1967 },
      { name: "Vitória", shortName: "Vitória", code: "VIT", externalId: 1983 },
      { name: "Remo", shortName: "Remo", code: "REM", externalId: 2003 },
      { name: "Fluminense", shortName: "Fluminense", code: "FLU", externalId: 1961 },
      { name: "Grêmio", shortName: "Grêmio", code: "GRE", externalId: 5926 },
      { name: "Chapecoense", shortName: "Chapecoense", code: "CHA", externalId: 2011 },
      { name: "Santos", shortName: "Santos", code: "SAN", externalId: 1968 },
      { name: "Corinthians", shortName: "Corinthians", code: "COR", externalId: 1957 },
      { name: "Bahia", shortName: "Bahia", code: "BAH", externalId: 1955 },
      { name: "São Paulo", shortName: "São Paulo", code: "SAO", externalId: 1981 },
      { name: "Flamengo", shortName: "Flamengo", code: "FLA", externalId: 5981 },
      { name: "Mirassol", shortName: "Mirassol", code: "MIR", externalId: 31221 },
      { name: "Vasco", shortName: "Vasco", code: "VAS", externalId: 1974 },
      { name: "Botafogo", shortName: "Botafogo", code: "BOT", externalId: 1958 },
      { name: "Cruzeiro", shortName: "Cruzeiro", code: "CRU", externalId: 1954 },
    ];

    const teamMap: Record<string, any> = {};

    for (const c of clubsData) {
      let team = await ctx.db
        .query("teams")
        .filter((q) =>
          q.or(
            q.eq(q.field("name"), c.name),
            q.eq(q.field("shortName"), c.shortName),
            q.eq(q.field("externalId"), c.externalId)
          )
        )
        .first();

      const logoUrl = `https://img.sofascore.com/api/v1/team/${c.externalId}/image`;

      if (!team) {
        const teamId = await ctx.db.insert("teams", {
          name: c.name,
          shortName: c.shortName,
          code: c.code,
          logoUrl,
          externalId: c.externalId,
        });
        team = (await ctx.db.get(teamId))!;
      } else {
        await ctx.db.patch(team._id, {
          name: c.name,
          shortName: c.shortName,
          code: c.code,
          logoUrl,
          externalId: c.externalId,
        });
      }
      teamMap[c.name] = team;
    }

    // 3. Cadastro dos Estádios vinculados aos mandantes
    const stadiumsData = [
      { name: "Arena MRV", city: "Belo Horizonte (MG)", teamName: "Atlético-MG" },
      { name: "Couto Pereira", city: "Curitiba (PR)", teamName: "Coritiba" },
      { name: "Beira-Rio", city: "Porto Alegre (RS)", teamName: "Internacional" },
      { name: "Barradão", city: "Salvador (BA)", teamName: "Vitória" },
      { name: "Maracanã", city: "Rio de Janeiro (RJ)", teamName: "Fluminense" },
      { name: "Arena Condá", city: "Chapecó (SC)", teamName: "Chapecoense" },
      { name: "Neo Química Arena", city: "São Paulo (SP)", teamName: "Corinthians" },
      { name: "MorumBIS", city: "São Paulo (SP)", teamName: "São Paulo" },
      { name: "Maião", city: "Mirassol (SP)", teamName: "Mirassol" },
      { name: "Nilton Santos (Engenhão)", city: "Rio de Janeiro (RJ)", teamName: "Botafogo" },
      { name: "Allianz Parque", city: "São Paulo (SP)", teamName: "Palmeiras" },
      { name: "Vila Belmiro", city: "Santos (SP)", teamName: "Santos" },
    ];

    const stadiumMap: Record<string, any> = {};

    for (const s of stadiumsData) {
      const hostTeam = teamMap[s.teamName];
      let stadium = await ctx.db
        .query("stadiums")
        .filter((q) => q.eq(q.field("name"), s.name))
        .first();

      if (!stadium) {
        const stadiumId = await ctx.db.insert("stadiums", {
          name: s.name,
          city: s.city,
          imageUrl: `https://images.unsplash.com/photo-1508098682722-e99c43a406b2?auto=format&fit=crop&w=800&q=80`,
          teamId: hostTeam?._id,
        });
        stadium = (await ctx.db.get(stadiumId))!;
      }
      stadiumMap[s.name] = stadium;
    }

    // 4. Limpa partidas anteriores da liga para evitar duplicidade
    const oldMatches = await ctx.db
      .query("matches")
      .withIndex("by_league", (q) => q.eq("leagueId", league._id))
      .collect();

    for (const m of oldMatches) {
      const events = await ctx.db
        .query("matchEvents")
        .withIndex("by_match", (q) => q.eq("matchId", m._id))
        .collect();
      for (const ev of events) await ctx.db.delete(ev._id);

      const stats = await ctx.db
        .query("matchStatistics")
        .withIndex("by_match", (q) => q.eq("matchId", m._id))
        .collect();
      for (const st of stats) await ctx.db.delete(st._id);

      await ctx.db.delete(m._id);
    }

    // 5. Cadastra as 10 Partidas da 1ª Rodada (Conforme o anexo)
    const now = Date.now();
    const todayBase = new Date();
    todayBase.setHours(16, 0, 0, 0);

    const yesterday = new Date(todayBase);
    yesterday.setDate(yesterday.getDate() - 1);

    const tomorrow = new Date(todayBase);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const matchesConfig = [
      // 1. Atlético-MG 2 x 2 Palmeiras (FINISHED)
      {
        home: "Atlético-MG",
        away: "Palmeiras",
        homeScore: 2,
        awayScore: 2,
        status: "FINISHED" as const,
        statusShort: "FT",
        stadiumName: "Arena MRV",
        startTime: yesterday.getTime(),
        events: [
          { minute: 24, type: "GOAL" as const, isHome: true, playerName: "Hulk" },
          { minute: 35, type: "GOAL" as const, isHome: false, playerName: "Raphael Veiga", detail: "Pênalti" },
          { minute: 58, type: "GOAL" as const, isHome: true, playerName: "Paulinho" },
          { minute: 72, type: "GOAL" as const, isHome: false, playerName: "Flaco López" },
          { minute: 81, type: "YELLOW_CARD" as const, isHome: true, playerName: "Otávio" },
        ],
        stats: {
          homePossession: 48,
          awayPossession: 52,
          homeShotsOnTarget: 5,
          awayShotsOnTarget: 6,
          homeTotalShots: 13,
          awayTotalShots: 15,
          homeCorners: 6,
          awayCorners: 5,
          homeFouls: 12,
          awayFouls: 14,
        },
      },
      // 2. Coritiba 0 x 1 RB Bragantino (FINISHED - com Cartão Vermelho para Coritiba)
      {
        home: "Coritiba",
        away: "RB Bragantino",
        homeScore: 0,
        awayScore: 1,
        status: "FINISHED" as const,
        statusShort: "FT",
        stadiumName: "Couto Pereira",
        startTime: yesterday.getTime() + 1000 * 60 * 30,
        events: [
          { minute: 42, type: "RED_CARD" as const, isHome: true, playerName: "Robson", detail: "Falta violenta" },
          { minute: 67, type: "GOAL" as const, isHome: false, playerName: "Eduardo Sasha" },
          { minute: 88, type: "YELLOW_CARD" as const, isHome: false, playerName: "Jadsom" },
        ],
        stats: {
          homePossession: 39,
          awayPossession: 61,
          homeShotsOnTarget: 2,
          awayShotsOnTarget: 7,
          homeTotalShots: 8,
          awayTotalShots: 18,
          homeCorners: 3,
          awayCorners: 8,
          homeFouls: 16,
          awayFouls: 10,
        },
      },
      // 3. Internacional 0 x 1 Athletico (FINISHED)
      {
        home: "Internacional",
        away: "Athletico",
        homeScore: 0,
        awayScore: 1,
        status: "FINISHED" as const,
        statusShort: "FT",
        stadiumName: "Beira-Rio",
        startTime: yesterday.getTime() + 1000 * 60 * 60,
        events: [
          { minute: 84, type: "GOAL" as const, isHome: false, playerName: "Nikão" },
          { minute: 71, type: "YELLOW_CARD" as const, isHome: true, playerName: "Thiago Maia" },
        ],
        stats: {
          homePossession: 55,
          awayPossession: 45,
          homeShotsOnTarget: 4,
          awayShotsOnTarget: 3,
          homeTotalShots: 14,
          awayTotalShots: 9,
          homeCorners: 7,
          awayCorners: 4,
          homeFouls: 11,
          awayFouls: 13,
        },
      },
      // 4. Vitória 2 x 0 Remo (FINISHED)
      {
        home: "Vitória",
        away: "Remo",
        homeScore: 2,
        awayScore: 0,
        status: "FINISHED" as const,
        statusShort: "FT",
        stadiumName: "Barradão",
        startTime: yesterday.getTime() + 1000 * 60 * 90,
        events: [
          { minute: 19, type: "GOAL" as const, isHome: true, playerName: "Alerrandro" },
          { minute: 61, type: "GOAL" as const, isHome: true, playerName: "Matheuzinho" },
        ],
        stats: {
          homePossession: 58,
          awayPossession: 42,
          homeShotsOnTarget: 6,
          awayShotsOnTarget: 2,
          homeTotalShots: 16,
          awayTotalShots: 7,
          homeCorners: 5,
          awayCorners: 3,
          homeFouls: 14,
          awayFouls: 15,
        },
      },
      // 5. Fluminense 2 x 1 Grêmio (FINISHED)
      {
        home: "Fluminense",
        away: "Grêmio",
        homeScore: 2,
        awayScore: 1,
        status: "FINISHED" as const,
        statusShort: "FT",
        stadiumName: "Maracanã",
        startTime: yesterday.getTime() + 1000 * 60 * 120,
        events: [
          { minute: 12, type: "GOAL" as const, isHome: true, playerName: "Paulo Henrique Ganso" },
          { minute: 45, type: "GOAL" as const, isHome: false, playerName: "Martin Braithwaite" },
          { minute: 78, type: "GOAL" as const, isHome: true, playerName: "Jhon Arias" },
        ],
        stats: {
          homePossession: 62,
          awayPossession: 38,
          homeShotsOnTarget: 7,
          awayShotsOnTarget: 3,
          homeTotalShots: 15,
          awayTotalShots: 8,
          homeCorners: 8,
          awayCorners: 2,
          homeFouls: 9,
          awayFouls: 17,
        },
      },
      // 6. Chapecoense 4 x 2 Santos (FINISHED)
      {
        home: "Chapecoense",
        away: "Santos",
        homeScore: 4,
        awayScore: 2,
        status: "FINISHED" as const,
        statusShort: "FT",
        stadiumName: "Arena Condá",
        startTime: yesterday.getTime() + 1000 * 60 * 150,
        events: [
          { minute: 8, type: "GOAL" as const, isHome: true, playerName: "Mário Sérgio" },
          { minute: 22, type: "GOAL" as const, isHome: false, playerName: "Giuliano" },
          { minute: 34, type: "GOAL" as const, isHome: true, playerName: "Mário Sérgio" },
          { minute: 51, type: "GOAL" as const, isHome: true, playerName: "Rafael Carvalheira" },
          { minute: 68, type: "GOAL" as const, isHome: true, playerName: "Mário Sérgio" },
          { minute: 80, type: "GOAL" as const, isHome: false, playerName: "Guilherme" },
        ],
        stats: {
          homePossession: 44,
          awayPossession: 56,
          homeShotsOnTarget: 8,
          awayShotsOnTarget: 6,
          homeTotalShots: 14,
          awayTotalShots: 17,
          homeCorners: 4,
          awayCorners: 9,
          homeFouls: 13,
          awayFouls: 11,
        },
      },
      // 7. Corinthians 1 x 2 Bahia (FINISHED - com Cartão Vermelho para Bahia)
      {
        home: "Corinthians",
        away: "Bahia",
        homeScore: 1,
        awayScore: 2,
        status: "FINISHED" as const,
        statusShort: "FT",
        stadiumName: "Neo Química Arena",
        startTime: yesterday.getTime() + 1000 * 60 * 180,
        events: [
          { minute: 15, type: "GOAL" as const, isHome: false, playerName: "Jean Lucas" },
          { minute: 31, type: "GOAL" as const, isHome: true, playerName: "Yuri Alberto" },
          { minute: 64, type: "GOAL" as const, isHome: false, playerName: "Cauly" },
          { minute: 75, type: "RED_CARD" as const, isHome: false, playerName: "Everton Ribeiro", detail: "Segundo amarelo" },
        ],
        stats: {
          homePossession: 54,
          awayPossession: 46,
          homeShotsOnTarget: 5,
          awayShotsOnTarget: 4,
          homeTotalShots: 18,
          awayTotalShots: 11,
          homeCorners: 7,
          awayCorners: 3,
          homeFouls: 12,
          awayFouls: 15,
        },
      },
      // 8. São Paulo 2 x 1 Flamengo (FINISHED - com Cartão Vermelho para Flamengo)
      {
        home: "São Paulo",
        away: "Flamengo",
        homeScore: 2,
        awayScore: 1,
        status: "FINISHED" as const,
        statusShort: "FT",
        stadiumName: "MorumBIS",
        startTime: yesterday.getTime() + 1000 * 60 * 210,
        events: [
          { minute: 28, type: "GOAL" as const, isHome: true, playerName: "Jonathan Calleri" },
          { minute: 40, type: "GOAL" as const, isHome: false, playerName: "Pedro" },
          { minute: 55, type: "GOAL" as const, isHome: true, playerName: "Lucas Moura" },
          { minute: 82, type: "RED_CARD" as const, isHome: false, playerName: "Gerson", detail: "Revisão do VAR" },
        ],
        stats: {
          homePossession: 47,
          awayPossession: 53,
          homeShotsOnTarget: 6,
          awayShotsOnTarget: 5,
          homeTotalShots: 12,
          awayTotalShots: 14,
          homeCorners: 4,
          awayCorners: 6,
          homeFouls: 18,
          awayFouls: 16,
        },
      },
      // 9. Mirassol 2 x 1 Vasco (IN_PLAY / LIVE - 74' minutos)
      {
        home: "Mirassol",
        away: "Vasco",
        homeScore: 2,
        awayScore: 1,
        status: "IN_PLAY" as const,
        statusShort: "2T",
        minute: 74,
        stadiumName: "Maião",
        startTime: now - 74 * 60 * 1000,
        elapsedSecondsUpdatedAt: now,
        events: [
          { minute: 21, type: "GOAL" as const, isHome: true, playerName: "Dellatorre" },
          { minute: 38, type: "GOAL" as const, isHome: false, playerName: "Pablo Vegetti" },
          { minute: 52, type: "GOAL" as const, isHome: true, playerName: "Chico Kim" },
          { minute: 60, type: "YELLOW_CARD" as const, isHome: false, playerName: "Hugo Moura" },
        ],
        stats: {
          homePossession: 50,
          awayPossession: 50,
          homeShotsOnTarget: 4,
          awayShotsOnTarget: 4,
          homeTotalShots: 10,
          awayTotalShots: 11,
          homeCorners: 5,
          awayCorners: 5,
          homeFouls: 10,
          awayFouls: 12,
        },
      },
      // 10. Botafogo x Cruzeiro (SCHEDULED - Agendada para hoje às 21:30)
      {
        home: "Botafogo",
        away: "Cruzeiro",
        homeScore: 0,
        awayScore: 0,
        status: "SCHEDULED" as const,
        statusShort: "21:30",
        stadiumName: "Nilton Santos (Engenhão)",
        startTime: new Date(todayBase.getFullYear(), todayBase.getMonth(), todayBase.getDate(), 21, 30).getTime(),
        events: [],
        stats: null,
      },
    ];

    let insertedMatchesCount = 0;

    for (const m of matchesConfig) {
      const homeTeam = teamMap[m.home];
      const awayTeam = teamMap[m.away];
      const stadium = stadiumMap[m.stadiumName];

      const matchId = await ctx.db.insert("matches", {
        leagueId: league._id,
        round: "Rodada 1",
        stage: "Fase Única",
        homeTeamId: homeTeam._id,
        awayTeamId: awayTeam._id,
        stadiumId: stadium?._id,
        homeScore: m.homeScore,
        awayScore: m.awayScore,
        status: m.status,
        statusShort: m.statusShort,
        minute: (m as any).minute,
        startTime: m.startTime,
        elapsedSecondsUpdatedAt: (m as any).elapsedSecondsUpdatedAt,
      });

      // Cadastra eventos
      for (const ev of m.events) {
        await ctx.db.insert("matchEvents", {
          matchId,
          minute: ev.minute,
          teamId: ev.isHome ? homeTeam._id : awayTeam._id,
          playerName: ev.playerName,
          type: ev.type,
          detail: (ev as { detail?: string }).detail,
        });
      }

      // Cadastra estatísticas
      if (m.stats) {
        await ctx.db.insert("matchStatistics", {
          matchId,
          ...m.stats,
        });
      }

      insertedMatchesCount++;
    }

    // 6. Cadastra Artilheiros Iniciais (tabela topScorers)
    const oldScorers = await ctx.db
      .query("topScorers")
      .withIndex("by_league", (q) => q.eq("leagueId", league._id))
      .collect();
    for (const sc of oldScorers) await ctx.db.delete(sc._id);

    const topScorersData = [
      { rank: 1, playerName: "Mário Sérgio", teamName: "Chapecoense", goals: 3, assists: 0, matches: 1, penalties: 0 },
      { rank: 2, playerName: "Hulk", teamName: "Atlético-MG", goals: 1, assists: 1, matches: 1, penalties: 0 },
      { rank: 3, playerName: "Jonathan Calleri", teamName: "São Paulo", goals: 1, assists: 0, matches: 1, penalties: 0 },
      { rank: 4, playerName: "Yuri Alberto", teamName: "Corinthians", goals: 1, assists: 0, matches: 1, penalties: 0 },
      { rank: 5, playerName: "Pedro", teamName: "Flamengo", goals: 1, assists: 0, matches: 1, penalties: 0 },
      { rank: 6, playerName: "Raphael Veiga", teamName: "Palmeiras", goals: 1, assists: 0, matches: 1, penalties: 1 },
      { rank: 7, playerName: "Eduardo Sasha", teamName: "RB Bragantino", goals: 1, assists: 0, matches: 1, penalties: 0 },
      { rank: 8, playerName: "Nikão", teamName: "Athletico", goals: 1, assists: 0, matches: 1, penalties: 0 },
      { rank: 9, playerName: "Alerrandro", teamName: "Vitória", goals: 1, assists: 0, matches: 1, penalties: 0 },
      { rank: 10, playerName: "Martin Braithwaite", teamName: "Grêmio", goals: 1, assists: 0, matches: 1, penalties: 0 },
    ];

    for (const sc of topScorersData) {
      const team = teamMap[sc.teamName];
      await ctx.db.insert("topScorers", {
        leagueId: league._id,
        rank: sc.rank,
        playerName: sc.playerName,
        teamId: team?._id,
        teamName: sc.teamName,
        teamCode: team?.code,
        teamLogoUrl: team?.logoUrl,
        goals: sc.goals,
        assists: sc.assists,
        matches: sc.matches,
        penalties: sc.penalties,
      });
    }

    return {
      success: true,
      leagueId: league._id,
      leagueName: league.name,
      teamsCount: clubsData.length,
      stadiumsCount: stadiumsData.length,
      matchesCount: insertedMatchesCount,
      topScorersCount: topScorersData.length,
    };
  },
});

export { seedNationsLeague } from "./seedNations";
