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

// Sistema de código temporal de vinculación
let linkingCodeState = {
    code: null,
    generatedTime: null,
    expiresAt: null,
    isShown: true,
    showDuration: 120000 // 2 minutos
};

const hudData = {
    isConnected: false,
    isSpeaking: false,
    micLevel: 0,
    playerCount: 0,
    nearbyPlayers: [],
    linkingCode: null
};

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

        // ⭐ Generar código de vinculación
        const code = requestLinkingCodeFromServer(voiceState.uuid, voiceState.name);

        // Mostrar código al jugador
        player.sendMessage('§6╔═══════════════════════════════════╗§r');
        player.sendMessage('§6║  §bChat de Voz de Proximidad  §6║§r');
        player.sendMessage('§6╠═══════════════════════════════════╣§r');
        player.sendMessage('§6║  §3🔗 Tu código de vinculación:  §6║§r');
        player.sendMessage(`§6║      §b§l${code}§r                     §6║§r`);
        player.sendMessage('§6║  §7(Válido por 10 minutos)       §6║§r');
        player.sendMessage('§6╚═══════════════════════════════════╝§r');
        player.sendMessage('§7Ingresa este código en la app móvil§r');
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

    const messageType = eventType === 'join' ? 'player_join' : 
                       eventType === 'leave' ? 'player_leave' : 
                       'player_update';

    const data = {
        type: messageType,
        player: {
            uuid: voiceState.uuid,
            name: voiceState.name,
            position: voiceState.position,
            rotation: voiceState.rotation,
            dimension: voiceState.dimension,
            teamId: voiceState.teamId,
            isSpeaking: voiceState.isSpeaking,
            deviceType: 'minecraft'  // ⭐ IMPORTANTE: Identifica que es el addon
        },
        // También enviar en el nivel superior para compatibilidad
        uuid: voiceState.uuid,
        name: voiceState.name,
        position: voiceState.position,
        rotation: voiceState.rotation,
        dimension: voiceState.dimension,
        deviceType: 'minecraft',
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

// ============ FUNCIONES DE CÓDIGO TEMPORAL ============

function generateLinkingCode() {
    // Generar código de 4 dígitos aleatorio
    const code = Math.floor(1000 + Math.random() * 9000).toString();
    return code;
}

function requestLinkingCodeFromServer(uuid, playerName) {
    // Generar código localmente
    const code = generateLinkingCode();
    const expiresIn = 600; // 10 minutos
    
    linkingCodeState.code = code;
    linkingCodeState.generatedTime = Date.now();
    linkingCodeState.expiresAt = Date.now() + (expiresIn * 1000);
    linkingCodeState.isShown = true;
    
    console.log(`[Código] Código generado: ${code} para ${playerName} (válido ${expiresIn}s)`);
    
    // Notificar al servidor sobre el código generado
    const message = {
        type: 'linking_code_generated',
        uuid: uuid,
        name: playerName,
        code: code,
        expiresIn: expiresIn
    };
    sendDataToServer(message);
    
    return code;
}

function handleLinkingCode(code, expiresIn) {
    linkingCodeState.code = code;
    linkingCodeState.generatedTime = Date.now();
    linkingCodeState.expiresAt = Date.now() + (expiresIn * 1000);
    linkingCodeState.isShown = true;
    
    console.log(`[Código] Código recibido: ${code} (válido ${expiresIn}s)`);
}

function updateLinkingCodeDisplay() {
    if (!linkingCodeState.code) return;
    
    const now = Date.now();
    const timePassed = now - linkingCodeState.generatedTime;
    const totalDuration = linkingCodeState.expiresAt - linkingCodeState.generatedTime;
    const remainingTime = Math.max(0, linkingCodeState.expiresAt - now);
    
    // Auto-hide después de 2 minutos
    if (remainingTime <= 0) {
        linkingCodeState.code = null;
        linkingCodeState.isShown = false;
        console.log(`[Código] Código expirado`);
        return;
    }
    
    // Actualizar HUD con código
    hudData.linkingCode = {
        code: linkingCodeState.code,
        remainingSeconds: Math.ceil(remainingTime / 1000)
    };
}

function refreshLinkingCode(playerName) {
    linkingCodeState.code = null;
    requestLinkingCodeFromServer(playerName, playerName);
    console.log(`[Código] Código refrescado`);
}

// ====================================================

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

        // Comando para ver el código actual
        if (message === '!codigo' || message === '!code') {
            event.cancel = true;
            if (linkingCodeState.code) {
                const remaining = Math.ceil((linkingCodeState.expiresAt - Date.now()) / 1000);
                player.sendMessage('§6╔═══════════════════════════════════╗§r');
                player.sendMessage('§6║  §3🔗 Tu código de vinculación:  §6║§r');
                player.sendMessage(`§6║      §b§l${linkingCodeState.code}§r                     §6║§r`);
                player.sendMessage(`§6║  §7(Expira en ${remaining}s)          §6║§r`);
                player.sendMessage('§6╚═══════════════════════════════════╝§r');
            } else {
                player.sendMessage('§c[Voz]§r No hay código activo. Usa §b!nuevoCodigo§r para generar uno nuevo.');
            }
        }

        // Comando para generar nuevo código
        if (message === '!nuevocodigo' || message === '!newcode') {
            event.cancel = true;
            const voiceState = playerData.get(player.id);
            if (voiceState) {
                const code = requestLinkingCodeFromServer(voiceState.uuid, voiceState.name);
                player.sendMessage('§6╔═══════════════════════════════════╗§r');
                player.sendMessage('§6║  §anuevo código generado!       §6║§r');
                player.sendMessage('§6╠═══════════════════════════════════╣§r');
                player.sendMessage('§6║  §3🔗 Tu código de vinculación:  §6║§r');
                player.sendMessage(`§6║      §b§l${code}§r                     §6║§r`);
                player.sendMessage('§6║  §7(Válido por 10 minutos)       §6║§r');
                player.sendMessage('§6╚═══════════════════════════════════╝§r');
            }
        }

        if (message === '!voice') {
            event.cancel = true;
            const voiceState = playerData.get(player.id);
            if (voiceState) {
                player.sendMessage([
                    '§e=== Chat de Voz de Proximidad ===',
                    `§aEstado: §r${voiceState.isSpeaking ? 'Hablando' : 'Silencio'}`,
                    `§aRango: §r${CONFIG.proximityRange} bloques`,
                    `§aEquipo: §r${voiceState.teamId || 'Ninguno'}`,
                    `§aCódigo: §r${linkingCodeState.code || 'Ninguno'}`,
                    '',
                    '§bComandos disponibles:§r',
                    '  §3!codigo§r - Ver código actual',
                    '  §3!nuevoCodigo§r - Generar nuevo código',
                    '  §3!voice§r - Ver estado',
                    '  §3!voice-range <número>§r - Cambiar rango'
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
    
    // ⭐ Actualizar display del código de vinculación
    updateLinkingCodeDisplay();

    const allPlayers = world.getAllPlayers();
    const currentPlayerIds = new Set(allPlayers.map(p => p.id));

    playerData.forEach((voiceState, uuid) => {
        if (!currentPlayerIds.has(uuid)) {
            removePlayer(uuid);
        } else {
            // ⭐ Enviar actualización de posición cada 10 ticks (500ms)
            if (updateCounter % 5 === 0) {
                sendPlayerStateToServer(voiceState, 'update');
            }
        }
    });

    if (updateCounter % 100 === 0 && CONFIG.debugMode) {
        console.log(`[Chat de Voz] Jugadores activos: ${playerData.size}`);
    }
    
    // Update HUD data for all players
    updateHUDForAllPlayers();
}, CONFIG.updateInterval);

function updateHUDForAllPlayers() {
    world.getAllPlayers().forEach(player => {
        const voiceState = playerData.get(player.id);
        if (!voiceState) return;
        
        // Build nearby players list
        const nearbyList = [];
        playerData.forEach((otherState, otherUuid) => {
            if (otherUuid !== player.id && voiceState.canHearPlayer(otherState)) {
                const distance = voiceState.getDistanceToPlayer(otherState);
                nearbyList.push({
                    name: otherState.name,
                    distance: Math.round(distance),
                    isSpeaking: otherState.isSpeaking,
                    volume: voiceState.calculateVolumeForSpeaker(otherState)
                });
            }
        });
        
        // Sort by distance
        nearbyList.sort((a, b) => a.distance - b.distance);
        
        // Update HUD data
        hudData.playerCount = playerData.size;
        hudData.nearbyPlayers = nearbyList;
        hudData.isSpeaking = voiceState.isSpeaking;
        hudData.isConnected = CONFIG.serverUrl && CONFIG.serverUrl.length > 0;
        
        // ⭐ Mostrar código de vinculación si existe
        let hudText = '';
        
        if (hudData.linkingCode && hudData.linkingCode.code) {
            // Mostrar código prominentemente pero no invasivo
            const code = hudData.linkingCode.code;
            const remaining = hudData.linkingCode.remainingSeconds;
            const bar = '█'.repeat(Math.ceil(remaining / 12)) + '░'.repeat(Math.max(0, 10 - Math.ceil(remaining / 12)));
            
            hudText = `§3🔗 Código: §b${code} §3(${remaining}s) ${bar}§r`;
            player.onScreenDisplay.setTitle(hudText, {
                stayDuration: 40,
                fadeInDuration: 5,
                fadeOutDuration: 5,
                subtitle: `§7Ingresa este código en la app para vincular tu dispositivo§r`
            });
        } else if (voiceState.isSpeaking) {
            hudText = '§c🎤 HABLANDO...§r';
            player.onScreenDisplay.setActionBar(hudText);
        } else if (nearbyList.length > 0) {
            const nearbyNames = nearbyList.slice(0, 3).map(p => 
                `${p.isSpeaking ? '🔊' : ''}${p.name} (${p.distance}m)`
            ).join(', ');
            
            player.onScreenDisplay.setActionBar(
                `§b[Voz]§r ${nearbyNames}${nearbyList.length > 3 ? ` +${nearbyList.length - 3} más` : ''}`
            );
        }
    });
}

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
