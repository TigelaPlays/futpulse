import { mutation } from "./_generated/server";
import type { Id } from "./_generated/dataModel";

export const seedNationsLeague = mutation({
  args: {},
  handler: async (ctx) => {
    // 1. Criar/Garantir a liga UEFA Nations League
    let unl = await ctx.db
      .query("leagues")
      .filter((q) =>
        q.or(
          q.eq(q.field("externalId"), 10783),
          q.eq(q.field("code"), "UNL"),
          q.eq(q.field("name"), "UEFA Nations League")
        )
      )
      .first();

    if (!unl) {
      const unlId = await ctx.db.insert("leagues", {
        name: "UEFA Nations League",
        code: "UNL",
        country: "Europa",
        logoUrl: "https://img.sofascore.com/api/v1/unique-tournament/10783/image",
        season: 2026,
        type: "cup",
        format: "group_knockout",
        currentStage: "Fase de Grupos - Rodada 1",
        priority: 2,
        externalId: 10783,
      });
      unl = (await ctx.db.get(unlId))!;
    } else {
      await ctx.db.patch(unl._id, {
        name: "UEFA Nations League",
        code: "UNL",
        country: "Europa",
        logoUrl: "https://img.sofascore.com/api/v1/unique-tournament/10783/image",
        format: "group_knockout",
        currentStage: "Fase de Grupos - Rodada 1",
        type: "cup",
        priority: 2,
        season: 2026,
        externalId: 10783,
      });
      unl = (await ctx.db.get(unl._id))!;
    }

    // 2. Seleções Nacionais Europeias Participantes e Estádios Padrão
    const unlTeamsDefs = [
      { name: "Holanda", englishName: "Netherlands", shortName: "Holanda", code: "NED", externalId: 4705, logoUrl: "https://img.sofascore.com/api/v1/team/4705/image", stadium: "Johan Cruyff Arena", city: "Amsterdã" },
      { name: "Alemanha", englishName: "Germany", shortName: "Alemanha", code: "GER", externalId: 4711, logoUrl: "https://img.sofascore.com/api/v1/team/4711/image", stadium: "Allianz Arena", city: "Munique" },
      { name: "Sérvia", englishName: "Serbia", shortName: "Sérvia", code: "SRB", externalId: 6355, logoUrl: "https://img.sofascore.com/api/v1/team/6355/image", stadium: "Stadion Rajko Mitić", city: "Belgrado" },
      { name: "Grécia", englishName: "Greece", shortName: "Grécia", code: "GRE", externalId: 4710, logoUrl: "https://img.sofascore.com/api/v1/team/4710/image", stadium: "OPAP Arena", city: "Atenas" },
      { name: "Noruega", englishName: "Norway", shortName: "Noruega", code: "NOR", externalId: 4475, logoUrl: "https://img.sofascore.com/api/v1/team/4475/image", stadium: "Ullevaal Stadion", city: "Oslo" },
      { name: "Dinamarca", englishName: "Denmark", shortName: "Dinamarca", code: "DEN", externalId: 4476, logoUrl: "https://img.sofascore.com/api/v1/team/4476/image", stadium: "Parken Stadium", city: "Copenhague" },
      { name: "Portugal", englishName: "Portugal", shortName: "Portugal", code: "POR", externalId: 4704, logoUrl: "https://img.sofascore.com/api/v1/team/4704/image", stadium: "Estádio José Alvalade", city: "Lisboa" },
      { name: "País de Gales", englishName: "Wales", shortName: "Gales", code: "WAL", externalId: 4702, logoUrl: "https://img.sofascore.com/api/v1/team/4702/image", stadium: "Cardiff City Stadium", city: "Cardiff" },
      { name: "Áustria", englishName: "Austria", shortName: "Áustria", code: "AUT", externalId: 4718, logoUrl: "https://img.sofascore.com/api/v1/team/4718/image", stadium: "Ernst-Happel-Stadion", city: "Viena" },
      { name: "Israel", englishName: "Israel", shortName: "Israel", code: "ISR", externalId: 4480, logoUrl: "https://img.sofascore.com/api/v1/team/4480/image", stadium: "Bloomfield Stadium", city: "Tel Aviv" },
      { name: "Kosovo", englishName: "Kosovo", shortName: "Kosovo", code: "KOS", externalId: 154426, logoUrl: "https://img.sofascore.com/api/v1/team/154426/image", stadium: "Fadil Vokrri Stadium", city: "Pristina" },
      { name: "Irlanda", englishName: "Ireland", shortName: "Irlanda", code: "IRE", externalId: 4693, logoUrl: "https://img.sofascore.com/api/v1/team/4693/image", stadium: "Aviva Stadium", city: "Dublin" },
      { name: "Liechtenstein", englishName: "Liechtenstein", shortName: "Liechtenstein", code: "LIE", externalId: 4830, logoUrl: "https://img.sofascore.com/api/v1/team/4830/image", stadium: "Rheinpark Stadion", city: "Vaduz" },
      { name: "Lituânia", englishName: "Lithuania", shortName: "Lituânia", code: "LTU", externalId: 4776, logoUrl: "https://img.sofascore.com/api/v1/team/4776/image", stadium: "Darius and Girėnas Stadium", city: "Kaunas" },
      { name: "Andorra", englishName: "Andorra", shortName: "Andorra", code: "AND", externalId: 4818, logoUrl: "https://img.sofascore.com/api/v1/team/4818/image", stadium: "Estadi Nacional", city: "Andorra la Vella" },
      { name: "Malta", englishName: "Malta", shortName: "Malta", code: "MLT", externalId: 4483, logoUrl: "https://img.sofascore.com/api/v1/team/4483/image", stadium: "Ta' Qali National Stadium", city: "Ta' Qali" },
      { name: "Espanha", englishName: "Spain", shortName: "Espanha", code: "ESP", externalId: 4698, logoUrl: "https://img.sofascore.com/api/v1/team/4698/image", stadium: "Santiago Bernabéu", city: "Madri" },
      { name: "França", englishName: "France", shortName: "França", code: "FRA", externalId: 4481, logoUrl: "https://img.sofascore.com/api/v1/team/4481/image", stadium: "Stade de France", city: "Saint-Denis" },
      { name: "Itália", englishName: "Italy", shortName: "Itália", code: "ITA", externalId: 4707, logoUrl: "https://img.sofascore.com/api/v1/team/4707/image", stadium: "Stadio Olimpico", city: "Roma" },
      { name: "Inglaterra", englishName: "England", shortName: "Inglaterra", code: "ENG", externalId: 4717, logoUrl: "https://img.sofascore.com/api/v1/team/4717/image", stadium: "Wembley Stadium", city: "Londres" },
      { name: "Bélgica", englishName: "Belgium", shortName: "Bélgica", code: "BEL", externalId: 4715, logoUrl: "https://img.sofascore.com/api/v1/team/4715/image", stadium: "King Baudouin Stadium", city: "Bruxelas" },
      { name: "Croácia", englishName: "Croatia", shortName: "Croácia", code: "CRO", externalId: 4700, logoUrl: "https://img.sofascore.com/api/v1/team/4700/image", stadium: "Stadion Maksimir", city: "Zagreb" },
    ];

    const allExistingTeams = await ctx.db.query("teams").collect();
    const allExistingStadiums = await ctx.db.query("stadiums").collect();

    const teamMap = new Map<string, Id<"teams">>();
    const stadiumMap = new Map<string, Id<"stadiums">>();

    for (const t of unlTeamsDefs) {
      let team =
        allExistingTeams.find((tm) => tm.externalId === t.externalId) ||
        allExistingTeams.find(
          (tm) =>
            tm.name.toLowerCase() === t.name.toLowerCase() ||
            tm.name.toLowerCase() === t.englishName.toLowerCase()
        );

      let teamId: Id<"teams">;
      if (!team) {
        teamId = await ctx.db.insert("teams", {
          name: t.name,
          shortName: t.shortName,
          code: t.code,
          externalId: t.externalId,
          logoUrl: t.logoUrl,
        });
      } else {
        await ctx.db.patch(team._id, {
          name: t.name,
          shortName: t.shortName,
          code: t.code,
          externalId: t.externalId,
          logoUrl: team.logoUrl || t.logoUrl,
        });
        teamId = team._id;
      }
      teamMap.set(t.name, teamId);
      teamMap.set(t.englishName, teamId);

      // Estádio oficial
      let stadium = allExistingStadiums.find(
        (st) => st.name.toLowerCase() === t.stadium.toLowerCase()
      );

      if (!stadium) {
        const stId = await ctx.db.insert("stadiums", {
          name: t.stadium,
          city: t.city,
          imageUrl: "",
          teamId,
        });
        stadium = (await ctx.db.get(stId))!;
        allExistingStadiums.push(stadium);
      } else {
        await ctx.db.patch(stadium._id, {
          city: t.city,
          teamId,
        });
      }
      stadiumMap.set(t.name, stadium._id);
    }

    // 3. Confrontos da Rodada 1 da UEFA Nations League
    const round1Matches = [
      {
        externalId: 15534057,
        home: "Holanda",
        away: "Alemanha",
        group: "Liga A, Grupo 2",
        status: "LIVE" as const,
        statusShort: "HT",
        minute: 45,
        homeScore: 0,
        awayScore: 1,
        startTime: 1790275500 * 1000,
        events: [
          { minute: 38, team: "away" as const, type: "GOAL" as const, player: "Florian Wirtz" },
          { minute: 42, team: "home" as const, type: "YELLOW_CARD" as const, player: "Virgil van Dijk" },
        ],
      },
      {
        externalId: 15534071,
        home: "Sérvia",
        away: "Grécia",
        group: "Liga A, Grupo 2",
        status: "LIVE" as const,
        statusShort: "HT",
        minute: 45,
        homeScore: 1,
        awayScore: 0,
        startTime: 1790275500 * 1000,
        events: [
          { minute: 29, team: "home" as const, type: "GOAL" as const, player: "Aleksandar Mitrović" },
        ],
      },
      {
        externalId: 15534100,
        home: "Noruega",
        away: "Dinamarca",
        group: "Liga A, Grupo 4",
        status: "LIVE" as const,
        statusShort: "HT",
        minute: 45,
        homeScore: 2,
        awayScore: 1,
        startTime: 1790275500 * 1000,
        events: [
          { minute: 14, team: "home" as const, type: "GOAL" as const, player: "Erling Haaland" },
          { minute: 31, team: "away" as const, type: "GOAL" as const, player: "Rasmus Højlund" },
          { minute: 41, team: "home" as const, type: "GOAL" as const, player: "Alexander Sørloth" },
        ],
      },
      {
        externalId: 15534097,
        home: "Portugal",
        away: "País de Gales",
        group: "Liga A, Grupo 4",
        status: "LIVE" as const,
        statusShort: "HT",
        minute: 45,
        homeScore: 1,
        awayScore: 0,
        startTime: 1790275500 * 1000,
        events: [
          { minute: 45, team: "home" as const, type: "GOAL" as const, player: "João Félix" },
        ],
      },
      {
        externalId: 15534155,
        home: "Áustria",
        away: "Israel",
        group: "Liga B, Grupo 3",
        status: "LIVE" as const,
        statusShort: "HT",
        minute: 45,
        homeScore: 1,
        awayScore: 0,
        startTime: 1790275500 * 1000,
        events: [
          { minute: 22, team: "home" as const, type: "GOAL" as const, player: "Marcel Sabitzer" },
        ],
      },
      {
        externalId: 15534165,
        home: "Kosovo",
        away: "Irlanda",
        group: "Liga B, Grupo 3",
        status: "LIVE" as const,
        statusShort: "HT",
        minute: 45,
        homeScore: 0,
        awayScore: 0,
        startTime: 1790275500 * 1000,
        events: [],
      },
      {
        externalId: 15534241,
        home: "Liechtenstein",
        away: "Lituânia",
        group: "Liga D, Grupo 2",
        status: "LIVE" as const,
        statusShort: "HT",
        minute: 45,
        homeScore: 0,
        awayScore: 0,
        startTime: 1790275500 * 1000,
        events: [],
      },
      {
        externalId: 15537726,
        home: "Andorra",
        away: "Malta",
        group: "Liga D, Grupo 1",
        status: "FINISHED" as const,
        statusShort: "FT",
        minute: 90,
        homeScore: 1,
        awayScore: 2,
        startTime: 1790265600 * 1000,
        events: [
          { minute: 18, team: "home" as const, type: "GOAL" as const, player: "Ricard Fernández" },
          { minute: 34, team: "away" as const, type: "GOAL" as const, player: "Teddy Teuma" },
          { minute: 76, team: "away" as const, type: "GOAL" as const, player: "Luke Montebello" },
        ],
      },
    ];

    const existingUnlMatches = await ctx.db
      .query("matches")
      .withIndex("by_league", (q) => q.eq("leagueId", unl!._id))
      .collect();

    let matchesInserted = 0;
    let matchesUpdated = 0;

    for (const m of round1Matches) {
      const homeId = teamMap.get(m.home)!;
      const awayId = teamMap.get(m.away)!;
      const stadiumId = stadiumMap.get(m.home);

      const existingMatch = existingUnlMatches.find(
        (em) =>
          em.externalId === m.externalId ||
          (em.round === "Rodada 1" &&
            em.homeTeamId === homeId &&
            em.awayTeamId === awayId)
      );

      let matchId: Id<"matches">;
      if (!existingMatch) {
        matchId = await ctx.db.insert("matches", {
          externalId: m.externalId,
          leagueId: unl!._id,
          homeTeamId: homeId,
          awayTeamId: awayId,
          stadiumId,
          homeScore: m.homeScore,
          awayScore: m.awayScore,
          round: "Rodada 1",
          stage: "Fase de Grupos",
          group: m.group,
          status: m.status,
          statusShort: m.statusShort,
          minute: m.minute,
          startTime: m.startTime,
        });
        matchesInserted++;
      } else {
        matchId = existingMatch._id;
        await ctx.db.patch(matchId, {
          externalId: m.externalId,
          stadiumId,
          homeScore: m.homeScore,
          awayScore: m.awayScore,
          round: "Rodada 1",
          stage: "Fase de Grupos",
          group: m.group,
          status: m.status,
          statusShort: m.statusShort,
          minute: m.minute,
          startTime: m.startTime,
        });
        matchesUpdated++;
      }

      // Sincroniza eventos iniciais (idempotente)
      const oldEvents = await ctx.db
        .query("matchEvents")
        .withIndex("by_match", (q) => q.eq("matchId", matchId))
        .collect();
      for (const ev of oldEvents) await ctx.db.delete(ev._id);

      for (const ev of m.events) {
        const teamId = ev.team === "home" ? homeId : awayId;
        await ctx.db.insert("matchEvents", {
          matchId,
          minute: ev.minute,
          teamId,
          type: ev.type,
          playerName: ev.player,
        });
      }
    }

    return {
      success: true,
      league: {
        id: unl._id,
        name: unl.name,
        code: unl.code,
        format: unl.format,
        priority: unl.priority,
      },
      teamsCount: unlTeamsDefs.length,
      matchesInserted,
      matchesUpdated,
    };
  },
});
