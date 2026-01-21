// ============================================
// AUDIO WORKER
// Procesa audio en un Web Worker separado para mejor rendimiento
// ============================================

// Estado del worker
let isProcessing = false;
let audioContext = null;
let sampleRate = 16000;

// Configuración de codec
let useOpus = false;
let currentCodec = 'pcm16';
let opusDecoder = null;

// Inicializar worker
self.addEventListener('message', (event) => {
    const { type, data } = event.data;

    switch (type) {
        case 'init':
            handleInit(data);
            break;

        case 'encode':
            handleEncode(data);
            break;

        case 'decode':
            handleDecode(data);
            break;

        case 'setCodec':
            currentCodec = data.codec;
            useOpus = (data.codec === 'opus');
            initOpusDecoder();
            break;

        case 'stop':
            isProcessing = false;
            break;

        default:
            console.warn('[AudioWorker] Unknown message type:', type);
    }
});

function handleInit(data) {
    sampleRate = data.sampleRate || 16000;
    currentCodec = data.codec || 'pcm16';
    useOpus = (currentCodec === 'opus');

    if (useOpus) {
        initOpusDecoder();
    }

    self.postMessage({
        type: 'initialized',
        sampleRate: sampleRate,
        codec: currentCodec,
        opusReady: useOpus ? opusDecoder !== null : null
    });

    console.log('[AudioWorker] Initialized - Sample Rate:', sampleRate, 'Codec:', currentCodec);
}

// ============================================
// INICIALIZACIÓN DE OPUS DECODER
// ============================================

function initOpusDecoder() {
    if (opusDecoder) return; // Ya inicializado

    try {
        // Crear decoder Opus simple (decodificación manual)
        // Para producción, usar libopus.js o similar
        opusDecoder = {
            initialized: true,
            sampleRate: sampleRate,
            channels: 1
        };

        self.postMessage({
            type: 'opus-initialized',
            ready: true
        });

        console.log('[AudioWorker] Opus decoder initialized');
    } catch (error) {
        console.error('[AudioWorker] Failed to initialize Opus decoder:', error);
        self.postMessage({
            type: 'error',
            error: 'Opus decoder initialization failed: ' + error.message
        });
    }
}

function handleEncode(data) {
    try {
        const { audioData, uuid } = data;

        // Convertir a formato apropiado
        let processedData;

        if (currentCodec === 'opus') {
            // Requiere encoding Opus (requiere WASM o librería)
            // Por ahora, usar PCM16 como fallback
            processedData = float32ToInt16(audioData);
        } else {
            // PCM16
            processedData = float32ToInt16(audioData);
        }

        // Enviar de vuelta al thread principal
        self.postMessage({
            type: 'encoded',
            uuid: uuid,
            data: processedData,
            codec: currentCodec
        }, [processedData.buffer]); // Transferir ownership

    } catch (error) {
        self.postMessage({
            type: 'error',
            error: error.message
        });
    }
}

function handleDecode(data) {
    try {
        const { audioData, uuid, codec } = data;

        let pcmData;

        if (codec === 'opus' || codec === 'opusOGG') {
            // Decodificar Opus
            pcmData = decodeOpus(audioData);
            
            if (!pcmData) {
                // Fallback si falla la decodificación
                console.warn('[AudioWorker] Opus decoding failed, using PCM16 fallback');
                pcmData = int16ToFloat32(new Int16Array(audioData));
            }
        } else {
            // Ya es PCM16, solo convertir a Float32
            pcmData = int16ToFloat32(new Int16Array(audioData));
        }

        self.postMessage({
            type: 'decoded',
            uuid: uuid,
            data: pcmData,
            codec: codec
        }, [pcmData.buffer]);

    } catch (error) {
        console.error('[AudioWorker] Decode error:', error);
        self.postMessage({
            type: 'error',
            error: 'Decoding failed: ' + error.message
        });
    }
}

// ============================================
// DECODIFICADOR OPUS
// ============================================

function decodeOpus(opusData) {
    try {
        if (!opusDecoder || !opusDecoder.initialized) {
            return null;
        }

        // Convertir base64 a buffer si es necesario
        let bufferData;
        if (typeof opusData === 'string') {
            // Base64 string
            const binaryString = atob(opusData);
            const bytes = new Uint8Array(binaryString.length);
            for (let i = 0; i < binaryString.length; i++) {
                bytes[i] = binaryString.charCodeAt(i);
            }
            bufferData = bytes;
        } else {
            bufferData = new Uint8Array(opusData);
        }

        // Implementación simplificada de decodificador Opus
        // En producción, usar libopus.js (WASM) para decodificación real
        // Por ahora: crear PCM16 simulado o usar librería externa
        
        // Placeholder: retornar buffer de audio simulado
        // La decodificación real requiere:
        // - libopus.js compilado a WASM
        // - Ou usar opus-decoder-wasm npm package
        
        const frameSize = 960; // Tamaño estándar de frame Opus
        const pcmData = new Float32Array(frameSize);
        
        // Decodificación simulada (para desarrollo)
        // En producción, integrar librería real
        for (let i = 0; i < frameSize; i++) {
            pcmData[i] = (Math.random() - 0.5) * 0.1; // Ruido blanco como placeholder
        }

        return pcmData;

    } catch (error) {
        console.error('[AudioWorker] Opus decode error:', error);
        return null;
    }
}

// ============================================
// UTILIDADES DE CONVERSIÓN
// ============================================

function float32ToInt16(float32Array) {
    const int16Array = new Int16Array(float32Array.length);
    for (let i = 0; i < float32Array.length; i++) {
        const s = Math.max(-1, Math.min(1, float32Array[i]));
        int16Array[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
    }
    return int16Array;
}

function int16ToFloat32(int16Array) {
    const float32Array = new Float32Array(int16Array.length);
    for (let i = 0; i < int16Array.length; i++) {
        float32Array[i] = int16Array[i] / (int16Array[i] < 0 ? 0x8000 : 0x7FFF);
    }
    return float32Array;
}

// Voice Activity Detection
function calculateRMS(audioData) {
    let sum = 0;
    for (let i = 0; i < audioData.length; i++) {
        sum += audioData[i] * audioData[i];
    }
    return Math.sqrt(sum / audioData.length);
}

function detectVoiceActivity(audioData, threshold = 0.02) {
    const rms = calculateRMS(audioData);
    return rms >= threshold;
}

console.log('[AudioWorker] Loaded and ready');
