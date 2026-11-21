import React, { useState, useMemo } from 'react';
import {
  HoleConfig,
  HoleData,
  RoundState,
} from '../types';
import { settleHole, calculatePlayerStats } from '../utils/bankerEngine';
import { LiveBalanceBar } from './LiveBalanceBar';
import {
  ArrowRight,
  Award,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  DollarSign,
  Flame,
  Minus,
  Plus,
  TrendingDown,
  TrendingUp,
  UserCheck,
  X,
  Zap,
  Eye,
  Lock,
  Share2,
} from 'lucide-react';

interface HolePlayViewProps {
  round: RoundState;
  onUpdateRound: (updated: RoundState) => void;
  onNavigateTab: (tab: 'hole' | 'scorecard' | 'settlement') => void;
  isSpectator?: boolean;
  onOpenShare?: () => void;
}

export const HolePlayView: React.FC<HolePlayViewProps> = ({
  round,
  onUpdateRound,
  onNavigateTab,
  isSpectator = false,
  onOpenShare,
}) => {
  const currentHoleNum = round.currentHole;
  const holeConfig: HoleConfig =
    round.holes.find((h) => h.holeNumber === currentHoleNum) || round.holes[0];
  const holeData: HoleData = round.holesData[currentHoleNum] || {
    holeNumber: currentHoleNum,
    bankerId: round.players[0].id,
    bets: {},
    presses: {},
    scores: {},
    isComplete: false,
  };

  const [showBankerSelect, setShowBankerSelect] = useState(false);
  const [showBaseBetModal, setShowBaseBetModal] = useState(false);
  const [tempBetAmount, setTempBetAmount] = useState<number>(round.settings.baseBet);

  const banker = round.players.find((p) => p.id === holeData.bankerId) || round.players[0];
  const opponents = round.players.filter((p) => p.id !== banker.id);

  // Overall player stats across all scored holes
  const playerStatsMap = useMemo(() => {
    const map: Record<string, import('../types').PlayerStats> = {};
    calculatePlayerStats(round).forEach((s) => {
      map[s.playerId] = s;
    });
    return map;
  }, [round]);

  // Random draw / Tee flip for Hole 1
  const handleFlipTee = () => {
    const randomIdx = Math.floor(Math.random() * round.players.length);
    const chosen = round.players[randomIdx];
    updateHoleData({ bankerId: chosen.id });
  };

  // Base Bet mid-round update with scope prompt
  const handleApplyBaseBet = (amount: number, scope: 'this_hole' | 'all_remaining') => {
    if (scope === 'this_hole') {
      const updatedBets: Record<string, number> = {};
      opponents.forEach((opp) => {
        updatedBets[opp.id] = amount;
      });
      updateHoleData({ bets: updatedBets });
    } else {
      const updatedHolesData = { ...round.holesData };
      for (let h = currentHoleNum; h <= round.settings.totalHoles; h++) {
        const hData = updatedHolesData[h];
        if (hData) {
          const newBets: Record<string, number> = {};
          round.players.forEach((p) => {
            if (p.id !== hData.bankerId) {
              newBets[p.id] = amount;
            }
          });
          updatedHolesData[h] = {
            ...hData,
            bets: newBets,
          };
        }
      }

      onUpdateRound({
        ...round,
        settings: {
          ...round.settings,
          baseBet: amount,
        },
        holesData: updatedHolesData,
      });
    }

    setShowBaseBetModal(false);
  };

  // Update Hole Par directly on this hole
  const handleUpdateHolePar = (newPar: number) => {
    const updatedHoles = round.holes.map((h) =>
      h.holeNumber === currentHoleNum ? { ...h, par: newPar } : h
    );
    const updatedHoleConfig = { ...holeConfig, par: newPar };

    // Update any existing press details to match new par multiplier if needed
    const updatedPressDetails: Record<string, import('../types').MatchPressInfo> = {};
    const isPar3 = newPar === 3;

    opponents.forEach((opp) => {
      const currentDetail = holeData.pressDetails?.[opp.id];
      if (currentDetail) {
        let mult = 1;
        if (currentDetail.stage === 'pressed') mult = isPar3 ? 3 : 2;
        if (currentDetail.stage === 'redoubled') mult = isPar3 ? 9 : 4;
        updatedPressDetails[opp.id] = {
          ...currentDetail,
          multiplier: mult,
        };
      }
    });

    const updatedHoleData: HoleData = {
      ...holeData,
      pressDetails: Object.keys(updatedPressDetails).length > 0 ? updatedPressDetails : holeData.pressDetails,
    };

    const settlement = settleHole(
      currentHoleNum,
      updatedHoleConfig,
      updatedHoleData,
      round.players,
      round.settings,
      currentHoleNum + 1
    );

    updatedHoleData.settlement = settlement;

    onUpdateRound({
      ...round,
      holes: updatedHoles,
      holesData: {
        ...round.holesData,
        [currentHoleNum]: updatedHoleData,
      },
    });
  };

  // Dynamically adjust player handicap strokes for this specific hole
  const handleAdjustPlayerStrokes = (playerId: string, delta: number) => {
    const currentStrokes = holeConfig.playerStrokes[playerId] || 0;
    const newStrokes = Math.max(0, Math.min(4, currentStrokes + delta));

    const updatedHoles = round.holes.map((h) => {
      if (h.holeNumber !== currentHoleNum) return h;
      return {
        ...h,
        playerStrokes: {
          ...h.playerStrokes,
          [playerId]: newStrokes,
        },
      };
    });

    const updatedHoleConfig = {
      ...holeConfig,
      playerStrokes: {
        ...holeConfig.playerStrokes,
        [playerId]: newStrokes,
      },
    };

    const settlement = settleHole(
      currentHoleNum,
      updatedHoleConfig,
      holeData,
      round.players,
      round.settings,
      currentHoleNum + 1
    );

    const updatedHoleData = {
      ...holeData,
      settlement,
    };

    onUpdateRound({
      ...round,
      holes: updatedHoles,
      holesData: {
        ...round.holesData,
        [currentHoleNum]: updatedHoleData,
      },
    });
  };

  // Helper to update current hole data and auto-calculate settlement
  const updateHoleData = (updates: Partial<HoleData>, nextHoleBankerOverride?: string) => {
    const updatedHoleData: HoleData = {
      ...holeData,
      ...updates,
    };

    // Calculate settlement
    const settlement = settleHole(
      currentHoleNum,
      holeConfig,
      updatedHoleData,
      round.players,
      round.settings,
      currentHoleNum + 1
    );

    updatedHoleData.settlement = settlement;

    const allScoresEntered = round.players.every(
      (p) => updatedHoleData.scores[p.id] !== null && updatedHoleData.scores[p.id] !== undefined
    );
    updatedHoleData.isComplete = allScoresEntered;

    // Next hole banker assignment if available
    const newHolesData = {
      ...round.holesData,
      [currentHoleNum]: updatedHoleData,
    };

    // If next hole exists and this hole is complete or has next banker, seed next hole's banker
    const nextHoleNum = currentHoleNum + 1;
    if (nextHoleNum <= round.settings.totalHoles && newHolesData[nextHoleNum]) {
      const nextBanker = nextHoleBankerOverride || settlement.nextBankerId;
      // Only update next banker if next hole hasn't had scores entered yet
      const nextScores = newHolesData[nextHoleNum].scores;
      const nextHasScores = Object.values(nextScores).some((s) => s !== null && s !== undefined);
      if (!nextHasScores) {
        newHolesData[nextHoleNum] = {
          ...newHolesData[nextHoleNum],
          bankerId: nextBanker,
        };
      }
    }

    onUpdateRound({
      ...round,
      holesData: newHolesData,
    });
  };

  // Multi-level Press & Par-3 Triple handler
  const handleSetPressStage = (
    opponentId: string,
    stage: 'base' | 'pressed' | 'redoubled' | 'conceded',
    caller?: 'opponent' | 'banker',
    concededBy?: 'opponent' | 'banker'
  ) => {
    const isPar3 = holeConfig.par === 3;
    const baseStake = holeData.bets[opponentId] ?? round.settings.baseBet;

    let multiplier = 1;
    let concededAmount = 0;

    if (stage === 'base') {
      multiplier = 1;
    } else if (stage === 'pressed') {
      multiplier = isPar3 ? 3 : 2;
    } else if (stage === 'redoubled') {
      multiplier = isPar3 ? 9 : 4;
    } else if (stage === 'conceded') {
      const prevDetails = holeData.pressDetails?.[opponentId];
      if (prevDetails?.stage === 'redoubled') {
        concededAmount = baseStake * (isPar3 ? 3 : 2);
      } else {
        concededAmount = baseStake;
      }
    }

    const updatedPressDetails = {
      ...(holeData.pressDetails || {}),
      [opponentId]: {
        stage,
        multiplier,
        lastCaller: caller,
        concededBy,
        concededAmount,
      },
    };

    const updatedPresses = {
      ...holeData.presses,
      [opponentId]:
        stage === 'conceded' ? ('declined' as const) : stage === 'base' ? ('none' as const) : ('accepted' as const),
    };

    updateHoleData({
      pressDetails: updatedPressDetails,
      presses: updatedPresses,
    });
  };

  // Score Stepper Handlers
  const handleScoreChange = (playerId: string, delta: number) => {
    const currentScore = holeData.scores[playerId];
    let newScore: number;
    if (currentScore === null || currentScore === undefined) {
      newScore = holeConfig.par + delta;
    } else {
      newScore = Math.max(1, currentScore + delta);
    }

    const newScores = {
      ...holeData.scores,
      [playerId]: newScore,
    };

    updateHoleData({ scores: newScores });
  };

  const handleSetQuickScore = (playerId: string, score: number) => {
    updateHoleData({
      scores: {
        ...holeData.scores,
        [playerId]: score,
      },
    });
  };

  // Bet handlers
  const handleSetBet = (opponentId: string, stake: number) => {
    updateHoleData({
      bets: {
        ...holeData.bets,
        [opponentId]: Math.max(1, stake),
      },
    });
  };

  // Hole Navigation
  const handleGoToHole = (hNum: number) => {
    if (hNum < 1 || hNum > round.settings.totalHoles) return;
    onUpdateRound({
      ...round,
      currentHole: hNum,
    });
  };

  // Manually change Banker on current hole
  const handleSelectBanker = (newBankerId: string) => {
    setShowBankerSelect(false);
    updateHoleData({ bankerId: newBankerId });
  };

  // Settlement calculations
  const settlement =
    holeData.settlement ||
    settleHole(currentHoleNum, holeConfig, holeData, round.players, round.settings);

  // Longest Putt tie-breaker handler
  const handleSelectLongestPutt = (playerId: string) => {
    updateHoleData({ longestPuttPlayerId: playerId });
  };

  // Banker exposure calculations
  const totalBaseExposure = opponents.reduce((sum, opp) => {
    const base = holeData.bets[opp.id] ?? round.settings.baseBet;
    const detail = holeData.pressDetails?.[opp.id];
    if (detail) {
      if (detail.stage === 'conceded') {
        return sum + (detail.concededAmount || base);
      }
      return sum + base * detail.multiplier;
    }
    const press = holeData.presses[opp.id];
    const mult = press === 'accepted' ? (holeConfig.par === 3 ? 3 : 2) : 1;
    return sum + base * mult;
  }, 0);

  const bankerGrossScore = holeData.scores[banker.id];
  const bankerStrokes = holeConfig.playerStrokes[banker.id] || 0;
  const bankerNetScore =
    bankerGrossScore !== null && bankerGrossScore !== undefined
      ? bankerGrossScore - bankerStrokes
      : null;

  // Calculate if there is a tie for lowest net score on the hole
  const validNetScores = round.players
    .map((p) => {
      const gross = holeData.scores[p.id];
      const strokes = holeConfig.playerStrokes[p.id] || 0;
      const net = gross !== null && gross !== undefined ? gross - strokes : null;
      return { player: p, net, gross };
    })
    .filter((s) => s.net !== null) as { player: (typeof round.players)[0]; net: number; gross: number }[];

  const minNetScore = validNetScores.length > 0 ? Math.min(...validNetScores.map((s) => s.net)) : null;
  const lowNetTiedPlayers =
    minNetScore !== null ? validNetScores.filter((s) => s.net === minNetScore) : [];

  const showTiebreakerPicker =
    lowNetTiedPlayers.length > 1 &&
    validNetScores.length >= 2;

  return (
    <div className="space-y-4 pb-20">
      {/* Hole Header & Carousel */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-3.5 shadow-lg">
        {/* Top bar with hole info & nav */}
        <div className="flex items-center justify-between mb-3">
          <button
            onClick={() => handleGoToHole(currentHoleNum - 1)}
            disabled={currentHoleNum === 1}
            className="p-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 disabled:opacity-30 disabled:pointer-events-none transition active:scale-95"
            aria-label="Previous Hole"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>

          <div className="text-center">
            <div className="flex items-center justify-center gap-2">
              <span className="text-2xl font-black text-white tracking-tight">
                HOLE {currentHoleNum}
              </span>
              <span className="px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-400 font-bold text-xs border border-emerald-500/30">
                Par {holeConfig.par}
              </span>
            </div>
            <div className="text-[11px] text-slate-400 mt-0.5 font-medium">
              Stroke Index: <span className="text-slate-200 font-bold">#{holeConfig.handicapRank}</span>
              {holeConfig.par === 3 && (
                <span className="ml-2 text-amber-400 font-semibold">⚡️ Par-3 Triples (3x/9x) Active</span>
              )}
            </div>
          </div>

          <button
            onClick={() => handleGoToHole(currentHoleNum + 1)}
            disabled={currentHoleNum === round.settings.totalHoles}
            className="p-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 disabled:opacity-30 disabled:pointer-events-none transition active:scale-95"
            aria-label="Next Hole"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>

        {/* Par Quick Selector (Change Par Before/During Hole) */}
        {!isSpectator && (
          <div className="flex items-center justify-between mt-2.5 pt-2.5 border-t border-slate-800/80">
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
              Set Hole Par:
            </span>
            <div className="flex gap-1.5">
              {[3, 4, 5].map((pVal) => (
                <button
                  key={pVal}
                  type="button"
                  onClick={() => handleUpdateHolePar(pVal)}
                  className={`px-3 py-1 rounded-xl text-xs font-bold transition active:scale-95 flex items-center gap-1 ${
                    holeConfig.par === pVal
                      ? pVal === 3
                        ? 'bg-amber-500 text-slate-950 font-black shadow-md ring-2 ring-amber-300'
                        : 'bg-emerald-500 text-slate-950 font-black shadow-md ring-2 ring-emerald-300'
                      : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                  }`}
                >
                  Par {pVal}
                  {pVal === 3 && <span className="text-[10px]">⚡️(3x)</span>}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Quick Hole Picker Pill Bar */}
        <div className="flex gap-1.5 overflow-x-auto pb-1 pt-1 scrollbar-none">
          {round.holes.map((h) => {
            const hData = round.holesData[h.holeNumber];
            const isDone = hData?.isComplete;
            const isCurrent = h.holeNumber === currentHoleNum;
            const hBanker = round.players.find((p) => p.id === hData?.bankerId);

            return (
              <button
                key={h.holeNumber}
                onClick={() => handleGoToHole(h.holeNumber)}
                className={`flex-shrink-0 flex flex-col items-center justify-center w-10 h-12 rounded-xl text-xs font-bold transition-all relative ${
                  isCurrent
                    ? 'bg-emerald-500 text-slate-950 ring-2 ring-emerald-300 shadow-lg scale-105'
                    : isDone
                    ? 'bg-emerald-950/70 border border-emerald-800/80 text-emerald-300'
                    : 'bg-slate-800/80 border border-slate-700/60 text-slate-400 hover:text-white'
                }`}
              >
                <span>{h.holeNumber}</span>
                <span className="text-[9px] font-normal opacity-75">P{h.par}</span>
                {hBanker && (
                  <div
                    className="w-1.5 h-1.5 rounded-full absolute bottom-1"
                    style={{ backgroundColor: hBanker.color }}
                  />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* LIVE BALANCE TICKER BAR */}
      <LiveBalanceBar
        round={round}
        onNavigateToSettlement={() => onNavigateTab('settlement')}
      />

      {/* Live Match Spectator / Host Share Strip */}
      {isSpectator ? (
        <div className="bg-sky-950/40 border border-sky-800/60 rounded-xl px-3 py-2 flex items-center justify-between text-xs">
          <div className="flex items-center gap-1.5 text-sky-300 font-bold">
            <Eye className="w-3.5 h-3.5 text-sky-400" />
            <span>Viewing Match Code: <strong className="font-mono text-white">{round.matchCode || 'LIVE'}</strong></span>
          </div>
          <span className="text-[10px] bg-sky-500/20 text-sky-300 border border-sky-500/30 px-2 py-0.5 rounded-full font-semibold flex items-center gap-1">
            <Lock className="w-2.5 h-2.5" /> Read-Only
          </span>
        </div>
      ) : onOpenShare ? (
        <div
          onClick={onOpenShare}
          className="bg-emerald-950/40 hover:bg-emerald-900/40 border border-emerald-800/60 rounded-xl px-3 py-2 flex items-center justify-between text-xs cursor-pointer transition active:scale-[0.99] group"
        >
          <div className="flex items-center gap-2">
            <Share2 className="w-3.5 h-3.5 text-emerald-400 group-hover:scale-110 transition" />
            <span className="text-slate-300">
              Live Spectator Code: <strong className="font-mono text-white font-bold">{round.matchCode || 'BANKER'}</strong>
            </span>
          </div>
          <span className="text-[11px] font-bold text-emerald-400 underline">
            Share Link
          </span>
        </div>
      ) : null}

      {/* BANKER CARD */}
      <div className="bg-gradient-to-b from-slate-900 to-slate-900/90 border-2 border-emerald-500/80 rounded-2xl p-4 shadow-xl relative overflow-hidden">
        {/* Glow accent */}
        <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 rounded-full blur-2xl pointer-events-none" />

        {/* Banker Header */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2.5">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center text-lg font-bold text-white shadow-md border border-white/20 shrink-0"
              style={{ backgroundColor: banker.color }}
            >
              🏦
            </div>
            <div>
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-[10px] font-black tracking-wider uppercase px-2 py-0.5 bg-emerald-500 text-slate-950 rounded-full">
                  THE BANKER
                </span>
                {/* Banker Total Balance Badge */}
                {(() => {
                  const bankerStat = playerStatsMap[banker.id];
                  const bankerTotal = bankerStat ? bankerStat.netWinnings : 0;
                  const isUp = bankerTotal > 0;
                  const isDown = bankerTotal < 0;

                  return (
                    <span
                      className={`text-[10px] font-black px-2 py-0.5 rounded-full border flex items-center gap-1 ${
                        isUp
                          ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40'
                          : isDown
                          ? 'bg-rose-500/20 text-rose-400 border-rose-500/40'
                          : 'bg-slate-800 text-slate-300 border-slate-700'
                      }`}
                    >
                      {isUp && <TrendingUp className="w-2.5 h-2.5" />}
                      {isDown && <TrendingDown className="w-2.5 h-2.5" />}
                      {isUp
                        ? `Total: +$${bankerTotal}`
                        : isDown
                        ? `Total: -$${Math.abs(bankerTotal)}`
                        : 'Total: $0'}
                    </span>
                  );
                })()}
              </div>
              <h3 className="text-lg font-black text-white leading-tight mt-0.5">{banker.name}</h3>
            </div>
          </div>

          {/* Switch Banker & Tee Flip */}
          {!isSpectator && (
            <div className="flex items-center gap-1.5">
              {currentHoleNum === 1 && (
                <button
                  type="button"
                  onClick={handleFlipTee}
                  className="text-[11px] font-bold text-amber-300 bg-amber-950/60 hover:bg-amber-900/60 px-2.5 py-1.5 rounded-lg border border-amber-600/50 flex items-center gap-1 transition active:scale-95 shadow-sm"
                  title="Flip Tee / Random Banker for Hole 1"
                >
                  <span>🎲</span> Flip Tee
                </button>
              )}

              <button
                onClick={() => setShowBankerSelect(!showBankerSelect)}
                className="text-[11px] text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 px-2.5 py-1.5 rounded-lg border border-slate-700 flex items-center gap-1 transition"
              >
                Change <ChevronDown className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>

        {/* Change Banker Dropdown */}
        {showBankerSelect && (
          <div className="bg-slate-950 border border-slate-800 rounded-xl p-2 mb-3 space-y-1 animate-in fade-in">
            <div className="text-[10px] uppercase font-semibold text-slate-400 px-2 py-1">
              Select Banker for Hole {currentHoleNum}
            </div>
            {round.players.map((p) => (
              <button
                key={p.id}
                onClick={() => handleSelectBanker(p.id)}
                className={`w-full flex items-center justify-between p-2 rounded-lg text-xs font-semibold transition ${
                  p.id === banker.id
                    ? 'bg-emerald-600 text-white'
                    : 'text-slate-300 hover:bg-slate-800'
                }`}
              >
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded-full" style={{ backgroundColor: p.color }} />
                  <span>{p.name}</span>
                </div>
                {p.id === banker.id && <UserCheck className="w-4 h-4" />}
              </button>
            ))}
          </div>
        )}

        {/* Banker Score Input */}
        <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-3 mb-3">
          <div className="flex items-center justify-between mb-2">
            <div className="text-xs font-semibold text-slate-300">
              Banker Gross Score
              {bankerNetScore !== null && (
                <span className="text-slate-400 font-normal ml-1">(Net: <strong className="text-white">{bankerNetScore}</strong>)</span>
              )}
            </div>

            {/* Dynamic Stroke Stepper for Banker on this Hole */}
            <div className="flex items-center gap-1.5 bg-slate-900 px-2 py-0.5 rounded-lg border border-slate-800">
              <span className="text-[10px] text-slate-400 uppercase font-semibold">Strokes:</span>
              {!isSpectator && (
                <button
                  type="button"
                  onClick={() => handleAdjustPlayerStrokes(banker.id, -1)}
                  disabled={bankerStrokes <= 0}
                  className="w-4 h-4 rounded bg-slate-800 hover:bg-slate-700 disabled:opacity-30 text-white flex items-center justify-center text-xs font-bold active:scale-90 transition"
                  title="Remove 1 stroke on this hole"
                >
                  -
                </button>
              )}
              <span className={`text-xs font-black min-w-[16px] text-center ${bankerStrokes > 0 ? 'text-amber-400' : 'text-slate-400'}`}>
                {bankerStrokes > 0 ? `${bankerStrokes} (${'•'.repeat(bankerStrokes)})` : '0'}
              </span>
              {!isSpectator && (
                <button
                  type="button"
                  onClick={() => handleAdjustPlayerStrokes(banker.id, 1)}
                  disabled={bankerStrokes >= 4}
                  className="w-4 h-4 rounded bg-slate-800 hover:bg-slate-700 disabled:opacity-30 text-white flex items-center justify-center text-xs font-bold active:scale-90 transition"
                  title="Add 1 stroke on this hole"
                >
                  +
                </button>
              )}
            </div>
          </div>

          <div className="flex items-center gap-3">
            {!isSpectator && (
              <button
                onClick={() => handleScoreChange(banker.id, -1)}
                className="w-12 h-12 rounded-xl bg-slate-800 hover:bg-slate-700 text-white flex items-center justify-center font-bold text-lg active:scale-90 transition border border-slate-700 shadow-sm"
                aria-label="Decrease Banker Score"
              >
                <Minus className="w-5 h-5" />
              </button>
            )}

            <div className="flex-1 text-center bg-slate-900 border border-slate-800 rounded-xl py-1">
              <span className="text-3xl font-black text-emerald-400">
                {bankerGrossScore !== null && bankerGrossScore !== undefined
                  ? bankerGrossScore
                  : '-'}
              </span>
              <span className="text-[10px] text-slate-400 block uppercase font-medium">
                {bankerGrossScore !== null && bankerGrossScore !== undefined
                  ? bankerGrossScore === holeConfig.par
                    ? 'Par'
                    : bankerGrossScore === holeConfig.par - 1
                    ? 'Birdie 🔥'
                    : bankerGrossScore <= holeConfig.par - 2
                    ? 'Eagle 🦅'
                    : bankerGrossScore === holeConfig.par + 1
                    ? 'Bogey'
                    : `+${bankerGrossScore - holeConfig.par}`
                  : isSpectator
                  ? 'Waiting for score...'
                  : 'Enter Gross'}
              </span>
            </div>

            {!isSpectator && (
              <button
                onClick={() => handleScoreChange(banker.id, 1)}
                className="w-12 h-12 rounded-xl bg-slate-800 hover:bg-slate-700 text-white flex items-center justify-center font-bold text-lg active:scale-90 transition border border-slate-700 shadow-sm"
                aria-label="Increase Banker Score"
              >
                <Plus className="w-5 h-5" />
              </button>
            )}
          </div>

          {/* Quick Score Chips */}
          {!isSpectator && (
            <div className="flex gap-1.5 mt-2.5 justify-center">
              {[-1, 0, 1, 2].map((diff) => {
                const val = holeConfig.par + diff;
                const isSelected = bankerGrossScore === val;
                const label =
                  diff === -1 ? 'Birdie' : diff === 0 ? 'Par' : diff === 1 ? 'Bogey' : 'Dbl Bogey';

                return (
                  <button
                    key={val}
                    onClick={() => handleSetQuickScore(banker.id, val)}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition ${
                      isSelected
                        ? 'bg-emerald-500 text-slate-950 font-black shadow-sm'
                        : 'bg-slate-800/80 hover:bg-slate-700 text-slate-300 border border-slate-700/60'
                    }`}
                  >
                    {val} ({label})
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Banker Financial Exposure Meter */}
        <div className="bg-emerald-950/40 border border-emerald-800/60 rounded-xl p-2.5 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            <Zap className="w-4 h-4 text-emerald-400" />
            <span className="text-slate-300 font-medium">Banker Hole Exposure:</span>
          </div>
          <div className="flex items-center gap-2 font-bold">
            <span className="text-emerald-400 font-black">+${totalBaseExposure}</span>
            <span className="text-slate-500 font-normal">/</span>
            <span className="text-rose-400 font-black">-${totalBaseExposure}</span>
          </div>
        </div>
      </div>

      {/* MATCHES AGAINST OPPONENTS */}
      <div className="space-y-3">
        <div className="flex items-center justify-between px-1">
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Head-to-Head Matches ({opponents.length})
            </h3>
            <span className="text-[10px] text-slate-500">Opponents vs Banker</span>
          </div>

          {!isSpectator ? (
            <button
              type="button"
              onClick={() => {
                setTempBetAmount(round.settings.baseBet);
                setShowBaseBetModal(true);
              }}
              className="text-[11px] font-semibold text-emerald-400 hover:text-emerald-300 bg-emerald-950/70 border border-emerald-800/80 px-2.5 py-1 rounded-lg flex items-center gap-1 transition active:scale-95 shadow-sm"
            >
              <span>Base: ${round.settings.baseBet}</span>
              <span className="text-[10px] text-slate-400 font-normal underline ml-0.5">Change</span>
            </button>
          ) : (
            <span className="text-[11px] font-semibold text-slate-300 bg-slate-800 px-2.5 py-1 rounded-lg border border-slate-700">
              Base: ${round.settings.baseBet}
            </span>
          )}
        </div>

        {opponents.map((opponent) => {
          const baseStake = holeData.bets[opponent.id] ?? round.settings.baseBet;
          const pressStatus = holeData.presses[opponent.id] || 'none';
          const oppGross = holeData.scores[opponent.id];
          const oppStrokes = holeConfig.playerStrokes[opponent.id] || 0;
          const oppNet =
            oppGross !== null && oppGross !== undefined ? oppGross - oppStrokes : null;

          const match = settlement.matches.find((m) => m.opponentId === opponent.id);

          return (
            <div
              key={opponent.id}
              className={`bg-slate-900 border rounded-2xl p-3.5 shadow-md transition-all ${
                match && match.winner === 'opponent'
                  ? 'border-emerald-600/70 bg-gradient-to-r from-slate-900 to-emerald-950/30'
                  : match && match.winner === 'banker'
                  ? 'border-rose-900/60 bg-gradient-to-r from-slate-900 to-rose-950/20'
                  : 'border-slate-800'
              }`}
            >
              {/* Opponent Header */}
              <div className="flex items-center justify-between mb-2.5">
                <div className="flex items-center gap-2">
                  <div
                    className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white shadow-sm"
                    style={{ backgroundColor: opponent.color }}
                  >
                    {opponent.name.charAt(0)}
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <h4 className="text-sm font-bold text-white leading-tight">
                        {opponent.name}
                      </h4>
                      {/* Opponent Total Balance Status Badge */}
                      {(() => {
                        const oppStat = playerStatsMap[opponent.id];
                        const oppTotal = oppStat ? oppStat.netWinnings : 0;
                        const isUp = oppTotal > 0;
                        const isDown = oppTotal < 0;

                        return (
                          <span
                            className={`text-[10px] font-black px-1.5 py-0.2 rounded-md border flex items-center gap-0.5 ${
                              isUp
                                ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                                : isDown
                                ? 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                                : 'bg-slate-800 text-slate-400 border-slate-700'
                            }`}
                          >
                            {isUp && <TrendingUp className="w-2.5 h-2.5" />}
                            {isDown && <TrendingDown className="w-2.5 h-2.5" />}
                            {isUp
                              ? `+$${oppTotal}`
                              : isDown
                              ? `-$${Math.abs(oppTotal)}`
                              : '$0'}
                          </span>
                        );
                      })()}
                    </div>

                    {/* Dynamic Stroke Stepper for Opponent on this Hole */}
                    <div className="flex items-center gap-1 mt-0.5">
                      <div className="flex items-center gap-1 bg-slate-950/80 px-1.5 py-0.5 rounded-md border border-slate-800 text-[10px]">
                        <span className="text-slate-400 font-medium">Strokes:</span>
                        {!isSpectator && (
                          <button
                            type="button"
                            onClick={() => handleAdjustPlayerStrokes(opponent.id, -1)}
                            disabled={oppStrokes <= 0}
                            className="w-4 h-4 rounded bg-slate-800 hover:bg-slate-700 disabled:opacity-30 text-white flex items-center justify-center text-[10px] font-bold active:scale-90 transition"
                            title="Remove stroke on this hole"
                          >
                            -
                          </button>
                        )}
                        <span className={`font-black min-w-[14px] text-center ${oppStrokes > 0 ? 'text-amber-400' : 'text-slate-400'}`}>
                          {oppStrokes > 0 ? `${oppStrokes} (${'•'.repeat(oppStrokes)})` : '0'}
                        </span>
                        {!isSpectator && (
                          <button
                            type="button"
                            onClick={() => handleAdjustPlayerStrokes(opponent.id, 1)}
                            disabled={oppStrokes >= 4}
                            className="w-4 h-4 rounded bg-slate-800 hover:bg-slate-700 disabled:opacity-30 text-white flex items-center justify-center text-[10px] font-bold active:scale-90 transition"
                            title="Add stroke on this hole"
                          >
                            +
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Match Result Badge */}
                {match && oppGross !== null && bankerGrossScore !== null && (
                  <div className="text-right">
                    {match.winner === 'opponent' && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-500/20 text-emerald-400 font-black text-xs border border-emerald-500/40 animate-pulse">
                        <TrendingUp className="w-3.5 h-3.5" /> +${match.netToOpponent}
                      </span>
                    )}
                    {match.winner === 'banker' && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-rose-500/20 text-rose-400 font-black text-xs border border-rose-500/40">
                        <TrendingDown className="w-3.5 h-3.5" /> -${Math.abs(match.netToOpponent)}
                      </span>
                    )}
                    {match.winner === 'push' && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-800 text-slate-400 font-bold text-xs border border-slate-700">
                        Push ($0)
                      </span>
                    )}
                  </div>
                )}
              </div>

              {/* Stake Selector */}
              <div className="bg-slate-950/60 rounded-xl p-2.5 border border-slate-800/80 mb-2.5">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[11px] font-semibold text-slate-300 uppercase">
                    Stake ({opponent.name} Bet):
                  </span>
                  <span className="text-xs font-bold text-emerald-400">${baseStake}</span>
                </div>

                {!isSpectator ? (
                  <div className="flex gap-1">
                    {[1, 2, 3, 5, 10, 20].map((amt) => {
                      const isSelected = baseStake === amt;
                      return (
                        <button
                          key={amt}
                          type="button"
                          onClick={() => handleSetBet(opponent.id, amt)}
                          className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition active:scale-95 ${
                            isSelected
                              ? 'bg-emerald-500 text-slate-950 font-black shadow-sm'
                              : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                          }`}
                        >
                          ${amt}
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-xs font-bold text-white bg-slate-900 px-3 py-1.5 rounded-lg border border-slate-800 flex items-center justify-between">
                    <span>Base Wager:</span>
                    <span className="text-emerald-400 font-black">${baseStake}</span>
                  </div>
                )}

                {/* Live Press / Double (Non-Par 3) & Triple (Par 3) Action */}
                {(() => {
                  const isPar3 = holeConfig.par === 3;
                  const pressDetail = holeData.pressDetails?.[opponent.id] || {
                    stage:
                      pressStatus === 'accepted'
                        ? ('pressed' as const)
                        : pressStatus === 'declined'
                        ? ('conceded' as const)
                        : ('base' as const),
                    multiplier: pressStatus === 'accepted' ? (isPar3 ? 3 : 2) : 1,
                  };

                  const currentMult = pressDetail.multiplier || 1;
                  const activeWager = baseStake * currentMult;

                  return (
                    <div className="mt-2.5 pt-2.5 border-t border-slate-800/80 space-y-2">
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="font-semibold text-slate-300 uppercase tracking-wide">
                          {isPar3 ? 'Par 3 Triples:' : 'Doubles & Presses:'}
                        </span>
                        <span className="text-amber-400 font-bold">
                          {pressDetail.stage === 'base'
                            ? `Base Match ($${baseStake})`
                            : pressDetail.stage === 'pressed'
                            ? isPar3
                              ? `3x Tripled ($${activeWager})`
                              : `2x Doubled ($${activeWager})`
                            : pressDetail.stage === 'redoubled'
                            ? isPar3
                              ? `9x Tripled Back ($${activeWager})`
                              : `4x Doubled Back ($${activeWager})`
                            : `Conceded (-$${pressDetail.concededAmount || baseStake})`}
                        </span>
                      </div>

                      {/* Stage: Base (Not Pressed Yet) */}
                      {pressDetail.stage === 'base' && !isSpectator && (
                        <div className="grid grid-cols-2 gap-1.5">
                          <button
                            type="button"
                            onClick={() =>
                              handleSetPressStage(opponent.id, 'pressed', 'opponent')
                            }
                            className="px-2 py-1.5 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 text-[11px] font-bold flex items-center justify-center gap-1 transition active:scale-95"
                          >
                            <Flame className="w-3 h-3 text-amber-400" />
                            {isPar3
                              ? `${opponent.name} Triple 3x ($${baseStake * 3})`
                              : `${opponent.name} Double 2x ($${baseStake * 2})`}
                          </button>

                          <button
                            type="button"
                            onClick={() =>
                              handleSetPressStage(opponent.id, 'pressed', 'banker')
                            }
                            className="px-2 py-1.5 rounded-lg bg-emerald-600/25 hover:bg-emerald-600/40 text-emerald-300 border border-emerald-500/40 text-[11px] font-bold flex items-center justify-center gap-1 transition active:scale-95"
                          >
                            <span>🏦</span>
                            {isPar3
                              ? `Banker Triple 3x ($${baseStake * 3})`
                              : `Banker Double 2x ($${baseStake * 2})`}
                          </button>
                        </div>
                      )}

                      {/* Stage: 1st Press Active (Doubled 2x or Tripled 3x) */}
                      {pressDetail.stage === 'pressed' && (
                        <div className="space-y-1.5">
                          <div className="flex items-center justify-between bg-amber-950/60 border border-amber-600/60 rounded-lg px-2.5 py-1 text-xs">
                            <span className="font-black text-amber-300 flex items-center gap-1">
                              <Flame className="w-3.5 h-3.5 text-amber-400" />
                              {isPar3
                                ? `3X TRIPLED ($${baseStake * 3})`
                                : `2X DOUBLED ($${baseStake * 2})`}
                            </span>
                            <span className="text-[10px] text-slate-300 font-medium">
                              Called by {pressDetail.lastCaller === 'banker' ? banker.name : opponent.name}
                            </span>
                          </div>

                          {!isSpectator && (
                            <div className="grid grid-cols-3 gap-1">
                              {/* Double Back / Triple Back Button */}
                              <button
                                type="button"
                                onClick={() =>
                                  handleSetPressStage(
                                    opponent.id,
                                    'redoubled',
                                    pressDetail.lastCaller === 'banker' ? 'opponent' : 'banker'
                                  )
                                }
                                className="px-1.5 py-1.5 rounded-lg bg-rose-600/30 hover:bg-rose-600/50 text-rose-300 border border-rose-500/50 text-[10px] font-black flex items-center justify-center gap-0.5 transition active:scale-95 text-center leading-tight"
                              >
                                {isPar3
                                  ? `Triple Back (9x: $${baseStake * 9})`
                                  : `Double Back (4x: $${baseStake * 4})`}
                              </button>

                              {/* Concede */}
                              <button
                                type="button"
                                onClick={() =>
                                  handleSetPressStage(
                                    opponent.id,
                                    'conceded',
                                    undefined,
                                    pressDetail.lastCaller === 'banker' ? 'opponent' : 'banker'
                                  )
                                }
                                className="px-1.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 text-[10px] font-semibold flex items-center justify-center transition active:scale-95"
                              >
                                Concede (-${baseStake})
                              </button>

                              {/* Reset */}
                              <button
                                type="button"
                                onClick={() => handleSetPressStage(opponent.id, 'base')}
                                className="px-1.5 py-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-400 text-[10px] flex items-center justify-center transition"
                              >
                                Reset
                              </button>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Stage: Redoubled / Triple Back Active (4x or 9x) */}
                      {pressDetail.stage === 'redoubled' && (
                        <div className="space-y-1.5">
                          <div className="flex items-center justify-between bg-rose-950/70 border border-rose-600/70 rounded-lg px-2.5 py-1 text-xs">
                            <span className="font-black text-rose-300 flex items-center gap-1">
                              <span>🚀</span>
                              {isPar3
                                ? `9X TRIPLED BACK ($${baseStake * 9})`
                                : `4X DOUBLED BACK ($${baseStake * 4})`}
                            </span>
                            <span className="text-[10px] text-slate-300 font-medium">
                              Called by {pressDetail.lastCaller === 'banker' ? banker.name : opponent.name}
                            </span>
                          </div>

                          {!isSpectator && (
                            <div className="grid grid-cols-2 gap-1.5">
                              <button
                                type="button"
                                onClick={() =>
                                  handleSetPressStage(
                                    opponent.id,
                                    'conceded',
                                    undefined,
                                    pressDetail.lastCaller === 'banker' ? 'opponent' : 'banker'
                                  )
                                }
                                className="px-2 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 text-[11px] font-semibold transition active:scale-95"
                              >
                                Concede (-${baseStake * (isPar3 ? 3 : 2)})
                              </button>

                              <button
                                type="button"
                                onClick={() => handleSetPressStage(opponent.id, 'base')}
                                className="px-2 py-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-400 text-[11px] transition"
                              >
                                Reset
                              </button>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Stage: Conceded */}
                      {pressDetail.stage === 'conceded' && (
                        <div className="flex items-center justify-between bg-rose-950/40 border border-rose-800/80 rounded-lg p-2 text-xs">
                          <span className="font-bold text-rose-300">
                            🏳️ Conceded (-${pressDetail.concededAmount || baseStake}) by{' '}
                            {pressDetail.concededBy === 'banker' ? banker.name : opponent.name}
                          </span>
                          {!isSpectator && (
                            <button
                              type="button"
                              onClick={() => handleSetPressStage(opponent.id, 'base')}
                              className="text-[11px] text-slate-400 hover:text-white underline"
                            >
                              Reset
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })()}
              </div>

              {/* Opponent Gross Score Stepper */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs text-slate-300 font-semibold">Gross:</span>
                  <div className="flex items-center gap-1">
                    {!isSpectator ? (
                      <>
                        <button
                          onClick={() => handleScoreChange(opponent.id, -1)}
                          className="w-8 h-8 rounded-lg bg-slate-800 hover:bg-slate-700 text-white flex items-center justify-center font-bold text-sm active:scale-90 transition border border-slate-700"
                        >
                          <Minus className="w-3.5 h-3.5" />
                        </button>
                        <span className="w-9 text-center font-black text-lg text-white">
                          {oppGross !== null && oppGross !== undefined ? oppGross : '-'}
                        </span>
                        <button
                          onClick={() => handleScoreChange(opponent.id, 1)}
                          className="w-8 h-8 rounded-lg bg-slate-800 hover:bg-slate-700 text-white flex items-center justify-center font-bold text-sm active:scale-90 transition border border-slate-700"
                        >
                          <Plus className="w-3.5 h-3.5" />
                        </button>
                      </>
                    ) : (
                      <span className="px-3 py-1 bg-slate-800 rounded-lg border border-slate-700 font-black text-base text-white">
                        {oppGross !== null && oppGross !== undefined ? oppGross : '-'}
                      </span>
                    )}
                  </div>
                </div>

                <div className="text-right">
                  <span className="text-xs text-slate-400 block font-medium">
                    Net Score: <span className="text-white font-bold">{oppNet !== null ? oppNet : '-'}</span>
                  </span>
                  {match?.multiplierReason && (
                    <span className="text-[10px] text-amber-400 font-bold block">
                      ✨ {match.multiplierReason}
                    </span>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* HOLE SUMMARY & ADVANCE CARD */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-xl space-y-3">
        <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
            <Award className="w-4 h-4 text-emerald-400" /> Hole {currentHoleNum} Net Results
          </h4>
          <span className="text-xs text-slate-400">Zero-Sum Ledger</span>
        </div>

        {/* Player Deltas on this Hole */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {round.players.map((p) => {
            const delta = settlement.playerDeltas[p.id] || 0;
            const isBank = p.id === banker.id;
            return (
              <div
                key={p.id}
                className={`p-2.5 rounded-xl border text-center ${
                  delta > 0
                    ? 'bg-emerald-950/40 border-emerald-800/80 text-emerald-300'
                    : delta < 0
                    ? 'bg-rose-950/40 border-rose-800/80 text-rose-300'
                    : 'bg-slate-800/50 border-slate-700 text-slate-400'
                }`}
              >
                <div className="text-[11px] font-bold truncate flex items-center justify-center gap-1">
                  {p.name} {isBank && '🏦'}
                </div>
                <div className="text-sm font-black mt-0.5">
                  {delta > 0 ? `+$${delta}` : delta < 0 ? `-$${Math.abs(delta)}` : '$0'}
                </div>
              </div>
            );
          })}
        </div>

        {/* Longest Putt Tiebreaker Selector (Shown if there's a tie for low net) */}
        {showTiebreakerPicker && (
          <div className="bg-amber-950/40 border-2 border-amber-500/60 rounded-xl p-3 space-y-2 animate-in fade-in">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-amber-300 flex items-center gap-1.5">
                <span>🎯</span> Tied for Low Net ({minNetScore})! {isSpectator ? 'Longest Putt:' : 'Select Longest Putt:'}
              </span>
              <span className="text-[10px] text-amber-400 font-semibold uppercase">Tiebreaker</span>
            </div>
            <div className="text-[11px] text-slate-300">
              {isSpectator
                ? `Longest putt tiebreaker to take Bank on Hole ${currentHoleNum + 1}:`
                : `Who sank the longest putt to take the Bank on Hole ${currentHoleNum + 1}?`}
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5 pt-1">
              {lowNetTiedPlayers.map(({ player }) => {
                const isSelected =
                  holeData.longestPuttPlayerId === player.id ||
                  (!holeData.longestPuttPlayerId && settlement.nextBankerId === player.id);

                return isSpectator ? (
                  <div
                    key={player.id}
                    className={`p-2 rounded-xl text-xs font-bold border flex items-center justify-between ${
                      isSelected
                        ? 'bg-amber-500 text-slate-950 border-amber-300 shadow-md font-black'
                        : 'bg-slate-800/80 text-slate-400 border-slate-700'
                    }`}
                  >
                    <div className="flex items-center gap-1.5 truncate">
                      <div
                        className="w-3.5 h-3.5 rounded-full shrink-0"
                        style={{ backgroundColor: player.color }}
                      />
                      <span className="truncate">{player.name}</span>
                    </div>
                    {isSelected && <span className="text-[10px]">👑 (Won Bank)</span>}
                  </div>
                ) : (
                  <button
                    key={player.id}
                    type="button"
                    onClick={() => handleSelectLongestPutt(player.id)}
                    className={`p-2 rounded-xl text-xs font-bold border transition flex items-center justify-between ${
                      isSelected
                        ? 'bg-amber-500 text-slate-950 border-amber-300 shadow-md font-black'
                        : 'bg-slate-800/80 hover:bg-slate-700 text-slate-200 border-slate-700'
                    }`}
                  >
                    <div className="flex items-center gap-1.5 truncate">
                      <div
                        className="w-3.5 h-3.5 rounded-full shrink-0"
                        style={{ backgroundColor: player.color }}
                      />
                      <span className="truncate">{player.name}</span>
                    </div>
                    {isSelected && <span className="text-[10px]">👑</span>}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Next Banker Banner */}
        {currentHoleNum < round.settings.totalHoles && (
          <div className="bg-emerald-950/60 border border-emerald-800/60 rounded-xl p-2.5 flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <span className="text-base">👑</span>
              <div>
                <span className="text-slate-300 font-semibold">
                  Hole {currentHoleNum + 1} Banker:{' '}
                </span>
                <span className="text-emerald-400 font-black">
                  {round.players.find((p) => p.id === settlement.nextBankerId)?.name || 'Next Banker'}
                </span>
              </div>
            </div>
            <span className="text-[10px] text-slate-400">{settlement.nextBankerReason}</span>
          </div>
        )}

        {/* Action Button: Next Hole / Finish */}
        <div className="pt-1 flex gap-2">
          {currentHoleNum < round.settings.totalHoles ? (
            <button
              onClick={() => handleGoToHole(currentHoleNum + 1)}
              className="flex-1 py-3 px-4 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-sm shadow-lg shadow-emerald-500/20 transition flex items-center justify-center gap-2 active:scale-95"
            >
              {isSpectator ? `View Hole #${currentHoleNum + 1}` : `Confirm & Next Hole #${currentHoleNum + 1}`}{' '}
              <ArrowRight className="w-4 h-4" />
            </button>
          ) : (
            <button
              onClick={() => onNavigateTab('settlement')}
              className="flex-1 py-3 px-4 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-sm shadow-lg shadow-emerald-500/20 transition flex items-center justify-center gap-2 active:scale-95"
            >
              🏆 Round Complete! View Final Settlement <ArrowRight className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Mid-Round Base Bet Modal Prompt */}
      {showBaseBetModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-t-3xl sm:rounded-2xl max-w-sm w-full p-4 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
              <div className="flex items-center gap-2">
                <DollarSign className="w-4 h-4 text-emerald-400" />
                <h4 className="text-sm font-bold text-white">Change Base Stake</h4>
              </div>
              <button
                type="button"
                onClick={() => setShowBaseBetModal(false)}
                className="p-1 rounded-full text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-300">Select New Base Amount:</label>
              <div className="grid grid-cols-4 gap-1.5">
                {[1, 2, 3, 5, 10, 15, 20, 50].map((amt) => (
                  <button
                    key={amt}
                    type="button"
                    onClick={() => setTempBetAmount(amt)}
                    className={`py-2 rounded-xl text-xs font-bold transition active:scale-95 ${
                      tempBetAmount === amt
                        ? 'bg-emerald-500 text-slate-950 font-black shadow-sm'
                        : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                    }`}
                  >
                    ${amt}
                  </button>
                ))}
              </div>
            </div>

            <div className="pt-2 space-y-2 border-t border-slate-800">
              <button
                type="button"
                onClick={() => handleApplyBaseBet(tempBetAmount, 'this_hole')}
                className="w-full py-2.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition border border-slate-700 active:scale-95"
              >
                Apply to Hole {currentHoleNum} Only
              </button>
              <button
                type="button"
                onClick={() => handleApplyBaseBet(tempBetAmount, 'all_remaining')}
                className="w-full py-2.5 px-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-black transition shadow-lg shadow-emerald-500/20 active:scale-95"
              >
                Apply to All Remaining Holes ({currentHoleNum}-{round.settings.totalHoles})
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
