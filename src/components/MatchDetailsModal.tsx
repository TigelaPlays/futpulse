import { useState, useEffect } from "react";
import { useQuery, useAction } from "convex/react";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import { X, Clock, RefreshCw, Trophy, BarChart2, AlertCircle } from "lucide-react";

interface MatchDetailsModalProps {
  matchId: Id<"matches"> | null;
  onClose: () => void;
}

export function MatchDetailsModal({ matchId, onClose }: MatchDetailsModalProps) {
  const [activeTab, setActiveTab] = useState<"timeline" | "stats">("timeline");
  const [isSyncingEvents, setIsSyncingEvents] = useState(false);
  const [isSyncingStats, setIsSyncingStats] = useState(false);
  const [eventsFeedback, setEventsFeedback] = useState<string | null>(null);
  const [statsFeedback, setStatsFeedback] = useState<string | null>(null);

  const syncMatchEvents = useAction(api.ingestion.syncMatchEvents);
  const syncMatchStatistics = useAction(api.ingestion.syncMatchStatistics);

  const match = useQuery(
    api.matches.getMatchDetails,
    matchId ? { matchId } : "skip"
  );

  // Fecha o modal ao pressionar Escape
  useEffect(() => {
    if (!matchId) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [matchId, onClose]);

  if (!matchId) return null;

  const isLive =
    match && ["IN_PLAY", "PAUSED", "EXTRA_TIME", "PENALTY_SHOOTOUT"].includes(match.status);

  const handleSyncEvents = async () => {
    if (!matchId) return;
    try {
      setIsSyncingEvents(true);
      setEventsFeedback(null);
      const result = await syncMatchEvents({ matchId });
      if (result.success) {
        setEventsFeedback(`${result.eventCount ?? 0} lances`);
      } else {
        setEventsFeedback("Sem novos lances");
      }
    } catch (err) {
      console.error("Erro ao sincronizar eventos:", err);
      setEventsFeedback("Erro ao sincronizar");
    } finally {
      setIsSyncingEvents(false);
      setTimeout(() => setEventsFeedback(null), 3000);
    }
  };

  const handleSyncStats = async () => {
    if (!matchId) return;
    try {
      setIsSyncingStats(true);
      setStatsFeedback(null);
      const result = await syncMatchStatistics({ matchId });
      if (result.success) {
        setStatsFeedback("Atualizado");
      } else {
        setStatsFeedback(result.reason === "INSUFFICIENT_DATA" ? "Sem dados na API" : "Falha");
      }
    } catch (err) {
      console.error("Erro ao sincronizar estatísticas:", err);
      setStatsFeedback("Erro");
    } finally {
      setIsSyncingStats(false);
      setTimeout(() => setStatsFeedback(null), 3000);
    }
  };

  const getStatusText = () => {
    if (!match) return "";
    if (isLive) {
      return `${match.minute ?? 0}' (${match.statusShort})`;
    }
    if (match.status === "FINISHED") return "Fim de Jogo";
    if (match.status === "POSTPONED") return "Adiado";
    if (match.status === "SCHEDULED") {
      return match.startTime
        ? new Date(match.startTime).toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          })
        : "Agendado";
    }
    return match.statusShort || match.status;
  };

  const getEventBadge = (type: string) => {
    switch (type) {
      case "GOAL":
        return { label: "⚽ Golo: ", color: "text-emerald-400" };
      case "YELLOW_CARD":
        return { label: "🟨 Cartão Amarelo: ", color: "text-yellow-400" };
      case "RED_CARD":
        return { label: "🟥 Cartão Vermelho: ", color: "text-red-400" };
      case "SUBSTITUTION":
        return { label: "🔄 Substituição: ", color: "text-blue-400" };
      case "VAR":
        return { label: "🖥️ Decisão VAR: ", color: "text-purple-400" };
      default:
        return { label: "• ", color: "text-slate-300" };
    }
  };

  const renderStatRow = (label: string, homeVal: number, awayVal: number, isPercentage = false) => {
    const total = homeVal + awayVal;
    const homePercent = total === 0 ? 50 : Math.round((homeVal / total) * 100);
    const awayPercent = 100 - homePercent;

    return (
      <div className="space-y-1.5 text-xs">
        <div className="flex justify-between font-semibold text-slate-300">
          <span className="text-emerald-400 font-mono">
            {homeVal}
            {isPercentage ? "%" : ""}
          </span>
          <span className="text-slate-400 font-normal">{label}</span>
          <span className="text-teal-300 font-mono">
            {awayVal}
            {isPercentage ? "%" : ""}
          </span>
        </div>
        <div className="h-2 w-full bg-[#0d1117] rounded-full overflow-hidden flex border border-[#30363d]">
          <div
            className="bg-emerald-500 transition-all duration-500"
            style={{ width: `${isPercentage ? homeVal : homePercent}%` }}
          />
          <div
            className="bg-teal-400 transition-all duration-500"
            style={{ width: `${isPercentage ? awayVal : awayPercent}%` }}
          />
        </div>
      </div>
    );
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fade-in"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Detalhes da Partida"
    >
      <div
        className="bg-[#161b22] border border-[#30363d] w-full max-w-lg rounded-2xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header do Modal */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-[#30363d] bg-[#1c2128]">
          <div className="flex items-center gap-2">
            {match?.league?.logoUrl ? (
              <div className="w-6 h-6 rounded-full bg-white/90 p-0.5 flex items-center justify-center shadow-sm shrink-0">
                <img
                  src={match.league.logoUrl}
                  alt={match.league.name ?? "Liga"}
                  className="w-full h-full object-contain"
                />
              </div>
            ) : (
              <Trophy className="w-5 h-5 text-emerald-400" />
            )}
            <span className="text-xs font-bold uppercase tracking-wider text-slate-300">
              {match?.league?.name ?? "Detalhes da Partida"}
              {match?.round ? ` • ${match.round}` : ""}
            </span>
          </div>
          <button
            onClick={onClose}
            aria-label="Fechar"
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Placar e Conteúdo */}
        {match === undefined ? (
          <div className="p-12 flex justify-center items-center text-slate-400 gap-2">
            <div className="w-5 h-5 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
            <span>A carregar detalhes...</span>
          </div>
        ) : match === null ? (
          <div className="p-12 flex flex-col items-center justify-center text-slate-400 gap-3">
            <AlertCircle className="w-8 h-8 text-amber-500" />
            <span className="text-sm font-medium">Partida não encontrada.</span>
          </div>
        ) : (
          <div className="p-6 overflow-y-auto space-y-6">
            {/* Placar */}
            <div className="grid grid-cols-7 items-center text-center">
              {/* Mandante */}
              <div className="col-span-3 flex flex-col items-center gap-2">
                {match.homeTeam?.logoUrl ? (
                  <img
                    src={match.homeTeam.logoUrl}
                    alt={match.homeTeam?.name ?? "Mandante"}
                    className="w-12 h-12 object-contain drop-shadow"
                  />
                ) : (
                  <div className="w-12 h-12 rounded-full bg-slate-800 border border-[#30363d] flex items-center justify-center font-bold text-slate-400">
                    {match.homeTeam?.name?.charAt(0) ?? "M"}
                  </div>
                )}
                <span className="font-bold text-sm text-slate-100">
                  {match.homeTeam?.name ?? "Mandante"}
                </span>
              </div>

              {/* Placar Central */}
              <div className="col-span-1 flex flex-col items-center">
                <div className="bg-[#0d1117] border border-[#30363d] px-3 py-1.5 rounded-lg font-mono font-bold text-xl text-emerald-400">
                  {match.status === "SCHEDULED" ? "VS" : `${match.homeScore} - ${match.awayScore}`}
                </div>
                <span className="text-[11px] text-slate-400 mt-1 font-semibold">
                  {getStatusText()}
                </span>
                {match.homeHalftimeScore !== undefined && match.awayHalftimeScore !== undefined && (
                  <span className="text-[10px] text-slate-500 mt-0.5">
                    (HT {match.homeHalftimeScore} - {match.awayHalftimeScore})
                  </span>
                )}
                {match.homePenaltyScore !== undefined && match.awayPenaltyScore !== undefined && (
                  <span className="text-[10px] text-amber-400/90 mt-0.5 font-mono">
                    (Pên {match.homePenaltyScore} - {match.awayPenaltyScore})
                  </span>
                )}
              </div>

              {/* Visitante */}
              <div className="col-span-3 flex flex-col items-center gap-2">
                {match.awayTeam?.logoUrl ? (
                  <img
                    src={match.awayTeam.logoUrl}
                    alt={match.awayTeam?.name ?? "Visitante"}
                    className="w-12 h-12 object-contain drop-shadow"
                  />
                ) : (
                  <div className="w-12 h-12 rounded-full bg-slate-800 border border-[#30363d] flex items-center justify-center font-bold text-slate-400">
                    {match.awayTeam?.name?.charAt(0) ?? "V"}
                  </div>
                )}
                <span className="font-bold text-sm text-slate-100">
                  {match.awayTeam?.name ?? "Visitante"}
                </span>
              </div>
            </div>

            {/* Alternador de Abas */}
            <div className="flex bg-[#0d1117] p-1 rounded-lg border border-[#30363d] text-xs font-semibold">
              <button
                onClick={() => setActiveTab("timeline")}
                className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-md transition-all cursor-pointer ${
                  activeTab === "timeline"
                    ? "bg-[#21262d] text-emerald-400 shadow-sm"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                <Clock className="w-3.5 h-3.5" />
                <span>Linha do Tempo</span>
              </button>
              <button
                onClick={() => setActiveTab("stats")}
                className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-md transition-all cursor-pointer ${
                  activeTab === "stats"
                    ? "bg-[#21262d] text-emerald-400 shadow-sm"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                <BarChart2 className="w-3.5 h-3.5" />
                <span>Estatísticas</span>
              </button>
            </div>

            {/* Conteúdo: Linha do Tempo */}
            {activeTab === "timeline" && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                    Lances do Jogo
                  </span>

                  <div className="flex items-center gap-2">
                    {eventsFeedback && (
                      <span className="text-[11px] font-medium text-emerald-400 animate-fade-in">
                        {eventsFeedback}
                      </span>
                    )}

                    {match.externalId && (
                      <button
                        onClick={handleSyncEvents}
                        disabled={isSyncingEvents}
                        className="flex items-center gap-1.5 text-[11px] font-semibold text-emerald-400 hover:text-emerald-300 bg-emerald-950/40 hover:bg-emerald-950/70 border border-emerald-800/60 px-2.5 py-1 rounded transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed active:scale-95"
                        title="Carregar golos e cartões oficiais desta partida"
                      >
                        <RefreshCw className={`w-3 h-3 ${isSyncingEvents ? "animate-spin" : ""}`} />
                        <span>{isSyncingEvents ? "A carregar..." : "Sincronizar Lances"}</span>
                      </button>
                    )}
                  </div>
                </div>

                {match.events.length === 0 ? (
                  <div className="text-center py-6 text-xs text-slate-500 bg-[#0d1117]/50 rounded-lg border border-[#21262d]">
                    Nenhum lance registado até ao momento.
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    {match.events.map((event, idx) => {
                      const isHomeTeam = event.teamId === match.homeTeamId;
                      const badge = getEventBadge(event.type);

                      return (
                        <div
                          key={event._id ?? idx}
                          className={`flex items-center gap-3 p-2.5 rounded-lg border text-xs ${
                            isHomeTeam
                              ? "bg-slate-900/50 border-[#30363d] text-left"
                              : "bg-slate-900/50 border-[#30363d] flex-row-reverse text-right"
                          }`}
                        >
                          <span className="font-mono font-bold px-2 py-0.5 rounded bg-emerald-950/80 text-emerald-400 border border-emerald-800/60 shrink-0">
                            {event.minute}
                            {event.extraMinute ? `+${event.extraMinute}` : ""}
                            '
                          </span>

                          <div className="flex-1">
                            <div className="font-semibold text-slate-200">
                              <span className={badge.color}>{badge.label}</span>
                              {event.playerName}
                            </div>
                            {(event.detail || event.assistPlayerName) && (
                              <div className="text-[11px] text-slate-400">
                                {event.detail}
                                {event.assistPlayerName ? ` (Assistência: ${event.assistPlayerName})` : ""}
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* Conteúdo: Estatísticas */}
            {activeTab === "stats" && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                    Dados Comparativos
                  </span>

                  <div className="flex items-center gap-2">
                    {statsFeedback && (
                      <span className="text-[11px] font-medium text-emerald-400 animate-fade-in">
                        {statsFeedback}
                      </span>
                    )}

                    {match.externalId && (
                      <button
                        onClick={handleSyncStats}
                        disabled={isSyncingStats}
                        className="flex items-center gap-1.5 text-[11px] font-semibold text-emerald-400 hover:text-emerald-300 bg-emerald-950/40 hover:bg-emerald-950/70 border border-emerald-800/60 px-2.5 py-1 rounded transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed active:scale-95"
                        title="Carregar estatísticas oficiais desta partida"
                      >
                        <RefreshCw className={`w-3 h-3 ${isSyncingStats ? "animate-spin" : ""}`} />
                        <span>{isSyncingStats ? "A carregar..." : "Sincronizar Estatísticas"}</span>
                      </button>
                    )}
                  </div>
                </div>

                {!match.statistics ? (
                  <div className="text-center py-8 text-xs text-slate-500 bg-[#0d1117]/50 rounded-lg border border-[#21262d] flex flex-col items-center gap-2">
                    <BarChart2 className="w-6 h-6 text-slate-600" />
                    <span>Estatísticas ainda não sincronizadas para esta partida.</span>
                    {match.externalId && (
                      <span className="text-[11px] text-emerald-500/80">
                        Clique em "Sincronizar Estatísticas" acima para carregar.
                      </span>
                    )}
                  </div>
                ) : (
                  <div className="space-y-3.5 bg-[#0d1117]/30 p-4 rounded-xl border border-[#21262d]">
                    {renderStatRow(
                      "Posse de Bola",
                      match.statistics.homePossession,
                      match.statistics.awayPossession,
                      true
                    )}
                    {renderStatRow(
                      "Remates à Baliza",
                      match.statistics.homeShotsOnTarget,
                      match.statistics.awayShotsOnTarget
                    )}
                    {renderStatRow(
                      "Total de Remates",
                      match.statistics.homeTotalShots,
                      match.statistics.awayTotalShots
                    )}
                    {renderStatRow(
                      "Cantos",
                      match.statistics.homeCorners,
                      match.statistics.awayCorners
                    )}
                    {renderStatRow(
                      "Faltas",
                      match.statistics.homeFouls,
                      match.statistics.awayFouls
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}