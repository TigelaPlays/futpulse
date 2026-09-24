import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { api } from "./_generated/api";

// Plantéis conhecidos para enriquecer os lances da simulação com nomes reais
const KNOWN_ROSTERS: Record<string, string[]> = {
  // Champions League
  Lille: ["Jonathan David", "Edon Zhegrova", "Benjamin André", "Alexsandro Ribeiro", "Ayase Ueda", "Olivier Giroud", "Osame Sahraoui", "Ethan Mbappé"],
  "Real Betis": ["Vitor Roque", "Giovani Lo Celso", "Marc Bartra", "Isco", "Pablo Fornals", "Chimy Ávila", "Natan", "Marc Roca"],
  "Real Madrid": ["Vinícius Júnior", "Kylian Mbappé", "Jude Bellingham", "Rodrygo", "Federico Valverde", "Luka Modrić", "Éder Militão"],
  Barcelona: ["Lamine Yamal", "Robert Lewandowski", "Raphinha", "Pedri", "Gavi", "Frenkie de Jong", "Jules Koundé"],
  Liverpool: ["Mohamed Salah", "Darwin Núñez", "Luis Díaz", "Alexis Mac Allister", "Dominik Szoboszlai", "Virgil van Dijk"],
  "Manchester City": ["Erling Haaland", "Kevin De Bruyne", "Phil Foden", "Bernardo Silva", "Rodri", "Rúben Dias"],
  Arsenal: ["Bukayo Saka", "Kai Havertz", "Martin Ødegaard", "Gabriel Martinelli", "Declan Rice", "Gabriel Magalhães"],
  Bayern: ["Harry Kane", "Jamal Musiala", "Leroy Sané", "Thomas Müller", "Joshua Kimmich", "Alphonso Davies"],
  PSG: ["Ousmane Dembélé", "Bradley Barcola", "Vitinha", "Achraf Hakimi", "Marquinhos", "Warren Zaïre-Emery"],
  Juventus: ["Dušan Vlahović", "Kenan Yıldız", "Teun Koopmeiners", "Manuel Locatelli", "Bremer"],
  Inter: ["Lautaro Martínez", "Marcus Thuram", "Nicolò Barella", "Hakan Çalhanoğlu", "Alessandro Bastoni"],

  // Futebol Brasileiro (Série A / Série B)
  Flamengo: ["Pedro", "Giorgian de Arrascaeta", "Gerson", "Bruno Henrique", "Nicolás de la Cruz", "Léo Ortiz"],
  Palmeiras: ["Estêvão", "Raphael Veiga", "Flaco López", "Felipe Anderson", "Zé Rafael", "Gustavo Gómez"],
  Criciúma: ["Yannick Bolasie", "Fellipe Mateus", "Éder", "Marcelo Hermes", "Rodrigo", "Newton"],
  "Operário-PR": ["Maxwell", "Rodrigo Rodrigues", "Jacy", "Pará", "Willian Machado", "Neto Paraíba"],
  Novorizontino: ["Neto Pessoa", "Fabrício Daniel", "Marlon", "Rodolfo", "Waguininho", "Lucca"],
  "Vila Nova": ["Alesson", "Henrique Almeida", "Cristiano", "Ralf", "João Lucas"],
  "América-MG": ["Juninho", "Fabinho", "Renato Marques", "Alê", "Marlon"],
  Goiás: ["Thiago Galhardo", "Welliton", "Marcão", "Angelo Rodríguez", "Messias"],
  "Atlético-GO": ["Luiz Fernando", "Shaylon", "Gabriel Baralhas", "Jan Hurtado", "Adriano Martins"],
  Avaí: ["Vagner Love", "Maurício Garcez", "Pedro Castro", "Natanael", "Tiago Pagnussat"],
  Sport: ["Gustavo Coutinho", "Lucas Lima", "Chrystian Barletta", "Fabricio Domínguez", "Zé Roberto"],
  CRB: ["Anselmo Ramon", "Léo Pereira", "Gegê", "Falcão", "Mike"],
  Cuiabá: ["Isidro Pitta", "Clayson", "Denilson", "Fernando Sobral", "Marllon"],
  Fortaleza: ["Juan Martín Lucero", "Yago Pikachu", "Hércules", "Moisés", "Tomás Pochettino"],
  "Athletic Club": ["Wellington Torrão", "Paul Villero", "Diego Fumaça", "Neto Costa", "Geovane"],
  Londrina: ["Henrique", "Iago Telles", "Kadi", "Everton Moraes", "Rayan"],
  Coritiba: ["Robson", "Matheus Frizzo", "Júnior Brumado", "Sebastián Gómez", "Natanael"],
  "Ponte Preta": ["Jeh", "Elvis", "Dodô", "Emerson Santos", "Gabriel Risso"],
  "São Bernardo": ["Kayke", "Vitinho", "Rodrigo Souza", "Lucas Tocantins", "Silvinho"],
  Ceará: ["Saulo Mineiro", "Erick Pulga", "Lourenço", "Aylon", "Richardson"],
  Náutico: ["Paulo Sérgio", "Patrick Allan", "Marco Antônio", "Sousa", "Gustavo Maia"],
  "Botafogo-SP": ["Alexandre Jesus", "Douglas Baggio", "Matheus Barbosa", "Carlos Manuel"],
  Chapecoense: ["Mário Sérgio", "Foguinho", "Thomás Bedinelli", "Rafael Carvalheira"],
  Mirassol: ["Dellatorre", "Chico Kim", "Danielzinho", "Gabriel", "Negueba"],
  Santos: ["Neymar Jr", "Guilherme", "Giuliano", "Diego Pituca", "Wendel Silva", "Gonzalo Escobar"],
};

