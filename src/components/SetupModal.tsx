import React, { useState } from 'react';
import { GameSettings, Player, RoundState, GolfCourse, CourseTeeBox } from '../types';
import { initializeRound, PLAYER_COLORS } from '../utils/bankerEngine';
import { CourseLookupModal } from './CourseLookupModal';
import { Check, DollarSign, UserPlus, Users, X, Search, Sparkles } from 'lucide-react';

interface SetupModalProps {
  isOpen: boolean;
  onClose: () => void;
  onStartRound: (round: RoundState) => void;
  initialRound?: RoundState | null;
}

const DEFAULT_PLAYERS: Player[] = [
  { id: 'p1', name: 'Dan', handicap: 8, color: PLAYER_COLORS[0] },
  { id: 'p2', name: 'Alex', handicap: 12, color: PLAYER_COLORS[1] },
  { id: 'p3', name: 'Ben', handicap: 5, color: PLAYER_COLORS[2] },
  { id: 'p4', name: 'Chris', handicap: 15, color: PLAYER_COLORS[3] },
];

export const SetupModal: React.FC<SetupModalProps> = ({
  isOpen,
  onClose,
  onStartRound,
  initialRound,
}) => {
  const [courseName, setCourseName] = useState(initialRound?.courseName || 'Pebble Beach Golf Links');
  const [customPars, setCustomPars] = useState<number[] | undefined>(undefined);
  const [customHandicapRanks, setCustomHandicapRanks] = useState<number[] | undefined>(undefined);
  const [selectedTeeName, setSelectedTeeName] = useState<string | undefined>(undefined);
  const [showCourseLookup, setShowCourseLookup] = useState<boolean>(false);

  const [totalHoles, setTotalHoles] = useState<9 | 18>(initialRound?.settings.totalHoles || 18);
  const [baseBet, setBaseBet] = useState<number>(initialRound?.settings.baseBet || 5);

  const [players, setPlayers] = useState<Player[]>(
    initialRound?.players && initialRound.players.length >= 3
      ? initialRound.players
      : DEFAULT_PLAYERS
  );

  if (!isOpen) return null;

  const handleAddPlayer = () => {
    if (players.length >= 5) return;
    const newIdx = players.length;
    const newId = `p_${Date.now()}_${newIdx}`;
    setPlayers([
      ...players,
      {
        id: newId,
        name: `Player ${newIdx + 1}`,
        handicap: 10,
        color: PLAYER_COLORS[newIdx % PLAYER_COLORS.length],
      },
    ]);
  };

  const handleRemovePlayer = (id: string) => {
    if (players.length <= 3) return;
    setPlayers(players.filter((p) => p.id !== id));
  };

  const handleUpdatePlayer = (id: string, updates: Partial<Player>) => {
    setPlayers(players.map((p) => (p.id === id ? { ...p, ...updates } : p)));
  };

  const handleSelectCourseFromApi = (course: GolfCourse, tee: CourseTeeBox) => {
    setCourseName(course.name);
    setSelectedTeeName(tee.name);
    setCustomPars(tee.pars);
    setCustomHandicapRanks(tee.handicapRanks);
  };

  const handleCreateRound = () => {
    const settings: GameSettings = {
      totalHoles,
      startingHole: 1,
      baseBet: Math.max(1, baseBet),
    };

    const newRound = initializeRound(
      players,
      settings,
      courseName,
      customPars,
      customHandicapRanks
    );
    onStartRound(newRound);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-800 rounded-t-3xl sm:rounded-2xl max-w-md w-full max-h-[92vh] flex flex-col shadow-2xl animate-in fade-in slide-in-from-bottom duration-200">
        {/* Header */}
        <div className="p-4 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold">
              ⛳️
            </div>
            <div>
              <h2 className="text-base font-bold text-white">Start Banker Round</h2>
              <p className="text-xs text-slate-400">Low Net Wins Bank • Longest Putt Tiebreaker</p>
            </div>
          </div>
          {initialRound && (
            <button
              onClick={onClose}
              className="p-1.5 rounded-full text-slate-400 hover:text-white hover:bg-slate-800"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Modal Body */}
        <div className="p-4 overflow-y-auto space-y-4 flex-1 text-sm">
          {/* Course Lookup & Name */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
                Golf Course & Scorecard
              </label>
              <button
                type="button"
                onClick={() => setShowCourseLookup(true)}
                className="text-xs font-bold text-emerald-400 hover:text-emerald-300 flex items-center gap-1 bg-emerald-950/70 border border-emerald-800/80 px-2.5 py-1 rounded-lg transition active:scale-95"
              >
                <Search className="w-3.5 h-3.5" /> Lookup Course API
              </button>
            </div>

            <div className="flex gap-2">
              <input
                type="text"
                value={courseName}
                onChange={(e) => setCourseName(e.target.value)}
                placeholder="e.g. Pebble Beach, Torrey Pines, Bandon..."
                className="flex-1 bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 text-sm font-medium"
              />
              <button
                type="button"
                onClick={() => setShowCourseLookup(true)}
                className="px-3 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 flex items-center justify-center"
                title="Search Course Database & API"
              >
                <Search className="w-4 h-4 text-emerald-400" />
              </button>
            </div>

            {/* Auto-Loaded Scorecard Badge */}
            {customPars && customHandicapRanks && (
              <div className="bg-emerald-950/50 border border-emerald-700/60 rounded-xl p-2.5 flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-emerald-400 shrink-0" />
                  <div>
                    <span className="font-bold text-emerald-300">
                      Official Pars & Handicap Ranks Auto-Loaded
                    </span>
                    {selectedTeeName && (
                      <span className="text-slate-400 block text-[11px]">
                        Tee: <strong className="text-slate-200">{selectedTeeName}</strong> • Total Par: {customPars.reduce((a, b) => a + b, 0)}
                      </span>
                    )}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setShowCourseLookup(true)}
                  className="text-[11px] font-bold text-emerald-400 underline shrink-0"
                >
                  Change Tee
                </button>
              </div>
            )}
          </div>

          {/* Number of Holes */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
              Round Format
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setTotalHoles(18)}
                className={`py-2.5 px-3 rounded-xl border text-center font-bold text-xs transition flex items-center justify-center gap-2 ${
                  totalHoles === 18
                    ? 'bg-emerald-600/30 border-emerald-500 text-emerald-300'
                    : 'bg-slate-800/60 border-slate-700 text-slate-400 hover:bg-slate-800'
                }`}
              >
                <span>18 Holes</span>
                {totalHoles === 18 && <Check className="w-4 h-4 text-emerald-400" />}
              </button>
              <button
                type="button"
                onClick={() => setTotalHoles(9)}
                className={`py-2.5 px-3 rounded-xl border text-center font-bold text-xs transition flex items-center justify-center gap-2 ${
                  totalHoles === 9
                    ? 'bg-emerald-600/30 border-emerald-500 text-emerald-300'
                    : 'bg-slate-800/60 border-slate-700 text-slate-400 hover:bg-slate-800'
                }`}
              >
                <span>9 Holes</span>
                {totalHoles === 9 && <Check className="w-4 h-4 text-emerald-400" />}
              </button>
            </div>
          </div>

          {/* Base Bet Amount */}
          <div className="space-y-1.5 bg-slate-950/70 p-3 rounded-2xl border border-slate-800">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-slate-200 uppercase tracking-wider flex items-center gap-1">
                <DollarSign className="w-3.5 h-3.5 text-emerald-400" /> Base Stake ($ per match)
              </label>
              <span className="text-xs font-black text-emerald-400">${baseBet}</span>
            </div>

            <div className="flex items-center gap-2 pt-1">
              {[1, 2, 3, 5, 10, 20].map((amt) => (
                <button
                  key={amt}
                  type="button"
                  onClick={() => setBaseBet(amt)}
                  className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition active:scale-95 ${
                    baseBet === amt
                      ? 'bg-emerald-500 text-slate-950 font-black shadow-sm'
                      : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700/60'
                  }`}
                >
                  ${amt}
                </button>
              ))}
            </div>
            <div className="text-[11px] text-slate-400 pt-1">
              Can be adjusted anytime during the round. Doubles ($2x/4x) on Par 4/5, Triples ($3x/9x) on Par 3.
            </div>
          </div>

          {/* Players & Course Handicaps */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5 text-emerald-400" />
                Players & Course Handicaps ({players.length}/5)
              </label>
              {players.length < 5 && (
                <button
                  type="button"
                  onClick={handleAddPlayer}
                  className="text-xs text-emerald-400 hover:text-emerald-300 font-medium flex items-center gap-1"
                >
                  <UserPlus className="w-3.5 h-3.5" /> Add Player
                </button>
              )}
            </div>

            <div className="space-y-2">
              {players.map((player, idx) => (
                <div
                  key={player.id}
                  className="flex items-center gap-2 bg-slate-800/80 border border-slate-700/80 rounded-xl p-2.5"
                >
                  {/* Number Badge */}
                  <div
                    className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0 shadow-sm"
                    style={{ backgroundColor: player.color }}
                  >
                    {idx + 1}
                  </div>

                  {/* Name input */}
                  <input
                    type="text"
                    value={player.name}
                    onChange={(e) => handleUpdatePlayer(player.id, { name: e.target.value })}
                    placeholder={`Player ${idx + 1}`}
                    className="flex-1 bg-slate-900/60 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white text-xs font-medium focus:outline-none focus:border-emerald-500"
                  />

                  {/* Course Handicap input */}
                  <div className="flex items-center gap-1 shrink-0">
                    <span className="text-[10px] text-slate-400 uppercase font-semibold">Hcp:</span>
                    <input
                      type="number"
                      value={player.handicap}
                      min={0}
                      max={54}
                      onChange={(e) =>
                        handleUpdatePlayer(player.id, {
                          handicap: parseInt(e.target.value) || 0,
                        })
                      }
                      className="w-12 bg-slate-900/60 border border-slate-700 rounded-lg px-2 py-1.5 text-white text-center text-xs font-bold focus:outline-none focus:border-emerald-500"
                    />
                  </div>

                  {/* Remove button */}
                  {players.length > 3 && (
                    <button
                      type="button"
                      onClick={() => handleRemovePlayer(player.id)}
                      className="p-1 text-slate-500 hover:text-rose-400"
                      title="Remove Player"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>
            <p className="text-[11px] text-slate-400">
              Strokes automatically allocated off the low handicap player.
            </p>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-900">
          <button
            type="button"
            onClick={handleCreateRound}
            className="w-full py-3.5 px-4 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-sm shadow-lg shadow-emerald-500/20 transition flex items-center justify-center gap-1.5 active:scale-95"
          >
            ⛳️ Tee Off Banker Round!
          </button>
        </div>
      </div>

      {/* Course API Lookup Modal */}
      <CourseLookupModal
        isOpen={showCourseLookup}
        onClose={() => setShowCourseLookup(false)}
        onSelectCourse={handleSelectCourseFromApi}
        currentCourseName={courseName}
      />
    </div>
  );
};
