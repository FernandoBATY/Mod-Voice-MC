// Reconnection Manager - Auto-reconnect with exponential backoff
class ReconnectionManager {
    constructor(options = {}) {
        this.maxRetries = options.maxRetries || 10;
        this.baseDelay = options.baseDelay || 1000; // 1 second
        this.maxDelay = options.maxDelay || 30000; // 30 seconds
        this.retries = 0;
        this.isReconnecting = false;
        this.reconnectTimeout = null;
        this.onReconnecting = options.onReconnecting || null;
        this.onReconnected = options.onReconnected || null;
        this.onFailed = options.onFailed || null;
    }

    async reconnect(connectFunction) {
        if (this.isReconnecting) {
            console.log('[Reconnection] Already attempting to reconnect...');
            return false;
        }

        if (this.retries >= this.maxRetries) {
            console.error('[Reconnection] Max reconnection attempts reached');
            this.isReconnecting = false;
            if (this.onFailed) {
                this.onFailed(new Error('Max reconnection attempts reached'));
            }
            return false;
        }

        this.isReconnecting = true;
        this.retries++;

        // Calculate delay with exponential backoff
        const delay = Math.min(
            this.baseDelay * Math.pow(2, this.retries - 1),
            this.maxDelay
        );

        console.log(`[Reconnection] Attempt ${this.retries}/${this.maxRetries} in ${delay}ms...`);

        if (this.onReconnecting) {
            this.onReconnecting(this.retries, this.maxRetries, delay);
        }

        // Wait for backoff delay
        await new Promise(resolve => {
            this.reconnectTimeout = setTimeout(resolve, delay);
        });

        try {
            // Attempt to reconnect
            await connectFunction();
            
            // Success!
            console.log('[Reconnection] Successfully reconnected!');
            this.reset();
            
            if (this.onReconnected) {
                this.onReconnected();
            }
            
            return true;
        } catch (error) {
            console.error(`[Reconnection] Attempt ${this.retries} failed:`, error.message);
            this.isReconnecting = false;
            
            // Try again
            return this.reconnect(connectFunction);
        }
    }

    reset() {
        this.retries = 0;
        this.isReconnecting = false;
        if (this.reconnectTimeout) {
            clearTimeout(this.reconnectTimeout);
            this.reconnectTimeout = null;
        }
    }

    cancel() {
        console.log('[Reconnection] Reconnection cancelled');
        this.reset();
    }

    getStatus() {
        return {
            isReconnecting: this.isReconnecting,
            retries: this.retries,
            maxRetries: this.maxRetries
        };
    }
}

// Export for use in main.js
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ReconnectionManager;
}

// Also expose globally for renderer
if (typeof window !== 'undefined') {
    window.ReconnectionManager = ReconnectionManager;
}
