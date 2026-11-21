import React, { useState } from 'react';
import { RoundState } from '../types';
import { generateShareableLink } from '../utils/liveSync';
import { Check, Copy, MessageSquare, Share2, Users, Wifi, X } from 'lucide-react';

interface ShareLiveModalProps {
  isOpen: boolean;
  onClose: () => void;
  round: RoundState;
  connectionStatus: 'disconnected' | 'connecting' | 'connected' | 'error';
}

export const ShareLiveModal: React.FC<ShareLiveModalProps> = ({
  isOpen,
  onClose,
  round,
  connectionStatus,
}) => {
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);

  if (!isOpen) return null;

  const matchCode = (round.matchCode || 'BANKER').toUpperCase();
  const shareLink = generateShareableLink(round);

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareLink);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2500);
    } catch {
      // Fallback
    }
  };

  const handleCopyCode = async () => {
    try {
      await navigator.clipboard.writeText(matchCode);
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2500);
    } catch {
      // Fallback
    }
  };

  const handleShareText = () => {
    const text = `⛳️ Follow our live Banker Golf game at ${round.courseName || 'the course'}!\n\n🔑 Match Code: ${matchCode}\n🔗 Live Link: ${shareLink}`;
    if (navigator.share) {
      navigator.share({
        title: `Live Banker Game - ${matchCode}`,
        text,
        url: shareLink,
      }).catch(() => {});
    } else {
      handleCopyLink();
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-800 rounded-t-3xl sm:rounded-2xl max-w-md w-full shadow-2xl animate-in fade-in slide-in-from-bottom duration-200">
        {/* Header */}
        <div className="p-4 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold">
              <Share2 className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">Share Live View-Only Match</h2>
              <p className="text-xs text-slate-400">Let others watch scores & money in real time</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full text-slate-400 hover:text-white hover:bg-slate-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-4 space-y-4">
          {/* Connection status badge */}
          <div className="flex items-center justify-between bg-slate-800/80 border border-slate-700/80 rounded-xl px-3.5 py-2 text-xs">
            <span className="text-slate-300 font-medium flex items-center gap-2">
              <Wifi className="w-4 h-4 text-emerald-400" /> Live Match Cloud Sync:
            </span>
            <span
              className={`font-bold flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] ${
                connectionStatus === 'connected'
                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                  : connectionStatus === 'connecting'
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                  : 'bg-slate-700 text-slate-300'
              }`}
            >
              <span
                className={`w-2 h-2 rounded-full ${
                  connectionStatus === 'connected'
                    ? 'bg-emerald-400 animate-pulse'
                    : connectionStatus === 'connecting'
                    ? 'bg-amber-400 animate-ping'
                    : 'bg-slate-400'
                }`}
              />
              {connectionStatus === 'connected'
                ? 'Live Connected'
                : connectionStatus === 'connecting'
                ? 'Connecting...'
                : 'Ready'}
            </span>
          </div>

          {/* Big Match Code Box */}
          <div className="bg-gradient-to-br from-slate-950 to-slate-900 border-2 border-emerald-500/40 rounded-2xl p-4 text-center space-y-2 shadow-inner">
            <div className="text-[11px] uppercase tracking-widest text-emerald-400 font-bold">
              Spectator Match Code
            </div>
            <div className="text-4xl font-black tracking-widest text-white font-mono select-all">
              {matchCode}
            </div>
            <p className="text-[11px] text-slate-400">
              Other players or spectators can enter this code in their app to follow live.
            </p>
            <button
              onClick={handleCopyCode}
              className="mt-1 py-1.5 px-4 rounded-lg bg-slate-800 hover:bg-slate-700 text-emerald-300 border border-slate-700 text-xs font-bold inline-flex items-center gap-1.5 active:scale-95 transition"
            >
              {copiedCode ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-400" /> Copied Code!
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" /> Copy Code
                </>
              )}
            </button>
          </div>

          {/* Direct Link Share */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider block">
              1-Tap Spectator Link
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                readOnly
                value={shareLink}
                className="flex-1 bg-slate-800/80 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-300 font-mono truncate focus:outline-none select-all"
              />
              <button
                onClick={handleCopyLink}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-bold text-xs rounded-xl flex items-center gap-1.5 transition active:scale-95 shadow-md"
              >
                {copiedLink ? (
                  <>
                    <Check className="w-4 h-4" /> Copied!
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4" /> Copy
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="grid grid-cols-2 gap-2 pt-1">
            <button
              onClick={handleShareText}
              className="py-2.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-xs font-bold flex items-center justify-center gap-2 active:scale-95 transition"
            >
              <MessageSquare className="w-4 h-4 text-emerald-400" /> Text / WhatsApp
            </button>
            <button
              onClick={handleCopyLink}
              className="py-2.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-xs font-bold flex items-center justify-center gap-2 active:scale-95 transition"
            >
              <Users className="w-4 h-4 text-emerald-400" /> Spectators View
            </button>
          </div>

          <div className="bg-slate-950/60 rounded-xl p-3 border border-slate-800 text-[11px] text-slate-400 space-y-1">
            <p className="font-semibold text-slate-300 flex items-center gap-1">
              <span>🔒 View-Only Protection</span>
            </p>
            <p>
              Spectators can watch the live Up/Down money ticker, hole results, scorecard splits, and verify all scores, but cannot edit or change your scores.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-900 flex justify-end">
          <button
            onClick={onClose}
            className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
