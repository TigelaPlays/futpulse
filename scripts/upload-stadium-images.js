import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { ConvexHttpClient } from "convex/browser";
import { api } from "../convex/_generated/api.js";
import { resolveStadiumByAlias } from "../convex/stadiumAliases.ts";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "..");

const isForce = process.argv.includes("--force");

// 1. Obtém a URL do Convex a partir do .env.local
function getConvexUrl() {
  const envPath = path.join(rootDir, ".env.local");
  if (fs.existsSync(envPath)) {
    const content = fs.readFileSync(envPath, "utf-8");
    for (const line of content.split("\n")) {
      const match = line.match(/^VITE_CONVEX_URL\s*=\s*(.+)$/);
      if (match) return match[1].trim();
    }
  }
  return process.env.VITE_CONVEX_URL || "https://kindly-hamster-661.convex.cloud";
}

const CONVEX_URL = getConvexUrl();
const client = new ConvexHttpClient(CONVEX_URL);

// Extensões suportadas e tipos MIME
const MIME_TYPES = {
  ".webp": "image/webp",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".svg": "image/svg+xml",
};

async function main() {
  console.log("===============================================================================");
  console.log(" 🏟️  FUTPULSE — Upload de Fotos dos Estádios do Brasileirão 2026");
  console.log("===============================================================================");
  console.log(`🔗 Convex Deployment: ${CONVEX_URL}`);
  console.log(`⚡ Modo: ${isForce ? "FORCE (Reenvia e sobrescreve todos)" : "IDEMPOTENTE (Pula já sincronizados)"}`);

  const stadiumsDir = path.join(rootDir, "assets", "br-stadium-26");
  if (!fs.existsSync(stadiumsDir)) {
    console.error(`❌ Diretório não encontrado: ${stadiumsDir}`);
    process.exit(1);
  }

  // Garante que todos os estádios da Série A estejam cadastrados no banco
  console.log("\n📡 Verificando estádios cadastrados no Convex...");
  try {
    const ensureResult = await client.mutation(api.assets.ensureSerieAStadiums, {});
    if (ensureResult.createdCount > 0) {
      console.log(`✨ ${ensureResult.createdCount} novos estádios cadastrados no banco.`);
    }
  } catch (err) {
    console.warn(`⚠️ Aviso ao verificar estádios base: ${err.message}`);
  }

  // Busca lista atualizada de estádios no Convex
  const targets = await client.query(api.assets.listUploadTargets, {});
  const dbStadiums = targets.stadiums;
  console.log(`✅ ${dbStadiums.length} estádios encontrados no banco de dados.\n`);

  // Lê todos os arquivos da pasta
  const files = fs
    .readdirSync(stadiumsDir)
    .filter((file) => {
      const ext = path.extname(file).toLowerCase();
      return !!MIME_TYPES[ext];
    })
    .sort();

  console.log(`📁 ${files.length} arquivos de imagem detectados em assets/br-stadium-26/\n`);

  const report = [];

  for (const fileName of files) {
    const filePath = path.join(stadiumsDir, fileName);
    const ext = path.extname(fileName).toLowerCase();
    const mimeType = MIME_TYPES[ext];
    const fileBuffer = fs.readFileSync(filePath);

    // Resolução inteligente por aliases
    const resolved = resolveStadiumByAlias(fileName, dbStadiums);

    if (!resolved) {
      report.push({
        file: fileName,
        alias: "-",
        stadium: "NÃO ENCONTRADO",
        status: "❌ Não reconhecido",
        url: "-",
      });
      continue;
    }

    const { stadium, matchedAlias } = resolved;

    // Idempotência: Se o estádio já tiver customImageStorageId / storageId e não for --force, pula
    if (stadium.hasCustomImage && !isForce) {
      report.push({
        file: fileName,
        alias: matchedAlias,
        stadium: stadium.name,
        status: "⏩ Já Sincronizado",
        url: stadium.image || stadium.imageUrl,
      });
      continue;
    }

    try {
      // 1. Gera URL segura de upload no Convex File Storage
      const uploadUrl = await client.mutation(api.assets.generateUploadUrl, {});

      // 2. Faz o POST do binário para o storage
      const uploadRes = await fetch(uploadUrl, {
        method: "POST",
        headers: {
          "Content-Type": mimeType,
        },
        body: fileBuffer,
      });

      if (!uploadRes.ok) {
        throw new Error(`HTTP ${uploadRes.status} - ${uploadRes.statusText}`);
      }

      const { storageId } = await uploadRes.json();

      // 3. Atualiza atomicamente no banco os campos storageId e image
      const linkResult = await client.mutation(api.assets.linkStadiumImage, {
        stadiumId: stadium._id,
        storageId,
      });

      report.push({
        file: fileName,
        alias: matchedAlias,
        stadium: stadium.name,
        status: "✅ Sucesso (Upload)",
        url: linkResult.url,
      });
    } catch (err) {
      report.push({
        file: fileName,
        alias: matchedAlias,
        stadium: stadium.name,
        status: `❌ Erro: ${err.message}`,
        url: "-",
      });
    }
  }

  // Exibe Tabela de Resultados no Terminal
  console.log("┌──────────────────────────────────┬───────────────────────┬───────────────────────────────┬──────────────────────────┐");
  console.log("│ Arquivo Lido                     │ Alias Reconhecido     │ Estádio Associado             │ Status                   │");
  console.log("├──────────────────────────────────┼───────────────────────┼───────────────────────────────┼──────────────────────────┤");

  for (const r of report) {
    const filePadded = r.file.padEnd(32).slice(0, 32);
    const aliasPadded = r.alias.padEnd(21).slice(0, 21);
    const stadiumPadded = r.stadium.padEnd(29).slice(0, 29);
    const statusPadded = r.status.padEnd(24).slice(0, 24);
    console.log(`│ ${filePadded} │ ${aliasPadded} │ ${stadiumPadded} │ ${statusPadded} │`);
  }

  console.log("└──────────────────────────────────┴───────────────────────┴───────────────────────────────┴──────────────────────────┘");

  // Sumário Final
  const successCount = report.filter((r) => r.status.includes("Sucesso")).length;
  const skippedCount = report.filter((r) => r.status.includes("Já Sincronizado")).length;
  const notFoundCount = report.filter((r) => r.status.includes("Não reconhecido")).length;
  const errorCount = report.filter((r) => r.status.includes("Erro")).length;

  console.log("\n📊 RESUMO DO PROCESSAMENTO:");
  console.log(`   - Total de imagens lidas:   ${files.length}`);
  console.log(`   - Uploads realizados:       ${successCount}`);
  console.log(`   - Já sincronizados (skip):  ${skippedCount}`);
  console.log(`   - Não reconhecidos:         ${notFoundCount}`);
  console.log(`   - Erros no envio:           ${errorCount}`);

  if (notFoundCount > 0) {
    console.log("\n⚠️ ATENÇÃO: Os seguintes arquivos não foram associados a nenhum estádio:");
    report
      .filter((r) => r.status.includes("Não reconhecido"))
      .forEach((r) => console.log(`   - ${r.file}`));
  }

  console.log("\n✨ Processamento de estádios finalizado com sucesso!");
}

main().catch((err) => {
  console.error("\n💥 Falha fatal no script:", err);
  process.exit(1);
});
