import { useState, useEffect } from "react";
import { useQuery, useAction } from "convex/react";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import { X, Clock, RefreshCw, Trophy, BarChart2, AlertCircle, MapPin, Calendar } from "lucide-react";

const STADIUM_CITIES: Record<string, string> = {
  "Heriberto Hülse": "Criciúma (SC)",
  "Arena Pantanal": "Cuiabá (MT)",
  "Independência": "Belo Horizonte (MG)",
  "Arena Independência": "Belo Horizonte (MG)",
  "Alfredo Jaconi": "Caxias do Sul (RS)",
  "Antônio Accioly": "Goiânia (GO)",
  "Ressacada": "Florianópolis (SC)",
  "Estádio da Ressacada": "Florianópolis (SC)",
  "Hailé Pinheiro (Serrinha)": "Goiânia (GO)",
  "Estádio da Serrinha": "Goiânia (GO)",
  "Serrinha": "Goiânia (GO)",
  "Aflitos": "Recife (PE)",
  "Estádio dos Aflitos": "Recife (PE)",
  "Jorge Ismael de Biasi": "Novo Horizonte (SP)",
  "Germano Krüger": "Ponta Grossa (PR)",
  "Castelão": "Fortaleza (CE)",
  "Castelão (CE)": "Fortaleza (CE)",
  "Arena Castelão": "Fortaleza (CE)",
  "Estádio do Café": "Londrina (PR)",
  "VGD": "Londrina (PR)",
  "Arena Sicredi": "São João del-Rei (MG)",
  "OBA": "Goiânia (GO)",
  "Onésio Brasileiro Alvarenga": "Goiânia (GO)",
  "Primeiro de Maio": "São Bernardo do Campo (SP)",
  "Rei Pelé": "Maceió (AL)",
  "Rei Pelé (AL)": "Maceió (AL)",
  "Santa Cruz": "Ribeirão Preto (SP)",
  "Arena Nicnet (Santa Cruz)": "Ribeirão Preto (SP)",
  "Arena Nicnet": "Ribeirão Preto (SP)",
  "Ilha do Retiro": "Recife (PE)",
  "Moisés Lucarelli": "Campinas (SP)",
};

