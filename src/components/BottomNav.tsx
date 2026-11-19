import React from 'react';
import { CircleDot, DollarSign, Table } from 'lucide-react';

export type TabType = 'hole' | 'scorecard' | 'settlement';

interface BottomNavProps {
  currentTab: TabType;
  onSelectTab: (tab: TabType) => void;
  currentHole: number;
}

export const BottomNav: React.FC<BottomNavProps> = ({
  currentTab,
  onSelectTab,
  currentHole,
}) => {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-slate-900/95 backdrop-blur-lg border-t border-slate-800 pb-safe shadow-2xl">
      <div className="max-w-md mx-auto grid grid-cols-3 h-16">
        {/* Play Hole */}
        <button
          onClick={() => onSelectTab('hole')}
          className={`flex flex-col items-center justify-center space-y-1 transition active:scale-95 ${
            currentTab === 'hole'
              ? 'text-emerald-400 font-semibold'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <div className="relative">
            <CircleDot className="w-5 h-5" />
            <span className="absolute -top-1.5 -right-2.5 px-1 bg-emerald-500 text-[10px] font-bold text-slate-950 rounded-full min-w-4 text-center">
              {currentHole}
            </span>
          </div>
          <span className="text-[11px]">Hole Play</span>
        </button>

        {/* Scorecard */}
        <button
          onClick={() => onSelectTab('scorecard')}
          className={`flex flex-col items-center justify-center space-y-1 transition active:scale-95 ${
            currentTab === 'scorecard'
              ? 'text-emerald-400 font-semibold'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Table className="w-5 h-5" />
          <span className="text-[11px]">Scorecard</span>
        </button>

        {/* Settlement / Leaderboard */}
        <button
          onClick={() => onSelectTab('settlement')}
          className={`flex flex-col items-center justify-center space-y-1 transition active:scale-95 ${
            currentTab === 'settlement'
              ? 'text-emerald-400 font-semibold'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <DollarSign className="w-5 h-5" />
          <span className="text-[11px]">Ledger & Pay</span>
        </button>
      </div>
    </nav>
  );
};
