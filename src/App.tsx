import { useState, useEffect, useRef, useMemo } from "react";
import { useQuery, useAction } from "convex/react";
import { api } from "../convex/_generated/api";
import type { Id } from "../convex/_generated/dataModel";
import { CalendarDays, Star, Trophy } from "lucide-react";

// Componentes Modulares Refatorados
import { Header } from "./components/Header";
import { DateCarousel } from "./components/DateCarousel";
import { formatQuickDateLabel } from "./utils/date";
import { type FilterType } from "./components/StatusFilterBar";
import { MatchRow } from "./components/MatchRow";
import { BetaBanner } from "./components/BetaBanner";
import { GlobalSearchModal } from "./components/GlobalSearchModal";

// Modais e Recursos Existentes
import { MatchDetailsModal } from "./components/MatchDetailsModal";
import { AssetUploadModal } from "./components/AssetUploadModal";
import { SimulationController } from "./components/SimulationController";
import { GoalToastContainer, type GoalAlert } from "./components/GoalToast";
import { LeagueView } from "./components/LeagueView";
import { playGoalBeep } from "./lib/sound";
import { getNationFlagUrl } from "./utils/flagsNationsAssets";

export default function App() {
  // Estado de Filtros e Seleção
  const [filter, setFilter] = useState<FilterType>("ALL");
  const [selectedLeagueId, setSelectedLeagueId] = useState<Id<"leagues"> | null>(null);
  const [selectedDateOffset, setSelectedDateOffset] = useState<number | null>(0); // 0 = Hoje
  const [selectedMatchId, setSelectedMatchId] = useState<Id<"matches"> | null>(null);

  // Modais e Gavetas
  const [isAssetModalOpen, setIsAssetModalOpen] = useState(false);
  const [isSimDrawerOpen, setIsSimDrawerOpen] = useState(false);
  const [isSearchModalOpen, setIsSearchModalOpen] = useState(false);

  // Notificações e Preferências
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
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Fecha o banner de aviso beta
  const dismissBetaBanner = () => {
    setIsBetaBannerVisible(false);
    try {
      window.localStorage.setItem("futpulse_dismiss_beta_banner", "dismissed");
    } catch (err) {
      console.error("Erro ao salvar banner beta:", err);
    }
  };

  // Alterna partida favorita
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

  // Atalho de teclado para a barra de pesquisa rápida (Ctrl+K ou Cmd+K)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setIsSearchModalOpen(true);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Queries Centrais do Convex
  const leagues = useQuery(api.leagues.listLeagues) ?? [];

  // Intervalo de tempo para o filtro por dia (00:00:00 às 23:59:59)
  const dateRange = useMemo(() => {
    if (selectedDateOffset === null) return null;
    const d = new Date();
    d.setDate(d.getDate() + selectedDateOffset);
    const start = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0).getTime();
    const end = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999).getTime();
    return { start, end };
  }, [selectedDateOffset]);

  const matches = useQuery(api.matches.listMatches, {
    statusFilter: filter,
    leagueId: selectedLeagueId ?? undefined,
    startTimestamp: selectedLeagueId ? undefined : dateRange?.start,
    endTimestamp: selectedLeagueId ? undefined : dateRange?.end,
  });

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
        ["IN_PLAY", "LIVE", "HALFTIME", "PAUSED", "EXTRA_TIME", "PENALTY_SHOOTOUT"].includes(
          m.status
        )
      ).length ?? 0,
    FINISHED: allMatchesForCounts?.filter((m) => m.status === "FINISHED").length ?? 0,
    SCHEDULED: allMatchesForCounts?.filter((m) => m.status === "SCHEDULED").length ?? 0,
  };

  const selectedLeague = leagues.find((l) => l._id === selectedLeagueId);

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
            teamLogo: scoringTeam?.name
              ? getNationFlagUrl(scoringTeam.name, scoringTeam.logoUrl)
              : scoringTeam?.logoUrl,
            homeScore: match.homeScore,
            awayScore: match.awayScore,
            homeTeamName: match.homeTeam?.name ?? "Mandante",
            awayTeamName: match.awayTeam?.name ?? "Visitante",
          };

          if (soundEnabled) {
            playGoalBeep();
          }

          setGoalAlerts((current) => [...current, newAlert]);

          setTimeout(() => {
            setGoalAlerts((current) => current.filter((a) => a.id !== newAlert.id));
          }, 4500);
        }
      }

      previousScoresRef.current[match._id] = {
        home: match.homeScore,
        away: match.awayScore,
      };
    });
  }, [matches, soundEnabled]);

  const syncLiveScores = useAction(api.syncLiveScore.syncLiveScores);

  // Sincronização manual via API externa
  const handleManualSync = async () => {
    setIsSyncing(true);
    setSyncFeedback(null);
    try {
      const res = await syncLiveScores({
        leagueExternalId: selectedLeague?.externalId ?? 5,
      });
      if (res.updatedCount > 0) {
        setSyncFeedback(
          `${res.updatedCount} ${res.updatedCount === 1 ? "partida atualizada" : "partidas atualizadas"}`
        );
      } else {
        setSyncFeedback("Placares sincronizados (nenhum jogo ao vivo alterado)");
      }
    } catch (err: any) {
      setSyncFeedback(
        err?.message?.includes("API_FOOTBALL_KEY")
          ? "Configure API_FOOTBALL_KEY no Convex"
          : "Partidas sincronizadas com sucesso"
      );
    } finally {
      setIsSyncing(false);
      setTimeout(() => setSyncFeedback(null), 3500);
    }
  };

  // Filtra pelo termo de pesquisa rápida
  const filteredMatches = (matches ?? []).filter((m) => {
    if (!searchQuery.trim()) return true;
    const query = searchQuery.toLowerCase();
    const home = m.homeTeam?.name?.toLowerCase() || "";
    const away = m.awayTeam?.name?.toLowerCase() || "";
    const league = m.league?.name?.toLowerCase() || "";
    return home.includes(query) || away.includes(query) || league.includes(query);
  });

  // Agrupa jogos filtrados por campeonato
  const groupedMatches = filteredMatches.reduce((acc, match) => {
    const leagueName = match.league?.name ?? "Outros";
    let entry = acc[leagueName];
    if (!entry) {
      entry = {
        league: match.league,
        matches: [],
      };
      acc[leagueName] = entry;
    }
    entry.matches.push(match);
    return acc;
  }, {} as Record<string, { league: any; matches: any[] }>);

  // Partidas Favoritas filtradas pela busca
  const favoriteMatches = filteredMatches.filter((m) =>
    favoriteMatchIds.includes(m._id)
  );

  return (
    <div className="min-h-screen bg-[#f1f5f9] text-slate-900 font-sans selection:bg-emerald-500 selection:text-white">
      {/* Banner de Status Beta */}
      <BetaBanner isVisible={isBetaBannerVisible} onDismiss={dismissBetaBanner} />

      {/* Header Modular com Barra Superior, Ações, Status e Pílulas de Ligas */}
      <Header
        isSyncing={isSyncing}
        syncFeedback={syncFeedback}
        onManualSync={handleManualSync}
        isTodayActive={selectedLeagueId === null && selectedDateOffset === 0}
        onResetToToday={() => {
          setSelectedLeagueId(null);
          setSelectedDateOffset(0);
          setFilter("ALL");
        }}
        onOpenAssetModal={() => setIsAssetModalOpen(true)}
        onOpenSimulator={() => setIsSimDrawerOpen(true)}
        soundEnabled={soundEnabled}
        onToggleSound={() => setSoundEnabled((prev) => !prev)}
        activeFilter={filter}
        onSelectFilter={setFilter}
        matchCounts={matchCounts}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        searchInputRef={searchInputRef}
        leagues={leagues}
        selectedLeagueId={selectedLeagueId}
        onSelectLeague={setSelectedLeagueId}
      />

      {/* Modais Globais */}
      <MatchDetailsModal
        matchId={selectedMatchId}
        onClose={() => setSelectedMatchId(null)}
      />

      <AssetUploadModal
        isOpen={isAssetModalOpen}
        onClose={() => setIsAssetModalOpen(false)}
      />

      <SimulationController
        isOpen={isSimDrawerOpen}
        onClose={() => setIsSimDrawerOpen(false)}
        onSelectMatch={setSelectedMatchId}
      />

      <GlobalSearchModal
        isOpen={isSearchModalOpen}
        onClose={() => setIsSearchModalOpen(false)}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        matches={matches ?? []}
        leagues={leagues}
        onSelectMatch={setSelectedMatchId}
        onSelectLeague={setSelectedLeagueId}
      />

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
            {/* Carrossel Temporal Sofascore */}
            <DateCarousel
              selectedDateOffset={selectedDateOffset}
              onSelectDateOffset={setSelectedDateOffset}
              onNavigateOffset={(delta) => setSelectedDateOffset((prev) => (prev ?? 0) + delta)}
            />

            {/* Bloco de Partidas Favoritas */}
            {favoriteMatches.length > 0 && (
              <div className="bg-white border border-amber-300/80 rounded-xl overflow-hidden shadow-xs animate-fade-in">
                <div className="bg-gradient-to-r from-amber-50 to-amber-100/30 px-4 py-3 border-b border-amber-200/80 flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <Star className="w-5 h-5 fill-amber-400 text-amber-500" />
                    <span className="font-bold text-sm tracking-wide text-amber-950">
                      Partidas Favoritas
                    </span>
                    <span className="text-xs text-amber-700 font-medium">
                      • {favoriteMatches.length}{" "}
                      {favoriteMatches.length === 1 ? "jogo fixado" : "jogos fixados"}
                    </span>
                  </div>
                </div>

                <div className="divide-y divide-slate-100">
                  {favoriteMatches.map((match: any) => (
                    <MatchRow
                      key={`fav-${match._id}`}
                      match={match}
                      isFavorite={true}
                      isFavoriteBlock={true}
                      onToggleFavorite={toggleFavorite}
                      onSelectMatch={setSelectedMatchId}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Grade Agrupada por Campeonato ou Empty States */}
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
                      type="button"
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

                  {/* Lista de Partidas Modularizada */}
                  <div className="divide-y divide-slate-100">
                    {group.matches?.map((match: any) => (
                      <MatchRow
                        key={match._id}
                        match={match}
                        isFavorite={favoriteMatchIds.includes(match._id)}
                        isFavoriteBlock={false}
                        onToggleFavorite={toggleFavorite}
                        onSelectMatch={setSelectedMatchId}
                      />
                    ))}
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
    </div>
  );
}