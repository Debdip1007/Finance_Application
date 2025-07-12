// Browser-compatible logger implementation
// Replaces winston which is Node.js specific and causes 'process is not defined' errors

interface LogMeta {
  [key: string]: any;
}

// Simple browser-compatible logger
const logger = {
  error: (message: string, meta?: LogMeta) => {
    console.error(message, meta || {});
  },
  warn: (message: string, meta?: LogMeta) => {
    console.warn(message, meta || {});
  },
  info: (message: string, meta?: LogMeta) => {
    console.info(message, meta || {});
  },
  debug: (message: string, meta?: LogMeta) => {
    console.debug(message, meta || {});
  }
};

export default logger;

// Utility functions for common logging patterns
export const logError = (error: Error, context?: Record<string, any>) => {
  console.error('Application Error', {
    message: error.message,
    stack: error.stack,
    ...context
  });
};

export const logInfo = (message: string, meta?: Record<string, any>) => {
  console.info(message, meta || {});
};

export const logWarning = (message: string, meta?: Record<string, any>) => {
  console.warn(message, meta || {});
};

export const logDebug = (message: string, meta?: Record<string, any>) => {
  console.debug(message, meta || {});
};