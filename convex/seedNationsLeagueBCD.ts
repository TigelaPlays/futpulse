import { mutation } from "./_generated/server";

const NATION_TEAMS_FLAGS: Record<string, string> = {
  "itália": "Itália.jpg",
  "italia": "Itália.jpg",
  "bélgica": "Bélgica.jpg",
  "belgica": "Bélgica.jpg",
  "frança": "França.jpg",
  "franca": "França.jpg",
  "turquia": "Turquia.jpg",
  "holanda": "Países Baixos.jpg",
  "países baixos": "Países Baixos.jpg",
  "paises baixos": "Países Baixos.jpg",
  "alemanha": "Alemanha.jpg",
  "sérvia": "Sérvia.jpg",
  "servia": "Sérvia.jpg",
  "grécia": "Grécia.jpg",
  "grecia": "Grécia.jpg",
  "espanha": "Espanha.jpg",
  "inglaterra": "Inglaterra.jpg",
  "croácia": "Croácia.jpg",
  "croacia": "Croácia.jpg",
  "tchéquia": "República Tcheca.jpg",
  "tchequia": "República Tcheca.jpg",
  "república checa": "República Tcheca.jpg",
  "noruega": "Noruega.jpg",
  "portugal": "Portugal.jpg",
  "dinamarca": "Dinamarca.jpg",
  "país de gales": "País de Gales.jpg",
  "pais de gales": "País de Gales.jpg",
  "escócia": "Escócia.jpg",
  "escocia": "Escócia.jpg",
  "suíça": "Suíça.jpg",
  "suica": "Suíça.jpg",
  "eslovênia": "Eslovênia.jpg",
  "eslovenia": "Eslovênia.jpg",
  "macedônia do norte": "Macedônia.jpg",
  "macedonia do norte": "Macedônia.jpg",
  "hungria": "Hungria.jpg",
  "geórgia": "Geórgia.jpg",
  "georgia": "Geórgia.jpg",
  "ucrânia": "Ucrânia.jpg",
  "ucrania": "Ucrânia.jpg",
  "irlanda do norte": "Irlanda do Norte.jpg",
  "áustria": "Áustria.jpg",
  "austria": "Áustria.jpg",
  "kosovo": "Kosovo.jpg",
  "israel": "Israel.jpg",
  "irlanda": "Irlanda.jpg",
  "república da irlanda": "Irlanda.jpg",
  "republica da irlanda": "Irlanda.jpg",
  "suécia": "Suécia.jpg",
  "suecia": "Suécia.jpg",
  "polônia": "Polônia.jpg",
  "polonia": "Polônia.jpg",
  "romênia": "Romênia.jpg",
  "romenia": "Romênia.jpg",
  "bósnia": "Bósnia e Herzegovina.jpg",
  "bosnia": "Bósnia e Herzegovina.jpg",
  "bósnia e herzegovina": "Bósnia e Herzegovina.jpg",
  "bosnia e herzegovina": "Bósnia e Herzegovina.jpg",
  "albânia": "Albânia.jpg",
  "albania": "Albânia.jpg",
  "finlândia": "Finlândia.jpg",
  "finlandia": "Finlândia.jpg",
  "belarus": "Bielorrúsia.jpg",
  "bielorrússia": "Bielorrúsia.jpg",
  "san marino": "San Marino.jpg",
  "montenegro": "Montenegro.jpg",
  "armênia": "Armênia.jpg",
  "armenia": "Armênia.jpg",
  "chipre": "Chipre.jpg",
  "letônia": "Letônia.jpg",
  "letonia": "Letônia.jpg",
  "eslováquia": "Eslováquia.jpg",
  "eslovaquia": "Eslováquia.jpg",
  "cazaquistão": "Cazaquistão.jpg",
  "cazaquistao": "Cazaquistão.jpg",
  "ilhas faroé": "Ilhas Faróe.jpg",
  "ilhas faroe": "Ilhas Faróe.jpg",
  "moldávia": "Moldávia.jpg",
  "moldavia": "Moldávia.jpg",
  "bulgária": "Bulgária.jpg",
  "bulgaria": "Bulgária.jpg",
  "islândia": "Islândia.jpg",
  "islandia": "Islândia.jpg",
  "luxemburgo": "Luxemburgo.jpg",
  "estônia": "Estônia.jpg",
  "estonia": "Estônia.jpg",
  "malta": "Malta.jpg",
  "gibraltar": "Gibraltar.jpg",
  "andorra": "Andorra.jpg",
  "lituânia": "Lituânia.jpg",
  "lituania": "Lituânia.jpg",
  "azerbaijão": "Azerbaijão.jpg",
  "azerbaijao": "Azerbaijão.jpg",
  "liechtenstein": "Liechtenstein.jpg",
};

