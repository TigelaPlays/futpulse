import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useAction } from "convex/react";
import { api } from "../convex/_generated/api";
import type { Id } from "../convex/_generated/dataModel";
import { Activity, Clock, Trophy, Flame, RefreshCw, CalendarDays, Search, Volume2, VolumeX, Star, Upload } from "lucide-react";
import { MatchDetailsModal } from "./components/MatchDetailsModal";
import { LiveMatchClock } from "./components/LiveMatchClock";
import { GoalToastContainer, type GoalAlert } from "./components/GoalToast";
import { LeagueView } from "./components/LeagueView";
import { AssetUploadModal } from "./components/AssetUploadModal";
import { playGoalBeep } from "./lib/sound";

type FilterType = "ALL" | "LIVE" | "FINISHED" | "SCHEDULED";

export default function App() {
  const [filter, setFilter] = useState<FilterType>("ALL");
  const [selectedLeagueId, setSelectedLeagueId] = useState<Id<"leagues"> | null>(null);
  const [viewMode, setViewMode] = useState<"matches" | "standings">("matches");
  const [selectedMatchId, setSelectedMatchId] = useState<Id<"matches"> | null>(null);
  const [isAssetModalOpen, setIsAssetModalOpen] = useState(false);
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
  const matches = useQuery(api.matches.listMatches, {
    statusFilter: filter,
    leagueId: selectedLeagueId ?? undefined,
  });
  const allMatchesForCounts = useQuery(api.matches.listMatches, {
    statusFilter: "ALL",
    leagueId: selectedLeagueId ?? undefined,
  });

  const matchCounts = {
    ALL: allMatchesForCounts?.length ?? 0,
    LIVE:
      allMatchesForCounts?.filter((m) =>
        ["IN_PLAY", "PAUSED", "EXTRA_TIME", "PENALTY_SHOOTOUT"].includes(m.status)
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

  const renderMatchRow = (match: any, isFavoriteBlock = false) => {
    const isLive = ["IN_PLAY", "PAUSED", "EXTRA_TIME", "PENALTY_SHOOTOUT"].includes(
      match.status
    );

    return (
      <div
        key={isFavoriteBlock ? `fav-${match._id}` : match._id}
        onClick={() => setSelectedMatchId(match._id)}
        className="p-4 hover:bg-[#1f242c]/70 transition-colors flex flex-col md:flex-row md:items-center justify-between gap-4 cursor-pointer"
      >
        {/* Minuto / Relógio Dinâmico + Favorito */}
        <div className="flex items-center md:w-36 gap-2">
          {/* Botão de Favorito */}
          <button
            onClick={(e) => toggleFavorite(e, match._id)}
            className="p-1 text-slate-500 hover:text-amber-400 transition-colors cursor-pointer shrink-0"
            title={favoriteMatchIds.includes(match._id) ? "Remover dos favoritos" : "Favoritar partida"}
          >
            <Star
              className={`w-4 h-4 ${
                favoriteMatchIds.includes(match._id)
                  ? "fill-amber-400 text-amber-400"
                  : "text-slate-600 hover:text-slate-400"
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
            • {isFavoriteBlock ? (match.league?.name || match.round) : match.round}
          </span>
        </div>

        {/* Confronto e Placar */}
        <div className="flex-1 grid grid-cols-7 items-center max-w-lg mx-auto w-full">
          {/* Mandante */}
          <div className="col-span-3 flex items-center justify-end gap-2.5 text-right">
            <span
              className={`text-sm truncate transition-colors ${
                match.status === "FINISHED" && match.homeScore > match.awayScore
                  ? "font-bold text-slate-100"
                  : match.status === "FINISHED"
                  ? "font-medium text-slate-400"
                  : "font-semibold text-slate-200"
              }`}
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
              <div className="w-6 h-6 rounded-full bg-slate-800 border border-[#30363d] flex items-center justify-center text-[10px] font-bold text-slate-400 shrink-0">
                {match.homeTeam?.name?.charAt(0) ?? "M"}
              </div>
            )}
          </div>

          {/* Placar Central */}
          <div className="col-span-1 flex justify-center items-center">
            {match.status === "SCHEDULED" ? (
              <span className="text-[11px] text-slate-400 font-bold tracking-widest px-2 py-0.5 rounded bg-[#0d1117]/80 border border-[#30363d]/60">
                VS
              </span>
            ) : (
              <div
                className={`px-3 py-0.5 rounded-lg font-mono tabular-nums font-bold text-base flex items-center gap-1.5 shadow-inner border transition-all ${
                  isLive
                    ? "bg-[#0b1712] border-emerald-500/50 text-emerald-400 shadow-[0_0_12px_rgba(16,185,129,0.2)] ring-1 ring-emerald-500/25"
                    : "bg-[#0d1117] border-[#30363d] text-slate-200"
                }`}
              >
                <span>{match.homeScore}</span>
                <span className="text-slate-500 font-sans text-xs">-</span>
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
            <span
              className={`text-sm truncate transition-colors ${
                match.status === "FINISHED" && match.awayScore > match.homeScore
                  ? "font-bold text-slate-100"
                  : match.status === "FINISHED"
                  ? "font-medium text-slate-400"
                  : "font-semibold text-slate-200"
              }`}
            >
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
  };

  return (
    <div className="min-h-screen bg-[#080c10] text-slate-100 font-sans selection:bg-emerald-500 selection:text-slate-950">
      <MatchDetailsModal
        matchId={selectedMatchId}
        onClose={() => setSelectedMatchId(null)}
      />

      <AssetUploadModal
        isOpen={isAssetModalOpen}
        onClose={() => setIsAssetModalOpen(false)}
      />

      {/* Header Fixo com Glassmorphism Esportivo */}
      <header className="border-b border-white/[0.07] bg-[#080c10]/85 backdrop-blur-xl sticky top-0 z-40 px-4 py-3 shadow-2xl transition-all">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="bg-emerald-500/15 p-2 rounded-xl text-emerald-400 border border-emerald-500/25 shadow-[0_0_15px_rgba(16,185,129,0.18)]">
              <Activity className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight bg-gradient-to-r from-emerald-400 via-teal-200 to-white bg-clip-text text-transparent flex items-center gap-1.5">
                FutPulse
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping inline-block" />
              </h1>
              <p className="text-[11px] text-slate-400 tracking-wide font-medium">
                Live Score & Match Center
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap">
            {syncFeedback && (
              <span className="text-xs font-semibold text-emerald-400 animate-fade-in hidden sm:inline px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20">
                {syncFeedback}
              </span>
            )}

            <button
              onClick={handleManualSync}
              disabled={isSyncing}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-semibold transition-all cursor-pointer ${
                isSyncing
                  ? "bg-[#21262d] text-slate-500 border-[#30363d] cursor-not-allowed"
                  : "bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border-emerald-500/30 active:scale-95 shadow-sm"
              }`}
              title="Sincronizar jogos ao vivo agora"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? "animate-spin" : ""}`} />
              <span>{isSyncing ? "..." : "Sincronizar"}</span>
            </button>

            <button
              onClick={handleSyncDaily}
              disabled={isSyncing}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-semibold transition-all cursor-pointer ${
                isSyncing
                  ? "bg-[#21262d] text-slate-500 border-[#30363d] cursor-not-allowed"
                  : "bg-[#161b22] hover:bg-[#21262d] text-slate-300 border-[#30363d] active:scale-95"
              }`}
              title="Carregar grade do dia inteiro"
            >
              <CalendarDays className="w-3.5 h-3.5 text-slate-400" />
              <span className="hidden sm:inline">Grade de Hoje</span>
            </button>

            {/* Botão de Upload de Ativos / Escudos */}
            <button
              onClick={() => setIsAssetModalOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-semibold transition-all cursor-pointer bg-[#161b22] hover:bg-[#21262d] text-slate-300 border-[#30363d] active:scale-95"
              title="Gerenciador de Ativos e Escudos"
            >
              <Upload className="w-3.5 h-3.5 text-emerald-400" />
              <span className="hidden sm:inline">Escudos</span>
            </button>

            {/* Botão de Som */}
            <button
              onClick={() => setSoundEnabled(!soundEnabled)}
              className={`p-1.5 rounded-lg border text-xs transition-all cursor-pointer ${
                soundEnabled
                  ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30 shadow-sm"
                  : "bg-[#161b22] text-slate-500 border-[#30363d]"
              }`}
              title={soundEnabled ? "Som ativado" : "Som mutado"}
            >
              {soundEnabled ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5" />}
            </button>

            {/* Filtros de Status com Contadores Vivos */}
            <div className="flex items-center gap-1 bg-[#0b0f17]/90 p-1 rounded-xl border border-white/[0.08] text-xs font-semibold shadow-inner">
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
                        ? "bg-emerald-500 text-slate-950 font-bold shadow-md"
                        : "text-slate-400 hover:text-slate-200 hover:bg-white/[0.04]"
                    }`}
                  >
                    {hasLiveCount && (
                      <span className="relative flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
                      </span>
                    )}
                    <span>{item.label}</span>
                    <span
                      className={`text-[10px] px-1.5 py-0.2 rounded-full tabular-nums font-mono ${
                        isActive
                          ? "bg-slate-950/20 text-slate-900 font-bold"
                          : hasLiveCount
                          ? "bg-emerald-500/20 text-emerald-400 font-bold"
                          : "bg-white/[0.06] text-slate-400"
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
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-emerald-400 transition-colors" />
            <input
              ref={searchInputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar por time ou campeonato..."
              className="w-full bg-[#0d1117]/80 backdrop-blur-md border border-[#30363d]/80 focus:border-emerald-500/80 focus:ring-2 focus:ring-emerald-500/20 rounded-xl pl-9 pr-16 py-2 text-xs text-slate-200 placeholder-slate-500 focus:outline-none transition-all shadow-sm"
            />
            <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1 pointer-events-none">
              <kbd className="hidden sm:inline-block px-1.5 py-0.5 text-[10px] font-mono font-medium text-slate-400 bg-[#21262d]/60 border border-[#30363d]/60 rounded">
                Ctrl K
              </kbd>
            </div>
          </div>
        </div>

        {/* Pílulas de Navegação Rápida por Campeonato */}
        {leagues && leagues.length > 0 && (
          <div className="max-w-7xl mx-auto mt-3 pt-2.5 border-t border-white/[0.06] flex items-center gap-2 overflow-x-auto no-scrollbar pb-1">
            <button
              onClick={() => {
                setSelectedLeagueId(null);
                setViewMode("matches");
              }}
              className={`px-3 py-1 rounded-full text-xs font-medium shrink-0 transition-all cursor-pointer ${
                selectedLeagueId === null
                  ? "bg-emerald-500 text-slate-950 font-bold shadow-md"
                  : "bg-[#21262d] text-slate-400 hover:text-slate-200 border border-[#30363d]"
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
                      if (selectedLeagueId === lg._id) {
                        setSelectedLeagueId(null);
                        setViewMode("matches");
                      } else {
                        setSelectedLeagueId(lg._id);
                        setViewMode("standings");
                      }
                    }}
                    className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs shrink-0 transition-all cursor-pointer ${
                      isSelected
                        ? "bg-emerald-500 text-slate-950 font-bold shadow-md scale-105"
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

            {/* Separador se houver outras ligas */}
            {leagues.some((lg) => (lg.priority ?? 99) > 10) && (
              <span className="text-slate-600 text-xs px-1">|</span>
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
                      if (selectedLeagueId === lg._id) {
                        setSelectedLeagueId(null);
                        setViewMode("matches");
                      } else {
                        setSelectedLeagueId(lg._id);
                        setViewMode("standings");
                      }
                    }}
                    className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs shrink-0 transition-all cursor-pointer opacity-85 hover:opacity-100 ${
                      isSelected
                        ? "bg-teal-500 text-slate-950 font-bold shadow-md"
                        : "bg-[#1c2128] text-slate-400 hover:text-slate-200 border border-[#2d333b]"
                    }`}
                  >
                    {lg.logoUrl && (
                      <div className="w-3.5 h-3.5 rounded-full bg-white/90 p-0.5 flex items-center justify-center shrink-0">
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
        {/* Alternador de Visualização: Jogos vs Tabela de Classificação */}
        {selectedLeagueId && (
          <div className="flex items-center justify-between border-b border-[#30363d] pb-3">
            <div className="flex items-center gap-2 bg-[#161b22] p-1 rounded-lg border border-[#30363d]">
              <button
                onClick={() => setViewMode("standings")}
                className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all cursor-pointer ${
                  viewMode === "standings"
                    ? "bg-emerald-500 text-slate-950 font-bold shadow-sm"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                Classificação & Rodadas (Sofascore)
              </button>
              <button
                onClick={() => setViewMode("matches")}
                className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all cursor-pointer ${
                  viewMode === "matches"
                    ? "bg-emerald-500 text-slate-950 font-bold shadow-sm"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                Grade Geral de Jogos
              </button>
            </div>
            {selectedLeague && (
              <span className="text-xs text-slate-400 hidden sm:inline font-medium">
                {selectedLeague.name}
              </span>
            )}
          </div>
        )}

        {/* Bloco de Partidas Favoritas (se houver alguma favoritada e estiver no modo jogos) */}
        {viewMode === "matches" && favoriteMatches.length > 0 && (
          <div className="bg-[#161b22] border border-amber-500/30 rounded-xl overflow-hidden shadow-lg animate-fade-in">
            {/* Cabeçalho de Favoritos */}
            <div className="bg-gradient-to-r from-amber-500/10 to-[#1c2128] px-4 py-3 border-b border-amber-500/20 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <Star className="w-5 h-5 fill-amber-400 text-amber-400" />
                <span className="font-bold text-sm tracking-wide text-slate-200">
                  Partidas Favoritas
                </span>
                <span className="text-xs text-amber-400/80 font-medium">
                  • {favoriteMatches.length} {favoriteMatches.length === 1 ? "jogo fixado" : "jogos fixados"}
                </span>
              </div>
            </div>

            {/* Lista de Partidas Favoritas */}
            <div className="divide-y divide-[#21262d]">
              {favoriteMatches.map((match: any) => renderMatchRow(match, true))}
            </div>
          </div>
        )}

        {selectedLeagueId && selectedLeague && viewMode === "standings" ? (
          <LeagueView
            leagueId={selectedLeagueId}
            league={selectedLeague}
          />
        ) : matches === undefined ? (
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
                {group.matches.map((match: any) => renderMatchRow(match, false))}
              </div>
            </div>
          ))
        )}
      </main>

      {/* Container dos Alertas de Gol Flutuantes */}
      <GoalToastContainer
        alerts={goalAlerts}
        onDismiss={(id) => setGoalAlerts((cur) => cur.filter((a) => a.id !== id))}
      />
    </div>
  );
}