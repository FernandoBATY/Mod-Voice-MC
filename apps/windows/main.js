// Proximity Voice Chat - Windows Electron App
// Main process
const { app, BrowserWindow, Menu, ipcMain } = require('electron');
const path = require('path');
const WebSocket = require('ws');

let mainWindow;
let wsConnection = null;
let voiceState = {
    isMuted: false,
    isSpeaking: false,
    playerName: '',
    serverUrl: 'ws://localhost:8080',
    proximityRange: 30,
    nearbyPlayers: []
};

// Reconexión automática
let reconnectAttempts = 0;
const maxReconnectAttempts = 10;
let reconnectTimer = null;
let isReconnecting = false;

// ============================================
// WINDOW CREATION
// ============================================

function createWindow() {
    mainWindow = new BrowserWindow({
        width: 800,
        height: 600,
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            contextIsolation: true,
            enableRemoteModule: false,
        }
    });

    mainWindow.loadFile('src/index.html');

    // Dev tools in development
    // mainWindow.webContents.openDevTools();

    mainWindow.on('closed', () => {
        mainWindow = null;
    });
}

// ============================================
// WEBSOCKET CONNECTION
// ============================================

function connectToServer(playerName, serverUrl, linkingCode = null) {
    return new Promise((resolve, reject) => {
        try {
            wsConnection = new WebSocket(serverUrl);

            wsConnection.on('open', () => {
                voiceState.playerName = playerName;
                voiceState.serverUrl = serverUrl;

                // Send join message with deviceType and optional linking code
                const joinMessage = {
                    type: 'player_join',
                    uuid: generateUUID(playerName),
                    name: playerName,
                    version: '2.0.0',
                    deviceType: 'windows'  // ⭐ Identifica que es Windows app
                };

                // Agregar código de vinculación si existe
                if (linkingCode && linkingCode.length > 0) {
                    joinMessage.linkingCode = linkingCode.toUpperCase();
                }

                wsConnection.send(JSON.stringify(joinMessage));

                resolve(true);
            });

            wsConnection.on('message', (data) => {
                handleServerMessage(JSON.parse(data));
            });

            wsConnection.on('error', (error) => {
                console.error('WebSocket error:', error);
                mainWindow?.webContents.send('connection-error', error.message);
                reject(error);
            });

            wsConnection.on('close', () => {
                console.log('[WebSocket] Connection closed');
                mainWindow?.webContents.send('disconnected');
                attemptReconnect();
            });
        } catch (error) {
            reject(error);
        }
    });
}

function attemptReconnect() {
    if (isReconnecting || reconnectAttempts >= maxReconnectAttempts) {
        if (reconnectAttempts >= maxReconnectAttempts) {
            console.error('[Reconnect] Max attempts reached');
            mainWindow?.webContents.send('reconnect-failed');
        }
        return;
    }
    
    if (!voiceState.playerName || !voiceState.serverUrl) {
        console.log('[Reconnect] No previous connection info');
        return;
    }
    
    isReconnecting = true;
    reconnectAttempts++;
    
    // Exponential backoff: 1s, 2s, 4s, 8s, 16s, 30s max
    const delay = Math.min(1000 * Math.pow(2, reconnectAttempts - 1), 30000);
    
    console.log(`[Reconnect] Attempt ${reconnectAttempts}/${maxReconnectAttempts} in ${delay}ms`);
    mainWindow?.webContents.send('reconnecting', { attempt: reconnectAttempts, maxAttempts: maxReconnectAttempts });
    
    if (reconnectTimer) clearTimeout(reconnectTimer);
    
    reconnectTimer = setTimeout(async () => {
        isReconnecting = false;
        try {
            await connectToServer(voiceState.playerName, voiceState.serverUrl);
            console.log('[Reconnect] Successfully reconnected!');
            reconnectAttempts = 0;
            mainWindow?.webContents.send('reconnected');
        } catch (error) {
            console.error('[Reconnect] Failed:', error.message);
            attemptReconnect();
        }
    }, delay);
}

function cancelReconnect() {
    isReconnecting = false;
    reconnectAttempts = 0;
    if (reconnectTimer) {
        clearTimeout(reconnectTimer);
        reconnectTimer = null;
    }
}

function handleServerMessage(message) {
    const { type } = message;

    switch (type) {
        case 'join_confirm':
            reconnectAttempts = 0;
            cancelReconnect();
            mainWindow?.webContents.send('join-confirm', message);
            
            // Si el servidor devolvió un código de vinculación, mostrarlo
            if (message.linkingCode) {
                console.log(`🔗 Código de vinculación: ${message.linkingCode} (válido ${message.linkingCodeExpires}s)`);
                mainWindow?.webContents.send('linking-code', {
                    code: message.linkingCode,
                    expiresIn: message.linkingCodeExpires
                });
            }
            break;

        case 'linking_required':
            console.log('Se requiere código de vinculación');
            mainWindow?.webContents.send('linking-required', message);
            break;

        case 'linking_failed':
            console.error('Vinculación falló:', message.error);
            mainWindow?.webContents.send('linking-failed', message);
            break;

        case 'linking_result':
            mainWindow?.webContents.send('linking-result', message);
            
            // Si la vinculación fue exitosa, conectar automáticamente
            if (message.success) {
                console.log('✅ Dispositivo vinculado correctamente');
                voiceState.isLinked = true;
            } else {
                console.error('❌ Vinculación falló:', message.error);
                voiceState.isLinked = false;
            }
            break;

        case 'linking_code':
            console.log(`🔗 Código recibido: ${message.code} (válido ${message.expiresIn}s)`);
            mainWindow?.webContents.send('linking-code-update', {
                code: message.code,
                expiresIn: message.expiresIn
            });
            break;

        case 'player_update':
            mainWindow?.webContents.send('player-update', message);
            break;

        case 'nearby_players':
            mainWindow?.webContents.send('nearby-players', message);
            break;

        case 'player_event':
            if (message.event === 'player_join') {
                voiceState.nearbyPlayers.push(message.data);
            } else if (message.event === 'player_leave') {
                voiceState.nearbyPlayers = voiceState.nearbyPlayers.filter(
                    p => p.uuid !== message.data.uuid
                );
            }
            mainWindow?.webContents.send('player-event', message);
            break;
        case 'audio_start':
            mainWindow?.webContents.send('audio-start', message);
            break;
        case 'audio_chunk':
            // Forward audio chunk to renderer with volume/pan
            mainWindow?.webContents.send('audio-chunk', {
                uuid: message.uuid,
                audioData: message.audioData,
                volume: message.volume || 1.0,
                pan: message.pan || 0
            });
            break;
        case 'audio_stop':
            mainWindow?.webContents.send('audio-stop', message);
            break;
    }
}

