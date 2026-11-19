import React, { useState } from 'react';
import { RoundState } from '../types';
import { calculatePlayerStats } from '../utils/bankerEngine';
import { calculateMinimalSettlements, generateRoundSummaryText } from '../utils/settlement';
import {
  Check,
  Copy,
  DollarSign,
  Share2,
} from 'lucide-react';

interface LeaderboardViewProps {
  round: RoundState;
}

export const LeaderboardView: React.FC<LeaderboardViewProps> = ({ round }) => {
  const [copied, setCopied] = useState(false);
  const stats = calculatePlayerStats(round);

  // Sort descending by Net $ Winnings
  const sortedStats = [...stats].sort((a, b) => b.netWinnings - a.netWinnings);

  // Minimal Debt Settlement
  const netBalances: Record<string, number> = {};
  stats.forEach((s) => {
    netBalances[s.playerId] = s.netWinnings;
  });
  const settlements = calculateMinimalSettlements(round.players, netBalances);

  const playedHoles = round.holes.filter((h) => {
    const data = round.holesData[h.holeNumber];
    return data && data.isComplete;
  }).length;

  const handleCopySummary = async () => {
    const text = generateRoundSummaryText(round);
    try {
      if (navigator.clipboard) {
        await navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2500);
      }
    } catch (err) {
      console.error('Failed to copy summary:', err);
    }
  };

  const handleShare = async () => {
    const text = generateRoundSummaryText(round);
    if (navigator.share) {
      try {
        await navigator.share({
          title: `Banker Golf - ${round.courseName}`,
          text: text,
        });
      } catch (err) {
        console.log('Share dismissed or failed:', err);
      }
    } else {
      handleCopySummary();
    }
  };

  return (
    <div className="space-y-4 pb-20">
      {/* Top Banner */}
      <div className="bg-gradient-to-br from-emerald-950 via-slate-900 to-slate-900 border border-emerald-800/80 rounded-2xl p-4 shadow-xl">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold text-xl border border-emerald-500/30">
              🏆
            </div>
            <div>
              <h2 className="text-base font-black text-white">Banker Standings & Settlement</h2>
              <p className="text-xs text-slate-400">
                {round.courseName} • {playedHoles} of {round.settings.totalHoles} holes completed
              </p>
            </div>
          </div>

          <button
            onClick={handleShare}
            className="p-2.5 rounded-xl bg-emerald-500 text-slate-950 font-bold hover:bg-emerald-400 transition active:scale-95 shadow-md flex items-center gap-1.5 text-xs"
          >
            <Share2 className="w-4 h-4" />
            <span className="hidden sm:inline">Share</span>
          </button>
        </div>
      </div>

      {/* LEADERBOARD CARDS */}
      <div className="space-y-2.5">
        <div className="flex items-center justify-between px-1">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
            Current Net Balances
          </h3>
          <span className="text-[11px] text-slate-500">Zero-Sum Ledger</span>
        </div>

        {sortedStats.map((playerStat, index) => {
          const isLeader = index === 0 && playerStat.netWinnings > 0;
          const isNegative = playerStat.netWinnings < 0;

          return (
            <div
              key={playerStat.playerId}
              className={`bg-slate-900 border rounded-2xl p-3.5 shadow-md transition-all ${
                isLeader
                  ? 'border-emerald-500/80 bg-gradient-to-r from-slate-900 via-slate-900 to-emerald-950/40'
                  : 'border-slate-800'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2.5">
                  <div
                    className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-black text-white shadow-sm shrink-0"
                    style={{ backgroundColor: playerStat.color }}
                  >
                    #{index + 1}
                  </div>
                  <div>
                    <h4 className="text-sm font-black text-white flex items-center gap-1.5">
                      {playerStat.name}
                      {isLeader && <span className="text-xs">👑 Leader</span>}
                    </h4>
                    <div className="text-[11px] text-slate-400 font-medium">
                      Gross: <span className="text-slate-200 font-semibold">{playerStat.grossTotal || '-'}</span>
                      {playerStat.holesPlayed > 0 && (
                        <span className="ml-1 text-slate-400">
                          ({playerStat.toParGross > 0 ? `+${playerStat.toParGross}` : playerStat.toParGross === 0 ? 'E' : playerStat.toParGross})
                        </span>
                      )}
                      {' • '}Banked {playerStat.bankerHolesCount} holes
                    </div>
                  </div>
                </div>

                {/* Net Dollar Payout */}
                <div className="text-right">
                  <div
                    className={`text-xl font-black ${
                      playerStat.netWinnings > 0
                        ? 'text-emerald-400'
                        : isNegative
                        ? 'text-rose-400'
                        : 'text-slate-300'
                    }`}
                  >
                    {playerStat.netWinnings > 0
                      ? `+$${playerStat.netWinnings.toFixed(2)}`
                      : isNegative
                      ? `-$${Math.abs(playerStat.netWinnings).toFixed(2)}`
                      : '$0.00'}
                  </div>
                  <span className="text-[10px] text-slate-400 block font-medium">
                    {playerStat.matchesWon}W - {playerStat.matchesLost}L - {playerStat.matchesPushed}T
                  </span>
                </div>
              </div>

              {/* Player Stats Mini Pills */}
              <div className="grid grid-cols-3 gap-1.5 pt-2 border-t border-slate-800/80 text-[10px]">
                <div className="bg-slate-950/60 p-1.5 rounded-lg text-center">
                  <span className="text-slate-500 block">Birdies / Eagles</span>
                  <span className="text-slate-200 font-bold">
                    {playerStat.birdiesCount} / {playerStat.eaglesCount}
                  </span>
                </div>
                <div className="bg-slate-950/60 p-1.5 rounded-lg text-center">
                  <span className="text-slate-500 block">Best Hole</span>
                  <span className="text-emerald-400 font-bold">
                    {playerStat.biggestHoleWin > 0 ? `+$${playerStat.biggestHoleWin}` : '$0'}
                  </span>
                </div>
                <div className="bg-slate-950/60 p-1.5 rounded-lg text-center">
                  <span className="text-slate-500 block">Worst Hole</span>
                  <span className="text-rose-400 font-bold">
                    {playerStat.biggestHoleLoss < 0 ? `-$${Math.abs(playerStat.biggestHoleLoss)}` : '$0'}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* VENMO / CASH SETTLEMENT MATRIX */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-xl space-y-3">
        <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
          <div className="flex items-center gap-2">
            <DollarSign className="w-4 h-4 text-emerald-400" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-200">
              Simplified Venmo / Cash Transfers
            </h3>
          </div>
          <span className="text-[11px] text-emerald-400 font-medium">Fewest Payments</span>
        </div>

        {settlements.length > 0 ? (
          <div className="space-y-2">
            {settlements.map((transfer, idx) => {
              const fromPlayer = round.players.find((p) => p.id === transfer.fromPlayerId);
              const toPlayer = round.players.find((p) => p.id === transfer.toPlayerId);

              return (
                <div
                  key={idx}
                  className="bg-slate-950/80 border border-slate-800 rounded-xl p-3 flex items-center justify-between"
                >
                  <div className="flex items-center gap-2">
                    {/* From */}
                    <div className="flex items-center gap-1.5">
                      <div
                        className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold text-white"
                        style={{ backgroundColor: fromPlayer?.color }}
                      >
                        {fromPlayer?.name.charAt(0)}
                      </div>
                      <span className="text-xs font-bold text-white">{fromPlayer?.name}</span>
                    </div>

                    <span className="text-slate-500 text-xs">pays</span>

                    {/* To */}
                    <div className="flex items-center gap-1.5">
                      <div
                        className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold text-white"
                        style={{ backgroundColor: toPlayer?.color }}
                      >
                        {toPlayer?.name.charAt(0)}
                      </div>
                      <span className="text-xs font-bold text-emerald-400">{toPlayer?.name}</span>
                    </div>
                  </div>

                  {/* Amount */}
                  <div className="text-base font-black text-white px-2.5 py-1 rounded-lg bg-emerald-500/20 border border-emerald-500/30">
                    ${transfer.amount.toFixed(2)}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-4 text-xs text-slate-400">
            🤝 All balances are perfectly even! No cash transfers needed.
          </div>
        )}

        {/* Copy Text Summary Button */}
        <div className="pt-2">
          <button
            onClick={handleCopySummary}
            className={`w-full py-3 px-4 rounded-xl border text-xs font-bold transition flex items-center justify-center gap-2 active:scale-95 ${
              copied
                ? 'bg-emerald-600 text-white border-emerald-500'
                : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700'
            }`}
          >
            {copied ? (
              <>
                <Check className="w-4 h-4 text-emerald-300" /> Copied Recap to Clipboard!
              </>
            ) : (
              <>
                <Copy className="w-4 h-4" /> Copy Group Chat Summary (iMessage / WhatsApp)
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