function getPlayerName(teamName: string, teamShortName?: string): string {
  const roster = KNOWN_ROSTERS[teamName] || (teamShortName ? KNOWN_ROSTERS[teamShortName] : null);
  if (roster && roster.length > 0) {
    const randomIndex = Math.floor(Math.random() * roster.length);
    return roster[randomIndex];
  }
  const genericFirstNames = ["Lucas", "Gabriel", "Matheus", "Felipe", "Bruno", "Rodrigo", "Carlos", "Diego", "Eduardo"];
  const genericLastNames = ["Silva", "Santos", "Oliveira", "Souza", "Pereira", "Lima", "Ferreira", "Costa", "Rodrigues"];
  const first = genericFirstNames[Math.floor(Math.random() * genericFirstNames.length)];
  const last = genericLastNames[Math.floor(Math.random() * genericLastNames.length)];
  return `${first} ${last}`;
}

// 1. Inicia a Simulação
export const startSimulation = mutation({
  args: {
    matchId: v.id("matches"),
    speedMultiplier: v.optional(v.number()),
    stepMinutes: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const match = await ctx.db.get(args.matchId);
    if (!match) {
      throw new Error(`Partida não encontrada para o id: ${args.matchId}`);
    }

    const speedMultiplier = args.speedMultiplier && args.speedMultiplier > 0 ? args.speedMultiplier : 1;
    const stepMinutes = args.stepMinutes && args.stepMinutes > 0 ? args.stepMinutes : 1;
    const runId = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;

    // Reseta o estado da partida em matches
    await ctx.db.patch(args.matchId, {
      status: "LIVE",
      statusShort: "1T",
      minute: 1,
      homeScore: 0,
      awayScore: 0,
      homeHalftimeScore: undefined,
      awayHalftimeScore: undefined,
      elapsedSecondsUpdatedAt: Date.now(),
    });

    // Remove eventos anteriores da partida
    const existingEvents = await ctx.db
      .query("matchEvents")
      .withIndex("by_match", (q) => q.eq("matchId", args.matchId))
      .collect();

    for (const ev of existingEvents) {
      await ctx.db.delete(ev._id);
    }

    // Inicializa estatísticas com 50% de posse e zero nas métricas
    const initialStats = {
      matchId: args.matchId,
      homePossession: 50,
      awayPossession: 50,
      homeTotalShots: 0,
      awayTotalShots: 0,
      homeShotsOnTarget: 0,
      awayShotsOnTarget: 0,
      homeCorners: 0,
      awayCorners: 0,
      homeFouls: 0,
      awayFouls: 0,
      homeYellowCards: 0,
      awayYellowCards: 0,
      homeRedCards: 0,
      awayRedCards: 0,
      homePasses: 0,
      awayPasses: 0,
    };

    const existingStats = await ctx.db
      .query("matchStatistics")
      .withIndex("by_match", (q) => q.eq("matchId", args.matchId))
      .first();

    if (existingStats) {
      await ctx.db.patch(existingStats._id, initialStats);
    } else {
      await ctx.db.insert("matchStatistics", initialStats);
    }

    // Registra ou atualiza o controle da simulação
    const existingSim = await ctx.db
      .query("simulations")
      .withIndex("by_match", (q) => q.eq("matchId", args.matchId))
      .first();

    const simPayload = {
      matchId: args.matchId,
      isActive: true,
      isPaused: false,
      speedMultiplier,
      runId,
      stepMinutes,
      lastTickAt: Date.now(),
    };

    if (existingSim) {
      await ctx.db.patch(existingSim._id, simPayload);
    } else {
      await ctx.db.insert("simulations", simPayload);
    }

    // Agenda o primeiro tick recursivo
    const delay = Math.max(200, Math.round(2000 / speedMultiplier));
    await ctx.scheduler.runAfter(delay, api.simulation.tickSimulation, {
      matchId: args.matchId,
      speedMultiplier,
      runId,
    });

    return {
      success: true,
      matchId: args.matchId,
      runId,
      speedMultiplier,
      status: "LIVE",
      minute: 1,
    };
  },
});

