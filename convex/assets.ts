import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

// Gera a URL temporária para o cliente ou script subir a imagem
export const generateUploadUrl = mutation(async (ctx) => {
  return await ctx.storage.generateUploadUrl();
});

const TEAM_ALIASES: Record<string, string> = {
  // Clubes Série B
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

  // Clubes Champions League e Europeus
  "fc barcelona": "barcelona",
  "barcelona": "barcelona",
  "real madrid": "real madrid",
  "real madrid cf": "real madrid",
  "bayern munich": "bayern munchen",
  "bayern de munique": "bayern munchen",
  "bayern munchen": "bayern munchen",
  "fc bayern munchen": "bayern munchen",
  "manchester city": "manchester city",
  "man city": "manchester city",
  "manchester united": "manchester united",
  "man united": "manchester united",
  "arsenal": "arsenal",
  "arsenal fc": "arsenal",
  "liverpool": "liverpool",
  "liverpool fc": "liverpool",
  "paris saint germain": "paris saint germain",
  "paris saint-germain": "paris saint germain",
  "psg": "paris saint germain",
  "psg copia": "paris saint germain",
  "inter milan": "inter de milao",
  "inter de milao": "inter de milao",
  "internazionale": "inter de milao",
  "inter": "inter de milao",
  "ac milan": "ac milan",
  "milan": "ac milan",
  "borussia dortmund": "borussia dortmund",
  "dortmund": "borussia dortmund",
  "atletico de madrid": "atletico de madrid",
  "atletico madrid": "atletico de madrid",
  "rb leipzig": "rb leipzig",
  "rb leipzig copia": "rb leipzig",
  "leipzig": "rb leipzig",
  "bayer leverkusen": "bayer leverkusen",
  "leverkusen": "bayer leverkusen",
  "juventus": "juventus",
  "atalanta": "atalanta",
  "aston villa": "aston villa",
  "sporting cp": "sporting cp",
  "sporting lisboa": "sporting cp",
  "sporting": "sporting cp",
  "benfica": "benfica",
  "sl benfica": "benfica",
  "porto": "porto",
  "porto copia": "porto",
  "fc porto": "porto",
  "feyenoord": "feyenoord",
  "feyenoord rotterdam": "feyenoord",
  "psv": "psv eindhoven",
  "psv copia": "psv eindhoven",
  "psv eindhoven": "psv eindhoven",
  "club brugge": "club brugge",
  "brugge": "club brugge",
  "shakhtar donetsk": "shakhtar donetsk",
  "shakhtar": "shakhtar donetsk",
  "lille": "lille",
  "lille osc": "lille",
  "stuttgart": "stuttgart",
  "vfb stuttgart": "stuttgart",
  "slovan bratislava": "slovan bratislava",
  "celtic": "celtic",
  "monaco": "monaco",
  "as monaco": "monaco",
  "bologna": "bologna",
  "girona": "girona",
  "sparta praha": "sparta praha",
  "sparta praga": "sparta praha",
  "slavia praha": "slavia praha",
  "slavia praga": "slavia praha",
  "crvena zvezda": "crvena zvezda",
  "estrela vermelha": "crvena zvezda",
  "dinamo zagreb": "dinamo zagreb",
  "red bull salzburg": "red bull salzburg",
  "salzburg": "red bull salzburg",
  "young boys": "young boys",
  "sturm graz": "sturm graz",
  "brest": "brest",
  "stade brestois": "brest",
  "como": "como",
  "napoli": "napoli",
  "roma": "roma",
  "villarreal": "villarreal",
  "real betis": "real betis",
  "real betis copia": "real betis",
  "lens": "lens",
  "galatasaray": "galatasaray",
  "galatasaray sk": "galatasaray",
  "fenerbahce": "fenerbahce",
  "fenerbahce sk": "fenerbahce",
  "fk bodo glimt": "fk bodo glimt",
  "aek athens": "aek athens",
  "lask": "lask",
  "viking stavanger": "viking stavanger",
  "sabah": "sabah",
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

// Vincula a imagem subida ao Time
export const linkTeamLogo = mutation({
  args: {
    teamName: v.string(),
    storageId: v.id("_storage"),
  },
  handler: async (ctx, args) => {
    const url = await ctx.storage.getUrl(args.storageId);
    if (!url) throw new Error("Falha ao gerar URL da imagem");

    const targetNorm = normalizeTeamName(args.teamName);
    const allTeams = await ctx.db.query("teams").collect();
    const matchingTeams = allTeams.filter((t) => normalizeTeamName(t.name) === targetNorm);

    if (matchingTeams.length > 0) {
      for (const team of matchingTeams) {
        await ctx.db.patch(team._id, {
          logoUrl: url,
          customLogoStorageId: args.storageId,
        });
      }
      return { success: true, teamId: matchingTeams[0]._id, url, name: matchingTeams[0].name };
    }

    // Se o time não existir ainda, cria
    const newTeamId = await ctx.db.insert("teams", {
      name: args.teamName,
      logoUrl: url,
      customLogoStorageId: args.storageId,
    });
    return { success: true, teamId: newTeamId, url, name: args.teamName };
  },
});

// Vincula a imagem subida à Liga
export const linkLeagueLogo = mutation({
  args: {
    leagueName: v.string(),
    storageId: v.id("_storage"),
  },
  handler: async (ctx, args) => {
    const url = await ctx.storage.getUrl(args.storageId);
    if (!url) throw new Error("Falha ao gerar URL da imagem");

    const clean = (str: string) =>
      str.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[-_]/g, " ").trim();

    const target = clean(args.leagueName);
    const allLeagues = await ctx.db.query("leagues").collect();
    const league = allLeagues.find((l) => clean(l.name) === target);

    if (league) {
      await ctx.db.patch(league._id, {
        logoUrl: url,
        customLogoStorageId: args.storageId,
      });
      return { success: true, leagueId: league._id, url, name: league.name };
    }

    return { success: false, reason: "LEAGUE_NOT_FOUND" };
  },
});

