import { useState, useEffect } from "react";
import { useQuery, useAction } from "convex/react";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import { X, Clock, RefreshCw, Trophy, BarChart2, AlertCircle, MapPin, Calendar } from "lucide-react";

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
        return { label: "⚽ Golo: ", color: "text-emerald-700" };
      case "YELLOW_CARD":
        return { label: "🟨 Cartão Amarelo: ", color: "text-amber-600" };
      case "RED_CARD":
        return { label: "🟥 Cartão Vermelho: ", color: "text-rose-600" };
      case "SUBSTITUTION":
        return { label: "🔄 Substituição: ", color: "text-blue-600" };
      case "VAR":
        return { label: "🖥️ Decisão VAR: ", color: "text-purple-600" };
      default:
        return { label: "• ", color: "text-slate-700" };
    }
  };

  const renderStatRow = (label: string, homeVal: number, awayVal: number, isPercentage = false) => {
    const total = homeVal + awayVal;
    const homePercent = total === 0 ? 50 : Math.round((homeVal / total) * 100);
    const awayPercent = 100 - homePercent;

    return (
      <div className="space-y-1.5 text-xs">
        <div className="flex justify-between font-semibold text-slate-800">
          <span className="text-emerald-700 font-mono font-bold">
            {homeVal}
            {isPercentage ? "%" : ""}
          </span>
          <span className="text-slate-500 font-medium">{label}</span>
          <span className="text-teal-700 font-mono font-bold">
            {awayVal}
            {isPercentage ? "%" : ""}
          </span>
        </div>
        <div className="h-2 w-full bg-slate-200 rounded-full overflow-hidden flex border border-slate-300/70">
          <div
            className="bg-emerald-600 transition-all duration-500"
            style={{ width: `${isPercentage ? homeVal : homePercent}%` }}
          />
          <div
            className="bg-teal-500 transition-all duration-500"
            style={{ width: `${isPercentage ? awayVal : awayPercent}%` }}
          />
        </div>
      </div>
    );
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Detalhes da Partida"
    >
      <div
        className="bg-white border border-slate-200 w-full max-w-lg rounded-2xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header do Modal */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-200 bg-slate-50/90">
          <div className="flex items-center gap-2">
            {match?.league?.logoUrl ? (
              <div className="w-6 h-6 rounded-full bg-slate-50 p-0.5 flex items-center justify-center shadow-2xs border border-slate-200 shrink-0">
                <img
                  src={match.league.logoUrl}
                  alt={match.league.name ?? "Liga"}
                  className="w-full h-full object-contain"
                />
              </div>
            ) : (
              <Trophy className="w-5 h-5 text-emerald-600" />
            )}
            <span className="text-xs font-bold uppercase tracking-wider text-slate-800">
              {match?.league?.name ?? "Detalhes da Partida"}
              {match?.round ? ` • ${match.round}` : ""}
            </span>
          </div>
          <button
            onClick={onClose}
            aria-label="Fechar"
            className="text-slate-400 hover:text-slate-700 p-1 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Placar e Conteúdo */}
        {match === undefined ? (
          <div className="p-12 flex justify-center items-center text-slate-500 gap-2">
            <div className="w-5 h-5 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin" />
            <span>A carregar detalhes...</span>
          </div>
        ) : match === null ? (
          <div className="p-12 flex flex-col items-center justify-center text-slate-500 gap-3">
            <AlertCircle className="w-8 h-8 text-amber-600" />
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
                    className="w-12 h-12 object-contain drop-shadow-sm"
                  />
                ) : (
                  <div className="w-12 h-12 rounded-full bg-slate-100 border border-slate-300 flex items-center justify-center font-bold text-slate-600">
                    {match.homeTeam?.name?.charAt(0) ?? "M"}
                  </div>
                )}
                <span className="font-bold text-sm text-slate-900">
                  {match.homeTeam?.name ?? "Mandante"}
                </span>
              </div>

              {/* Placar Central */}
              <div className="col-span-1 flex flex-col items-center">
                <div className="bg-slate-100 border border-slate-200 px-3 py-1.5 rounded-lg font-mono font-bold text-xl text-slate-900 shadow-2xs">
                  {match.status === "SCHEDULED" ? "VS" : `${match.homeScore} - ${match.awayScore}`}
                </div>
                <span className="text-[11px] text-slate-600 mt-1 font-semibold">
                  {getStatusText()}
                </span>
                {match.homeHalftimeScore !== undefined && match.awayHalftimeScore !== undefined && (
                  <span className="text-[10px] text-slate-500 mt-0.5 font-medium">
                    (HT {match.homeHalftimeScore} - {match.awayHalftimeScore})
                  </span>
                )}
                {match.homePenaltyScore !== undefined && match.awayPenaltyScore !== undefined && (
                  <span className="text-[10px] text-amber-700 mt-0.5 font-mono font-semibold">
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
                    className="w-12 h-12 object-contain drop-shadow-sm"
                  />
                ) : (
                  <div className="w-12 h-12 rounded-full bg-slate-100 border border-slate-300 flex items-center justify-center font-bold text-slate-600">
                    {match.awayTeam?.name?.charAt(0) ?? "V"}
                  </div>
                )}
                <span className="font-bold text-sm text-slate-900">
                  {match.awayTeam?.name ?? "Visitante"}
                </span>
              </div>
            </div>

            {/* Informações Oficiais: Data, Horário e Estádio */}
            <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1.5 py-2 px-3 bg-slate-50 rounded-xl border border-slate-200/80 text-xs text-slate-600">
              {match.startTime && (
                <div className="flex items-center gap-1.5 font-medium">
                  <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <span>
                    {new Date(match.startTime).toLocaleDateString("pt-BR", {
                      weekday: "short",
                      day: "2-digit",
                      month: "2-digit",
                      year: "numeric",
                    })}
                    {" • "}
                    {new Date(match.startTime).toLocaleTimeString("pt-BR", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                </div>
              )}
              {match.stadium && (
                <div className="flex items-center gap-1.5 font-medium">
                  <MapPin className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  <span>
                    {match.stadium.name}
                    {match.stadium.city ? ` (${match.stadium.city})` : ""}
                  </span>
                </div>
              )}
            </div>

            {/* Alternador de Abas */}
            <div className="flex bg-slate-100 p-1 rounded-lg border border-slate-200 text-xs font-semibold">
              <button
                onClick={() => setActiveTab("timeline")}
                className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-md transition-all cursor-pointer ${
                  activeTab === "timeline"
                    ? "bg-white text-slate-900 font-bold shadow-2xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <Clock className="w-3.5 h-3.5" />
                <span>Linha do Tempo</span>
              </button>
              <button
                onClick={() => setActiveTab("stats")}
                className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-md transition-all cursor-pointer ${
                  activeTab === "stats"
                    ? "bg-white text-slate-900 font-bold shadow-2xs"
                    : "text-slate-600 hover:text-slate-900"
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
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-600">
                    Lances do Jogo
                  </span>

                  <div className="flex items-center gap-2">
                    {eventsFeedback && (
                      <span className="text-[11px] font-medium text-emerald-700 animate-fade-in bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                        {eventsFeedback}
                      </span>
                    )}

                    {match.externalId && (
                      <button
                        onClick={handleSyncEvents}
                        disabled={isSyncingEvents}
                        className="flex items-center gap-1.5 text-[11px] font-semibold text-emerald-700 hover:text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 px-2.5 py-1 rounded transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed active:scale-95 shadow-2xs"
                        title="Carregar golos e cartões oficiais desta partida"
                      >
                        <RefreshCw className={`w-3 h-3 ${isSyncingEvents ? "animate-spin" : ""}`} />
                        <span>{isSyncingEvents ? "A carregar..." : "Sincronizar Lances"}</span>
                      </button>
                    )}
                  </div>
                </div>

                {match.events.length === 0 ? (
                  <div className="text-center py-6 px-4 text-xs text-slate-600 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
                    <p className="font-bold text-slate-800 text-sm">
                      Súmula simplificada: {match.homeTeam?.name ?? "Mandante"} {match.homeScore} × {match.awayScore} {match.awayTeam?.name ?? "Visitante"}
                    </p>
                    <p className="text-[11px] text-slate-500">
                      Nenhum lance detalhado registrado para esta partida histórica.
                    </p>
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
                              ? "bg-slate-50/90 border-slate-200 text-left"
                              : "bg-slate-50/90 border-slate-200 flex-row-reverse text-right"
                          }`}
                        >
                          <span className="font-mono font-bold px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200 shrink-0 shadow-2xs">
                            {event.minute}
                            {event.extraMinute ? `+${event.extraMinute}` : ""}
                            '
                          </span>

                          <div className="flex-1">
                            <div className="font-semibold text-slate-900">
                              <span className={badge.color}>{badge.label}</span>
                              {event.playerName}
                            </div>
                            {(event.detail || event.assistPlayerName) && (
                              <div className="text-[11px] text-slate-500">
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
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-600">
                    Dados Comparativos
                  </span>

                  <div className="flex items-center gap-2">
                    {statsFeedback && (
                      <span className="text-[11px] font-medium text-emerald-700 animate-fade-in bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                        {statsFeedback}
                      </span>
                    )}

                    {match.externalId && (
                      <button
                        onClick={handleSyncStats}
                        disabled={isSyncingStats}
                        className="flex items-center gap-1.5 text-[11px] font-semibold text-emerald-700 hover:text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 px-2.5 py-1 rounded transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed active:scale-95 shadow-2xs"
                        title="Carregar estatísticas oficiais desta partida"
                      >
                        <RefreshCw className={`w-3 h-3 ${isSyncingStats ? "animate-spin" : ""}`} />
                        <span>{isSyncingStats ? "A carregar..." : "Sincronizar Estatísticas"}</span>
                      </button>
                    )}
                  </div>
                </div>

                {!match.statistics ? (
                  <div className="text-center py-8 text-xs text-slate-500 bg-slate-50 rounded-lg border border-slate-200 flex flex-col items-center gap-2">
                    <BarChart2 className="w-6 h-6 text-slate-400" />
                    <span>Estatísticas ainda não sincronizadas para esta partida.</span>
                    {match.externalId && (
                      <span className="text-[11px] text-emerald-700 font-medium">
                        Clique em "Sincronizar Estatísticas" acima para carregar.
                      </span>
                    )}
                  </div>
                ) : (
                  <div className="space-y-3.5 bg-slate-50/80 p-4 rounded-xl border border-slate-200">
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