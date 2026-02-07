import 'dotenv/config';

// Simple Logger with levels
const LogLevels = { DEBUG: 0, INFO: 1, WARN: 2, ERROR: 3 };
const CURRENT_LOG_LEVEL = (process.env.LOG_LEVEL?.toUpperCase() as keyof typeof LogLevels) || 'INFO';

const _log = (level: string, icon: string, ...args: any[]) => {
    if (LogLevels[level as keyof typeof LogLevels] >= LogLevels[CURRENT_LOG_LEVEL as keyof typeof LogLevels]) {
        console.log(`${icon} [${level}]`, ...args);
    }
};

export const logger = {
    debug: (...args: any[]) => _log('DEBUG', '🔍', ...args),
    info: (...args: any[]) => _log('INFO', '💡', ...args),
    warn: (...args: any[]) => _log('WARN', '⚠️', ...args),
    error: (...args: any[]) => _log('ERROR', '❌', ...args),
};
