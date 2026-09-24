import { mutation } from "./_generated/server";

interface SeedTeam {
  name: string;
  flag?: string;
  p?: number;
  w?: number;
  d?: number;
  l?: number;
  gf?: number;
  ga?: number;
  form?: string[];
}

export const seedNationsLeague = mutation({
  handler: async (ctx) => {
    // Limpa registros anteriores para evitar duplicidade
    const existing = await ctx.db.query("standings").collect();
    for (const row of existing) {
      await ctx.db.delete(row._id);
    }

    const groupsData: Record<
      "A" | "B" | "C" | "D",
      Record<string, SeedTeam[]>
    > = {
      A: {
        A1: [
          { name: "Itália", flag: "🇮🇹" },
          { name: "Bélgica", flag: "🇧🇪" },
          { name: "França", flag: "🇫🇷" },
          { name: "Turquia", flag: "🇹🇷" },
        ],
        A2: [
          { name: "Holanda", flag: "🇳🇱", p: 1, d: 1, gf: 1, ga: 1, form: ["D"] },
          { name: "Alemanha", flag: "🇩🇪", p: 1, d: 1, gf: 1, ga: 1, form: ["D"] },
          { name: "Sérvia", flag: "🇷🇸", p: 1, d: 1, gf: 1, ga: 1, form: ["D"] },
          { name: "Grécia", flag: "🇬🇷", p: 1, d: 1, gf: 1, ga: 1, form: ["D"] },
        ],
        A3: [
          { name: "Espanha", flag: "🇪🇸" },
          { name: "Inglaterra", flag: "🏴" },
          { name: "Croácia", flag: "🇭🇷" },
          { name: "República Checa", flag: "🇨🇿" },
        ],
        A4: [
          { name: "Noruega", flag: "🇳🇴", p: 1, w: 1, gf: 3, ga: 2, form: ["W"] },
          { name: "Portugal", flag: "🇵🇹", p: 1, w: 1, gf: 1, ga: 0, form: ["W"] },
          { name: "Dinamarca", flag: "🇩🇰", p: 1, l: 1, gf: 2, ga: 3, form: ["L"] },
          { name: "País de Gales", flag: "🏴", p: 1, l: 1, gf: 0, ga: 1, form: ["L"] },
        ],
      },
      B: {
        B1: [
          { name: "Escócia", flag: "🏴" },
          { name: "Suíça", flag: "🇨🇭" },
          { name: "Eslovênia", flag: "🇸🇮" },
          { name: "Macedônia do Norte", flag: "🇲🇰" },
        ],
        B2: [
          { name: "Hungria", flag: "🇭🇺" },
          { name: "Geórgia", flag: "🇬🇪" },
          { name: "Ucrânia", flag: "🇺🇦" },
          { name: "Irlanda do Norte", flag: "🇬🇧" },
        ],
        B3: [
          { name: "Áustria", flag: "🇦🇹", p: 1, w: 1, gf: 2, ga: 1, form: ["W"] },
          { name: "Kosovo", flag: "🇽🇰", p: 1, w: 1, gf: 1, ga: 0, form: ["W"] },
          { name: "Israel", flag: "🇮🇱", p: 1, l: 1, gf: 1, ga: 2, form: ["L"] },
          { name: "Irlanda", flag: "🇮🇪", p: 1, l: 1, gf: 0, ga: 1, form: ["L"] },
        ],
        B4: [
          { name: "Suécia", flag: "🇸🇪" },
          { name: "Polônia", flag: "🇵🇱" },
          { name: "Romênia", flag: "🇷🇴" },
          { name: "Bósnia", flag: "🇧🇦" },
        ],
      },
      C: {
        C1: [{ name: "Albânia" }, { name: "Finlândia" }, { name: "Belarus" }, { name: "San Marino" }],
        C2: [{ name: "Montenegro" }, { name: "Armênia" }, { name: "Chipre" }, { name: "Letônia" }],
        C3: [{ name: "Eslováquia" }, { name: "Cazaquistão" }, { name: "Ilhas Faroé" }, { name: "Moldávia" }],
        C4: [{ name: "Bulgária" }, { name: "Islândia" }, { name: "Luxemburgo" }, { name: "Estônia" }],
      },
      D: {
        D1: [
          { name: "Malta", flag: "🇲🇹", p: 1, w: 1, gf: 2, ga: 1, form: ["W"] },
          { name: "Gibraltar", flag: "🇬🇮" },
          { name: "Andorra", flag: "🇦🇩", p: 1, l: 1, gf: 1, ga: 2, form: ["L"] },
        ],
        D2: [
          { name: "Lituânia", flag: "🇱🇹", p: 1, w: 1, gf: 2, ga: 0, form: ["W"] },
          { name: "Azerbaijão", flag: "🇦🇿" },
          { name: "Liechtenstein", flag: "🇱🇮", p: 1, l: 1, gf: 0, ga: 2, form: ["L"] },
        ],
      },
    };

    for (const [division, groups] of Object.entries(groupsData) as [
      "A" | "B" | "C" | "D",
      Record<string, SeedTeam[]>
    ][]) {
      for (const [groupName, teams] of Object.entries(groups)) {
        for (let i = 0; i < teams.length; i++) {
          const t = teams[i];
          const played = t.p ?? 0;
          const won = t.w ?? 0;
          const drawn = t.d ?? 0;
          const lost = t.l ?? 0;
          const gf = t.gf ?? 0;
          const ga = t.ga ?? 0;
          const points = won * 3 + drawn;
          const gd = gf - ga;

          // Define as zonas baseado na divisão e colocação padrão
          let zone: "QUARTER_FINALS" | "PROMOTION" | "PROMOTION_PLAYOFF" | "RELEGATION_PLAYOFF" | "RELEGATION" | "NONE" = "NONE";
          const pos = i + 1;

          if (division === "A") {
            if (pos <= 2) zone = "QUARTER_FINALS";
            else if (pos === 3) zone = "RELEGATION_PLAYOFF";
            else zone = "RELEGATION";
          } else if (division === "B") {
            if (pos === 1) zone = "PROMOTION";
            else if (pos === 2) zone = "PROMOTION_PLAYOFF";
            else if (pos === 3) zone = "RELEGATION_PLAYOFF";
            else zone = "RELEGATION";
          } else if (division === "C") {
            if (pos === 1) zone = "PROMOTION";
            else if (pos === 2) zone = "PROMOTION_PLAYOFF";
            else if (pos === 4) zone = "RELEGATION";
            else zone = "NONE";
          } else if (division === "D") {
            if (pos === 1) zone = "PROMOTION";
            else if (pos === 2) zone = "PROMOTION_PLAYOFF";
            else zone = "NONE";
          }

          await ctx.db.insert("standings", {
            division,
            group: groupName,
            teamName: t.name,
            teamFlag: t.flag ?? "🏳️",
            points,
            played,
            won,
            drawn,
            lost,
            goalsFor: gf,
            goalsAgainst: ga,
            goalDifference: gd,
            form: t.form ?? [],
            zone,
          });
        }
      }
    }

    return { success: true, message: "Classificações da Nations League populadas com sucesso." };
  },
});

