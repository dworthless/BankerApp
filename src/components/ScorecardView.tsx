import React, { useState } from 'react';
import { RoundState } from '../types';
import { calculatePlayerStats } from '../utils/bankerEngine';
import { Table as TableIcon } from 'lucide-react';

interface ScorecardViewProps {
  round: RoundState;
  onSelectHole: (holeNum: number) => void;
}

export const ScorecardView: React.FC<ScorecardViewProps> = ({
  round,
  onSelectHole,
}) => {
  const [viewMode, setViewMode] = useState<'both' | 'scores' | 'money'>('both');
  const totalHoles = round.settings.totalHoles;

  const stats = calculatePlayerStats(round);

  // Helper to format golf score badge
  const renderScoreCell = (
    gross: number | null | undefined,
    par: number,
    strokes: number,
    isBanker: boolean,
    netDollar: number | undefined
  ) => {
    if (gross === null || gross === undefined) {
      return (
        <div className="flex flex-col items-center justify-center py-1.5 min-w-[38px] text-slate-600">
          <span>-</span>
          {isBanker && <span className="text-[9px] text-emerald-500 font-bold">🏦</span>}
        </div>
      );
    }

    const net = gross - strokes;
    const diff = gross - par;

    let scoreBadgeClass = 'text-slate-200';
    if (diff <= -2) {
      // Eagle
      scoreBadgeClass =
        'w-6 h-6 rounded-full bg-amber-500/20 text-amber-300 border-2 border-amber-400 font-black';
    } else if (diff === -1) {
      // Birdie
      scoreBadgeClass =
        'w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-400 font-bold';
    } else if (diff === 0) {
      // Par
      scoreBadgeClass = 'font-semibold text-slate-200';
    } else if (diff === 1) {
      // Bogey
      scoreBadgeClass =
        'w-6 h-6 rounded-md bg-slate-800 text-slate-300 border border-slate-700 font-medium';
    } else {
      // Double Bogey+
      scoreBadgeClass =
        'w-6 h-6 rounded-md bg-slate-950 text-slate-400 border border-slate-800 font-medium';
    }

    return (
      <div className="flex flex-col items-center justify-center py-1 min-w-[42px]">
        {/* Gross & Net badge */}
        {(viewMode === 'both' || viewMode === 'scores') && (
          <div className="flex flex-col items-center">
            <div className={`flex items-center justify-center text-xs ${scoreBadgeClass}`}>
              {gross}
            </div>
            <div className="text-[10px] text-slate-400 leading-tight mt-0.5">
              Net {net}
              {strokes > 0 && <span className="text-amber-400 ml-0.5">{'•'.repeat(strokes)}</span>}
            </div>
          </div>
        )}

        {/* Banker Indicator */}
        {isBanker && (
          <span className="text-[9px] font-black text-emerald-400 bg-emerald-950/80 px-1 rounded border border-emerald-800/80 mt-0.5">
            🏦 BANK
          </span>
        )}

        {/* Money delta on hole */}
        {(viewMode === 'both' || viewMode === 'money') && netDollar !== undefined && (
          <span
            className={`text-[10px] font-bold mt-0.5 px-1 rounded ${
              netDollar > 0
                ? 'text-emerald-400 bg-emerald-950/60'
                : netDollar < 0
                ? 'text-rose-400 bg-rose-950/60'
                : 'text-slate-500'
            }`}
          >
            {netDollar > 0 ? `+$${netDollar}` : netDollar < 0 ? `-$${Math.abs(netDollar)}` : '$0'}
          </span>
        )}
      </div>
    );
  };

  // Compute cumulative balance hole-by-hole for each player
  const cumulativeBalances: Record<string, Record<number, number>> = {};
  round.players.forEach((p) => {
    cumulativeBalances[p.id] = {};
    let running = 0;
    for (let h = 1; h <= totalHoles; h++) {
      const hData = round.holesData[h];
      const delta = hData?.settlement?.playerDeltas[p.id] || 0;
      running += delta;
      cumulativeBalances[p.id][h] = running;
    }
  });

  return (
    <div className="space-y-4 pb-20">
      {/* Header & Controls */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-3.5 shadow-lg flex items-center justify-between">
        <div>
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <TableIcon className="w-4 h-4 text-emerald-400" /> Full Round Scorecard
          </h2>
          <p className="text-xs text-slate-400">
            {round.courseName} • {totalHoles} Holes
          </p>
        </div>

        {/* View Mode Toggle */}
        <div className="flex bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs">
          <button
            onClick={() => setViewMode('both')}
            className={`px-2.5 py-1 rounded-lg font-semibold transition ${
              viewMode === 'both' ? 'bg-emerald-500 text-slate-950' : 'text-slate-400'
            }`}
          >
            All
          </button>
          <button
            onClick={() => setViewMode('scores')}
            className={`px-2.5 py-1 rounded-lg font-semibold transition ${
              viewMode === 'scores' ? 'bg-emerald-500 text-slate-950' : 'text-slate-400'
            }`}
          >
            Scores
          </button>
          <button
            onClick={() => setViewMode('money')}
            className={`px-2.5 py-1 rounded-lg font-semibold transition ${
              viewMode === 'money' ? 'bg-emerald-500 text-slate-950' : 'text-slate-400'
            }`}
          >
            $ Net
          </button>
        </div>
      </div>

      {/* Main Scorecard Table (Horizontally Scrollable) */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left border-collapse min-w-[700px]">
            {/* Header row: Holes */}
            <thead>
              <tr className="bg-slate-950 text-slate-400 border-b border-slate-800">
                <th className="p-3 sticky left-0 z-20 bg-slate-950 font-bold text-white w-28 border-r border-slate-800">
                  HOLE
                </th>
                {round.holes.map((h) => (
                  <th
                    key={h.holeNumber}
                    onClick={() => onSelectHole(h.holeNumber)}
                    className="p-2 text-center cursor-pointer hover:bg-slate-800 transition min-w-[44px]"
                  >
                    <div className="font-black text-slate-200">#{h.holeNumber}</div>
                    <div className="text-[10px] text-slate-500 font-normal">P{h.par}</div>
                  </th>
                ))}
                <th className="p-2 text-center font-bold text-emerald-400 bg-slate-950/80 border-l border-slate-800 min-w-[50px]">
                  TOT
                </th>
                <th className="p-2 text-center font-bold text-amber-400 bg-slate-950/80 border-l border-slate-800 min-w-[60px]">
                  NET $
                </th>
              </tr>

              {/* Stroke Index Row */}
              <tr className="bg-slate-950/60 text-slate-500 border-b border-slate-800 text-[10px]">
                <th className="p-1.5 px-3 sticky left-0 z-20 bg-slate-950 font-medium border-r border-slate-800">
                  Stroke Index
                </th>
                {round.holes.map((h) => (
                  <td key={h.holeNumber} className="p-1 text-center font-semibold text-slate-400">
                    {h.handicapRank}
                  </td>
                ))}
                <td className="p-1 text-center bg-slate-950/80 border-l border-slate-800 font-bold">
                  {round.holes.reduce((sum, h) => sum + h.par, 0)}
                </td>
                <td className="p-1 text-center bg-slate-950/80 border-l border-slate-800 font-bold text-slate-400">
                  -
                </td>
              </tr>
            </thead>

            {/* Body: Player Rows */}
            <tbody className="divide-y divide-slate-800">
              {round.players.map((player) => {
                const pStats = stats.find((s) => s.playerId === player.id);

                return (
                  <tr key={player.id} className="hover:bg-slate-800/30 transition">
                    {/* Sticky Player Column */}
                    <td className="p-2.5 px-3 sticky left-0 z-20 bg-slate-900 border-r border-slate-800 shadow-md">
                      <div className="flex items-center gap-1.5">
                        <div
                          className="w-3.5 h-3.5 rounded-full shrink-0"
                          style={{ backgroundColor: player.color }}
                        />
                        <span className="font-bold text-white text-xs truncate max-w-[80px]">
                          {player.name}
                        </span>
                      </div>
                      <div className="text-[10px] text-slate-400 font-medium mt-0.5">
                        Hcp: {player.handicap}
                      </div>
                    </td>

                    {/* Hole Cells */}
                    {round.holes.map((hole) => {
                      const hData = round.holesData[hole.holeNumber];
                      const gross = hData?.scores[player.id];
                      const strokes = hole.playerStrokes[player.id] || 0;
                      const isBanker = hData?.bankerId === player.id;
                      const netDollar = hData?.settlement?.playerDeltas[player.id];

                      return (
                        <td
                          key={hole.holeNumber}
                          onClick={() => onSelectHole(hole.holeNumber)}
                          className={`p-1 text-center cursor-pointer hover:bg-slate-800/60 transition ${
                            hole.holeNumber === round.currentHole ? 'bg-emerald-950/30' : ''
                          }`}
                        >
                          {renderScoreCell(gross, hole.par, strokes, isBanker, netDollar)}
                        </td>
                      );
                    })}

                    {/* Total Gross / Net Score */}
                    <td className="p-2 text-center bg-slate-950/40 border-l border-slate-800 font-bold text-xs text-white">
                      <div>{pStats?.grossTotal || '-'}</div>
                      <div className="text-[10px] text-slate-400 font-normal">
                        Net: {pStats?.netTotal || '-'}
                      </div>
                    </td>

                    {/* Total Net $ Winnings */}
                    <td
                      className={`p-2 text-center bg-slate-950/40 border-l border-slate-800 font-black text-xs ${
                        (pStats?.netWinnings || 0) > 0
                          ? 'text-emerald-400'
                          : (pStats?.netWinnings || 0) < 0
                          ? 'text-rose-400'
                          : 'text-slate-400'
                      }`}
                    >
                      {(pStats?.netWinnings || 0) > 0
                        ? `+$${pStats?.netWinnings}`
                        : (pStats?.netWinnings || 0) < 0
                        ? `-$${Math.abs(pStats?.netWinnings || 0)}`
                        : '$0'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Legend Card */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-3 flex flex-wrap gap-4 text-xs text-slate-400 items-center justify-center">
        <div className="flex items-center gap-1.5">
          <span className="w-4 h-4 rounded-full bg-amber-500/20 border-2 border-amber-400 text-amber-300 flex items-center justify-center text-[10px] font-bold">
            🦅
          </span>
          <span>Eagle / Multiplier (3x)</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-4 h-4 rounded-full bg-emerald-500/20 border border-emerald-400 text-emerald-400 flex items-center justify-center text-[10px] font-bold">
            -1
          </span>
          <span>Birdie (2x)</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-emerald-400 font-black text-xs">🏦 BANK</span>
          <span>Banker on Hole</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-amber-400 font-black text-xs">•</span>
          <span>Handicap Stroke Received</span>
        </div>
      </div>
    </div>
  );
};
