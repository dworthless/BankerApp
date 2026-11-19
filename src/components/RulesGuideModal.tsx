import React, { useState } from 'react';
import { ChevronDown, ChevronRight, X } from 'lucide-react';

interface RulesGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const RulesGuideModal: React.FC<RulesGuideModalProps> = ({ isOpen, onClose }) => {
  const [activeSection, setActiveSection] = useState<string | null>('structure');

  if (!isOpen) return null;

  const toggleSection = (id: string) => {
    setActiveSection(activeSection === id ? null : id);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-800 rounded-t-3xl sm:rounded-2xl max-w-lg w-full max-h-[92vh] flex flex-col shadow-2xl">
        {/* Header */}
        <div className="p-4 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold">
              📖
            </div>
            <div>
              <h2 className="text-base font-bold text-white">Banker Rules</h2>
              <p className="text-xs text-slate-400">Game Overview & Rules Guide</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full text-slate-400 hover:text-white hover:bg-slate-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content list */}
        <div className="p-4 overflow-y-auto space-y-3 text-xs leading-relaxed text-slate-300">
          {/* Section 1: Fundamental Structure */}
          <div className="bg-slate-950/60 border border-slate-800 rounded-xl overflow-hidden">
            <button
              onClick={() => toggleSection('structure')}
              className="w-full p-3.5 flex items-center justify-between font-bold text-white text-left hover:bg-slate-800/40 transition"
            >
              <span className="flex items-center gap-2 text-emerald-400">
                <span>1.</span> Game Structure & Matches
              </span>
              {activeSection === 'structure' ? (
                <ChevronDown className="w-4 h-4 text-slate-400" />
              ) : (
                <ChevronRight className="w-4 h-4 text-slate-400" />
              )}
            </button>
            {activeSection === 'structure' && (
              <div className="p-3.5 pt-0 border-t border-slate-800/60 space-y-2 text-slate-300">
                <p>
                  On every hole, one golfer is designated the <strong className="text-emerald-400">Banker</strong>.
                  Each opponent plays a separate, independent head-to-head match against the Banker.
                </p>
                <ul className="list-disc list-inside space-y-1 text-slate-400">
                  <li>Opponents do not bet against one another.</li>
                  <li>Lower Net score wins the match. Equal net scores push ($0).</li>
                  <li>The Banker tees off last on each hole.</li>
                </ul>
              </div>
            )}
          </div>

          {/* Section 2: Banker Selection & Tiebreaker */}
          <div className="bg-slate-950/60 border border-slate-800 rounded-xl overflow-hidden">
            <button
              onClick={() => toggleSection('banker_selection')}
              className="w-full p-3.5 flex items-center justify-between font-bold text-white text-left hover:bg-slate-800/40 transition"
            >
              <span className="flex items-center gap-2 text-emerald-400">
                <span>2.</span> Low Net Wins Bank & Longest Putt
              </span>
              {activeSection === 'banker_selection' ? (
                <ChevronDown className="w-4 h-4 text-slate-400" />
              ) : (
                <ChevronRight className="w-4 h-4 text-slate-400" />
              )}
            </button>
            {activeSection === 'banker_selection' && (
              <div className="p-3.5 pt-0 border-t border-slate-800/60 space-y-2 text-slate-300">
                <p>
                  <strong className="text-white">Low Net Wins:</strong> The golfer with the lowest net score on each hole becomes the Banker on the next tee.
                </p>
                <p>
                  <strong className="text-amber-400">Longest Made Putt:</strong> If multiple players tie for the lowest net score, the golfer who sank the <strong className="text-white">longest putt</strong> takes the Bank!
                </p>
                <p>
                  <strong className="text-emerald-400">Hole 1 Banker:</strong> Determined by a random draw / tee flip.
                </p>
              </div>
            )}
          </div>

          {/* Section 3: Doubles & Triples */}
          <div className="bg-slate-950/60 border border-slate-800 rounded-xl overflow-hidden">
            <button
              onClick={() => toggleSection('doubles')}
              className="w-full p-3.5 flex items-center justify-between font-bold text-white text-left hover:bg-slate-800/40 transition"
            >
              <span className="flex items-center gap-2 text-emerald-400">
                <span>3.</span> Tee Shot Doubles & Par-3 Triples
              </span>
              {activeSection === 'doubles' ? (
                <ChevronDown className="w-4 h-4 text-slate-400" />
              ) : (
                <ChevronRight className="w-4 h-4 text-slate-400" />
              )}
            </button>
            {activeSection === 'doubles' && (
              <div className="p-3.5 pt-0 border-t border-slate-800/60 space-y-2 text-slate-300">
                <div>
                  <h4 className="font-bold text-white">Par 4 & Par 5 Holes:</h4>
                  <ul className="list-disc list-inside space-y-1 text-slate-400 mt-1">
                    <li>Player doubles on tee shot: Stake becomes <strong>2x ($10)</strong>.</li>
                    <li>Banker can double back (redouble): Stake becomes <strong>4x ($20)</strong>.</li>
                  </ul>
                </div>
                <div className="pt-1">
                  <h4 className="font-bold text-amber-300">Par 3 Holes:</h4>
                  <ul className="list-disc list-inside space-y-1 text-slate-400 mt-1">
                    <li>Player triples on tee shot: Stake becomes <strong>3x ($15)</strong>.</li>
                    <li>Banker can triple back: Stake becomes <strong>9x ($45)</strong>.</li>
                  </ul>
                </div>
                <p className="pt-1 text-slate-400">
                  <strong className="text-white">Conceding:</strong> If a player or Banker declines a double/triple, they forfeit the previous level's stake to the caller.
                </p>
              </div>
            )}
          </div>

          {/* Section 4: Changing Base Bet Mid-Round */}
          <div className="bg-slate-950/60 border border-slate-800 rounded-xl overflow-hidden">
            <button
              onClick={() => toggleSection('stakes')}
              className="w-full p-3.5 flex items-center justify-between font-bold text-white text-left hover:bg-slate-800/40 transition"
            >
              <span className="flex items-center gap-2 text-emerald-400">
                <span>4.</span> Changing Base Stakes Mid-Round
              </span>
              {activeSection === 'stakes' ? (
                <ChevronDown className="w-4 h-4 text-slate-400" />
              ) : (
                <ChevronRight className="w-4 h-4 text-slate-400" />
              )}
            </button>
            {activeSection === 'stakes' && (
              <div className="p-3.5 pt-0 border-t border-slate-800/60 space-y-2 text-slate-300">
                <p>
                  You can tap <strong className="text-emerald-400">"Base: $X"</strong> on any hole to change the stake.
                </p>
                <p>
                  Choose whether to apply the new stake to <strong className="text-white">this hole only</strong> or carry it forward to <strong className="text-white">all remaining holes</strong>.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-900 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-black"
          >
            Got It!
          </button>
        </div>
      </div>
    </div>
  );
};
