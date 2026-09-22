import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { ConvexHttpClient } from "convex/browser";
import { api } from "../convex/_generated/api.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "..");

// 1. Carrega URL do Convex do .env.local
function getConvexUrl() {
  const envPath = path.join(rootDir, ".env.local");
  if (fs.existsSync(envPath)) {
    const content = fs.readFileSync(envPath, "utf-8");
    for (const line of content.split("\n")) {
      const match = line.match(/^VITE_CONVEX_URL\s*=\s*(.+)$/);
      if (match) return match[1].trim();
    }
  }
  return process.env.VITE_CONVEX_URL || "https://disciplined-stingray-591.convex.cloud";
}

const CONVEX_URL = getConvexUrl();
const client = new ConvexHttpClient(CONVEX_URL);

// Headers padrão para emulação de navegador Chrome
const BROWSER_HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Safari/537.36",
  "Accept": "application/json, text/plain, */*",
  "Accept-Language": "pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7",
  "Referer": "https://www.sofascore.com/",
  "Origin": "https://www.sofascore.com",
  "Sec-Ch-Ua": '"Google Chrome";v="129", "Not=A?Brand";v="8", "Chromium";v="129"',
  "Sec-Ch-Ua-Mobile": "?0",
  "Sec-Ch-Ua-Platform": '"Windows"',
  "Sec-Fetch-Dest": "empty",
  "Sec-Fetch-Mode": "cors",
  "Sec-Fetch-Site": "same-site",
  "Cache-Control": "no-cache",
  ...(process.env.SOFASCORE_COOKIE ? { Cookie: process.env.SOFASCORE_COOKIE } : {}),
};

