// ============================================
// DISTANCE CACHE
// Cache para distancias calculadas entre jugadores
// ============================================

class DistanceCache {
    constructor(ttl = 100) {
        this.cache = new Map(); // Map<cacheKey, { distance, timestamp }>
        this.ttl = ttl; // Time to live en ms
        this.hits = 0;
        this.misses = 0;
    }

    // Generar clave única para par de jugadores
    _getCacheKey(uuid1, uuid2) {
        // Orden alfabético para consistencia (A-B = B-A)
        return uuid1 < uuid2 ? `${uuid1}:${uuid2}` : `${uuid2}:${uuid1}`;
    }

    // Obtener distancia cacheada
    get(uuid1, uuid2) {
        const key = this._getCacheKey(uuid1, uuid2);
        const cached = this.cache.get(key);

        if (!cached) {
            this.misses++;
            return null;
        }

        // Verificar si expiró
        if (Date.now() - cached.timestamp > this.ttl) {
            this.cache.delete(key);
            this.misses++;
            return null;
        }

        this.hits++;
        return cached.distance;
    }

    // Guardar distancia en cache
    set(uuid1, uuid2, distance) {
        const key = this._getCacheKey(uuid1, uuid2);
        this.cache.set(key, {
            distance: distance,
            timestamp: Date.now()
        });
    }

    // Invalidar cache de un jugador específico
    invalidate(uuid) {
        const keysToDelete = [];
        
        this.cache.forEach((value, key) => {
            if (key.includes(uuid)) {
                keysToDelete.push(key);
            }
        });

        keysToDelete.forEach(key => this.cache.delete(key));
    }

    // Limpiar entradas expiradas
    cleanup() {
        const now = Date.now();
        const keysToDelete = [];

        this.cache.forEach((value, key) => {
            if (now - value.timestamp > this.ttl) {
                keysToDelete.push(key);
            }
        });

        keysToDelete.forEach(key => this.cache.delete(key));
    }

    // Estadísticas
    getStats() {
        const total = this.hits + this.misses;
        const hitRate = total > 0 ? (this.hits / total * 100).toFixed(2) : 0;

        return {
            cacheSize: this.cache.size,
            hits: this.hits,
            misses: this.misses,
            hitRate: `${hitRate}%`,
            ttl: this.ttl
        };
    }

    // Limpiar cache completo
    clear() {
        this.cache.clear();
        this.hits = 0;
        this.misses = 0;
    }
}

module.exports = DistanceCache;
