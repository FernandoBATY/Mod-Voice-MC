const WebSocket = require('ws');
const http = require('http');
const express = require('express');
const cors = require('cors');
const os = require('os');

// Logger
const logger = require('./logger');

// Optimizaciones
const SpatialHashGrid = require('./optimizations/SpatialHashGrid');
const DistanceCache = require('./optimizations/DistanceCache');
const AdaptiveBitrateController = require('./optimizations/AdaptiveBitrate');
const OpusCodec = require('./optimizations/OpusCodec');
const RateLimiter = require('./optimizations/RateLimiter');

const config = {
    wsPort: 8080,
    httpPort: 3000,
    proximityRange: 30,
    maxPlayers: 100,
    maxVolumeDistance: 50,
    minVolume: 0.1,
    maxVolume: 1.0,
    rateLimit: {
        maxRequests: 100,
        maxAudioChunks: 500,
        maxMessagesPerSecond: 20,
        cleanupInterval: 60000
    },
    volumeFalloff: 1.5,
    updateInterval: 100,
    playerTimeoutMs: 30000,
    enableGlobalChat: false,
    enableTeamChat: true,
    debug: false,
    // Optimizaciones
    useOpusCompression: true,
    opusBitrate: 64000, // 64kbps (adaptativo)
    spatialHashGridSize: 50, // Tamaño de celda para spatial hashing
    enableDistanceCache: true,
    distanceCacheTTL: 100, // ms
    adaptiveBitrate: true,
    minBitrate: 32000,
    maxBitrate: 128000
};

const app = express();
app.use(cors());
app.use(express.json());

const httpServer = http.createServer(app);

const wss = new WebSocket.Server({ port: config.wsPort });

// ============================================
// INICIALIZAR SISTEMAS DE OPTIMIZACIÓN
// ============================================

// Spatial Hash Grid para búsqueda rápida de jugadores
const spatialGrid = new SpatialHashGrid(config.spatialHashGridSize);

// Cache de distancias
const distanceCache = config.enableDistanceCache 
    ? new DistanceCache(config.distanceCacheTTL) 
    : null;

// Control de bitrate adaptativo
const bitrateController = config.adaptiveBitrate 
    ? new AdaptiveBitrateController({
        minBitrate: config.minBitrate,
        maxBitrate: config.maxBitrate,
        targetLatency: 100
    })
    : null;

// Codec Opus
const opusCodec = config.useOpusCompression 
    ? new OpusCodec(16000, 1, config.opusBitrate)
    : null;

// Rate Limiter
const rateLimiter = new RateLimiter({
    maxRequests: config.rateLimit.maxRequests,
    maxAudioChunks: config.rateLimit.maxAudioChunks,
    maxMessagesPerSecond: config.rateLimit.maxMessagesPerSecond,
    cleanupInterval: config.rateLimit.cleanupInterval
});

// Limpiar cache periódicamente
if (distanceCache) {
    setInterval(() => {
        distanceCache.cleanup();
    }, 5000); // Cada 5 segundos
}

logger.info('Server optimizations enabled:', {
    spatialHashGrid: `${config.spatialHashGridSize}m cells`,
    distanceCache: config.enableDistanceCache ? 'Enabled' : 'Disabled',
    adaptiveBitrate: config.adaptiveBitrate ? 'Enabled' : 'Disabled',
    opusCompression: config.useOpusCompression ? 'Enabled' : 'Disabled'
});

// ============================================
// CLASES
// ============================================


class PlayerSession {
    constructor(uuid, name, ws) {
        this.uuid = uuid;
        this.name = name;
        this.primaryWs = ws; // WebSocket principal (addon o app)
        
        // Múltiples dispositivos pueden estar conectados
        this.devices = new Map(); // deviceId -> { type, ws, position, lastUpdate }
        
        this.position = { x: 0, y: 0, z: 0 };
        this.rotation = { pitch: 0, yaw: 0 };
        this.dimension = 'overworld';
        this.teamId = null;
        this.isSpeaking = false;
        this.isMuted = false;
        this.lastHeartbeat = Date.now();
        this.ipAddress = '';
        this.clientVersion = '1.0.0';
        this.muteList = new Set();
        
        // Identificación de dispositivos
        this.minecraftDevice = null; // ID del dispositivo Minecraft (addon)
        this.appDevice = null;       // ID del dispositivo app (Windows/Mobile)
    }