// 2. Executa um ciclo (tick) da simulação
export const tickSimulation = mutation({
  args: {
    matchId: v.id("matches"),
    speedMultiplier: v.number(),
    runId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const sim = await ctx.db
      .query("simulations")
      .withIndex("by_match", (q) => q.eq("matchId", args.matchId))
      .first();

    // Guardrail de parada: se a simulação não estiver ativa, estiver pausada ou for de outra sessão
    if (!sim || !sim.isActive || sim.isPaused || (args.runId && sim.runId !== args.runId)) {
      return { stopped: true, reason: "Simulação pausada ou inativa" };
    }

    const match = await ctx.db.get(args.matchId);
    if (!match) {
      return { stopped: true, reason: "Partida não encontrada" };
    }

    const [homeTeam, awayTeam] = await Promise.all([
      ctx.db.get(match.homeTeamId),
      ctx.db.get(match.awayTeamId),
    ]);

    const homeTeamName = homeTeam?.name || "Mandante";
    const awayTeamName = awayTeam?.name || "Visitante";
    const homeTeamShort = homeTeam?.shortName;
    const awayTeamShort = awayTeam?.shortName;

    const currentMinute = match.minute ?? 1;
    let nextMinute = currentMinute;
    let newStatus = match.status;
    let newStatusShort = match.statusShort;
    let isHalfTimePause = false;

    // Gerenciamento de Fases (1T -> HT -> 2T -> FT)
    if (match.statusShort === "HT" || match.status === "HALFTIME") {
      // Reinicia para o 2º Tempo
      nextMinute = 46;
      newStatus = "LIVE";
      newStatusShort = "2T";
    } else {
      nextMinute = currentMinute + (sim.stepMinutes || 1);

      if (currentMinute < 45 && nextMinute >= 45) {
        // Pausa de intervalo no minuto 45
        nextMinute = 45;
        newStatus = "PAUSED";
        newStatusShort = "HT";
        isHalfTimePause = true;

        await ctx.db.patch(args.matchId, {
          homeHalftimeScore: match.homeScore,
          awayHalftimeScore: match.awayScore,
        });
      } else if (nextMinute >= 90) {
        // Encerramento da partida no minuto 90
        nextMinute = 90;
        newStatus = "FINISHED";
        newStatusShort = "FT";
      } else {
        newStatus = "LIVE";
        newStatusShort = nextMinute > 45 ? "2T" : "1T";
      }
    }

    // Carrega estatísticas atuais para aplicar flutuações graduais
    const statsDoc = await ctx.db
      .query("matchStatistics")
      .withIndex("by_match", (q) => q.eq("matchId", args.matchId))
      .first();

    let homeScore = match.homeScore;
    let awayScore = match.awayScore;

    if (!isHalfTimePause && statsDoc && newStatus !== "FINISHED") {
      // 1. Flutuação de Posse de Bola (oscilação leve mantendo soma = 100%)
      const possessionDelta = (Math.random() - 0.5) * 4;
      const currentHomePoss = statsDoc.homePossession || 50;
      const newHomePoss = Math.min(68, Math.max(32, Math.round(currentHomePoss + possessionDelta)));
      const newAwayPoss = 100 - newHomePoss;

      // 2. Incremento de passes baseado na posse do minuto
      const passTotalInc = Math.floor(Math.random() * 5) + 4; // 4 a 8 passes/min
      const homePassInc = Math.round(passTotalInc * (newHomePoss / 100));
      const awayPassInc = passTotalInc - homePassInc;

      let homeShots = statsDoc.homeTotalShots;
      let awayShots = statsDoc.awayTotalShots;
      let homeOnTarget = statsDoc.homeShotsOnTarget;
      let awayOnTarget = statsDoc.awayShotsOnTarget;
      let homeCorners = statsDoc.homeCorners;
      let awayCorners = statsDoc.awayCorners;
      let homeFouls = statsDoc.homeFouls;
      let awayFouls = statsDoc.awayFouls;
      let homeYellows = statsDoc.homeYellowCards ?? 0;
      let awayYellows = statsDoc.awayYellowCards ?? 0;
      let homeReds = statsDoc.homeRedCards ?? 0;
      let awayReds = statsDoc.awayRedCards ?? 0;

      // 3. Faltas (~14% de chance)
      if (Math.random() < 0.14) {
        if (Math.random() * 100 > newHomePoss) {
          homeFouls++;
        } else {
          awayFouls++;
        }
      }

      // 4. Escanteios (~10% de chance ponderada pela posse)
      if (Math.random() < 0.1) {
        if (Math.random() * 100 < newHomePoss) {
          homeCorners++;
        } else {
          awayCorners++;
        }
      }

      // 5. Finalizações (~18% de chance ponderada pela posse)
      if (Math.random() < 0.18) {
        const isHomeShot = Math.random() * 100 < newHomePoss;
        const isOnTarget = Math.random() < 0.38;

        if (isHomeShot) {
          homeShots++;
          if (isOnTarget) homeOnTarget++;
        } else {
          awayShots++;
          if (isOnTarget) awayOnTarget++;
        }
      }

      // 6. Gols (~3.5% de chance por tick)
      if (Math.random() < 0.035) {
        const isHomeGoal = Math.random() * 100 < newHomePoss;
        const scoringTeamId = isHomeGoal ? match.homeTeamId : match.awayTeamId;
        const playerName = isHomeGoal
          ? getPlayerName(homeTeamName, homeTeamShort)
          : getPlayerName(awayTeamName, awayTeamShort);

        if (isHomeGoal) {
          homeScore++;
          homeShots++;
          homeOnTarget++;
        } else {
          awayScore++;
          awayShots++;
          awayOnTarget++;
        }

        await ctx.db.insert("matchEvents", {
          matchId: args.matchId,
          minute: nextMinute,
          teamId: scoringTeamId,
          playerName,
          type: "GOAL",
          detail: isHomeGoal ? "GOAL_HOME" : "GOAL_AWAY",
          externalId: `sim-goal-${args.matchId}-${nextMinute}-${Date.now()}`,
        });
      }

      // 7. Cartão Amarelo (~4.5% de chance)
      if (Math.random() < 0.045) {
        const isHomeCard = Math.random() * 100 > newHomePoss;
        const teamId = isHomeCard ? match.homeTeamId : match.awayTeamId;
        const playerName = isHomeCard
          ? getPlayerName(homeTeamName, homeTeamShort)
          : getPlayerName(awayTeamName, awayTeamShort);

        if (isHomeCard) homeYellows++;
        else awayYellows++;

        await ctx.db.insert("matchEvents", {
          matchId: args.matchId,
          minute: nextMinute,
          teamId,
          playerName,
          type: "YELLOW_CARD",
          detail: "Falta tática",
          externalId: `sim-yellow-${args.matchId}-${nextMinute}-${Date.now()}`,
        });
      }

      // 8. Substituição (entre minutos 55 e 85, ~8% de chance)
      if (nextMinute >= 55 && nextMinute <= 85 && Math.random() < 0.08) {
        const isHomeSub = Math.random() < 0.5;
        const teamId = isHomeSub ? match.homeTeamId : match.awayTeamId;
        const playerIn = isHomeSub
          ? getPlayerName(homeTeamName, homeTeamShort)
          : getPlayerName(awayTeamName, awayTeamShort);
        const playerOut = isHomeSub
          ? getPlayerName(homeTeamName, homeTeamShort)
          : getPlayerName(awayTeamName, awayTeamShort);

        await ctx.db.insert("matchEvents", {
          matchId: args.matchId,
          minute: nextMinute,
          teamId,
          playerName: `${playerIn} (saiu ${playerOut})`,
          type: "SUBSTITUTION",
          detail: "Substituição",
          externalId: `sim-sub-${args.matchId}-${nextMinute}-${Date.now()}`,
        });
      }

      // 9. Cartão Vermelho Raro (~0.3% de chance)
      if (Math.random() < 0.003) {
        const isHomeRed = Math.random() * 100 > newHomePoss;
        const teamId = isHomeRed ? match.homeTeamId : match.awayTeamId;
        const playerName = isHomeRed
          ? getPlayerName(homeTeamName, homeTeamShort)
          : getPlayerName(awayTeamName, awayTeamShort);

        if (isHomeRed) homeReds++;
        else awayReds++;

        await ctx.db.insert("matchEvents", {
          matchId: args.matchId,
          minute: nextMinute,
          teamId,
          playerName,
          type: "RED_CARD",
          detail: "Entrada violenta",
          externalId: `sim-red-${args.matchId}-${nextMinute}-${Date.now()}`,
        });
      }

      // Salva estatísticas atualizadas
      await ctx.db.patch(statsDoc._id, {
        homePossession: newHomePoss,
        awayPossession: newAwayPoss,
        homePasses: (statsDoc.homePasses || 0) + homePassInc,
        awayPasses: (statsDoc.awayPasses || 0) + awayPassInc,
        homeTotalShots: homeShots,
        awayTotalShots: awayShots,
        homeShotsOnTarget: homeOnTarget,
        awayShotsOnTarget: awayOnTarget,
        homeCorners,
        awayCorners,
        homeFouls,
        awayFouls,
        homeYellowCards: homeYellows,
        awayYellowCards: awayYellows,
        homeRedCards: homeReds,
        awayRedCards: awayReds,
      });
    }

    // Atualiza o documento da partida
    await ctx.db.patch(args.matchId, {
      minute: nextMinute,
      status: newStatus as any,
      statusShort: newStatusShort,
      homeScore,
      awayScore,
      elapsedSecondsUpdatedAt: Date.now(),
    });

    // Se o jogo acabou, finaliza a simulação
    if (newStatus === "FINISHED") {
      await ctx.db.patch(sim._id, {
        isActive: false,
        isPaused: false,
        lastTickAt: Date.now(),
      });
      return {
        finished: true,
        minute: 90,
        status: "FINISHED",
        homeScore,
        awayScore,
      };
    }

    // Reagenda o próximo tick recursivo se ainda estiver ativo
    const delay = isHalfTimePause
      ? Math.max(1000, Math.round(4000 / args.speedMultiplier))
      : Math.max(200, Math.round(2000 / args.speedMultiplier));

    await ctx.scheduler.runAfter(delay, api.simulation.tickSimulation, {
      matchId: args.matchId,
      speedMultiplier: args.speedMultiplier,
      runId: sim.runId,
    });

    return {
      success: true,
      minute: nextMinute,
      status: newStatus,
      statusShort: newStatusShort,
      homeScore,
      awayScore,
    };
  },
});

