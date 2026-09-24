import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { execSync } from "node:child_process";
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

function fetchSofascore(endpoint) {
  const url = `https://api.sofascore.com/api/v1/${endpoint}`;

  const cookieHeader = process.env.SOFASCORE_COOKIE
    ? `-H "Cookie: ${process.env.SOFASCORE_COOKIE}" `
    : "";

  // Executa o curl nativo do Windows emulando o browser com flags HTTP/2
  const curlCmd = `curl.exe -s -L --compressed ` +
    `-H "User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Safari/537.36" ` +
    `-H "Accept: application/json, text/plain, */*" ` +
    `-H "Accept-Language: pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7" ` +
    `-H "Origin: https://www.sofascore.com" ` +
    `-H "Referer: https://www.sofascore.com/" ` +
    `-H "Sec-Fetch-Dest: empty" ` +
    `-H "Sec-Fetch-Mode: cors" ` +
    `-H "Sec-Fetch-Site: same-site" ` +
    cookieHeader +
    `"${url}"`;

  try {
    const stdout = execSync(curlCmd, { maxBuffer: 10 * 1024 * 1024, encoding: "utf-8" });
    const trimmed = stdout.trim();
    if (!trimmed.startsWith("{") && !trimmed.startsWith("[")) {
      throw new Error(`Resposta não-JSON recebida (possível desafio Cloudflare): ${trimmed.slice(0, 120)}`);
    }
    const parsed = JSON.parse(trimmed);
    if (parsed.error) {
      throw new Error(`Resposta de erro da API [${parsed.error.code}]: ${parsed.error.reason}`);
    }
    return parsed;
  } catch (err) {
    throw new Error(`Falha no curl Sofascore: ${err.message}`);
  }
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
    const items = group.statisticsItems || group.items || [];
    for (const item of items) {
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
 * Normaliza incidentes (gols, cartões, substituições, VAR)
 */
function parseIncidents(incidentsPayload) {
  if (!incidentsPayload?.incidents) return [];

  return incidentsPayload.incidents
    .filter((inc) => ["goal", "card", "substitution", "varDecision"].includes(inc.incidentType))
    .map((inc) => {
      let type = "OTHER";
      if (inc.incidentType === "goal") type = inc.isHome ? "GOAL_HOME" : "GOAL_AWAY";
      if (inc.incidentType === "card") {
        type = inc.incidentClass === "yellow" ? "YELLOW_CARD" : "RED_CARD";
      }
      if (inc.incidentType === "substitution") type = "SUBSTITUTION";
      if (inc.incidentType === "varDecision") type = "VAR";

      let text = inc.player?.name || inc.playerName || inc.text || "";
      if (inc.incidentType === "substitution" && inc.playerIn) {
        text = inc.playerOut
          ? `${inc.playerIn.name} (saiu ${inc.playerOut.name})`
          : inc.playerIn.name;
      }
      if (inc.incidentType === "varDecision") {
        const playerName = inc.player?.name ? `${inc.player.name} - ` : "";
        const decisionText =
          inc.incidentClass === "cardUpgrade"
            ? "Cartão vermelho após revisão do VAR"
            : "Decisão do VAR";
        text = `${playerName}${decisionText}`;
      }

      return {
        minute: inc.time,
        extraTime: inc.addedTime || null,
        type,
        text,
        isHome: inc.isHome ?? false,
      };
    })
    .sort((a, b) => a.minute - b.minute);
}

/**
 * Extrai placar e status final oficial a partir dos incidentes
 */
function extractMatchResult(incidentsPayload) {
  if (!incidentsPayload?.incidents) return null;
  const ftIncident = incidentsPayload.incidents.find(
    (i) => i.incidentType === "period" && i.text === "FT"
  );
  if (ftIncident && ftIncident.homeScore !== undefined && ftIncident.awayScore !== undefined) {
    return {
      homeScore: ftIncident.homeScore,
      awayScore: ftIncident.awayScore,
      status: "FINISHED",
      statusShort: "FT",
    };
  }
  return null;
}

// Execução para sincronizar um Event ID ou Fixture com a partida no Convex
async function syncEvent({ sofascoreEventId, fixturePath, convexMatchId }) {
  console.log(`\n========================================`);
  console.log(`⚽ FutPulse - Sincronizador Sofascore ⚽`);
  console.log(`========================================`);
  if (fixturePath) {
    console.log(`• Modo: Mock/Fixture local (${fixturePath})`);
  } else {
    console.log(`• Event ID: ${sofascoreEventId}`);
  }
  console.log(`• Convex Match ID: ${convexMatchId || "(não informado - modo visualização)"}`);
  console.log(`• Endpoint Convex: ${convexUrl}`);

  try {
    let statsData;
    let incidentsData;

    if (fixturePath) {
      console.log(`\n📂 Carregando fixture local: ${fixturePath}...`);
      const absolutePath = path.isAbsolute(fixturePath)
        ? fixturePath
        : path.resolve(process.cwd(), fixturePath);
      if (!fs.existsSync(absolutePath)) {
        throw new Error(`Arquivo de fixture não encontrado: ${absolutePath}`);
      }
      const rawFixture = fs.readFileSync(absolutePath, "utf-8");
      const fixtureJson = JSON.parse(rawFixture);
      statsData = fixtureJson.statistics;
      incidentsData = fixtureJson.incidents;
    } else {
      console.log(`\n🔍 Buscando estatísticas do evento ${sofascoreEventId}...`);
      statsData = await fetchSofascore(`event/${sofascoreEventId}/statistics`);
      await sleep(2500); // Respeita o rate limit do Sofascore

      console.log(`🔍 Buscando incidentes do evento ${sofascoreEventId}...`);
      incidentsData = await fetchSofascore(`event/${sofascoreEventId}/incidents`);
    }

    const parsedStats = parseStatistics(statsData);
    const parsedIncidents = parseIncidents(incidentsData);
    const matchResult = extractMatchResult(incidentsData);

    console.log("\n📊 Estatísticas estruturadas com sucesso:", parsedStats);
    console.log(`📋 Total de lances/incidentes capturados: ${parsedIncidents.length}`);
    if (matchResult) {
      console.log(`🏆 Placar/Status oficial da súmula: ${matchResult.homeScore} × ${matchResult.awayScore} (${matchResult.statusShort})`);
    }

    if (parsedIncidents.length > 0) {
      console.log("\nLances processados (primeiros 10):");
      for (const inc of parsedIncidents.slice(0, 10)) {
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
        homeScore: matchResult?.homeScore,
        awayScore: matchResult?.awayScore,
        status: matchResult?.status,
        statusShort: matchResult?.statusShort,
      });

      console.log(`\n✅ Sucesso! Dados sincronizados no Convex:`);
      console.log(`   • Match ID: ${result.matchId}`);
      console.log(`   • Estatísticas atualizadas: ${result.updatedStats ? "Sim" : "Não"}`);
      console.log(`   • Lances gravados em matchEvents: ${result.insertedEventsCount}`);
    } else {
      console.log(`\n💡 Dica: Para persistir no Convex, execute:`);
      console.log(`   node scripts/sync-sofascore.js --mock <CONVEX_MATCH_ID>`);
      console.log(`   ou`);
      console.log(`   node scripts/sync-sofascore.js <EVENT_ID> <CONVEX_MATCH_ID>`);
    }

    console.log(`\n🏁 Concluído.\n`);
  } catch (error) {
    console.error("\n❌ Erro na sincronização Sofascore:", error.message);
  }
}

// Extrai argumentos da linha de comando
const args = process.argv.slice(2);

let fixturePath = null;
let eventId = null;
let convexMatchId = null;

if (args.includes("--mock")) {
  const mockIdx = args.indexOf("--mock");
  const nextArg = args[mockIdx + 1];
  if (nextArg && !nextArg.startsWith("--") && (nextArg.endsWith(".json") || fs.existsSync(nextArg))) {
    fixturePath = nextArg;
    convexMatchId = args[mockIdx + 2];
  } else {
    fixturePath = "scripts/fixtures/lille_betis.json";
    convexMatchId = nextArg;
  }
} else if (args.includes("--fixture")) {
  const fixIdx = args.indexOf("--fixture");
  fixturePath = args[fixIdx + 1];
  convexMatchId = args[fixIdx + 2];
} else if (args[0]) {
  eventId = extractEventId(args[0]);
  convexMatchId = args[1];
}

if (fixturePath || eventId) {
  syncEvent({ sofascoreEventId: eventId, fixturePath, convexMatchId });
} else {
  console.log("Uso:");
  console.log("  1. Ao vivo (API Sofascore via curl com cookies):");
  console.log("     node scripts/sync-sofascore.js <SOFASCORE_EVENT_ID_OU_URL> [CONVEX_MATCH_ID]");
  console.log("  2. Mock/Fixture Local (Recomendado para desenvolvimento e TCC):");
  console.log("     node scripts/sync-sofascore.js --mock [CONVEX_MATCH_ID]");
  console.log("     node scripts/sync-sofascore.js --fixture <ARQUIVO_JSON> [CONVEX_MATCH_ID]");
}