// Dicionário de normalização e aliases de Estádios para a Série B
export const STADIUM_ALIASES: Record<string, string> = {
  // Arena Independência
  "arena independencia": "Arena Independência",
  "independencia": "Arena Independência",

  // Arena Pantanal
  "arena pantanal": "Arena Pantanal",

  // Estádio Alfredo Jaconi
  "estadio alfredo jaconi": "Estádio Alfredo Jaconi",
  "alfredo jaconi": "Estádio Alfredo Jaconi",

  // Estádio Antônio Accioly
  "estadio antonio accioly": "Antônio Accioly",
  "antonio accioly": "Antônio Accioly",

  // Estádio da Ressacada
  "estadio da ressacada": "Estádio da Ressacada",
  "ressacada": "Estádio da Ressacada",

  // Estádio da Serrinha / Hailé Pinheiro
  "estadio da serrinha": "Estádio da Serrinha",
  "serrinha": "Estádio da Serrinha",
  "haile pinheiro": "Estádio da Serrinha",
  "haile pinheiro (serrinha)": "Estádio da Serrinha",
  "haile pinheiro serrinha": "Estádio da Serrinha",

  // Estádio dos Aflitos
  "estadio dos aflitos": "Estádio dos Aflitos",
  "aflitos": "Estádio dos Aflitos",

  // Estádio Dr. Jorge Ismael de Biasi
  "estadio dr jorge ismael de biasi": "Jorge Ismael de Biasi",
  "estadio dr. jorge ismael de biasi": "Jorge Ismael de Biasi",
  "estadio jorge ismael de biasi": "Jorge Ismael de Biasi",
  "jorge ismael de biasi": "Jorge Ismael de Biasi",
  "jorjao": "Jorge Ismael de Biasi",

  // Estádio Germano Krüger
  "estadio germano kruger": "Estádio Germano Krüger",
  "germano kruger": "Estádio Germano Krüger",

  // Estádio Governador Plácido Castelo / Castelão
  "estadio governador placido castelo": "Arena Castelão",
  "governador placido castelo": "Arena Castelão",
  "castelao": "Arena Castelão",
  "castelao (ce)": "Arena Castelão",
  "castelao ce": "Arena Castelão",
  "arena castelao": "Arena Castelão",

  // Estádio Heriberto Hülse
  "estadio heriberto hulse": "Estádio Heriberto Hülse",
  "heriberto hulse": "Estádio Heriberto Hülse",

  // Estádio Jacy Scaff / Estádio do Café / VGD
  "estadio jacy scaff": "Estádio do Café",
  "jacy scaff": "Estádio do Café",
  "estadio do cafe": "Estádio do Café",
  "vgd": "Estádio do Café",

  // Estádio Joaquim Portugal / Arena Sicredi
  "estadio joaquim portugal": "Arena Sicredi",
  "joaquim portugal": "Arena Sicredi",
  "arena sicredi": "Arena Sicredi",

  // Estádio Onésio Brasileiro Alvarenga / OBA
  "estadio onesio brasileiro alvarenga": "Onésio Brasileiro Alvarenga",
  "onesio brasileiro alvarenga": "Onésio Brasileiro Alvarenga",
  "oba": "Onésio Brasileiro Alvarenga",

  // Estádio Primeiro de Maio
  "estadio primeiro de maio": "Estádio Primeiro de Maio",
  "primeiro de maio": "Estádio Primeiro de Maio",

  // Estádio Rei Pelé
  "estadio rei pele": "Estádio Rei Pelé",
  "rei pele": "Estádio Rei Pelé",

  // Estádio Santa Cruz / Arena Nicnet
  "estadio santa cruz": "Estádio Santa Cruz",
  "santa cruz": "Estádio Santa Cruz",
  "arena nicnet": "Estádio Santa Cruz",

  // Ilha do Retiro / Adelmar da Costa Carvalho
  "ilha do retiro": "Ilha do Retiro",
  "adelmar da costa carvalho": "Ilha do Retiro",
  "estadio adelmar da costa carvalho": "Ilha do Retiro",

  // Moisés Lucarelli / Majestoso
  "moises lucarelli": "Moisés Lucarelli",
  "majestoso": "Moisés Lucarelli",
  "estadio moises lucarelli": "Moisés Lucarelli",

  // Champions League e Estádios Europeus
  "allianz arena": "Allianz Arena",
  "anfield": "Anfield",
  "anfield road": "Anfield",
  "emirates stadium": "Emirates Stadium",
  "emirates": "Emirates Stadium",
  "etihad stadium": "Etihad Stadium",
  "etihad": "Etihad Stadium",
  "city of manchester stadium": "Etihad Stadium",
  "san siro": "San Siro",
  "giuseppe meazza": "San Siro",
  "estadio giuseppe meazza": "San Siro",
  "stadio giuseppe meazza": "San Siro",
  "santiago bernabeu": "Santiago Bernabéu",
  "estadio santiago bernabeu": "Santiago Bernabéu",
  "bernabeu": "Santiago Bernabéu",
  "parc des princes": "Parc des Princes",
  "parque dos principes": "Parc des Princes",
  "signal iduna park": "Signal Iduna Park",
  "westfalenstadion": "Signal Iduna Park",
  "spotify camp nou": "Spotify Camp Nou",
  "camp nou": "Spotify Camp Nou",
  "estadio camp nou": "Spotify Camp Nou",
  "riyadh air metropolitano": "Riyadh Air Metropolitano",
  "civitas metropolitano": "Riyadh Air Metropolitano",
  "wanda metropolitano": "Riyadh Air Metropolitano",
  "metropolitano": "Riyadh Air Metropolitano",
  "estadio metropolitano": "Riyadh Air Metropolitano",
  "stadion feijenoord": "Stadion Feijenoord",
  "de kuip": "Stadion Feijenoord",
  "feijenoord": "Stadion Feijenoord",
  "jan breydelstadion": "Jan Breydelstadion",
  "jan breydel stadium": "Jan Breydelstadion",
  "jan breydel": "Jan Breydelstadion",
  "jose alvalade": "José Alvalade",
  "estadio jose alvalade": "José Alvalade",
  "alvalade": "José Alvalade",
  "mhparena": "MHPArena",
  "mhp arena": "MHPArena",
  "mercedes benz arena": "MHPArena",
  "villa park": "Villa Park",
  "decathlon arena - stade pierre mauroy": "Decathlon Arena - Stade Pierre-Mauroy",
  "decathlon arena stade pierre mauroy": "Decathlon Arena - Stade Pierre-Mauroy",
  "stade pierre mauroy": "Decathlon Arena - Stade Pierre-Mauroy",
  "pierre mauroy": "Decathlon Arena - Stade Pierre-Mauroy",
  "philips stadion": "Philips Stadion",
  "philips stadium": "Philips Stadion",
  "red bull arena": "Red Bull Arena",
  "stadio olimpico": "Stadio Olimpico",
  "stadio olimpico di roma": "Stadio Olimpico",
  "olimpico di roma": "Stadio Olimpico",
  "olimpico": "Stadio Olimpico",
  "stadio diego armando maradona": "Stadio Diego Armando Maradona",
  "diego armando maradona": "Stadio Diego Armando Maradona",
  "san paolo": "Stadio Diego Armando Maradona",
  "old trafford": "Old Trafford",
  "estadio do dragao": "Estádio do Dragão",
  "do dragao": "Estádio do Dragão",
  "dragao": "Estádio do Dragão",
  "benito villamarin": "Estadio Benito Villamarín",
  "estadio benito villamarin": "Estadio Benito Villamarín",
  "estadio de la ceramica": "Estadio de la Cerámica",
  "de la ceramica": "Estadio de la Cerámica",
  "el madrigal": "Estadio de la Cerámica",
  "stade bollaert delelis": "Stade Bollaert-Delelis",
  "bollaert delelis": "Stade Bollaert-Delelis",
  "stadio giuseppe sinigaglia": "Stadio Giuseppe Sinigaglia",
  "giuseppe sinigaglia": "Stadio Giuseppe Sinigaglia",
  "rams park": "RAMS Park",
  "ali sami yen": "RAMS Park",
  "fortuna arena": "Fortuna Arena",
  "eden arena": "Fortuna Arena",
  "stadion tehelne pole": "Štadión Tehelné pole",
  "tehelne pole": "Štadión Tehelné pole",
  "oblasny sportkomplex metalist": "Metalist Stadium",
  "metalist stadium": "Metalist Stadium",
  "opap arena": "OPAP Arena",
  "agia sophia stadium": "OPAP Arena",
  "raiffeisen arena": "Raiffeisen Arena",
  "aspmyra stadion": "Aspmyra Stadion",
  "bank respublika arena": "Bank Respublika Arena",
  "chobani stadium": "Chobani Stadium",
  "lyse arena": "Lyse Arena",
  "allianz stadium": "Allianz Stadium",
  "wankdorf stadium": "Wankdorf Stadium",
  "wankdorf": "Wankdorf Stadium",
  "epet arena": "epet ARENA",
  "renato dall ara": "Renato Dall'Ara",
  "renato dallara": "Renato Dall'Ara",
  "celtic park": "Celtic Park",
  "rajko mitic stadium": "Rajko Mitić Stadium",
  "rajko mitic": "Rajko Mitić Stadium",
  "marakana de belgrado": "Rajko Mitić Stadium",
  "stade louis ii": "Stade Louis-II",
  "stade louis 2": "Stade Louis-II",
  "gewiss stadium": "Gewiss Stadium",
  "stade de roudourou": "Stade de Roudourou",
  "roudourou": "Stade de Roudourou",
};

