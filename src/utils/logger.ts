/**
 * Centralized logger to control console output across environments.
 * Logs and Warnings are only visible in development mode.
 * Errors are always visible to help with remote debugging.
 */
const isDev = import.meta.env.DEV;

export const logger = {
  log: (...args: unknown[]) => {
    if (isDev) console.log(...args);
  },
  warn: (...args: unknown[]) => {
    if (isDev) console.warn(...args);
  },
  error: (...args: unknown[]) => {
    // Errors are kept in production to help diagnose critical failures
    console.error(...args);
  },
  // Add a dedicated debug method for high-frequency or verbose logs
  debug: (...args: unknown[]) => {
    if (isDev) console.debug(...args);
  }
};