    // Registrar un dispositivo (Minecraft o app)
    registerDevice(deviceId, deviceType, ws) {
        console.log(`[Device] ${this.name} registró dispositivo: ${deviceType} (${deviceId})`);
        
        this.devices.set(deviceId, {
            type: deviceType,
            ws: ws,
            position: { x: 0, y: 0, z: 0 },
            lastUpdate: Date.now(),
            isActive: true
        });
        
        // Guardar referencia según tipo
        if (deviceType === 'minecraft') {
            this.minecraftDevice = deviceId;
        } else if (deviceType === 'windows' || deviceType === 'android' || deviceType === 'ios') {
            this.appDevice = deviceId;
        }
        
        return true;
    }

    // Desregistrar dispositivo
    unregisterDevice(deviceId) {
        const device = this.devices.get(deviceId);
        if (device) {
            console.log(`[Device] ${this.name} desconectó dispositivo: ${device.type} (${deviceId})`);
            
            if (this.minecraftDevice === deviceId) {
                this.minecraftDevice = null;
            }
            if (this.appDevice === deviceId) {
                this.appDevice = null;
            }
            
            this.devices.delete(deviceId);
        }
    }

    // Obtener posición del dispositivo Minecraft (addon)
    getMinecraftPosition() {
        if (!this.minecraftDevice) return null;
        const device = this.devices.get(this.minecraftDevice);
        return device ? device.position : null;
    }

    // ============ SISTEMA DE CÓDIGO TEMPORAL DE VINCULACIÓN ============
    
    // Generar código temporal para vincular dispositivos
    generateLinkingCode() {
        this.linkingCode = Math.random().toString(36).substring(2, 8).toUpperCase();
        this.linkingCodeExpires = Date.now() + (2 * 60 * 1000); // 2 minutos
        console.log(`[Linking] ${this.name} generó código: ${this.linkingCode} (válido 2 minutos)`);
        return this.linkingCode;
    }

    // Validar código de vinculación
    validateLinkingCode(code, deviceType) {
        if (!this.linkingCode || !code) {
            return { success: false, error: 'No linking code generated' };
        }

        if (Date.now() > this.linkingCodeExpires) {
            this.linkingCode = null;
            return { success: false, error: 'Linking code expired' };
        }

        if (this.linkingCode !== code.toUpperCase()) {
            return { success: false, error: 'Invalid linking code' };
        }

        // Código válido
        console.log(`[Linking] ${this.name} validó dispositivo ${deviceType} con código correcto`);
        this.linkingCode = null; // Consumir código
        this.linkingCodeExpires = null;
        
        return { success: true, linkedDevice: deviceType };
    }

    // Obtener código actual (para mostrar en HUD)
    getLinkingCode() {
        if (!this.linkingCode) return null;
        if (Date.now() > this.linkingCodeExpires) {
            this.linkingCode = null;
            return null;
        }
        const remainingSeconds = Math.ceil((this.linkingCodeExpires - Date.now()) / 1000);
        return {
            code: this.linkingCode,
            expiresIn: remainingSeconds
        };
    }

    // ======================================================================

    // Actualizar posición desde Minecraft
    updatePositionFromMinecraft(x, y, z, dimension) {
        this.position = { x, y, z };
        this.dimension = dimension || 'overworld';
        this.lastHeartbeat = Date.now();
        
        // También actualizar en el device
        if (this.minecraftDevice) {
            const device = this.devices.get(this.minecraftDevice);
            if (device) {
                device.position = { x, y, z };
                device.lastUpdate = Date.now();
            }
        }

        // Invalidar cache de distancias para este jugador
        if (distanceCache) {
            distanceCache.invalidate(this.uuid);
        }

        // Actualizar spatial grid
        spatialGrid.updatePlayer(this);
    }

