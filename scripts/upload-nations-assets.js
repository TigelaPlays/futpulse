import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { ConvexHttpClient } from "convex/browser";
import { api } from "../convex/_generated/api.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "..");

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

const MIME_TYPES = {
  ".png": "image/png",
  ".webp": "image/webp",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
};

async function uploadFileToConvex(filePath, mimeType) {
  const fileBuffer = fs.readFileSync(filePath);
  const uploadUrl = await client.mutation(api.assets.generateUploadUrl, {});
  const res = await fetch(uploadUrl, {
    method: "POST",
    headers: { "Content-Type": mimeType },
    body: fileBuffer,
  });
  if (!res.ok) throw new Error(`Upload failed: ${res.statusText}`);
  const { storageId } = await res.json();
  return storageId;
}

async function main() {
  console.log("===============================================================================");
  console.log(" 🇪🇺 FUTPULSE — Upload de Bandeiras e Estádios da UEFA Nations League");
  console.log("===============================================================================");
  console.log(`🔗 Convex Deployment: ${CONVEX_URL}\n`);

  // 1. Upload e vinculação de Bandeiras das Seleções
  const flagsDir = path.join(rootDir, "assets", "flags_nations");
  if (fs.existsSync(flagsDir)) {
    console.log("📡 Processando bandeiras de seleções...");
    const targets = await client.query(api.assets.listUploadTargets, {});
    const teams = targets.teams || [];

    const flagFiles = fs.readdirSync(flagsDir).filter((f) => !!MIME_TYPES[path.extname(f).toLowerCase()]);
    let flagsCount = 0;

    for (const file of flagFiles) {
      const baseName = path.parse(file).name;
      // Encontra a seleção no banco
      const team = teams.find(
        (t) =>
          t.name.toLowerCase() === baseName.toLowerCase() ||
          (baseName === "República Tcheca" && t.name === "Tchéquia") ||
          (baseName === "Países Baixos" && (t.name === "Holanda" || t.name === "Países Baixos")) ||
          (baseName === "Irlanda" && t.name === "República da Irlanda")
      );

      if (!team) continue;
      if (team.hasCustomLogo) {
        console.log(`  ⏩ Já sincronizado: ${team.name}`);
        continue;
      }

      try {
        const filePath = path.join(flagsDir, file);
        const mime = MIME_TYPES[path.extname(file).toLowerCase()] || "image/jpeg";
        const storageId = await uploadFileToConvex(filePath, mime);
        await client.mutation(api.assets.linkTeamLogo, {
          teamId: team._id,
          storageId,
        });
        console.log(`  ✅ Bandeira vinculada com sucesso: ${team.name}`);
        flagsCount++;
      } catch (err) {
        console.warn(`  ⚠️ Erro ao vincular bandeira de ${team.name}:`, err.message);
      }
    }
    console.log(`🏁 ${flagsCount} bandeiras enviadas para o Convex Storage.\n`);
  }

  // 2. Upload e vinculação de Estádios da Nations League
  const stadiumsDir = path.join(rootDir, "assets", "stadiums_nations");
  if (fs.existsSync(stadiumsDir)) {
    console.log("📡 Processando fotos de estádios europeus...");
    const targets = await client.query(api.assets.listUploadTargets, {});
    const stadiums = targets.stadiums || [];

    const stadiumFiles = fs.readdirSync(stadiumsDir).filter((f) => !!MIME_TYPES[path.extname(f).toLowerCase()]);
    let stadiumsCount = 0;

    for (const file of stadiumFiles) {
      const baseName = path.parse(file).name;
      const stadium = stadiums.find((s) => s.name.toLowerCase() === baseName.toLowerCase());

      if (!stadium) continue;
      if (stadium.hasCustomImage) {
        console.log(`  ⏩ Já sincronizado: ${stadium.name}`);
        continue;
      }

      try {
        const filePath = path.join(stadiumsDir, file);
        const mime = MIME_TYPES[path.extname(file).toLowerCase()] || "image/jpeg";
        const storageId = await uploadFileToConvex(filePath, mime);
        await client.mutation(api.assets.linkStadiumImage, {
          stadiumId: stadium._id,
          storageId,
        });
        console.log(`  ✅ Estádio vinculado com sucesso: ${stadium.name}`);
        stadiumsCount++;
      } catch (err) {
        console.warn(`  ⚠️ Erro ao vincular estádio ${stadium.name}:`, err.message);
      }
    }
    console.log(`🏁 ${stadiumsCount} estádios enviados para o Convex Storage.\n`);
  }

  console.log("🎉 Concluído!");
}

main().catch(console.error);