// ============================================
// IPC HANDLERS
// ============================================

ipcMain.handle('connect-to-server', async (event, playerName, serverUrl, linkingCode = null) => {
    try {
        await connectToServer(playerName, serverUrl, linkingCode);
        return { success: true };
    } catch (error) {
        return { success: false, error: error.message };
    }
});

ipcMain.handle('toggle-mute', async (event) => {
    voiceState.isMuted = !voiceState.isMuted;

    if (wsConnection && wsConnection.readyState === WebSocket.OPEN) {
        wsConnection.send(JSON.stringify({
            type: 'mute_status',
            muted: voiceState.isMuted
        }));
    }

    return voiceState.isMuted;
});

ipcMain.handle('start-speaking', async (event) => {
    voiceState.isSpeaking = true;

    if (wsConnection && wsConnection.readyState === WebSocket.OPEN) {
        wsConnection.send(JSON.stringify({
            type: 'audio_start',
            player: { 
                uuid: generateUUID(voiceState.playerName),
                name: voiceState.playerName
            },
            uuid: generateUUID(voiceState.playerName)
        }));
    }

    return true;
});

ipcMain.handle('stop-speaking', async (event) => {
    voiceState.isSpeaking = false;

    if (wsConnection && wsConnection.readyState === WebSocket.OPEN) {
        wsConnection.send(JSON.stringify({
            type: 'audio_stop',
            player: { 
                uuid: generateUUID(voiceState.playerName)
            },
            uuid: generateUUID(voiceState.playerName)
        }));
    }

    return true;
});

ipcMain.handle('set-sensitivity', async (event, sensitivity) => {
    voiceState.sensitivity = sensitivity;
    return true;
});

ipcMain.handle('submit-linking-code', async (event, code) => {
    if (wsConnection && wsConnection.readyState === WebSocket.OPEN) {
        wsConnection.send(JSON.stringify({
            type: 'submit_linking_code',
            uuid: generateUUID(voiceState.playerName),
            deviceType: 'windows',
            code: code.toUpperCase()
        }));
        return true;
    }
    return false;
});

ipcMain.handle('get-linking-code', async (event) => {
    if (wsConnection && wsConnection.readyState === WebSocket.OPEN) {
        wsConnection.send(JSON.stringify({
            type: 'get_linking_code',
            uuid: generateUUID(voiceState.playerName)
        }));
        return true;
    }
    return false;
});

ipcMain.on('send-audio-chunk', (event, audioData) => {
    if (wsConnection && wsConnection.readyState === WebSocket.OPEN) {
        wsConnection.send(JSON.stringify({
            type: 'audio_chunk',
            player: { uuid: generateUUID(voiceState.playerName) },
            audioData: Array.from(audioData.data),
            timestamp: audioData.timestamp,
            sampleRate: audioData.sampleRate
        }));
    }
});

ipcMain.on('report-latency', (event, latency) => {
    if (wsConnection && wsConnection.readyState === WebSocket.OPEN) {
        wsConnection.send(JSON.stringify({
            type: 'report_latency',
            player: { uuid: generateUUID(voiceState.playerName) },
            latency: latency
        }));
    }
});

ipcMain.handle('disconnect', async (event) => {
    cancelReconnect();
    if (wsConnection) {
        wsConnection.close();
        wsConnection = null;
    }
    return true;
});

// ============================================
// APP LIFECYCLE
// ============================================

app.on('ready', () => {
    createWindow();
    createMenu();
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

app.on('activate', () => {
    if (mainWindow === null) {
        createWindow();
    }
});

// ============================================
// MENU
// ============================================

function createMenu() {
    const template = [
        {
            label: 'File',
            submenu: [
                {
                    label: 'Exit',
                    accelerator: 'CmdOrCtrl+Q',
                    click: () => {
                        app.quit();
                    }
                }
            ]
        },
        {
            label: 'Help',
            submenu: [
                {
                    label: 'About',
                    click: () => {
                        // Show about dialog
                    }
                }
            ]
        }
    ];

    const menu = Menu.buildFromTemplate(template);
    Menu.setApplicationMenu(menu);
}

// ============================================
// UTILITY
// ============================================

function generateUUID(playerName) {
    return `player_${playerName.hashCode || playerName.split('').reduce((a, b) => ((a << 5) - a) + b.charCodeAt(0), 0)}`;
}

module.exports = { voiceState };
