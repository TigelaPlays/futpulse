import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

// Gera a URL temporária para o cliente ou script subir a imagem
export const generateUploadUrl = mutation(async (ctx) => {
  return await ctx.storage.generateUploadUrl();
});

const TEAM_ALIASES: Record<string, string> = {
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