export const cleanStadiumString = (str: string): string => {
  return str
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[-_.,()]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
};

export const normalizeStadiumName = (str: string): string => {
  const clean = cleanStadiumString(str);
  return STADIUM_ALIASES[clean] || str;
};

export function findMatchingStadium(allStadiums: any[], rawQuery: string): any | null {
  const cleanQuery = cleanStadiumString(rawQuery);
  const canonicalTarget = STADIUM_ALIASES[cleanQuery] || rawQuery;
  const cleanCanonical = cleanStadiumString(canonicalTarget);

  // 1. Busca exata por nome
  let match = allStadiums.find(
    (s) =>
      s.name.toLowerCase() === rawQuery.toLowerCase() ||
      s.name.toLowerCase() === canonicalTarget.toLowerCase()
  );
  if (match) return match;

  // 2. Busca por alias canônico normalizado
  match = allStadiums.find((s) => {
    const sClean = cleanStadiumString(s.name);
    const sCanonical = cleanStadiumString(STADIUM_ALIASES[sClean] || s.name);
    return (
      sCanonical === cleanCanonical ||
      sClean === cleanQuery ||
      sClean === cleanCanonical ||
      sCanonical === cleanQuery
    );
  });
  if (match) return match;

  // 3. Busca aproximada / fuzzy (includes)
  match = allStadiums.find((s) => {
    const sClean = cleanStadiumString(s.name);
    const sCore = sClean.replace(/^(estadio|arena)\s+(da|do|dos|de)?\s*/i, "").trim();
    const queryCore = cleanQuery.replace(/^(estadio|arena)\s+(da|do|dos|de)?\s*/i, "").trim();
    const canonicalCore = cleanCanonical.replace(/^(estadio|arena)\s+(da|do|dos|de)?\s*/i, "").trim();

    return (
      (sCore.length >= 3 && queryCore.includes(sCore)) ||
      (queryCore.length >= 3 && sCore.includes(queryCore)) ||
      (sCore.length >= 3 && canonicalCore.includes(sCore)) ||
      (canonicalCore.length >= 3 && sCore.includes(canonicalCore))
    );
  });

  return match ?? null;
}

