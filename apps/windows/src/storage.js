// Configuration Storage - LocalStorage persistence
class ConfigStorage {
    static KEYS = {
        USER_PREFS: 'proximity_voice_user_prefs',
        SERVER_HISTORY: 'proximity_voice_server_history',
        MUTED_PLAYERS: 'proximity_voice_muted_players',
        LAST_SERVER: 'proximity_voice_last_server',
        LAST_USERNAME: 'proximity_voice_last_username'
    };

    // Generic save/load
    static save(key, value) {
        try {
            localStorage.setItem(key, JSON.stringify(value));
            return true;
        } catch (error) {
            console.error('[Storage] Failed to save:', error);
            return false;
        }
    }

    static load(key, defaultValue = null) {
        try {
            const stored = localStorage.getItem(key);
            return stored ? JSON.parse(stored) : defaultValue;
        } catch (error) {
            console.error('[Storage] Failed to load:', error);
            return defaultValue;
        }
    }

    static remove(key) {
        try {
            localStorage.removeItem(key);
            return true;
        } catch (error) {
            console.error('[Storage] Failed to remove:', error);
            return false;
        }
    }

    // User preferences
    static saveUserPreferences(prefs) {
        return this.save(this.KEYS.USER_PREFS, prefs);
    }

    static loadUserPreferences() {
        return this.load(this.KEYS.USER_PREFS, {
            volume: 1.0,
            micVolume: 1.0,
            sensitivity: 0.5,
            pushToTalkKey: 'V',
            autoConnect: false,
            showNotifications: true,
            theme: 'dark'
        });
    }

    // Server history
    static addServerToHistory(serverUrl, playerName) {
        const history = this.load(this.KEYS.SERVER_HISTORY, []);
        
        // Remove duplicates
        const filtered = history.filter(item => 
            !(item.url === serverUrl && item.playerName === playerName)
        );
        
        // Add to front
        filtered.unshift({
            url: serverUrl,
            playerName: playerName,
            timestamp: Date.now()
        });
        
        // Keep only last 10
        const trimmed = filtered.slice(0, 10);
        
        return this.save(this.KEYS.SERVER_HISTORY, trimmed);
    }

    static getServerHistory() {
        return this.load(this.KEYS.SERVER_HISTORY, []);
    }

    static clearServerHistory() {
        return this.save(this.KEYS.SERVER_HISTORY, []);
    }

    // Muted players
    static addMutedPlayer(playerName) {
        const muted = this.load(this.KEYS.MUTED_PLAYERS, []);
        if (!muted.includes(playerName)) {
            muted.push(playerName);
            this.save(this.KEYS.MUTED_PLAYERS, muted);
        }
        return muted;
    }

    static removeMutedPlayer(playerName) {
        const muted = this.load(this.KEYS.MUTED_PLAYERS, []);
        const filtered = muted.filter(name => name !== playerName);
        this.save(this.KEYS.MUTED_PLAYERS, filtered);
        return filtered;
    }

    static getMutedPlayers() {
        return this.load(this.KEYS.MUTED_PLAYERS, []);
    }

    static isMuted(playerName) {
        const muted = this.getMutedPlayers();
        return muted.includes(playerName);
    }

    // Last connection info
    static saveLastConnection(serverUrl, username) {
        this.save(this.KEYS.LAST_SERVER, serverUrl);
        this.save(this.KEYS.LAST_USERNAME, username);
    }

    static getLastConnection() {
        return {
            serverUrl: this.load(this.KEYS.LAST_SERVER, 'ws://localhost:8080'),
            username: this.load(this.KEYS.LAST_USERNAME, '')
        };
    }

    // Export/Import configuration
    static exportConfig() {
        return {
            userPrefs: this.loadUserPreferences(),
            serverHistory: this.getServerHistory(),
            mutedPlayers: this.getMutedPlayers(),
            lastConnection: this.getLastConnection(),
            exportDate: new Date().toISOString()
        };
    }

    static importConfig(configData) {
        try {
            if (configData.userPrefs) {
                this.saveUserPreferences(configData.userPrefs);
            }
            if (configData.serverHistory) {
                this.save(this.KEYS.SERVER_HISTORY, configData.serverHistory);
            }
            if (configData.mutedPlayers) {
                this.save(this.KEYS.MUTED_PLAYERS, configData.mutedPlayers);
            }
            if (configData.lastConnection) {
                this.saveLastConnection(
                    configData.lastConnection.serverUrl,
                    configData.lastConnection.username
                );
            }
            return true;
        } catch (error) {
            console.error('[Storage] Failed to import config:', error);
            return false;
        }
    }

    // Clear all data
    static clearAll() {
        Object.values(this.KEYS).forEach(key => {
            this.remove(key);
        });
    }
}

// Export
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ConfigStorage;
}

if (typeof window !== 'undefined') {
    window.ConfigStorage = ConfigStorage;
}
