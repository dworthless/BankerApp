import { describe, expect, it } from 'vitest';
import { GameSettings, HoleConfig, HoleData, Player } from '../types';
import {
  calculateStrokeMatrix,
  determineNextBanker,
  settleHole,
  initializeRound,
  generateMatchCode,
} from './bankerEngine';
import { calculateMinimalSettlements } from './settlement';
import { searchGolfCourses, generateSmartCourse } from './courseApi';
import { BUILT_IN_COURSES } from './courseDatabase';
import { encodeRoundSnapshot, decodeRoundSnapshot } from './liveSync';

describe('Banker Betting Engine (Custom Personal Rules)', () => {
  const defaultSettings: GameSettings = {
    totalHoles: 18,
    startingHole: 1,
    baseBet: 5,
  };

  const players: Player[] = [
    { id: 'p1', name: 'Dan', handicap: 8, color: '#10B981' },
    { id: 'p2', name: 'Amy', handicap: 12, color: '#3B82F6' },
    { id: 'p3', name: 'Ben', handicap: 5, color: '#F59E0B' },
    { id: 'p4', name: 'Cal', handicap: 15, color: '#EC4899' },
  ];

  it('settles an ordinary hole with pure net match scoring (no multipliers)', () => {
    // Dan (Banker, Gross 4, Net 4)
    // Amy: $5 bet, Net 3 -> Amy wins $5
    // Ben: $2 bet, Net 5 -> Dan wins $2
    // Cal: $3 bet, Net 4 -> Push ($0)
    const holeConfig: HoleConfig = {
      holeNumber: 1,
      par: 4,
      handicapRank: 7,
      playerStrokes: { p1: 0, p2: 0, p3: 0, p4: 0 },
    };

    const holeData: HoleData = {
      holeNumber: 1,
      bankerId: 'p1', // Dan
      bets: { p2: 5, p3: 2, p4: 3 },
      presses: { p2: 'none', p3: 'none', p4: 'none' },
      scores: { p1: 4, p2: 3, p3: 5, p4: 4 },
      isComplete: true,
    };

    const result = settleHole(1, holeConfig, holeData, players, defaultSettings);

    expect(result.playerDeltas['p2']).toBe(5); // Amy +$5
    expect(result.playerDeltas['p3']).toBe(-2); // Ben -$2
    expect(result.playerDeltas['p4']).toBe(0); // Cal $0
    expect(result.playerDeltas['p1']).toBe(-3); // Dan -$3 (Banker)

    // Zero-sum check
    const sum = Object.values(result.playerDeltas).reduce((a, b) => a + b, 0);
    expect(sum).toBe(0);
  });

  it('handles non-par-3 player double ($5 -> $10) and banker double back ($10 -> $20)', () => {
    // Par 4 hole, base bet $5
    // Player p2 doubles (2x -> $10), Banker doubles back (4x -> $20)
    // p2 makes gross 3 (Net 3 vs Dan Net 4) -> p2 wins pure $20
    const holeConfig: HoleConfig = {
      holeNumber: 1,
      par: 4,
      handicapRank: 1,
      playerStrokes: { p1: 0, p2: 0, p3: 0, p4: 0 },
    };

    const holeData: HoleData = {
      holeNumber: 1,
      bankerId: 'p1',
      bets: { p2: 5, p3: 5, p4: 5 },
      presses: { p2: 'accepted', p3: 'accepted', p4: 'none' },
      pressDetails: {
        p2: { stage: 'redoubled', multiplier: 4, lastCaller: 'banker' }, // $5 * 4 = $20 match
        p3: { stage: 'pressed', multiplier: 2, lastCaller: 'opponent' }, // $5 * 2 = $10 match
        p4: { stage: 'base', multiplier: 1 }, // $5 flat
      },
      scores: { p1: 4, p2: 3, p3: 5, p4: 4 }, // p2 wins $20, p3 loses $10, p4 pushes $0
      isComplete: true,
    };

    const result = settleHole(1, holeConfig, holeData, players, defaultSettings);
    expect(result.playerDeltas['p2']).toBe(20); // p2 wins $20
    expect(result.playerDeltas['p3']).toBe(-10); // p3 loses $10
    expect(result.playerDeltas['p4']).toBe(0); // p4 pushes ($0)
    expect(result.playerDeltas['p1']).toBe(-10); // Banker: -20 + 10 + 0 = -10

    const sum = Object.values(result.playerDeltas).reduce((a, b) => a + b, 0);
    expect(sum).toBe(0);
  });

  it('handles Par-3 tripling ($5 -> $15) and tripling back ($15 -> $45)', () => {
    // Par 3 hole, base bet $5
    // Player p2 triples (3x -> $15), Banker triples back (9x -> $45)
    // p2 wins match net 3 vs net 4 -> p2 wins $45
    const holeConfig: HoleConfig = {
      holeNumber: 3,
      par: 3,
      handicapRank: 15,
      playerStrokes: { p1: 0, p2: 0, p3: 0, p4: 0 },
    };

    const holeData: HoleData = {
      holeNumber: 3,
      bankerId: 'p1',
      bets: { p2: 5, p3: 5, p4: 5 },
      presses: { p2: 'accepted', p3: 'accepted', p4: 'none' },
      pressDetails: {
        p2: { stage: 'redoubled', multiplier: 9, lastCaller: 'banker' }, // $5 * 9 = $45 match
        p3: { stage: 'pressed', multiplier: 3, lastCaller: 'opponent' }, // $5 * 3 = $15 match
        p4: { stage: 'base', multiplier: 1 },
      },
      scores: { p1: 4, p2: 3, p3: 5, p4: 4 }, // p1 makes 4, p2 makes 3, p3 makes 5, p4 makes 4
      isComplete: true,
    };

    const result = settleHole(3, holeConfig, holeData, players, defaultSettings);
    expect(result.playerDeltas['p2']).toBe(45); // p2 wins $45
    expect(result.playerDeltas['p3']).toBe(-15); // p3 loses $15 (3x)
    expect(result.playerDeltas['p4']).toBe(0); // p4 pushes ($0)
    expect(result.playerDeltas['p1']).toBe(-30); // Banker: -45 + 15 + 0 = -30

    const sum = Object.values(result.playerDeltas).reduce((a, b) => a + b, 0);
    expect(sum).toBe(0);
  });

  it('handles concession at redouble stage', () => {
    // On Par 4: p2 doubled to $10, Banker redoubled to $20. p2 concedes -> p2 loses $10 (previous level).
    const holeConfig: HoleConfig = {
      holeNumber: 1,
      par: 4,
      handicapRank: 1,
      playerStrokes: { p1: 0, p2: 0, p3: 0, p4: 0 },
    };

    const holeData: HoleData = {
      holeNumber: 1,
      bankerId: 'p1',
      bets: { p2: 5, p3: 5, p4: 5 },
      presses: { p2: 'declined', p3: 'none', p4: 'none' },
      pressDetails: {
        p2: { stage: 'conceded', multiplier: 1, concededBy: 'opponent', concededAmount: 10 },
      },
      scores: { p1: 4, p2: 4, p3: 4, p4: 4 },
      isComplete: true,
    };

    const result = settleHole(1, holeConfig, holeData, players, defaultSettings);
    expect(result.playerDeltas['p2']).toBe(-10); // p2 conceded $10
    expect(result.playerDeltas['p1']).toBe(10); // Banker gains $10
  });

  it('determines next banker by low net score', () => {
    const holeConfig: HoleConfig = {
      holeNumber: 1,
      par: 4,
      handicapRank: 1,
      playerStrokes: { p1: 0, p2: 0, p3: 0, p4: 0 },
    };

    const holeData: HoleData = {
      holeNumber: 1,
      bankerId: 'p1',
      bets: { p2: 5, p3: 5, p4: 5 },
      presses: { p2: 'none', p3: 'none', p4: 'none' },
      scores: { p1: 5, p2: 3, p3: 4, p4: 4 }, // p2 has lowest net score 3
      isComplete: true,
    };

    const nextBanker = determineNextBanker(1, holeConfig, holeData, players, defaultSettings);
    expect(nextBanker.nextBankerId).toBe('p2');
    expect(nextBanker.nextBankerReason).toContain('Low Net Score');
  });

  it('selects the longest putt player when low net score is tied', () => {
    const holeConfig: HoleConfig = {
      holeNumber: 1,
      par: 4,
      handicapRank: 1,
      playerStrokes: { p1: 0, p2: 0, p3: 0, p4: 0 },
    };

    // Both p2 and p3 tie with net 3
    // User selects p3 as longest putt winner
    const holeDataTied: HoleData = {
      holeNumber: 1,
      bankerId: 'p1',
      bets: { p2: 5, p3: 5, p4: 5 },
      presses: { p2: 'none', p3: 'none', p4: 'none' },
      scores: { p1: 5, p2: 3, p3: 3, p4: 5 },
      longestPuttPlayerId: 'p3',
      isComplete: true,
    };

    const nextBanker = determineNextBanker(1, holeConfig, holeDataTied, players, defaultSettings);
    expect(nextBanker.nextBankerId).toBe('p3');
    expect(nextBanker.nextBankerReason).toContain('Longest Made Putt');
  });

  it('allocates handicap strokes correctly off the low handicap', () => {
    // Players: p3 has 5 (lowest), p1 has 8, p2 has 12, p4 has 15
    // Relative: p3=0, p1=3, p2=7, p4=10
    const matrix = calculateStrokeMatrix(18, players, 'off_low_handicap');

    // p3 (low player) gets 0 strokes on all holes
    for (let h = 1; h <= 18; h++) {
      expect(matrix[h]['p3']).toBe(0);
    }

    const p1Total = Object.values(matrix).reduce((sum, h) => sum + (h['p1'] || 0), 0);
    const p2Total = Object.values(matrix).reduce((sum, h) => sum + (h['p2'] || 0), 0);
    const p4Total = Object.values(matrix).reduce((sum, h) => sum + (h['p4'] || 0), 0);

    expect(p1Total).toBe(3); // 8 - 5 = 3
    expect(p2Total).toBe(7); // 12 - 5 = 7
    expect(p4Total).toBe(10); // 15 - 5 = 10
  });

  it('minimizes cash transfers for settlement', () => {
    const netBalances = {
      alex: -10,
      ben: 6,
      dan: 4,
      chris: 0,
    };

    const group: Player[] = [
      { id: 'alex', name: 'Alex', handicap: 0, color: '' },
      { id: 'ben', name: 'Ben', handicap: 0, color: '' },
      { id: 'dan', name: 'Daniel', handicap: 0, color: '' },
      { id: 'chris', name: 'Chris', handicap: 0, color: '' },
    ];

    const transfers = calculateMinimalSettlements(group, netBalances);

    expect(transfers.length).toBe(2);
    const alexTransfers = transfers.filter((t) => t.fromPlayerId === 'alex');
    expect(alexTransfers.length).toBe(2);
    const totalPaid = alexTransfers.reduce((sum, t) => sum + t.amount, 0);
    expect(totalPaid).toBe(10);
  });

  it('searches golf courses and auto-uploads custom pars and handicap ranks', async () => {
    const results = await searchGolfCourses('Pebble Beach');
    expect(results.length).toBeGreaterThan(0);
    const pebble = results[0];
    expect(pebble.name).toContain('Pebble Beach');
    expect(pebble.tees.length).toBeGreaterThan(0);

    const blueTee = pebble.tees[0];
    expect(blueTee.pars.length).toBe(18);
    expect(blueTee.handicapRanks.length).toBe(18);

    // Initialize round with official Pebble Beach scorecard data
    const round = initializeRound(
      players,
      defaultSettings,
      pebble.name,
      blueTee.pars,
      blueTee.handicapRanks
    );

    expect(round.courseName).toBe('Pebble Beach Golf Links');
    expect(round.holes[0].par).toBe(blueTee.pars[0]);
    expect(round.holes[0].handicapRank).toBe(blueTee.handicapRanks[0]);

    // Stroke allocations should align with official handicap rankings
    // Ben has low hcp 5, Amy has hcp 12 (7 relative strokes)
    // Amy should receive strokes on holes with handicap rank <= 7
    round.holes.forEach((h) => {
      const amyStrokes = h.playerStrokes['p2'];
      if (h.handicapRank <= 7) {
        expect(amyStrokes).toBe(1);
      } else {
        expect(amyStrokes).toBe(0);
      }
    });
  });

  it('generates a smart scorecard fallback for custom course names', () => {
    const custom = generateSmartCourse('Torrey Pines Custom');
    expect(custom.name).toBe('Torrey Pines Custom');
    expect(custom.tees[0].pars.length).toBe(18);
    expect(custom.tees[0].handicapRanks.length).toBe(18);
  });

  it('includes Lakewood Oaks Golf Course in Lee Summit MO with correct scorecard', () => {
    const lakewood = BUILT_IN_COURSES.find((c) => c.id === 'lakewood-oaks');
    expect(lakewood).toBeDefined();
    expect(lakewood?.name).toBe('Lakewood Oaks Golf Course');
    expect(lakewood?.location).toContain("Lee's Summit");
    expect(lakewood?.tees.length).toBeGreaterThanOrEqual(4);

    const championshipTee = lakewood?.tees[0];
    expect(championshipTee?.pars.length).toBe(18);
    expect(championshipTee?.handicapRanks.length).toBe(18);
    // Par 71 check: sum of pars = 71
    const totalPar = championshipTee?.pars.reduce((a, b) => a + b, 0);
    expect(totalPar).toBe(71);
  });

  it('generates match codes and serializes snapshots for view-only spectators', () => {
    const code = generateMatchCode('Lakewood Oaks');
    expect(code).toMatch(/^LAK\d{3}$/);

    const round = initializeRound(players, defaultSettings, 'Lakewood Oaks Golf Course');
    expect(round.matchCode).toBeDefined();

    const snapshot = encodeRoundSnapshot(round);
    expect(typeof snapshot).toBe('string');
    expect(snapshot.length).toBeGreaterThan(20);

    const decoded = decodeRoundSnapshot(snapshot);
    expect(decoded).toBeDefined();
    expect(decoded?.courseName).toBe('Lakewood Oaks Golf Course');
    expect(decoded?.players.length).toBe(4);
    expect(decoded?.matchCode).toBe(round.matchCode);
  });

  it('contains comprehensive list of golf courses within 30 miles of Lees Summit MO', async () => {
    const leesSummitResults = await searchGolfCourses("Lee's Summit");
    expect(leesSummitResults.length).toBeGreaterThanOrEqual(25);

    const expectedCourseNames = [
      'Fred Arbanas Golf Course',
      'Shamrock Hills Golf Club',
      'Adams Pointe Golf Club',
      'Stone Canyon Golf Club',
      'Blue Springs Golf Club',
      'Creekmoor Golf Club',
      'Loch Lloyd',
      'Drumm Farm',
      'Winterstone Golf Course',
      'Swope Memorial',
      'Ironhorse Golf Club',
      'LionsGate',
      'St. Andrews Golf Club',
      'Falcon Ridge',
      'Shoal Creek Golf Course',
    ];

    expectedCourseNames.forEach((expectedName) => {
      const found = leesSummitResults.some((c) =>
        c.name.toLowerCase().includes(expectedName.toLowerCase()) ||
        (c.clubName && c.clubName.toLowerCase().includes(expectedName.toLowerCase()))
      );
      expect(found).toBe(true);
    });

    // Check that every single course has 18 holes and valid pars and handicap ranks
    leesSummitResults.forEach((course) => {
      expect(course.tees.length).toBeGreaterThanOrEqual(1);
      course.tees.forEach((tee) => {
        expect(tee.pars.length).toBe(18);
        expect(tee.handicapRanks.length).toBe(18);
        tee.pars.forEach((p) => {
          expect(p).toBeGreaterThanOrEqual(3);
          expect(p).toBeLessThanOrEqual(5);
        });
      });
    });
  });
});
