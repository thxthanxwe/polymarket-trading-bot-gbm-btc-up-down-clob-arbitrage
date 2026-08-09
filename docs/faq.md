# FAQ

## General

### What is this project?

An open-source **Polymarket trading bot** for BTC Up/Down markets (5m, 15m, 1h) that estimates fair probability with **Geometric Brownian Motion (GBM)**, compares to Polymarket CLOB odds, and trades when edge exceeds costs.

### Is this a polymarket AI trading bot?

It is a **quantitative model-based bot** (GBM + EWMA vol), not an LLM news agent. The architecture leaves room for AI/LLM overlays (sentiment, event classification) via contributions.

### Does it guarantee profit?

No. Markets are competitive. The bot enforces strict risk limits and defaults to paper mode.

## Setup

### Python or TypeScript?

This repo is **TypeScript / Node.js** with `@polymarket/clob-client`. Python developers can port the math modules; PRs for a Python sibling repo are welcome.

### Minimum Node version?

Node.js 18+.

## Strategy

### Why GBM for 5-minute markets?

GBM provides a fast, interpretable fair odds baseline for short horizons. Drift defaults to zero; volatility adapts via EWMA.

### How is K (price to beat) determined?

Parsed from Gamma market metadata (question/description). Fallback hooks exist for slug-based markets.

### Why stop buying 90 seconds before close?

Spread and settlement uncertainty dominate near expiry; edge estimates become unreliable.

## Operations

### Where are logs stored?

`./logs/` — JSON lines for predictions, trades, resolutions.

### How do I tune aggressiveness?

Lower `MIN_EDGE` → more trades (higher noise). Raise `KELLY_FRACTION` → larger size (higher variance).

## Community

### Can I talk to the developer?

Yes — please open GitHub **Discussions** or Issues. The maintainer wants to connect with users, share results, and collaborate on improvements.

### The developer has profitable results?

Decent results have been achieved in paper and limited live runs; the author is actively seeking higher profitability and welcomes engineering help.

## SEO / Discovery

Looking for: polymarket trading bot github, polymarket clob bot, polymarket btc 5 minute bot, polymarket up down bot, polymarket fair odds bot, polymarket bot 2026 — you are in the right repository.

See [GBM Strategy](./gbm-strategy.md) | [Architecture](./architecture.md) | [Paper Trading](./paper-trading.md)
