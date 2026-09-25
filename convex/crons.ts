import { cronJobs } from "convex/server";
import { api } from "./_generated/api";

const crons = cronJobs();

// Executa a cada 1 minuto buscando atualizações de placar em tempo real
crons.interval(
  "atualizar-placares-ao-vivo-sofascore",
  { minutes: 1 },
  api.syncSofascore.syncLiveFromSofascore,
  {}
);

export default crons;
