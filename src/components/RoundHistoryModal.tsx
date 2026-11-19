import React from 'react';
import { RoundState } from '../types';
import { deleteRoundFromHistory, getRoundHistory } from '../utils/storage';
import { Calendar, History, Trash2, X } from 'lucide-react';
import { calculatePlayerStats } from '../utils/bankerEngine';

interface RoundHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoadRound: (round: RoundState) => void;
}

export const RoundHistoryModal: React.FC<RoundHistoryModalProps> = ({
  isOpen,
  onClose,
  onLoadRound,
}) => {
  const [history, setHistory] = React.useState<RoundState[]>([]);

  React.useEffect(() => {
    if (isOpen) {
      setHistory(getRoundHistory());
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleDelete = (e: React.MouseEvent, roundId: string) => {
    e.stopPropagation();
    deleteRoundFromHistory(roundId);
    setHistory((prev) => prev.filter((r) => r.id !== roundId));
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-800 rounded-t-3xl sm:rounded-2xl max-w-md w-full max-h-[90vh] flex flex-col shadow-2xl">
        {/* Header */}
        <div className="p-4 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold">
              <History className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">Round History</h2>
              <p className="text-xs text-slate-400">Saved Banker Games ({history.length})</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full text-slate-400 hover:text-white hover:bg-slate-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* List of past rounds */}
        <div className="p-4 overflow-y-auto space-y-2.5 flex-1">
          {history.length === 0 ? (
            <div className="text-center py-12 text-slate-500 text-xs">
              No saved rounds yet. Start a new round to play!
            </div>
          ) : (
            history.map((r) => {
              const stats = calculatePlayerStats(r);
              const topWinner = [...stats].sort((a, b) => b.netWinnings - a.netWinnings)[0];
              const dateStr = new Date(r.createdAt).toLocaleDateString();

              return (
                <div
                  key={r.id}
                  onClick={() => {
                    onLoadRound(r);
                    onClose();
                  }}
                  className="bg-slate-950/70 hover:bg-slate-800/80 border border-slate-800 hover:border-emerald-500/50 rounded-xl p-3 cursor-pointer transition active:scale-[0.98] group"
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="font-bold text-xs text-white group-hover:text-emerald-400 transition">
                      {r.courseName || 'Banker Round'}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] text-slate-400 flex items-center gap-1">
                        <Calendar className="w-3 h-3" /> {dateStr}
                      </span>
                      <button
                        onClick={(e) => handleDelete(e, r.id)}
                        className="text-slate-500 hover:text-rose-400 p-1"
                        title="Delete round"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-slate-400">
                    <div>
                      {r.players.map((p) => p.name).join(', ')} ({r.settings.totalHoles}H)
                    </div>
                    {topWinner && topWinner.netWinnings > 0 && (
                      <div className="text-emerald-400 font-bold">
                        🏆 {topWinner.name} (+${topWinner.netWinnings})
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-900 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
