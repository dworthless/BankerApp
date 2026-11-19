import {
  GameSettings,
  HoleConfig,
  HoleData,
  HoleSettlement,
  MatchOutcome,
  Player,
  PlayerStats,
  PressStatus,
  RoundState,
} from '../types';

export const DEFAULT_PARS_18 = [4, 4, 3, 5, 4, 4, 3, 4, 5, 4, 3, 5, 4, 4, 3, 5, 4, 4];
export const DEFAULT_HDCP_RANKS_18 = [7, 3, 15, 1, 11, 5, 17, 9, 13, 8, 16, 2, 10, 6, 18, 4, 14, 12];

export const PLAYER_COLORS = [
  '#10B981', // Emerald
  '#3B82F6', // Blue
  '#F59E0B', // Amber
  '#EC4899', // Pink
  '#8B5CF6', // Purple
];

/**
 * Generate standard hole configs (9 or 18 holes)
 */
export function generateDefaultHoles(
  totalHoles: 9 | 18,
  players: Player[],
  handicapMode: 'off_low_handicap' | 'flat_gross' | 'custom_matrix' = 'off_low_handicap',
  customPars?: number[],
  customHandicapRanks?: number[]
): HoleConfig[] {
  const holes: HoleConfig[] = [];
  const holeCount = totalHoles === 9 ? 9 : 18;

  // Calculate stroke allocations
  const strokeAllocations = calculateStrokeMatrix(
    holeCount,
    players,
    handicapMode,
    customHandicapRanks
  );

  for (let i = 0; i < holeCount; i++) {
    const holeNumber = i + 1;
    const par = customPars && customPars[i] ? customPars[i] : DEFAULT_PARS_18[i] || 4;
    const handicapRank =
      customHandicapRanks && customHandicapRanks[i]
        ? customHandicapRanks[i]
        : totalHoles === 9
        ? i + 1
        : DEFAULT_HDCP_RANKS_18[i] || i + 1;

    holes.push({
      holeNumber,
      par,
      handicapRank,
      playerStrokes: strokeAllocations[holeNumber] || {},
    });
  }

  return holes;
}

/**
 * Calculate stroke matrix based on player handicaps
 */
export function calculateStrokeMatrix(
  totalHoles: number,
  players: Player[],
  handicapMode: 'off_low_handicap' | 'flat_gross' | 'custom_matrix',
  customHandicapRanks?: number[]
): Record<number, Record<string, number>> {
  const matrix: Record<number, Record<string, number>> = {};

  for (let h = 1; h <= totalHoles; h++) {
    matrix[h] = {};
  }

  if (handicapMode === 'flat_gross' || players.length === 0) {
    for (let h = 1; h <= totalHoles; h++) {
      players.forEach((p) => {
        matrix[h][p.id] = 0;
      });
    }
    return matrix;
  }

  // Off lowest handicap in the group
  const minHcp = Math.min(...players.map((p) => p.handicap || 0));

  players.forEach((player) => {
    const relHcp = Math.max(0, (player.handicap || 0) - minHcp);
    const fullStrokes = Math.floor(relHcp / totalHoles);
    const remStrokes = relHcp % totalHoles;

    for (let h = 1; h <= totalHoles; h++) {
      const hdcpRank =
        customHandicapRanks && customHandicapRanks[h - 1]
          ? customHandicapRanks[h - 1]
          : totalHoles === 9
          ? h
          : DEFAULT_HDCP_RANKS_18[h - 1] || h;
      const getsExtra = hdcpRank <= remStrokes ? 1 : 0;
      matrix[h][player.id] = fullStrokes + getsExtra;
    }
  });

  return matrix;
}

/**
 * Calculate single match between Banker and an Opponent
 */
