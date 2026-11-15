/**
 * Fiorify — Production Logger
 * Provides structured JSON logging in production and readable formatting in development.
 */

const LOG_LEVELS = {
  error: 0,
  warn: 1,
  info: 2,
  debug: 3
};

const currentLevel = (process.env.LOG_LEVEL || (process.env.NODE_ENV === 'production' ? 'info' : 'debug')).toLowerCase();

function shouldLog(level) {
  const currentPriority = LOG_LEVELS[currentLevel] !== undefined ? LOG_LEVELS[currentLevel] : 2;
  const targetPriority = LOG_LEVELS[level] !== undefined ? LOG_LEVELS[level] : 2;
  return targetPriority <= currentPriority;
}

function formatLog(level, message, meta = {}) {
  const isProd = process.env.NODE_ENV === 'production';
  const timestamp = new Date().toISOString();

  if (isProd) {
    const logObj = {
      timestamp,
      level: level.toUpperCase(),
      message,
      ...meta
    };
    if (meta.error && meta.error instanceof Error) {
      logObj.error = {
        message: meta.error.message,
        stack: meta.error.stack,
        code: meta.error.code
      };
    }
    return JSON.stringify(logObj);
  }

  const metaStr = Object.keys(meta).length > 0 ? ` ${JSON.stringify(meta)}` : '';
  return `[${timestamp}] [${level.toUpperCase()}] ${message}${metaStr}`;
}

export const logger = {
  info: (message, meta) => {
    if (shouldLog('info')) {
      console.log(formatLog('info', message, meta));
    }
  },
  warn: (message, meta) => {
    if (shouldLog('warn')) {
      console.warn(formatLog('warn', message, meta));
    }
  },
  error: (message, meta) => {
    if (shouldLog('error')) {
      console.error(formatLog('error', message, meta));
    }
  },
  debug: (message, meta) => {
    if (shouldLog('debug')) {
      console.log(formatLog('debug', message, meta));
    }
  }
};
