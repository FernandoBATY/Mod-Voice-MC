// ============================================
// RATE LIMITER
// Protección contra spam y abuso
// ============================================

class RateLimiter {
    constructor(options = {}) {
        this.maxRequests = options.maxRequests || 100; // Máximo de requests por ventana
        this.windowMs = options.windowMs || 60000; // Ventana de tiempo (1 minuto)
        this.maxAudioChunks = options.maxAudioChunks || 500; // Máximo de chunks de audio por minuto
        this.maxMessagesPerSecond = options.maxMessagesPerSecond || 20; // Máximo por segundo
        
        // Almacenamiento de límites
        this.requests = new Map(); // uuid -> { count, resetTime, lastRequest }
        this.audioChunks = new Map(); // uuid -> { count, resetTime }
        this.recentMessages = new Map(); // uuid -> [timestamps]
        
        // Limpieza periódica
        setInterval(() => this.cleanup(), this.windowMs);
    }

    // Verificar si un jugador puede hacer una petición
    checkRequest(uuid, type = 'general') {
        const now = Date.now();
        
        // Verificar límite por segundo
        if (!this.checkPerSecondLimit(uuid, now)) {
            return {
                allowed: false,
                reason: 'too_many_requests_per_second',
                retryAfter: 1000
            };
        }
        
        // Verificar según tipo
        if (type === 'audio_chunk') {
            return this.checkAudioChunk(uuid, now);
        } else {
            return this.checkGeneralRequest(uuid, now);
        }
    }

    // Verificar límite general
    checkGeneralRequest(uuid, now) {
        let entry = this.requests.get(uuid);
        
        if (!entry || now > entry.resetTime) {
            // Nueva ventana
            entry = {
                count: 0,
                resetTime: now + this.windowMs,
                lastRequest: now
            };
            this.requests.set(uuid, entry);
        }
        
        entry.count++;
        entry.lastRequest = now;
        
        if (entry.count > this.maxRequests) {
            return {
                allowed: false,
                reason: 'rate_limit_exceeded',
                retryAfter: entry.resetTime - now
            };
        }
        
        return { allowed: true };
    }

    // Verificar límite de audio chunks
    checkAudioChunk(uuid, now) {
        let entry = this.audioChunks.get(uuid);
        
        if (!entry || now > entry.resetTime) {
            entry = {
                count: 0,
                resetTime: now + this.windowMs
            };
            this.audioChunks.set(uuid, entry);
        }
        
        entry.count++;
        
        if (entry.count > this.maxAudioChunks) {
            return {
                allowed: false,
                reason: 'audio_spam_detected',
                retryAfter: entry.resetTime - now
            };
        }
        
        return { allowed: true };
    }

    // Verificar límite por segundo (anti-flood)
    checkPerSecondLimit(uuid, now) {
        const window = 1000; // 1 segundo
        const cutoff = now - window;
        
        let timestamps = this.recentMessages.get(uuid) || [];
        
        // Limpiar timestamps antiguos
        timestamps = timestamps.filter(t => t > cutoff);
        
        if (timestamps.length >= this.maxMessagesPerSecond) {
            return false;
        }
        
        timestamps.push(now);
        this.recentMessages.set(uuid, timestamps);
        
        return true;
    }

    // Obtener estadísticas de un jugador
    getStats(uuid) {
        const request = this.requests.get(uuid);
        const audio = this.audioChunks.get(uuid);
        const recent = this.recentMessages.get(uuid) || [];
        
        return {
            requests: request ? request.count : 0,
            audioChunks: audio ? audio.count : 0,
            recentMessages: recent.length,
            nextReset: request ? new Date(request.resetTime).toISOString() : null
        };
    }

    // Limpiar entradas expiradas
    cleanup() {
        const now = Date.now();
        
        // Limpiar requests
        for (const [uuid, entry] of this.requests.entries()) {
            if (now > entry.resetTime) {
                this.requests.delete(uuid);
            }
        }
        
        // Limpiar audio chunks
        for (const [uuid, entry] of this.audioChunks.entries()) {
            if (now > entry.resetTime) {
                this.audioChunks.delete(uuid);
            }
        }
        
        // Limpiar mensajes recientes vacíos
        for (const [uuid, timestamps] of this.recentMessages.entries()) {
            if (timestamps.length === 0) {
                this.recentMessages.delete(uuid);
            }
        }
    }

    // Resetear límites de un jugador
    reset(uuid) {
        this.requests.delete(uuid);
        this.audioChunks.delete(uuid);
        this.recentMessages.delete(uuid);
    }

    // Banear temporalmente a un jugador
    ban(uuid, durationMs = 300000) { // 5 minutos por defecto
        const bannedUntil = Date.now() + durationMs;
        
        this.requests.set(uuid, {
            count: this.maxRequests + 1,
            resetTime: bannedUntil,
            lastRequest: Date.now()
        });
        
        return bannedUntil;
    }

    // Verificar si está baneado
    isBanned(uuid) {
        const entry = this.requests.get(uuid);
        if (!entry) return false;
        
        const now = Date.now();
        return entry.count > this.maxRequests && now < entry.resetTime;
    }

    // Estadísticas globales
    getGlobalStats() {
        return {
            activeUsers: this.requests.size,
            totalRequests: Array.from(this.requests.values()).reduce((sum, entry) => sum + entry.count, 0),
            totalAudioChunks: Array.from(this.audioChunks.values()).reduce((sum, entry) => sum + entry.count, 0),
            settings: {
                maxRequests: this.maxRequests,
                windowMs: this.windowMs,
                maxAudioChunks: this.maxAudioChunks,
                maxMessagesPerSecond: this.maxMessagesPerSecond
            }
        };
    }
}

module.exports = RateLimiter;
