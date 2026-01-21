// ============================================
// OPUS AUDIO CODEC
// Compresión/descompresión de audio con Opus
// ============================================

const OpusEncoder = require('@discordjs/opus').OpusEncoder;

class OpusCodec {
    constructor(sampleRate = 16000, channels = 1, bitrate = 64000) {
        this.sampleRate = sampleRate;
        this.channels = channels;
        this.bitrate = bitrate;
        
        // Encoders por jugador (para mantener estado)
        this.encoders = new Map(); // uuid -> OpusEncoder
        this.decoders = new Map(); // uuid -> OpusEncoder
        
        this.stats = {
            totalEncoded: 0,
            totalDecoded: 0,
            bytesBeforeCompression: 0,
            bytesAfterCompression: 0
        };
    }

    // Obtener o crear encoder para un jugador
    _getEncoder(uuid, bitrate) {
        if (!this.encoders.has(uuid)) {
            const encoder = new OpusEncoder(this.sampleRate, this.channels);
            encoder.setBitrate(bitrate || this.bitrate);
            this.encoders.set(uuid, encoder);
        } else {
            // Actualizar bitrate si cambió
            const encoder = this.encoders.get(uuid);
            if (bitrate && bitrate !== this.bitrate) {
                encoder.setBitrate(bitrate);
            }
        }
        return this.encoders.get(uuid);
    }

    // Obtener o crear decoder para un jugador
    _getDecoder(uuid) {
        if (!this.decoders.has(uuid)) {
            const decoder = new OpusEncoder(this.sampleRate, this.channels);
            this.decoders.set(uuid, decoder);
        }
        return this.decoders.get(uuid);
    }

    // Codificar audio PCM a Opus
    encode(uuid, pcmData, bitrate = null) {
        try {
            const encoder = this._getEncoder(uuid, bitrate);
            
            // Asegurar que pcmData es Buffer
            let buffer;
            if (Buffer.isBuffer(pcmData)) {
                buffer = pcmData;
            } else if (pcmData instanceof Int16Array) {
                buffer = Buffer.from(pcmData.buffer);
            } else if (Array.isArray(pcmData)) {
                buffer = Buffer.from(Int16Array.from(pcmData).buffer);
            } else {
                throw new Error('Invalid PCM data format');
            }

            // Encodear
            const opusData = encoder.encode(buffer);

            // Estadísticas
            this.stats.totalEncoded++;
            this.stats.bytesBeforeCompression += buffer.length;
            this.stats.bytesAfterCompression += opusData.length;

            return opusData;
        } catch (error) {
            console.error(`[Opus] Error encoding for ${uuid}:`, error);
            return null;
        }
    }

    // Decodificar Opus a PCM
    decode(uuid, opusData) {
        try {
            const decoder = this._getDecoder(uuid);
            
            // Asegurar que opusData es Buffer
            const buffer = Buffer.isBuffer(opusData) ? opusData : Buffer.from(opusData);

            // Decodear
            const pcmData = decoder.decode(buffer);

            this.stats.totalDecoded++;

            return pcmData;
        } catch (error) {
            console.error(`[Opus] Error decoding for ${uuid}:`, error);
            return null;
        }
    }

    // Actualizar bitrate de un jugador
    updateBitrate(uuid, newBitrate) {
        const encoder = this.encoders.get(uuid);
        if (encoder) {
            encoder.setBitrate(newBitrate);
            console.log(`[Opus] Updated bitrate for ${uuid}: ${newBitrate} bps`);
        }
    }

    // Remover encoder/decoder de un jugador
    removePlayer(uuid) {
        this.encoders.delete(uuid);
        this.decoders.delete(uuid);
    }

    // Obtener ratio de compresión
    getCompressionRatio() {
        if (this.stats.bytesBeforeCompression === 0) return 0;
        return (1 - (this.stats.bytesAfterCompression / this.stats.bytesBeforeCompression)) * 100;
    }

    // Estadísticas
    getStats() {
        return {
            ...this.stats,
            compressionRatio: `${this.getCompressionRatio().toFixed(1)}%`,
            activeEncoders: this.encoders.size,
            activeDecoders: this.decoders.size,
            sampleRate: this.sampleRate,
            channels: this.channels,
            defaultBitrate: this.bitrate
        };
    }

    // Limpiar todo
    clear() {
        this.encoders.clear();
        this.decoders.clear();
        this.stats = {
            totalEncoded: 0,
            totalDecoded: 0,
            bytesBeforeCompression: 0,
            bytesAfterCompression: 0
        };
    }
}

module.exports = OpusCodec;
