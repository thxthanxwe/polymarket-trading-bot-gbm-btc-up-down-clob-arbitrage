# GitHub Publish Checklist

The project is prepared locally. **Do not push until you are ready.**

## 1. Create GitHub Repository

- **Name:** `polymarket-trading-bot-gbm-btc-up-down-clob-arbitrage`
- **Description:** Copy from [GITHUB_ABOUT.md](./GITHUB_ABOUT.md)
- **Topics:** Copy topic list from [GITHUB_ABOUT.md](./GITHUB_ABOUT.md)
- **Public** recommended for open-source discovery
- Do **not** initialize with README (this repo already has one)

## 2. About Panel (GitHub Settings → General)

Paste the **Description** and **Topics** from `GITHUB_ABOUT.md`.

For extended SEO text and the 10× **polymarket AI model trading bot** phrase list, see the bottom section of `GITHUB_ABOUT.md`. GitHub About has a 350-character limit on Description — use the short description there; keep the extended blurb in README / Discussions.

## 3. Local Commit & Push

```bash
cd "/root/wdh/Polymarket Trading Bot – AI Model Trading Bot for BTC 5m 15m 1h Up Down Markets | GBM Geometric Brownian Motion Probability Fair Value CLOB Arbitrage Bot"

git commit -m "$(cat <<'EOF'
Initial release: GBM Polymarket BTC Up/Down CLOB arbitrage bot (paper-first)

Production TypeScript bot with GBM fair value, edge engine, fractional Kelly risk controls, paper/live execution, tests, and documentation.
EOF
)"

git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/polymarket-trading-bot-gbm-btc-up-down-clob-arbitrage.git
git push -u origin main
```

Replace `YOUR_USERNAME` with your GitHub handle.

## 4. Enable GitHub Discussions

Settings → General → Features → **Discussions** (so visitors can reach you)

Suggested first Discussion: *"Share your paper trading results / parameter tuning"*

## 5. Verify Locally Before Live Trading

```bash
cp .env.example .env
npm install
npm test
npm run paper
```

## 6. Optional Next Steps

- Add social preview image (use `assets/dashboard/pnl-overview.svg` exported to PNG)
- Pin README sections for SEO: strategy, quick start, contributing
- Star/watch your own repo after publish

## Files Reference

| File | Purpose |
|------|---------|
| `README.md` | Main landing page + SEO keywords + dashboards |
| `GITHUB_ABOUT.md` | About panel copy + topics + 10× keyword phrase |
| `docs/` | Architecture, FAQ, guides for Google long-tail |
| `.env.example` | Safe defaults (paper mode) |
