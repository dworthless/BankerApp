import React, { useEffect, useState } from 'react';
import { HoleConfig, Player, RoundState } from './types';
import {
  clearAllRoundHistory,
  clearCurrentRound,
  loadCurrentRound,
  saveCurrentRound,
} from './utils/storage';
import {
  connectLiveRoom,
  decodeRoundSnapshot,
  disconnectLiveRoom,
  publishRoundUpdate,
} from './utils/liveSync';
import { initializeRound } from './utils/bankerEngine';
import { Header } from './components/Header';
import { BottomNav, TabType } from './components/BottomNav';
import { HolePlayView } from './components/HolePlayView';
import { ScorecardView } from './components/ScorecardView';
import { LeaderboardView } from './components/LeaderboardView';
import { SetupModal } from './components/SetupModal';
import { HandicapEditorModal } from './components/HandicapEditorModal';
import { RulesGuideModal } from './components/RulesGuideModal';
import { RoundHistoryModal } from './components/RoundHistoryModal';
import { ShareLiveModal } from './components/ShareLiveModal';
import { JoinMatchModal } from './components/JoinMatchModal';
import { ResetMatchModal } from './components/ResetMatchModal';
import { Eye, PlusCircle } from 'lucide-react';

export const App: React.FC = () => {
  const [round, setRound] = useState<RoundState | null>(null);
  const [currentTab, setCurrentTab] = useState<TabType>('hole');

  // Spectator & Live Sync State
  const [isSpectator, setIsSpectator] = useState<boolean>(false);
  const [liveStatus, setLiveStatus] = useState<
    'disconnected' | 'connecting' | 'connected' | 'error'
  >('disconnected');

  // Modals
  const [showSetupModal, setShowSetupModal] = useState<boolean>(false);
  const [showHandicapModal, setShowHandicapModal] = useState<boolean>(false);
  const [showRulesModal, setShowRulesModal] = useState<boolean>(false);
  const [showHistoryModal, setShowHistoryModal] = useState<boolean>(false);
  const [showShareModal, setShowShareModal] = useState<boolean>(false);
  const [showJoinModal, setShowJoinModal] = useState<boolean>(false);
  const [showResetModal, setShowResetModal] = useState<boolean>(false);

  // Initialize round & check for spectator / shared match URL
  useEffect(() => {
    // 1. Check URL query params for ?view=CODE or ?match=CODE
    const urlParams = new URLSearchParams(window.location.search);
    const viewCode = urlParams.get('view') || urlParams.get('match');

    // 2. Check URL hash for snapshot #s=...
    let snapshotRound: RoundState | null = null;
    if (window.location.hash.startsWith('#s=')) {
      const encoded = window.location.hash.slice(3);
      snapshotRound = decodeRoundSnapshot(encoded);
    }

    if (viewCode) {
      // Spectator Mode
      const code = viewCode.trim().toUpperCase();
      setIsSpectator(true);

      if (snapshotRound) {
        setRound(snapshotRound);
      }

      connectLiveRoom(
        code,
        false,
        snapshotRound || undefined,
        (incomingRound) => {
          setRound(incomingRound);
        },
        (status) => setLiveStatus(status)
      );
      return;
    }

    // 3. Normal Owner Mode: Load active round from storage
    const saved = loadCurrentRound();
    if (saved) {
      // Ensure matchCode exists
      if (!saved.matchCode) {
        saved.matchCode = `LAK${Math.floor(100 + Math.random() * 900)}`;
        saveCurrentRound(saved);
      }
      setRound(saved);
      // Connect as owner to broadcast
      connectLiveRoom(
        saved.matchCode,
        true,
        saved,
        undefined,
        (status) => setLiveStatus(status)
      );
    } else {
      setShowSetupModal(true);
    }

    return () => {
      disconnectLiveRoom();
    };
  }, []);

  // Update & persist round (Owner mode)
  const handleUpdateRound = (updated: RoundState) => {
    if (isSpectator) return;
    setRound(updated);
    saveCurrentRound(updated);
    publishRoundUpdate(updated);
  };

  const handleStartRound = (newRound: RoundState) => {
    setIsSpectator(false);
    setRound(newRound);
    saveCurrentRound(newRound);
    setCurrentTab('hole');

    if (newRound.matchCode) {
      connectLiveRoom(
        newRound.matchCode,
        true,
        newRound,
        undefined,
        (status) => setLiveStatus(status)
      );
    }
  };

  const handleSaveHoles = (
    updatedHoles: HoleConfig[],
    updatedPlayers: Player[],
    newCourseName?: string
  ) => {
    if (!round || isSpectator) return;
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

  // Join match as spectator from modal
  const handleJoinMatchByCode = (code: string) => {
    const cleanCode = code.trim().toUpperCase();
    setIsSpectator(true);
    setRound(null); // Will load from live sync

    connectLiveRoom(
      cleanCode,
      false,
      undefined,
      (incomingRound) => {
        setRound(incomingRound);
      },
      (status) => setLiveStatus(status)
    );
  };

  // Exit spectator mode and return to user's saved game
  const handleExitSpectator = () => {
    disconnectLiveRoom();
    setIsSpectator(false);
    // Remove query params
    window.history.replaceState(null, '', window.location.pathname);

    const saved = loadCurrentRound();
    if (saved) {
      setRound(saved);
      connectLiveRoom(
        saved.matchCode || 'BANKER',
        true,
        saved,
        undefined,
        (status) => setLiveStatus(status)
      );
    } else {
      setRound(null);
      setShowSetupModal(true);
    }
  };

  // Reset scores to Hole 1 (keep players & course)
  const handleResetScoresToHole1 = () => {
    if (!round) return;
    const pars = round.holes.map((h) => h.par);
    const hdcps = round.holes.map((h) => h.handicapRank);
    const freshRound = initializeRound(
      round.players,
      round.settings,
      round.courseName,
      pars,
      hdcps
    );
    // Keep existing match code
    if (round.matchCode) {
      freshRound.matchCode = round.matchCode;
    }
    handleStartRound(freshRound);
  };

  // Wipe active game and clear all history to forget past matches
  const handleClearEverythingAndForget = () => {
    clearCurrentRound();
    clearAllRoundHistory();
    setRound(null);
    setShowSetupModal(true);
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
        onOpenShare={() => setShowShareModal(true)}
        onOpenJoin={() => setShowJoinModal(true)}
        onOpenReset={() => setShowResetModal(true)}
        isSpectator={isSpectator}
        onExitSpectator={handleExitSpectator}
        connectionStatus={liveStatus}
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
                isSpectator={isSpectator}
                onOpenShare={() => setShowShareModal(true)}
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
        ) : isSpectator ? (
          /* Connecting to Live Spectator Match */
          <div className="text-center py-20 px-4 space-y-4">
            <div className="w-16 h-16 rounded-3xl bg-sky-500/20 text-sky-400 mx-auto flex items-center justify-center text-3xl border border-sky-500/30 animate-pulse">
              <Eye className="w-8 h-8" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">Connecting to Live Match...</h2>
              <p className="text-xs text-slate-400 max-w-xs mx-auto mt-1">
                Waiting for match owner to enter scores or sync round state.
              </p>
            </div>
            <button
              onClick={handleExitSpectator}
              className="py-2.5 px-5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs"
            >
              Exit Spectator View
            </button>
          </div>
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
            <div className="flex flex-col gap-2 max-w-xs mx-auto pt-2">
              <button
                onClick={() => setShowSetupModal(true)}
                className="py-3 px-6 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-sm shadow-lg shadow-emerald-500/20 inline-flex items-center justify-center gap-2"
              >
                <PlusCircle className="w-4 h-4" /> Start New Round
              </button>
              <button
                onClick={() => setShowJoinModal(true)}
                className="py-2.5 px-6 rounded-xl bg-slate-800 hover:bg-slate-700 text-sky-400 border border-slate-700 font-bold text-xs inline-flex items-center justify-center gap-2"
              >
                <Eye className="w-4 h-4" /> Join Live Match as Spectator
              </button>
            </div>
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
          setIsSpectator(false);
          setRound(loaded);
          saveCurrentRound(loaded);
          setCurrentTab('hole');
          if (loaded.matchCode) {
            connectLiveRoom(
              loaded.matchCode,
              true,
              loaded,
              undefined,
              (status) => setLiveStatus(status)
            );
          }
        }}
      />

      {/* Share Live Modal */}
      {round && (
        <ShareLiveModal
          isOpen={showShareModal}
          onClose={() => setShowShareModal(false)}
          round={round}
          connectionStatus={liveStatus}
        />
      )}

      {/* Join Match Modal */}
      <JoinMatchModal
        isOpen={showJoinModal}
        onClose={() => setShowJoinModal(false)}
        onJoinMatch={handleJoinMatchByCode}
      />

      {/* Reset & Start Over Modal */}
      <ResetMatchModal
        isOpen={showResetModal}
        onClose={() => setShowResetModal(false)}
        round={round}
        onStartNewMatch={() => setShowSetupModal(true)}
        onResetScoresToHole1={handleResetScoresToHole1}
        onClearEverythingAndForget={handleClearEverythingAndForget}
      />
    </div>
  );
};

export default App;
