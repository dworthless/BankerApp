export type PressStage = 'base' | 'pressed' | 'redoubled' | 'conceded';

export interface MatchPressInfo {
  stage: PressStage;
  multiplier: number; // 1x base, 2x/4x for non-par-3, 3x/9x for par-3
  lastCaller?: 'opponent' | 'banker';
  concededBy?: 'opponent' | 'banker';
  concededAmount?: number;
}

export type PressStatus = 'none' | 'called_by_banker' | 'called_by_opponent' | 'accepted' | 'declined';

export interface Player {
  id: string;
  name: string;
  handicap: number; // Course handicap or index
  color: string;
  venmoHandle?: string;
}

export interface CourseTeeBox {
  name: string; // e.g. "Championship", "Blue", "White", "Red"
  rating?: number;
  slope?: number;
  yardage?: number;
  pars: number[]; // Array of 18 hole pars
  handicapRanks: number[]; // Array of 18 hole handicap ranks (1 to 18)
}

export interface GolfCourse {
  id: string;
  name: string;
  location: string;
  clubName?: string;
  numHoles: number;
  tees: CourseTeeBox[];
}

export interface HoleConfig {
  holeNumber: number;
  par: number;
  handicapRank: number; // 1 (hardest) to 18 (easiest)
  playerStrokes: Record<string, number>; // playerId -> strokes allocated on this hole (0, 1, 2)
}

export interface MatchOutcome {
  opponentId: string;
  bankerId: string;
  opponentGross: number;
  opponentNet: number;
  bankerGross: number;
  bankerNet: number;
  opponentStrokes: number;
  bankerStrokes: number;
  baseStake: number;
  pressStatus: PressStatus;
  effectiveStake: number;
  multiplier: number;
  multiplierReason?: string;
  winner: 'opponent' | 'banker' | 'push';
  netToOpponent: number; // positive = opponent won from banker, negative = banker won from opponent, 0 = push
  summaryText: string;
}

export interface HoleSettlement {
  matches: MatchOutcome[];
  bankerTotalGain: number; // sum of (-netToOpponent)
  playerDeltas: Record<string, number>; // net $ change for this hole for each player
  nextBankerId: string;
  nextBankerReason: string;
}

export interface HoleData {
  holeNumber: number;
  bankerId: string;
  bets: Record<string, number>; // opponentId -> base stake ($)
  presses: Record<string, PressStatus>; // opponentId -> press status
  pressDetails?: Record<string, MatchPressInfo>; // opponentId -> multi-level press info
  scores: Record<string, number | null>; // playerId -> gross score
  firstHoledOutId?: string; // for low_score tie-breakers
  longestPuttPlayerId?: string; // for longest putt tie-breaker
  isComplete: boolean;
  settlement?: HoleSettlement;
}

export interface GameSettings {
  totalHoles: 9 | 18;
  startingHole: number;
  baseBet: number;
}

export interface RoundState {
  id: string;
  createdAt: string;
  updatedAt: string;
  courseName: string;
  players: Player[];
  settings: GameSettings;
  holes: HoleConfig[];
  holesData: Record<number, HoleData>;
  currentHole: number;
  status: 'setup' | 'in_progress' | 'completed';
}

export interface PlayerStats {
  playerId: string;
  name: string;
  color: string;
  holesPlayed: number;
  grossTotal: number;
  netTotal: number;
  toParGross: number;
  toParNet: number;
  bankerHolesCount: number;
  matchesPlayed: number;
  matchesWon: number;
  matchesLost: number;
  matchesPushed: number;
  netWinnings: number;
  birdiesCount: number;
  eaglesCount: number;
  biggestHoleWin: number;
  biggestHoleLoss: number;
}

export interface PaymentTransfer {
  fromPlayerId: string;
  toPlayerId: string;
  amount: number;
}