// 3. Pausa a Simulação
export const pauseSimulation = mutation({
  args: {
    matchId: v.id("matches"),
  },
  handler: async (ctx, args) => {
    const sim = await ctx.db
      .query("simulations")
      .withIndex("by_match", (q) => q.eq("matchId", args.matchId))
      .first();

    if (sim) {
      await ctx.db.patch(sim._id, {
        isPaused: true,
        isActive: false,
        lastTickAt: Date.now(),
      });
    }

    await ctx.db.patch(args.matchId, {
      status: "PAUSED",
    });

    return { success: true, matchId: args.matchId, status: "PAUSED" };
  },
});

// 4. Reseta a Simulação
export const resetSimulation = mutation({
  args: {
    matchId: v.id("matches"),
  },
  handler: async (ctx, args) => {
    const sim = await ctx.db
      .query("simulations")
      .withIndex("by_match", (q) => q.eq("matchId", args.matchId))
      .first();

    if (sim) {
      await ctx.db.patch(sim._id, {
        isActive: false,
        isPaused: false,
        runId: "",
        lastTickAt: Date.now(),
      });
    }

    // Restaura a partida para estado agendado
    await ctx.db.patch(args.matchId, {
      status: "SCHEDULED",
      statusShort: "NS",
      minute: 0,
      homeScore: 0,
      awayScore: 0,
      homeHalftimeScore: undefined,
      awayHalftimeScore: undefined,
      elapsedSecondsUpdatedAt: undefined,
    });

    // Limpa eventos gerados
    const events = await ctx.db
      .query("matchEvents")
      .withIndex("by_match", (q) => q.eq("matchId", args.matchId))
      .collect();

    for (const ev of events) {
      await ctx.db.delete(ev._id);
    }

    // Zera estatísticas
    const stats = await ctx.db
      .query("matchStatistics")
      .withIndex("by_match", (q) => q.eq("matchId", args.matchId))
      .first();

    if (stats) {
      await ctx.db.patch(stats._id, {
        homePossession: 50,
        awayPossession: 50,
        homeTotalShots: 0,
        awayTotalShots: 0,
        homeShotsOnTarget: 0,
        awayShotsOnTarget: 0,
        homeCorners: 0,
        awayCorners: 0,
        homeFouls: 0,
        awayFouls: 0,
        homeYellowCards: 0,
        awayYellowCards: 0,
        homeRedCards: 0,
        awayRedCards: 0,
        homePasses: 0,
        awayPasses: 0,
      });
    }

    return { success: true, matchId: args.matchId, status: "SCHEDULED" };
  },
});