export function calculateMatch(
  _holeNumber: number,
  par: number,
  banker: Player,
  bankerGross: number,
  bankerStrokes: number,
  opponent: Player,
  opponentGross: number,
  opponentStrokes: number,
  baseStake: number,
  pressStatus: PressStatus,
  _settings?: GameSettings,
  pressDetail?: import('../types').MatchPressInfo
): MatchOutcome {
  const bankerNet = bankerGross - bankerStrokes;
  const opponentNet = opponentGross - opponentStrokes;

  let effectiveStake = baseStake;
  let multiplier = 1;
  let multiplierReason = '';
  let winner: 'opponent' | 'banker' | 'push' = 'push';
  let netToOpponent = 0;
  let summaryText = '';

  // Handle Press Details with multi-level Doubling & Par-3 Tripling
  if (pressDetail && pressDetail.stage === 'conceded') {
    const forfeitedAmount = pressDetail.concededAmount || baseStake;
    effectiveStake = forfeitedAmount;
    multiplier = 1;

    if (pressDetail.concededBy === 'banker') {
      winner = 'opponent';
      netToOpponent = forfeitedAmount;
      summaryText = `${banker.name} conceded press (+$${forfeitedAmount} to ${opponent.name})`;
    } else {
      winner = 'banker';
      netToOpponent = -forfeitedAmount;
      summaryText = `${opponent.name} conceded press (-$${forfeitedAmount})`;
    }

    return {
      opponentId: opponent.id,
      bankerId: banker.id,
      opponentGross,
      opponentNet,
      bankerGross,
      bankerNet,
      opponentStrokes,
      bankerStrokes,
      baseStake,
      pressStatus: 'declined',
      effectiveStake,
      multiplier,
      multiplierReason: 'Conceded',
      winner,
      netToOpponent,
      summaryText,
    };
  }

  // Handle multi-level press multiplier
  if (pressDetail && (pressDetail.stage === 'pressed' || pressDetail.stage === 'redoubled')) {
    effectiveStake = baseStake * pressDetail.multiplier;
    if (pressDetail.multiplier > 1) {
      if (par === 3) {
        multiplierReason =
          pressDetail.stage === 'redoubled'
            ? `Par-3 Triple Back (${pressDetail.multiplier}x = $${effectiveStake})`
            : `Par-3 Triple (${pressDetail.multiplier}x = $${effectiveStake})`;
      } else {
        multiplierReason =
          pressDetail.stage === 'redoubled'
            ? `Double Back (${pressDetail.multiplier}x = $${effectiveStake})`
            : `Double (${pressDetail.multiplier}x = $${effectiveStake})`;
      }
    }
  } else if (pressStatus === 'declined') {
    // Legacy fallback
    effectiveStake = baseStake;
    multiplier = 1;
    winner = 'banker';
    netToOpponent = -baseStake;
    summaryText = `${opponent.name} surrendered press (-$${baseStake})`;

    return {
      opponentId: opponent.id,
      bankerId: banker.id,
      opponentGross,
      opponentNet,
      bankerGross,
      bankerNet,
      opponentStrokes,
      bankerStrokes,
      baseStake,
      pressStatus,
      effectiveStake,
      multiplier,
      multiplierReason: 'Conceded',
      winner,
      netToOpponent,
      summaryText,
    };
  } else if (pressStatus === 'accepted') {
    // If par 3, default press is 3x, otherwise 2x
    const pressMult = par === 3 ? 3 : 2;
    effectiveStake = baseStake * pressMult;
    multiplierReason = par === 3 ? `Par-3 Triple (${pressMult}x = $${effectiveStake})` : `Double (${pressMult}x = $${effectiveStake})`;
  }

  // Determine winner purely by Net score (no birdie multipliers)
  if (opponentNet < bankerNet) {
    winner = 'opponent';
    netToOpponent = effectiveStake;
    summaryText = `${opponent.name} won Net ${opponentNet} to ${bankerNet} (+$${netToOpponent})`;
  } else if (bankerNet < opponentNet) {
    winner = 'banker';
    netToOpponent = -effectiveStake;
    summaryText = `${banker.name} won Net ${bankerNet} to ${opponentNet} (+$${effectiveStake})`;
  } else {
    // Push on equal net scores
    winner = 'push';
    netToOpponent = 0;
    summaryText = `Tied Net ${bankerNet} - Push ($0)`;
  }

  return {
    opponentId: opponent.id,
    bankerId: banker.id,
    opponentGross,
    opponentNet,
    bankerGross,
    bankerNet,
    opponentStrokes,
    bankerStrokes,
    baseStake,
    pressStatus,
    effectiveStake,
    multiplier,
    multiplierReason,
    winner,
    netToOpponent,
    summaryText,
  };
}

/**
 * Settle an entire hole and determine next Banker
 */
