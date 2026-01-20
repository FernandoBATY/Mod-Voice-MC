import { world, system, Player } from '@minecraft/server';

const CONFIG = {
    proximityRange: 30,
    maxVolume: 1.0,
    minVolume: 0.1,
    volumeFalloff: 1.5,
    teamChatEnabled: true,
    globalChatEnabled: false,
    updateInterval: 100,
    serverUrl: 'ws://localhost:8080'
};

const playerData = new Map();
const activePlayers = new Set();

class PlayerVoiceState {
    constructor(player) {
        this.player = player;
        this.uuid = player.id;
        this.name = player.name;
        this.position = player.location;
        this.rotation = { pitch: player.getRotation().x, yaw: player.getRotation().y };
        this.dimension = player.dimension.id; // ⭐ Capturar dimensión (overworld, nether, the_end)
        this.isSpeaking = false;
        this.teamId = this.getTeamId();
        this.isMuted = false;
        this.lastUpdate = Date.now();
    }

    getTeamId() {
        const tags = this.player.getTags();
        const teamTag = tags.find(tag => tag.startsWith('team:'));
        return teamTag ? teamTag.replace('team:', '') : null;
    }

    updatePosition() {
        try {
            this.position = this.player.location;
            this.rotation = { pitch: this.player.getRotation().x, yaw: this.player.getRotation().y };
            this.dimension = this.player.dimension.id; // ⭐ Actualizar dimensión cada tick
            this.lastUpdate = Date.now();
        } catch (e) {
            console.warn(`Error al actualizar posicion para ${this.name}:`, e);
        }
    }

    getDistanceToPlayer(otherPlayer) {
        const dx = this.position.x - otherPlayer.position.x;
        const dy = this.position.y - otherPlayer.position.y;
        const dz = this.position.z - otherPlayer.position.z;
        return Math.sqrt(dx * dx + dy * dy + dz * dz);
    }

    isNearby(otherPlayer, range = CONFIG.proximityRange) {
        return this.getDistanceToPlayer(otherPlayer) <= range;
    }

    canHearPlayer(otherPlayer) {
        if (this.isNearby(otherPlayer, CONFIG.proximityRange)) {
            return true;
        }

        if (CONFIG.teamChatEnabled && this.teamId && this.teamId === otherPlayer.teamId) {
            return true;
        }

        if (CONFIG.globalChatEnabled) {
            return true;
        }

        return false;
    }

    calculateVolumeForSpeaker(speakerData) {
        const distance = this.getDistanceToPlayer(speakerData);

        if (distance === 0) return CONFIG.maxVolume;

        const volumePercent = 1 - (distance / CONFIG.proximityRange);
        const calculatedVolume = CONFIG.maxVolume * Math.pow(Math.max(0, volumePercent), CONFIG.volumeFalloff);

        return Math.max(CONFIG.minVolume, Math.min(CONFIG.maxVolume, calculatedVolume));
    }
}

function initializePlayer(player) {
    if (!playerData.has(player.id)) {
        const voiceState = new PlayerVoiceState(player);
        playerData.set(player.id, voiceState);
        activePlayers.add(player.id);

        sendPlayerStateToServer(voiceState, 'join');

        if (CONFIG.serverUrl) {
            player.sendMessage('§6[Voz]§r Conectado al Chat de Voz de Proximidad!');
        }
    }
}

function updatePlayerPositions() {
    const allPlayers = world.getAllPlayers();

    allPlayers.forEach(player => {
        if (!playerData.has(player.id)) {
            initializePlayer(player);
        }

        const voiceState = playerData.get(player.id);
        voiceState.updatePosition();
    });
}

function sendPlayerStateToServer(voiceState, eventType = 'update') {
    if (!CONFIG.serverUrl) return;

    const data = {
        event: eventType,
        player: {
            uuid: voiceState.uuid,
            name: voiceState.name,
            position: voiceState.position,
            rotation: voiceState.rotation,
            dimension: voiceState.dimension, // ⭐ Enviar dimensión al servidor
            teamId: voiceState.teamId,
            isSpeaking: voiceState.isSpeaking
        },
        timestamp: voiceState.lastUpdate
    };

    system.run(() => {
        sendDataToServer(data);
    });
}

function sendDataToServer(data) {
    if (CONFIG.serverUrl) {
        console.log(`[Servidor de Voz] ${JSON.stringify(data)}`);
    }
}

