#!/usr/bin/env node
import { TradingBot } from './bot/runner.js';

async function main(): Promise<void> {
  const bot = new TradingBot();

  const shutdown = async () => {
    console.log('\nShutting down...');
    await bot.stop();
    process.exit(0);
  };

  process.on('SIGINT', () => void shutdown());
  process.on('SIGTERM', () => void shutdown());

  try {
    await bot.start();
  } catch (error) {
    console.error('Fatal error:', error instanceof Error ? error.message : error);
    process.exit(1);
  }
}

main();
