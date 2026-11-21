import React from 'react';
import { BookOpen, History, RotateCcw, Share2, Table2, Eye, LogOut } from 'lucide-react';
import { RoundState } from '../types';

interface HeaderProps {
  round: RoundState | null;
  onOpenRules: () => void;
  onOpenHistory: () => void;
  onNewRound: () => void;
  onEditHandicaps: () => void;
  onOpenShare?: () => void;
  onOpenJoin?: () => void;
  onOpenReset?: () => void;
  isSpectator?: boolean;
  onExitSpectator?: () => void;
  connectionStatus?: 'disconnected' | 'connecting' | 'connected' | 'error';
}

export const Header: React.FC<HeaderProps> = ({
  round,
  onOpenRules,
  onOpenHistory,
  onNewRound,
  onEditHandicaps,
  onOpenShare,
  onOpenJoin,
  onOpenReset,
  isSpectator = false,
  onExitSpectator,
  connectionStatus = 'disconnected',
}) => {
  return (
    <header className="sticky top-0 z-40 bg-slate-900/95 backdrop-blur-md border-b border-emerald-950/60 pt-safe px-3 sm:px-4 py-2.5 shadow-md">
      <div className="max-w-md mx-auto flex items-center justify-between">
        {/* Brand */}
        <div className="flex items-center space-x-2">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-700 flex items-center justify-center shadow-emerald-900/40 shadow-inner border border-emerald-400/30 shrink-0">
            <span className="text-xl">🏦</span>
          </div>
          <div className="min-w-0">
            <h1 className="font-bold text-base leading-tight tracking-tight text-white flex items-center gap-1.5">
              BANKER
              {isSpectator ? (
                <span className="text-[10px] uppercase font-bold px-1.5 py-0.5 rounded-full bg-sky-500/20 text-sky-400 border border-sky-500/30 flex items-center gap-1">
                  <Eye className="w-3 h-3" /> Spectator
                </span>
              ) : (
                <span className="text-[10px] uppercase font-semibold px-1.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                  GOLF
                </span>
              )}
            </h1>
            <p className="text-[11px] text-slate-400 truncate max-w-[130px] sm:max-w-[170px]">
              {round ? round.courseName || 'Active Round' : 'Betting Tracker'}
            </p>
          </div>
        </div>

        {/* Action icons */}
        <div className="flex items-center space-x-1">
          {/* Spectator Exit button */}
          {isSpectator ? (
            <button
              onClick={onExitSpectator}
              className="p-1.5 px-2.5 rounded-lg bg-sky-950 text-sky-300 hover:bg-sky-900 border border-sky-800 transition active:scale-95 flex items-center gap-1 text-xs font-bold"
              title="Exit Spectator View"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Exit</span>
            </button>
          ) : (
            <>
              {/* Share Live match button */}
              {round && onOpenShare && (
                <button
                  onClick={onOpenShare}
                  aria-label="Share Live Match"
                  className="p-2 rounded-lg text-emerald-400 hover:text-emerald-300 hover:bg-emerald-950/60 transition active:scale-95 relative"
                  title="Share Live Spectator Link & Code"
                >
                  <Share2 className="w-4 h-4" />
                  {connectionStatus === 'connected' && (
                    <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                  )}
                </button>
              )}

              {/* Join Live match button */}
              {onOpenJoin && (
                <button
                  onClick={onOpenJoin}
                  aria-label="Join Live Match as Spectator"
                  className="p-2 rounded-lg text-slate-300 hover:text-sky-400 hover:bg-slate-800 transition active:scale-95"
                  title="Join Match with Code"
                >
                  <Eye className="w-4 h-4" />
                </button>
              )}

              {/* Scorecard strokes */}
              {round && (
                <button
                  onClick={onEditHandicaps}
                  aria-label="Edit course scorecard and handicaps"
                  className="p-2 rounded-lg text-slate-300 hover:text-emerald-400 hover:bg-slate-800 transition active:scale-95"
                  title="Scorecard & Strokes"
                >
                  <Table2 className="w-4 h-4" />
                </button>
              )}

              {/* Rules */}
              <button
                onClick={onOpenRules}
                aria-label="Banker Rules Reference"
                className="p-2 rounded-lg text-slate-300 hover:text-emerald-400 hover:bg-slate-800 transition active:scale-95 hidden sm:inline-flex"
                title="Banker Rules"
              >
                <BookOpen className="w-4 h-4" />
              </button>

              {/* History */}
              <button
                onClick={onOpenHistory}
                aria-label="Saved Rounds History"
                className="p-2 rounded-lg text-slate-300 hover:text-emerald-400 hover:bg-slate-800 transition active:scale-95"
                title="Round History"
              >
                <History className="w-4 h-4" />
              </button>

              {/* Reset / New Round button */}
              <button
                onClick={onOpenReset || onNewRound}
                aria-label="Reset or Start New Match"
                className="ml-0.5 p-1.5 px-2 rounded-lg bg-emerald-600/30 text-emerald-300 hover:bg-emerald-600/50 border border-emerald-500/30 transition active:scale-95 flex items-center gap-1 text-xs font-semibold"
                title="Reset or New Match"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>New</span>
              </button>
            </>
          )}
        </div>
      </div>
    </header>
  );
};
