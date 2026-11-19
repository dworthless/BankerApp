import React, { useState } from 'react';
import { HoleConfig, Player, RoundState, GolfCourse, CourseTeeBox } from '../types';
import { calculateStrokeMatrix } from '../utils/bankerEngine';
import { CourseLookupModal } from './CourseLookupModal';
import { Check, RefreshCw, X, Search } from 'lucide-react';

interface HandicapEditorModalProps {
  isOpen: boolean;
  onClose: () => void;
  round: RoundState;
  onSaveHoles: (updatedHoles: HoleConfig[], updatedPlayers: Player[], newCourseName?: string) => void;
}

export const HandicapEditorModal: React.FC<HandicapEditorModalProps> = ({
  isOpen,
  onClose,
  round,
  onSaveHoles,
}) => {
  const [holes, setHoles] = useState<HoleConfig[]>(JSON.parse(JSON.stringify(round.holes)));
  const [players] = useState<Player[]>(JSON.parse(JSON.stringify(round.players)));
  const [courseName, setCourseName] = useState<string>(round.courseName || '');
  const [showCourseLookup, setShowCourseLookup] = useState<boolean>(false);

  if (!isOpen) return null;

  const handleSelectCourseFromApi = (course: GolfCourse, tee: CourseTeeBox) => {
    const totalHoleCount = round.settings.totalHoles;
    const newCourseTitle = `${course.name} (${tee.name})`;
    setCourseName(newCourseTitle);

    // Compute stroke matrix with new handicap ranks
    const matrix = calculateStrokeMatrix(
      totalHoleCount,
      players,
      'off_low_handicap',
      tee.handicapRanks
    );

    setHoles((prev) =>
      prev.map((h, idx) => ({
        ...h,
        par: tee.pars[idx] || h.par,
        handicapRank: tee.handicapRanks[idx] || h.handicapRank,
        playerStrokes: matrix[h.holeNumber] || h.playerStrokes,
      }))
    );
  };

  const handleToggleStroke = (holeNumber: number, playerId: string) => {
    setHoles((prev) =>
      prev.map((h) => {
        if (h.holeNumber !== holeNumber) return h;
        const current = h.playerStrokes[playerId] || 0;
        const next = (current + 1) % 3; // cycles 0 -> 1 -> 2 -> 0
        return {
          ...h,
          playerStrokes: {
            ...h.playerStrokes,
            [playerId]: next,
          },
        };
      })
    );
  };

  const handleUpdatePar = (holeNumber: number, par: number) => {
    setHoles((prev) =>
      prev.map((h) => (h.holeNumber === holeNumber ? { ...h, par } : h))
    );
  };

  const handleUpdateHdcpRank = (holeNumber: number, rank: number) => {
    setHoles((prev) =>
      prev.map((h) => (h.holeNumber === holeNumber ? { ...h, handicapRank: rank } : h))
    );
  };

  const handleAutoAllocate = () => {
    const totalHoleCount = round.settings.totalHoles;
    const currentRanks = holes.map((h) => h.handicapRank);
    const matrix = calculateStrokeMatrix(totalHoleCount, players, 'off_low_handicap', currentRanks);
    setHoles((prev) =>
      prev.map((h) => ({
        ...h,
        playerStrokes: matrix[h.holeNumber] || {},
      }))
    );
  };

  const handleClearAllStrokes = () => {
    setHoles((prev) =>
      prev.map((h) => {
        const cleared: Record<string, number> = {};
        players.forEach((p) => {
          cleared[p.id] = 0;
        });
        return {
          ...h,
          playerStrokes: cleared,
        };
      })
    );
  };

  const handleSave = () => {
    onSaveHoles(holes, players, courseName);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-3 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-800 rounded-t-3xl sm:rounded-2xl max-w-xl w-full max-h-[92vh] flex flex-col shadow-2xl">
        {/* Header */}
        <div className="p-4 border-b border-slate-800 flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <span>🎯</span> Course Scorecard & Strokes
            </h2>
            <p className="text-xs text-slate-400">
              Tap any player's cell on a hole to toggle handicap strokes (0, •, ••)
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full text-slate-400 hover:text-white hover:bg-slate-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Action Toolbar */}
        <div className="p-3 bg-slate-950/60 border-b border-slate-800/80 flex flex-wrap gap-2 items-center justify-between">
          <div className="flex items-center gap-1.5 flex-wrap">
            <button
              type="button"
              onClick={() => setShowCourseLookup(true)}
              className="px-2.5 py-1.5 rounded-lg bg-emerald-500 text-slate-950 font-bold text-xs flex items-center gap-1.5 transition active:scale-95 shadow-sm"
            >
              <Search className="w-3.5 h-3.5" /> Lookup / Switch Course
            </button>

            <button
              type="button"
              onClick={handleAutoAllocate}
              className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-xs font-medium flex items-center gap-1.5 transition"
            >
              <RefreshCw className="w-3.5 h-3.5 text-emerald-400" /> Recalculate Strokes
            </button>

            <button
              type="button"
              onClick={handleClearAllStrokes}
              className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 text-xs font-medium transition"
            >
              Clear
            </button>
          </div>
        </div>

        {/* Matrix Table */}
        <div className="p-3 overflow-y-auto flex-1">
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-700 bg-slate-800/80 text-slate-300">
                  <th className="p-2 text-center font-bold">Hole</th>
                  <th className="p-2 text-center font-semibold">Par</th>
                  <th className="p-2 text-center font-semibold">SI</th>
                  {players.map((p) => {
                    const totalStrokes = holes.reduce(
                      (sum, h) => sum + (h.playerStrokes[p.id] || 0),
                      0
                    );
                    return (
                      <th key={p.id} className="p-2 text-center">
                        <div className="font-bold truncate max-w-[70px]" style={{ color: p.color }}>
                          {p.name}
                        </div>
                        <div className="text-[10px] text-slate-400 font-normal">
                          {totalStrokes} {totalStrokes === 1 ? 'stroke' : 'strokes'}
                        </div>
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {holes.map((hole) => (
                  <tr key={hole.holeNumber} className="hover:bg-slate-800/40 transition">
                    {/* Hole Number */}
                    <td className="p-2 text-center font-bold text-white bg-slate-800/30">
                      #{hole.holeNumber}
                    </td>

                    {/* Par */}
                    <td className="p-1.5 text-center">
                      <select
                        value={hole.par}
                        onChange={(e) => handleUpdatePar(hole.holeNumber, parseInt(e.target.value))}
                        className="bg-slate-800 border border-slate-700 text-white rounded px-1.5 py-1 text-center font-semibold text-xs"
                      >
                        <option value={3}>3</option>
                        <option value={4}>4</option>
                        <option value={5}>5</option>
                        <option value={6}>6</option>
                      </select>
                    </td>

                    {/* Stroke Index (Hardest 1..18) */}
                    <td className="p-1.5 text-center">
                      <input
                        type="number"
                        min={1}
                        max={18}
                        value={hole.handicapRank}
                        onChange={(e) =>
                          handleUpdateHdcpRank(hole.holeNumber, parseInt(e.target.value) || 1)
                        }
                        className="w-10 bg-slate-800 border border-slate-700 text-slate-300 rounded px-1 py-1 text-center text-xs"
                      />
                    </td>

                    {/* Player Stroke Toggles */}
                    {players.map((p) => {
                      const strokes = hole.playerStrokes[p.id] || 0;
                      return (
                        <td key={p.id} className="p-1.5 text-center">
                          <button
                            type="button"
                            onClick={() => handleToggleStroke(hole.holeNumber, p.id)}
                            className={`w-9 h-8 rounded-lg font-bold text-xs flex items-center justify-center mx-auto transition active:scale-90 ${
                              strokes === 2
                                ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20 font-black'
                                : strokes === 1
                                ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20 font-black'
                                : 'bg-slate-800 text-slate-500 hover:text-slate-300 hover:bg-slate-700'
                            }`}
                          >
                            {strokes === 2 ? '•• (2)' : strokes === 1 ? '• (1)' : '0'}
                          </button>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-900 flex justify-end gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl border border-slate-700 text-slate-300 text-xs font-semibold hover:bg-slate-800"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-black flex items-center gap-1.5 shadow-lg shadow-emerald-500/20"
          >
            <Check className="w-4 h-4" /> Save Scorecard & Strokes
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
