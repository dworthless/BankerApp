import React from 'react';
import { BookOpen, History, PlusCircle, Table2 } from 'lucide-react';
import { RoundState } from '../types';

interface HeaderProps {
  round: RoundState | null;
  onOpenRules: () => void;
  onOpenHistory: () => void;
  onNewRound: () => void;
  onEditHandicaps: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  round,
  onOpenRules,
  onOpenHistory,
  onNewRound,
  onEditHandicaps,
}) => {
  return (
    <header className="sticky top-0 z-40 bg-slate-900/95 backdrop-blur-md border-b border-emerald-950/60 pt-safe px-4 py-2.5 shadow-md">
      <div className="max-w-md mx-auto flex items-center justify-between">
        {/* Brand */}
        <div className="flex items-center space-x-2">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-700 flex items-center justify-center shadow-emerald-900/40 shadow-inner border border-emerald-400/30">
            <span className="text-xl">🏦</span>
          </div>
          <div>
            <h1 className="font-bold text-base leading-tight tracking-tight text-white flex items-center gap-1.5">
              BANKER
              <span className="text-[10px] uppercase font-semibold px-1.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                GOLF
              </span>
            </h1>
            <p className="text-[11px] text-slate-400 truncate max-w-[150px]">
              {round ? round.courseName || 'Active Round' : 'Betting Tracker'}
            </p>
          </div>
        </div>

        {/* Action icons */}
        <div className="flex items-center space-x-1">
          {round && (
            <button
              onClick={onEditHandicaps}
              aria-label="Edit course scorecard and handicaps"
              className="p-2 rounded-lg text-slate-300 hover:text-emerald-400 hover:bg-slate-800 transition active:scale-95"
              title="Scorecard & Strokes"
            >
              <Table2 className="w-5 h-5" />
            </button>
          )}

          <button
            onClick={onOpenRules}
            aria-label="Banker Rules Reference"
            className="p-2 rounded-lg text-slate-300 hover:text-emerald-400 hover:bg-slate-800 transition active:scale-95"
            title="Banker Rules"
          >
            <BookOpen className="w-5 h-5" />
          </button>

          <button
            onClick={onOpenHistory}
            aria-label="Saved Rounds History"
            className="p-2 rounded-lg text-slate-300 hover:text-emerald-400 hover:bg-slate-800 transition active:scale-95"
            title="Round History"
          >
            <History className="w-5 h-5" />
          </button>

          <button
            onClick={onNewRound}
            aria-label="Start New Round"
            className="ml-1 p-2 rounded-lg bg-emerald-600/30 text-emerald-300 hover:bg-emerald-600/50 border border-emerald-500/30 transition active:scale-95 flex items-center gap-1 text-xs font-medium"
            title="New Round"
          >
            <PlusCircle className="w-4 h-4" />
            <span className="hidden sm:inline">New</span>
          </button>
        </div>
      </div>
    </header>
  );
};
