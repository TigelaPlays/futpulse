import { useState, useEffect, useRef, useCallback } from "react";
import { useQuery, useMutation, useAction } from "convex/react";
import { api } from "../convex/_generated/api";
import type { Id } from "../convex/_generated/dataModel";
import { Activity, Clock, Trophy, Flame, RefreshCw, CalendarDays, Search, Volume2, VolumeX, Star, Upload, ChevronLeft, ChevronRight, AlertTriangle, X } from "lucide-react";
import { MatchDetailsModal } from "./components/MatchDetailsModal";
import { LiveMatchClock } from "./components/LiveMatchClock";
import { GoalToastContainer, type GoalAlert } from "./components/GoalToast";
import { LeagueView } from "./components/LeagueView";
import { AssetUploadModal } from "./components/AssetUploadModal";
import { SimulationController } from "./components/SimulationController";
import { playGoalBeep } from "./lib/sound";

type FilterType = "ALL" | "LIVE" | "FINISHED" | "SCHEDULED";

function formatQuickDateLabel(offset: number): string {
  const d = new Date();
  d.setDate(d.getDate() + offset);
  const day = String(d.getDate()).padStart(2, "0");
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const dayMonth = `${day}/${month}`;
  if (offset === 0) return `Hoje (${dayMonth})`;
  if (offset === -1) return `Ontem (${dayMonth})`;
  if (offset === 1) return `Amanhã (${dayMonth})`;
  const weekdays = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
  return `${weekdays[d.getDay()]}, ${dayMonth}`;
}