    getDistanceTo(otherPlayer) {
        // Verificar cache primero
        if (distanceCache) {
            const cached = distanceCache.get(this.uuid, otherPlayer.uuid);
            if (cached !== null) {
                return cached;
            }
        }

        // Calcular distancia
        const dx = this.position.x - otherPlayer.position.x;
        const dy = this.position.y - otherPlayer.position.y;
        const dz = this.position.z - otherPlayer.position.z;
        const distance = Math.sqrt(dx * dx + dy * dy + dz * dz);

        // Guardar en cache
        if (distanceCache) {
            distanceCache.set(this.uuid, otherPlayer.uuid, distance);
        }

        return distance;
    }

    calculateVolumeFor(speaker) {
        if (speaker.uuid === this.uuid) return null;

        const distance = this.getDistanceTo(speaker);

        if (distance > config.maxVolumeDistance) return null;

        const volumePercent = 1 - (distance / config.maxVolumeDistance);
        const volume = config.maxVolume * Math.pow(Math.max(0, volumePercent), config.volumeFalloff);

        return Math.max(config.minVolume, Math.min(config.maxVolume, volume));
    }

    canHear(speaker) {
        if (this.isMuted || speaker.isMuted) return false;

        if (this.muteList.has(speaker.uuid)) return false;
        if (speaker.muteList.has(this.uuid)) return false;

        // ⭐ IMPORTANTE: Verificar que están en la MISMA DIMENSIÓN (mundo)
        if (this.dimension !== speaker.dimension) return false;

        const distance = this.getDistanceTo(speaker);
        if (distance <= config.proximityRange) return true;

        if (config.enableTeamChat && this.teamId && this.teamId === speaker.teamId) {
            return true;
        }

        if (config.enableGlobalChat) return true;

        return false;
    }

    isActive() {
        return Date.now() - this.lastHeartbeat < config.playerTimeoutMs;
    }

    send(data) {
        try {
            if (this.ws && this.ws.readyState === WebSocket.OPEN) {
                this.ws.send(JSON.stringify(data));
                return true;
            }
        } catch (error) {
            console.error(`Error enviando a ${this.name}:`, error.message);
        }
        return false;
    }
}

const players = new Map();
const playersByName = new Map();

function addPlayer(uuid, name, ws, ipAddress) {
    if (players.size >= config.maxPlayers) {
        return null;
    }

    const player = new PlayerSession(uuid, name, ws);
    player.ipAddress = ipAddress;

    players.set(uuid, player);
    playersByName.set(name, uuid);

    // Agregar a spatial grid
    spatialGrid.addPlayer(player);

    logDebug(`Jugador conectado: ${name} (${uuid}) desde ${ipAddress}`);
    broadcastPlayerEvent('player_join', {
        uuid: uuid,
        name: name,
        totalPlayers: players.size
    });

    return player;
}

function removePlayer(uuid) {
    const player = players.get(uuid);
    if (player) {
        playersByName.delete(player.name);
        players.delete(uuid);

        // Remover de sistemas de optimización
        spatialGrid.removePlayer(uuid);
        if (distanceCache) {
            distanceCache.invalidate(uuid);
        }
        if (bitrateController) {
            bitrateController.removePlayer(uuid);
        }
        if (opusCodec) {
            opusCodec.removePlayer(uuid);
        }

        logDebug(`Jugador desconectado: ${player.name} (${uuid})`);
        broadcastPlayerEvent('player_leave', {
            uuid: uuid,
            name: player.name,
            totalPlayers: players.size
        });

        broadcastAudioStop(uuid);
    }
}

function getPlayer(uuid) {
    return players.get(uuid);
}

function getAllPlayers() {
    return Array.from(players.values());
}

