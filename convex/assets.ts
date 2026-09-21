import { mutation } from "./_generated/server";
import { v } from "convex/values";

// Gera a URL temporária para o cliente ou script subir a imagem
export const generateUploadUrl = mutation(async (ctx) => {
  return await ctx.storage.generateUploadUrl();
});

// Vincula a imagem subida ao Time
export const linkTeamLogo = mutation({
  args: {
    teamName: v.string(),
    storageId: v.id("_storage"),
  },
  handler: async (ctx, args) => {
    const url = await ctx.storage.getUrl(args.storageId);
    if (!url) throw new Error("Falha ao gerar URL da imagem");

    const team = await ctx.db
      .query("teams")
      .filter((q) => q.eq(q.field("name"), args.teamName))
      .first();

    if (team) {
      await ctx.db.patch(team._id, {
        logoUrl: url,
        customLogoStorageId: args.storageId,
      });
      return { success: true, teamId: team._id, url };
    }

    // Se o time não existir ainda, cria
    const newTeamId = await ctx.db.insert("teams", {
      name: args.teamName,
      logoUrl: url,
      customLogoStorageId: args.storageId,
    });
    return { success: true, teamId: newTeamId, url };
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

    const league = await ctx.db
      .query("leagues")
      .filter((q) => q.eq(q.field("name"), args.leagueName))
      .first();

    if (league) {
      await ctx.db.patch(league._id, {
        logoUrl: url,
        customLogoStorageId: args.storageId,
      });
      return { success: true, leagueId: league._id, url };
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
      return { success: true, stadiumId: stadium._id, url };
    }

    const newStadiumId = await ctx.db.insert("stadiums", {
      name: args.stadiumName,
      city: args.city ?? "Cidade",
      imageUrl: url,
      customImageStorageId: args.storageId,
    });
    return { success: true, stadiumId: newStadiumId, url };
  },
});

