// logger.js
// Simple logger wrapper for production filtering

const isDev = process.env.NODE_ENV !== 'production';

export const logger = {
  info: (msg, ...args) => {
    if (isDev) console.log(`[INFO] ${msg}`, ...args);
  },
  warn: (msg, ...args) => {
    console.warn(`[WARN] ${msg}`, ...args);
  },
  error: (msg, ...args) => {
    console.error(`[ERROR] ${msg}`, ...args);
  },
  debug: (msg, ...args) => {
    if (isDev) console.log(`[DEBUG] ${msg}`, ...args);
  },
};
