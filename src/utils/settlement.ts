import { PaymentTransfer, Player, RoundState } from '../types';
import { calculatePlayerStats } from './bankerEngine';

/**
 * Calculates the minimum number of cash transfers to settle all debts
 * Using the standard greedy min-cash-flow balance settlement algorithm
 */
export function calculateMinimalSettlements(
  players: Player[],
  netBalances: Record<string, number>
): PaymentTransfer[] {
  // Separate into debtors (< 0) and creditors (> 0)
  const debtors: { playerId: string; amount: number }[] = [];
  const creditors: { playerId: string; amount: number }[] = [];

  players.forEach((p) => {
    const bal = Math.round((netBalances[p.id] || 0) * 100) / 100;
    if (bal < -0.01) {
      debtors.push({ playerId: p.id, amount: -bal }); // positive debt
    } else if (bal > 0.01) {
      creditors.push({ playerId: p.id, amount: bal });
    }
  });

  // Sort descending by amount
  debtors.sort((a, b) => b.amount - a.amount);
  creditors.sort((a, b) => b.amount - a.amount);

  const transfers: PaymentTransfer[] = [];
  let dIdx = 0;
  let cIdx = 0;

  while (dIdx < debtors.length && cIdx < creditors.length) {
    const debtor = debtors[dIdx];
    const creditor = creditors[cIdx];

    const settledAmount = Math.min(debtor.amount, creditor.amount);

    if (settledAmount > 0.01) {
      transfers.push({
        fromPlayerId: debtor.playerId,
        toPlayerId: creditor.playerId,
        amount: Math.round(settledAmount * 100) / 100,
      });
    }

    debtor.amount -= settledAmount;
    creditor.amount -= settledAmount;

    if (debtor.amount <= 0.01) {
      dIdx++;
    }
    if (creditor.amount <= 0.01) {
      cIdx++;
    }
  }

  return transfers;
}

/**
 * Generate a clean, readable text summary for copying into iMessage / WhatsApp
 */
export function generateRoundSummaryText(round: RoundState): string {
  const stats = calculatePlayerStats(round);
  const netBalances: Record<string, number> = {};
  stats.forEach((s) => {
    netBalances[s.playerId] = s.netWinnings;
  });

  const settlements = calculateMinimalSettlements(round.players, netBalances);
  const playedHoles = round.holes.filter((h) => {
    const data = round.holesData[h.holeNumber];
    return data && data.isComplete;
  }).length;

  let text = `⛳️ BANKER GOLF BETTING RECAP\n`;
  text += `📍 ${round.courseName || 'Round Recap'} (${playedHoles}/${round.settings.totalHoles} holes)\n`;
  text += `📅 ${new Date(round.createdAt).toLocaleDateString()}\n\n`;

  text += `🏆 FINAL STANDINGS:\n`;
  const sortedStats = [...stats].sort((a, b) => b.netWinnings - a.netWinnings);
  sortedStats.forEach((s, idx) => {
    const sign = s.netWinnings > 0 ? '+' : '';
    const emoji = idx === 0 && s.netWinnings > 0 ? '👑' : s.netWinnings < 0 ? '💸' : '🎯';
    text += `${emoji} ${s.name}: ${sign}$${s.netWinnings.toFixed(2)} (Gross: ${s.grossTotal || '-'})\n`;
  });

  if (settlements.length > 0) {
    text += `\n💰 VENMO / CASH SETTLEMENTS:\n`;
    settlements.forEach((t) => {
      const from = round.players.find((p) => p.id === t.fromPlayerId)?.name || 'Player';
      const to = round.players.find((p) => p.id === t.toPlayerId)?.name || 'Player';
      text += `• ${from} pays ${to} 👉 $${t.amount.toFixed(2)}\n`;
    });
  } else {
    text += `\n🤝 All balances are even! No transfers needed.\n`;
  }

  text += `\nTracked live with Banker App 🏦`;
  return text;
}