function getNearbyPlayers(speaker, hearablePlayersOnly = false) {
    // Usar spatial grid si está disponible (mucho más rápido)
    if (spatialGrid) {
        const listeners = spatialGrid.getListeners(speaker, config.proximityRange);
        return listeners;
    }

    // Fallback: búsqueda lineal (más lento)
    const nearby = [];

    for (const [uuid, listener] of players.entries()) {
        if (uuid === speaker.uuid) continue;

        if (hearablePlayersOnly && !listener.canHear(speaker)) continue;

        const volume = listener.calculateVolumeFor(speaker);
        if (volume === null) continue;

        nearby.push({
            uuid: listener.uuid,
            name: listener.name,
            volume: volume,
            distance: speaker.getDistanceTo(listener)
        });
    }

    return nearby;
}

function broadcastAudioStart(speakerUuid, audioData) {
    const speaker = getPlayer(speakerUuid);
    if (!speaker) return;

    speaker.isSpeaking = true;

    const nearbyPlayers = getNearbyPlayers(speaker, true);

    nearbyPlayers.forEach(listenerInfo => {
        const listener = getPlayer(listenerInfo.uuid);
        if (listener) {
            listener.send({
                type: 'audio_start',
                speaker: {
                    uuid: speakerUuid,
                    name: speaker.name,
                    position: speaker.position
                },
                volume: listenerInfo.volume,
                distance: listenerInfo.distance,
                audioData: audioData
            });
        }
    });

    logDebug(`${speaker.name} comenzo a hablar con ${nearbyPlayers.length} jugadores`);
}

function broadcastAudioChunk(speakerUuid, audioChunk) {
    const speaker = getPlayer(speakerUuid);
    if (!speaker || !speaker.isSpeaking) return;

    // Obtener bitrate adaptativo si está habilitado
    let processedChunk = audioChunk;
    let codec = 'pcm16'; // Default

    if (opusCodec && bitrateController) {
        const bitrate = bitrateController.getBitrate(speakerUuid);
        
        // Comprimir con Opus
        const opusData = opusCodec.encode(speakerUuid, audioChunk, bitrate);
        if (opusData) {
            processedChunk = opusData;
            codec = 'opus';
        }
    }

    const nearbyPlayers = getNearbyPlayers(speaker, true);

    nearbyPlayers.forEach(listenerInfo => {
        const listener = getPlayer(listenerInfo.uuid);
        if (listener) {
            listener.send({
                type: 'audio_chunk',
                speaker: speakerUuid,
                volume: listenerInfo.volume,
                audioChunk: processedChunk,
                codec: codec, // Indicar codec usado
                bitrate: bitrateController ? bitrateController.getBitrate(speakerUuid) : null
            });
        }
    });
}

function broadcastAudioStop(speakerUuid) {
    const speaker = getPlayer(speakerUuid);
    if (!speaker) return;

    speaker.isSpeaking = false;

    const nearbyPlayers = getNearbyPlayers(speaker, true);

    nearbyPlayers.forEach(listenerInfo => {
        const listener = getPlayer(listenerInfo.uuid);
        if (listener) {
            listener.send({
                type: 'audio_stop',
                speaker: speakerUuid
            });
        }
    });

    logDebug(`${speaker.name} dejo de hablar`);
}

function broadcastPlayerEvent(eventType, data) {
    const message = {
        type: 'player_event',
        event: eventType,
        data: data,
        timestamp: Date.now()
    };

    getAllPlayers().forEach(player => {
        player.send(message);
    });
}

function broadcastPlayerUpdate(uuid) {
    const player = getPlayer(uuid);
    if (!player) return;

    const message = {
        type: 'player_update',
        player: {
            uuid: player.uuid,
            name: player.name,
            position: player.position,
            rotation: player.rotation,
            isSpeaking: player.isSpeaking,
            teamId: player.teamId,
            dimension: player.dimension
        }
    };

    getAllPlayers().forEach(otherPlayer => {
        if (otherPlayer.uuid !== uuid) {
            otherPlayer.send(message);
        }
    });
}

