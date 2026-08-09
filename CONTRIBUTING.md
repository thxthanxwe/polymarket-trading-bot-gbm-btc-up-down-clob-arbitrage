# Contributing

Thank you for your interest in this **Polymarket trading bot** project.

## How to Contribute

1. Fork the repository
2. Create a branch: `git checkout -b feature/your-feature`
3. Make changes with tests where applicable
4. Run `npm test` and `npm run lint`
5. Open a Pull Request with a clear description

## Priority Areas

We especially welcome contributions for **live trading production quality**:

- CLOB WebSocket streaming (lower latency order books)
- Chainlink Data Streams integration
- Market resolution polling and PnL reconciliation
- Platt / isotonic calibration layers
- Dashboard UI over JSONL logs
- Integration tests with mocked APIs

## Discussions

Open a GitHub Discussion to share paper-trading results, parameter tuning, or strategy ideas. The maintainer wants to collaborate and discuss what works in practice.

## Code Style

- TypeScript strict mode
- Match existing module patterns
- Keep math changes covered by unit tests in `tests/`

## Security

Never include private keys, `.env` files, or wallet addresses in PRs.
