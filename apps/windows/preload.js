    // Recibir coordenadas del addon
    onAddonCoords: (callback) =>
        ipcRenderer.on('addon-coords', (event, data) => callback(data)),

    // Reenviar coordenadas al servidor
    forwardAddonCoords: (coords) =>
        ipcRenderer.send('forward-addon-coords', coords),
// Preload script for Electron - security context
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
    connectToServer: (playerName, serverUrl) =>
        ipcRenderer.invoke('connect-to-server', playerName, serverUrl),
    
    toggleMute: () =>
        ipcRenderer.invoke('toggle-mute'),
    
    startSpeaking: () =>
        ipcRenderer.invoke('start-speaking'),
    
    stopSpeaking: () =>
        ipcRenderer.invoke('stop-speaking'),
    
    setSensitivity: (value) =>
        ipcRenderer.invoke('set-sensitivity', value),
    
    disconnect: () =>
        ipcRenderer.invoke('disconnect'),
    
    sendAudioChunk: (audioData) =>
        ipcRenderer.send('send-audio-chunk', audioData),
    
    reportLatency: (latency) =>
        ipcRenderer.send('report-latency', latency),
    
    // Event listeners
    onJoinConfirm: (callback) =>
        ipcRenderer.on('join-confirm', (event, data) => callback(data)),
    
    onPlayerUpdate: (callback) =>
        ipcRenderer.on('player-update', (event, data) => callback(data)),
    
    onPlayerEvent: (callback) =>
        ipcRenderer.on('player-event', (event, data) => callback(data)),
    
    onNearbyPlayers: (callback) =>
        ipcRenderer.on('nearby-players', (event, data) => callback(data)),
    
    onConnectionError: (callback) =>
        ipcRenderer.on('connection-error', (event, error) => callback(error)),
    
    onDisconnected: (callback) =>
        ipcRenderer.on('disconnected', () => callback()),
    
    onAudioStart: (callback) =>
        ipcRenderer.on('audio-start', (event, data) => callback(data)),
    
    onAudioChunk: (callback) =>
        ipcRenderer.on('audio-chunk', (event, data) => callback(data)),
    
    onAudioStop: (callback) =>
        ipcRenderer.on('audio-stop', (event, data) => callback(data)),
    
    // Reconnection events
    onReconnecting: (callback) =>
        ipcRenderer.on('reconnecting', (event, data) => callback(data)),
    
    onReconnected: (callback) =>
        ipcRenderer.on('reconnected', () => callback()),
    
    onReconnectFailed: (callback) =>
        ipcRenderer.on('reconnect-failed', () => callback()),
});
