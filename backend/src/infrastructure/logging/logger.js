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

const SENSITIVE_KEY_PATTERN = /(password|secret|token|authorization|clientsecret|client_secret|apikey|api_key|credential)/i;

function scrubSecrets(value, depth = 0) {
  if (depth > 5 || value === null || value === undefined) return value;
  if (typeof value !== 'object') return value;
  if (value instanceof Error) {
    return { message: value.message, code: value.code, stack: value.stack };
  }
  if (Array.isArray(value)) return value.map((item) => scrubSecrets(item, depth + 1));
  const out = {};
  for (const [k, v] of Object.entries(value)) {
    out[k] = SENSITIVE_KEY_PATTERN.test(k) ? '[REDACTED]' : scrubSecrets(v, depth + 1);
  }
  return out;
}

function formatLog(level, message, meta = {}) {
  const isProd = process.env.NODE_ENV === 'production';
  const timestamp = new Date().toISOString();
  const safeMeta = scrubSecrets(meta);

  if (isProd) {
    const logObj = {
      timestamp,
      level: level.toUpperCase(),
      message,
      ...safeMeta
    };
    return JSON.stringify(logObj);
  }

  const metaStr = Object.keys(safeMeta || {}).length > 0 ? ` ${JSON.stringify(safeMeta)}` : '';
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
