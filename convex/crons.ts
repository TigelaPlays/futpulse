import { cronJobs } from "convex/server";
import { api } from "./_generated/api";

const crons = cronJobs();

// 1. Sincronização contínua de partidas via Football-Data.org a cada 2 minutos
crons.interval(
  "sync football-data matches",
  { minutes: 2 },
  api.footballData.syncMatchesAction,
  {}
);

// 2. Sincronização inteligente de partidas ao vivo via API-Football a cada 20 minutos (gestão estrita de 100 chamadas/dia)
crons.interval(
  "sync api-football live matches",
  { minutes: 20 },
  api.apiFootball.syncLiveMatchesAction,
  {}
);

// 3. Atualização da Grade Diária todos os dias às 09:00 UTC (06:00 BRT)
crons.cron(
  "sincronizar grade do dia",
  "0 9 * * *",
  api.ingestion.syncDailyFixtures,
  {}
);

export default crons;
