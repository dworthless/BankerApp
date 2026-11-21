import React from 'react';
import { RotateCcw, PlusCircle, Trash2, X, AlertTriangle } from 'lucide-react';
import { RoundState } from '../types';

interface ResetMatchModalProps {
  isOpen: boolean;
  onClose: () => void;
  round: RoundState | null;
  onStartNewMatch: () => void;
  onResetScoresToHole1: () => void;
  onClearEverythingAndForget: () => void;
}

export const ResetMatchModal: React.FC<ResetMatchModalProps> = ({
  isOpen,
  onClose,
  round,
  onStartNewMatch,
  onResetScoresToHole1,
  onClearEverythingAndForget,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-800 rounded-t-3xl sm:rounded-2xl max-w-md w-full shadow-2xl animate-in fade-in slide-in-from-bottom duration-200">
        {/* Header */}
        <div className="p-4 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-rose-500/20 text-rose-400 flex items-center justify-center font-bold">
              <RotateCcw className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">Reset & Start New Match</h2>
              <p className="text-xs text-slate-400">Choose how to start over</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full text-slate-400 hover:text-white hover:bg-slate-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Options */}
        <div className="p-4 space-y-3">
          {/* Option 1: Start New Match (Setup Wizard) */}
          <button
            onClick={() => {
              onClose();
              onStartNewMatch();
            }}
            className="w-full text-left p-3.5 rounded-2xl bg-slate-800/90 hover:bg-slate-800 border border-emerald-500/30 hover:border-emerald-500/60 transition active:scale-[0.98] group flex items-start gap-3"
          >
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0 mt-0.5 group-hover:scale-105 transition">
              <PlusCircle className="w-5 h-5" />
            </div>
            <div>
              <div className="font-bold text-sm text-white group-hover:text-emerald-300 transition">
                Start New Match (Setup Wizard)
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Configure a new course (e.g. Lakewood Oaks), pick players & handicaps, and tee off fresh.
              </p>
            </div>
          </button>

          {/* Option 2: Quick Reset Scores to Hole 1 */}
          {round && (
            <button
              onClick={() => {
                onClose();
                onResetScoresToHole1();
              }}
              className="w-full text-left p-3.5 rounded-2xl bg-slate-800/90 hover:bg-slate-800 border border-slate-700 hover:border-slate-600 transition active:scale-[0.98] group flex items-start gap-3"
            >
              <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center shrink-0 mt-0.5 group-hover:scale-105 transition">
                <RotateCcw className="w-5 h-5" />
              </div>
              <div>
                <div className="font-bold text-sm text-white group-hover:text-amber-300 transition">
                  Reset Scores to Hole 1
                </div>
                <p className="text-xs text-slate-400 mt-0.5">
                  Keep current players ({round.players.map((p) => p.name).join(', ')}) & course ({round.courseName}), but wipe all scores and bets back to Hole 1.
                </p>
              </div>
            </button>
          )}

          {/* Option 3: Wipe & Forget Past Matches */}
          <button
            onClick={() => {
              if (window.confirm('Are you sure you want to completely erase the active match and all saved history?')) {
                onClose();
                onClearEverythingAndForget();
              }
            }}
            className="w-full text-left p-3.5 rounded-2xl bg-rose-950/30 hover:bg-rose-950/50 border border-rose-900/60 hover:border-rose-700/80 transition active:scale-[0.98] group flex items-start gap-3"
          >
            <div className="w-10 h-10 rounded-xl bg-rose-500/20 text-rose-400 flex items-center justify-center shrink-0 mt-0.5 group-hover:scale-105 transition">
              <Trash2 className="w-5 h-5" />
            </div>
            <div>
              <div className="font-bold text-sm text-rose-300 group-hover:text-rose-200 transition flex items-center gap-1.5">
                <span>Wipe Game & Forget Past Matches</span>
                <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
              </div>
              <p className="text-xs text-rose-300/70 mt-0.5">
                Completely clears all saved match history and active round data for a clean slate.
              </p>
            </div>
          </button>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-900 flex justify-end">
          <button
            onClick={onClose}
            className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};
