import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { ConvexHttpClient } from "convex/browser";
import { api } from "../convex/_generated/api.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "..");

// Inicializa cliente Convex lendo do .env.local ou variável de ambiente
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

const convexUrl = getConvexUrl();
const client = new ConvexHttpClient(convexUrl);

const HEADERS = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Safari/537.36",
  "Accept": "*/*",
  "Accept-Language": "pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7",
  "Origin": "https://www.sofascore.com",
  "Referer": "https://www.sofascore.com/",
  "Sec-Ch-Ua": '"Google Chrome";v="129", "Not=A?Brand";v="8", "Chromium";v="129"',
  "Sec-Ch-Ua-Mobile": "?0",
  "Sec-Ch-Ua-Platform": '"Windows"',
  "Sec-Fetch-Dest": "empty",
  "Sec-Fetch-Mode": "cors",
  "Sec-Fetch-Site": "same-site",
  "Cache-Control": "max-age=0"
};

async function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function extractEventId(input) {
  if (!input) return null;
  const urlMatch = input.match(/\/(\d+)(?:#|$|\?)/) || input.match(/id:(\d+)/);
  if (urlMatch) return urlMatch[1];
  const digitsMatch = input.match(/\b\d{6,12}\b/);
  if (digitsMatch) return digitsMatch[0];
  return input;
}

async function fetchSofascore(endpoint) {
  const url = `https://api.sofascore.com/api/v1/${endpoint}`;
  const res = await fetch(url, { headers: HEADERS });
  if (!res.ok) {
    throw new Error(`Falha Sofascore [${res.status}] em ${url}`);
  }
  return await res.json();
}

/**
 * Normaliza estatísticas para o schema do FutPulse
 */
function parseStatistics(statsPayload) {
  if (!statsPayload?.statistics?.[0]?.groups) return null;

  // O grupo 0 geralmente é 'ALL' (partida inteira)
  const allGroups = statsPayload.statistics[0].groups;
  const metrics = {};

  for (const group of allGroups) {
    for (const item of group.items) {
      metrics[item.name] = {
        home: parseFloat(item.home) || 0,
        away: parseFloat(item.away) || 0,
      };
    }
  }

  return {
    possession: {
      home: metrics["Ball possession"]?.home ?? 50,
      away: metrics["Ball possession"]?.away ?? 50,
    },
    shotsTotal: {
      home: metrics["Total shots"]?.home ?? 0,
      away: metrics["Total shots"]?.away ?? 0,
    },
    shotsOnTarget: {
      home: metrics["Shots on target"]?.home ?? 0,
      away: metrics["Shots on target"]?.away ?? 0,
    },
    corners: {
      home: metrics["Corner kicks"]?.home ?? 0,
      away: metrics["Corner kicks"]?.away ?? 0,
    },
    fouls: {
      home: metrics["Fouls"]?.home ?? 0,
      away: metrics["Fouls"]?.away ?? 0,
    },
    passes: {
      home: metrics["Passes"]?.home ?? 0,
      away: metrics["Passes"]?.away ?? 0,
    },
  };
}

/**
 * Normaliza incidentes (gols, cartões, substituições)
 */
function parseIncidents(incidentsPayload) {
  if (!incidentsPayload?.incidents) return [];

  return incidentsPayload.incidents.map((inc) => {
    let type = "OTHER";
    if (inc.incidentType === "goal") type = inc.isHome ? "GOAL_HOME" : "GOAL_AWAY";
    if (inc.incidentType === "card") {
      type = inc.incidentClass === "yellow" ? "YELLOW_CARD" : "RED_CARD";
    }
    if (inc.incidentType === "substitution") type = "SUBSTITUTION";

    return {
      minute: inc.time,
      extraTime: inc.addedTime || null,
      type,
      text: inc.player?.name || inc.playerName || inc.text || "",
      isHome: inc.isHome ?? false,
    };
  });
}

// Execução para sincronizar um Event ID específico com a partida no Convex
async function syncEvent(sofascoreEventId, convexMatchId) {
  console.log(`\n========================================`);
  console.log(`⚽ FutPulse - Sincronizador Sofascore ⚽`);
  console.log(`========================================`);
  console.log(`• Event ID: ${sofascoreEventId}`);
  console.log(`• Convex Match ID: ${convexMatchId || "(não informado - modo visualização)"}`);
  console.log(`• Endpoint Convex: ${convexUrl}`);

  try {
    console.log(`\n🔍 Buscando estatísticas do evento ${sofascoreEventId}...`);
    const statsData = await fetchSofascore(`event/${sofascoreEventId}/statistics`);
    await sleep(2500); // Respeita o rate limit do Sofascore

    console.log(`🔍 Buscando incidentes do evento ${sofascoreEventId}...`);
    const incidentsData = await fetchSofascore(`event/${sofascoreEventId}/incidents`);

    const parsedStats = parseStatistics(statsData);
    const parsedIncidents = parseIncidents(incidentsData);

    console.log("\n📊 Estatísticas estruturadas com sucesso:", parsedStats);
    console.log(`📋 Total de lances/incidentes capturados: ${parsedIncidents.length}`);

    if (parsedIncidents.length > 0) {
      console.log("\nÚltimos lances processados:");
      for (const inc of parsedIncidents.slice(0, 8)) {
        const side = inc.isHome ? "Mandante" : "Visitante";
        console.log(`   [${inc.minute}′] ${inc.type} (${side}): ${inc.text}`);
      }
    }

    if (convexMatchId) {
      console.log(`\n🚀 Enviando dados para o Convex (partida: ${convexMatchId})...`);
      const result = await client.mutation(api.matches.saveMatchDetailsFromSofascore, {
        matchId: convexMatchId,
        statistics: parsedStats || undefined,
        events: parsedIncidents,
      });

      console.log(`\n✅ Sucesso! Dados sincronizados no Convex:`);
      console.log(`   • Match ID: ${result.matchId}`);
      console.log(`   • Estatísticas atualizadas: ${result.updatedStats ? "Sim" : "Não"}`);
      console.log(`   • Lances gravados em matchEvents: ${result.insertedEventsCount}`);
    } else {
      console.log(`\n💡 Dica: Para persistir no Convex, execute:`);
      console.log(`   node scripts/sync-sofascore.js ${sofascoreEventId} <CONVEX_MATCH_ID>`);
    }

    console.log(`\n🏁 Concluído.\n`);
  } catch (error) {
    console.error("\n❌ Erro na sincronização Sofascore:", error.message);
  }
}

// Extrai argumentos da linha de comando
const rawInput = process.argv[2];
const convexMatchId = process.argv[3];

if (rawInput) {
  const eventId = extractEventId(rawInput);
  syncEvent(eventId, convexMatchId);
} else {
  console.log("Uso: node scripts/sync-sofascore.js <SOFASCORE_EVENT_ID_OU_URL> [CONVEX_MATCH_ID]");
}
