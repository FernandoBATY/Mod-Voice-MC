// ============================================
// ADAPTIVE BITRATE CONTROLLER
// Ajusta calidad de audio según latencia y condiciones de red
// ============================================

class AdaptiveBitrateController {
    constructor(config = {}) {
        this.minBitrate = config.minBitrate || 32000;
        this.maxBitrate = config.maxBitrate || 128000;
        this.targetLatency = config.targetLatency || 100; // ms
        this.adjustmentStep = config.adjustmentStep || 8000;
        
        // Estado por jugador
        this.playerStates = new Map(); // uuid -> BitrateState
    }

    // Estado de bitrate de un jugador
    _getPlayerState(uuid) {
        if (!this.playerStates.has(uuid)) {
            this.playerStates.set(uuid, {
                currentBitrate: 64000, // Empezar en 64kbps
                latencyHistory: [],
                packetLossHistory: [],
                lastAdjustment: Date.now(),
                consecutiveIncreases: 0,
                consecutiveDecreases: 0
            });
        }
        return this.playerStates.get(uuid);
    }

    // Reportar latencia
    reportLatency(uuid, latencyMs) {
        const state = this._getPlayerState(uuid);
        
        // Mantener últimas 10 muestras
        state.latencyHistory.push(latencyMs);
        if (state.latencyHistory.length > 10) {
            state.latencyHistory.shift();
        }

        this._adjustBitrate(uuid);
    }

    // Reportar packet loss
    reportPacketLoss(uuid, lossPercent) {
        const state = this._getPlayerState(uuid);
        
        state.packetLossHistory.push(lossPercent);
        if (state.packetLossHistory.length > 10) {
            state.packetLossHistory.shift();
        }

        this._adjustBitrate(uuid);
    }

    // Ajustar bitrate basado en métricas
    _adjustBitrate(uuid) {
        const state = this._getPlayerState(uuid);
        const now = Date.now();

        // Esperar al menos 2 segundos entre ajustes
        if (now - state.lastAdjustment < 2000) return;

        // Calcular promedios
        const avgLatency = this._average(state.latencyHistory);
        const avgPacketLoss = this._average(state.packetLossHistory);

        let newBitrate = state.currentBitrate;

        // Reglas de ajuste
        if (avgPacketLoss > 5 || avgLatency > this.targetLatency * 2) {
            // Condiciones malas: reducir bitrate agresivamente
            newBitrate -= this.adjustmentStep * 2;
            state.consecutiveDecreases++;
            state.consecutiveIncreases = 0;
        } else if (avgLatency > this.targetLatency) {
            // Latencia alta: reducir bitrate
            newBitrate -= this.adjustmentStep;
            state.consecutiveDecreases++;
            state.consecutiveIncreases = 0;
        } else if (avgLatency < this.targetLatency * 0.5 && avgPacketLoss < 1) {
            // Condiciones excelentes: aumentar bitrate gradualmente
            if (state.consecutiveIncreases >= 3) {
                newBitrate += this.adjustmentStep;
                state.consecutiveIncreases = 0;
            } else {
                state.consecutiveIncreases++;
            }
            state.consecutiveDecreases = 0;
        }

        // Limitar entre min y max
        newBitrate = Math.max(this.minBitrate, Math.min(this.maxBitrate, newBitrate));

        // Solo actualizar si cambió significativamente
        if (Math.abs(newBitrate - state.currentBitrate) >= this.adjustmentStep) {
            console.log(`[Bitrate] ${uuid}: ${state.currentBitrate} → ${newBitrate} bps (latency: ${avgLatency.toFixed(1)}ms, loss: ${avgPacketLoss.toFixed(1)}%)`);
            state.currentBitrate = newBitrate;
            state.lastAdjustment = now;
        }
    }

    // Obtener bitrate actual de un jugador
    getBitrate(uuid) {
        return this._getPlayerState(uuid).currentBitrate;
    }

    // Obtener calidad sugerida (bajo/medio/alto)
    getQualityLevel(uuid) {
        const bitrate = this.getBitrate(uuid);
        
        if (bitrate <= 48000) return 'low';
        if (bitrate <= 96000) return 'medium';
        return 'high';
    }

    // Utilidad: calcular promedio
    _average(arr) {
        if (arr.length === 0) return 0;
        return arr.reduce((a, b) => a + b, 0) / arr.length;
    }

    // Remover jugador
    removePlayer(uuid) {
        this.playerStates.delete(uuid);
    }

    // Estadísticas globales
    getStats() {
        const bitrates = Array.from(this.playerStates.values()).map(s => s.currentBitrate);
        
        return {
            activePlayers: this.playerStates.size,
            averageBitrate: bitrates.length > 0 ? this._average(bitrates) : 0,
            minBitrate: this.minBitrate,
            maxBitrate: this.maxBitrate,
            distribution: {
                low: bitrates.filter(b => b <= 48000).length,
                medium: bitrates.filter(b => b > 48000 && b <= 96000).length,
                high: bitrates.filter(b => b > 96000).length
            }
        };
    }

    // Limpiar todo
    clear() {
        this.playerStates.clear();
    }
}

module.exports = AdaptiveBitrateController;