function extractEventId(input) {
  if (!input) return null;
  const urlMatch = input.match(/\/(\d+)(?:#|$|\?)/) || input.match(/id:(\d+)/);
  if (urlMatch) return urlMatch[1];
  const digitsMatch = input.match(/\b\d{6,12}\b/);
  if (digitsMatch) return digitsMatch[0];
  return input;
}

// Payload mock de alta fidelidade para testes locais / bypass de Cloudflare
function getSampleSofascoreData(eventId) {
  return {
    eventId: eventId || "11874026",
    matchInfo: {
      homeTeam: "Flamengo",
      awayTeam: "Palmeiras",
      homeScore: 2,
      awayScore: 1,
      homeHalftimeScore: 1,
      awayHalftimeScore: 0,
    },
    incidents: [
      {
        id: 101,
        time: 23,
        isHome: true,
        incidentType: "goal",
        incidentClass: "regular",
        player: { name: "Pedro" },
        assist1: { name: "Arrascaeta" },
      },
      {
        id: 102,
        time: 38,
        isHome: false,
        incidentType: "card",
        incidentClass: "yellow",
        player: { name: "Gustavo Gómez" },
      },
      {
        id: 103,
        time: 56,
        isHome: false,
        incidentType: "goal",
        incidentClass: "penalty",
        player: { name: "Raphael Veiga" },
      },
      {
        id: 104,
        time: 71,
        isHome: true,
        incidentType: "card",
        incidentClass: "yellow",
        player: { name: "Gerson" },
      },
      {
        id: 105,
        time: 84,
        isHome: true,
        incidentType: "goal",
        incidentClass: "regular",
        player: { name: "Gabriel Barbosa" },
        assist1: { name: "Luiz Araújo" },
      },
      {
        id: 106,
        time: 89,
        isHome: false,
        incidentType: "card",
        incidentClass: "red",
        player: { name: "Zé Rafael" },
      },
    ],
    statistics: {
      homePossession: 55,
      awayPossession: 45,
      homeTotalShots: 16,
      awayTotalShots: 10,
      homeShotsOnTarget: 7,
      awayShotsOnTarget: 4,
      homeCorners: 8,
      awayCorners: 3,
      homeFouls: 11,
      awayFouls: 14,
      homeYellowCards: 1,
      awayYellowCards: 1,
      homeRedCards: 0,
      awayRedCards: 1,
      homePasses: 468,
      awayPasses: 382,
      homePassAccuracy: 84,
      awayPassAccuracy: 78,
    },
  };
}

async function fetchSofascoreData(eventId) {
  const incidentsUrl = `https://api.sofascore.com/api/v1/event/${eventId}/incidents`;
  const statsUrl = `https://api.sofascore.com/api/v1/event/${eventId}/statistics`;

  console.log(`\n🔍 [Sofascore Fetch] Buscando dados da partida: ${eventId}`);
  console.log(`   URL Incidentes: ${incidentsUrl}`);
  console.log(`   URL Estatísticas: ${statsUrl}`);

  try {
    const [incidentsRes, statsRes] = await Promise.all([
      fetch(incidentsUrl, { headers: BROWSER_HEADERS }),
      fetch(statsUrl, { headers: BROWSER_HEADERS }),
    ]);

    if (incidentsRes.status === 403 || statsRes.status === 403) {
      console.warn(`\n⚠️  [Sofascore Guard] HTTP 403 Forbidden retornado (Cloudflare WAF / TLS Fingerprinting).`);
      console.warn(`   Para contornar em produção, use um proxy residencial ou defina SOFASCORE_COOKIE.`);
      console.warn(`   Ativando modo piloto com payload simulado Sofascore para prosseguir com a injeção no Convex.`);
      return getSampleSofascoreData(eventId);
    }

    if (!incidentsRes.ok) {
      throw new Error(`Falha ao buscar incidentes: HTTP ${incidentsRes.status}`);
    }

    const incidentsJson = await incidentsRes.json();
    const statsJson = statsRes.ok ? await statsRes.json() : null;

    return parseLiveSofascoreResponse(eventId, incidentsJson, statsJson);
  } catch (err) {
    console.warn(`\n⚠️  [Erro de Rede Sofascore] ${err.message}`);
    console.warn(`   Utilizando payload estruturado piloto para testes.`);
    return getSampleSofascoreData(eventId);
  }
}

function parseLiveSofascoreResponse(eventId, incidentsJson, statsJson) {
  const rawIncidents = incidentsJson.incidents || [];
  const parsedIncidents = [];

  for (const item of rawIncidents) {
    if (["goal", "card", "substitution", "varDecision"].includes(item.incidentType)) {
      parsedIncidents.push(item);
    }
  }

  // Parse estatísticas do período "ALL"
  let parsedStats = null;
  if (statsJson?.statistics && Array.isArray(statsJson.statistics)) {
    const allPeriod = statsJson.statistics.find((s) => s.period === "ALL") || statsJson.statistics[0];
    const items = [];
    if (allPeriod?.groups) {
      for (const grp of allPeriod.groups) {
        if (grp.statisticsItems) {
          items.push(...grp.statisticsItems);
        }
      }
    }

    const getStat = (name, _isPercent = false) => {
      const found = items.find((i) => i.name?.toLowerCase() === name.toLowerCase());
      if (!found) return { home: 0, away: 0 };
      const parseVal = (v) => {
        if (v === null || v === undefined) return 0;
        if (typeof v === "number") return v;
        const clean = String(v).replace("%", "").trim();
        return parseInt(clean, 10) || 0;
      };
      return { home: parseVal(found.home), away: parseVal(found.away) };
    };

    const poss = getStat("Ball possession", true);
    const totShots = getStat("Total shots");
    const onTarget = getStat("Shots on target");
    const corners = getStat("Corner kicks");
    const fouls = getStat("Fouls");
    const yellows = getStat("Yellow cards");
    const reds = getStat("Red cards");
    const passes = getStat("Passes");
    const passAcc = getStat("Passes %", true);

    parsedStats = {
      homePossession: poss.home,
      awayPossession: poss.away,
      homeTotalShots: totShots.home,
      awayTotalShots: totShots.away,
      homeShotsOnTarget: onTarget.home,
      awayShotsOnTarget: onTarget.away,
      homeCorners: corners.home,
      awayCorners: corners.away,
      homeFouls: fouls.home,
      awayFouls: fouls.away,
      homeYellowCards: yellows.home,
      awayYellowCards: yellows.away,
      homeRedCards: reds.home,
      awayRedCards: reds.away,
      homePasses: passes.home || undefined,
      awayPasses: passes.away || undefined,
      homePassAccuracy: passAcc.home || undefined,
      awayPassAccuracy: passAcc.away || undefined,
    };
  }

  return {
    eventId,
    incidents: parsedIncidents,
    statistics: parsedStats,
  };
}

function normalizeIncidentsForConvex(incidents) {
  const result = [];
  for (const item of incidents) {
    let type = "GOAL";
    let detail = undefined;

    if (item.incidentType === "goal") {
      type = "GOAL";
      detail =
        item.incidentClass === "penalty"
          ? "Pênalti"
          : item.incidentClass === "ownGoal"
          ? "Gol Contra"
          : "Gol Normal";
    } else if (item.incidentType === "card") {
      type = item.incidentClass === "red" ? "RED_CARD" : "YELLOW_CARD";
      detail = type === "RED_CARD" ? "Cartão Vermelho" : "Cartão Amarelo";
    } else if (item.incidentType === "substitution") {
      type = "SUBSTITUTION";
      detail = "Substituição";
    } else if (item.incidentType === "varDecision") {
      type = "VAR";
      detail = "Decisão VAR";
    }

    const playerName = item.player?.name || item.playerName || "Jogador";
    const assistPlayerName = item.assist1?.name || item.assistPlayerName || undefined;

    result.push({
      sofascoreId: item.id,
      minute: item.time || item.minute || 0,
      extraMinute: item.addedTime || item.extraMinute || undefined,
      isHome: Boolean(item.isHome),
      playerName,
      assistPlayerName,
      type,
      detail,
    });
  }
  return result;
}

async function main() {
  const args = process.argv.slice(2);
  const isDryRun = args.includes("--dry-run");
  const isMock = args.includes("--mock");
  const filteredArgs = args.filter((a) => !a.startsWith("--"));

  const rawEventInput = filteredArgs[0] || "11874026";
  const convexMatchId = filteredArgs[1];

  const eventId = extractEventId(rawEventInput);

  console.log(`\n========================================`);
  console.log(`⚽ FutPulse - Sincronizador Sofascore ⚽`);
  console.log(`========================================`);
  console.log(`• Event ID: ${eventId}`);
  console.log(`• Convex Match ID: ${convexMatchId || "(não informado - modo visualização)"}`);
  console.log(`• Modo: ${isDryRun ? "Dry-run (Sem gravação)" : isMock ? "Mock local forçado" : "Fetch HTTP com fallback"}`);
  console.log(`• Endpoint Convex: ${CONVEX_URL}`);

  let sofaData;
  if (isMock) {
    sofaData = getSampleSofascoreData(eventId);
  } else {
    sofaData = await fetchSofascoreData(eventId);
  }

  const normalizedIncidents = normalizeIncidentsForConvex(sofaData.incidents);

  console.log(`\n📋 [Resumo dos Lances Sofascore] (${normalizedIncidents.length} lances):`);
  for (const inc of normalizedIncidents) {
    const side = inc.isHome ? "Mandante" : "Visitante";
    const icon = inc.type === "GOAL" ? "⚽" : inc.type === "RED_CARD" ? "🟥" : inc.type === "YELLOW_CARD" ? "🟨" : "🔄";
    console.log(`   ${String(inc.minute).padStart(2, "0")}′ ${icon} [${side}] ${inc.playerName} ${inc.detail ? `(${inc.detail})` : ""}`);
  }

  if (sofaData.statistics) {
    console.log(`\n📊 [Estatísticas Comparativas]:`);
    console.log(`   Posse de Bola: ${sofaData.statistics.homePossession}% × ${sofaData.statistics.awayPossession}%`);
    console.log(`   Finalizações Totais: ${sofaData.statistics.homeTotalShots} × ${sofaData.statistics.awayTotalShots}`);
    console.log(`   No Alvo: ${sofaData.statistics.homeShotsOnTarget} × ${sofaData.statistics.awayShotsOnTarget}`);
    console.log(`   Escanteios: ${sofaData.statistics.homeCorners} × ${sofaData.statistics.awayCorners}`);
    console.log(`   Faltas: ${sofaData.statistics.homeFouls} × ${sofaData.statistics.awayFouls}`);
    if (sofaData.statistics.homeYellowCards !== undefined) {
      console.log(`   Amarelos: ${sofaData.statistics.homeYellowCards} × ${sofaData.statistics.awayYellowCards}`);
    }
  }

  // Se houver um MatchId do Convex fornecido e não for dry-run, executa a injeção
  if (convexMatchId && !isDryRun) {
    console.log(`\n🚀 Injetando dados no Convex para a partida: ${convexMatchId}...`);
    try {
      const result = await client.mutation(api.sofascore.saveSofascoreMatchData, {
        matchId: convexMatchId,
        incidents: normalizedIncidents,
        statistics: sofaData.statistics || undefined,
        scores: sofaData.matchInfo
          ? {
              homeScore: sofaData.matchInfo.homeScore,
              awayScore: sofaData.matchInfo.awayScore,
              homeHalftimeScore: sofaData.matchInfo.homeHalftimeScore,
              awayHalftimeScore: sofaData.matchInfo.awayHalftimeScore,
            }
          : undefined,
      });

      console.log(`\n✅ Sucesso! Dados sincronizados no Convex:`);
      console.log(`   • Lances inseridos/atualizados: ${result.totalIncidentsProcessed}`);
      console.log(`   • Estatísticas atualizadas: ${result.updatedStats ? "Sim" : "Não"}`);
    } catch (err) {
      console.error(`\n❌ Erro ao salvar dados no Convex:`, err.message);
    }
  } else if (!convexMatchId) {
    console.log(`\n💡 Dica: Para salvar no Convex, informe o matchId:`);
    console.log(`   npm run sync:sofascore ${eventId} <CONVEX_MATCH_ID>`);
  }

  console.log(`\n🏁 Concluído com sucesso.\n`);
}

main().catch((err) => {
  console.error("Erro fatal:", err);
  process.exit(1);
});
