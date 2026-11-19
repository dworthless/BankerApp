# Banker - Golf Betting Tracker App

The premier on-course match-play betting game tracker built for iPhone & Mobile browsers.

## ⛳️ Features

- **Banker Match-Play Engine**:
  - One golfer is designated the **Banker** on each hole and plays simultaneous head-to-head matches against every opponent.
  - Zero-sum balances guaranteed on every hole.
- **The 3 Banker Rotation Modes**:
  1. **Predetermined Rotation**: Scheduled order (Player 1 → 2 → 3 → 4).
  2. **Low Net Score Wins Bank**: Lowest net scorer takes the Bank on the next hole.
  3. **Winner Holds ("Beat the Banker")**: Banker retains the bank until an opponent beats them.
- **Handicap & Stroke Management**:
  - Full Course Handicap off the lowest handicap in the group.
  - Interactive custom stroke matrix: tap to allocate strokes per hole per player.
  - Flat Gross / Scratch mode.
- **Live On-Course Action**:
  - Independent bet stake selectors ($1–$5+).
  - Live Presses & Doubles with automatic surrender/concession settlements.
  - Gross Birdie (2x) and Gross Eagle (3x) multipliers.
  - Live Banker financial exposure risk meter.
- **Complete Scorecard & Settlements**:
  - Horizontally scrollable 9/18-hole mobile scorecard with golf score badges & stroke indicators.
  - Zero-sum live running bank balance ledger.
  - Simplified Venmo / Cash settlement matrix (fewest transactions).
  - 1-click summary copy / iOS Web Share for WhatsApp & iMessage.
- **Offline & iPhone PWA Ready**:
  - Auto-saves all hole state to `localStorage`.
  - Installable as an iPhone Home Screen App (PWA).

## 🚀 Quick Start (Local Development)

```bash
# Install dependencies
npm install

# Start local dev server
npm run dev

# Run unit tests
npm test

# Build for production / GitHub Pages
npm run build
```

## 🌐 Deploy to GitHub Pages

1. Push this repository to GitHub.
2. In your repository on GitHub, navigate to **Settings** → **Pages**.
3. Under **Build and deployment** > **Source**, select **GitHub Actions**.
4. The included `.github/workflows/deploy.yml` workflow will automatically build and publish the app!