// Vincula a imagem subida ao Estádio com correspondência inteligente (fuzzy/includes)
export const linkStadiumImage = mutation({
  args: {
    stadiumName: v.string(),
    city: v.optional(v.string()),
    storageId: v.id("_storage"),
  },
  handler: async (ctx, args) => {
    const url = await ctx.storage.getUrl(args.storageId);
    if (!url) throw new Error("Falha ao gerar URL da imagem");

    const allStadiums = await ctx.db.query("stadiums").collect();
    const stadium = findMatchingStadium(allStadiums, args.stadiumName);

    if (stadium) {
      await ctx.db.patch(stadium._id, {
        imageUrl: url,
        customImageStorageId: args.storageId,
      });
      return { success: true, stadiumId: stadium._id, url, name: stadium.name };
    }

    const canonicalName = normalizeStadiumName(args.stadiumName);
    const newStadiumId = await ctx.db.insert("stadiums", {
      name: canonicalName,
      city: args.city ?? "Brasil",
      imageUrl: url,
      customImageStorageId: args.storageId,
    });
    return { success: true, stadiumId: newStadiumId, url, name: canonicalName };
  },
});

// Consulta o status de sincronização de um ativo individual
export const checkAssetStatus = query({
  args: {
    category: v.union(v.literal("teams"), v.literal("leagues"), v.literal("stadiums")),
    name: v.string(),
  },
  handler: async (ctx, args) => {
    if (args.category === "teams") {
      const targetNorm = normalizeTeamName(args.name);
      const allTeams = await ctx.db.query("teams").collect();
      const team = allTeams.find((t) => normalizeTeamName(t.name) === targetNorm);
      if (team) {
        return { exists: true, isSynced: !!team.customLogoStorageId, name: team.name, url: team.logoUrl };
      }
      return { exists: false, isSynced: false, name: args.name };
    }

    if (args.category === "leagues") {
      const clean = (str: string) =>
        str.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[-_]/g, " ").trim();
      const target = clean(args.name);
      const allLeagues = await ctx.db.query("leagues").collect();
      const league = allLeagues.find((l) => clean(l.name) === target);
      if (league) {
        return { exists: true, isSynced: !!league.customLogoStorageId, name: league.name, url: league.logoUrl };
      }
      return { exists: false, isSynced: false, name: args.name };
    }

    if (args.category === "stadiums") {
      const allStadiums = await ctx.db.query("stadiums").collect();
      const stadium = findMatchingStadium(allStadiums, args.name);
      if (stadium) {
        return { exists: true, isSynced: !!stadium.customImageStorageId, name: stadium.name, url: stadium.imageUrl };
      }
      return { exists: false, isSynced: false, name: args.name };
    }

    return { exists: false, isSynced: false, name: args.name };
  },
});

// Lista todos os times e ligas para mapeamento de uploads
export const listUploadTargets = query({
  args: {},
  handler: async (ctx) => {
    const [teams, leagues, stadiums] = await Promise.all([
      ctx.db.query("teams").collect(),
      ctx.db.query("leagues").collect(),
      ctx.db.query("stadiums").collect(),
    ]);

    return {
      teams: teams
        .map((t) => ({
          id: t._id,
          name: t.name,
          logoUrl: t.logoUrl,
          hasCustomLogo: !!t.customLogoStorageId,
        }))
        .sort((a, b) => a.name.localeCompare(b.name)),
      leagues: leagues
        .map((l) => ({
          id: l._id,
          name: l.name,
          logoUrl: l.logoUrl,
          hasCustomLogo: !!l.customLogoStorageId,
        }))
        .sort((a, b) => a.name.localeCompare(b.name)),
      stadiums: stadiums
        .map((s) => ({
          id: s._id,
          name: s.name,
          imageUrl: s.imageUrl,
          hasCustomImage: !!s.customImageStorageId,
        }))
        .sort((a, b) => a.name.localeCompare(b.name)),
    };
  },
});