const STADIUM_IMG_MAP: Record<string, string> = {
  "Ernst-Happel-Stadion": "Raiffeisen Arena.jpg",
  "Fadil Vokrri Stadium": "Stadiumi Fadil Vokrri.jpg",
  "Boris Paichadze Dinamo Arena": "Boris Paichadze.jpg",
  "Puskás Aréna": "Puskás Aréna.jpg",
  "PGE Narodowy": "PGE Narodowy.jpg",
  "Strawberry Arena": "Strawberry Arena.jpg",
  "Stadion Stožice": "Stožice Stadium.jpg",
  "Toše Proeski National Arena": "Toše Proeski Arena.jpg",
  "Vazgen Sargsyan Republican Stadium": "Vazgen Sargsyan Republican Stadium.jpg",
  "Podgorica City Stadium": "Podgorica City Stadium.jpg",
  "San Marino Stadium": "San Marino Stadium.jpg",
  "Arena Kombëtare": "Arena Kombëtare.jpg",
  "Tórsvøllur": "Tórsvøllur.jpg",
  "Futbal Tatran Aréna": "Futbal Tatran Arena.jpg",
  "Laugardalsvöllur": "Laugardalsvöllur.jpg",
  "Hristo Botev Stadium": "Stadion Hristo Botev.jpg",
  "Estadi Nacional": "Nou Estadi d'Encamp.jpg",
  "Rheinpark Stadion": "Rheinpark Stadion.jpg",
};

