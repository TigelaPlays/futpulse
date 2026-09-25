import { mutation } from "./_generated/server";

export const seedLigaA = mutation({
  handler: async (ctx) => {
    // 1. Garante ou recupera a liga UEFA Nations League
    let league = await ctx.db
      .query("leagues")
      .filter((q) => q.eq(q.field("code"), "UNL"))
      .first();

    if (!league) {
      const leagueId = await ctx.db.insert("leagues", {
        name: "UEFA Nations League",
        code: "UNL",
        country: "Europa",
        logoUrl: "https://img.sofascore.com/api/v1/unique-tournament/10783/image",
        season: 2026,
        type: "cup",
        format: "group_knockout",
        priority: 2,
      });
      league = await ctx.db.get(leagueId);
    }

    if (!league) throw new Error("Falha ao registrar a liga UNL.");

    // 2. Mapeamento das 16 seleções da Liga A divididas por grupo
    const ligaAGroups: Record<string, string[]> = {
      A1: ["Itália", "Bélgica", "França", "Turquia"],
      A2: ["Países Baixos", "Alemanha", "Sérvia", "Grécia"],
      A3: ["Inglaterra", "Espanha", "Croácia", "Tchéquia"],
      A4: ["Noruega", "Dinamarca", "Portugal", "País de Gales"],
    };

    // 3. Cadastra/Recupera os times e inicializa a tabela de classificação zerada
    const teamMap: Record<string, any> = {};

    for (const [groupName, teams] of Object.entries(ligaAGroups)) {
      for (let i = 0; i < teams.length; i++) {
        const teamName = teams[i];

        // Busca ou cria o time na tabela 'teams'
        let team = await ctx.db
          .query("teams")
          .filter((q) =>
            q.or(
              q.eq(q.field("name"), teamName),
              teamName === "Países Baixos" ? q.eq(q.field("name"), "Holanda") : q.eq(q.field("name"), teamName),
              teamName === "Tchéquia" ? q.eq(q.field("name"), "República Checa") : q.eq(q.field("name"), teamName)
            )
          )
          .first();

        if (!team) {
          const teamId = await ctx.db.insert("teams", {
            name: teamName,
            shortName: teamName,
            logoUrl: `/assets/flags_nations/${teamName === "Tchéquia" ? "República Tcheca" : teamName}.jpg`,
          });
          team = await ctx.db.get(teamId);
        }
        teamMap[teamName] = team!._id;

        // Limpa registro anterior desta seleção na tabela 'standings' se existir
        const existingStanding = await ctx.db
          .query("standings")
          .filter((q) =>
            q.and(
              q.eq(q.field("division"), "A"),
              q.or(
                q.eq(q.field("teamName"), teamName),
                teamName === "Países Baixos" ? q.eq(q.field("teamName"), "Holanda") : q.eq(q.field("teamName"), teamName),
                teamName === "Tchéquia" ? q.eq(q.field("teamName"), "República Checa") : q.eq(q.field("teamName"), teamName)
              )
            )
          )
          .first();

        if (existingStanding) {
          await ctx.db.delete(existingStanding._id);
        }

        // Zonas da Liga A: 1º e 2º -> Quartas de Final | 3º -> Play-off Despromoção | 4º -> Despromoção
        const pos = i + 1;
        let zone: "QUARTER_FINALS" | "RELEGATION_PLAYOFF" | "RELEGATION" = "RELEGATION";
        if (pos <= 2) zone = "QUARTER_FINALS";
        else if (pos === 3) zone = "RELEGATION_PLAYOFF";

        // Insere com status inicial 100% zerado
        await ctx.db.insert("standings", {
          leagueId: league._id,
          division: "A",
          group: groupName,
          teamId: team!._id,
          teamName,
          points: 0,
          played: 0,
          won: 0,
          drawn: 0,
          lost: 0,
          goalsFor: 0,
          goalsAgainst: 0,
          goalDifference: 0,
          form: [],
          zone,
        });
      }
    }

    // 4. Limpa jogos antigos da Rodada 1 da Liga A para evitar duplicações
    const oldMatches = await ctx.db
      .query("matches")
      .withIndex("by_league", (q) => q.eq("leagueId", league._id))
      .filter((q) => q.eq(q.field("round"), "Rodada 1"))
      .collect();

    for (const match of oldMatches) {
      // Limpa eventos associados se houver
      const evs = await ctx.db
        .query("matchEvents")
        .withIndex("by_match", (q) => q.eq("matchId", match._id))
        .collect();
      for (const ev of evs) await ctx.db.delete(ev._id);
      await ctx.db.delete(match._id);
    }

    // 5. Cadastra as 8 partidas agendadas da Rodada 1 da Liga A
    const scheduledMatches = [
      // Grupo A2 - 24/09/2026
      {
        home: "Países Baixos",
        away: "Alemanha",
        group: "A2",
        date: "2026-09-24T18:45:00Z",
        venue: "Johan Cruijff ArenA, Amsterdã (Países Baixos)",
        stadiumFile: "Johan Cruyff Arena.jpg",
      },
      {
        home: "Sérvia",
        away: "Grécia",
        group: "A2",
        date: "2026-09-24T18:45:00Z",
        venue: "Rajko Mitić Stadium, Belgrado (Sérvia)",
        stadiumFile: "Stadion Rajko Mitić.jpg",
      },
      // Grupo A4 - 24/09/2026
      {
        home: "Noruega",
        away: "Dinamarca",
        group: "A4",
        date: "2026-09-24T18:45:00Z",
        venue: "Ullevaal Stadion, Oslo (Noruega)",
        stadiumFile: "Ullevaal Stadion.jpg",
      },
      {
        home: "Portugal",
        away: "País de Gales",
        group: "A4",
        date: "2026-09-24T18:45:00Z",
        venue: "Estádio José Alvalade, Lisboa (Portugal)",
        stadiumFile: "José Alvalade.jpg",
      },
      // Grupo A1 - 25/09/2026
      {
        home: "Itália",
        away: "Bélgica",
        group: "A1",
        date: "2026-09-25T18:45:00Z",
        venue: "Stadio Olimpico, Roma (Itália)",
        stadiumFile: "Stadio Olimpico di Roma.jpg",
      },
      {
        home: "Turquia",
        away: "França",
        group: "A1",
        date: "2026-09-25T18:45:00Z",
        venue: "Kocaeli Stadyumu, Kocaeli (Turquia)",
        stadiumFile: "Kocaeli Stadyumu.jpg",
      },
      // Grupo A3 - 26/09/2026
      {
        home: "Inglaterra",
        away: "Espanha",
        group: "A3",
        date: "2026-09-26T18:45:00Z",
        venue: "Wembley Stadium, Londres (Inglaterra)",
        stadiumFile: "Wembley Stadium.jpg",
      },
      {
        home: "Tchéquia",
        away: "Croácia",
        group: "A3",
        date: "2026-09-26T18:45:00Z",
        venue: "Fortuna Arena, Praga (Tchéquia)",
        stadiumFile: "Fortuna Arena.jpg",
      },
    ];

    for (const m of scheduledMatches) {
      const homeTeamId = teamMap[m.home];
      const venueParts = m.venue.split(",");
      const stadiumName = venueParts[0].trim();
      const cityCountry = venueParts[1] ? venueParts[1].trim() : "";

      let stadiumDoc = await ctx.db
        .query("stadiums")
        .filter((q) => q.eq(q.field("name"), stadiumName))
        .first();

      if (!stadiumDoc) {
        const stadiumId = await ctx.db.insert("stadiums", {
          name: stadiumName,
          city: cityCountry,
          imageUrl: `/assets/stadiums_nations/${m.stadiumFile}`,
          teamId: homeTeamId,
        });
        stadiumDoc = await ctx.db.get(stadiumId);
      } else {
        await ctx.db.patch(stadiumDoc._id, {
          imageUrl: `/assets/stadiums_nations/${m.stadiumFile}`,
          teamId: homeTeamId,
        });
      }

      await ctx.db.insert("matches", {
        leagueId: league._id,
        round: "Rodada 1",
        stage: "Fase de Grupos",
        group: m.group,
        homeTeamId,
        awayTeamId: teamMap[m.away],
        homeScore: 0,
        awayScore: 0,
        status: "SCHEDULED",
        statusShort: "15:45",
        startTime: new Date(m.date).getTime(),
        stadiumId: stadiumDoc?._id,
      });
    }

    return {
      success: true,
      message: "Liga A populada com 16 seleções zeradas e 8 partidas agendadas.",
    };
  },
});
