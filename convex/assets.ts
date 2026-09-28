import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { resolveTeamByAlias } from "./teamAliases";

/**
 * 1. Gera URL segura de upload direto para o Convex File Storage.
 */
export const generateUploadUrl = mutation({
  args: {},
  handler: async (ctx) => {
    return await ctx.storage.generateUploadUrl();
  },
});

/**
 * 2. Vincula a imagem enviada ao Clube/Time correspondente e atualiza os campos storageId e logoUrl.
 */
export const linkTeamLogo = mutation({
  args: {
    teamId: v.optional(v.id("teams")),
    teamName: v.optional(v.string()),
    storageId: v.id("_storage"),
  },
  handler: async (ctx, args) => {
    const url = await ctx.storage.getUrl(args.storageId);
    if (!url) {
      throw new Error(`Arquivo não encontrado no storage: ${args.storageId}`);
    }

    let team = null;

    if (args.teamId) {
      team = await ctx.db.get(args.teamId);
    } else if (args.teamName) {
      const allTeams = await ctx.db.query("teams").collect();
      const resolved = resolveTeamByAlias(args.teamName, allTeams);
      if (resolved) {
        team = resolved.team;
      }
    }

    if (!team) {
      throw new Error(`Time "${args.teamName || args.teamId}" não encontrado no banco.`);
    }

    await ctx.db.patch(team._id, {
      logoUrl: url,
      customLogoStorageId: args.storageId,
      storageId: args.storageId,
    });

    return {
      success: true,
      teamId: team._id,
      name: team.name,
      url,
    };
  },
});

/**
 * 3. Vincula o logo enviado ao Campeonato/Liga.
 */
export const linkLeagueLogo = mutation({
  args: {
    leagueId: v.optional(v.id("leagues")),
    leagueName: v.optional(v.string()),
    storageId: v.id("_storage"),
  },
  handler: async (ctx, args) => {
    const url = await ctx.storage.getUrl(args.storageId);
    if (!url) {
      throw new Error(`Arquivo não encontrado no storage: ${args.storageId}`);
    }

    let league = null;
    if (args.leagueId) {
      league = await ctx.db.get(args.leagueId);
    } else if (args.leagueName) {
      const allLeagues = await ctx.db.query("leagues").collect();
      league = allLeagues.find(
        (l) => l.name.toLowerCase() === args.leagueName!.toLowerCase()
      );
    }

    if (!league) {
      return { success: false, name: args.leagueName || "", url: "" };
    }

    await ctx.db.patch(league._id, {
      logoUrl: url,
      customLogoStorageId: args.storageId,
    });

    return {
      success: true,
      leagueId: league._id,
      name: league.name,
      url,
    };
  },
});

/**
 * 4. Vincula a foto panorâmica enviada ao Estádio.
 */
export const linkStadiumImage = mutation({
  args: {
    stadiumId: v.optional(v.id("stadiums")),
    stadiumName: v.optional(v.string()),
    storageId: v.id("_storage"),
  },
  handler: async (ctx, args) => {
    const url = await ctx.storage.getUrl(args.storageId);
    if (!url) {
      throw new Error(`Arquivo não encontrado no storage: ${args.storageId}`);
    }

    let stadium = null;
    if (args.stadiumId) {
      stadium = await ctx.db.get(args.stadiumId);
    } else if (args.stadiumName) {
      const allStadiums = await ctx.db.query("stadiums").collect();
      stadium = allStadiums.find(
        (s) => s.name.toLowerCase() === args.stadiumName!.toLowerCase()
      );
    }

    if (!stadium) {
      throw new Error(`Estádio "${args.stadiumName || args.stadiumId}" não encontrado.`);
    }

    await ctx.db.patch(stadium._id, {
      imageUrl: url,
      customImageStorageId: args.storageId,
    });

    return {
      success: true,
      stadiumId: stadium._id,
      name: stadium.name,
      url,
    };
  },
});

/**
 * 5. Lista todos os alvos elegíveis para upload (Times, Ligas, Estádios) e o status atual de logo customizado.
 */
export const listUploadTargets = query({
  args: {},
  handler: async (ctx) => {
    const teams = await ctx.db.query("teams").collect();
    const leagues = await ctx.db.query("leagues").collect();
    const stadiums = await ctx.db.query("stadiums").collect();

    return {
      teams: teams.map((t) => ({
        _id: t._id,
        name: t.name,
        shortName: t.shortName,
        code: t.code,
        logoUrl: t.logoUrl,
        hasCustomLogo: !!(t.customLogoStorageId || t.storageId),
        storageId: t.storageId || t.customLogoStorageId,
      })),
      leagues: leagues.map((l) => ({
        _id: l._id,
        name: l.name,
        code: l.code,
        logoUrl: l.logoUrl,
        hasCustomLogo: !!l.customLogoStorageId,
        storageId: l.customLogoStorageId,
      })),
      stadiums: stadiums.map((s) => ({
        _id: s._id,
        name: s.name,
        city: s.city,
        imageUrl: s.imageUrl,
        hasCustomImage: !!s.customImageStorageId,
        storageId: s.customImageStorageId,
      })),
    };
  },
});
