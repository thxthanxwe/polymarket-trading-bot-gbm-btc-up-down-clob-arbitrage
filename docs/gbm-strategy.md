# GBM Fair Probability Strategy

## Problem

Polymarket BTC Up/Down markets resolve based on whether BTC finishes above a **price to beat** (K) within a fixed window. Market prices reflect crowd odds; this bot estimates **fair probability** from spot dynamics and trades when the CLOB is mispriced after costs.

## Geometric Brownian Motion Model

We model spot BTC as:

\[
S_T = S_0 \exp\left((\mu - \tfrac{1}{2}\sigma^2)T + \sigma\sqrt{T}\,Z\right), \quad Z \sim \mathcal{N}(0,1)
\]

Fair probability that \(S_T > K\):

\[
d_2 = \frac{\ln(S_0/K) + (\mu - \tfrac{1}{2}\sigma^2)T}{\sigma\sqrt{T}}
\]

\[
P_{\text{up}} = N(d_2), \quad P_{\text{down}} = 1 - P_{\text{up}}
\]

### Inputs

| Symbol | Source |
|--------|--------|
| \(S_0\) | Latest Binance BTC/USDT trade |
| \(K\) | Market price-to-beat (Gamma metadata) |
| \(T\) | Time to resolution (converted to years) |
| \(\sigma\) | EWMA annualized realized vol |
| \(\mu\) | Optional drift (`DRIFT_MU`, default 0) |

Implementation: `src/modules/gbmModel.ts`

## Edge Calculation

\[
\text{edge}_{\text{up}} = P_{\text{up}} - \text{ask}_{\text{up}}
\]

Trade only if:

\[
\text{edge} > \text{fees} + \text{half-spread} + \text{slippage} + \text{MIN\_EDGE}
\]

## Position Sizing

Fractional Kelly (default quarter-Kelly):

\[
f^* = \frac{q - p}{1 - p}
\]

where \(q\) = model win probability, \(p\) = ask price.

Hard caps: `MAX_TRADE_USD`, `MAX_POSITION_PER_MARKET_USD`, `MAX_LOSS_PER_DAY_USD`.

## Timing Rules

- Do not open new positions in the final `STOP_BUYING_BEFORE_CLOSE_SEC` seconds (default 90).
- One entry per market ID per session (configurable extension point).

## Calibration

Log every prediction and resolution. Track:

- **Brier score**: \((p - y)^2\)
- **Reliability buckets**: predicted vs actual frequency by decile

Future: Platt scaling on out-of-sample windows.

## Related

- [Paper Trading](./paper-trading.md)
- [Architecture](./architecture.md)
