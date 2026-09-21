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

// 2. Polling inteligente a cada 15 minutos
crons.interval(
  "smart live polling",
  { minutes: 15 },
  api.ingestion.smartLivePolling,
  {}
);

export default crons;

