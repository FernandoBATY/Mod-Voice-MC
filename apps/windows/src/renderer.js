// Renderer process - UI logic
let currentVoiceState = {
    isConnected: false,
    isMuted: false,
    isSpeaking: false,
    playerName: '',
    playerCount: 1,
    nearbyPlayers: []
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
    currentVoiceState.isSpeaking = true;
    await window.api.startSpeaking();
    updatePTTButton();
});

pttBtn.addEventListener('mouseup', async () => {
    currentVoiceState.isSpeaking = false;
    await window.api.stopSpeaking();
    updatePTTButton();
});

pttBtn.addEventListener('mouseleave', async () => {
    if (currentVoiceState.isSpeaking) {
        currentVoiceState.isSpeaking = false;
        await window.api.stopSpeaking();
        updatePTTButton();
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
    } else if (event === 'player_leave') {
        currentVoiceState.playerCount--;
        currentVoiceState.nearbyPlayers = currentVoiceState.nearbyPlayers.filter(
            p => p.name !== eventData.name
        );
        updatePlayerCount();
        updatePlayersList();
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
});

window.api.onDisconnected(() => {
    updateConnectionStatus(false);
    showLoginScreen();
});

// ============================================
// INITIALIZATION
// ============================================

document.addEventListener('DOMContentLoaded', () => {
    console.log('App loaded');
});