function getStadiumDisplayLocation(stadium?: { name?: string; city?: string } | null): string {
  if (!stadium?.name) return "";
  const knownCity = STADIUM_CITIES[stadium.name];
  if (knownCity) return `${stadium.name} • ${knownCity}`;
  if (stadium.city && stadium.city.toLowerCase() !== "brasil") {
    return `${stadium.name} • ${stadium.city}`;
  }
  return stadium.name;
}

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

  const getTimelineEventMeta = (event: { type: string; detail?: string }) => {
    const detailLower = (event.detail ?? "").toLowerCase();

    if (event.type === "GOAL") {
      if (detailLower.includes("penalt") || detailLower.includes("(p)")) {
        return {
          icon: "⚽",
          badge: "Pênalti",
          label: "Gol de Pênalti",
          badgeBg: "bg-emerald-100 text-emerald-800 border-emerald-300",
        };
      }
      if (detailLower.includes("contra") || detailLower.includes("own")) {
        return {
          icon: "⚽",
          badge: "Gol Contra",
          label: "Gol Contra",
          badgeBg: "bg-rose-100 text-rose-800 border-rose-300",
        };
      }
      return {
        icon: "⚽",
        badge: "Gol",
        label: "Gol",
        badgeBg: "bg-emerald-100 text-emerald-800 border-emerald-300",
      };
    }

    if (
      event.type === "YELLOW_CARD" ||
      ((event.type as string) === "CARD" &&
        (detailLower.includes("amarelo") || detailLower.includes("yellow") || !detailLower.includes("red")))
    ) {
      return {
        icon: "🟨",
        badge: "Amarelo",
        label: "Cartão Amarelo",
        badgeBg: "bg-amber-100 text-amber-800 border-amber-300",
      };
    }

    if (
      event.type === "RED_CARD" ||
      ((event.type as string) === "CARD" &&
        (detailLower.includes("vermelho") || detailLower.includes("red")))
    ) {
      return {
        icon: "🟥",
        badge: "Vermelho",
        label: "Cartão Vermelho",
        badgeBg: "bg-rose-100 text-rose-800 border-rose-300",
      };
    }

    if (event.type === "SUBSTITUTION") {
      return {
        icon: "🔄",
        badge: "Substituição",
        label: "Substituição",
        badgeBg: "bg-blue-100 text-blue-800 border-blue-300",
      };
    }

    if (event.type === "VAR") {
      return {
        icon: "🖥️",
        badge: "VAR",
        label: "Decisão VAR",
        badgeBg: "bg-purple-100 text-purple-800 border-purple-300",
      };
    }

    return {
      icon: "•",
      badge: "Lance",
      label: "Lance",
      badgeBg: "bg-slate-100 text-slate-800 border-slate-300",
    };
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
        {match === undefined ? (
          <>
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-200 bg-slate-50">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-800">
                Detalhes da Partida
              </span>
              <button
                onClick={onClose}
                aria-label="Fechar"
                className="text-slate-400 hover:text-slate-700 p-1 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-12 flex justify-center items-center text-slate-500 gap-2">
              <div className="w-5 h-5 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin" />
              <span>A carregar detalhes...</span>
            </div>
          </>
        ) : match === null ? (
          <>
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-200 bg-slate-50">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-800">
                Detalhes da Partida
              </span>
              <button
                onClick={onClose}
                aria-label="Fechar"
                className="text-slate-400 hover:text-slate-700 p-1 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-12 flex flex-col items-center justify-center text-slate-500 gap-3">
              <AlertCircle className="w-8 h-8 text-amber-600" />
              <span className="text-sm font-medium">Partida não encontrada.</span>
            </div>
          </>
        ) : (
          <>
            {/* Header Hero com Foto Panorâmica do Estádio */}
            <div className="relative overflow-hidden bg-[#161b22] text-white shrink-0 min-h-[180px] sm:min-h-[200px]">
              {/* Foto Panorâmica de Fundo do Estádio (se disponível) */}
              {match.stadium?.imageUrl && (
                <img
                  src={match.stadium.imageUrl}
                  alt={match.stadium.name}
                  className="absolute inset-0 w-full h-full object-cover object-center scale-105"
                />
              )}

              {/* Camada de Sobreposição Degradê Escura para Garantir Contraste */}
              <div
                className={`absolute inset-0 ${
                  match.stadium?.imageUrl
                    ? "bg-gradient-to-b from-black/85 via-black/70 to-[#161b22]"
                    : "bg-gradient-to-b from-[#0f141c] via-[#161b22] to-[#161b22]"
                }`}
              />

              {/* Conteúdo do Header Hero */}
              <div className="relative z-10 px-4 pt-3 pb-3.5 sm:px-5 sm:pt-4 sm:pb-4 space-y-2.5 sm:space-y-3.5">
                {/* Linha Superior: Liga / Rodada e Botão Fechar */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 min-w-0">
                    {match.league?.logoUrl ? (
                      <div className="w-5 h-5 rounded-full bg-white/10 backdrop-blur-xs p-0.5 flex items-center justify-center border border-white/20 shrink-0">
                        <img
                          src={match.league.logoUrl}
                          alt={match.league.name ?? "Liga"}
                          className="w-full h-full object-contain"
                        />
                      </div>
                    ) : (
                      <Trophy className="w-4 h-4 text-emerald-400 shrink-0" />
                    )}
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-200 truncate">
                      {match.league?.name ?? "Detalhes da Partida"}
                      {match.round ? ` • ${match.round}` : ""}
                    </span>
                  </div>

                  <button
                    onClick={onClose}
                    aria-label="Fechar"
                    className="min-w-[44px] min-h-[44px] -mr-2 -my-2 flex items-center justify-center text-slate-300 hover:text-white rounded-lg hover:bg-white/10 transition-colors cursor-pointer shrink-0"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {/* Placar Central, Escudos e Nomes dos Clubes com Perfeita Simetria */}
                <div className="grid grid-cols-[1fr_auto_1fr] items-center text-center py-1 sm:py-2 px-1">
                  {/* Mandante */}
                  <div className="flex flex-col items-center justify-center gap-1.5 min-w-0">
                    {match.homeTeam?.logoUrl ? (
                      <img
                        src={match.homeTeam.logoUrl}
                        alt={match.homeTeam?.name ?? "Mandante"}
                        className="w-12 h-12 sm:w-16 sm:h-16 object-contain drop-shadow-md transition-transform hover:scale-105"
                      />
                    ) : (
                      <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-full bg-white/10 border border-white/20 flex items-center justify-center font-bold text-base sm:text-lg text-white">
                        {match.homeTeam?.name?.charAt(0) ?? "M"}
                      </div>
                    )}
                    <span className="font-bold text-xs sm:text-sm text-white drop-shadow-xs line-clamp-1 max-w-[105px] sm:max-w-[130px] text-center">
                      {match.homeTeam?.name ?? "Mandante"}
                    </span>
                  </div>

                  {/* Placar Central */}
                  <div className="flex flex-col items-center justify-center px-1.5 sm:px-4 shrink-0">
                    <div className="bg-black/40 backdrop-blur-md border border-white/20 px-3 py-1 sm:px-4 sm:py-1.5 rounded-xl font-mono font-bold text-xl sm:text-3xl text-white shadow-lg tracking-wider whitespace-nowrap">
                      {match.status === "SCHEDULED" ? "VS" : `${match.homeScore} - ${match.awayScore}`}
                    </div>
                    <span
                      className={`text-[9px] sm:text-[11px] mt-1.5 sm:mt-2 font-bold uppercase tracking-wider px-2 sm:px-3 py-0.5 rounded-full whitespace-nowrap shadow-xs ${
                        isLive
                          ? "bg-rose-500/25 text-rose-300 border border-rose-500/40 animate-pulse"
                          : match.status === "FINISHED"
                          ? "bg-emerald-500/25 text-emerald-300 border border-emerald-500/30"
                          : "bg-white/10 text-slate-300 border border-white/10"
                      }`}
                    >
                      {getStatusText()}
                    </span>
                    {match.homeHalftimeScore !== undefined && match.awayHalftimeScore !== undefined && (
                      <span className="text-[10px] text-slate-300/80 mt-1 font-medium whitespace-nowrap">
                        (HT {match.homeHalftimeScore} - {match.awayHalftimeScore})
                      </span>
                    )}
                    {match.homePenaltyScore !== undefined && match.awayPenaltyScore !== undefined && (
                      <span className="text-[10px] text-amber-300 mt-1 font-mono font-semibold whitespace-nowrap">
                        (Pên {match.homePenaltyScore} - {match.awayPenaltyScore})
                      </span>
                    )}
                  </div>

                  {/* Visitante */}
                  <div className="flex flex-col items-center justify-center gap-1.5 min-w-0">
                    {match.awayTeam?.logoUrl ? (
                      <img
                        src={match.awayTeam.logoUrl}
                        alt={match.awayTeam?.name ?? "Visitante"}
                        className="w-12 h-12 sm:w-16 sm:h-16 object-contain drop-shadow-md transition-transform hover:scale-105"
                      />
                    ) : (
                      <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-full bg-white/10 border border-white/20 flex items-center justify-center font-bold text-base sm:text-lg text-white">
                        {match.awayTeam?.name?.charAt(0) ?? "V"}
                      </div>
                    )}
                    <span className="font-bold text-xs sm:text-sm text-white drop-shadow-xs line-clamp-1 max-w-[105px] sm:max-w-[130px] text-center">
                      {match.awayTeam?.name ?? "Visitante"}
                    </span>
                  </div>
                </div>

                {/* Linha Inferior do Hero: Badges de Data/Horário e Estádio */}
                <div className="flex flex-wrap items-center justify-center gap-2 pt-2.5 border-t border-white/10 text-xs text-slate-200">
                  {match.startTime && (
                    <div className="flex items-center gap-1.5 font-medium bg-black/40 backdrop-blur-xs px-2.5 py-1 rounded-lg border border-white/10">
                      <Calendar className="w-3.5 h-3.5 text-slate-300 shrink-0" />
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
                    <div className="flex items-center gap-1.5 font-medium bg-black/40 backdrop-blur-xs px-2.5 py-1 rounded-lg border border-emerald-500/30 text-emerald-300">
                      <MapPin className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                      <span className="text-white font-medium">
                        {getStadiumDisplayLocation(match.stadium)}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Corpo do Modal: Abas e Conteúdo */}
            <div className="p-4 sm:p-6 overflow-y-auto max-h-[60vh] sm:max-h-[65vh] space-y-4 sm:space-y-5">
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
                  <div className="space-y-3">
                    {/* Cabeçalho da Régua: Mandante vs Visitante */}
                    <div className="grid grid-cols-2 text-xs font-bold text-slate-600 pb-2 border-b border-slate-200/80 px-2">
                      <div className="pr-6 text-right truncate">
                        {match.homeTeam?.name ?? "Mandante"}
                      </div>
                      <div className="pl-6 text-left truncate">
                        {match.awayTeam?.name ?? "Visitante"}
                      </div>
                    </div>

                    {/* Régua Cronológica Central */}
                    <div className="relative py-2">
                      {/* Eixo Vertical Central */}
                      <div className="absolute left-1/2 top-0 bottom-0 w-0.5 -translate-x-1/2 bg-slate-200" />

                      <div className="space-y-4">
                        {match.events.map((event, idx) => {
                          const isHomeTeam = event.teamId === match.homeTeamId;
                          const meta = getTimelineEventMeta(event);
                          const minuteStr = `${event.minute}${event.extraMinute ? `+${event.extraMinute}` : ""}'`;

                          return (
                            <div
                              key={event._id ?? idx}
                              className="relative grid grid-cols-2 items-center text-xs"
                            >
                              {/* Eixo Central: Nó do Minuto */}
                              <div className="absolute left-1/2 -translate-x-1/2 z-10 flex items-center justify-center">
                                <span className="flex items-center justify-center px-1.5 py-0.5 min-w-[34px] text-[11px] font-mono font-bold rounded-full bg-slate-800 text-white border-2 border-white shadow-xs">
                                  {minuteStr}
                                </span>
                              </div>

                              {/* Lado Esquerdo: Lances do Mandante */}
                              <div className="pr-6 text-right">
                                {isHomeTeam ? (
                                  <div className="inline-flex items-center gap-2 justify-end max-w-full">
                                    <div className="flex flex-col items-end min-w-0">
                                      <div className="font-semibold text-slate-900 truncate flex items-center gap-1.5 justify-end">
                                        {meta.badge !== "Gol" && (
                                          <span
                                            className={`text-[9px] px-1 py-0.5 rounded border font-bold uppercase tracking-wider ${meta.badgeBg}`}
                                          >
                                            {meta.badge}
                                          </span>
                                        )}
                                        <span className="truncate max-w-[105px] sm:max-w-[160px]">{event.playerName}</span>
                                      </div>
                                      {event.assistPlayerName && (
                                        <div className="text-[10px] text-slate-500">
                                          (Ass: {event.assistPlayerName})
                                        </div>
                                      )}
                                    </div>
                                    <span className="text-base shrink-0 select-none" title={meta.label}>
                                      {meta.icon}
                                    </span>
                                  </div>
                                ) : null}
                              </div>

                              {/* Lado Direito: Lances do Visitante */}
                              <div className="pl-6 text-left">
                                {!isHomeTeam ? (
                                  <div className="inline-flex items-center gap-2 justify-start max-w-full">
                                    <span className="text-base shrink-0 select-none" title={meta.label}>
                                      {meta.icon}
                                    </span>
                                    <div className="flex flex-col items-start min-w-0">
                                      <div className="font-semibold text-slate-900 truncate flex items-center gap-1.5 justify-start">
                                        <span className="truncate max-w-[105px] sm:max-w-[160px]">{event.playerName}</span>
                                        {meta.badge !== "Gol" && (
                                          <span
                                            className={`text-[9px] px-1 py-0.5 rounded border font-bold uppercase tracking-wider ${meta.badgeBg}`}
                                          >
                                            {meta.badge}
                                          </span>
                                        )}
                                      </div>
                                      {event.assistPlayerName && (
                                        <div className="text-[10px] text-slate-500">
                                          (Ass: {event.assistPlayerName})
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                ) : null}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
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
          </>
        )}
      </div>
    </div>
  );
}