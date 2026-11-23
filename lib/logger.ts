import fs from 'fs';
import path from 'path';

/**
 * Enhanced Structured Logger for Video Downloader
 * Active ONLY when ENABLE_LOGGING=true (or DEBUG_LOGGING=true) in .env.local / process.env.
 * Saves clean static log files in /logs directory:
 *   - api.log
 *   - error.log
 *   - engine.log
 *   - combined.log
 * Timestamp format: [DD-MM-YYYY HH:MM:SS]
 */

const LOGS_DIR = path.resolve(process.cwd(), 'logs');

function isLoggingEnabled(): boolean {
  return (
    process.env.ENABLE_LOGGING === 'true' ||
    process.env.DEBUG_LOGGING === 'true' ||
    process.env.NEXT_PUBLIC_ENABLE_LOGGING === 'true'
  );
}

function ensureLogsDir() {
  if (!fs.existsSync(LOGS_DIR)) {
    try {
      fs.mkdirSync(LOGS_DIR, { recursive: true });
    } catch {
      // Ignore directory creation errors if read-only
    }
  }
}

function formatTimestamp(): string {
  const now = new Date();
  const day = String(now.getDate()).padStart(2, '0');
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const year = now.getFullYear();
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  const seconds = String(now.getSeconds()).padStart(2, '0');
  return `${day}-${month}-${year} ${hours}:${minutes}:${seconds}`;
}

function appendToLogFile(filename: string, text: string) {
  try {
    ensureLogsDir();
    const filePath = path.join(LOGS_DIR, filename);
    fs.appendFileSync(filePath, text + '\n', 'utf8');
  } catch (err) {
    // Fail silently to avoid breaking API requests if disk write fails
  }
}

// ANSI colors for clean readable terminal logs
const colors = {
  reset: '\x1b[0m',
  dim: '\x1b[2m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  magenta: '\x1b[35m',
};

class Logger {
  private formatLogLine(level: string, tag: string, message: string, data?: any): { consoleStr: string; fileStr: string } {
    const timestamp = formatTimestamp();
    const cleanData = data !== undefined ? (typeof data === 'string' ? data : JSON.stringify(data, null, 2)) : '';

    const fileStr = `[${timestamp}] [${level}] [${tag}] ${message}${cleanData ? ' ' + cleanData : ''}`;

    let color = colors.cyan;
    if (level === 'ERROR') color = colors.red;
    else if (level === 'SUCCESS') color = colors.green;
    else if (level === 'WARN') color = colors.yellow;
    else if (level === 'ENGINE') color = colors.magenta;

    const consoleStr = `${colors.dim}[${timestamp}]${colors.reset} ${color}[${level}]${colors.reset} ${colors.blue}[${tag}]${colors.reset} ${message}${
      cleanData ? '\n' + colors.dim + cleanData + colors.reset : ''
    }`;

    return { consoleStr, fileStr };
  }

  request(route: string, method: string, payload?: any) {
    if (!isLoggingEnabled()) return;
    const { consoleStr, fileStr } = this.formatLogLine(
      'REQ',
      `API:${route.toUpperCase()}`,
      `Incoming ${method.toUpperCase()} request`,
      payload
    );
    console.log(consoleStr);
    appendToLogFile('api.log', fileStr);
    appendToLogFile('combined.log', fileStr);
  }

  response(route: string, status: number, payload?: any, durationMs?: number) {
    if (!isLoggingEnabled()) return;
    const durationText = durationMs !== undefined ? ` in ${durationMs}ms` : '';
    const level = status >= 400 ? 'ERROR' : 'SUCCESS';
    const { consoleStr, fileStr } = this.formatLogLine(
      level,
      `API:${route.toUpperCase()}`,
      `Response HTTP ${status}${durationText}`,
      payload
    );
    console.log(consoleStr);
    appendToLogFile('api.log', fileStr);
    appendToLogFile('combined.log', fileStr);
  }

  error(tag: string, message: string, error?: any, context?: any) {
    if (!isLoggingEnabled()) return;
    const errData: any = {};
    if (error instanceof Error) {
      errData.message = error.message;
      errData.stack = error.stack;
    } else if (error) {
      errData.error = error;
    }
    if (context) {
      errData.context = context;
    }

    const { consoleStr, fileStr } = this.formatLogLine('ERROR', tag.toUpperCase(), message, errData);
    console.error(consoleStr);

    appendToLogFile('error.log', fileStr);
    appendToLogFile('combined.log', fileStr);
  }

  info(tag: string, message: string, data?: any) {
    if (!isLoggingEnabled()) return;
    const { consoleStr, fileStr } = this.formatLogLine('INFO', tag.toUpperCase(), message, data);
    console.log(consoleStr);
    if (tag.toUpperCase().startsWith('API')) {
      appendToLogFile('api.log', fileStr);
    }
    appendToLogFile('combined.log', fileStr);
  }

  engine(tag: string, message: string, details?: any) {
    if (!isLoggingEnabled()) return;
    const { consoleStr, fileStr } = this.formatLogLine('ENGINE', tag.toUpperCase(), message, details);
    console.log(consoleStr);
    appendToLogFile('engine.log', fileStr);
    appendToLogFile('combined.log', fileStr);
  }
}

export const logger = new Logger();
