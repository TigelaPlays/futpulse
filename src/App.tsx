import { useState } from "react";
import { useQuery, useMutation, useAction } from "convex/react";
import { api } from "../convex/_generated/api";
import type { Id } from "../convex/_generated/dataModel";
import { Activity, Clock, Trophy, Flame, RefreshCw, CalendarDays } from "lucide-react";
import { MatchDetailsModal } from "./components/MatchDetailsModal";
import { LiveMatchClock } from "./components/LiveMatchClock";

type FilterType = "ALL" | "LIVE" | "FINISHED" | "SCHEDULED";

export default function App() {
  const [filter, setFilter] = useState<FilterType>("ALL");
  const [selectedLeagueId, setSelectedLeagueId] = useState<Id<"leagues"> | null>(null);
  const [selectedMatchId, setSelectedMatchId] = useState<Id<"matches"> | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncFeedback, setSyncFeedback] = useState<string | null>(null);

  const leagues = useQuery(api.leagues.listLeagues);
  const matches = useQuery(api.matches.listMatches, {
    statusFilter: filter,
    leagueId: selectedLeagueId ?? undefined,
  });

  const simulateGoal = useMutation(api.seed.simulateGoal);
  const syncLiveMatches = useAction(api.ingestion.syncLiveMatches);
  const syncDailyFixtures = useAction(api.ingestion.syncDailyFixtures);

  // Agrupa jogos por campeonato
  const groupedMatches = matches?.reduce((acc, match) => {
    const leagueName = match.league?.name ?? "Outros";
    if (!acc[leagueName]) {
      acc[leagueName] = {
        league: match.league,
        matches: [],
      };
    }
    acc[leagueName].matches.push(match);
    return acc;
  }, {} as Record<string, { league: any; matches: NonNullable<typeof matches> }>);

  // Sincronização de jogos ao vivo
  const handleManualSync = async () => {
    try {
      setIsSyncing(true);
      setSyncFeedback(null);
      const result = await syncLiveMatches();
      if (result.success) {
        setSyncFeedback(`${result.syncedCount ?? 0} ao vivo sincronizados`);
      } else {
        setSyncFeedback("Falha na sincronização");
      }
    } catch (err) {
      console.error("Erro ao sincronizar dados:", err);
      setSyncFeedback("Erro ao conectar");
    } finally {
      setIsSyncing(false);
      setTimeout(() => setSyncFeedback(null), 3500);
    }
  };

  // Sincronização de jogos do dia
  const handleSyncDaily = async () => {
    try {
      setIsSyncing(true);
      setSyncFeedback(null);
      const result = await syncDailyFixtures({});
      if (result.success) {
        setSyncFeedback(`${result.syncedCount ?? 0} jogos do dia sincronizados`);
      } else {
        setSyncFeedback("Falha na sincronização");
      }
    } catch (err) {
      console.error("Erro ao sincronizar grade diária:", err);
      setSyncFeedback("Erro ao conectar");
    } finally {
      setIsSyncing(false);
      setTimeout(() => setSyncFeedback(null), 3500);
    }
  };

  // Simulação de gol local
  const handleSimulateGoal = async (
    e: React.MouseEvent,
    matchId: Id<"matches">,
    isHome: boolean,
    teamName: string
  ) => {
    e.stopPropagation();
    try {
      await simulateGoal({
        matchId,
        isHome,
        playerName: `Artilheiro (${teamName})`,
      });
    } catch (err) {
      console.error("Falha ao computar gol:", err);
    }
  };

  return (
    <div className="min-h-screen bg-[#0d1117] text-slate-100 font-sans">
      <MatchDetailsModal
        matchId={selectedMatchId}
        onClose={() => setSelectedMatchId(null)}
      />

      {/* Header Fixo */}
      <header className="border-b border-[#30363d] bg-[#161b22] sticky top-0 z-40 px-4 py-3 shadow-md">
        <div className="max-w-5xl mx-auto flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="bg-emerald-500/20 p-2 rounded-lg text-emerald-400">
              <Activity className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight bg-gradient-to-r from-emerald-400 to-teal-200 bg-clip-text text-transparent">
                FutPulse
              </h1>
              <p className="text-xs text-slate-400">Resultados em Tempo Real</p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            {syncFeedback && (
              <span className="text-xs font-medium text-emerald-400 animate-fade-in hidden sm:inline">
                {syncFeedback}
              </span>
            )}

            <button
              onClick={handleManualSync}
              disabled={isSyncing}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-semibold transition-all cursor-pointer ${
                isSyncing
                  ? "bg-[#21262d] text-slate-500 border-[#30363d] cursor-not-allowed"
                  : "bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border-emerald-500/30 active:scale-95"
              }`}
              title="Sincronizar jogos ao vivo agora"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? "animate-spin" : ""}`} />
              <span>{isSyncing ? "..." : "Ao Vivo"}</span>
            </button>

            <button
              onClick={handleSyncDaily}
              disabled={isSyncing}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-semibold transition-all cursor-pointer ${
                isSyncing
                  ? "bg-[#21262d] text-slate-500 border-[#30363d] cursor-not-allowed"
                  : "bg-slate-800 hover:bg-slate-700 text-slate-300 border-[#30363d] active:scale-95"
              }`}
              title="Carregar grade do dia inteiro"
            >
              <CalendarDays className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Grade de Hoje</span>
            </button>

            {/* Filtros de Status */}
            <div className="flex bg-[#0d1117] p-1 rounded-lg border border-[#30363d] text-xs font-semibold">
              {(
                [
                  { id: "ALL", label: "Todos" },
                  { id: "LIVE", label: "Ao Vivo" },
                  { id: "FINISHED", label: "Encerrados" },
                  { id: "SCHEDULED", label: "Agendados" },
                ] as const
              ).map((item) => (
                <button
                  key={item.id}
                  onClick={() => setFilter(item.id)}
                  className={`px-2.5 py-1.5 rounded-md transition-all cursor-pointer ${
                    filter === item.id
                      ? "bg-emerald-500 text-slate-950 shadow-sm"
                      : "text-slate-400 hover:text-slate-200"
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Pílulas de Navegação Rápida por Campeonato */}
        {leagues && leagues.length > 0 && (
          <div className="max-w-5xl mx-auto mt-3 pt-2.5 border-t border-[#21262d] flex items-center gap-2 overflow-x-auto no-scrollbar pb-1">
            <button
              onClick={() => setSelectedLeagueId(null)}
              className={`px-3 py-1 rounded-full text-xs font-medium shrink-0 transition-all cursor-pointer ${
                selectedLeagueId === null
                  ? "bg-emerald-500 text-slate-950 font-semibold"
                  : "bg-[#21262d] text-slate-400 hover:text-slate-200 border border-[#30363d]"
              }`}
            >
              Todas as Ligas
            </button>

            {leagues.map((lg) => {
              const isSelected = selectedLeagueId === lg._id;
              return (
                <button
                  key={lg._id}
                  onClick={() => setSelectedLeagueId(lg._id)}
                  className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs shrink-0 transition-all cursor-pointer ${
                    isSelected
                      ? "bg-emerald-500 text-slate-950 font-bold"
                      : "bg-[#21262d] text-slate-300 hover:text-white border border-[#30363d]"
                  }`}
                >
                  {lg.logoUrl && (
                    <div className="w-4 h-4 rounded-full bg-white/90 p-0.5 flex items-center justify-center shrink-0">
                      <img src={lg.logoUrl} alt="" className="w-full h-full object-contain" />
                    </div>
                  )}
                  <span>{lg.name}</span>
                </button>
              );
            })}
          </div>
        )}
      </header>

      {/* Conteúdo Principal */}
      <main className="max-w-5xl mx-auto p-4 sm:p-6 space-y-6">
        {matches === undefined ? (
          <div className="flex justify-center items-center py-20 text-slate-400 gap-2">
            <div className="w-5 h-5 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
            <span>Sincronizando partidas...</span>
          </div>
        ) : matches.length === 0 ? (
          <div className="text-center py-16 bg-[#161b22] border border-[#30363d] rounded-xl text-slate-400">
            Nenhuma partida encontrada neste filtro.
          </div>
        ) : (
          Object.entries(groupedMatches || {}).map(([leagueName, group]) => (
            <div
              key={leagueName}
              className="bg-[#161b22] border border-[#30363d] rounded-xl overflow-hidden shadow-lg"
            >
              {/* Cabeçalho da Liga */}
              <div className="bg-[#1c2128] px-4 py-3 border-b border-[#30363d] flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  {group.league?.logoUrl ? (
                    <div className="w-6 h-6 rounded-full bg-white/90 p-0.5 flex items-center justify-center shadow-sm shrink-0">
                      <img
                        src={group.league.logoUrl}
                        alt={leagueName}
                        className="w-full h-full object-contain"
                      />
                    </div>
                  ) : (
                    <Trophy className="w-5 h-5 text-emerald-400" />
                  )}
                  <span className="font-bold text-sm tracking-wide text-slate-200">
                    {leagueName}
                  </span>
                  <span className="text-xs text-slate-400 font-normal">
                    • {group.league?.country}
                  </span>
                </div>
                <span className="text-[11px] uppercase tracking-wider px-2 py-0.5 rounded bg-[#30363d] text-slate-300">
                  {group.league?.type === "cup" ? "Mata-mata" : "Pontos Corridos"}
                </span>
              </div>

              {/* Lista de Partidas */}
              <div className="divide-y divide-[#21262d]">
                {group.matches.map((match: any) => {
                  const isLive = ["IN_PLAY", "PAUSED", "EXTRA_TIME", "PENALTY_SHOOTOUT"].includes(
                    match.status
                  );

                  return (
                    <div
                      key={match._id}
                      onClick={() => setSelectedMatchId(match._id)}
                      className="p-4 hover:bg-[#1f242c]/70 transition-colors flex flex-col md:flex-row md:items-center justify-between gap-4 cursor-pointer"
                    >
                      {/* Minuto / Relógio Dinâmico */}
                      <div className="flex items-center md:w-32 gap-2">
                        {isLive ? (
                          <LiveMatchClock
                            initialMinute={match.minute}
                            status={match.status}
                            statusShort={match.statusShort}
                            updatedAt={match.elapsedSecondsUpdatedAt ?? match._creationTime}
                          />
                        ) : match.status === "POSTPONED" ? (
                          <span className="text-xs font-semibold text-amber-400 bg-amber-950/60 border border-amber-800/60 px-2 py-1 rounded-md">
                            Adiado
                          </span>
                        ) : match.status === "FINISHED" ? (
                          <span className="text-xs font-semibold text-slate-400 bg-slate-800/80 px-2 py-1 rounded-md">
                            Encerrado
                          </span>
                        ) : (
                          <div className="flex items-center gap-1.5 text-xs text-slate-400">
                            <Clock className="w-3.5 h-3.5" />
                            <span>
                              {new Date(match.startTime).toLocaleTimeString([], {
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </span>
                          </div>
                        )}
                        <span className="text-xs text-slate-500 hidden sm:inline truncate">
                          • {match.round}
                        </span>
                      </div>

                      {/* Confronto e Placar */}
                      <div className="flex-1 grid grid-cols-7 items-center max-w-lg mx-auto w-full">
                        {/* Mandante */}
                        <div className="col-span-3 flex items-center justify-end gap-2.5 text-right">
                          <span className="font-semibold text-sm truncate">
                            {match.homeTeam?.name}
                          </span>
                          {match.homeTeam?.logoUrl ? (
                            <img
                              src={match.homeTeam.logoUrl}
                              alt={match.homeTeam?.name ?? "Mandante"}
                              className="w-6 h-6 object-contain shrink-0"
                            />
                          ) : (
                            <div className="w-6 h-6 rounded-full bg-slate-800 border border-[#30363d] flex items-center justify-center text-[10px] font-bold text-slate-400 shrink-0">
                              {match.homeTeam?.name?.charAt(0) ?? "M"}
                            </div>
                          )}
                        </div>

                        {/* Placar Central */}
                        <div className="col-span-1 flex justify-center items-center">
                          {match.status === "SCHEDULED" ? (
                            <span className="text-xs text-slate-400 font-bold tracking-widest">VS</span>
                          ) : (
                            <div className="bg-[#0d1117] border border-[#30363d] px-3 py-1 rounded-md font-mono font-bold text-base text-emerald-400 flex items-center gap-1.5 shadow-inner">
                              <span>{match.homeScore}</span>
                              <span className="text-slate-500 font-sans">-</span>
                              <span>{match.awayScore}</span>
                            </div>
                          )}
                        </div>

                        {/* Visitante */}
                        <div className="col-span-3 flex items-center justify-start gap-2.5 text-left">
                          {match.awayTeam?.logoUrl ? (
                            <img
                              src={match.awayTeam.logoUrl}
                              alt={match.awayTeam?.name ?? "Visitante"}
                              className="w-6 h-6 object-contain shrink-0"
                            />
                          ) : (
                            <div className="w-6 h-6 rounded-full bg-slate-800 border border-[#30363d] flex items-center justify-center text-[10px] font-bold text-slate-400 shrink-0">
                              {match.awayTeam?.name?.charAt(0) ?? "V"}
                            </div>
                          )}
                          <span className="font-semibold text-sm truncate">
                            {match.awayTeam?.name}
                          </span>
                        </div>
                      </div>

                      {/* Botões de Simulação */}
                      {isLive && (
                        <div className="flex items-center gap-1.5 justify-end pt-2 md:pt-0 border-t md:border-t-0 border-[#21262d]">
                          <button
                            onClick={(e) =>
                              handleSimulateGoal(e, match._id, true, match.homeTeam?.name ?? "Mandante")
                            }
                            className="text-[11px] bg-slate-800 hover:bg-emerald-600 hover:text-white px-2.5 py-1 rounded border border-[#30363d] text-slate-300 transition-colors flex items-center gap-1 cursor-pointer active:scale-95"
                            title={`Adicionar gol para ${match.homeTeam?.name}`}
                          >
                            <Flame className="w-3 h-3" /> +1 {match.homeTeam?.code || "M"}
                          </button>
                          <button
                            onClick={(e) =>
                              handleSimulateGoal(e, match._id, false, match.awayTeam?.name ?? "Visitante")
                            }
                            className="text-[11px] bg-slate-800 hover:bg-emerald-600 hover:text-white px-2.5 py-1 rounded border border-[#30363d] text-slate-300 transition-colors flex items-center gap-1 cursor-pointer active:scale-95"
                            title={`Adicionar gol para ${match.awayTeam?.name}`}
                          >
                            <Flame className="w-3 h-3" /> +1 {match.awayTeam?.code || "V"}
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))
        )}
      </main>
    </div>
  );
}