export function settleHole(
  holeNumber: number,
  holeConfig: HoleConfig,
  holeData: HoleData,
  players: Player[],
  settings: GameSettings,
  nextHoleNumber?: number
): HoleSettlement {
  const banker = players.find((p) => p.id === holeData.bankerId) || players[0];
  const bankerGross = holeData.scores[banker.id];
  const bankerStrokes = holeConfig.playerStrokes[banker.id] || 0;

  const matches: MatchOutcome[] = [];
  const playerDeltas: Record<string, number> = {};

  players.forEach((p) => {
    playerDeltas[p.id] = 0;
  });

  if (bankerGross !== null && bankerGross !== undefined) {
    const opponents = players.filter((p) => p.id !== banker.id);

    opponents.forEach((opponent) => {
      const oppGross = holeData.scores[opponent.id];
      if (oppGross !== null && oppGross !== undefined) {
        const oppStrokes = holeConfig.playerStrokes[opponent.id] || 0;
        const baseStake = holeData.bets[opponent.id] ?? settings.baseBet;
        const pressStatus = holeData.presses[opponent.id] || 'none';

        const pressDetail = holeData.pressDetails?.[opponent.id];

        const match = calculateMatch(
          holeNumber,
          holeConfig.par,
          banker,
          bankerGross,
          bankerStrokes,
          opponent,
          oppGross,
          oppStrokes,
          baseStake,
          pressStatus,
          settings,
          pressDetail
        );

        matches.push(match);
        playerDeltas[opponent.id] += match.netToOpponent;
        playerDeltas[banker.id] -= match.netToOpponent; // Banker has negative of opponent's win
      }
    });
  }

  const bankerTotalGain = playerDeltas[banker.id] || 0;

  // Determine Next Banker
  const { nextBankerId, nextBankerReason } = determineNextBanker(
    holeNumber,
    holeConfig,
    holeData,
    players,
    settings,
    nextHoleNumber
  );

  return {
    matches,
    bankerTotalGain,
    playerDeltas,
    nextBankerId,
    nextBankerReason,
  };
}

/**
 * Determine next banker based on configured mode
 */
export function determineNextBanker(
  holeNumber: number,
  holeConfig: HoleConfig,
  holeData: HoleData,
  players: Player[],
  _settings?: GameSettings,
  _nextHoleNumber?: number
): { nextBankerId: string; nextBankerReason: string } {
  const currentBankerIdx = players.findIndex((p) => p.id === holeData.bankerId);

  // Calculate net scores for all players on this hole
  const netScores = players.map((p) => {
    const gross = holeData.scores[p.id];
    const strokes = holeConfig.playerStrokes[p.id] || 0;
    const net = gross !== null && gross !== undefined ? gross - strokes : 999;
    return { player: p, net, gross };
  });

  const validScores = netScores.filter((s) => s.gross !== null && s.gross !== undefined);
  if (validScores.length === 0) {
    const nextIdx = (currentBankerIdx + 1) % players.length;
    return {
      nextBankerId: players[nextIdx]?.id || players[0].id,
      nextBankerReason: 'Starting Banker',
    };
  }

  const minNet = Math.min(...validScores.map((s) => s.net));
  const lowNetPlayers = validScores.filter((s) => s.net === minNet);

  // Single low net score on the hole takes the Bank
  if (lowNetPlayers.length === 1) {
    const winner = lowNetPlayers[0].player;
    return {
      nextBankerId: winner.id,
      nextBankerReason: `Low Net Score (${minNet}) on Hole ${holeNumber}`,
    };
  }

  // Tied low net score: Longest Made Putt tiebreaker
  if (holeData.longestPuttPlayerId) {
    const puttWinner = players.find((p) => p.id === holeData.longestPuttPlayerId);
    if (puttWinner && lowNetPlayers.some((lp) => lp.player.id === puttWinner.id)) {
      return {
        nextBankerId: puttWinner.id,
        nextBankerReason: `Tied Low Net (${minNet}) - Longest Made Putt (${puttWinner.name})`,
      };
    }
  }

  // Default to first tied until user taps the longest putt winner
  const defaultPuttWinner = lowNetPlayers[0].player;
  return {
    nextBankerId: defaultPuttWinner.id,
    nextBankerReason: `Tied Low Net (${minNet}) - Select Longest Putt below`,
  };
}

/**
 * Calculate full game stats across all played holes
 */
