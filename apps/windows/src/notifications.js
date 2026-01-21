// Notification System
class NotificationManager {
    constructor(options = {}) {
        this.enabled = options.enabled !== false;
        this.soundEnabled = options.soundEnabled !== false;
        this.container = null;
        this.sounds = {
            join: new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBTGJ0fPPgjMGHm7A7+OZURE='), // Beep
            leave: new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBTGJ0fPPgjMGHm7A7+OZURE='),
            speaking: new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBTGJ0fPPgjMGHm7A7+OZURE='),
            error: new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBTGJ0fPPgjMGHm7A7+OZURE=')
        };
        this.init();
    }

    init() {
        // Create notification container
        this.container = document.createElement('div');
        this.container.id = 'notifications-container';
        this.container.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            z-index: 9999;
            display: flex;
            flex-direction: column;
            gap: 10px;
            max-width: 350px;
        `;
        document.body.appendChild(this.container);
    }

    show(message, type = 'info', duration = 3000) {
        if (!this.enabled) return;

        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.style.cssText = `
            background: ${this.getBackgroundColor(type)};
            color: white;
            padding: 16px 20px;
            border-radius: 12px;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
            display: flex;
            align-items: center;
            gap: 12px;
            animation: slideIn 0.3s ease-out;
            font-family: 'Space Grotesk', sans-serif;
            font-size: 14px;
        `;

        const icon = document.createElement('span');
        icon.textContent = this.getIcon(type);
        icon.style.cssText = 'font-size: 20px;';

        const text = document.createElement('span');
        text.textContent = message;
        text.style.cssText = 'flex: 1;';

        notification.appendChild(icon);
        notification.appendChild(text);

        this.container.appendChild(notification);

        // Play sound
        if (this.soundEnabled && this.sounds[type]) {
            this.sounds[type].volume = 0.3;
            this.sounds[type].play().catch(() => {});
        }

        // Auto-remove
        setTimeout(() => {
            notification.style.animation = 'slideOut 0.3s ease-in';
            setTimeout(() => {
                if (notification.parentElement) {
                    notification.remove();
                }
            }, 300);
        }, duration);
    }

    getBackgroundColor(type) {
        const colors = {
            info: '#5c6bc0',
            success: '#4ade80',
            warning: '#f59e0b',
            error: '#ef4444',
            join: '#3b82f6',
            leave: '#6b7280',
            speaking: '#8b5cf6'
        };
        return colors[type] || colors.info;
    }

    getIcon(type) {
        const icons = {
            info: 'ℹ️',
            success: '✅',
            warning: '⚠️',
            error: '❌',
            join: '👋',
            leave: '👋',
            speaking: '🎤'
        };
        return icons[type] || icons.info;
    }

    playerJoined(playerName) {
        this.show(`${playerName} se unió al voice chat`, 'join');
    }

    playerLeft(playerName) {
        this.show(`${playerName} salió del voice chat`, 'leave');
    }

    playerSpeaking(playerName) {
        // Don't spam speaking notifications
        this.show(`${playerName} está hablando`, 'speaking', 1500);
    }

    connectionError(error) {
        this.show(`Error de conexión: ${error}`, 'error', 5000);
    }

    reconnecting(attempt, maxAttempts) {
        this.show(`Reconectando... (${attempt}/${maxAttempts})`, 'warning', 2000);
    }

    reconnected() {
        this.show('Reconectado exitosamente', 'success');
    }

    setEnabled(enabled) {
        this.enabled = enabled;
    }

    setSoundEnabled(soundEnabled) {
        this.soundEnabled = soundEnabled;
    }
}

// Add CSS animations
const style = document.createElement('style');
style.textContent = `
    @keyframes slideIn {
        from {
            transform: translateX(400px);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }

    @keyframes slideOut {
        from {
            transform: translateX(0);
            opacity: 1;
        }
        to {
            transform: translateX(400px);
            opacity: 0;
        }
    }
`;
document.head.appendChild(style);

// Export
if (typeof window !== 'undefined') {
    window.NotificationManager = NotificationManager;
    
    // Create global instance
    window.notifications = new NotificationManager({
        enabled: true,
        soundEnabled: true
    });
}
