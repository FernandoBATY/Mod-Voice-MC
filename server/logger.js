const winston = require('winston');
const path = require('path');
const fs = require('fs');

// Crear directorio de logs si no existe
const logsDir = path.join(__dirname, '../logs');
if (!fs.existsSync(logsDir)) {
    fs.mkdirSync(logsDir, { recursive: true });
}

// Definir niveles de log personalizados
const logLevels = {
    levels: {
        fatal: 0,
        error: 1,
        warn: 2,
        info: 3,
        debug: 4,
        trace: 5
    },
    colors: {
        fatal: 'red',
        error: 'red',
        warn: 'yellow',
        info: 'green',
        debug: 'blue',
        trace: 'grey'
    }
};

// Crear logger de Winston
const logger = winston.createLogger({
    levels: logLevels.levels,
    format: winston.format.combine(
        winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
        winston.format.errors({ stack: true }),
        winston.format.json(),
        winston.format.printf(({ timestamp, level, message, ...meta }) => {
            const metaStr = Object.keys(meta).length ? JSON.stringify(meta) : '';
            return `${timestamp} [${level.toUpperCase()}] ${message} ${metaStr}`;
        })
    ),
    defaultMeta: { service: 'proximity-voice-server' },
    transports: [
        // Console en desarrollo
        new winston.transports.Console({
            format: winston.format.combine(
                winston.format.colorize({ colors: logLevels.colors }),
                winston.format.printf(({ timestamp, level, message, ...meta }) => {
                    const metaStr = Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : '';
                    return `${timestamp} [${level}] ${message}${metaStr}`;
                })
            ),
            level: process.env.LOG_LEVEL || 'debug'
        }),

        // Archivo de logs generales
        new winston.transports.File({
            filename: path.join(logsDir, 'server.log'),
            level: 'debug',
            maxsize: 5242880, // 5MB
            maxFiles: 5 // Mantener últimos 5 archivos
        }),

        // Archivo de logs de errores
        new winston.transports.File({
            filename: path.join(logsDir, 'errors.log'),
            level: 'error',
            maxsize: 5242880,
            maxFiles: 5
        }),

        // Archivo de logs de acceso/conexiones
        new winston.transports.File({
            filename: path.join(logsDir, 'access.log'),
            level: 'info',
            maxsize: 5242880,
            maxFiles: 5,
            format: winston.format.json()
        })
    ]
});

// ============================================
// MÉTODOS DE LOGGING ESPECIALIZADOS
// ============================================

logger.logPlayerEvent = (uuid, playerName, event, data = {}) => {
    logger.info(`Player Event: ${event}`, {
        uuid,
        playerName,
        event,
        timestamp: new Date().toISOString(),
        ...data
    });
};

logger.logAudioEvent = (uuid, playerName, eventType, stats = {}) => {
    logger.debug(`Audio Event: ${eventType}`, {
        uuid,
        playerName,
        eventType,
        bitrate: stats.bitrate,
        packetLoss: stats.packetLoss,
        latency: stats.latency,
        timestamp: new Date().toISOString()
    });
};

logger.logConnectionEvent = (uuid, playerName, ipAddress, eventType) => {
    logger.info(`Connection Event: ${eventType}`, {
        uuid,
        playerName,
        ipAddress,
        eventType,
        timestamp: new Date().toISOString()
    });
};

logger.logRateLimitEvent = (uuid, playerName, reason, retryAfter = null) => {
    logger.warn(`Rate Limit Exceeded`, {
        uuid,
        playerName,
        reason,
        retryAfter,
        timestamp: new Date().toISOString()
    });
};

logger.logAuthEvent = (attempt, success, playerName, ipAddress, reason = null) => {
    const level = success ? 'info' : 'warn';
    logger[level](`Auth Event: ${success ? 'Success' : 'Failed'}`, {
        playerName,
        ipAddress,
        success,
        reason,
        timestamp: new Date().toISOString()
    });
};

logger.logServerHealth = (stats = {}) => {
    logger.info('Server Health', {
        playersConnected: stats.playersConnected || 0,
        messagesPerSecond: stats.messagesPerSecond || 0,
        averageLatency: stats.averageLatency || 0,
        cpuUsage: stats.cpuUsage || 0,
        memoryUsage: stats.memoryUsage || 0,
        uptime: stats.uptime || 0,
        timestamp: new Date().toISOString()
    });
};

logger.logPerformance = (operationName, duration, success = true, metadata = {}) => {
    const level = success ? 'debug' : 'warn';
    logger[level](`Performance: ${operationName}`, {
        operation: operationName,
        durationMs: duration,
        success,
        ...metadata,
        timestamp: new Date().toISOString()
    });
};

logger.logNetworkError = (uuid, playerName, errorMessage, stackTrace = null) => {
    logger.error(`Network Error`, {
        uuid,
        playerName,
        errorMessage,
        stackTrace,
        timestamp: new Date().toISOString()
    });
};

// ============================================
// UTILIDADES
// ============================================

logger.getRecentLogs = (lines = 100) => {
    try {
        const logsFile = path.join(logsDir, 'server.log');
        if (fs.existsSync(logsFile)) {
            const content = fs.readFileSync(logsFile, 'utf-8');
            return content.split('\n').slice(-lines).join('\n');
        }
        return 'No logs available';
    } catch (error) {
        return `Error reading logs: ${error.message}`;
    }
};

logger.clearLogs = () => {
    try {
        const files = fs.readdirSync(logsDir);
        files.forEach(file => {
            fs.unlinkSync(path.join(logsDir, file));
        });
        logger.info('Logs cleared');
        return true;
    } catch (error) {
        logger.error('Failed to clear logs', { error: error.message });
        return false;
    }
};

module.exports = logger;