export function calculatePlayerStats(round: RoundState): PlayerStats[] {
  const statsMap: Record<string, PlayerStats> = {};

  round.players.forEach((p) => {
    statsMap[p.id] = {
      playerId: p.id,
      name: p.name,
      color: p.color,
      holesPlayed: 0,
      grossTotal: 0,
      netTotal: 0,
      toParGross: 0,
      toParNet: 0,
      bankerHolesCount: 0,
      matchesPlayed: 0,
      matchesWon: 0,
      matchesLost: 0,
      matchesPushed: 0,
      netWinnings: 0,
      birdiesCount: 0,
      eaglesCount: 0,
      biggestHoleWin: 0,
      biggestHoleLoss: 0,
    };
  });

  round.holes.forEach((holeConfig) => {
    const holeData = round.holesData[holeConfig.holeNumber];
    if (!holeData) return;

    // Check if hole was played
    const hasScores = Object.values(holeData.scores).some((s) => s !== null && s !== undefined);
    if (!hasScores) return;

    if (holeData.bankerId && statsMap[holeData.bankerId]) {
      statsMap[holeData.bankerId].bankerHolesCount += 1;
    }

    round.players.forEach((p) => {
      const gross = holeData.scores[p.id];
      if (gross !== null && gross !== undefined) {
        const strokes = holeConfig.playerStrokes[p.id] || 0;
        const net = gross - strokes;
        const toPar = gross - holeConfig.par;
        const toParNetVal = net - holeConfig.par;

        const pStats = statsMap[p.id];
        pStats.holesPlayed += 1;
        pStats.grossTotal += gross;
        pStats.netTotal += net;
        pStats.toParGross += toPar;
        pStats.toParNet += toParNetVal;

        if (gross === holeConfig.par - 1) pStats.birdiesCount += 1;
        if (gross <= holeConfig.par - 2) pStats.eaglesCount += 1;
      }
    });

    // Payout and match outcome stats
    if (holeData.settlement) {
      round.players.forEach((p) => {
        const delta = holeData.settlement?.playerDeltas[p.id] || 0;
        const pStats = statsMap[p.id];
        pStats.netWinnings += delta;
        if (delta > pStats.biggestHoleWin) pStats.biggestHoleWin = delta;
        if (delta < pStats.biggestHoleLoss) pStats.biggestHoleLoss = delta;
      });

      holeData.settlement.matches.forEach((m) => {
        const oppStats = statsMap[m.opponentId];
        const bankStats = statsMap[m.bankerId];

        if (oppStats) oppStats.matchesPlayed += 1;
        if (bankStats) bankStats.matchesPlayed += 1;

        if (m.winner === 'opponent') {
          if (oppStats) oppStats.matchesWon += 1;
          if (bankStats) bankStats.matchesLost += 1;
        } else if (m.winner === 'banker') {
          if (bankStats) bankStats.matchesWon += 1;
          if (oppStats) oppStats.matchesLost += 1;
        } else {
          if (oppStats) oppStats.matchesPushed += 1;
          if (bankStats) bankStats.matchesPushed += 1;
        }
      });
    }
  });

  return Object.values(statsMap);
}

/**
 * Initialize a brand new round with configured players & settings
 */
export function initializeRound(
  players: Player[],
  settings: GameSettings,
  courseName = 'Banker Round',
  customPars?: number[],
  customHandicapRanks?: number[]
): RoundState {
  const holes = generateDefaultHoles(
    settings.totalHoles,
    players,
    'off_low_handicap',
    customPars,
    customHandicapRanks
  );
  const holesData: Record<number, HoleData> = {};

  const totalHoleCount = settings.totalHoles === 9 ? 9 : 18;
  const initialBankerId = players[0]?.id || '';

  for (let i = 1; i <= totalHoleCount; i++) {
    const defaultBets: Record<string, number> = {};
    const defaultPresses: Record<string, PressStatus> = {};
    const defaultScores: Record<string, number | null> = {};

    players.forEach((p) => {
      if (p.id !== initialBankerId) {
        defaultBets[p.id] = settings.baseBet;
        defaultPresses[p.id] = 'none';
      }
      defaultScores[p.id] = null;
    });

    holesData[i] = {
      holeNumber: i,
      bankerId: initialBankerId,
      bets: defaultBets,
      presses: defaultPresses,
      scores: defaultScores,
      isComplete: false,
    };
  }

  return {
    id: `round_${Date.now()}`,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    courseName,
    players,
    settings,
    holes,
    holesData,
    currentHole: 1,
    status: 'in_progress',
  };
}
