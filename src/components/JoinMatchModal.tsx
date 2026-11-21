import React, { useState } from 'react';
import { Eye, KeyRound, Sparkles, X } from 'lucide-react';

interface JoinMatchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onJoinMatch: (code: string) => void;
}

export const JoinMatchModal: React.FC<JoinMatchModalProps> = ({
  isOpen,
  onClose,
  onJoinMatch,
}) => {
  const [code, setCode] = useState('');
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = code.trim().toUpperCase();
    if (!clean || clean.length < 3) {
      setError('Please enter a valid match code (e.g. LAKE73)');
      return;
    }
    setError('');
    onJoinMatch(clean);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-800 rounded-t-3xl sm:rounded-2xl max-w-md w-full shadow-2xl animate-in fade-in slide-in-from-bottom duration-200">
        {/* Header */}
        <div className="p-4 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-sky-500/20 text-sky-400 flex items-center justify-center font-bold">
              <Eye className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">Join Live Match</h2>
              <p className="text-xs text-slate-400">View-Only Spectator Mode</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full text-slate-400 hover:text-white hover:bg-slate-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          <div className="text-xs text-slate-300">
            Enter the 6-character match code shared by the match owner to watch scores and live betting balances update in real-time.
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
              <KeyRound className="w-3.5 h-3.5 text-sky-400" /> Match Code
            </label>
            <input
              type="text"
              value={code}
              onChange={(e) => {
                setCode(e.target.value.toUpperCase());
                setError('');
              }}
              placeholder="e.g. LAKE73 or BNK482"
              maxLength={12}
              className="w-full bg-slate-950 border-2 border-slate-700 focus:border-sky-500 rounded-xl px-4 py-3 text-center text-xl font-black font-mono tracking-widest text-white uppercase placeholder-slate-600 focus:outline-none"
              autoFocus
            />
            {error && <p className="text-xs text-rose-400 font-medium">{error}</p>}
          </div>

          <div className="bg-sky-950/40 border border-sky-800/60 rounded-xl p-3 text-[11px] text-sky-200/90 space-y-1">
            <div className="font-bold flex items-center gap-1 text-sky-300">
              <Sparkles className="w-3.5 h-3.5" /> Real-Time Live Sync
            </div>
            <div>
              You will be able to see every hole score, gross & net totals, front/back nine splits, and the live Up/Down ledger without making edits.
            </div>
          </div>

          <div className="pt-2">
            <button
              type="submit"
              className="w-full py-3.5 rounded-xl bg-sky-500 hover:bg-sky-400 text-slate-950 font-black text-sm shadow-lg shadow-sky-500/20 active:scale-95 transition flex items-center justify-center gap-2"
            >
              <Eye className="w-4 h-4" /> Connect to Match
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