export default function App() {
  const [filter, setFilter] = useState<FilterType>("ALL");
  const [selectedLeagueId, setSelectedLeagueId] = useState<Id<"leagues"> | null>(null);
  const [selectedDateOffset, setSelectedDateOffset] = useState<number | null>(0); // 0 = Hoje
  const [selectedMatchId, setSelectedMatchId] = useState<Id<"matches"> | null>(null);
  const [isAssetModalOpen, setIsAssetModalOpen] = useState(false);
  const [isBetaBannerVisible, setIsBetaBannerVisible] = useState<boolean>(() => {
    try {
      const dismissed = window.localStorage.getItem("futpulse_dismiss_beta_banner");
      return dismissed !== "dismissed";
    } catch {
      return true;
    }
  });
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncFeedback, setSyncFeedback] = useState<string | null>(null);
  const [goalAlerts, setGoalAlerts] = useState<GoalAlert[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [favoriteMatchIds, setFavoriteMatchIds] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem("futpulse_favorites");
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const previousScoresRef = useRef<Record<string, { home: number; away: number }>>({});

  const dismissBetaBanner = () => {
    setIsBetaBannerVisible(false);
    try {
      window.localStorage.setItem("futpulse_dismiss_beta_banner", "dismissed");
    } catch (err) {
      console.error("Erro ao salvar banner beta:", err);
    }
  };

  const toggleFavorite = (e: React.MouseEvent, matchId: string) => {
    e.stopPropagation();
    setFavoriteMatchIds((prev) => {
      const next = prev.includes(matchId)
        ? prev.filter((id) => id !== matchId)
        : [...prev, matchId];
      try {
        localStorage.setItem("futpulse_favorites", JSON.stringify(next));
      } catch (err) {
        console.error("Erro ao salvar favoritos:", err);
      }
      return next;
    });
  };

  const searchInputRef = useRef<HTMLInputElement>(null);

  // Atalho de teclado para a barra de pesquisa (Ctrl+K ou Cmd+K)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const leagues = useQuery(api.leagues.listLeagues);

  // Intervalo de tempo para o filtro por dia (00:00:00 às 23:59:59)
  const dateRange = (() => {
    if (selectedDateOffset === null) return null;
    const d = new Date();
    d.setDate(d.getDate() + selectedDateOffset);
    const start = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0).getTime();
    const end = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999).getTime();
    return { start, end };
  })();

  const matches = useQuery(api.matches.listMatches, {
    statusFilter: filter,
    leagueId: selectedLeagueId ?? undefined,
    startTimestamp: selectedLeagueId ? undefined : dateRange?.start,
    endTimestamp: selectedLeagueId ? undefined : dateRange?.end,
  });

  const getDateIsoForOffset = (offset: number) => {
    const d = new Date();
    d.setDate(d.getDate() + offset);
    return d.toISOString().split("T")[0];
  };
  const allMatchesForCounts = useQuery(api.matches.listMatches, {
    statusFilter: "ALL",
    leagueId: selectedLeagueId ?? undefined,
    startTimestamp: selectedLeagueId ? undefined : dateRange?.start,
    endTimestamp: selectedLeagueId ? undefined : dateRange?.end,
  });

  const matchCounts = {
    ALL: allMatchesForCounts?.length ?? 0,
    LIVE:
      allMatchesForCounts?.filter((m) =>
        ["IN_PLAY", "LIVE", "HALFTIME", "PAUSED", "EXTRA_TIME", "PENALTY_SHOOTOUT"].includes(m.status)
      ).length ?? 0,
    FINISHED: allMatchesForCounts?.filter((m) => m.status === "FINISHED").length ?? 0,
    SCHEDULED: allMatchesForCounts?.filter((m) => m.status === "SCHEDULED").length ?? 0,
  };

  const selectedLeague = leagues?.find((l) => l._id === selectedLeagueId);

  // Detecta quando o placar muda para disparar o Toast de Gol e o Som
  useEffect(() => {
    if (!matches) return;

    matches.forEach((match) => {
      const prev = previousScoresRef.current[match._id];

      if (prev) {
        const homeScored = match.homeScore > prev.home;
        const awayScored = match.awayScore > prev.away;

        if (homeScored || awayScored) {
          const scoringTeam = homeScored ? match.homeTeam : match.awayTeam;
          const newAlert: GoalAlert = {
            id: `${match._id}-${Date.now()}-${homeScored ? "H" : "A"}`,
            matchId: match._id,
            teamName: scoringTeam?.name ?? "Time",
            teamLogo: scoringTeam?.logoUrl,
            homeScore: match.homeScore,
            awayScore: match.awayScore,
            homeTeamName: match.homeTeam?.name ?? "Mandante",
            awayTeamName: match.awayTeam?.name ?? "Visitante",
          };

          // Toca o som de notificação se ativado
          if (soundEnabled) {
            playGoalBeep();
          }

          setGoalAlerts((current) => [...current, newAlert]);

          // Some sozinho após 4.5 segundos
          setTimeout(() => {
            setGoalAlerts((current) => current.filter((a) => a.id !== newAlert.id));
          }, 4500);
        }
      }

      // Atualiza a memória de placares
      previousScoresRef.current[match._id] = {
        home: match.homeScore,
        away: match.awayScore,
      };
    });
  }, [matches, soundEnabled]);

  const simulateGoal = useMutation(api.seed.simulateGoal);
  const syncLiveMatches = useAction(api.ingestion.syncLiveMatches);
  const syncDailyFixtures = useAction(api.ingestion.syncDailyFixtures);

  // Filtra pelo termo da barra de pesquisa
  const filteredMatches = matches?.filter((m) => {
    if (!searchQuery.trim()) return true;
    const query = searchQuery.toLowerCase();
    const home = m.homeTeam?.name?.toLowerCase() || "";
    const away = m.awayTeam?.name?.toLowerCase() || "";
    const league = m.league?.name?.toLowerCase() || "";
    return home.includes(query) || away.includes(query) || league.includes(query);
  });

  // Agrupa jogos filtrados por campeonato
  const groupedMatches = filteredMatches?.reduce((acc, match) => {
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

  // Partidas Favoritas filtradas pela busca
  const favoriteMatches = (filteredMatches || []).filter((m) =>
    favoriteMatchIds.includes(m._id)
  );

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
  const handleSyncDaily = useCallback(async (dateOverride?: string) => {
    try {
      setIsSyncing(true);
      setSyncFeedback(null);
      const targetDate = dateOverride ?? getDateIsoForOffset(selectedDateOffset ?? 0);
      const result = await syncDailyFixtures({ date: targetDate });
      if (result.success) {
        setSyncFeedback(`${result.syncedCount ?? 0} jogos de ${targetDate} sincronizados`);
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
  }, [selectedDateOffset, syncDailyFixtures]);

  useEffect(() => {
    if (selectedLeagueId !== null || selectedDateOffset === null) return;

    const targetDate = getDateIsoForOffset(selectedDateOffset);
    const timer = window.setTimeout(() => {
      void handleSyncDaily(targetDate);
    }, 150);

    return () => window.clearTimeout(timer);
  }, [selectedDateOffset, selectedLeagueId, handleSyncDaily]);

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

  const renderMatchRow = (match: any, isFavoriteBlock = false) => {
    const isLive = ["IN_PLAY", "LIVE", "HALFTIME", "PAUSED", "EXTRA_TIME", "PENALTY_SHOOTOUT"].includes(
      match.status
    );
    const isFinished = match.status === "FINISHED";
    const homeWon = isFinished && match.homeScore > match.awayScore;
    const awayWon = isFinished && match.awayScore > match.homeScore;

    const homeEvents = match.events?.filter((e: any) => e.teamId === match.homeTeamId) || [];
    const awayEvents = match.events?.filter((e: any) => e.teamId === match.awayTeamId) || [];
    const hasEvents = homeEvents.length > 0 || awayEvents.length > 0;

    return (
      <div
        key={isFavoriteBlock ? `fav-${match._id}` : match._id}
        onClick={() => setSelectedMatchId(match._id)}
        className="p-3 sm:p-3.5 hover:bg-slate-50/90 transition-colors border-b border-slate-100 last:border-b-0 cursor-pointer"
      >
        {/* Layout Desktop / Tablet (md e acima): 3 Zonas Estritamente Simétricas [140px | 1fr | 140px] */}
        <div className="hidden md:grid grid-cols-[140px_1fr_140px] items-center gap-3">
          {/* Asa Esquerda (140px): Favorito + Relógio/Status */}
          <div className="flex items-center gap-2 min-w-0 justify-start">
            <button
              onClick={(e) => toggleFavorite(e, match._id)}
              className="p-1 text-slate-400 hover:text-amber-500 transition-colors cursor-pointer shrink-0"
              title={favoriteMatchIds.includes(match._id) ? "Remover dos favoritos" : "Favoritar partida"}
            >
              <Star
                className={`w-4 h-4 ${
                  favoriteMatchIds.includes(match._id)
                    ? "fill-amber-400 text-amber-500"
                    : "text-slate-300 hover:text-slate-500"
                }`}
              />
            </button>

            {isLive ? (
              <LiveMatchClock
                initialMinute={match.minute}
                status={match.status}
                statusShort={match.statusShort}
                updatedAt={match.elapsedSecondsUpdatedAt ?? match._creationTime}
              />
            ) : match.status === "POSTPONED" ? (
              <span className="text-[11px] font-semibold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-md shadow-2xs">
                Adiado
              </span>
            ) : isFinished ? (
              <span className="text-[11px] font-semibold text-slate-600 bg-slate-100 border border-slate-200/80 px-2 py-0.5 rounded-md shadow-2xs">
                Fim
              </span>
            ) : (
              <div className="flex items-center gap-1 text-xs text-slate-600 font-medium bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200/60">
                <Clock className="w-3.5 h-3.5 text-slate-400" />
                <span>
                  {new Date(match.startTime).toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
              </div>
            )}
          </div>

          {/* Zona Central (1fr): Confronto 100% Centralizado matematicamente */}
          <div className="flex items-center justify-center w-full max-w-xl mx-auto min-w-0 px-2">
            {/* Mandante (50% do espaço, alinhado à direita) */}
            <div className="flex-1 flex items-center justify-end gap-2.5 min-w-0 text-right">
              <span
                className={`text-sm truncate transition-colors ${
                  homeWon
                    ? "font-bold text-slate-950"
                    : isFinished
                    ? "font-normal text-slate-500"
                    : "font-semibold text-slate-800"
                }`}
                title={match.homeTeam?.name}
              >
                {match.homeTeam?.name}
              </span>
              {match.homeTeam?.logoUrl ? (
                <img
                  src={match.homeTeam.logoUrl}
                  alt={match.homeTeam?.name ?? "Mandante"}
                  className="w-6 h-6 object-contain shrink-0"
                />
              ) : (
                <div className="w-6 h-6 rounded-full bg-slate-100 border border-slate-300 flex items-center justify-center text-[10px] font-bold text-slate-600 shrink-0">
                  {match.homeTeam?.name?.charAt(0) ?? "M"}
                </div>
              )}
            </div>

            {/* Placar Central (Largura Fixa de 80px para ancorar a simetria de todas as linhas) */}
            <div className="w-20 shrink-0 flex justify-center items-center px-1">
              {match.status === "SCHEDULED" ? (
                <span className="text-[11px] text-slate-500 font-bold tracking-widest px-2.5 py-0.5 rounded-md bg-slate-100 border border-slate-200">
                  VS
                </span>
              ) : (
                <div
                  className={`w-16 py-0.5 rounded-lg font-mono tabular-nums font-bold text-sm flex items-center justify-center gap-1 shadow-2xs border transition-all ${
                    isLive
                      ? "bg-emerald-600 border-emerald-700 text-white shadow-xs"
                      : "bg-slate-100 border-slate-200 text-slate-900"
                  }`}
                >
                  <span>{match.homeScore}</span>
                  <span className={`${isLive ? "text-emerald-200" : "text-slate-400"} font-sans text-xs`}>-</span>
                  <span>{match.awayScore}</span>
                </div>
              )}
            </div>

            {/* Visitante (50% do espaço, alinhado à esquerda) */}
            <div className="flex-1 flex items-center justify-start gap-2.5 min-w-0 text-left">
              {match.awayTeam?.logoUrl ? (
                <img
                  src={match.awayTeam.logoUrl}
                  alt={match.awayTeam?.name ?? "Visitante"}
                  className="w-6 h-6 object-contain shrink-0"
                />
              ) : (
                <div className="w-6 h-6 rounded-full bg-slate-100 border border-slate-300 flex items-center justify-center text-[10px] font-bold text-slate-600 shrink-0">
                  {match.awayTeam?.name?.charAt(0) ?? "V"}
                </div>
              )}
              <span
                className={`text-sm truncate transition-colors ${
                  awayWon
                    ? "font-bold text-slate-950"
                    : isFinished
                    ? "font-normal text-slate-500"
                    : "font-semibold text-slate-800"
                }`}
                title={match.awayTeam?.name}
              >
                {match.awayTeam?.name}
              </span>
            </div>
          </div>

          {/* Asa Direita (140px): Ações ao vivo ou Rótulo de Rodada para manter equilíbrio */}
          <div className="flex items-center justify-end gap-1.5 min-w-0">
            {isLive ? (
              <div className="flex items-center gap-1">
                <button
                  onClick={(e) =>
                    handleSimulateGoal(e, match._id, true, match.homeTeam?.name ?? "Mandante")
                  }
                  className="text-[11px] bg-slate-100 hover:bg-emerald-600 hover:text-white px-2 py-0.5 rounded border border-slate-200 text-slate-700 transition-colors flex items-center gap-0.5 cursor-pointer active:scale-95 shadow-2xs font-medium"
                  title={`Adicionar gol para ${match.homeTeam?.name}`}
                >
                  <Flame className="w-3 h-3 text-emerald-600 group-hover:text-white" /> +1 {match.homeTeam?.code || "M"}
                </button>
                <button
                  onClick={(e) =>
                    handleSimulateGoal(e, match._id, false, match.awayTeam?.name ?? "Visitante")
                  }
                  className="text-[11px] bg-slate-100 hover:bg-emerald-600 hover:text-white px-2 py-0.5 rounded border border-slate-200 text-slate-700 transition-colors flex items-center gap-0.5 cursor-pointer active:scale-95 shadow-2xs font-medium"
                  title={`Adicionar gol para ${match.awayTeam?.name}`}
                >
                  <Flame className="w-3 h-3 text-emerald-600 group-hover:text-white" /> +1 {match.awayTeam?.code || "V"}
                </button>
              </div>
            ) : (
              <span className="text-[11px] font-medium text-slate-500 bg-slate-100/90 px-2 py-0.5 rounded border border-slate-200/70 truncate max-w-[130px]">
                {isFavoriteBlock ? (match.league?.name || match.round) : match.round}
              </span>
            )}
          </div>
        </div>

        {/* Eventos da Partida (Gols e Cartões) no Desktop: Lado a Lado preservando os times */}
        {hasEvents && (
          <div className="hidden md:grid grid-cols-[140px_1fr_140px] items-start gap-3 mt-2 pt-2 border-t border-slate-100 text-xs">
            <div />
            <div className="w-full max-w-xl mx-auto px-2 grid grid-cols-2 gap-6">
              {/* Lado do Mandante (Alinhado à direita) */}
              <div className="space-y-1 text-right">
                {homeEvents.map((ev: any, idx: number) => {
                  const isGoal = ev.type === "GOAL";
                  const isRed = ev.type === "RED_CARD";
                  const isPenalty = ev.detail?.toLowerCase().includes("pen");
                  return (
                    <div
                      key={idx}
                      className="flex items-center justify-end gap-1.5 text-[11px] text-slate-600"
                    >
                      <span className="font-medium text-slate-800 truncate">
                        {ev.playerName}
                        {isPenalty && (
                          <span className="text-slate-400 text-[10px]"> (P)</span>
                        )}
                      </span>
                      <span className="text-slate-400 text-[10px] font-mono">
                        {ev.minute}
                        {ev.extraMinute ? `+${ev.extraMinute}` : ""}′
                      </span>
                      <span className="text-xs shrink-0 select-none">
                        {isGoal ? "⚽" : isRed ? "🟥" : "🟨"}
                      </span>
                    </div>
                  );
                })}
              </div>

              {/* Lado do Visitante (Alinhado à esquerda) */}
              <div className="space-y-1 text-left">
                {awayEvents.map((ev: any, idx: number) => {
                  const isGoal = ev.type === "GOAL";
                  const isRed = ev.type === "RED_CARD";
                  const isPenalty = ev.detail?.toLowerCase().includes("pen");
                  return (
                    <div
                      key={idx}
                      className="flex items-center justify-start gap-1.5 text-[11px] text-slate-600"
                    >
                      <span className="text-xs shrink-0 select-none">
                        {isGoal ? "⚽" : isRed ? "🟥" : "🟨"}
                      </span>
                      <span className="text-slate-400 text-[10px] font-mono">
                        {ev.minute}
                        {ev.extraMinute ? `+${ev.extraMinute}` : ""}′
                      </span>
                      <span className="font-medium text-slate-800 truncate">
                        {ev.playerName}
                        {isPenalty && (
                          <span className="text-slate-400 text-[10px]"> (P)</span>
                        )}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
            <div />
          </div>
        )}

        {/* Layout Mobile (< md): Cartão Simétrico Responsivo */}
        <div className="md:hidden space-y-2">
          {/* Topo: Status + Favorito + Rodada */}
          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-1.5">
              <button
                onClick={(e) => toggleFavorite(e, match._id)}
                className="p-1 text-slate-400 hover:text-amber-500 transition-colors cursor-pointer"
              >
                <Star
                  className={`w-3.5 h-3.5 ${
                    favoriteMatchIds.includes(match._id)
                      ? "fill-amber-400 text-amber-500"
                      : "text-slate-300"
                  }`}
                />
              </button>
              {isLive ? (
                <LiveMatchClock
                  initialMinute={match.minute}
                  status={match.status}
                  statusShort={match.statusShort}
                  updatedAt={match.elapsedSecondsUpdatedAt ?? match._creationTime}
                />
              ) : isFinished ? (
                <span className="text-[10px] font-semibold text-slate-600 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">
                  Fim
                </span>
              ) : (
                <span className="text-[10px] text-slate-500 font-medium">
                  {new Date(match.startTime).toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
              )}
            </div>
            <span className="text-[10px] text-slate-500 truncate max-w-[150px]">
              {isFavoriteBlock ? (match.league?.name || match.round) : match.round}
            </span>
          </div>

          {/* Confronto Simétrico em 3 Colunas */}
          <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
            {/* Mandante */}
            <div className="flex items-center justify-end gap-1.5 min-w-0 text-right">
              <span
                className={`text-xs truncate max-w-[95px] sm:max-w-[140px] ${
                  homeWon
                    ? "font-bold text-slate-950"
                    : isFinished
                    ? "font-normal text-slate-500"
                    : "font-semibold text-slate-800"
                }`}
              >
                {match.homeTeam?.name}
              </span>
              {match.homeTeam?.logoUrl ? (
                <img
                  src={match.homeTeam.logoUrl}
                  alt=""
                  className="w-5 h-5 object-contain shrink-0"
                />
              ) : (
                <div className="w-5 h-5 rounded-full bg-slate-100 border border-slate-300 flex items-center justify-center text-[9px] font-bold text-slate-600 shrink-0">
                  {match.homeTeam?.name?.charAt(0) ?? "M"}
                </div>
              )}
            </div>

            {/* Placar */}
            <div className="flex justify-center shrink-0">
              {match.status === "SCHEDULED" ? (
                <span className="text-[10px] text-slate-500 font-bold px-1.5 py-0.5 rounded bg-slate-100 border border-slate-200">
                  VS
                </span>
              ) : (
                <div
                  className={`px-2 py-0.5 rounded font-mono font-bold text-xs flex items-center gap-1 ${
                    isLive
                      ? "bg-emerald-600 text-white"
                      : "bg-slate-100 text-slate-900 border border-slate-200"
                  }`}
                >
                  <span>{match.homeScore}</span>
                  <span className="text-slate-400 text-[10px]">-</span>
                  <span>{match.awayScore}</span>
                </div>
              )}
            </div>

            {/* Visitante */}
            <div className="flex items-center justify-start gap-1.5 min-w-0 text-left">
              {match.awayTeam?.logoUrl ? (
                <img
                  src={match.awayTeam.logoUrl}
                  alt=""
                  className="w-5 h-5 object-contain shrink-0"
                />
              ) : (
                <div className="w-5 h-5 rounded-full bg-slate-100 border border-slate-300 flex items-center justify-center text-[9px] font-bold text-slate-600 shrink-0">
                  {match.awayTeam?.name?.charAt(0) ?? "V"}
                </div>
              )}
              <span
                className={`text-xs truncate max-w-[95px] sm:max-w-[140px] ${
                  awayWon
                    ? "font-bold text-slate-950"
                    : isFinished
                    ? "font-normal text-slate-500"
                    : "font-semibold text-slate-800"
                }`}
              >
                {match.awayTeam?.name}
              </span>
            </div>
          </div>

          {/* Eventos da Partida Mobile: Lado a Lado preservando os times */}
          {hasEvents && (
            <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-100 text-[10px]">
              {/* Mandante */}
              <div className="space-y-1 text-right">
                {homeEvents.map((ev: any, idx: number) => {
                  const isGoal = ev.type === "GOAL";
                  const isRed = ev.type === "RED_CARD";
                  const isPenalty = ev.detail?.toLowerCase().includes("pen");
                  return (
                    <div
                      key={idx}
                      className="flex items-center justify-end gap-1 text-slate-600 truncate"
                    >
                      <span className="font-medium text-slate-800 truncate">
                        {ev.playerName}
                        {isPenalty && " (P)"}
                      </span>
                      <span className="text-slate-400 text-[9px] font-mono">
                        {ev.minute}′
                      </span>
                      <span className="text-[11px] select-none">
                        {isGoal ? "⚽" : isRed ? "🟥" : "🟨"}
                      </span>
                    </div>
                  );
                })}
              </div>

              {/* Visitante */}
              <div className="space-y-1 text-left">
                {awayEvents.map((ev: any, idx: number) => {
                  const isGoal = ev.type === "GOAL";
                  const isRed = ev.type === "RED_CARD";
                  const isPenalty = ev.detail?.toLowerCase().includes("pen");
                  return (
                    <div
                      key={idx}
                      className="flex items-center justify-start gap-1 text-slate-600 truncate"
                    >
                      <span className="text-[11px] select-none">
                        {isGoal ? "⚽" : isRed ? "🟥" : "🟨"}
                      </span>
                      <span className="text-slate-400 text-[9px] font-mono">
                        {ev.minute}′
                      </span>
                      <span className="font-medium text-slate-800 truncate">
                        {ev.playerName}
                        {isPenalty && " (P)"}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Botões de Simulação Mobile */}
          {isLive && (
            <div className="flex items-center justify-center gap-2 pt-1.5 border-t border-slate-100">
              <button
                onClick={(e) =>
                  handleSimulateGoal(e, match._id, true, match.homeTeam?.name ?? "Mandante")
                }
                className="text-[10px] bg-slate-100 hover:bg-emerald-600 hover:text-white px-2 py-0.5 rounded border border-slate-200 text-slate-700 transition-colors flex items-center gap-1 cursor-pointer font-medium"
              >
                <Flame className="w-3 h-3 text-emerald-600" /> +1 {match.homeTeam?.code || "M"}
              </button>
              <button
                onClick={(e) =>
                  handleSimulateGoal(e, match._id, false, match.awayTeam?.name ?? "Visitante")
                }
                className="text-[10px] bg-slate-100 hover:bg-emerald-600 hover:text-white px-2 py-0.5 rounded border border-slate-200 text-slate-700 transition-colors flex items-center gap-1 cursor-pointer font-medium"
              >
                <Flame className="w-3 h-3 text-emerald-600" /> +1 {match.awayTeam?.code || "V"}
              </button>
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-[#f1f5f9] text-slate-900 font-sans selection:bg-emerald-500 selection:text-white">
      {isBetaBannerVisible && (
        <div className="border-b border-amber-500/30 bg-slate-950/90 text-amber-200 backdrop-blur-md">
          <div className="mx-auto flex max-w-7xl items-center gap-3 px-4 py-2.5">
            <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
              <div className="flex h-6 w-6 items-center justify-center rounded-full border border-amber-400/40 bg-amber-500/10 shadow-[0_0_16px_rgba(251,191,36,0.18)]">
                <AlertTriangle className="h-3.5 w-3.5 text-amber-300 animate-pulse" />
              </div>

              <span className="inline-flex items-center rounded-full border border-amber-400/30 bg-amber-500/10 px-2.5 py-0.5 text-[9px] font-black tracking-[0.18em] text-amber-200 uppercase sm:text-[10px]">
                [VERSÃO BETA • EM DESENVOLVIMENTO]
              </span>

              <p className="text-[10px] leading-relaxed text-amber-100/80 sm:text-[11px]">
                FutPulse Match Center — Projeto experimental acadêmico. Novas ligas, dados em tempo real e chaveamentos sendo integrados.
              </p>
            </div>

            <button
              type="button"
              onClick={dismissBetaBanner}
              aria-label="Fechar aviso beta"
              className="ml-auto inline-flex h-7 w-7 items-center justify-center rounded-full border border-amber-400/30 bg-amber-500/10 text-amber-200 transition-colors hover:bg-amber-500/15 hover:text-amber-100 focus:outline-none focus:ring-2 focus:ring-amber-400/40"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      )}

      <MatchDetailsModal
        matchId={selectedMatchId}
        onClose={() => setSelectedMatchId(null)}
      />

      <AssetUploadModal
        isOpen={isAssetModalOpen}
        onClose={() => setIsAssetModalOpen(false)}
      />

      {/* Header Fixo com Efeito Vidro Claro Esportivo */}
      <header className="border-b border-slate-200/90 bg-white/95 backdrop-blur-md sticky top-0 z-40 px-4 py-3 shadow-xs transition-all">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="bg-emerald-50 p-2 rounded-xl text-emerald-600 border border-emerald-200 shadow-2xs">
              <Activity className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <h1 className="text-xl font-extrabold tracking-tight text-slate-900 flex items-center gap-1.5">
                FutPulse
                <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block animate-ping" />
              </h1>
              <p className="text-[11px] text-slate-500 tracking-wide font-medium">
                Live Score & Match Center
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap">
            {syncFeedback && (
              <span className="text-xs font-semibold text-emerald-700 animate-fade-in hidden sm:inline px-2.5 py-0.5 rounded bg-emerald-50 border border-emerald-200 shadow-2xs">
                {syncFeedback}
              </span>
            )}

            <button
              onClick={handleManualSync}
              disabled={isSyncing}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-semibold transition-all cursor-pointer ${
                isSyncing
                  ? "bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed"
                  : "bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border-emerald-200 active:scale-95 shadow-2xs"
              }`}
              title="Sincronizar jogos ao vivo agora"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? "animate-spin" : ""}`} />
              <span>{isSyncing ? "..." : "Sincronizar"}</span>
            </button>

            <button
              onClick={() => {
                setSelectedLeagueId(null);
                setSelectedDateOffset(0);
                setFilter("ALL");
                void handleSyncDaily(getDateIsoForOffset(0));
              }}
              disabled={isSyncing}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-semibold transition-all cursor-pointer ${
                selectedLeagueId === null && selectedDateOffset === 0
                  ? "bg-emerald-50 text-emerald-700 border-emerald-300 font-bold shadow-2xs"
                  : "bg-white hover:bg-slate-50 text-slate-700 border-slate-200 active:scale-95 shadow-2xs"
              }`}
              title="Exibir os jogos de hoje e sincronizar grade"
            >
              <CalendarDays className="w-3.5 h-3.5 text-emerald-600" />
              <span className="hidden sm:inline">Grade de Hoje</span>
            </button>

            {/* Botão de Upload de Ativos / Escudos */}
            <button
              onClick={() => setIsAssetModalOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-semibold transition-all cursor-pointer bg-white hover:bg-slate-50 text-slate-700 border-slate-200 active:scale-95 shadow-2xs"
              title="Gerenciador de Ativos e Escudos"
            >
              <Upload className="w-3.5 h-3.5 text-emerald-600" />
              <span className="hidden sm:inline">Escudos</span>
            </button>

            {/* Botão de Som */}
            <button
              onClick={() => setSoundEnabled(!soundEnabled)}
              className={`p-1.5 rounded-lg border text-xs transition-all cursor-pointer shadow-2xs ${
                soundEnabled
                  ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                  : "bg-white text-slate-400 border-slate-200"
              }`}
              title={soundEnabled ? "Som ativado" : "Som mutado"}
            >
              {soundEnabled ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5" />}
            </button>

            {/* Filtros de Status com Contadores Vivos */}
            <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs font-semibold shadow-inner">
              {(
                [
                  { id: "ALL", label: "Todos", count: matchCounts.ALL },
                  { id: "LIVE", label: "Ao Vivo", count: matchCounts.LIVE },
                  { id: "FINISHED", label: "Fim", count: matchCounts.FINISHED },
                  { id: "SCHEDULED", label: "Grade", count: matchCounts.SCHEDULED },
                ] as const
              ).map((item) => {
                const isActive = filter === item.id;
                const hasLiveCount = item.id === "LIVE" && item.count > 0;

                return (
                  <button
                    key={item.id}
                    onClick={() => setFilter(item.id)}
                    className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                      isActive
                        ? "bg-emerald-600 text-white font-bold shadow-xs"
                        : "text-slate-600 hover:text-slate-900 hover:bg-white/80"
                    }`}
                  >
                    {hasLiveCount && (
                      <span className="relative flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-600" />
                      </span>
                    )}
                    <span>{item.label}</span>
                    <span
                      className={`text-[10px] px-1.5 py-0.2 rounded-full tabular-nums font-mono ${
                        isActive
                          ? "bg-white/25 text-white font-bold"
                          : hasLiveCount
                          ? "bg-emerald-100 text-emerald-800 font-bold"
                          : "bg-slate-200/80 text-slate-600"
                      }`}
                    >
                      {item.count}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Barra de Pesquisa Rápida com Atalho Ctrl+K */}
        <div className="max-w-7xl mx-auto mt-2.5">
          <div className="relative group">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-emerald-600 transition-colors" />
            <input
              ref={searchInputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar por time ou campeonato..."
              className="w-full bg-white border border-slate-200/90 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 rounded-xl pl-9 pr-16 py-2 text-xs text-slate-800 placeholder-slate-400 focus:outline-none transition-all shadow-2xs"
            />
            <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1 pointer-events-none">
              <kbd className="hidden sm:inline-block px-1.5 py-0.5 text-[10px] font-mono font-medium text-slate-400 bg-slate-100 border border-slate-200 rounded">
                Ctrl K
              </kbd>
            </div>
          </div>
        </div>

        {/* Pílulas de Navegação Rápida por Campeonato */}
        {leagues && leagues.length > 0 && (
          <div className="max-w-7xl mx-auto mt-3 pt-2.5 border-t border-slate-200/80 flex items-center gap-2 overflow-x-auto scrollbar-none touch-pan-x pb-1">
            <button
              onClick={() => setSelectedLeagueId(null)}
              className={`px-3 py-1 rounded-full text-xs font-medium shrink-0 transition-all cursor-pointer ${
                selectedLeagueId === null
                  ? "bg-emerald-600 text-white font-bold shadow-xs"
                  : "bg-white text-slate-700 hover:text-slate-900 border border-slate-200 shadow-2xs"
              }`}
            >
              Todas as Ligas
            </button>

            {/* Ligas Principais (Prioridade <= 10) */}
            {leagues
              .filter((lg) => (lg.priority ?? 99) <= 10)
              .map((lg) => {
                const isSelected = selectedLeagueId === lg._id;
                return (
                  <button
                    key={lg._id}
                    onClick={() => {
                      setSelectedLeagueId(isSelected ? null : lg._id);
                    }}
                    className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs shrink-0 transition-all cursor-pointer ${
                      isSelected
                        ? "bg-emerald-600 text-white font-bold shadow-xs scale-105"
                        : "bg-white text-slate-700 hover:text-slate-900 border border-slate-200 shadow-2xs"
                    }`}
                  >
                    {lg.logoUrl && (
                      <div className="w-4 h-4 rounded-full bg-slate-50 p-0.5 flex items-center justify-center shrink-0 border border-slate-100">
                        <img src={lg.logoUrl} alt="" className="w-full h-full object-contain" />
                      </div>
                    )}
                    <span>{lg.name}</span>
                  </button>
                );
              })}

            {/* Separador se houver outras ligas */}
            {leagues.some((lg) => (lg.priority ?? 99) > 10) && (
              <span className="text-slate-400 text-xs px-1">|</span>
            )}

            {/* Ligas Secundárias */}
            {leagues
              .filter((lg) => (lg.priority ?? 99) > 10)
              .map((lg) => {
                const isSelected = selectedLeagueId === lg._id;
                return (
                  <button
                    key={lg._id}
                    onClick={() => {
                      setSelectedLeagueId(isSelected ? null : lg._id);
                    }}
                    className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs shrink-0 transition-all cursor-pointer ${
                      isSelected
                        ? "bg-teal-600 text-white font-bold shadow-xs"
                        : "bg-slate-50 text-slate-600 hover:text-slate-900 border border-slate-200"
                    }`}
                  >
                    {lg.logoUrl && (
                      <div className="w-3.5 h-3.5 rounded-full bg-slate-50 p-0.5 flex items-center justify-center shrink-0 border border-slate-100">
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
      <main className="max-w-7xl mx-auto p-4 sm:p-6 space-y-6">
        {selectedLeagueId && selectedLeague ? (
          <LeagueView
            leagueId={selectedLeagueId}
            league={selectedLeague}
            onSelectMatch={setSelectedMatchId}
          />
        ) : (
          <div className="space-y-5">
            {/* Seletor Sofascore de Datas para a Grade Geral */}
            <div className="flex flex-wrap items-center justify-between gap-2.5 sm:gap-3 bg-white p-2.5 sm:p-3 rounded-xl border border-slate-200 shadow-xs">
              <div className="flex items-center gap-1 sm:gap-1.5 overflow-x-auto scrollbar-none touch-pan-x py-0.5 max-w-full">
                <button
                  onClick={() => {
                    setSelectedDateOffset((prev) => (prev ?? 0) - 1);
                  }}
                  className="p-1 sm:p-1.5 rounded-lg border border-slate-200 hover:bg-slate-100 text-slate-600 transition-colors cursor-pointer shrink-0"
                  title="Dia anterior"
                  aria-label="Dia anterior"
                >
                  <ChevronLeft className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                </button>

                {[-1, 0, 1].map((offset) => {
                  const isSelected = selectedDateOffset === offset;
                  return (
                    <button
                      key={offset}
                      onClick={() => {
                        setSelectedDateOffset(offset);
                      }}
                      className={`px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-lg text-[11px] sm:text-xs font-semibold whitespace-nowrap shrink-0 transition-all cursor-pointer ${
                        isSelected
                          ? "bg-emerald-600 text-white font-bold shadow-xs scale-102"
                          : "bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200"
                      }`}
                    >
                      {formatQuickDateLabel(offset)}
                    </button>
                  );
                })}

                <button
                  onClick={() => setSelectedDateOffset((prev) => (prev ?? 0) + 1)}
                  className="p-1 sm:p-1.5 rounded-lg border border-slate-200 hover:bg-slate-100 text-slate-600 transition-colors cursor-pointer shrink-0"
                  title="Próximo dia"
                  aria-label="Próximo dia"
                >
                  <ChevronRight className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                </button>
              </div>

              {/* Botão de Rodada Ativa */}
              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={() => setSelectedDateOffset(null)}
                  className={`px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-lg text-[11px] sm:text-xs font-semibold whitespace-nowrap shrink-0 transition-all cursor-pointer ${
                    selectedDateOffset === null
                      ? "bg-slate-900 text-white font-bold shadow-xs"
                      : "bg-slate-100 hover:bg-slate-200/80 text-slate-600 border border-slate-200"
                  }`}
                  title="Exibir partidas da rodada atual ativa de cada liga"
                >
                  Rodada Atual Ativa
                </button>
              </div>
            </div>

            {/* Bloco de Partidas Favoritas (se houver alguma favoritada) */}
            {favoriteMatches.length > 0 && (
              <div className="bg-white border border-amber-300/80 rounded-xl overflow-hidden shadow-xs animate-fade-in">
                <div className="bg-gradient-to-r from-amber-50 to-amber-100/30 px-4 py-3 border-b border-amber-200/80 flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <Star className="w-5 h-5 fill-amber-400 text-amber-500" />
                    <span className="font-bold text-sm tracking-wide text-amber-950">
                      Partidas Favoritas
                    </span>
                    <span className="text-xs text-amber-700 font-medium">
                      • {favoriteMatches.length} {favoriteMatches.length === 1 ? "jogo fixado" : "jogos fixados"}
                    </span>
                  </div>
                </div>

                <div className="divide-y divide-slate-100">
                  {favoriteMatches.map((match: any) => renderMatchRow(match, true))}
                </div>
              </div>
            )}

            {/* Lista Agrupada por Campeonato ou Empty State */}
            {matches === undefined ? (
              <div className="flex justify-center items-center py-20 text-slate-500 gap-2">
                <div className="w-5 h-5 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin" />
                <span>Sincronizando partidas...</span>
              </div>
            ) : matches.length === 0 ? (
              <div className="text-center py-16 px-4 bg-white border border-slate-200 rounded-xl text-slate-500 shadow-xs space-y-2">
                <CalendarDays className="w-8 h-8 text-slate-400 mx-auto" />
                <p className="font-semibold text-slate-800 text-sm">
                  {selectedDateOffset === 0
                    ? "Nenhum jogo agendado para hoje"
                    : selectedDateOffset !== null
                    ? `Nenhum jogo agendado para ${formatQuickDateLabel(selectedDateOffset)}`
                    : "Nenhuma partida encontrada neste filtro"}
                </p>
                <p className="text-xs text-slate-500">
                  {selectedDateOffset !== null ? (
                    <button
                      onClick={() => setSelectedDateOffset(null)}
                      className="text-emerald-600 hover:underline font-medium cursor-pointer"
                    >
                      Clique aqui para ver a rodada atual ativa de cada campeonato
                    </button>
                  ) : (
                    "Tente alternar o filtro de status ou pesquisar por outro termo."
                  )}
                </p>
              </div>
            ) : (
              Object.entries(groupedMatches || {}).map(([leagueName, group]) => (
                <div
                  key={leagueName}
                  className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs"
                >
                  {/* Cabeçalho da Liga */}
                  <div className="bg-slate-50/90 px-4 py-3 border-b border-slate-200 flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      {group.league?.logoUrl ? (
                        <div className="w-6 h-6 rounded-full bg-white p-0.5 flex items-center justify-center shadow-2xs border border-slate-200 shrink-0">
                          <img
                            src={group.league.logoUrl}
                            alt={leagueName}
                            className="w-full h-full object-contain"
                          />
                        </div>
                      ) : (
                        <Trophy className="w-5 h-5 text-emerald-600" />
                      )}
                      <span className="font-bold text-sm tracking-wide text-slate-900">
                        {leagueName}
                      </span>
                      <span className="text-xs text-slate-500 font-normal">
                        • {group.league?.country}
                      </span>
                    </div>
                    <span className="text-[11px] uppercase tracking-wider px-2 py-0.5 rounded bg-slate-200/80 text-slate-700 border border-slate-300/60 font-medium">
                      {group.league?.type === "cup" ? "Mata-mata" : "Pontos Corridos"}
                    </span>
                  </div>

                  {/* Lista de Partidas */}
                  <div className="divide-y divide-slate-100">
                    {group.matches.map((match: any) => renderMatchRow(match, false))}
                  </div>
                </div>
              ))
            )}
          </div>
        )}
  </main>

      {/* Container dos Alertas de Gol Flutuantes */}
      <GoalToastContainer
        alerts={goalAlerts}
        onDismiss={(id) => setGoalAlerts((cur) => cur.filter((a) => a.id !== id))}
      />

      {/* Painel Flutuante do Motor de Simulação */}
      <SimulationController
        initialMatchId={selectedMatchId}
        onSelectMatch={(id) => setSelectedMatchId(id)}
      />
    </div>
  );
}