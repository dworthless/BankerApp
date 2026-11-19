import React, { useState } from 'react';
import { RoundState } from '../types';
import { calculatePlayerStats } from '../utils/bankerEngine';
import { TrendingUp, TrendingDown, Minus, ChevronRight, DollarSign } from 'lucide-react';

interface LiveBalanceBarProps {
  round: RoundState;
  onNavigateToSettlement?: () => void;
}

export const LiveBalanceBar: React.FC<LiveBalanceBarProps> = ({
  round,
  onNavigateToSettlement,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const stats = calculatePlayerStats(round);

  // Sort descending by net winnings
  const sortedStats = [...stats].sort((a, b) => b.netWinnings - a.netWinnings);

  // Up vs Down summary numbers
  const upPlayers = sortedStats.filter((s) => s.netWinnings > 0);
  const downPlayers = sortedStats.filter((s) => s.netWinnings < 0);
  const evenPlayers = sortedStats.filter((s) => s.netWinnings === 0);

  const totalWon = upPlayers.reduce((sum, p) => sum + p.netWinnings, 0);
  const totalLost = downPlayers.reduce((sum, p) => sum + Math.abs(p.netWinnings), 0);

  const leader = sortedStats[0];

  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-2xl overflow-hidden shadow-lg transition-all">
      {/* Compact Main Bar */}
      <div
        onClick={() => setIsExpanded(!isExpanded)}
        className="px-3 py-2 cursor-pointer hover:bg-slate-850 transition flex items-center justify-between gap-2 select-none"
      >
        <div className="flex items-center gap-2 overflow-x-auto scrollbar-none py-0.5">
          <div className="flex items-center gap-1.5 shrink-0 pr-1 border-r border-slate-800">
            <DollarSign className="w-3.5 h-3.5 text-emerald-400" />
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
              Live:
            </span>
          </div>

          {/* Player Quick Chips */}
          <div className="flex items-center gap-1.5 shrink-0">
            {sortedStats.map((stat) => {
              const isUp = stat.netWinnings > 0;
              const isDown = stat.netWinnings < 0;

              return (
                <div
                  key={stat.playerId}
                  className={`flex items-center gap-1 px-2 py-0.5 rounded-lg text-xs font-bold border transition ${
                    isUp
                      ? 'bg-emerald-950/70 border-emerald-600/60 text-emerald-300 shadow-sm'
                      : isDown
                      ? 'bg-rose-950/70 border-rose-600/60 text-rose-300 shadow-sm'
                      : 'bg-slate-800/80 border-slate-700/60 text-slate-400'
                  }`}
                >
                  <div
                    className="w-2.5 h-2.5 rounded-full shrink-0"
                    style={{ backgroundColor: stat.color }}
                  />
                  <span className="truncate max-w-[55px] font-semibold">{stat.name}</span>
                  <span
                    className={`font-black flex items-center ${
                      isUp ? 'text-emerald-400' : isDown ? 'text-rose-400' : 'text-slate-400'
                    }`}
                  >
                    {isUp && <TrendingUp className="w-3 h-3 inline mr-0.5" />}
                    {isDown && <TrendingDown className="w-3 h-3 inline mr-0.5" />}
                    {isUp
                      ? `+$${stat.netWinnings}`
                      : isDown
                      ? `-$${Math.abs(stat.netWinnings)}`
                      : '$0'}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Expand / Details Chevron */}
        <div className="shrink-0 flex items-center gap-1 pl-1 text-[11px] text-slate-400 font-medium">
          <span className="hidden sm:inline">Details</span>
          <ChevronRight
            className={`w-3.5 h-3.5 transition-transform duration-200 ${
              isExpanded ? 'rotate-90' : ''
            }`}
          />
        </div>
      </div>

      {/* Expanded Quick-Standings Card */}
      {isExpanded && (
        <div className="p-3 bg-slate-950/90 border-t border-slate-800/80 space-y-3 animate-in fade-in duration-200">
          {/* Top Quick Summary */}
          <div className="flex items-center justify-between text-xs px-1">
            <div className="flex items-center gap-1.5 text-slate-300">
              <span>👑 Leader:</span>
              <strong className="text-emerald-400 font-bold">{leader?.name}</strong>
              <span className="text-slate-400">
                ({leader?.netWinnings > 0 ? `+$${leader.netWinnings}` : '$0'})
              </span>
            </div>

            <div className="text-[11px] text-slate-400">
              Total In Play: <strong className="text-white">${totalWon}</strong>
            </div>
          </div>

          {/* Up vs Down Side-by-Side Breakdown */}
          <div className="grid grid-cols-2 gap-2 text-xs">
            {/* UP IN THE GREEN */}
            <div className="bg-emerald-950/30 border border-emerald-900/50 rounded-xl p-2.5">
              <div className="flex items-center justify-between text-[11px] font-bold text-emerald-400 uppercase tracking-wider mb-1.5">
                <span className="flex items-center gap-1">
                  <TrendingUp className="w-3 h-3" /> UP ({upPlayers.length})
                </span>
                <span>+${totalWon}</span>
              </div>
              {upPlayers.length > 0 ? (
                <div className="space-y-1">
                  {upPlayers.map((p) => (
                    <div key={p.playerId} className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-1.5 truncate">
                        <div
                          className="w-2 h-2 rounded-full"
                          style={{ backgroundColor: p.color }}
                        />
                        <span className="text-slate-200 truncate">{p.name}</span>
                      </div>
                      <span className="font-black text-emerald-400 shrink-0">
                        +${p.netWinnings}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-[11px] text-slate-500 italic">No players up yet</p>
              )}
            </div>

            {/* DOWN IN THE RED */}
            <div className="bg-rose-950/30 border border-rose-900/50 rounded-xl p-2.5">
              <div className="flex items-center justify-between text-[11px] font-bold text-rose-400 uppercase tracking-wider mb-1.5">
                <span className="flex items-center gap-1">
                  <TrendingDown className="w-3 h-3" /> DOWN ({downPlayers.length})
                </span>
                <span>-${totalLost}</span>
              </div>
              {downPlayers.length > 0 ? (
                <div className="space-y-1">
                  {downPlayers.map((p) => (
                    <div key={p.playerId} className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-1.5 truncate">
                        <div
                          className="w-2 h-2 rounded-full"
                          style={{ backgroundColor: p.color }}
                        />
                        <span className="text-slate-200 truncate">{p.name}</span>
                      </div>
                      <span className="font-black text-rose-400 shrink-0">
                        -${Math.abs(p.netWinnings)}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-[11px] text-slate-500 italic">No players down yet</p>
              )}
            </div>
          </div>

          {/* Even Players if any */}
          {evenPlayers.length > 0 && (
            <div className="flex items-center gap-2 text-[11px] text-slate-400 bg-slate-900 px-2 py-1 rounded-lg">
              <Minus className="w-3 h-3 text-slate-500" />
              <span>Even ($0.00):</span>
              <span className="text-slate-300 font-medium">
                {evenPlayers.map((p) => p.name).join(', ')}
              </span>
            </div>
          )}

          {/* Button to jump to Settlement tab */}
          {onNavigateToSettlement && (
            <button
              type="button"
              onClick={onNavigateToSettlement}
              className="w-full py-1.5 bg-slate-800 hover:bg-slate-700 text-emerald-400 rounded-lg text-xs font-bold border border-slate-700 flex items-center justify-center gap-1 transition active:scale-95"
            >
              <span>View Full Settlement & Venmo Transfers</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      )}
    </div>
  );
};