function broadcastNearbyPlayers(speakerUuid) {
    const speaker = playerData.get(speakerUuid);
    if (!speaker) return;

    const nearbyPlayers = [];

    playerData.forEach((voiceState, uuid) => {
        if (uuid !== speakerUuid && speaker.canHearPlayer(voiceState)) {
            const volume = voiceState.calculateVolumeForSpeaker(speaker);
            nearbyPlayers.push({
                uuid: voiceState.uuid,
                name: voiceState.name,
                volume: volume,
                distance: speaker.getDistanceToPlayer(voiceState)
            });
        }
    });

    return nearbyPlayers;
}

function startPlayerVoice(playerUuid) {
    const voiceState = playerData.get(playerUuid);
    if (!voiceState) return;

    voiceState.isSpeaking = true;
    sendPlayerStateToServer(voiceState, 'speaking_start');

    const nearbyPlayers = broadcastNearbyPlayers(playerUuid);
    if (nearbyPlayers.length > 0) {
        notifyNearbyPlayers(voiceState, nearbyPlayers, 'speaking');
    }
}

function stopPlayerVoice(playerUuid) {
    const voiceState = playerData.get(playerUuid);
    if (!voiceState) return;

    voiceState.isSpeaking = false;
    sendPlayerStateToServer(voiceState, 'speaking_stop');
}

function notifyNearbyPlayers(speaker, nearbyPlayers, eventType) {
    try {
        const world = world.getDimension('overworld');
        const messageText = eventType === 'speaking'
            ? `§a[Voz]§r ${speaker.name} esta hablando cerca (${nearbyPlayers.length} pueden escuchar)`
            : `§c[Voz]§r ${speaker.name} dejo de hablar`;

        if (CONFIG.serverUrl) {
            sendDataToServer({
                event: 'notify_nearby',
                speaker: speaker.uuid,
                nearbyPlayers: nearbyPlayers,
                messageType: eventType
            });
        }
    } catch (e) {
        console.warn('Error al notificar jugadores cercanos:', e);
    }
}

function registerCommands() {
    world.beforeEvents.chatSend.subscribe((event) => {
        const player = event.sender;
        const message = event.message.toLowerCase();

        if (message === '!voice') {
            event.cancel = true;
            const voiceState = playerData.get(player.id);
            if (voiceState) {
                player.sendMessage([
                    '§e=== Chat de Voz de Proximidad ===',
                    `§aEstado: §r${voiceState.isSpeaking ? 'Hablando' : 'Silencio'}`,
                    `§aRango: §r${CONFIG.proximityRange} bloques`,
                    `§aEquipo: §r${voiceState.teamId || 'Ninguno'}`,
                    `§aComandos: !voice !voice-range !voice-team`
                ].join('\n'));
            }
        }

        if (message.startsWith('!voice-range ')) {
            event.cancel = true;
            const range = parseInt(message.split(' ')[1]);
            if (!isNaN(range) && range > 0) {
                CONFIG.proximityRange = range;
                player.sendMessage(`§6[Voz]§r Rango de proximidad establecido a ${range} bloques`);
            }
        }

        if (message === '!voice-team') {
            event.cancel = true;
            const voiceState = playerData.get(player.id);
            player.sendMessage(`§6[Voz]§r Chat de equipo: ${CONFIG.teamChatEnabled ? '§aActivado' : '§cDesactivado'}§r`);
        }
    });
}

function removePlayer(playerId) {
    const voiceState = playerData.get(playerId);
    if (voiceState) {
        stopPlayerVoice(playerId);
        sendPlayerStateToServer(voiceState, 'leave');
        playerData.delete(playerId);
        activePlayers.delete(playerId);
    }
}

let updateCounter = 0;

system.runInterval(() => {
    updateCounter++;

    updatePlayerPositions();

    const allPlayers = world.getAllPlayers();
    const currentPlayerIds = new Set(allPlayers.map(p => p.id));

    playerData.forEach((voiceState, uuid) => {
        if (!currentPlayerIds.has(uuid)) {
            removePlayer(uuid);
        }
    });

    if (updateCounter % 100 === 0 && CONFIG.debugMode) {
        console.log(`[Chat de Voz] Jugadores activos: ${playerData.size}`);
    }
}, CONFIG.updateInterval);

system.run(() => {
    registerCommands();
});

world.beforeEvents.playerSpawn.subscribe((event) => {
    if (event.initialSpawn) {
        system.run(() => {
            initializePlayer(event.player);
        });
    }
});

world.afterEvents.playerLeave.subscribe((event) => {
    removePlayer(event.playerId);
});

console.log('[Chat de Voz de Proximidad] Script cargado exitosamente!');
