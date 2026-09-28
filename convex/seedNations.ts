import { mutation } from "./_generated/server";
import type { Id } from "./_generated/dataModel";

export const seedNationsLeague = mutation({
  handler: async (ctx) => {
    // 1. Cadastra ou atualiza a UEFA Nations League
    let league = await ctx.db
      .query("leagues")
      .filter((q) =>
        q.or(
          q.eq(q.field("code"), "UNL"),
          q.eq(q.field("name"), "UEFA Nations League"),
          q.eq(q.field("name"), "Liga das Nações da UEFA")
        )
      )
      .first();

    const leagueData = {
      name: "UEFA Nations League",
      code: "UNL",
      country: "Europa",
      logoUrl: "https://img.sofascore.com/api/v1/unique-tournament/10783/image",
      season: 2026,
      type: "cup" as const,
      format: "groups",
      priority: 2,
      currentStage: "Fase de Grupos • Rodada 1",
    };

    if (!league) {
      const leagueId = await ctx.db.insert("leagues", leagueData);
      league = (await ctx.db.get(leagueId))!;
    } else {
      await ctx.db.patch(league._id, leagueData);
    }

    // 2. Mapeamento das 54 Seleções Europeias com seus Códigos e Arquivos de Bandeira
    const NATIONS_CATALOG: { name: string; shortName: string; code: string; flag: string }[] = [
      // Liga A
      { name: "França", shortName: "França", code: "FRA", flag: "França.jpg" },
      { name: "Itália", shortName: "Itália", code: "ITA", flag: "Itália.jpg" },
      { name: "Bélgica", shortName: "Bélgica", code: "BEL", flag: "Bélgica.jpg" },
      { name: "Turquia", shortName: "Turquia", code: "TUR", flag: "Turquia.jpg" },
      { name: "Alemanha", shortName: "Alemanha", code: "ALE", flag: "Alemanha.jpg" },
      { name: "Países Baixos", shortName: "Holanda", code: "HOL", flag: "Países Baixos.jpg" },
      { name: "Sérvia", shortName: "Sérvia", code: "SRB", flag: "Sérvia.jpg" },
      { name: "Grécia", shortName: "Grécia", code: "GRE", flag: "Grécia.jpg" },
      { name: "Espanha", shortName: "Espanha", code: "ESP", flag: "Espanha.jpg" },
      { name: "Inglaterra", shortName: "Inglaterra", code: "ING", flag: "Inglaterra.jpg" },
      { name: "Croácia", shortName: "Croácia", code: "CRO", flag: "Croácia.jpg" },
      { name: "Tchéquia", shortName: "Rep. Tcheca", code: "CZE", flag: "República Tcheca.jpg" },
      { name: "Portugal", shortName: "Portugal", code: "POR", flag: "Portugal.jpg" },
      { name: "Dinamarca", shortName: "Dinamarca", code: "DIN", flag: "Dinamarca.jpg" },
      { name: "Noruega", shortName: "Noruega", code: "NOR", flag: "Noruega.jpg" },
      { name: "País de Gales", shortName: "Gales", code: "WAL", flag: "País de Gales.jpg" },

      // Liga B
      { name: "Eslovênia", shortName: "Eslovênia", code: "SVN", flag: "Eslovênia.jpg" },
      { name: "Escócia", shortName: "Escócia", code: "SCO", flag: "Escócia.jpg" },
      { name: "Macedônia do Norte", shortName: "Macedônia", code: "MKD", flag: "Macedônia.jpg" },
      { name: "Suíça", shortName: "Suíça", code: "SUI", flag: "Suíça.jpg" },
      { name: "Geórgia", shortName: "Geórgia", code: "GEO", flag: "Geórgia.jpg" },
      { name: "Irlanda do Norte", shortName: "Irl. Norte", code: "NIR", flag: "Irlanda do Norte.jpg" },
      { name: "Hungria", shortName: "Hungria", code: "HUN", flag: "Hungria.jpg" },
      { name: "Ucrânia", shortName: "Ucrânia", code: "UKR", flag: "Ucrânia.jpg" },
      { name: "Áustria", shortName: "Áustria", code: "AUT", flag: "Áustria.jpg" },
      { name: "Israel", shortName: "Israel", code: "ISR", flag: "Israel.jpg" },
      { name: "Kosovo", shortName: "Kosovo", code: "KOS", flag: "Kosovo.jpg" },
      { name: "República da Irlanda", shortName: "Irlanda", code: "IRL", flag: "Irlanda.jpg" },
      { name: "Polônia", shortName: "Polônia", code: "POL", flag: "Polônia.jpg" },
      { name: "Bósnia e Herzegovina", shortName: "Bósnia", code: "BIH", flag: "Bósnia e Herzegovina.jpg" },
      { name: "Suécia", shortName: "Suécia", code: "SWE", flag: "Suécia.jpg" },
      { name: "Romênia", shortName: "Romênia", code: "ROU", flag: "Romênia.jpg" },

      // Liga C
      { name: "San Marino", shortName: "San Marino", code: "SMR", flag: "San Marino.jpg" },
      { name: "Finlândia", shortName: "Finlândia", code: "FIN", flag: "Finlândia.jpg" },
      { name: "Albânia", shortName: "Albânia", code: "ALB", flag: "Albânia.jpg" },
      { name: "Bielorrússia", shortName: "Belarus", code: "BLR", flag: "Bielorrússia.jpg" },
      { name: "Armênia", shortName: "Armênia", code: "ARM", flag: "Armênia.jpg" },
      { name: "Letônia", shortName: "Letônia", code: "LVA", flag: "Letônia.jpg" },
      { name: "Montenegro", shortName: "Montenegro", code: "MNE", flag: "Montenegro.jpg" },
      { name: "Chipre", shortName: "Chipre", code: "CYP", flag: "Chipre.jpg" },
      { name: "Ilhas Faroé", shortName: "Ilhas Faroé", code: "FRO", flag: "Ilhas Faroé.jpg" },
      { name: "Cazaquistão", shortName: "Cazaquistão", code: "KAZ", flag: "Cazaquistão.jpg" },
      { name: "Eslováquia", shortName: "Eslováquia", code: "SVK", flag: "Eslováquia.jpg" },
      { name: "Moldávia", shortName: "Moldávia", code: "MDA", flag: "Moldávia.jpg" },
      { name: "Islândia", shortName: "Islândia", code: "ISL", flag: "Islândia.jpg" },
      { name: "Estônia", shortName: "Estônia", code: "EST", flag: "Estônia.jpg" },
      { name: "Bulgária", shortName: "Bulgária", code: "BUL", flag: "Bulgária.jpg" },
      { name: "Luxemburgo", shortName: "Luxemburgo", code: "LUX", flag: "Luxemburgo.jpg" },

      // Liga D
      { name: "Gibraltar", shortName: "Gibraltar", code: "GIB", flag: "Gibraltar.jpg" },
      { name: "Andorra", shortName: "Andorra", code: "AND", flag: "Andorra.jpg" },
      { name: "Malta", shortName: "Malta", code: "MLT", flag: "Malta.jpg" },
      { name: "Azerbaijão", shortName: "Azerbaijão", code: "AZE", flag: "Azerbaijão.jpg" },
      { name: "Liechtenstein", shortName: "Liechtenstein", code: "LIE", flag: "Liechtenstein.jpg" },
      { name: "Lituânia", shortName: "Lituânia", code: "LTU", flag: "Lituânia.jpg" },
    ];

    const teamMap: Record<string, Id<"teams">> = {};

    for (const item of NATIONS_CATALOG) {
      let team = await ctx.db
        .query("teams")
        .filter((q) =>
          q.or(
            q.eq(q.field("name"), item.name),
            q.eq(q.field("shortName"), item.shortName),
            item.name === "Países Baixos" ? q.eq(q.field("name"), "Holanda") : q.eq(q.field("name"), item.name),
            item.name === "Tchéquia" ? q.eq(q.field("name"), "República Checa") : q.eq(q.field("name"), item.name)
          )
        )
        .first();

      const logoUrl = `/assets/flags_nations/${encodeURIComponent(item.flag)}`;

      if (!team) {
        const teamId = await ctx.db.insert("teams", {
          name: item.name,
          shortName: item.shortName,
          code: item.code,
          logoUrl,
        });
        teamMap[item.name] = teamId;
      } else {
        await ctx.db.patch(team._id, {
          shortName: item.shortName,
          code: item.code,
          logoUrl: team.customLogoStorageId ? team.logoUrl : logoUrl,
        });
        teamMap[item.name] = team._id;
      }
    }

    // 3. Cadastro dos Estádios Europeus Vinculados aos Mandantes
    const STADIUMS_CATALOG = [
      {
        name: "Stade de France",
        city: "Saint-Denis (França)",
        capacity: 81338,
        teamName: "França",
        imageUrl: "https://images.unsplash.com/photo-1508098682722-e99c43a406b2?auto=format&fit=crop&w=1200&q=80",
      },
      {
        name: "Allianz Arena",
        city: "Munique (Alemanha)",
        capacity: 75024,
        teamName: "Alemanha",
        imageUrl: "https://images.unsplash.com/photo-1577223625816-7546f13df25d?auto=format&fit=crop&w=1200&q=80",
      },
      {
        name: "Wembley Stadium",
        city: "Londres (Inglaterra)",
        capacity: 90000,
        teamName: "Inglaterra",
        imageUrl: "/assets/stadiums_nations/Wembley%20Stadium.jpg",
      },
      {
        name: "José Alvalade",
        city: "Lisboa (Portugal)",
        capacity: 50095,
        teamName: "Portugal",
        imageUrl: "/assets/stadiums_nations/Jos%C3%A9%20Alvalade.jpg",
      },
      {
        name: "Stadio Olimpico di Roma",
        city: "Roma (Itália)",
        capacity: 70634,
        teamName: "Itália",
        imageUrl: "/assets/stadiums_nations/Stadio%20Olimpico%20di%20Roma.jpg",
      },
      {
        name: "Johan Cruyff Arena",
        city: "Amsterdã (Países Baixos)",
        capacity: 55865,
        teamName: "Países Baixos",
        imageUrl: "/assets/stadiums_nations/Johan%20Cruyff%20Arena.jpg",
      },
      {
        name: "King Baudouin Stadium",
        city: "Bruxelas (Bélgica)",
        capacity: 50093,
        teamName: "Bélgica",
        imageUrl: "https://images.unsplash.com/photo-1522778119026-d647f0596c20?auto=format&fit=crop&w=1200&q=80",
      },
      {
        name: "Fortuna Arena",
        city: "Praga (Tchéquia)",
        capacity: 19370,
        teamName: "Tchéquia",
        imageUrl: "/assets/stadiums_nations/Fortuna%20Arena.jpg",
      },
      {
        name: "Stadion Rajko Mitić",
        city: "Belgrado (Sérvia)",
        capacity: 53000,
        teamName: "Sérvia",
        imageUrl: "/assets/stadiums_nations/Stadion%20Rajko%20Mitic.jpg",
      },
      {
        name: "Parken Stadium",
        city: "Copenhague (Dinamarca)",
        capacity: 38065,
        teamName: "Dinamarca",
        imageUrl: "https://images.unsplash.com/photo-1518091043644-c1d4457512c6?auto=format&fit=crop&w=1200&q=80",
      },
      {
        name: "Ullevaal Stadion",
        city: "Oslo (Noruega)",
        capacity: 27200,
        teamName: "Noruega",
        imageUrl: "/assets/stadiums_nations/Ullevaal%20Stadion.jpg",
      },
      {
        name: "Santiago Bernabéu",
        city: "Madri (Espanha)",
        capacity: 81044,
        teamName: "Espanha",
        imageUrl: "https://images.unsplash.com/photo-1508098682722-e99c43a406b2?auto=format&fit=crop&w=1200&q=80",
      },
    ];

    const stadiumMap: Record<string, Id<"stadiums">> = {};

    for (const item of STADIUMS_CATALOG) {
      const hostTeamId = teamMap[item.teamName];
      let stadium = await ctx.db
        .query("stadiums")
        .filter((q) => q.eq(q.field("name"), item.name))
        .first();

      if (!stadium) {
        const stadiumId = await ctx.db.insert("stadiums", {
          name: item.name,
          city: item.city,
          capacity: item.capacity,
          imageUrl: item.imageUrl,
          image: item.imageUrl,
          teamId: hostTeamId,
        });
        stadiumMap[item.name] = stadiumId;
      } else {
        await ctx.db.patch(stadium._id, {
          city: item.city,
          capacity: item.capacity,
          teamId: hostTeamId,
          imageUrl: stadium.customImageStorageId ? stadium.imageUrl : item.imageUrl,
          image: stadium.customImageStorageId ? stadium.image : item.imageUrl,
        });
        stadiumMap[item.name] = stadium._id;
      }
    }

    // 4. Limpeza de Dados Anteriores da Nations League para Recriação Limpa
    const oldMatches = await ctx.db
      .query("matches")
      .withIndex("by_league", (q) => q.eq("leagueId", league!._id))
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

    const oldStandings = await ctx.db
      .query("standings")
      .filter((q) => q.eq(q.field("leagueId"), league!._id))
      .collect();
    for (const st of oldStandings) await ctx.db.delete(st._id);

    const oldScorers = await ctx.db
      .query("topScorers")
      .withIndex("by_league", (q) => q.eq("leagueId", league!._id))
      .collect();
    for (const sc of oldScorers) await ctx.db.delete(sc._id);

    // 5. Estrutura Completa de Grupos e Classificação da Nations League
    const DIVISIONS_STANDINGS = {
      A: {
        A1: [
          { team: "França", pts: 3, j: 1, v: 1, e: 0, d: 0, gp: 2, gc: 1, zone: "QUARTER_FINALS" as const },
          { team: "Bélgica", pts: 3, j: 1, v: 1, e: 0, d: 0, gp: 3, gc: 1, zone: "QUARTER_FINALS" as const },
          { team: "Itália", pts: 0, j: 1, v: 0, e: 0, d: 1, gp: 1, gc: 2, zone: "RELEGATION_PLAYOFF" as const },
          { team: "Turquia", pts: 0, j: 1, v: 0, e: 0, d: 1, gp: 1, gc: 3, zone: "RELEGATION" as const },
        ],
        A2: [
          { team: "Alemanha", pts: 1, j: 1, v: 0, e: 1, d: 0, gp: 1, gc: 1, zone: "QUARTER_FINALS" as const },
          { team: "Países Baixos", pts: 1, j: 1, v: 0, e: 1, d: 0, gp: 1, gc: 1, zone: "QUARTER_FINALS" as const },
          { team: "Sérvia", pts: 0, j: 0, v: 0, e: 0, d: 0, gp: 0, gc: 0, zone: "RELEGATION_PLAYOFF" as const },
          { team: "Grécia", pts: 0, j: 0, v: 0, e: 0, d: 0, gp: 0, gc: 0, zone: "RELEGATION" as const },
        ],
        A3: [
          { team: "Espanha", pts: 0, j: 0, v: 0, e: 0, d: 0, gp: 0, gc: 0, zone: "QUARTER_FINALS" as const },
          { team: "Inglaterra", pts: 0, j: 0, v: 0, e: 0, d: 0, gp: 0, gc: 0, zone: "QUARTER_FINALS" as const },
          { team: "Croácia", pts: 0, j: 1, v: 0, e: 0, d: 1, gp: 1, gc: 2, zone: "RELEGATION_PLAYOFF" as const },
          { team: "Tchéquia", pts: 0, j: 0, v: 0, e: 0, d: 0, gp: 0, gc: 0, zone: "RELEGATION" as const },
        ],
        A4: [
          { team: "Portugal", pts: 3, j: 1, v: 1, e: 0, d: 0, gp: 2, gc: 1, zone: "QUARTER_FINALS" as const },
          { team: "Dinamarca", pts: 0, j: 0, v: 0, e: 0, d: 0, gp: 0, gc: 0, zone: "QUARTER_FINALS" as const },
          { team: "Noruega", pts: 0, j: 0, v: 0, e: 0, d: 0, gp: 0, gc: 0, zone: "RELEGATION_PLAYOFF" as const },
          { team: "País de Gales", pts: 0, j: 0, v: 0, e: 0, d: 0, gp: 0, gc: 0, zone: "RELEGATION" as const },
        ],
      },
      B: {
        B1: [
          { team: "Suíça", pts: 0, j: 0, v: 0, e: 0, d: 0, gp: 0, gc: 0, zone: "PROMOTION" as const },
          { team: "Escócia", pts: 0, j: 0, v: 0, e: 0, d: 0, gp: 0, gc: 0, zone: "PROMOTION_PLAYOFF" as const },
          { team: "Eslovênia", pts: 0, j: 0, v: 0, e: 0, d: 0, gp: 0, gc: 0, zone: "RELEGATION_PLAYOFF" as const },
          { team: "Macedônia do Norte", pts: 0, j: 0, v: 0, e: 0, d: 0, gp: 0, gc: 0, zone: "RELEGATION" as const },
        ],
        B2: [
          { team: "Ucrânia", pts: 0, j: 0, v: 0, e: 0, d: 0, gp: 0, gc: 0, zone: "PROMOTION" as const },
          { team: "Hungria", pts: 0, j: 0, v: 0, e: 0, d: 0, gp: 0, gc: 0, zone: "PROMOTION_PLAYOFF" as const },
          { team: "Geórgia", pts: 0, j: 0, v: 0, e: 0, d: 0, gp: 0, gc: 0, zone: "RELEGATION_PLAYOFF" as const },
          { team: "Irlanda do Norte", pts: 0, j: 0, v: 0, e: 0, d: 0, gp: 0, gc: 0, zone: "RELEGATION" as const },
        ],
        B3: [
          { team: "Áustria", pts: 0, j: 0, v: 0, e: 0, d: 0, gp: 0, gc: 0, zone: "PROMOTION" as const },
          { team: "República da Irlanda", pts: 0, j: 0, v: 0, e: 0, d: 0, gp: 0, gc: 0, zone: "PROMOTION_PLAYOFF" as const },
          { team: "Israel", pts: 0, j: 0, v: 0, e: 0, d: 0, gp: 0, gc: 0, zone: "RELEGATION_PLAYOFF" as const },
          { team: "Kosovo", pts: 0, j: 0, v: 0, e: 0, d: 0, gp: 0, gc: 0, zone: "RELEGATION" as const },
        ],
        B4: [
          { team: "Polônia", pts: 0, j: 0, v: 0, e: 0, d: 0, gp: 0, gc: 0, zone: "PROMOTION" as const },
          { team: "Suécia", pts: 0, j: 0, v: 0, e: 0, d: 0, gp: 0, gc: 0, zone: "PROMOTION_PLAYOFF" as const },
          { team: "Romênia", pts: 0, j: 0, v: 0, e: 0, d: 0, gp: 0, gc: 0, zone: "RELEGATION_PLAYOFF" as const },
          { team: "Bósnia e Herzegovina", pts: 0, j: 0, v: 0, e: 0, d: 0, gp: 0, gc: 0, zone: "RELEGATION" as const },
        ],
      },
      C: {
        C1: [
          { team: "Albânia", pts: 0, j: 0, v: 0, e: 0, d: 0, gp: 0, gc: 0, zone: "PROMOTION" as const },
          { team: "Finlândia", pts: 0, j: 0, v: 0, e: 0, d: 0, gp: 0, gc: 0, zone: "PROMOTION_PLAYOFF" as const },
          { team: "Bielorrússia", pts: 0, j: 0, v: 0, e: 0, d: 0, gp: 0, gc: 0, zone: "NONE" as const },
          { team: "San Marino", pts: 0, j: 0, v: 0, e: 0, d: 0, gp: 0, gc: 0, zone: "RELEGATION" as const },
        ],
      },
      D: {
        D1: [
          { team: "Gibraltar", pts: 0, j: 0, v: 0, e: 0, d: 0, gp: 0, gc: 0, zone: "PROMOTION" as const },
          { team: "Andorra", pts: 0, j: 0, v: 0, e: 0, d: 0, gp: 0, gc: 0, zone: "NONE" as const },
          { team: "Malta", pts: 0, j: 0, v: 0, e: 0, d: 0, gp: 0, gc: 0, zone: "NONE" as const },
        ],
      },
    };

    for (const [div, groups] of Object.entries(DIVISIONS_STANDINGS)) {
      for (const [groupName, rows] of Object.entries(groups)) {
        for (let i = 0; i < rows.length; i++) {
          const r = rows[i];
          const tid = teamMap[r.team];
          await ctx.db.insert("standings", {
            leagueId: league!._id,
            division: div as "A" | "B" | "C" | "D",
            group: groupName,
            teamId: tid,
            teamName: r.team,
            points: r.pts,
            played: r.j,
            won: r.v,
            drawn: r.e,
            lost: r.d,
            goalsFor: r.gp,
            goalsAgainst: r.gc,
            goalDifference: r.gp - r.gc,
            zone: r.zone,
            rank: i + 1,
          });
        }
      }
    }

    // 6. Cadastramento das Partidas: Hoje (2 LIVE + 2 FINISHED) e Amanhã (4 SCHEDULED)
    const now = Date.now();

    const tomorrow = new Date(now + 24 * 3600 * 1000);
    tomorrow.setHours(15, 45, 0, 0);
    const tomorrowTime = tomorrow.getTime();

    // Partida 1: França x Itália (LIVE - 2T 68')
    const matchLive1Id = await ctx.db.insert("matches", {
      leagueId: league._id,
      round: "Rodada 1",
      division: "A",
      group: "A1",
      stage: "Fase de Grupos",
      homeTeamId: teamMap["França"],
      awayTeamId: teamMap["Itália"],
      stadiumId: stadiumMap["Stade de France"],
      status: "IN_PLAY",
      statusShort: "2T",
      minute: 68,
      homeScore: 2,
      awayScore: 1,
      homeHalftimeScore: 1,
      awayHalftimeScore: 1,
      startTime: now - 70 * 60 * 1000,
      elapsedSecondsUpdatedAt: now,
    });

    await ctx.db.insert("matchEvents", {
      matchId: matchLive1Id,
      minute: 22,
      teamId: teamMap["França"],
      playerName: "Kylian Mbappé",
      type: "GOAL",
    });
    await ctx.db.insert("matchEvents", {
      matchId: matchLive1Id,
      minute: 35,
      teamId: teamMap["Itália"],
      playerName: "Federico Dimarco",
      type: "GOAL",
    });
    await ctx.db.insert("matchEvents", {
      matchId: matchLive1Id,
      minute: 58,
      teamId: teamMap["França"],
      playerName: "Antoine Griezmann",
      type: "GOAL",
    });
    await ctx.db.insert("matchEvents", {
      matchId: matchLive1Id,
      minute: 61,
      teamId: teamMap["Itália"],
      playerName: "Nicolò Barella",
      type: "YELLOW_CARD",
    });

    await ctx.db.insert("matchStatistics", {
      matchId: matchLive1Id,
      homePossession: 54,
      awayPossession: 46,
      homeTotalShots: 14,
      awayTotalShots: 9,
      homeShotsOnTarget: 6,
      awayShotsOnTarget: 4,
      homeFouls: 8,
      awayFouls: 11,
      homeCorners: 5,
      awayCorners: 3,
    });

    // Partida 2: Alemanha x Países Baixos (LIVE - 1T 34')
    const matchLive2Id = await ctx.db.insert("matches", {
      leagueId: league._id,
      round: "Rodada 1",
      division: "A",
      group: "A2",
      stage: "Fase de Grupos",
      homeTeamId: teamMap["Alemanha"],
      awayTeamId: teamMap["Países Baixos"],
      stadiumId: stadiumMap["Allianz Arena"],
      status: "IN_PLAY",
      statusShort: "1T",
      minute: 34,
      homeScore: 1,
      awayScore: 1,
      startTime: now - 35 * 60 * 1000,
      elapsedSecondsUpdatedAt: now,
    });

    await ctx.db.insert("matchEvents", {
      matchId: matchLive2Id,
      minute: 14,
      teamId: teamMap["Alemanha"],
      playerName: "Florian Wirtz",
      type: "GOAL",
    });
    await ctx.db.insert("matchEvents", {
      matchId: matchLive2Id,
      minute: 27,
      teamId: teamMap["Países Baixos"],
      playerName: "Cody Gakpo",
      type: "GOAL",
    });
    await ctx.db.insert("matchEvents", {
      matchId: matchLive2Id,
      minute: 31,
      teamId: teamMap["Alemanha"],
      playerName: "Joshua Kimmich",
      type: "YELLOW_CARD",
    });

    await ctx.db.insert("matchStatistics", {
      matchId: matchLive2Id,
      homePossession: 51,
      awayPossession: 49,
      homeTotalShots: 8,
      awayTotalShots: 7,
      homeShotsOnTarget: 3,
      awayShotsOnTarget: 3,
      homeFouls: 5,
      awayFouls: 6,
      homeCorners: 4,
      awayCorners: 3,
    });

    // Partida 3: Portugal x Croácia (FINISHED - 2 x 1)
    const matchFin1Id = await ctx.db.insert("matches", {
      leagueId: league._id,
      round: "Rodada 1",
      division: "A",
      group: "A4",
      stage: "Fase de Grupos",
      homeTeamId: teamMap["Portugal"],
      awayTeamId: teamMap["Croácia"],
      stadiumId: stadiumMap["José Alvalade"],
      status: "FINISHED",
      statusShort: "FT",
      homeScore: 2,
      awayScore: 1,
      homeHalftimeScore: 2,
      awayHalftimeScore: 1,
      startTime: now - 3 * 3600 * 1000,
    });

    await ctx.db.insert("matchEvents", {
      matchId: matchFin1Id,
      minute: 7,
      teamId: teamMap["Portugal"],
      playerName: "Diogo Dalot",
      type: "GOAL",
    });
    await ctx.db.insert("matchEvents", {
      matchId: matchFin1Id,
      minute: 34,
      teamId: teamMap["Portugal"],
      playerName: "Cristiano Ronaldo",
      type: "GOAL",
    });
    await ctx.db.insert("matchEvents", {
      matchId: matchFin1Id,
      minute: 41,
      teamId: teamMap["Croácia"],
      playerName: "Diogo Dalot (contra)",
      type: "GOAL",
      detail: "Gol Contra",
    });
    await ctx.db.insert("matchEvents", {
      matchId: matchFin1Id,
      minute: 82,
      teamId: teamMap["Croácia"],
      playerName: "Luka Modrić",
      type: "YELLOW_CARD",
    });

    await ctx.db.insert("matchStatistics", {
      matchId: matchFin1Id,
      homePossession: 58,
      awayPossession: 42,
      homeTotalShots: 16,
      awayTotalShots: 8,
      homeShotsOnTarget: 7,
      awayShotsOnTarget: 3,
      homeFouls: 9,
      awayFouls: 12,
      homeCorners: 6,
      awayCorners: 4,
    });

    // Partida 4: Bélgica x Turquia (FINISHED - 3 x 1)
    const matchFin2Id = await ctx.db.insert("matches", {
      leagueId: league._id,
      round: "Rodada 1",
      division: "A",
      group: "A1",
      stage: "Fase de Grupos",
      homeTeamId: teamMap["Bélgica"],
      awayTeamId: teamMap["Turquia"],
      stadiumId: stadiumMap["King Baudouin Stadium"],
      status: "FINISHED",
      statusShort: "FT",
      homeScore: 3,
      awayScore: 1,
      homeHalftimeScore: 1,
      awayHalftimeScore: 0,
      startTime: now - 4 * 3600 * 1000,
    });

    await ctx.db.insert("matchEvents", {
      matchId: matchFin2Id,
      minute: 18,
      teamId: teamMap["Bélgica"],
      playerName: "Kevin De Bruyne",
      type: "GOAL",
    });
    await ctx.db.insert("matchEvents", {
      matchId: matchFin2Id,
      minute: 44,
      teamId: teamMap["Bélgica"],
      playerName: "Romelu Lukaku",
      type: "GOAL",
    });
    await ctx.db.insert("matchEvents", {
      matchId: matchFin2Id,
      minute: 62,
      teamId: teamMap["Turquia"],
      playerName: "Arda Güler",
      type: "GOAL",
    });
    await ctx.db.insert("matchEvents", {
      matchId: matchFin2Id,
      minute: 79,
      teamId: teamMap["Bélgica"],
      playerName: "Jérémy Doku",
      type: "GOAL",
    });
    await ctx.db.insert("matchEvents", {
      matchId: matchFin2Id,
      minute: 85,
      teamId: teamMap["Turquia"],
      playerName: "Hakan Çalhanoğlu",
      type: "YELLOW_CARD",
    });

    await ctx.db.insert("matchStatistics", {
      matchId: matchFin2Id,
      homePossession: 52,
      awayPossession: 48,
      homeTotalShots: 13,
      awayTotalShots: 10,
      homeShotsOnTarget: 5,
      awayShotsOnTarget: 4,
      homeFouls: 11,
      awayFouls: 9,
      homeCorners: 5,
      awayCorners: 4,
    });

    // Partidas de Amanhã (4 SCHEDULED para 15:45)
    const tomorrowMatchesData = [
      {
        home: "Inglaterra",
        away: "Espanha",
        group: "A3",
        stadium: "Wembley Stadium",
      },
      {
        home: "Dinamarca",
        away: "Noruega",
        group: "A4",
        stadium: "Parken Stadium",
      },
      {
        home: "Sérvia",
        away: "Grécia",
        group: "A2",
        stadium: "Stadion Rajko Mitić",
      },
      {
        home: "Tchéquia",
        away: "Croácia",
        group: "A3",
        stadium: "Fortuna Arena",
      },
    ];

    for (const item of tomorrowMatchesData) {
      await ctx.db.insert("matches", {
        leagueId: league._id,
        round: "Rodada 1",
        division: "A",
        group: item.group,
        stage: "Fase de Grupos",
        homeTeamId: teamMap[item.home],
        awayTeamId: teamMap[item.away],
        stadiumId: stadiumMap[item.stadium],
        status: "SCHEDULED",
        statusShort: "15:45",
        homeScore: 0,
        awayScore: 0,
        startTime: tomorrowTime,
      });
    }

    // 7. Artilharia Inicial da UEFA Nations League
    const scorersData = [
      { rank: 1, name: "Kylian Mbappé", team: "França", code: "FRA", goals: 4, assists: 2, matches: 3 },
      { rank: 2, name: "Cristiano Ronaldo", team: "Portugal", code: "POR", goals: 3, assists: 1, matches: 3 },
      { rank: 3, name: "Erling Haaland", team: "Noruega", code: "NOR", goals: 3, assists: 0, matches: 2 },
      { rank: 4, name: "Kevin De Bruyne", team: "Bélgica", code: "BEL", goals: 2, assists: 3, matches: 3 },
      { rank: 5, name: "Florian Wirtz", team: "Alemanha", code: "ALE", goals: 2, assists: 1, matches: 2 },
    ];

    for (const sc of scorersData) {
      await ctx.db.insert("topScorers", {
        leagueId: league._id,
        rank: sc.rank,
        playerName: sc.name,
        teamId: teamMap[sc.team],
        teamName: sc.team,
        teamCode: sc.code,
        teamLogoUrl: `/assets/flags_nations/${encodeURIComponent(sc.team)}.jpg`,
        goals: sc.goals,
        assists: sc.assists,
        matches: sc.matches,
      });
    }

    return {
      success: true,
      league: "UEFA Nations League",
      leagueId: league._id,
      teamsCount: Object.keys(teamMap).length,
      stadiumsCount: Object.keys(stadiumMap).length,
      matchesCount: 8,
      scorersCount: scorersData.length,
      message: "UEFA Nations League cadastrada e ativada com sucesso!",
    };
  },
});
