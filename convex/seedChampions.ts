import { mutation } from "./_generated/server";
import type { Doc, Id } from "./_generated/dataModel";
import { computeStandingsData } from "./leagues";

export const seedChampionsLeague = mutation({
  args: {},
  handler: async (ctx) => {
    // 1. Criar/Garantir a liga UEFA Champions League
    let ucl = await ctx.db
      .query("leagues")
      .filter((q) =>
        q.or(
          q.eq(q.field("externalId"), 2),
          q.eq(q.field("name"), "UEFA Champions League")
        )
      )
      .first();

    if (!ucl) {
      const uclId = await ctx.db.insert("leagues", {
        name: "UEFA Champions League",
        code: "UCL",
        country: "Europa",
        logoUrl: "https://media.api-sports.io/football/leagues/2.png",
        season: 2026,
        type: "cup",
        format: "league_phase",
        currentStage: "Fase de Liga",
        priority: 1,
        externalId: 2,
      });
      ucl = (await ctx.db.get(uclId))!;
    } else {
      await ctx.db.patch(ucl._id, {
        name: "UEFA Champions League",
        code: "UCL",
        format: "league_phase",
        currentStage: "Fase de Liga",
        type: "cup",
        priority: 1,
        season: 2026,
      });
      ucl = (await ctx.db.get(ucl._id))!;
    }

    // 2. Os 36 Clubes Participantes Oficiais e seus Estádios Padrão
    const uclTeamsDefs = [
      { name: "AEK Athens", shortName: "AEK", code: "AEK", externalId: 554, logoUrl: "https://media.api-sports.io/football/teams/554.png", stadium: "OPAP Arena", city: "Atenas (GRE)" },
      { name: "LASK", shortName: "LASK", code: "LASK", externalId: 1043, logoUrl: "https://media.api-sports.io/football/teams/1043.png", stadium: "Raiffeisen Arena", city: "Linz (AUT)" },
      { name: "Club Brugge", shortName: "Club Brugge", code: "CLU", externalId: 569, logoUrl: "https://media.api-sports.io/football/teams/569.png", stadium: "Jan Breydelstadion", city: "Bruges (BEL)" },
      { name: "Aston Villa", shortName: "Aston Villa", code: "AVL", externalId: 66, logoUrl: "https://media.api-sports.io/football/teams/66.png", stadium: "Villa Park", city: "Birmingham (ING)" },
      { name: "Borussia Dortmund", shortName: "Dortmund", code: "BVB", externalId: 165, logoUrl: "https://media.api-sports.io/football/teams/165.png", stadium: "Signal Iduna Park", city: "Dortmund (ALE)" },
      { name: "Villarreal", shortName: "Villarreal", code: "VIL", externalId: 533, logoUrl: "https://media.api-sports.io/football/teams/533.png", stadium: "Estadio de la Cerámica", city: "Vila-real (ESP)" },
      { name: "Porto", shortName: "Porto", code: "POR", externalId: 212, logoUrl: "https://media.api-sports.io/football/teams/212.png", stadium: "Estádio do Dragão", city: "Porto (POR)" },
      { name: "Manchester City", shortName: "Man City", code: "MCI", externalId: 50, logoUrl: "https://media.api-sports.io/football/teams/50.png", stadium: "Etihad Stadium", city: "Manchester (ING)" },
      { name: "Lille", shortName: "Lille", code: "LIL", externalId: 79, logoUrl: "https://media.api-sports.io/football/teams/79.png", stadium: "Decathlon Arena - Stade Pierre-Mauroy", city: "Villeneuve-d'Ascq (FRA)" },
      { name: "Real Betis", shortName: "Real Betis", code: "BET", externalId: 543, logoUrl: "https://media.api-sports.io/football/teams/543.png", stadium: "Estadio Benito Villamarín", city: "Sevilha (ESP)" },
      { name: "Real Madrid", shortName: "Real Madrid", code: "RMA", externalId: 541, logoUrl: "https://media.api-sports.io/football/teams/541.png", stadium: "Santiago Bernabéu", city: "Madri (ESP)" },
      { name: "Inter de Milão", shortName: "Inter", code: "INT", externalId: 505, logoUrl: "https://media.api-sports.io/football/teams/505.png", stadium: "San Siro", city: "Milão (ITA)" },
      { name: "Barcelona", shortName: "Barcelona", code: "BAR", externalId: 529, logoUrl: "https://media.api-sports.io/football/teams/529.png", stadium: "Spotify Camp Nou", city: "Barcelona (ESP)" },
      { name: "Feyenoord", shortName: "Feyenoord", code: "FEY", externalId: 247, logoUrl: "https://media.api-sports.io/football/teams/247.png", stadium: "Stadion Feijenoord", city: "Roterdã (HOL)" },
      { name: "Stuttgart", shortName: "Stuttgart", code: "STU", externalId: 172, logoUrl: "https://media.api-sports.io/football/teams/172.png", stadium: "MHPArena", city: "Stuttgart (ALE)" },
      { name: "Viking Stavanger", shortName: "Viking", code: "VIK", externalId: 329, logoUrl: "https://media.api-sports.io/football/teams/329.png", stadium: "Lyse Arena", city: "Stavanger (NOR)" },
      { name: "Liverpool", shortName: "Liverpool", code: "LIV", externalId: 40, logoUrl: "https://media.api-sports.io/football/teams/40.png", stadium: "Anfield", city: "Liverpool (ING)" },
      { name: "Atlético de Madrid", shortName: "Atlético Madrid", code: "ATM", externalId: 530, logoUrl: "https://media.api-sports.io/football/teams/530.png", stadium: "Riyadh Air Metropolitano", city: "Madri (ESP)" },
      { name: "Paris Saint-Germain", shortName: "PSG", code: "PSG", externalId: 85, logoUrl: "https://media.api-sports.io/football/teams/85.png", stadium: "Parc des Princes", city: "Paris (FRA)" },
      { name: "Slovan Bratislava", shortName: "Slovan", code: "SLO", externalId: 1988, logoUrl: "https://media.api-sports.io/football/teams/1988.png", stadium: "Štadión Tehelné pole", city: "Bratislava (ESQ)" },
      { name: "Napoli", shortName: "Napoli", code: "NAP", externalId: 492, logoUrl: "https://media.api-sports.io/football/teams/492.png", stadium: "Stadio Diego Armando Maradona", city: "Nápoles (ITA)" },
      { name: "Arsenal", shortName: "Arsenal", code: "ARS", externalId: 42, logoUrl: "https://media.api-sports.io/football/teams/42.png", stadium: "Emirates Stadium", city: "Londres (ING)" },
      { name: "Sporting CP", shortName: "Sporting", code: "SCP", externalId: 228, logoUrl: "https://media.api-sports.io/football/teams/228.png", stadium: "José Alvalade", city: "Lisboa (POR)" },
      { name: "Galatasaray SK", shortName: "Galatasaray", code: "GAL", externalId: 553, logoUrl: "https://media.api-sports.io/football/teams/553.png", stadium: "RAMS Park", city: "Istambul (TUR)" },
      { name: "Fenerbahçe", shortName: "Fenerbahçe", code: "FEN", externalId: 611, logoUrl: "https://media.api-sports.io/football/teams/611.png", stadium: "Chobani Stadium", city: "Istambul (TUR)" },
      { name: "Roma", shortName: "Roma", code: "ROM", externalId: 497, logoUrl: "https://media.api-sports.io/football/teams/497.png", stadium: "Stadio Olimpico", city: "Roma (ITA)" },
      { name: "PSV Eindhoven", shortName: "PSV", code: "PSV", externalId: 248, logoUrl: "https://media.api-sports.io/football/teams/248.png", stadium: "Philips Stadion", city: "Eindhoven (HOL)" },
      { name: "Shakhtar Donetsk", shortName: "Shakhtar", code: "SHA", externalId: 550, logoUrl: "https://media.api-sports.io/football/teams/550.png", stadium: "Metalist Stadium", city: "Kharkiv (UCR)" },
      { name: "Como", shortName: "Como", code: "COM", externalId: 523, logoUrl: "https://media.api-sports.io/football/teams/523.png", stadium: "Stadio Giuseppe Sinigaglia", city: "Como (ITA)" },
      { name: "RB Leipzig", shortName: "Leipzig", code: "RBL", externalId: 173, logoUrl: "https://media.api-sports.io/football/teams/173.png", stadium: "Red Bull Arena", city: "Leipzig (ALE)" },
      { name: "Bayern München", shortName: "Bayern", code: "BAY", externalId: 157, logoUrl: "https://media.api-sports.io/football/teams/157.png", stadium: "Allianz Arena", city: "Munique (ALE)" },
      { name: "FK Bodo Glimt", shortName: "Bodø/Glimt", code: "BOD", externalId: 327, logoUrl: "https://media.api-sports.io/football/teams/327.png", stadium: "Aspmyra Stadion", city: "Bodø (NOR)" },
      { name: "Manchester United", shortName: "Man Utd", code: "MUN", externalId: 33, logoUrl: "https://media.api-sports.io/football/teams/33.png", stadium: "Old Trafford", city: "Manchester (ING)" },
      { name: "Sabah", shortName: "Sabah", code: "SAB", externalId: 7771, logoUrl: "https://media.api-sports.io/football/teams/7771.png", stadium: "Bank Respublika Arena", city: "Masazır (AZE)" },
      { name: "Slavia Praha", shortName: "Slavia Praha", code: "SLA", externalId: 575, logoUrl: "https://media.api-sports.io/football/teams/575.png", stadium: "Fortuna Arena", city: "Praga (RTC)" },
      { name: "Lens", shortName: "Lens", code: "RCL", externalId: 116, logoUrl: "https://media.api-sports.io/football/teams/116.png", stadium: "Stade Bollaert-Delelis", city: "Lens (FRA)" },
    ];

    const allExistingTeams = await ctx.db.query("teams").collect();
    const allExistingStadiums = await ctx.db.query("stadiums").collect();

    const uclTeamMap = new Map<string, Id<"teams">>();
    const stadiumMap = new Map<string, Id<"stadiums">>();

    // Garante cada equipe e seu estádio oficial
    for (const t of uclTeamsDefs) {
      let team =
        allExistingTeams.find((tm) => tm.name.toLowerCase() === t.name.toLowerCase()) ||
        allExistingTeams.find((tm) => tm.externalId === t.externalId);

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
          shortName: t.shortName,
          code: t.code,
          externalId: t.externalId,
          logoUrl: team.logoUrl || t.logoUrl,
        });
        teamId = team._id;
      }
      uclTeamMap.set(t.name, teamId);

      // Estádio oficial do clube
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

    // Mapa de aliases para resolução dos clubes nas partidas
    const aliasMap = new Map<string, Id<"teams">>();
    for (const t of uclTeamsDefs) {
      const id = uclTeamMap.get(t.name)!;
      aliasMap.set(t.name.toLowerCase(), id);
      if (t.shortName) aliasMap.set(t.shortName.toLowerCase(), id);
    }
    aliasMap.set("aek", uclTeamMap.get("AEK Athens")!);
    aliasMap.set("dortmund", uclTeamMap.get("Borussia Dortmund")!);
    aliasMap.set("man city", uclTeamMap.get("Manchester City")!);
    aliasMap.set("inter", uclTeamMap.get("Inter de Milão")!);
    aliasMap.set("viking", uclTeamMap.get("Viking Stavanger")!);
    aliasMap.set("atlético madrid", uclTeamMap.get("Atlético de Madrid")!);
    aliasMap.set("atletico madrid", uclTeamMap.get("Atlético de Madrid")!);
    aliasMap.set("psg", uclTeamMap.get("Paris Saint-Germain")!);
    aliasMap.set("slovan", uclTeamMap.get("Slovan Bratislava")!);
    aliasMap.set("sporting", uclTeamMap.get("Sporting CP")!);
    aliasMap.set("galatasaray", uclTeamMap.get("Galatasaray SK")!);
    aliasMap.set("psv", uclTeamMap.get("PSV Eindhoven")!);
    aliasMap.set("shakhtar", uclTeamMap.get("Shakhtar Donetsk")!);
    aliasMap.set("leipzig", uclTeamMap.get("RB Leipzig")!);
    aliasMap.set("bayern", uclTeamMap.get("Bayern München")!);
    aliasMap.set("bodø/glimt", uclTeamMap.get("FK Bodo Glimt")!);
    aliasMap.set("bodo/glimt", uclTeamMap.get("FK Bodo Glimt")!);
    aliasMap.set("bodo glimt", uclTeamMap.get("FK Bodo Glimt")!);
    aliasMap.set("man utd", uclTeamMap.get("Manchester United")!);

    const getTeam = (alias: string): Id<"teams"> => {
      const clean = alias
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .trim();
      const id =
        uclTeamMap.get(alias) ||
        aliasMap.get(alias.toLowerCase()) ||
        aliasMap.get(clean);
      if (!id) throw new Error(`Time não encontrado para alias: ${alias}`);
      return id;
    };

    // 3. Os 18 Confrontos Oficiais da 1ª Rodada da Fase de Liga (Status: FINISHED)
    const round1Matches = [
      // 08/09/2026
      {
        home: "AEK",
        away: "LASK",
        hs: 1,
        as: 0,
        date: "2026-09-08T13:45:00-03:00",
        events: [
          { minute: 21, team: "home" as const, type: "GOAL" as const, player: "Răzvan Marin" },
        ],
      },
      {
        home: "Club Brugge",
        away: "Aston Villa",
        hs: 2,
        as: 3,
        date: "2026-09-08T13:45:00-03:00",
        events: [
          { minute: 11, team: "away" as const, type: "GOAL" as const, player: "John McGinn" },
          { minute: 19, team: "home" as const, type: "GOAL" as const, player: "Hugo Vetlesen" },
          { minute: 22, team: "away" as const, type: "GOAL" as const, player: "Emiliano Buendía" },
          { minute: 43, team: "away" as const, type: "GOAL" as const, player: "Nicolas Jackson" },
          { minute: 61, team: "home" as const, type: "GOAL" as const, player: "Nicolò Tresoldi", detail: "Penalty" },
        ],
      },
      {
        home: "Dortmund",
        away: "Villarreal",
        hs: 3,
        as: 2,
        date: "2026-09-08T16:00:00-03:00",
        events: [
          { minute: 53, team: "home" as const, type: "GOAL" as const, player: "Renato Veiga", detail: "OG" },
          { minute: 66, team: "away" as const, type: "GOAL" as const, player: "Santiago Mouriño" },
          { minute: 80, team: "home" as const, type: "GOAL" as const, player: "Serhou Guirassy" },
          { minute: 85, team: "home" as const, type: "GOAL" as const, player: "Serhou Guirassy", detail: "Penalty" },
          { minute: 93, team: "away" as const, type: "GOAL" as const, player: "Serhou Guirassy", detail: "OG" },
        ],
      },
      {
        home: "Porto",
        away: "Man City",
        hs: 0,
        as: 2,
        date: "2026-09-08T16:00:00-03:00",
        events: [
          { minute: 47, team: "away" as const, type: "GOAL" as const, player: "Erling Haaland" },
          { minute: 91, team: "away" as const, type: "GOAL" as const, player: "Erling Haaland" },
        ],
      },
      {
        home: "Lille",
        away: "Real Betis",
        hs: 2,
        as: 3,
        date: "2026-09-08T16:00:00-03:00",
        events: [
          { minute: 12, team: "home" as const, type: "GOAL" as const, player: "Ayase Ueda" },
          { minute: 33, team: "away" as const, type: "GOAL" as const, player: "Marc Bartra" },
          { minute: 36, team: "home" as const, type: "GOAL" as const, player: "Alexsandro Ribeiro" },
          { minute: 49, team: "away" as const, type: "GOAL" as const, player: "Marc Bartra" },
          { minute: 53, team: "away" as const, type: "GOAL" as const, player: "Troy Parrott" },
          { minute: 74, team: "home" as const, type: "RED_CARD" as const, player: "Thomas Meunier", detail: "Cartão Vermelho" },
        ],
      },
      {
        home: "Real Madrid",
        away: "Inter",
        hs: 2,
        as: 1,
        date: "2026-09-08T16:00:00-03:00",
        events: [
          { minute: 14, team: "home" as const, type: "GOAL" as const, player: "Kylian Mbappé" },
          { minute: 23, team: "home" as const, type: "GOAL" as const, player: "Federico Valverde" },
          { minute: 77, team: "away" as const, type: "GOAL" as const, player: "Carlos Augusto" },
        ],
      },

      // 09/09/2026
      {
        home: "Barcelona",
        away: "Feyenoord",
        hs: 5,
        as: 1,
        date: "2026-09-09T13:45:00-03:00",
        events: [
          { minute: 3, team: "home" as const, type: "GOAL" as const, player: "Raphinha" },
          { minute: 22, team: "home" as const, type: "GOAL" as const, player: "Karim Adeyemi" },
          { minute: 57, team: "home" as const, type: "GOAL" as const, player: "Raphinha" },
          { minute: 77, team: "home" as const, type: "GOAL" as const, player: "Lamine Yamal" },
          { minute: 82, team: "away" as const, type: "GOAL" as const, player: "Sem Steijn" },
          { minute: 85, team: "home" as const, type: "GOAL" as const, player: "Gabriel Jesus" },
        ],
      },
      {
        home: "Stuttgart",
        away: "Viking",
        hs: 3,
        as: 1,
        date: "2026-09-09T13:45:00-03:00",
        events: [
          { minute: 20, team: "home" as const, type: "GOAL" as const, player: "Ermedin Demirović" },
          { minute: 22, team: "away" as const, type: "GOAL" as const, player: "Zlatko Tripić" },
          { minute: 26, team: "home" as const, type: "GOAL" as const, player: "Ermedin Demirović" },
          { minute: 32, team: "home" as const, type: "GOAL" as const, player: "Ermedin Demirović" },
        ],
      },
      {
        home: "Liverpool",
        away: "Atlético Madrid",
        hs: 2,
        as: 1,
        date: "2026-09-09T16:00:00-03:00",
        events: [
          { minute: 17, team: "away" as const, type: "GOAL" as const, player: "Marcos Llorente" },
          { minute: 40, team: "home" as const, type: "GOAL" as const, player: "Dominik Szoboszlai" },
          { minute: 50, team: "home" as const, type: "GOAL" as const, player: "Alexis Mac Allister" },
        ],
      },
      {
        home: "PSG",
        away: "Slovan",
        hs: 6,
        as: 1,
        date: "2026-09-09T16:00:00-03:00",
        events: [
          { minute: 17, team: "home" as const, type: "GOAL" as const, player: "Ousmane Dembélé" },
          { minute: 23, team: "home" as const, type: "GOAL" as const, player: "Ousmane Dembélé" },
          { minute: 31, team: "home" as const, type: "GOAL" as const, player: "Ferran Torres" },
          { minute: 47, team: "home" as const, type: "GOAL" as const, player: "Ferran Torres" },
          { minute: 57, team: "home" as const, type: "GOAL" as const, player: "Ferran Torres" },
          { minute: 58, team: "away" as const, type: "GOAL" as const, player: "Suleiman Camara" },
          { minute: 87, team: "home" as const, type: "GOAL" as const, player: "Fabián Ruiz" },
        ],
      },
      {
        home: "Napoli",
        away: "Arsenal",
        hs: 0,
        as: 1,
        date: "2026-09-09T16:00:00-03:00",
        events: [
          { minute: 75, team: "away" as const, type: "GOAL" as const, player: "Martin Ødegaard" },
        ],
      },
      {
        home: "Sporting",
        away: "Galatasaray",
        hs: 3,
        as: 1,
        date: "2026-09-09T16:00:00-03:00",
        events: [
          { minute: 5, team: "away" as const, type: "GOAL" as const, player: "Gonçalo Inácio", detail: "OG" },
          { minute: 27, team: "home" as const, type: "GOAL" as const, player: "Geny Catamo" },
          { minute: 57, team: "home" as const, type: "GOAL" as const, player: "Luis Javier Suárez", detail: "Penalty" },
          { minute: 63, team: "home" as const, type: "GOAL" as const, player: "Rodrigo Zalazar" },
        ],
      },

      // 10/09/2026
      {
        home: "Fenerbahçe",
        away: "Roma",
        hs: 1,
        as: 1,
        date: "2026-09-10T13:45:00-03:00",
        events: [
          { minute: 39, team: "away" as const, type: "GOAL" as const, player: "Bryan Cristante" },
          { minute: 48, team: "home" as const, type: "GOAL" as const, player: "Archie Brown" },
        ],
      },
      {
        home: "PSV",
        away: "Shakhtar",
        hs: 1,
        as: 1,
        date: "2026-09-10T13:45:00-03:00",
        events: [
          { minute: 46, team: "away" as const, type: "GOAL" as const, player: "Gleiker Mendoza" },
          { minute: 48, team: "home" as const, type: "GOAL" as const, player: "Sergiño Dest" },
        ],
      },
      {
        home: "Como",
        away: "Leipzig",
        hs: 4,
        as: 1,
        date: "2026-09-10T16:00:00-03:00",
        events: [
          { minute: 15, team: "home" as const, type: "GOAL" as const, player: "Martin Baturina" },
          { minute: 38, team: "home" as const, type: "GOAL" as const, player: "Anastasios Douvikas" },
          { minute: 54, team: "home" as const, type: "GOAL" as const, player: "Assane Diao" },
          { minute: 58, team: "away" as const, type: "GOAL" as const, player: "Andrija Maksimović" },
          { minute: 90, team: "home" as const, type: "GOAL" as const, player: "Máximo Perrone" },
        ],
      },
      {
        home: "Bayern",
        away: "Bodø/Glimt",
        hs: 5,
        as: 0,
        date: "2026-09-10T16:00:00-03:00",
        events: [
          { minute: 47, team: "home" as const, type: "GOAL" as const, player: "Jamal Musiala" },
          { minute: 61, team: "home" as const, type: "GOAL" as const, player: "Harry Kane" },
          { minute: 61, team: "away" as const, type: "RED_CARD" as const, player: "Jostein Gundersen", detail: "Cartão Vermelho" },
          { minute: 77, team: "home" as const, type: "GOAL" as const, player: "Alphonso Davies" },
          { minute: 83, team: "home" as const, type: "GOAL" as const, player: "Michael Olise" },
          { minute: 92, team: "home" as const, type: "GOAL" as const, player: "Michael Olise" },
        ],
      },
      {
        home: "Man Utd",
        away: "Sabah",
        hs: 4,
        as: 0,
        date: "2026-09-10T16:00:00-03:00",
        events: [
          { minute: 27, team: "home" as const, type: "GOAL" as const, player: "Matheus Cunha" },
          { minute: 42, team: "home" as const, type: "GOAL" as const, player: "Bruno Fernandes" },
          { minute: 45, team: "home" as const, type: "GOAL" as const, player: "Benjamin Šeško" },
          { minute: 68, team: "home" as const, type: "GOAL" as const, player: "Lisandro Martínez" },
        ],
      },
      {
        home: "Slavia Praha",
        away: "Lens",
        hs: 2,
        as: 3,
        date: "2026-09-10T16:00:00-03:00",
        events: [
          { minute: 51, team: "home" as const, type: "GOAL" as const, player: "Danijel Šturm" },
          { minute: 73, team: "away" as const, type: "GOAL" as const, player: "Abdallah Sima" },
          { minute: 82, team: "home" as const, type: "RED_CARD" as const, player: "Oscar Dorley", detail: "Cartão Vermelho" },
          { minute: 88, team: "home" as const, type: "GOAL" as const, player: "Danijel Šturm" },
          { minute: 91, team: "away" as const, type: "GOAL" as const, player: "Florian Thauvin" },
          { minute: 93, team: "away" as const, type: "GOAL" as const, player: "Ruben Aguilar" },
        ],
      },
    ];

    // 4. Guardrail de Idempotência: busca partidas existentes da Rodada 1
    const existingUclMatches = await ctx.db
      .query("matches")
      .withIndex("by_league", (q) => q.eq("leagueId", ucl!._id))
      .collect();

    let matchesInserted = 0;
    let matchesUpdated = 0;

    for (const m of round1Matches) {
      const homeId = getTeam(m.home);
      const awayId = getTeam(m.away);
      const homeTeamDef = uclTeamsDefs.find((t) => uclTeamMap.get(t.name) === homeId)!;
      const stadiumId = stadiumMap.get(homeTeamDef.name);

      const existingMatch = existingUclMatches.find(
        (em) =>
          em.round === "Rodada 1" &&
          em.homeTeamId === homeId &&
          em.awayTeamId === awayId
      );

      let matchId: Id<"matches">;
      if (!existingMatch) {
        matchId = await ctx.db.insert("matches", {
          leagueId: ucl!._id,
          homeTeamId: homeId,
          awayTeamId: awayId,
          stadiumId,
          homeScore: m.hs,
          awayScore: m.as,
          round: "Rodada 1",
          stage: "Fase de Liga",
          status: "FINISHED",
          statusShort: "FT",
          startTime: new Date(m.date).getTime(),
        });
        matchesInserted++;
      } else {
        matchId = existingMatch._id;
        await ctx.db.patch(matchId, {
          stadiumId,
          homeScore: m.hs,
          awayScore: m.as,
          stage: "Fase de Liga",
          status: "FINISHED",
          statusShort: "FT",
          startTime: new Date(m.date).getTime(),
        });
        matchesUpdated++;
      }

      // Eventos da partida (idempotente: remove anteriores e insere lances oficiais)
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
          detail: (ev as any).detail,
        });
      }
    }

    // 5. Recalcula e Persiste a Classificação Oficial da Fase de Liga com os 36 Clubes
    const allFinishedMatches = await ctx.db
      .query("matches")
      .withIndex("by_league", (q) => q.eq("leagueId", ucl!._id))
      .filter((q) => q.eq(q.field("status"), "FINISHED"))
      .collect();

    const allUclTeamIds = Array.from(uclTeamMap.values());
    const teamDocMap = new Map<string, Doc<"teams">>();
    for (const tid of allUclTeamIds) {
      const doc = await ctx.db.get(tid);
      if (doc) teamDocMap.set(tid, doc);
    }

    const uclStandingsList = computeStandingsData(
      allFinishedMatches,
      allUclTeamIds,
      teamDocMap,
      "all",
      ucl.name
    );

    // Remove classificação anterior e grava as 36 posições com descrições das zonas
    const oldStandings = await ctx.db
      .query("standings")
      .withIndex("by_league_rank", (q) => q.eq("leagueId", ucl!._id))
      .collect();
    for (const row of oldStandings) await ctx.db.delete(row._id);

    for (const row of uclStandingsList) {
      await ctx.db.insert("standings", {
        leagueId: ucl!._id,
        season: ucl.season,
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
      league: {
        id: ucl._id,
        name: ucl.name,
        code: ucl.code,
        format: ucl.format,
        priority: ucl.priority,
      },
      teamsCount: allUclTeamIds.length,
      round1MatchesInserted: matchesInserted,
      round1MatchesUpdated: matchesUpdated,
      standingsCount: uclStandingsList.length,
      zones: {
        oitavas: uclStandingsList.filter((s) => s.description === "Oitavas de Final").length,
        playoffs: uclStandingsList.filter((s) => s.description === "Play-offs das Oitavas").length,
        eliminados: uclStandingsList.filter((s) => s.description === "Eliminado").length,
      },
    };
  },
});