export const seedNationsLeagueRound1Matches = mutation({
  handler: async (ctx) => {
    // 1. Localiza ou cria a liga UEFA Nations League
    let unl = await ctx.db
      .query("leagues")
      .filter((q) =>
        q.or(
          q.eq(q.field("code"), "UNL"),
          q.eq(q.field("name"), "UEFA Nations League"),
          q.eq(q.field("externalId"), 10783)
        )
      )
      .first();

    if (!unl) {
      const id = await ctx.db.insert("leagues", {
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
      unl = (await ctx.db.get(id))!;
    }

    // 2. Auxiliar para obter ou criar seleção
    const allTeams = await ctx.db.query("teams").collect();
    const teamMap = new Map<string, (typeof allTeams)[0]>();
    for (const t of allTeams) {
      teamMap.set(t.name.toLowerCase().trim(), t);
      if (t.shortName) teamMap.set(t.shortName.toLowerCase().trim(), t);
      if (t.code) teamMap.set(t.code.toLowerCase().trim(), t);
    }

    const getOrCreateTeam = async (name: string, code: string, logoFile: string) => {
      const existing = teamMap.get(name.toLowerCase().trim());
      if (existing) return existing._id;

      const newId = await ctx.db.insert("teams", {
        name,
        shortName: name,
        code,
        logoUrl: `/assets/flags_nations/${logoFile}`,
      });
      const created = await ctx.db.get(newId);
      if (created) teamMap.set(name.toLowerCase().trim(), created);
      return newId;
    };

    // 3. Limpa partidas anteriores da Nations League para não duplicar
    const oldMatches = await ctx.db
      .query("matches")
      .withIndex("by_league", (q) => q.eq("leagueId", unl!._id))
      .collect();

    for (const m of oldMatches) {
      const evs = await ctx.db
        .query("matchEvents")
        .withIndex("by_match", (q) => q.eq("matchId", m._id))
        .collect();
      for (const ev of evs) await ctx.db.delete(ev._id);
      await ctx.db.delete(m._id);
    }

    const now = Date.now();
    const oneDay = 24 * 60 * 60 * 1000;

    // 4. Configuração dos confrontos oficiais da Rodada 1
    const matchesDefs = [
      // Grupo A4
      {
        group: "Grupo A4",
        home: { name: "Noruega", code: "NOR", logo: "Noruega.jpg" },
        away: { name: "Dinamarca", code: "DEN", logo: "Dinamarca.jpg" },
        homeScore: 3,
        awayScore: 2,
        status: "FINISHED" as const,
        statusShort: "FT",
        startTime: now - oneDay,
        events: [
          { minute: 14, player: "Erling Haaland", team: "home" as const, type: "GOAL" as const },
          { minute: 25, player: "Rasmus Højlund", team: "away" as const, type: "GOAL" as const },
          { minute: 38, player: "Alexander Sørloth", team: "home" as const, type: "GOAL" as const },
          { minute: 67, player: "Christian Eriksen", team: "away" as const, type: "GOAL" as const },
          { minute: 72, player: "Erling Haaland", team: "home" as const, type: "GOAL" as const },
        ],
      },
      {
        group: "Grupo A4",
        home: { name: "Portugal", code: "POR", logo: "Portugal.jpg" },
        away: { name: "País de Gales", code: "WAL", logo: "País de Gales.jpg" },
        homeScore: 1,
        awayScore: 0,
        status: "FINISHED" as const,
        statusShort: "FT",
        startTime: now - oneDay,
        events: [
          { minute: 63, player: "Cristiano Ronaldo", team: "home" as const, type: "GOAL" as const },
        ],
      },
      // Grupo A2
      {
        group: "Grupo A2",
        home: { name: "Holanda", code: "NED", logo: "Países Baixos.jpg" },
        away: { name: "Alemanha", code: "GER", logo: "Alemanha.jpg" },
        homeScore: 1,
        awayScore: 1,
        status: "FINISHED" as const,
        statusShort: "FT",
        startTime: now - oneDay,
        events: [
          { minute: 2, player: "Tijjani Reijnders", team: "home" as const, type: "GOAL" as const },
          { minute: 38, player: "Deniz Undav", team: "away" as const, type: "GOAL" as const },
        ],
      },
      {
        group: "Grupo A2",
        home: { name: "Sérvia", code: "SRB", logo: "Sérvia.jpg" },
        away: { name: "Grécia", code: "GRE", logo: "Grécia.jpg" },
        homeScore: 1,
        awayScore: 1,
        status: "FINISHED" as const,
        statusShort: "FT",
        startTime: now - oneDay,
        events: [
          { minute: 41, player: "Dušan Vlahović", team: "home" as const, type: "GOAL" as const },
          { minute: 77, player: "Anastasios Bakasetas", team: "away" as const, type: "GOAL" as const },
        ],
      },
      // Grupo A1
      {
        group: "Grupo A1",
        home: { name: "Itália", code: "ITA", logo: "Itália.jpg" },
        away: { name: "Bélgica", code: "BEL", logo: "Bélgica.jpg" },
        homeScore: 0,
        awayScore: 0,
        status: "SCHEDULED" as const,
        statusShort: "15:45",
        startTime: now + 2 * 60 * 60 * 1000,
        events: [],
      },
      {
        group: "Grupo A1",
        home: { name: "França", code: "FRA", logo: "França.jpg" },
        away: { name: "Turquia", code: "TUR", logo: "Turquia.jpg" },
        homeScore: 0,
        awayScore: 0,
        status: "SCHEDULED" as const,
        statusShort: "15:45",
        startTime: now + 2 * 60 * 60 * 1000,
        events: [],
      },
      // Grupo A3
      {
        group: "Grupo A3",
        home: { name: "Espanha", code: "ESP", logo: "Espanha.jpg" },
        away: { name: "Inglaterra", code: "ENG", logo: "Inglaterra.jpg" },
        homeScore: 0,
        awayScore: 0,
        status: "SCHEDULED" as const,
        statusShort: "15:45",
        startTime: now + oneDay,
        events: [],
      },
      {
        group: "Grupo A3",
        home: { name: "Croácia", code: "CRO", logo: "Croácia.jpg" },
        away: { name: "República Checa", code: "CZE", logo: "República Tcheca.jpg" },
        homeScore: 0,
        awayScore: 0,
        status: "SCHEDULED" as const,
        statusShort: "15:45",
        startTime: now + oneDay,
        events: [],
      },
    ];

    let insertedCount = 0;
    for (const m of matchesDefs) {
      const homeTeamId = await getOrCreateTeam(m.home.name, m.home.code, m.home.logo);
      const awayTeamId = await getOrCreateTeam(m.away.name, m.away.code, m.away.logo);

      const matchId = await ctx.db.insert("matches", {
        leagueId: unl!._id,
        round: "Rodada 1",
        stage: "Fase de Grupos",
        group: m.group,
        homeTeamId,
        awayTeamId,
        homeScore: m.homeScore,
        awayScore: m.awayScore,
        status: m.status,
        statusShort: m.statusShort,
        startTime: m.startTime,
      });

      insertedCount++;

      for (const ev of m.events) {
        await ctx.db.insert("matchEvents", {
          matchId,
          minute: ev.minute,
          teamId: ev.team === "home" ? homeTeamId : awayTeamId,
          type: ev.type,
          playerName: ev.player,
        });
      }
    }

    return {
      success: true,
      message: `Partidas da Rodada 1 da Nations League cadastradas com sucesso (${insertedCount} jogos).`,
      insertedMatches: insertedCount,
    };
  },
});

