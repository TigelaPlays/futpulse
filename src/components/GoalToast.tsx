import { Flame, X } from "lucide-react";

export interface GoalAlert {
  id: string;
  matchId: string;
  teamName: string;
  teamLogo?: string;
  homeScore: number;
  awayScore: number;
  homeTeamName: string;
  awayTeamName: string;
}

interface GoalToastProps {
  alerts: GoalAlert[];
  onDismiss: (id: string) => void;
}

export function GoalToastContainer({ alerts, onDismiss }: GoalToastProps) {
  if (alerts.length === 0) return null;

  return (
    <div className="fixed bottom-5 right-5 z-50 flex flex-col gap-2.5 max-w-sm w-full pointer-events-none">
      {alerts.map((alert) => (
        <div
          key={alert.id}
          className="pointer-events-auto bg-[#161b22] border-2 border-emerald-500/80 rounded-xl p-3.5 shadow-2xl flex items-center justify-between gap-3 text-slate-100 transition-all animate-bounce"
        >
          <div className="flex items-center gap-3">
            {alert.teamLogo ? (
              <div className="w-10 h-10 rounded-full bg-white/95 p-1 flex items-center justify-center shadow-md shrink-0">
                <img
                  src={alert.teamLogo}
                  alt={alert.teamName}
                  className="w-full h-full object-contain"
                />
              </div>
            ) : (
              <div className="bg-emerald-500 text-slate-950 p-2 rounded-lg shrink-0">
                <Flame className="w-5 h-5 animate-pulse" />
              </div>
            )}

            <div className="space-y-0.5">
              <div className="flex items-center gap-1.5 text-xs font-black tracking-wider uppercase text-emerald-400">
                <span>⚽ GOL DO {alert.teamName}!</span>
              </div>
              <div className="text-xs text-slate-300 font-medium">
                {alert.homeTeamName}{" "}
                <span className="font-mono font-bold text-emerald-400">{alert.homeScore}</span> -{" "}
                <span className="font-mono font-bold text-emerald-400">{alert.awayScore}</span>{" "}
                {alert.awayTeamName}
              </div>
            </div>
          </div>

          <button
            onClick={() => onDismiss(alert.id)}
            aria-label="Fechar alerta"
            className="text-slate-400 hover:text-white p-1 rounded-md hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      ))}
    </div>
  );
}

