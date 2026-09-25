import { mutation } from "./_generated/server";

export const seedAllNationsLeagueStandings = mutation({
  handler: async (ctx) => {
    // 1. Garante ou recupera a liga UNL
    let league = await ctx.db
      .query("leagues")
      .filter((q) => q.eq(q.field("code"), "UNL"))
      .first();

    if (!league) {
      const leagueId = await ctx.db.insert("leagues", {
        name: "UEFA Nations League",
        code: "UNL",
        country: "Europa",
        logoUrl: "https://img.sofascore.com/api/v1/unique-tournament/10783/image",
        season: 2026,
        type: "cup",
        format: "group_knockout",
        priority: 2,
      });
      league = await ctx.db.get(leagueId);
    }
    if (!league) throw new Error("Liga UNL não encontrada.");

    // 2. Estrutura completa das 54 seleções por Divisão e Grupo
    const divisionsConfig: Record<"A" | "B" | "C" | "D", Record<string, string[]>> = {
      A: {
        A1: ["Itália", "Bélgica", "França", "Turquia"],
        A2: ["Países Baixos", "Alemanha", "Sérvia", "Grécia"],
        A3: ["Inglaterra", "Espanha", "Croácia", "Tchéquia"],
        A4: ["Noruega", "Dinamarca", "Portugal", "País de Gales"],
      },
      B: {
        B1: ["Eslovênia", "Escócia", "Macedônia do Norte", "Suíça"],
        B2: ["Geórgia", "Irlanda do Norte", "Hungria", "Ucrânia"],
        B3: ["Áustria", "Israel", "Kosovo", "República da Irlanda"],
        B4: ["Polônia", "Bósnia e Herzegovina", "Suécia", "Romênia"],
      },
      C: {
        C1: ["San Marino", "Finlândia", "Albânia", "Bielorrússia"],
        C2: ["Armênia", "Letônia", "Montenegro", "Chipre"],
        C3: ["Ilhas Faroé", "Cazaquistão", "Eslováquia", "Moldávia"],
        C4: ["Islândia", "Estônia", "Bulgária", "Luxemburgo"],
      },
      D: {
        D1: ["Gibraltar", "Andorra", "Malta"],
        D2: ["Azerbaijão", "Liechtenstein", "Lituânia"],
      },
    };

    // 3. Limpa a tabela 'standings' da Nations League para recriar 100% zerada
    const currentStandings = await ctx.db
      .query("standings")
      .filter((q) => q.eq(q.field("leagueId"), league._id))
      .collect();

    for (const row of currentStandings) {
      await ctx.db.delete(row._id);
    }

    // 4. Popula todas as divisões
    let totalTeamsInserted = 0;

    for (const [division, groups] of Object.entries(divisionsConfig) as [
      "A" | "B" | "C" | "D",
      Record<string, string[]>
    ][]) {
      for (const [groupName, teams] of Object.entries(groups)) {
        for (let i = 0; i < teams.length; i++) {
          const teamName = teams[i];
          const pos = i + 1;

          // Garante registro em 'teams' com suporte a aliases
          let team = await ctx.db
            .query("teams")
            .filter((q) =>
              q.or(
                q.eq(q.field("name"), teamName),
                teamName === "Países Baixos" ? q.eq(q.field("name"), "Holanda") : q.eq(q.field("name"), teamName),
                teamName === "Tchéquia" ? q.eq(q.field("name"), "República Checa") : q.eq(q.field("name"), teamName),
                teamName === "República da Irlanda" ? q.eq(q.field("name"), "Irlanda") : q.eq(q.field("name"), teamName),
                teamName === "Bielorrússia" ? q.eq(q.field("name"), "Belarus") : q.eq(q.field("name"), teamName),
                teamName === "Bósnia e Herzegovina" ? q.eq(q.field("name"), "Bósnia") : q.eq(q.field("name"), teamName)
              )
            )
            .first();

          if (!team) {
            const teamId = await ctx.db.insert("teams", {
              name: teamName,
              shortName: teamName,
              logoUrl: `/assets/flags_nations/${
                teamName === "Tchéquia"
                  ? "República Tcheca"
                  : teamName === "República da Irlanda"
                  ? "Irlanda"
                  : teamName === "Bielorrússia"
                  ? "Bielorrúsia"
                  : teamName
              }.jpg`,
            });
            team = await ctx.db.get(teamId);
          }

          // Determina a zona oficial com base na divisão e colocação inicial
          let zone:
            | "QUARTER_FINALS"
            | "PROMOTION"
            | "PROMOTION_PLAYOFF"
            | "RELEGATION_PLAYOFF"
            | "RELEGATION"
            | undefined = undefined;

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
            else if (pos === 4) {
              // Os 4º colocados da C: 2 vão para playoff e 2 caem direto.
              // Inicialmente marcamos C1 e C2 como playoff e C3 e C4 como rebaixamento direto
              zone = groupName === "C1" || groupName === "C2" ? "RELEGATION_PLAYOFF" : "RELEGATION";
            }
          } else if (division === "D") {
            if (pos === 1) zone = "PROMOTION";
            else if (pos === 2) zone = "PROMOTION_PLAYOFF";
          }

          await ctx.db.insert("standings", {
            leagueId: league._id,
            division,
            group: groupName,
            teamId: team!._id,
            teamName,
            points: 0,
            played: 0,
            won: 0,
            drawn: 0,
            lost: 0,
            goalsFor: 0,
            goalsAgainst: 0,
            goalDifference: 0,
            form: [],
            zone,
          });

          totalTeamsInserted++;
        }
      }
    }

    return {
      success: true,
      message: `Tabelas criadas com sucesso! Total de ${totalTeamsInserted} seleções distribuídas nas Ligas A, B, C e D.`,
    };
  },
});