// 5. Query Auxiliar de Status da Simulação
export const getSimulationStatus = query({
  args: {
    matchId: v.id("matches"),
  },
  handler: async (ctx, args) => {
    const [match, sim, stats, events] = await Promise.all([
      ctx.db.get(args.matchId),
      ctx.db
        .query("simulations")
        .withIndex("by_match", (q) => q.eq("matchId", args.matchId))
        .first(),
      ctx.db
        .query("matchStatistics")
        .withIndex("by_match", (q) => q.eq("matchId", args.matchId))
        .first(),
      ctx.db
        .query("matchEvents")
        .withIndex("by_match", (q) => q.eq("matchId", args.matchId))
        .collect(),
    ]);

    if (!match) return null;

    events.sort((a, b) => b.minute - a.minute);

    return {
      matchId: args.matchId,
      status: match.status,
      statusShort: match.statusShort,
      minute: match.minute ?? 0,
      homeScore: match.homeScore,
      awayScore: match.awayScore,
      isSimulating: sim?.isActive ?? false,
      isPaused: sim?.isPaused ?? false,
      speedMultiplier: sim?.speedMultiplier ?? 1,
      runId: sim?.runId || null,
      eventsCount: events.length,
      statistics: stats || null,
      recentEvents: events.slice(0, 10),
    };
  },
});
