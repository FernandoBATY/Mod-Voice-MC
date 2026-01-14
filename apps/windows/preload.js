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
    
    // Event listeners
    onJoinConfirm: (callback) =>
        ipcRenderer.on('join-confirm', (event, data) => callback(data)),
    
    onPlayerUpdate: (callback) =>
        ipcRenderer.on('player-update', (event, data) => callback(data)),
    
    onPlayerEvent: (callback) =>
        ipcRenderer.on('player-event', (event, data) => callback(data)),
    
    onConnectionError: (callback) =>
        ipcRenderer.on('connection-error', (event, error) => callback(error)),
    
    onDisconnected: (callback) =>
        ipcRenderer.on('disconnected', () => callback()),
});
