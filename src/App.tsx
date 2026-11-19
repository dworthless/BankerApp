import React, { useEffect, useState } from 'react';
import { HoleConfig, Player, RoundState } from './types';
import { loadCurrentRound, saveCurrentRound } from './utils/storage';
import { Header } from './components/Header';
import { BottomNav, TabType } from './components/BottomNav';
import { HolePlayView } from './components/HolePlayView';
import { ScorecardView } from './components/ScorecardView';
import { LeaderboardView } from './components/LeaderboardView';
import { SetupModal } from './components/SetupModal';
import { HandicapEditorModal } from './components/HandicapEditorModal';
import { RulesGuideModal } from './components/RulesGuideModal';
import { RoundHistoryModal } from './components/RoundHistoryModal';
import { PlusCircle } from 'lucide-react';

export const App: React.FC = () => {
  const [round, setRound] = useState<RoundState | null>(null);
  const [currentTab, setCurrentTab] = useState<TabType>('hole');

  // Modals
  const [showSetupModal, setShowSetupModal] = useState<boolean>(false);
  const [showHandicapModal, setShowHandicapModal] = useState<boolean>(false);
  const [showRulesModal, setShowRulesModal] = useState<boolean>(false);
  const [showHistoryModal, setShowHistoryModal] = useState<boolean>(false);

  // Load active round from storage on startup
  useEffect(() => {
    const saved = loadCurrentRound();
    if (saved) {
      setRound(saved);
    } else {
      setShowSetupModal(true);
    }
  }, []);

  // Update & persist round
  const handleUpdateRound = (updated: RoundState) => {
    setRound(updated);
    saveCurrentRound(updated);
  };

  const handleStartRound = (newRound: RoundState) => {
    setRound(newRound);
    saveCurrentRound(newRound);
    setCurrentTab('hole');
  };

  const handleSaveHoles = (updatedHoles: HoleConfig[], updatedPlayers: Player[], newCourseName?: string) => {
    if (!round) return;
    const updatedRound: RoundState = {
      ...round,
      courseName: newCourseName || round.courseName,
      holes: updatedHoles,
      players: updatedPlayers,
    };
    handleUpdateRound(updatedRound);
  };

  const handleSelectHoleFromScorecard = (holeNum: number) => {
    if (!round) return;
    setRound({
      ...round,
      currentHole: holeNum,
    });
    setCurrentTab('hole');
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-emerald-500 selection:text-white">
      {/* Header */}
      <Header
        round={round}
        onOpenRules={() => setShowRulesModal(true)}
        onOpenHistory={() => setShowHistoryModal(true)}
        onNewRound={() => setShowSetupModal(true)}
        onEditHandicaps={() => setShowHandicapModal(true)}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-md w-full mx-auto px-3.5 pt-3 pb-24">
        {round ? (
          <>
            {currentTab === 'hole' && (
              <HolePlayView
                round={round}
                onUpdateRound={handleUpdateRound}
                onNavigateTab={(tab) => setCurrentTab(tab)}
              />
            )}

            {currentTab === 'scorecard' && (
              <ScorecardView
                round={round}
                onSelectHole={handleSelectHoleFromScorecard}
              />
            )}

            {currentTab === 'settlement' && <LeaderboardView round={round} />}
          </>
        ) : (
          /* Empty State if no round loaded */
          <div className="text-center py-20 px-4 space-y-4">
            <div className="w-16 h-16 rounded-3xl bg-emerald-500/20 text-emerald-400 mx-auto flex items-center justify-center text-3xl border border-emerald-500/30">
              ⛳️
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">Welcome to Banker Golf</h2>
              <p className="text-xs text-slate-400 max-w-xs mx-auto mt-1">
                The high-stakes, rotating match-play betting game for 3 to 5 golfers.
              </p>
            </div>
            <button
              onClick={() => setShowSetupModal(true)}
              className="py-3 px-6 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-sm shadow-lg shadow-emerald-500/20 inline-flex items-center gap-2"
            >
              <PlusCircle className="w-4 h-4" /> Start New Round
            </button>
          </div>
        )}
      </main>

      {/* Mobile Bottom Navigation */}
      {round && (
        <BottomNav
          currentTab={currentTab}
          onSelectTab={setCurrentTab}
          currentHole={round.currentHole}
        />
      )}

      {/* Setup Wizard Modal */}
      <SetupModal
        isOpen={showSetupModal}
        onClose={() => setShowSetupModal(false)}
        onStartRound={handleStartRound}
        initialRound={round}
      />

      {/* Scorecard & Handicap Editor Modal */}
      {round && (
        <HandicapEditorModal
          isOpen={showHandicapModal}
          onClose={() => setShowHandicapModal(false)}
          round={round}
          onSaveHoles={handleSaveHoles}
        />
      )}

      {/* Rules Guide Modal */}
      <RulesGuideModal
        isOpen={showRulesModal}
        onClose={() => setShowRulesModal(false)}
      />

      {/* Round History Modal */}
      <RoundHistoryModal
        isOpen={showHistoryModal}
        onClose={() => setShowHistoryModal(false)}
        onLoadRound={(loaded) => {
          setRound(loaded);
          saveCurrentRound(loaded);
          setCurrentTab('hole');
        }}
      />
    </div>
  );
};
export default App;
