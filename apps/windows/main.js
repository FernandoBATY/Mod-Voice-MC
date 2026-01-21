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

function connectToServer(playerName, serverUrl) {
    return new Promise((resolve, reject) => {
        try {
            wsConnection = new WebSocket(serverUrl);

            wsConnection.on('open', () => {
                voiceState.playerName = playerName;
                voiceState.serverUrl = serverUrl;

                // Send join message
                wsConnection.send(JSON.stringify({
                    type: 'player_join',
                    player: {
                        uuid: generateUUID(playerName),
                        name: playerName,
                        version: '1.0.0'
                    }
                }));

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
                mainWindow?.webContents.send('disconnected');
            });
        } catch (error) {
            reject(error);
        }
    });
}

function handleServerMessage(message) {
    const { type } = message;

    switch (type) {
        case 'join_confirm':
            mainWindow?.webContents.send('join-confirm', message);
            break;
        case 'player_update':
            mainWindow?.webContents.send('player-update', message);
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

ipcMain.handle('connect-to-server', async (event, playerName, serverUrl) => {
    try {
        await connectToServer(playerName, serverUrl);
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
            player: { uuid: generateUUID(voiceState.playerName) }
        }));
    }

    return true;
});

ipcMain.handle('stop-speaking', async (event) => {
    voiceState.isSpeaking = false;

    if (wsConnection && wsConnection.readyState === WebSocket.OPEN) {
        wsConnection.send(JSON.stringify({
            type: 'audio_stop',
            player: { uuid: generateUUID(voiceState.playerName) }
        }));
    }

    return true;
});

ipcMain.handle('set-sensitivity', async (event, sensitivity) => {
    voiceState.sensitivity = sensitivity;
    return true;
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

ipcMain.handle('disconnect', async (event) => {
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
