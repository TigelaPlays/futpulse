import { useState, useEffect } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import {
  Play,
  Pause,
  RotateCcw,
  Sparkles,
  Activity,
  Zap,
  X,
  FlaskConical,
  CheckCircle2,
  ShieldAlert,
} from "lucide-react";

interface SimulationControllerProps {
  isOpen: boolean;
  onClose: () => void;
  initialMatchId?: Id<"matches"> | null;
  onSelectMatch?: (matchId: Id<"matches">) => void;
}

export function SimulationController({
  isOpen,
  onClose,
  initialMatchId,
  onSelectMatch,
}: SimulationControllerProps) {
  const [userSelectedMatchId, setUserSelectedMatchId] = useState<Id<"matches"> | null>(null);
  const [speedMultiplier, setSpeedMultiplier] = useState<number>(5);
  const [isOperating, setIsOperating] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  // Fecha no Esc
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  // Carrega todas as partidas do Convex
  const allMatches = useQuery(api.matches.listMatches, { statusFilter: "ALL" }) ?? [];

  const simulateEventMutation = useMutation(api.matches.simulateMatchEvent);

  if (!isOpen) return null;

  const effectiveMatchId =
    userSelectedMatchId ?? initialMatchId ?? (allMatches.length > 0 ? allMatches[0]._id : null);

  const selectedMatch = allMatches.find((m) => m._id === effectiveMatchId);

  const handleAction = async (
    action:
      | "GOAL_HOME"
      | "GOAL_AWAY"
      | "RED_CARD_HOME"
      | "RED_CARD_AWAY"
      | "START_LIVE"
      | "PAUSE"
      | "FINISH"
      | "RESET",
    customPlayerName?: string
  ) => {
    if (!effectiveMatchId) return;
    setIsOperating(true);
    setStatusMessage(null);
    try {
      await simulateEventMutation({
        matchId: effectiveMatchId,
        action,
        playerName: customPlayerName,
      });

      const msgMap: Record<string, string> = {
        GOAL_HOME: "Gol do mandante registrado! Placar atualizado.",
        GOAL_AWAY: "Gol do visitante registrado! Placar atualizado.",
        RED_CARD_HOME: "Cartão vermelho para o mandante adicionado!",
        RED_CARD_AWAY: "Cartão vermelho para o visitante adicionado!",
        START_LIVE: "Partida iniciada como AO VIVO!",
        PAUSE: "Partida pausada (Intervalo / HT).",
        FINISH: "Partida finalizada (Fim de Jogo).",
        RESET: "Partida resetada para 0x0.",
      };

      setStatusMessage(msgMap[action] || "Ação executada com sucesso!");
    } catch (err: any) {
      setStatusMessage(`Erro: ${err?.message || "Falha na simulação"}`);
    } finally {
      setIsOperating(false);
      setTimeout(() => setStatusMessage(null), 3500);
    }
  };

  const isLive = selectedMatch && ["IN_PLAY", "LIVE"].includes(selectedMatch.status);

  return (
    <div className="fixed inset-0 z-50 flex justify-end font-sans animate-fade-in">
      {/* Fundo Escurecido com Blur */}
      <div
        onClick={onClose}
        className="fixed inset-0 bg-slate-950/40 backdrop-blur-xs transition-opacity"
      />

      {/* Gaveta Lateral (Slide Drawer à Direita) */}
      <div className="relative w-full sm:w-[440px] bg-white h-full shadow-2xl flex flex-col border-l border-slate-200 z-10 overflow-y-auto animate-in slide-in-from-right duration-200">
        {/* Cabeçalho da Gaveta */}
        <div className="bg-gradient-to-r from-slate-900 to-slate-800 text-white p-4 flex items-center justify-between sticky top-0 z-10 shadow-sm">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
              <FlaskConical className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-white flex items-center gap-1.5">
                Painel Dev & Simulador
                <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-400/30">
                  Ao Vivo
                </span>
              </h3>
              <p className="text-[11px] text-slate-400">
                Dispare gols e eventos reativos em tempo real
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
            title="Fechar (Esc)"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Conteúdo do Painel */}
        <div className="p-4 sm:p-5 space-y-5 flex-1">
          {/* Seletor de Partida */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Partida para Simulação:
            </label>
            <select
              value={effectiveMatchId || ""}
              onChange={(e) => {
                const id = e.target.value as Id<"matches">;
                setUserSelectedMatchId(id);
                if (onSelectMatch) onSelectMatch(id);
              }}
              className="w-full text-xs bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-slate-800 font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500 shadow-2xs"
            >
              {allMatches.map((m) => (
                <option key={m._id} value={m._id}>
                  {m.homeTeam?.name || "Mandante"} {m.homeScore} × {m.awayScore} {m.awayTeam?.name || "Visitante"} ({m.statusShort || m.status})
                </option>
              ))}
            </select>
          </div>

          {/* Card da Partida Selecionada */}
          {selectedMatch && (
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/90 shadow-2xs space-y-3">
              <div className="flex items-center justify-between text-xs font-semibold text-slate-500 border-b border-slate-200 pb-2">
                <span>{selectedMatch.league?.name || "Campeonato"}</span>
                <span className="font-mono text-emerald-700 font-bold">
                  {selectedMatch.round}
                </span>
              </div>

              {/* Placar e Clubes */}
              <div className="flex items-center justify-between gap-2">
                {/* Mandante */}
                <div className="flex-1 text-center space-y-1">
                  {selectedMatch.homeTeam?.logoUrl && (
                    <img
                      src={selectedMatch.homeTeam.logoUrl}
                      alt=""
                      className="w-8 h-8 object-contain mx-auto"
                    />
                  )}
                  <span className="text-xs font-bold text-slate-900 block truncate">
                    {selectedMatch.homeTeam?.name}
                  </span>
                </div>

                {/* Placar */}
                <div className="px-3 py-1 rounded-xl bg-white border border-slate-200 shadow-xs font-mono font-extrabold text-xl text-slate-900 flex items-center gap-1.5">
                  <span>{selectedMatch.homeScore}</span>
                  <span className="text-slate-400 text-sm">×</span>
                  <span>{selectedMatch.awayScore}</span>
                </div>

                {/* Visitante */}
                <div className="flex-1 text-center space-y-1">
                  {selectedMatch.awayTeam?.logoUrl && (
                    <img
                      src={selectedMatch.awayTeam.logoUrl}
                      alt=""
                      className="w-8 h-8 object-contain mx-auto"
                    />
                  )}
                  <span className="text-xs font-bold text-slate-900 block truncate">
                    {selectedMatch.awayTeam?.name}
                  </span>
                </div>
              </div>

              {/* Status e Minuto */}
              <div className="flex items-center justify-between text-xs pt-2 border-t border-slate-200">
                <div className="flex items-center gap-1.5 text-slate-600 font-medium">
                  <Activity className="w-3.5 h-3.5 text-emerald-600" />
                  <span>
                    Minuto: <strong className="font-mono text-slate-900">{selectedMatch.minute ?? 0}'</strong>
                  </span>
                </div>

                <span
                  className={`px-2 py-0.5 rounded-full text-[11px] font-bold ${
                    isLive
                      ? "bg-emerald-100 text-emerald-800 border border-emerald-300"
                      : selectedMatch.status === "FINISHED"
                      ? "bg-slate-200 text-slate-700"
                      : "bg-blue-50 text-blue-700 border border-blue-200"
                  }`}
                >
                  {isLive && "🔴 "}
                  {selectedMatch.statusShort || selectedMatch.status}
                </span>
              </div>
            </div>
          )}

          {/* Feedback de Ação */}
          {statusMessage && (
            <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 font-medium flex items-center gap-2 animate-fade-in">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{statusMessage}</span>
            </div>
          )}

          {/* Controles de Lances em Tempo Real (Disparadores de Eventos) */}
          <div className="space-y-2.5">
            <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
              Disparadores de Gols (Testa Som & Toasts):
            </h4>

            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => handleAction("GOAL_HOME", `${selectedMatch?.homeTeam?.name || "Mandante"} Atacante`)}
                disabled={isOperating}
                className="flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:scale-95 disabled:opacity-50 text-white font-bold text-xs shadow-xs transition-all cursor-pointer"
              >
                <span>⚽ + Gol Mandante</span>
              </button>

              <button
                onClick={() => handleAction("GOAL_AWAY", `${selectedMatch?.awayTeam?.name || "Visitante"} Atacante`)}
                disabled={isOperating}
                className="flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl bg-teal-600 hover:bg-teal-700 active:scale-95 disabled:opacity-50 text-white font-bold text-xs shadow-xs transition-all cursor-pointer"
              >
                <span>⚽ + Gol Visitante</span>
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2 pt-1">
              <button
                onClick={() => handleAction("RED_CARD_HOME")}
                disabled={isOperating}
                className="flex items-center justify-center gap-1 py-2 px-2.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 font-semibold text-xs transition-all cursor-pointer"
              >
                <ShieldAlert className="w-3.5 h-3.5 text-rose-600" />
                <span>🟥 Vermelho Mandante</span>
              </button>

              <button
                onClick={() => handleAction("RED_CARD_AWAY")}
                disabled={isOperating}
                className="flex items-center justify-center gap-1 py-2 px-2.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 font-semibold text-xs transition-all cursor-pointer"
              >
                <ShieldAlert className="w-3.5 h-3.5 text-rose-600" />
                <span>🟥 Vermelho Visitante</span>
              </button>
            </div>
          </div>

          {/* Gerenciamento do Status da Partida */}
          <div className="space-y-2.5 pt-2 border-t border-slate-200">
            <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
              Controle de Status do Jogo:
            </h4>

            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => handleAction("START_LIVE")}
                disabled={isOperating || isLive}
                className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-slate-900 hover:bg-slate-800 disabled:opacity-40 text-white font-semibold text-xs shadow-2xs transition-all cursor-pointer"
              >
                <Play className="w-3.5 h-3.5 fill-current text-emerald-400" />
                <span>Iniciar Ao Vivo</span>
              </button>

              <button
                onClick={() => handleAction("PAUSE")}
                disabled={isOperating}
                className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-amber-500 hover:bg-amber-600 disabled:opacity-40 text-white font-semibold text-xs shadow-2xs transition-all cursor-pointer"
              >
                <Pause className="w-3.5 h-3.5 fill-current" />
                <span>Pausar (Intervalo)</span>
              </button>

              <button
                onClick={() => handleAction("FINISH")}
                disabled={isOperating || selectedMatch?.status === "FINISHED"}
                className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-300 font-semibold text-xs transition-all cursor-pointer"
              >
                <span>Fim de Jogo (FT)</span>
              </button>

              <button
                onClick={() => handleAction("RESET")}
                disabled={isOperating}
                className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 font-semibold text-xs transition-all cursor-pointer"
                title="Zera o placar e retorna para AGENDADO"
              >
                <RotateCcw className="w-3.5 h-3.5 text-slate-500" />
                <span>Resetar (0×0)</span>
              </button>
            </div>
          </div>

          {/* Velocidade de Simulação */}
          <div className="pt-2 border-t border-slate-200 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-600 flex items-center gap-1">
                <Zap className="w-3.5 h-3.5 text-amber-500" />
                Velocidade do Relógio Simulado:
              </span>
              <span className="text-[10px] font-mono text-slate-400">
                {speedMultiplier}x acelerado
              </span>
            </div>

            <div className="grid grid-cols-4 gap-1.5">
              {[1, 2, 5, 10].map((speed) => (
                <button
                  key={speed}
                  onClick={() => setSpeedMultiplier(speed)}
                  className={`py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer border ${
                    speedMultiplier === speed
                      ? "bg-slate-900 text-white border-slate-900 shadow-2xs"
                      : "bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-200"
                  }`}
                >
                  {speed}x
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Rodapé da Gaveta */}
        <div className="p-3 bg-slate-50 border-t border-slate-200 text-center">
          <p className="text-[11px] text-slate-500">
            Pressione <kbd className="px-1.5 py-0.5 bg-white border border-slate-300 rounded font-mono text-[10px]">Esc</kbd> ou clique fora para fechar.
          </p>
        </div>
      </div>
    </div>
  );
}
