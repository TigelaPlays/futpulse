import { mutation } from "./_generated/server";

interface SeedTeam {
  name: string;
  flag?: string;
  p?: number;
  w?: number;
  d?: number;
  l?: number;
  gf?: number;
  ga?: number;
  form?: string[];
}

export const seedNationsLeague = mutation({
  handler: async (ctx) => {
    // Limpa registros anteriores para evitar duplicidade
    const existing = await ctx.db.query("standings").collect();
    for (const row of existing) {
      await ctx.db.delete(row._id);
    }

    const groupsData: Record<
      "A" | "B" | "C" | "D",
      Record<string, SeedTeam[]>
    > = {
      A: {
        A1: [
          { name: "Itália", flag: "🇮🇹" },
          { name: "Bélgica", flag: "🇧🇪" },
          { name: "França", flag: "🇫🇷" },
          { name: "Turquia", flag: "🇹🇷" },
        ],
        A2: [
          { name: "Holanda", flag: "🇳🇱", p: 1, d: 1, gf: 1, ga: 1, form: ["D"] },
          { name: "Alemanha", flag: "🇩🇪", p: 1, d: 1, gf: 1, ga: 1, form: ["D"] },
          { name: "Sérvia", flag: "🇷🇸", p: 1, d: 1, gf: 1, ga: 1, form: ["D"] },
          { name: "Grécia", flag: "🇬🇷", p: 1, d: 1, gf: 1, ga: 1, form: ["D"] },
        ],
        A3: [
          { name: "Espanha", flag: "🇪🇸" },
          { name: "Inglaterra", flag: "🏴" },
          { name: "Croácia", flag: "🇭🇷" },
          { name: "República Checa", flag: "🇨🇿" },
        ],
        A4: [
          { name: "Noruega", flag: "🇳🇴", p: 1, w: 1, gf: 3, ga: 2, form: ["W"] },
          { name: "Portugal", flag: "🇵🇹", p: 1, w: 1, gf: 1, ga: 0, form: ["W"] },
          { name: "Dinamarca", flag: "🇩🇰", p: 1, l: 1, gf: 2, ga: 3, form: ["L"] },
          { name: "País de Gales", flag: "🏴", p: 1, l: 1, gf: 0, ga: 1, form: ["L"] },
        ],
      },
      B: {
        B1: [
          { name: "Escócia", flag: "🏴" },
          { name: "Suíça", flag: "🇨🇭" },
          { name: "Eslovênia", flag: "🇸🇮" },
          { name: "Macedônia do Norte", flag: "🇲🇰" },
        ],
        B2: [
          { name: "Hungria", flag: "🇭🇺" },
          { name: "Geórgia", flag: "🇬🇪" },
          { name: "Ucrânia", flag: "🇺🇦" },
          { name: "Irlanda do Norte", flag: "🇬🇧" },
        ],
        B3: [
          { name: "Áustria", flag: "🇦🇹", p: 1, w: 1, gf: 2, ga: 1, form: ["W"] },
          { name: "Kosovo", flag: "🇽🇰", p: 1, w: 1, gf: 1, ga: 0, form: ["W"] },
          { name: "Israel", flag: "🇮🇱", p: 1, l: 1, gf: 1, ga: 2, form: ["L"] },
          { name: "Irlanda", flag: "🇮🇪", p: 1, l: 1, gf: 0, ga: 1, form: ["L"] },
        ],
        B4: [
          { name: "Suécia", flag: "🇸🇪" },
          { name: "Polônia", flag: "🇵🇱" },
          { name: "Romênia", flag: "🇷🇴" },
          { name: "Bósnia", flag: "🇧🇦" },
        ],
      },
      C: {
        C1: [{ name: "Albânia" }, { name: "Finlândia" }, { name: "Belarus" }, { name: "San Marino" }],
        C2: [{ name: "Montenegro" }, { name: "Armênia" }, { name: "Chipre" }, { name: "Letônia" }],
        C3: [{ name: "Eslováquia" }, { name: "Cazaquistão" }, { name: "Ilhas Faroé" }, { name: "Moldávia" }],
        C4: [{ name: "Bulgária" }, { name: "Islândia" }, { name: "Luxemburgo" }, { name: "Estônia" }],
      },
      D: {
        D1: [
          { name: "Malta", flag: "🇲🇹", p: 1, w: 1, gf: 2, ga: 1, form: ["W"] },
          { name: "Gibraltar", flag: "🇬🇮" },
          { name: "Andorra", flag: "🇦🇩", p: 1, l: 1, gf: 1, ga: 2, form: ["L"] },
        ],
        D2: [
          { name: "Lituânia", flag: "🇱🇹", p: 1, w: 1, gf: 2, ga: 0, form: ["W"] },
          { name: "Azerbaijão", flag: "🇦🇿" },
          { name: "Liechtenstein", flag: "🇱🇮", p: 1, l: 1, gf: 0, ga: 2, form: ["L"] },
        ],
      },
    };

    for (const [division, groups] of Object.entries(groupsData) as [
      "A" | "B" | "C" | "D",
      Record<string, SeedTeam[]>
    ][]) {
      for (const [groupName, teams] of Object.entries(groups)) {
        for (let i = 0; i < teams.length; i++) {
          const t = teams[i];
          const played = t.p ?? 0;
          const won = t.w ?? 0;
          const drawn = t.d ?? 0;
          const lost = t.l ?? 0;
          const gf = t.gf ?? 0;
          const ga = t.ga ?? 0;
          const points = won * 3 + drawn;
          const gd = gf - ga;

          // Define as zonas baseado na divisão e colocação padrão
          let zone: "QUARTER_FINALS" | "PROMOTION" | "PROMOTION_PLAYOFF" | "RELEGATION_PLAYOFF" | "RELEGATION" | "NONE" = "NONE";
          const pos = i + 1;

          if (division === "A") {
            if (pos <= 2) zone = "QUARTER_FINALS";
            else if (pos === 3) zone = "RELEGATION_PLAYOFF";
            else zone = "RELEGATION";
          } else if (division === "B") {
            if (pos === 1) zone = "PROMOTION";
            else if (pos === 2) zone = "PROMOTION_PLAYOFF";
            else if (pos === 3) zone = "RELEGATION_PLAYOFF";
            else zone = "RELEGATION";
          } else if (division === "C") {
            if (pos === 1) zone = "PROMOTION";
            else if (pos === 2) zone = "PROMOTION_PLAYOFF";
            else if (pos === 4) zone = "RELEGATION";
            else zone = "NONE";
          } else if (division === "D") {
            if (pos === 1) zone = "PROMOTION";
            else if (pos === 2) zone = "PROMOTION_PLAYOFF";
            else zone = "NONE";
          }

          await ctx.db.insert("standings", {
            division,
            group: groupName,
            teamName: t.name,
            teamFlag: t.flag ?? "🏳️",
            points,
            played,
            won,
            drawn,
            lost,
            goalsFor: gf,
            goalsAgainst: ga,
            goalDifference: gd,
            form: t.form ?? [],
            zone,
          });
        }
      }
    }

    return { success: true, message: "Classificações da Nations League populadas com sucesso." };
  },
});
