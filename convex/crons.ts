import { cronJobs } from "convex/server";
import { api } from "./_generated/api";

const crons = cronJobs();

// 1. Atualização da Grade Diária todos os dias às 09:00 UTC (06:00 da manhã no horário de Brasília)
crons.daily(
  "sincronizar grade do dia",
  { hourUTC: 9, minuteUTC: 0 },
  api.ingestion.syncDailyFixtures,
  {}
);

// 2. Verificação de jogos ao vivo a cada 2 minutos (só consome a API se houver jogo rolando ou iminente)
crons.interval(
  "smart live polling",
  { minutes: 2 },
  api.ingestion.smartLivePolling,
  {}
);

export default crons;
