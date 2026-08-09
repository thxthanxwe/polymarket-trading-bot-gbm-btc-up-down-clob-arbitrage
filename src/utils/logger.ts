import { appendFileSync, existsSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

const LEVELS: Record<LogLevel, number> = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40,
};

export class Logger {
  private minLevel: number;
  private logDir: string;

  constructor(level = 'info', logDir = './logs') {
    this.minLevel = LEVELS[(level as LogLevel) ?? 'info'] ?? LEVELS.info;
    this.logDir = logDir;
    if (!existsSync(this.logDir)) {
      mkdirSync(this.logDir, { recursive: true });
    }
  }

  private write(level: LogLevel, message: string, meta?: Record<string, unknown>): void {
    if (LEVELS[level] < this.minLevel) return;
    const entry = {
      ts: new Date().toISOString(),
      level,
      message,
      ...meta,
    };
    const line = JSON.stringify(entry);
    console.log(line);
    appendFileSync(join(this.logDir, 'bot.log'), `${line}\n`);
  }

  debug(message: string, meta?: Record<string, unknown>): void {
    this.write('debug', message, meta);
  }

  info(message: string, meta?: Record<string, unknown>): void {
    this.write('info', message, meta);
  }

  warn(message: string, meta?: Record<string, unknown>): void {
    this.write('warn', message, meta);
  }

  error(message: string, meta?: Record<string, unknown>): void {
    this.write('error', message, meta);
  }

  appendJson(filename: string, record: unknown): void {
    appendFileSync(join(this.logDir, filename), `${JSON.stringify(record)}\n`);
  }
}
