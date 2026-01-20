const WebSocket = require('ws');
const http = require('http');
const express = require('express');
const cors = require('cors');
const os = require('os');

const config = {
    wsPort: 8080,
    httpPort: 3000,
    proximityRange: 30,
    maxPlayers: 100,
    maxVolumeDistance: 50,
    minVolume: 0.1,
    maxVolume: 1.0,
    volumeFalloff: 1.5,
    updateInterval: 100,
    playerTimeoutMs: 30000,
    enableGlobalChat: false,
    enableTeamChat: true,
    debug: false
};

const app = express();
app.use(cors());
app.use(express.json());

const httpServer = http.createServer(app);

const wss = new WebSocket.Server({ port: config.wsPort });

class PlayerSession {
    constructor(uuid, name, ws) {
        this.uuid = uuid;
        this.name = name;
        this.ws = ws;
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
    }

    updatePosition(x, y, z) {
        this.position = { x, y, z };
        this.lastHeartbeat = Date.now();
    }

    updateRotation(pitch, yaw) {
        this.rotation = { pitch, yaw };
    }

    getDistanceTo(otherPlayer) {
        const dx = this.position.x - otherPlayer.position.x;
        const dy = this.position.y - otherPlayer.position.y;
        const dz = this.position.z - otherPlayer.position.z;
        return Math.sqrt(dx * dx + dy * dy + dz * dz);
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

    const nearbyPlayers = getNearbyPlayers(speaker, true);

    nearbyPlayers.forEach(listenerInfo => {
        const listener = getPlayer(listenerInfo.uuid);
        if (listener) {
            listener.send({
                type: 'audio_chunk',
                speaker: speakerUuid,
                volume: listenerInfo.volume,
                audioChunk: audioChunk
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

    switch (type) {
        case 'player_join':
            handlePlayerJoin(ws, playerData, ipAddress, setPlayer);
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

        default:
            console.warn(`Tipo de mensaje desconocido: ${type}`);
    }
}

function handlePlayerJoin(ws, playerData, ipAddress, setPlayer) {
    const { uuid, name, version } = playerData;

    const player = addPlayer(uuid, name, ws, ipAddress);
    if (player) {
        player.clientVersion = version || '1.0.0';
        setPlayer(player);

        ws.send(JSON.stringify({
            type: 'join_confirm',
            success: true,
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
    } else {
        ws.send(JSON.stringify({
            type: 'join_confirm',
            success: false,
            reason: 'Servidor lleno'
        }));
    }
}

function handlePlayerUpdate(playerData) {
    const player = getPlayer(playerData.uuid);
    if (player) {
        player.updatePosition(playerData.position.x, playerData.position.y, playerData.position.z);
        player.updateRotation(playerData.rotation.pitch, playerData.rotation.yaw);
        player.teamId = playerData.teamId || null;
        // Actualizar dimensión si viene en los datos
        if (playerData.dimension) {
            player.dimension = playerData.dimension;
        }

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