wss.on('connection', (ws, req) => {
    const ipAddress = req.socket.remoteAddress || req.headers['x-forwarded-for'] || 'unknown';
    logDebug(`Nueva conexion WebSocket desde ${ipAddress}`);

    let currentPlayer = null;

    ws.on('message', (data) => {
        try {
            const message = JSON.parse(data);
            handleMessage(ws, message, ipAddress, (player) => {
                currentPlayer = player;
            });
        } catch (error) {
            console.error('Error procesando mensaje:', error.message);
        }
    });

    ws.on('close', () => {
        if (currentPlayer) {
            removePlayer(currentPlayer.uuid);
        }
        logDebug(`Conexion WebSocket cerrada desde ${ipAddress}`);
    });

    ws.on('error', (error) => {
        console.error('WebSocket error:', error.message);
    });
});

function handleMessage(ws, message, ipAddress, setPlayer) {
    const { type, player: playerData, audioData, volume } = message;

    // Rate limiting check
    const uuid = playerData?.uuid || message.uuid;
    if (uuid && rateLimiter) {
        const check = rateLimiter.checkRequest(uuid, type);
        if (!check.allowed) {
            ws.send(JSON.stringify({
                type: 'rate_limit_exceeded',
                reason: check.reason,
                retryAfter: check.retryAfter
            }));
            logDebug(`Rate limit exceeded for ${uuid}: ${check.reason}`);
            return;
        }
    }

    switch (type) {
        case 'player_join':
            handlePlayerJoin(ws, playerData, ipAddress, setPlayer);
            break;

        case 'get_linking_code':
            handleGetLinkingCode(ws, message.uuid);
            break;

        case 'submit_linking_code':
            handleSubmitLinkingCode(ws, message);
            break;

        case 'player_update':
            handlePlayerUpdate(playerData);
            break;

        case 'audio_start':
            handleAudioStart(playerData.uuid, audioData);
            break;

        case 'audio_chunk':
            handleAudioChunk(playerData.uuid, audioData);
            break;

        case 'audio_stop':
            handleAudioStop(playerData.uuid);
            break;

        case 'team_change':
            handleTeamChange(playerData.uuid, playerData.teamId);
            break;

        case 'mute_player':
            handleMutePlayer(playerData.uuid, message.targetUuid);
            break;

        case 'unmute_player':
            handleUnmutePlayer(playerData.uuid, message.targetUuid);
            break;

        case 'heartbeat':
            handleHeartbeat(playerData.uuid);
            break;

        case 'report_latency':
            // Reportar latencia para ajuste de bitrate
            if (bitrateController && message.latency) {
                bitrateController.reportLatency(playerData.uuid, message.latency);
            }
            break;

        case 'report_packet_loss':
            // Reportar packet loss
            if (bitrateController && message.packetLoss !== undefined) {
                bitrateController.reportPacketLoss(playerData.uuid, message.packetLoss);
            }
            break;

        default:
            console.warn(`Tipo de mensaje desconocido: ${type}`);
    }
}

