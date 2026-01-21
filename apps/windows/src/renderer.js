// Renderer process - UI logic with WebRTC Audio
let currentVoiceState = {
    isConnected: false,
    isMuted: false,
    isSpeaking: false,
    playerName: '',
    playerCount: 1,
    nearbyPlayers: [],
    audioInitialized: false
};

// ============================================
// LOGIN FORM HANDLING
// ============================================

const loginForm = document.getElementById('login-form');
const loginBtn = document.getElementById('login-btn');
const playerNameInput = document.getElementById('player-name');
const serverUrlInput = document.getElementById('server-url');
const errorMessage = document.getElementById('error-message');

loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const playerName = playerNameInput.value.trim();
    const serverUrl = serverUrlInput.value.trim();

    if (!playerName) {
        showError('Please enter a player name');
        return;
    }

    loginBtn.disabled = true;
    loginBtn.textContent = 'Connecting...';

    try {
        const result = await window.api.connectToServer(playerName, serverUrl);
        
        if (result.success) {
            currentVoiceState.playerName = playerName;
            
            // Save connection info
            saveConnectionInfo(serverUrl, playerName);
            
            showVoiceScreen();
        } else {
            showError(`Connection failed: ${result.error}`);
            loginBtn.disabled = false;
            loginBtn.textContent = 'Connect';
        }
    } catch (error) {
        showError(`Error: ${error.message}`);
        loginBtn.disabled = false;
        loginBtn.textContent = 'Connect';
    }
});

function showError(message) {
    errorMessage.textContent = message;
    errorMessage.classList.add('show');
    setTimeout(() => {
        errorMessage.classList.remove('show');
    }, 5000);
}

// ============================================
// VOICE SCREEN
// ============================================

const loginScreen = document.getElementById('login-screen');
const voiceScreen = document.getElementById('voice-screen');
const muteBtn = document.getElementById('mute-btn');
const pttBtn = document.getElementById('ptt-btn');
const sensitivitySlider = document.getElementById('sensitivity');
const statusIndicator = document.getElementById('status-indicator');
const statusText = document.getElementById('status-text');
const playerCount = document.getElementById('player-count');
const playersList = document.getElementById('players-list');

function showVoiceScreen() {
    loginScreen.style.display = 'none';
    voiceScreen.style.display = 'flex';
    updateConnectionStatus(true);
    
    // Initialize audio system
    initializeAudio();
}

function showLoginScreen() {
    loginScreen.style.display = 'flex';
    voiceScreen.style.display = 'none';
    updateConnectionStatus(false);
}

// ============================================
// CONTROL HANDLERS
// ============================================

muteBtn.addEventListener('click', async () => {
    currentVoiceState.isMuted = await window.api.toggleMute();
    updateMuteButton();
});

pttBtn.addEventListener('mousedown', async () => {
    if (!currentVoiceState.audioInitialized) return;
    
    currentVoiceState.isSpeaking = true;
    await window.api.startSpeaking();
    updatePTTButton();
    
    // Start capturing and sending audio
    window.audioManager.startRecording((audioData) => {
        window.api.sendAudioChunk(audioData);
    });
});

pttBtn.addEventListener('mouseup', async () => {
    currentVoiceState.isSpeaking = false;
    await window.api.stopSpeaking();
    updatePTTButton();
    
    // Stop audio recording
    window.audioManager.stopRecording();
});

pttBtn.addEventListener('mouseleave', async () => {
    if (currentVoiceState.isSpeaking) {
        currentVoiceState.isSpeaking = false;
        await window.api.stopSpeaking();
        updatePTTButton();
        
        // Stop audio recording
        window.audioManager.stopRecording();
    }
});

sensitivitySlider.addEventListener('change', async (e) => {
    await window.api.setSensitivity(parseFloat(e.target.value));
});

function updateMuteButton() {
    if (currentVoiceState.isMuted) {
        muteBtn.classList.add('muted');
        muteBtn.innerHTML = '<span class="icon">🔇</span><span class="label">Muted</span>';
    } else {
        muteBtn.classList.remove('muted');
        muteBtn.innerHTML = '<span class="icon">🎤</span><span class="label">Unmuted</span>';
    }
}

function updatePTTButton() {
    if (currentVoiceState.isSpeaking) {
        pttBtn.classList.add('active');
        pttBtn.innerHTML = '<span class="icon">🔴</span><span class="label">Speaking...</span>';
    } else {
        pttBtn.classList.remove('active');
        pttBtn.innerHTML = '<span class="icon">📢</span><span class="label">Push to Talk</span>';
    }
}

function updateConnectionStatus(connected) {
    currentVoiceState.isConnected = connected;
    if (connected) {
        statusIndicator.classList.remove('disconnected');
        statusText.textContent = 'Connected';
    } else {
        statusIndicator.classList.add('disconnected');
        statusText.textContent = 'Disconnected';
    }
}

// ============================================
// PLAYER LIST
// ============================================

function updatePlayersList() {
    playersList.innerHTML = '';
    
    if (currentVoiceState.nearbyPlayers.length === 0) {
        playersList.innerHTML = '<p style="text-align: center; color: #999;">No nearby players</p>';
        return;
    }

    currentVoiceState.nearbyPlayers.forEach(player => {
        const card = document.createElement('div');
        card.className = 'player-card';
        card.innerHTML = `
            <div class="player-avatar">${player.name[0].toUpperCase()}</div>
            <div class="player-info">
                <div class="player-name">${player.name}</div>
                <div class="player-distance">${player.distance.toFixed(1)}m • Volume: ${(player.volume * 100).toFixed(0)}%</div>
            </div>
        `;
        playersList.appendChild(card);
    });
}