export const seedMatchesBCD = mutation({
  handler: async (ctx) => {
    // 1. Localiza a liga UNL
    let league = await ctx.db
      .query("leagues")
      .filter((q) => q.eq(q.field("code"), "UNL"))
      .first();

    if (!league) {
      league = await ctx.db
        .query("leagues")
        .filter((q) => q.eq(q.field("name"), "UEFA Nations League"))
        .first();
    }

    if (!league) throw new Error("Liga UNL não encontrada.");

    // 2. Garante que os jogos existentes da Liga A tenham division = 'A'
    const ligaAMatches = await ctx.db
      .query("matches")
      .withIndex("by_league", (q) => q.eq("leagueId", league._id))
      .collect();

    for (const m of ligaAMatches) {
      if (!m.division) {
        const div = m.group?.charAt(0) || "A";
        await ctx.db.patch(m._id, { division: div });
      }
    }

    // 3. Atualiza escudos das seleções na tabela 'teams' para garantir que apontam para os assets oficiais locais
    const allTeams = await ctx.db.query("teams").collect();
    for (const t of allTeams) {
      const flagFile = NATION_TEAMS_FLAGS[t.name.trim().toLowerCase()];
      if (flagFile) {
        const expectedLogoUrl = `/assets/flags_nations/${flagFile}`;
        if (t.logoUrl !== expectedLogoUrl) {
          await ctx.db.patch(t._id, { logoUrl: expectedLogoUrl });
        }
      }
    }

    // 4. Confrontos da Rodada 1 das Ligas B, C e D
    const fixturesBCD = [
      // Liga B
      { division: "B", group: "B3", home: "Áustria", away: "Israel", date: "2026-09-24T18:45:00Z", venue: "Ernst-Happel-Stadion" },
      { division: "B", group: "B3", home: "Kosovo", away: "República da Irlanda", date: "2026-09-24T18:45:00Z", venue: "Fadil Vokrri Stadium" },
      { division: "B", group: "B2", home: "Geórgia", away: "Irlanda do Norte", date: "2026-09-25T16:00:00Z", venue: "Boris Paichadze Dinamo Arena" },
      { division: "B", group: "B2", home: "Hungria", away: "Ucrânia", date: "2026-09-25T18:45:00Z", venue: "Puskás Aréna" },
      { division: "B", group: "B4", home: "Polônia", away: "Bósnia e Herzegovina", date: "2026-09-25T18:45:00Z", venue: "PGE Narodowy" },
      { division: "B", group: "B4", home: "Suécia", away: "Romênia", date: "2026-09-25T18:45:00Z", venue: "Strawberry Arena" },
      { division: "B", group: "B1", home: "Eslovênia", away: "Escócia", date: "2026-09-26T13:00:00Z", venue: "Stadion Stožice" },
      { division: "B", group: "B1", home: "Macedônia do Norte", away: "Suíça", date: "2026-09-26T18:45:00Z", venue: "Toše Proeski National Arena" },

      // Liga C
      { division: "C", group: "C2", home: "Armênia", away: "Letônia", date: "2026-09-25T16:00:00Z", venue: "Vazgen Sargsyan Republican Stadium" },
      { division: "C", group: "C2", home: "Montenegro", away: "Chipre", date: "2026-09-25T18:45:00Z", venue: "Podgorica City Stadium" },
      { division: "C", group: "C1", home: "San Marino", away: "Finlândia", date: "2026-09-26T16:00:00Z", venue: "San Marino Stadium" },
      { division: "C", group: "C1", home: "Albânia", away: "Bielorrússia", date: "2026-09-26T18:45:00Z", venue: "Arena Kombëtare" },
      { division: "C", group: "C3", home: "Ilhas Faroé", away: "Cazaquistão", date: "2026-09-26T16:00:00Z", venue: "Tórsvøllur" },
      { division: "C", group: "C3", home: "Eslováquia", away: "Moldávia", date: "2026-09-26T18:45:00Z", venue: "Futbal Tatran Aréna" },
      { division: "C", group: "C4", home: "Islândia", away: "Estônia", date: "2026-09-26T16:00:00Z", venue: "Laugardalsvöllur" },
      { division: "C", group: "C4", home: "Bulgária", away: "Luxemburgo", date: "2026-09-26T18:45:00Z", venue: "Hristo Botev Stadium" },

      // Liga D
      { division: "D", group: "D1", home: "Andorra", away: "Malta", date: "2026-09-24T16:00:00Z", venue: "Estadi Nacional" },
      { division: "D", group: "D2", home: "Liechtenstein", away: "Lituânia", date: "2026-09-24T18:45:00Z", venue: "Rheinpark Stadion" },
    ];

    const findTeam = async (name: string) => {
      let t = await ctx.db
        .query("teams")
        .filter((q) => q.eq(q.field("name"), name))
        .first();
      if (t) return t;

      const aliases: Record<string, string[]> = {
        "República da Irlanda": ["Irlanda", "Ireland"],
        "Irlanda": ["República da Irlanda"],
        "Tchéquia": ["República Checa", "República Tcheca", "Czechia"],
        "Bielorrússia": ["Belarus", "Bielorrúsia"],
        "Bósnia e Herzegovina": ["Bósnia", "Bosnia", "Bósnia & Herzegovina"],
        "Países Baixos": ["Holanda", "Netherlands"],
        "Macedônia do Norte": ["Macedônia"],
      };

      const candidateNames = aliases[name] || [];
      for (const alt of candidateNames) {
        t = await ctx.db
          .query("teams")
          .filter((q) => q.eq(q.field("name"), alt))
          .first();
        if (t) return t;
      }

      // Cria se não existir
      const flagFile = NATION_TEAMS_FLAGS[name.trim().toLowerCase()] || `${name}.jpg`;
      const id = await ctx.db.insert("teams", {
        name,
        shortName: name,
        logoUrl: `/assets/flags_nations/${flagFile}`,
      });
      return await ctx.db.get(id);
    };

    let insertedCount = 0;
    let updatedCount = 0;

    for (const f of fixturesBCD) {
      const homeTeam = await findTeam(f.home);
      const awayTeam = await findTeam(f.away);

      if (!homeTeam || !awayTeam) continue;

      // Trata o estádio
      const stadiumFile = STADIUM_IMG_MAP[f.venue] || `${f.venue}.jpg`;
      let stadiumDoc = await ctx.db
        .query("stadiums")
        .filter((q) => q.eq(q.field("name"), f.venue))
        .first();

      if (!stadiumDoc) {
        const stadiumId = await ctx.db.insert("stadiums", {
          name: f.venue,
          city: f.venue,
          imageUrl: `/assets/stadiums_nations/${stadiumFile}`,
          teamId: homeTeam._id,
        });
        stadiumDoc = await ctx.db.get(stadiumId);
      }

      // Evita duplicados
      const existing = await ctx.db
        .query("matches")
        .withIndex("by_league", (q) => q.eq("leagueId", league._id))
        .filter((q) =>
          q.and(
            q.eq(q.field("homeTeamId"), homeTeam._id),
            q.eq(q.field("awayTeamId"), awayTeam._id),
            q.eq(q.field("round"), "Rodada 1")
          )
        )
        .first();

      const startTime = new Date(f.date).getTime();
      const utcHours = parseInt(f.date.slice(11, 13), 10);
      const utcMins = f.date.slice(14, 16);
      const brtHours = (utcHours - 3 + 24) % 24;
      const statusShort = `${String(brtHours).padStart(2, "0")}:${utcMins}`;

      if (existing) {
        await ctx.db.patch(existing._id, {
          division: f.division,
          group: f.group,
          startTime,
          statusShort,
          stadiumId: stadiumDoc?._id,
        });
        updatedCount++;
      } else {
        await ctx.db.insert("matches", {
          leagueId: league._id,
          round: "Rodada 1",
          stage: "Fase de Grupos",
          division: f.division,
          group: f.group,
          homeTeamId: homeTeam._id,
          awayTeamId: awayTeam._id,
          homeScore: 0,
          awayScore: 0,
          status: "SCHEDULED",
          statusShort,
          startTime,
          stadiumId: stadiumDoc?._id,
        });
        insertedCount++;
      }
    }

    return {
      success: true,
      totalFixtures: fixturesBCD.length,
      insertedCount,
      updatedCount,
      message: `Partidas das Ligas B, C e D cadastradas com sucesso!`,
    };
  },
});