function handlePlayerJoin(ws, playerData, ipAddress, setPlayer) {
    const { uuid, name, version, deviceType = 'unknown', linkingCode = null } = playerData;

    // Verificar si el jugador ya existe (otro dispositivo)
    let player = getPlayer(uuid);
    
    if (!player) {
        // Nuevo jugador - generar código de vinculación para futuras conexiones
        player = addPlayer(uuid, name, ws, ipAddress);
        const linkingCode = player.generateLinkingCode();
        console.log(`[Linking] Nuevo jugador ${name} - código: ${linkingCode}`);
    } else {
        // Jugador existente se está conectando con otro dispositivo
        console.log(`[Multi-Device] ${name} se conectó con dispositivo: ${deviceType}`);
        
        // Si es un dispositivo diferente al primero, requerir código de vinculación
        if (deviceType !== 'minecraft' && !player.minecraftDevice && !linkingCode) {
            // Esperar código temporal
            ws.send(JSON.stringify({
                type: 'linking_required',
                message: 'Se requiere código de vinculación',
                requireCode: true
            }));
            return;
        }

        // Validar código si se proporcionó
        if (linkingCode) {
            const validation = player.validateLinkingCode(linkingCode, deviceType);
            if (!validation.success) {
                ws.send(JSON.stringify({
                    type: 'linking_failed',
                    error: validation.error
                }));
                return;
            }
        }
    }

    if (player) {
        player.clientVersion = version || '1.0.0';
        
        // Registrar el dispositivo
        const deviceId = `${name}-${deviceType}-${Date.now()}`;
        player.registerDevice(deviceId, deviceType, ws);
        
        setPlayer(player);

        // Obtener código actual si existe
        const currentLinkingCode = player.getLinkingCode();

        ws.send(JSON.stringify({
            type: 'join_confirm',
            success: true,
            deviceId: deviceId,
            deviceType: deviceType,
            linkingCode: currentLinkingCode ? currentLinkingCode.code : null,
            linkingCodeExpires: currentLinkingCode ? currentLinkingCode.expiresIn : null,
            config: {
                proximityRange: config.proximityRange,
                maxVolume: config.maxVolume,
                minVolume: config.minVolume,
                enableGlobalChat: config.enableGlobalChat,
                enableTeamChat: config.enableTeamChat
            },
            otherPlayers: getAllPlayers()
                .filter(p => p.uuid !== uuid)
                .map(p => ({
                    uuid: p.uuid,
                    name: p.name,
                    position: p.position,
                    teamId: p.teamId
                }))
        }));

        // Si es Minecraft, enviar el código inmediatamente después
        if (deviceType === 'minecraft' && currentLinkingCode) {
            setTimeout(() => {
                ws.send(JSON.stringify({
                    type: 'linking_code',
                    code: currentLinkingCode.code,
                    expiresIn: currentLinkingCode.expiresIn
                }));
            }, 100);
        }
    } else {
        ws.send(JSON.stringify({
            type: 'join_confirm',
            success: false,
            reason: 'Servidor lleno'
        }));
    }
}

// ============ MANEJADORES DE CÓDIGO TEMPORAL ============

function handleGetLinkingCode(ws, uuid) {
    const player = getPlayer(uuid);
    if (player) {
        const linkingCode = player.getLinkingCode();
        ws.send(JSON.stringify({
            type: 'linking_code',
            code: linkingCode ? linkingCode.code : null,
            expiresIn: linkingCode ? linkingCode.expiresIn : null,
            message: linkingCode ? 
                `Código: ${linkingCode.code} (válido ${linkingCode.expiresIn}s)` :
                'No hay código activo'
        }));
    } else {
        ws.send(JSON.stringify({
            type: 'error',
            message: 'Jugador no encontrado'
        }));
    }
}

function handleSubmitLinkingCode(ws, message) {
    const { uuid, deviceType, code } = message;
    const player = getPlayer(uuid);
    
    if (!player) {
        ws.send(JSON.stringify({
            type: 'linking_result',
            success: false,
            error: 'Jugador no encontrado'
        }));
        return;
    }

    const validation = player.validateLinkingCode(code, deviceType);
    
    ws.send(JSON.stringify({
        type: 'linking_result',
        success: validation.success,
        error: validation.error || null,
        message: validation.success ? 
            `Dispositivo ${deviceType} vinculado correctamente` :
            validation.error
    }));
}

// ====================================================

function handlePlayerUpdate(playerData) {
    const player = getPlayer(playerData.uuid);
    if (player) {
        // Actualizar desde el dispositivo que envía (Minecraft o app)
        const deviceType = playerData.deviceType || 'unknown';
        
        // Solo actualizar posición si viene del addon de Minecraft
        if (deviceType === 'minecraft' && playerData.position) {
            player.updatePositionFromMinecraft(
                playerData.position.x,
                playerData.position.y,
                playerData.position.z,
                playerData.dimension
            );
        }
        
        player.updateRotation(playerData.rotation?.pitch || 0, playerData.rotation?.yaw || 0);
        player.teamId = playerData.teamId || null;

        broadcastPlayerUpdate(playerData.uuid);
    }
}