function updatePlayerCount() {
    playerCount.textContent = `(${currentVoiceState.playerCount})`;
}

// ============================================
// IPC EVENT LISTENERS
// ============================================

window.api.onJoinConfirm((data) => {
    console.log('Join confirmed:', data);
    currentVoiceState.playerCount = (data.otherPlayers?.length || 0) + 1;
    updatePlayerCount();
});

window.api.onPlayerEvent((data) => {
    const { event, data: eventData } = data;
    
    if (event === 'player_join') {
        currentVoiceState.playerCount++;
        currentVoiceState.nearbyPlayers.push({
            name: eventData.name,
            distance: 0,
            volume: 0.5
        });
        updatePlayerCount();
        updatePlayersList();
        
        // Show notification
        window.notifications.playerJoined(eventData.name);
    } else if (event === 'player_leave') {
        currentVoiceState.playerCount--;
        currentVoiceState.nearbyPlayers = currentVoiceState.nearbyPlayers.filter(
            p => p.name !== eventData.name
        );
        updatePlayerCount();
        updatePlayersList();
        
        // Show notification
        window.notifications.playerLeft(eventData.name);
    }
});

window.api.onPlayerUpdate((data) => {
    // Update player position/volume
    const { player } = data;
    const existingPlayer = currentVoiceState.nearbyPlayers.find(
        p => p.name === player.name
    );
    
    if (existingPlayer) {
        existingPlayer.distance = Math.sqrt(
            player.position.x ** 2 +
            player.position.y ** 2 +
            player.position.z ** 2
        );
    }
});

window.api.onConnectionError((error) => {
    showError(`Connection error: ${error}`);
    updateConnectionStatus(false);
    window.notifications.connectionError(error);
});

window.api.onDisconnected(() => {
    updateConnectionStatus(false);
    showLoginScreen();
});

// Audio event listeners
window.api.onAudioStart((data) => {
    console.log('[Audio] Speaker started:', data.uuid);
    // Prepare audio player for this speaker
});

window.api.onAudioChunk((data) => {
    const { uuid, audioData, volume, pan } = data;
    
    // Play audio chunk with 3D positioning
    window.audioManager.playAudioChunk(uuid, audioData, volume || 1.0, pan || 0);
});

window.api.onAudioStop((data) => {
    console.log('[Audio] Speaker stopped:', data.uuid);
    window.audioManager.stopSpeaker(data.uuid);
});

// ============================================
// INITIALIZATION
// ============================================

async function initializeAudio() {
    if (currentVoiceState.audioInitialized) return;
    
    try {
        console.log('[App] Initializing audio system...');
        
        const initialized = await window.audioManager.initialize();
        if (!initialized) {
            showError('Failed to initialize audio system');
            return;
        }
        
        const micAccess = await window.audioManager.getMicrophoneAccess();
        if (!micAccess) {
            showError('Microphone access denied. Please allow microphone permissions.');
            return;
        }
        
        currentVoiceState.audioInitialized = true;
        console.log('[App] Audio system ready');
        
        // Start microphone level monitoring
        startMicrophoneLevelMonitoring();
    } catch (error) {
        console.error('[App] Audio initialization failed:', error);
        showError('Audio initialization failed: ' + error.message);
    }
}

function startMicrophoneLevelMonitoring() {
    setInterval(() => {
        const level = window.audioManager.getMicrophoneLevel();
        updateMicrophoneLevel(level);
    }, 50);
}

function updateMicrophoneLevel(level) {
    // Update UI with microphone level
    const micIcon = document.querySelector('#mute-btn .icon');
    if (micIcon && !currentVoiceState.isMuted) {
        const intensity = Math.min(1, level * 10);
        micIcon.style.opacity = 0.5 + (intensity * 0.5);
    }
}

document.addEventListener('DOMContentLoaded', () => {
    console.log('App loaded');
    
    // Load saved preferences
    loadSavedPreferences();
    
    // Load server history
    populateServerHistory();
});

function loadSavedPreferences() {
    const prefs = window.ConfigStorage.loadUserPreferences();
    const lastConnection = window.ConfigStorage.getLastConnection();
    
    // Apply preferences
    if (sensitivitySlider) {
        sensitivitySlider.value = prefs.sensitivity;
    }
    
    // Auto-fill last connection
    if (playerNameInput && lastConnection.username) {
        playerNameInput.value = lastConnection.username;
    }
    if (serverUrlInput && lastConnection.serverUrl) {
        serverUrlInput.value = lastConnection.serverUrl;
    }
    
    console.log('[App] Preferences loaded:', prefs);
}

function populateServerHistory() {
    const history = window.ConfigStorage.getServerHistory();
    if (history.length > 0) {
        console.log('[App] Server history:', history.length, 'entries');
        // Could add UI dropdown for quick server selection
    }
}

function saveConnectionInfo(serverUrl, username) {
    window.ConfigStorage.saveLastConnection(serverUrl, username);
    window.ConfigStorage.addServerToHistory(serverUrl, username);
}
