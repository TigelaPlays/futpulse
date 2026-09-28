import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { resolveTeamByAlias } from "./teamAliases";
import { resolveStadiumByAlias } from "./stadiumAliases";

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
 * Atualiza atomicamente os campos storageId, image e imageUrl.
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
      const resolved = resolveStadiumByAlias(args.stadiumName, allStadiums);
      if (resolved) {
        stadium = resolved.stadium;
      } else {
        stadium = allStadiums.find(
          (s) => s.name.toLowerCase() === args.stadiumName!.toLowerCase()
        );
      }
    }

    if (!stadium) {
      throw new Error(`Estádio "${args.stadiumName || args.stadiumId}" não encontrado.`);
    }

    await ctx.db.patch(stadium._id, {
      imageUrl: url,
      image: url,
      storageId: args.storageId,
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
 * 5. Garante que todos os estádios dos mandantes da Série A estejam cadastrados no banco.
 */
export const ensureSerieAStadiums = mutation({
  args: {},
  handler: async (ctx) => {
    const defaultStadiums = [
      { name: "Arena MRV", city: "Belo Horizonte (MG)", teamName: "Atlético-MG" },
      { name: "Couto Pereira", city: "Curitiba (PR)", teamName: "Coritiba" },
      { name: "Beira-Rio", city: "Porto Alegre (RS)", teamName: "Internacional" },
      { name: "Barradão", city: "Salvador (BA)", teamName: "Vitória" },
      { name: "Maracanã", city: "Rio de Janeiro (RJ)", teamName: "Fluminense" },
      { name: "Arena Condá", city: "Chapecó (SC)", teamName: "Chapecoense" },
      { name: "Neo Química Arena", city: "São Paulo (SP)", teamName: "Corinthians" },
      { name: "MorumBIS", city: "São Paulo (SP)", teamName: "São Paulo" },
      { name: "Maião", city: "Mirassol (SP)", teamName: "Mirassol" },
      { name: "Nilton Santos (Engenhão)", city: "Rio de Janeiro (RJ)", teamName: "Botafogo" },
      { name: "Allianz Parque", city: "São Paulo (SP)", teamName: "Palmeiras" },
      { name: "Vila Belmiro", city: "Santos (SP)", teamName: "Santos" },
      { name: "Mineirão", city: "Belo Horizonte (MG)", teamName: "Cruzeiro" },
      { name: "Arena do Grêmio", city: "Porto Alegre (RS)", teamName: "Grêmio" },
      { name: "Arena da Baixada", city: "Curitiba (PR)", teamName: "Athletico" },
      { name: "Arena Fonte Nova", city: "Salvador (BA)", teamName: "Bahia" },
      { name: "São Januário", city: "Rio de Janeiro (RJ)", teamName: "Vasco" },
      { name: "Cícero de Souza Marques", city: "Bragança Paulista (SP)", teamName: "RB Bragantino" },
      { name: "Mangueirão", city: "Belém (PA)", teamName: "Remo" },
    ];

    const allTeams = await ctx.db.query("teams").collect();
    const allStadiums = await ctx.db.query("stadiums").collect();

    let createdCount = 0;

    for (const item of defaultStadiums) {
      const resolved = resolveStadiumByAlias(item.name, allStadiums);
      if (!resolved) {
        // Encontra o clube correspondente
        const resolvedTeam = resolveTeamByAlias(item.teamName, allTeams);
        const newId = await ctx.db.insert("stadiums", {
          name: item.name,
          city: item.city,
          imageUrl: `https://images.unsplash.com/photo-1508098682722-e99c43a406b2?auto=format&fit=crop&w=800&q=80`,
          teamId: resolvedTeam?.team._id,
        });
        const created = (await ctx.db.get(newId))!;
        allStadiums.push(created);
        createdCount++;
      }
    }

    return {
      success: true,
      totalStadiums: allStadiums.length,
      createdCount,
    };
  },
});

/**
 * 6. Lista todos os alvos elegíveis para upload (Times, Ligas, Estádios) e o status atual de imagem customizada.
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
        image: s.image || s.imageUrl,
        hasCustomImage: !!(s.customImageStorageId || s.storageId),
        storageId: s.storageId || s.customImageStorageId,
      })),
    };
  },
});