function handleAudioStart(uuid, audioData) {
    broadcastAudioStart(uuid, audioData);
}

function handleAudioChunk(uuid, audioData) {
    broadcastAudioChunk(uuid, audioData);
}

function handleAudioStop(uuid) {
    broadcastAudioStop(uuid);
}

function handleTeamChange(uuid, teamId) {
    const player = getPlayer(uuid);
    if (player) {
        player.teamId = teamId;
        logDebug(`${player.name} cambio de equipo a ${teamId}`);
        broadcastPlayerUpdate(uuid);
    }
}

function handleMutePlayer(uuid, targetUuid) {
    const player = getPlayer(uuid);
    if (player) {
        player.muteList.add(targetUuid);
        logDebug(`${player.name} silencio a ${targetUuid}`);
    }
}

function handleUnmutePlayer(uuid, targetUuid) {
    const player = getPlayer(uuid);
    if (player) {
        player.muteList.delete(targetUuid);
        logDebug(`${player.name} quito el silencio a ${targetUuid}`);
    }
}

function handleHeartbeat(uuid) {
    const player = getPlayer(uuid);
    if (player) {
        player.lastHeartbeat = Date.now();
    }
}

app.get('/api/status', (req, res) => {
    res.json({
        status: 'online',
        players: players.size,
        maxPlayers: config.maxPlayers,
        uptime: process.uptime(),
        config: {
            proximityRange: config.proximityRange,
            maxVolume: config.maxVolume
        }
    });
});

app.get('/api/players', (req, res) => {
    const playerList = getAllPlayers().map(p => ({
        uuid: p.uuid,
        name: p.name,
        position: p.position,
        teamId: p.teamId,
        isSpeaking: p.isSpeaking,
        lastHeartbeat: p.lastHeartbeat
    }));

    res.json(playerList);
});

app.get('/api/players/:uuid', (req, res) => {
    const player = getPlayer(req.params.uuid);
    if (!player) {
        return res.status(404).json({ error: 'Jugador no encontrado' });
    }

    res.json({
        uuid: player.uuid,
        name: player.name,
        position: player.position,
        rotation: player.rotation,
        teamId: player.teamId,
        isSpeaking: player.isSpeaking,
        nearbyPlayers: getNearbyPlayers(player, true)
    });
});

app.get('/api/players/:uuid/nearby', (req, res) => {
    const player = getPlayer(req.params.uuid);
    if (!player) {
        return res.status(404).json({ error: 'Jugador no encontrado' });
    }

    const nearby = getNearbyPlayers(player, true);
    res.json(nearby);
});

app.get('/api/config', (req, res) => {
    res.json(config);
});

app.get('/health', (req, res) => {
    res.json({ status: 'ok' });
});

// ============================================
// ENDPOINTS DE OPTIMIZACIONES
// ============================================

// Obtener estadísticas de optimizaciones
app.get('/api/optimizations/stats', (req, res) => {
    const stats = {
        spatialGrid: spatialGrid ? spatialGrid.getStats() : null,
        distanceCache: distanceCache ? distanceCache.getStats() : null,
        bitrate: bitrateController ? bitrateController.getStats() : null,
        opus: opusCodec ? opusCodec.getStats() : null,
        enabled: {
            spatialGrid: !!spatialGrid,
            distanceCache: !!distanceCache,
            adaptiveBitrate: !!bitrateController,
            opusCompression: !!opusCodec
        }
    };
    res.json(stats);
});

// Obtener bitrate de un jugador específico
app.get('/api/optimizations/bitrate/:uuid', (req, res) => {
    if (!bitrateController) {
        return res.status(404).json({ error: 'Adaptive bitrate not enabled' });
    }

    const bitrate = bitrateController.getBitrate(req.params.uuid);
    const quality = bitrateController.getQualityLevel(req.params.uuid);

    res.json({
        uuid: req.params.uuid,
        bitrate: bitrate,
        quality: quality
    });
});

