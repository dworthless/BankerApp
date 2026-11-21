import { RoundState } from '../types';

const CURRENT_ROUND_KEY = 'banker_app_current_round_v1';
const ROUND_HISTORY_KEY = 'banker_app_round_history_v1';

export function saveCurrentRound(round: RoundState): void {
  try {
    const updated = {
      ...round,
      updatedAt: new Date().toISOString(),
    };
    localStorage.setItem(CURRENT_ROUND_KEY, JSON.stringify(updated));

    // Also update history entry if completed or in progress
    updateRoundInHistory(updated);
  } catch (err) {
    console.error('Failed to save round to localStorage:', err);
  }
}

export function loadCurrentRound(): RoundState | null {
  try {
    const raw = localStorage.getItem(CURRENT_ROUND_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as RoundState;
  } catch (err) {
    console.error('Failed to load round from localStorage:', err);
    return null;
  }
}

export function clearCurrentRound(): void {
  try {
    localStorage.removeItem(CURRENT_ROUND_KEY);
  } catch (err) {
    console.error('Failed to clear current round:', err);
  }
}

export function getRoundHistory(): RoundState[] {
  try {
    const raw = localStorage.getItem(ROUND_HISTORY_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as RoundState[];
  } catch (err) {
    console.error('Failed to get round history:', err);
    return [];
  }
}

export function updateRoundInHistory(round: RoundState): void {
  try {
    const history = getRoundHistory();
    const existingIdx = history.findIndex((r) => r.id === round.id);

    if (existingIdx >= 0) {
      history[existingIdx] = round;
    } else {
      history.unshift(round);
    }

    // Keep up to 20 past rounds
    const trimmed = history.slice(0, 20);
    localStorage.setItem(ROUND_HISTORY_KEY, JSON.stringify(trimmed));
  } catch (err) {
    console.error('Failed to update history in localStorage:', err);
  }
}

export function deleteRoundFromHistory(roundId: string): void {
  try {
    const history = getRoundHistory();
    const filtered = history.filter((r) => r.id !== roundId);
    localStorage.setItem(ROUND_HISTORY_KEY, JSON.stringify(filtered));
  } catch (err) {
    console.error('Failed to delete round from history:', err);
  }
}

export function clearAllRoundHistory(): void {
  try {
    localStorage.removeItem(ROUND_HISTORY_KEY);
  } catch (err) {
    console.error('Failed to clear all round history:', err);
  }
}
