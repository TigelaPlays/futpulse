import { action, internalMutation, internalQuery } from "./_generated/server";
import { internal } from "./_generated/api";
import { v } from "convex/values";

declare const process: { env: Record<string, string | undefined> };

/**
 * Normaliza nomes de seleções para garantir casamento mesmo com grafias diferentes
 * (Ex: "Países Baixos" -> "netherlands", "Tchéquia" -> "czech republic")
 */
function normalizeTeamName(name: string): string {
  const map: Record<string, string> = {
    "países baixos": "netherlands",
    "holanda": "netherlands",
    "tchéquia": "czech republic",
    "república tcheca": "czech republic",
    "república checa": "czech republic",
    "czechia": "czech republic",
    "bélgica": "belgium",
    "itália": "italy",
    "frança": "france",
    "turquia": "turkey",
    "alemanha": "germany",
    "sérvia": "serbia",
    "grécia": "greece",
    "inglaterra": "england",
    "espanha": "spain",
    "croácia": "croatia",
    "dinamarca": "denmark",
    "noruega": "norway",
    "portugal": "portugal",
    "país de gales": "wales",
    "eslovênia": "slovenia",
    "escócia": "scotland",
    "macedônia do norte": "north macedonia",
    "macedônia": "north macedonia",
    "suíça": "switzerland",
    "geórgia": "georgia",
    "irlanda do norte": "northern ireland",
    "hungria": "hungary",
    "ucrânia": "ukraine",
    "áustria": "austria",
    "israel": "israel",
    "kosovo": "kosovo",
    "república da irlanda": "ireland",
    "irlanda": "ireland",
    "polônia": "poland",
    "bósnia e herzegovina": "bosnia",
    "bósnia": "bosnia",
    "suécia": "sweden",
    "romênia": "romania",
    "san marino": "san marino",
    "finlândia": "finland",
    "albânia": "albania",
    "bielorrússia": "belarus",
    "belarus": "belarus",
    "armênia": "armenia",
    "letônia": "latvia",
    "montenegro": "montenegro",
    "chipre": "cyprus",
    "ilhas faroé": "faroe islands",
    "faroe islands": "faroe islands",
    "cazaquistão": "kazakhstan",
    "eslováquia": "slovakia",
    "moldávia": "moldova",
    "islândia": "iceland",
    "estônia": "estonia",
    "bulgária": "bulgaria",
    "luxemburgo": "luxembourg",
    "andorra": "andorra",
    "malta": "malta",
    "gibraltar": "gibraltar",
    "liechtenstein": "liechtenstein",
    "lituânia": "lithuania",
    "azerbaijão": "azerbaijan",
  };

  const clean = name.toLowerCase().trim();
  return map[clean] || clean;
}

/**
 * Consulta todas as partidas e os nomes dos times no banco do Convex
 */
export const getMatchesWithTeams = internalQuery({
  handler: async (ctx) => {
    let unlLeague = await ctx.db
      .query("leagues")
      .filter((q) => q.eq(q.field("code"), "UNL"))
      .first();

    const matchesQuery = unlLeague
      ? ctx.db.query("matches").withIndex("by_league", (q) => q.eq("leagueId", unlLeague._id))
      : ctx.db.query("matches");

    const matches = await matchesQuery.collect();
    const result = [];

    for (const m of matches) {
      const homeTeam = await ctx.db.get(m.homeTeamId);
      const awayTeam = await ctx.db.get(m.awayTeamId);

      if (homeTeam && awayTeam) {
        result.push({
          matchId: m._id,
          homeName: homeTeam.name,
          awayName: awayTeam.name,
          currentExternalId: m.externalId,
        });
      }
    }
    return result;
  },
});

/**
 * Grava o externalId na partida encontrada
 */
export const updateExternalId = internalMutation({
  args: {
    matchId: v.id("matches"),
    externalId: v.number(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.matchId, {
      externalId: args.externalId,
    });
  },
});

/**
 * Action principal: faz 1 chamada na API-Football e vincula todos os externalIds
 */
export const autoBindNationsLeague = action({
  args: {
    season: v.optional(v.number()), // Padrão: 2026 (ou 2024 / atual dependendo da API)
  },
  handler: async (ctx, args): Promise<any> => {
    const apiKey = process.env.API_FOOTBALL_KEY;
    if (!apiKey) {
      throw new Error("API_FOOTBALL_KEY não encontrada nas variáveis de ambiente do Convex.");
    }

    const season = args.season ?? 2026;
    const leagueId = 5; // UEFA Nations League na API-Football

    // 1. Busca os fixtures da competição na API-Football (apenas 1 request)
    const url = `https://v3.football.api-sports.io/fixtures?league=${leagueId}&season=${season}`;
    const response = await fetch(url, {
      method: "GET",
      headers: { "x-apisports-key": apiKey },
    });

    if (!response.ok) {
      throw new Error(`Falha na API-Football: ${response.status} ${response.statusText}`);
    }

    const json = await response.json();
    const fixtures: any[] = json.response || [];

    if (fixtures.length === 0) {
      return {
        success: false,
        message: `Nenhum fixture retornado pela API-Football para a temporada ${season}. Verifique se a temporada cadastrada na API é ${season}.`,
        apiErrors: json.errors,
      };
    }

    // 2. Busca os jogos cadastrados no nosso banco local
    const localMatches: any = await ctx.runQuery(internal.bindExternalIds.getMatchesWithTeams);

    let linkedCount = 0;
    const vinculados: Array<{ match: string; externalId: number }> = [];

    // 3. Compara Mandante x Visitante
    for (const lm of localMatches) {
      const normHome = normalizeTeamName(lm.homeName);
      const normAway = normalizeTeamName(lm.awayName);

      let matchFixture = fixtures.find((f) => {
        const apiHome = normalizeTeamName(f.teams?.home?.name || "");
        const apiAway = normalizeTeamName(f.teams?.away?.name || "");
        return (
          (apiHome.includes(normHome) || normHome.includes(apiHome)) &&
          (apiAway.includes(normAway) || normAway.includes(apiAway))
        );
      });

      if (!matchFixture) {
        // Tenta encontrar o confronto mesmo com mando invertido na edição
        matchFixture = fixtures.find((f) => {
          const apiHome = normalizeTeamName(f.teams?.home?.name || "");
          const apiAway = normalizeTeamName(f.teams?.away?.name || "");
          return (
            (apiHome.includes(normAway) || normAway.includes(apiHome)) &&
            (apiAway.includes(normHome) || normHome.includes(apiAway))
          );
        });
      }

      if (matchFixture) {
        await ctx.runMutation(internal.bindExternalIds.updateExternalId, {
          matchId: lm.matchId,
          externalId: matchFixture.fixture.id,
        });
        linkedCount++;
        vinculados.push({
          match: `${lm.homeName} x ${lm.awayName}`,
          externalId: matchFixture.fixture.id,
        });
      }
    }

    return {
      success: true,
      linkedCount,
      totalLocais: localMatches.length,
      totalApiFixtures: fixtures.length,
      vinculados,
    };
  },
});