// Rate Limiter - Estadísticas globales
app.get('/api/rate-limits/stats', (req, res) => {
    res.json(rateLimiter.getGlobalStats());
});

// Rate Limiter - Estadísticas de un jugador
app.get('/api/rate-limits/:uuid', (req, res) => {
    const stats = rateLimiter.getStats(req.params.uuid);
    res.json({
        uuid: req.params.uuid,
        ...stats
    });
});

// Rate Limiter - Banear jugador
app.post('/api/rate-limits/:uuid/ban', (req, res) => {
    const duration = parseInt(req.body.duration) || 300000; // 5 min default
    const bannedUntil = rateLimiter.ban(req.params.uuid, duration);
    
    res.json({
        success: true,
        uuid: req.params.uuid,
        bannedUntil: new Date(bannedUntil).toISOString(),
        durationMs: duration
    });
});

// ============================================
// LOGGING ENDPOINTS
// ============================================

app.get('/api/logs', (req, res) => {
    const lines = parseInt(req.query.lines) || 100;
    const recentLogs = logger.getRecentLogs(lines);
    
    res.json({
        lines: lines,
        logs: recentLogs,
        timestamp: new Date().toISOString()
    });
});

app.get('/api/logs/download', (req, res) => {
    const logsPath = require('path').join(__dirname, 'logs', 'server.log');
    res.download(logsPath, 'server-logs.txt');
});

app.delete('/api/logs', (req, res) => {
    const success = logger.clearLogs();
    res.json({
        success: success,
        message: success ? 'Logs cleared' : 'Failed to clear logs'
    });
});

// ============================================
// LIMPIEZA PERIÓDICA
// ============================================


setInterval(() => {
    const inactivePlayers = [];

    for (const [uuid, player] of players.entries()) {
        if (!player.isActive()) {
            inactivePlayers.push(uuid);
        }
    }

    inactivePlayers.forEach(uuid => {
        const player = players.get(uuid);
        logDebug(`Removiendo jugador inactivo: ${player.name}`);
        removePlayer(uuid);
    });
}, 10000);

setInterval(() => {
    getAllPlayers().forEach(player => {
        broadcastPlayerUpdate(player.uuid);
    });
}, config.updateInterval);

function logDebug(message) {
    if (config.debug) {
        console.log(`[DEBUG] ${new Date().toISOString()} - ${message}`);
    }
}

function getLocalIP() {
    const interfaces = os.networkInterfaces();
    for (const name of Object.keys(interfaces)) {
        for (const iface of interfaces[name]) {
            if (iface.family === 'IPv4' && !iface.internal) {
                return iface.address;
            }
        }
    }
    return 'localhost';
}

httpServer.listen(config.httpPort, () => {
    console.log(`\n${'='.repeat(50)}`);
    console.log('SERVIDOR DE CHAT DE VOZ DE PROXIMIDAD');
    console.log(`${'='.repeat(50)}`);
    console.log(`Servidor HTTP corriendo en http://localhost:${config.httpPort}`);
    console.log(`Servidor WebSocket corriendo en ws://localhost:${config.wsPort}`);
    console.log(`IP Local: ${getLocalIP()}`);
    console.log(`Max Jugadores: ${config.maxPlayers}`);
    console.log(`Rango de Proximidad: ${config.proximityRange} bloques`);
    console.log(`${'='.repeat(50)}\n`);
});

wss.on('listening', () => {
    console.log('Servidor WebSocket escuchando');
});

process.on('SIGINT', () => {
    console.log('\nApagando servidor...');
    wss.clients.forEach(client => {
        client.close();
    });
    httpServer.close(() => {
        console.log('Servidor cerrado');
        process.exit(0);
    });
});

module.exports = { wss, httpServer, players, config };
