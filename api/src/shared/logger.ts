type LogLevel = 'info' | 'warn' | 'error';

function write(level: LogLevel, message: string, details?: unknown): void {
  const entry = {
    level,
    time: new Date().toISOString(),
    message,
    ...(details === undefined ? {} : { details }),
  };

  const serialized = JSON.stringify(entry);

  if (level === 'error') {
    console.error(serialized);
    return;
  }

  if (level === 'warn') {
    console.warn(serialized);
    return;
  }

  console.log(serialized);
}

/** Minimal structured logger so log output stays machine-readable in containers. */
export const logger = {
  info: (message: string, details?: unknown) => write('info', message, details),
  warn: (message: string, details?: unknown) => write('warn', message, details),
  error: (message: string, details?: unknown) => write('error', message, details),
};
