import React, { useState, useMemo } from 'react';
import { RoundState } from '../types';
import { calculatePlayerStats } from '../utils/bankerEngine';
import { Table as TableIcon, Layers } from 'lucide-react';

interface ScorecardViewProps {
  round: RoundState;
  onSelectHole: (holeNum: number) => void;
}

export const ScorecardView: React.FC<ScorecardViewProps> = ({
  round,
  onSelectHole,
}) => {
  const [viewMode, setViewMode] = useState<'both' | 'scores' | 'money' | 'cumulative'>('both');
  const [holeRange, setHoleRange] = useState<'all' | 'front9' | 'back9'>('all');
  const totalHoles = round.settings.totalHoles;

  const stats = calculatePlayerStats(round);

  // Compute 9-hole splits (Front 9 & Back 9) for all players
  const playerNineHoleSummaries = useMemo(() => {
    const map: Record<
      string,
      {
        front9Gross: number;
        front9Net: number;
        front9Money: number;
        front9Played: number;
        back9Gross: number;
        back9Net: number;
        back9Money: number;
        back9Played: number;
      }
    > = {};

    round.players.forEach((p) => {
      let fGross = 0,
        fNet = 0,
        fMoney = 0,
        fPlayed = 0;
      let bGross = 0,
        bNet = 0,
        bMoney = 0,
        bPlayed = 0;

      round.holes.forEach((h) => {
        const hData = round.holesData[h.holeNumber];
        const gross = hData?.scores[p.id];
        const strokes = h.playerStrokes[p.id] || 0;
        const money = hData?.settlement?.playerDeltas[p.id] || 0;

        if (gross !== null && gross !== undefined) {
          const net = gross - strokes;
          if (h.holeNumber <= 9) {
            fGross += gross;
            fNet += net;
            fPlayed += 1;
          } else {
            bGross += gross;
            bNet += net;
            bPlayed += 1;
          }
        }

        if (hData?.settlement) {
          if (h.holeNumber <= 9) {
            fMoney += money;
          } else {
            bMoney += money;
          }
        }
      });

      map[p.id] = {
        front9Gross: fGross,
        front9Net: fNet,
        front9Money: fMoney,
        front9Played: fPlayed,
        back9Gross: bGross,
        back9Net: bNet,
        back9Money: bMoney,
        back9Played: bPlayed,
      };
    });

    return map;
  }, [round]);

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

  const front9Holes = round.holes.filter((h) => h.holeNumber <= 9);
  const back9Holes = round.holes.filter((h) => h.holeNumber > 9);

  const front9Par = front9Holes.reduce((sum, h) => sum + h.par, 0);
  const back9Par = back9Holes.reduce((sum, h) => sum + h.par, 0);
  const totalPar = round.holes.reduce((sum, h) => sum + h.par, 0);

  // Helper to format golf score badge
  const renderScoreCell = (
    gross: number | null | undefined,
    par: number,
    strokes: number,
    isBanker: boolean,
    netDollar: number | undefined,
    playerId: string,
    holeNum: number
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

        {/* Cumulative running money balance */}
        {viewMode === 'cumulative' && (
          <span
            className={`text-[10px] font-black mt-0.5 px-1.5 py-0.2 rounded ${
              (cumulativeBalances[playerId]?.[holeNum] || 0) > 0
                ? 'text-emerald-300 bg-emerald-950/80 border border-emerald-700/60'
                : (cumulativeBalances[playerId]?.[holeNum] || 0) < 0
                ? 'text-rose-300 bg-rose-950/80 border border-rose-700/60'
                : 'text-slate-400 bg-slate-950'
            }`}
          >
            {(cumulativeBalances[playerId]?.[holeNum] || 0) > 0
              ? `+$${cumulativeBalances[playerId][holeNum]}`
              : (cumulativeBalances[playerId]?.[holeNum] || 0) < 0
              ? `-$${Math.abs(cumulativeBalances[playerId][holeNum])}`
              : '$0'}
          </span>
        )}
      </div>
    );
  };

  // Helper to format OUT / IN 9-hole summary subtotal cell
  const renderNineHoleSummaryCell = (
    gross: number,
    net: number,
    money: number,
    playedCount: number,
    par: number
  ) => {
    if (playedCount === 0) {
      return (
        <div className="flex flex-col items-center justify-center py-1.5 min-w-[46px] text-slate-600">
          <span>-</span>
        </div>
      );
    }

    const diff = gross - par;
    const diffStr = diff > 0 ? `+${diff}` : diff === 0 ? 'E' : `${diff}`;

    return (
      <div className="flex flex-col items-center justify-center py-1 min-w-[48px]">
        {/* Gross & Net for 9 Holes */}
        {(viewMode === 'both' || viewMode === 'scores') && (
          <div className="flex flex-col items-center">
            <div className="font-black text-xs text-white flex items-center gap-0.5">
              <span>{gross}</span>
              {playedCount === 9 && (
                <span className="text-[9px] font-normal text-slate-400">({diffStr})</span>
              )}
            </div>
            <div className="text-[10px] text-slate-400 font-medium">Net {net}</div>
          </div>
        )}

        {/* 9-Hole Net $ Winnings Delta */}
        {(viewMode === 'both' || viewMode === 'money' || viewMode === 'cumulative') && (
          <span
            className={`text-[10px] font-black mt-0.5 px-1.5 py-0.2 rounded ${
              money > 0
                ? 'text-emerald-300 bg-emerald-950/90 border border-emerald-700/70'
                : money < 0
                ? 'text-rose-300 bg-rose-950/90 border border-rose-700/70'
                : 'text-slate-400 bg-slate-950'
            }`}
          >
            {money > 0 ? `+$${money}` : money < 0 ? `-$${Math.abs(money)}` : '$0'}
          </span>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-4 pb-20">
      {/* Header & Controls */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-3.5 shadow-lg space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <TableIcon className="w-4 h-4 text-emerald-400" /> Full Round Scorecard
            </h2>
            <p className="text-xs text-slate-400">
              {round.courseName} • {totalHoles} Holes (Par {totalPar})
            </p>
          </div>

          {/* View Mode Toggle */}
          <div className="flex bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs overflow-x-auto">
            <button
              onClick={() => setViewMode('both')}
              className={`px-2 py-1 rounded-lg font-semibold transition text-[11px] ${
                viewMode === 'both' ? 'bg-emerald-500 text-slate-950 font-bold' : 'text-slate-400'
              }`}
            >
              All
            </button>
            <button
              onClick={() => setViewMode('scores')}
              className={`px-2 py-1 rounded-lg font-semibold transition text-[11px] ${
                viewMode === 'scores' ? 'bg-emerald-500 text-slate-950 font-bold' : 'text-slate-400'
              }`}
            >
              Scores
            </button>
            <button
              onClick={() => setViewMode('money')}
              className={`px-2 py-1 rounded-lg font-semibold transition text-[11px] ${
                viewMode === 'money' ? 'bg-emerald-500 text-slate-950 font-bold' : 'text-slate-400'
              }`}
            >
              Hole $
            </button>
            <button
              onClick={() => setViewMode('cumulative')}
              className={`px-2 py-1 rounded-lg font-semibold transition text-[11px] ${
                viewMode === 'cumulative' ? 'bg-emerald-500 text-slate-950 font-bold' : 'text-slate-400'
              }`}
            >
              Total $
            </button>
          </div>
        </div>

        {/* 9-Hole Segmented Filter Bar (For 18-hole rounds) */}
        {totalHoles === 18 && (
          <div className="flex items-center justify-between pt-2 border-t border-slate-800/80">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1">
              <Layers className="w-3.5 h-3.5 text-emerald-400" /> 9-Hole View:
            </span>

            <div className="flex bg-slate-950 p-0.5 rounded-xl border border-slate-800 text-xs">
              <button
                type="button"
                onClick={() => setHoleRange('all')}
                className={`px-2.5 py-1 rounded-lg font-bold transition text-[11px] ${
                  holeRange === 'all'
                    ? 'bg-emerald-500 text-slate-950 shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                All 18
              </button>
              <button
                type="button"
                onClick={() => setHoleRange('front9')}
                className={`px-2.5 py-1 rounded-lg font-bold transition text-[11px] ${
                  holeRange === 'front9'
                    ? 'bg-emerald-500 text-slate-950 shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Front 9 (OUT)
              </button>
              <button
                type="button"
                onClick={() => setHoleRange('back9')}
                className={`px-2.5 py-1 rounded-lg font-bold transition text-[11px] ${
                  holeRange === 'back9'
                    ? 'bg-emerald-500 text-slate-950 shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Back 9 (IN)
              </button>
            </div>
          </div>
        )}
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

                {/* Front 9 Holes */}
                {(holeRange === 'all' || holeRange === 'front9') &&
                  front9Holes.map((h) => (
                    <th
                      key={h.holeNumber}
                      onClick={() => onSelectHole(h.holeNumber)}
                      className="p-2 text-center cursor-pointer hover:bg-slate-800 transition min-w-[44px]"
                    >
                      <div className="font-black text-slate-200">#{h.holeNumber}</div>
                      <div className="text-[10px] text-slate-500 font-normal">P{h.par}</div>
                    </th>
                  ))}

                {/* OUT Column (Front 9 Total) */}
                {(holeRange === 'all' || holeRange === 'front9') && (
                  <th className="p-2 text-center font-black text-emerald-400 bg-slate-950 border-x border-slate-800 min-w-[52px]">
                    <div>OUT</div>
                    <div className="text-[10px] text-emerald-300 font-bold">P{front9Par}</div>
                  </th>
                )}

                {/* Back 9 Holes */}
                {(holeRange === 'all' || holeRange === 'back9') &&
                  back9Holes.map((h) => (
                    <th
                      key={h.holeNumber}
                      onClick={() => onSelectHole(h.holeNumber)}
                      className="p-2 text-center cursor-pointer hover:bg-slate-800 transition min-w-[44px]"
                    >
                      <div className="font-black text-slate-200">#{h.holeNumber}</div>
                      <div className="text-[10px] text-slate-500 font-normal">P{h.par}</div>
                    </th>
                  ))}

                {/* IN Column (Back 9 Total) */}
                {totalHoles === 18 && (holeRange === 'all' || holeRange === 'back9') && (
                  <th className="p-2 text-center font-black text-emerald-400 bg-slate-950 border-x border-slate-800 min-w-[52px]">
                    <div>IN</div>
                    <div className="text-[10px] text-emerald-300 font-bold">P{back9Par}</div>
                  </th>
                )}

                {/* Total Column */}
                <th className="p-2 text-center font-bold text-white bg-slate-950 border-l border-slate-800 min-w-[52px]">
                  <div>TOT</div>
                  <div className="text-[10px] text-slate-400 font-normal">P{totalPar}</div>
                </th>

                {/* Net Dollar Total Column */}
                <th className="p-2 text-center font-bold text-amber-400 bg-slate-950 border-l border-slate-800 min-w-[62px]">
                  NET $
                </th>
              </tr>

              {/* Stroke Index Row */}
              <tr className="bg-slate-950/60 text-slate-500 border-b border-slate-800 text-[10px]">
                <th className="p-1.5 px-3 sticky left-0 z-20 bg-slate-950 font-medium border-r border-slate-800">
                  Stroke Index
                </th>

                {/* Front 9 SI */}
                {(holeRange === 'all' || holeRange === 'front9') &&
                  front9Holes.map((h) => (
                    <td key={h.holeNumber} className="p-1 text-center font-semibold text-slate-400">
                      {h.handicapRank}
                    </td>
                  ))}

                {/* OUT SI separator */}
                {(holeRange === 'all' || holeRange === 'front9') && (
                  <td className="p-1 text-center bg-slate-950 border-x border-slate-800 font-bold text-slate-400">
                    -
                  </td>
                )}

                {/* Back 9 SI */}
                {(holeRange === 'all' || holeRange === 'back9') &&
                  back9Holes.map((h) => (
                    <td key={h.holeNumber} className="p-1 text-center font-semibold text-slate-400">
                      {h.handicapRank}
                    </td>
                  ))}

                {/* IN SI separator */}
                {totalHoles === 18 && (holeRange === 'all' || holeRange === 'back9') && (
                  <td className="p-1 text-center bg-slate-950 border-x border-slate-800 font-bold text-slate-400">
                    -
                  </td>
                )}

                <td className="p-1 text-center bg-slate-950 border-l border-slate-800 font-bold text-slate-400">
                  -
                </td>
                <td className="p-1 text-center bg-slate-950 border-l border-slate-800 font-bold text-slate-400">
                  -
                </td>
              </tr>
            </thead>

            {/* Body: Player Rows */}
            <tbody className="divide-y divide-slate-800">
              {round.players.map((player) => {
                const pStats = stats.find((s) => s.playerId === player.id);
                const summary = playerNineHoleSummaries[player.id];

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

                    {/* Front 9 Hole Cells */}
                    {(holeRange === 'all' || holeRange === 'front9') &&
                      front9Holes.map((hole) => {
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
                            {renderScoreCell(
                              gross,
                              hole.par,
                              strokes,
                              isBanker,
                              netDollar,
                              player.id,
                              hole.holeNumber
                            )}
                          </td>
                        );
                      })}

                    {/* OUT (Front 9 Total) Cell */}
                    {(holeRange === 'all' || holeRange === 'front9') && (
                      <td className="p-1 text-center bg-slate-950/80 border-x border-slate-800">
                        {renderNineHoleSummaryCell(
                          summary?.front9Gross || 0,
                          summary?.front9Net || 0,
                          summary?.front9Money || 0,
                          summary?.front9Played || 0,
                          front9Par
                        )}
                      </td>
                    )}

                    {/* Back 9 Hole Cells */}
                    {(holeRange === 'all' || holeRange === 'back9') &&
                      back9Holes.map((hole) => {
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
                            {renderScoreCell(
                              gross,
                              hole.par,
                              strokes,
                              isBanker,
                              netDollar,
                              player.id,
                              hole.holeNumber
                            )}
                          </td>
                        );
                      })}

                    {/* IN (Back 9 Total) Cell */}
                    {totalHoles === 18 && (holeRange === 'all' || holeRange === 'back9') && (
                      <td className="p-1 text-center bg-slate-950/80 border-x border-slate-800">
                        {renderNineHoleSummaryCell(
                          summary?.back9Gross || 0,
                          summary?.back9Net || 0,
                          summary?.back9Money || 0,
                          summary?.back9Played || 0,
                          back9Par
                        )}
                      </td>
                    )}

                    {/* Total Gross / Net Score */}
                    <td className="p-2 text-center bg-slate-950 border-l border-slate-800 font-bold text-xs text-white">
                      <div>{pStats?.grossTotal || '-'}</div>
                      <div className="text-[10px] text-slate-400 font-normal">
                        Net: {pStats?.netTotal || '-'}
                      </div>
                    </td>

                    {/* Total Net $ Winnings */}
                    <td className="p-2 text-center bg-slate-950 border-l border-slate-800 font-black text-xs">
                      <span
                        className={`inline-block px-1.5 py-0.5 rounded-md border text-[11px] font-black ${
                          (pStats?.netWinnings || 0) > 0
                            ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40'
                            : (pStats?.netWinnings || 0) < 0
                            ? 'bg-rose-500/20 text-rose-400 border-rose-500/40'
                            : 'bg-slate-800 text-slate-400 border-slate-700'
                        }`}
                      >
                        {(pStats?.netWinnings || 0) > 0
                          ? `+$${pStats?.netWinnings}`
                          : (pStats?.netWinnings || 0) < 0
                          ? `-$${Math.abs(pStats?.netWinnings || 0)}`
                          : '$0'}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* 9-HOLE SPLITS & FRONT/BACK NINE COMPARISON SECTION */}
      {totalHoles === 18 && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-xl space-y-3">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
            <div className="flex items-center gap-2">
              <Layers className="w-4 h-4 text-emerald-400" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-200">
                9-Hole Splits (Front 9 vs Back 9)
              </h3>
            </div>
            <span className="text-[11px] text-slate-400">OUT & IN Breakdown</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {round.players.map((player) => {
              const summary = playerNineHoleSummaries[player.id];
              const pStats = stats.find((s) => s.playerId === player.id);

              return (
                <div
                  key={player.id}
                  className="bg-slate-950/80 border border-slate-800 rounded-xl p-3 space-y-2"
                >
                  {/* Player header */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div
                        className="w-4 h-4 rounded-full"
                        style={{ backgroundColor: player.color }}
                      />
                      <span className="font-bold text-xs text-white">{player.name}</span>
                      <span className="text-[10px] text-slate-500">Hcp {player.handicap}</span>
                    </div>

                    <span
                      className={`text-xs font-black ${
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
                    </span>
                  </div>

                  {/* Splits Comparison Grid */}
                  <div className="grid grid-cols-2 gap-2 text-[11px] pt-1 border-t border-slate-900">
                    {/* Front 9 (OUT) */}
                    <div className="bg-slate-900/90 rounded-lg p-2 border border-slate-800">
                      <div className="text-[10px] uppercase font-bold text-emerald-400 flex items-center justify-between">
                        <span>Front 9 (OUT)</span>
                        <span className="text-slate-400 font-normal">P{front9Par}</span>
                      </div>
                      <div className="mt-1 flex items-baseline justify-between">
                        <span className="text-slate-300 font-bold">
                          {summary?.front9Played > 0 ? summary.front9Gross : '-'}
                          {summary?.front9Played > 0 && (
                            <span className="text-[10px] text-slate-400 font-normal ml-1">
                              (Net {summary.front9Net})
                            </span>
                          )}
                        </span>
                        <span
                          className={`font-black ${
                            (summary?.front9Money || 0) > 0
                              ? 'text-emerald-400'
                              : (summary?.front9Money || 0) < 0
                              ? 'text-rose-400'
                              : 'text-slate-400'
                          }`}
                        >
                          {(summary?.front9Money || 0) > 0
                            ? `+$${summary?.front9Money}`
                            : (summary?.front9Money || 0) < 0
                            ? `-$${Math.abs(summary?.front9Money || 0)}`
                            : '$0'}
                        </span>
                      </div>
                    </div>

                    {/* Back 9 (IN) */}
                    <div className="bg-slate-900/90 rounded-lg p-2 border border-slate-800">
                      <div className="text-[10px] uppercase font-bold text-emerald-400 flex items-center justify-between">
                        <span>Back 9 (IN)</span>
                        <span className="text-slate-400 font-normal">P{back9Par}</span>
                      </div>
                      <div className="mt-1 flex items-baseline justify-between">
                        <span className="text-slate-300 font-bold">
                          {summary?.back9Played > 0 ? summary.back9Gross : '-'}
                          {summary?.back9Played > 0 && (
                            <span className="text-[10px] text-slate-400 font-normal ml-1">
                              (Net {summary.back9Net})
                            </span>
                          )}
                        </span>
                        <span
                          className={`font-black ${
                            (summary?.back9Money || 0) > 0
                              ? 'text-emerald-400'
                              : (summary?.back9Money || 0) < 0
                              ? 'text-rose-400'
                              : 'text-slate-400'
                          }`}
                        >
                          {(summary?.back9Money || 0) > 0
                            ? `+$${summary?.back9Money}`
                            : (summary?.back9Money || 0) < 0
                            ? `-$${Math.abs(summary?.back9Money || 0)}`
                            : '$0'}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Legend Card */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-3 flex flex-wrap gap-4 text-xs text-slate-400 items-center justify-center">
        <div className="flex items-center gap-1.5">
          <span className="w-4 h-4 rounded-full bg-amber-500/20 border-2 border-amber-400 text-amber-300 flex items-center justify-center text-[10px] font-bold">
            🦅
          </span>
          <span>Eagle / Par-3 Triples (3x/9x)</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-4 h-4 rounded-full bg-emerald-500/20 border border-emerald-400 text-emerald-400 flex items-center justify-center text-[10px] font-bold">
            -1
          </span>
          <span>Birdie / Double (2x/4x)</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-emerald-400 font-black text-xs">OUT / IN</span>
          <span>9-Hole Subtotal</span>
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
