import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { ConvexHttpClient } from "convex/browser";
import { api } from "../convex/_generated/api.js";
import { resolveTeamByAlias } from "../convex/teamAliases.ts";

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
  ".png": "image/png",
  ".webp": "image/webp",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".svg": "image/svg+xml",
};

async function main() {
  console.log("===============================================================================");
  console.log(" 🛡️  FUTPULSE — Upload de Escudos dos Clubes do Brasileirão 2026");
  console.log("===============================================================================");
  console.log(`🔗 Convex Deployment: ${CONVEX_URL}`);
  console.log(`⚡ Modo: ${isForce ? "FORCE (Reenvia e sobrescreve todos)" : "IDEMPOTENTE (Pula já sincronizados)"}`);

  const escudosDir = path.join(rootDir, "assets", "br-escudos-26");
  if (!fs.existsSync(escudosDir)) {
    console.error(`❌ Diretório não encontrado: ${escudosDir}`);
    process.exit(1);
  }

  // Busca lista atualizada de clubes no Convex
  console.log("\n📡 Consultando clubes cadastrados no Convex...");
  const targets = await client.query(api.assets.listUploadTargets, {});
  const dbTeams = targets.teams;
  console.log(`✅ ${dbTeams.length} clubes encontrados no banco de dados.\n`);

  // Lê todos os arquivos da pasta
  const files = fs
    .readdirSync(escudosDir)
    .filter((file) => {
      const ext = path.extname(file).toLowerCase();
      return !!MIME_TYPES[ext];
    })
    .sort();

  console.log(`📁 ${files.length} arquivos de imagem detectados em assets/br-escudos-26/\n`);

  const report = [];

  for (const fileName of files) {
    const filePath = path.join(escudosDir, fileName);
    const ext = path.extname(fileName).toLowerCase();
    const mimeType = MIME_TYPES[ext];
    const fileBuffer = fs.readFileSync(filePath);

    // Resolução inteligente por aliases
    const resolved = resolveTeamByAlias(fileName, dbTeams);

    if (!resolved) {
      report.push({
        file: fileName,
        alias: "-",
        club: "NÃO ENCONTRADO",
        status: "❌ Não reconhecido",
        url: "-",
      });
      continue;
    }

    const { team, matchedAlias } = resolved;

    // Idempotência: Se o time já tiver customLogoStorageId / storageId e não for --force, pula
    if (team.hasCustomLogo && !isForce) {
      report.push({
        file: fileName,
        alias: matchedAlias,
        club: team.name,
        status: "⏩ Já Sincronizado",
        url: team.logoUrl,
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

      // 3. Atualiza atomicamente no banco os campos storageId e logoUrl
      const linkResult = await client.mutation(api.assets.linkTeamLogo, {
        teamId: team._id,
        storageId,
      });

      report.push({
        file: fileName,
        alias: matchedAlias,
        club: team.name,
        status: "✅ Sucesso (Upload)",
        url: linkResult.url,
      });
    } catch (err) {
      report.push({
        file: fileName,
        alias: matchedAlias,
        club: team.name,
        status: `❌ Erro: ${err.message}`,
        url: "-",
      });
    }
  }

  // Exibe Tabela de Resultados no Terminal
  console.log("┌────────────────────────────┬───────────────────────┬─────────────────────────┬──────────────────────────┐");
  console.log("│ Arquivo Lido               │ Alias Reconhecido     │ Clube Associado         │ Status                   │");
  console.log("├────────────────────────────┼───────────────────────┼─────────────────────────┼──────────────────────────┤");

  for (const r of report) {
    const filePadded = r.file.padEnd(26).slice(0, 26);
    const aliasPadded = r.alias.padEnd(21).slice(0, 21);
    const clubPadded = r.club.padEnd(23).slice(0, 23);
    const statusPadded = r.status.padEnd(24).slice(0, 24);
    console.log(`│ ${filePadded} │ ${aliasPadded} │ ${clubPadded} │ ${statusPadded} │`);
  }

  console.log("└────────────────────────────┴───────────────────────┴─────────────────────────┴──────────────────────────┘");

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
    console.log("\n⚠️ ATENÇÃO: Os seguintes arquivos não foram associados a nenhum clube:");
    report
      .filter((r) => r.status.includes("Não reconhecido"))
      .forEach((r) => console.log(`   - ${r.file}`));
  }

  console.log("\n✨ Processamento finalizado com sucesso!");
}

main().catch((err) => {
  console.error("\n💥 Falha fatal no script:", err);
  process.exit(1);
});
