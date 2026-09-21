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
    const team = allTeams.find((t) => normalizeTeamName(t.name) === targetNorm);

    if (team) {
      await ctx.db.patch(team._id, {
        logoUrl: url,
        customLogoStorageId: args.storageId,
      });
      return { success: true, teamId: team._id, url, name: team.name };
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

// Vincula a imagem subida ao Estádio
export const linkStadiumImage = mutation({
  args: {
    stadiumName: v.string(),
    city: v.optional(v.string()),
    storageId: v.id("_storage"),
  },
  handler: async (ctx, args) => {
    const url = await ctx.storage.getUrl(args.storageId);
    if (!url) throw new Error("Falha ao gerar URL da imagem");

    const stadium = await ctx.db
      .query("stadiums")
      .filter((q) => q.eq(q.field("name"), args.stadiumName))
      .first();

    if (stadium) {
      await ctx.db.patch(stadium._id, {
        imageUrl: url,
        customImageStorageId: args.storageId,
      });
      return { success: true, stadiumId: stadium._id, url, name: stadium.name };
    }

    const newStadiumId = await ctx.db.insert("stadiums", {
      name: args.stadiumName,
      city: args.city ?? "Cidade",
      imageUrl: url,
      customImageStorageId: args.storageId,
    });
    return { success: true, stadiumId: newStadiumId, url, name: args.stadiumName };
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

