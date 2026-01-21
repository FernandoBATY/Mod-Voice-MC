// Authentication and Security Module
const crypto = require('crypto');

class AuthenticationManager {
    constructor() {
        this.tokens = new Map(); // token -> {uuid, playerName, expiresAt}
        this.whitelist = new Set(); // Set of allowed player names
        this.blacklist = new Set(); // Set of banned player names/IPs
        this.rateLimits = new Map(); // IP -> {requests, resetAt}
        this.sessions = new Map(); // sessionId -> {uuid, token, createdAt}
        
        this.config = {
            requireAuth: true,
            useWhitelist: false,
            tokenExpiration: 24 * 60 * 60 * 1000, // 24 hours
            maxRequestsPerMinute: 60,
            secret: process.env.AUTH_SECRET || this.generateSecret()
        };
    }

    generateSecret() {
        return crypto.randomBytes(64).toString('hex');
    }

    generateToken(uuid, playerName) {
        const token = crypto
            .createHmac('sha256', this.config.secret)
            .update(`${uuid}:${playerName}:${Date.now()}`)
            .digest('hex');
        
        const expiresAt = Date.now() + this.config.tokenExpiration;
        
        this.tokens.set(token, {
            uuid,
            playerName,
            expiresAt,
            createdAt: Date.now()
        });
        
        return token;
    }

    validateToken(token) {
        const data = this.tokens.get(token);
        
        if (!data) {
            return { valid: false, reason: 'Invalid token' };
        }
        
        if (Date.now() > data.expiresAt) {
            this.tokens.delete(token);
            return { valid: false, reason: 'Token expired' };
        }
        
        return { valid: true, data };
    }

    revokeToken(token) {
        this.tokens.delete(token);
    }

    // Whitelist management
    addToWhitelist(playerName) {
        this.whitelist.add(playerName.toLowerCase());
    }

    removeFromWhitelist(playerName) {
        this.whitelist.delete(playerName.toLowerCase());
    }

    isWhitelisted(playerName) {
        if (!this.config.useWhitelist) return true;
        return this.whitelist.has(playerName.toLowerCase());
    }

    // Blacklist management
    addToBlacklist(identifier) {
        this.blacklist.add(identifier.toLowerCase());
    }

    removeFromBlacklist(identifier) {
        this.blacklist.delete(identifier.toLowerCase());
    }

    isBlacklisted(identifier) {
        return this.blacklist.has(identifier.toLowerCase());
    }

    // Rate limiting
    checkRateLimit(ip) {
        const now = Date.now();
        const limit = this.rateLimits.get(ip);
        
        if (!limit || now > limit.resetAt) {
            this.rateLimits.set(ip, {
                requests: 1,
                resetAt: now + 60000 // 1 minute
            });
            return { allowed: true, remaining: this.config.maxRequestsPerMinute - 1 };
        }
        
        if (limit.requests >= this.config.maxRequestsPerMinute) {
            return { 
                allowed: false, 
                remaining: 0,
                resetAt: limit.resetAt
            };
        }
        
        limit.requests++;
        return { 
            allowed: true, 
            remaining: this.config.maxRequestsPerMinute - limit.requests
        };
    }

    // Session management
    createSession(uuid, token) {
        const sessionId = crypto.randomBytes(16).toString('hex');
        
        this.sessions.set(sessionId, {
            uuid,
            token,
            createdAt: Date.now(),
            lastActivity: Date.now()
        });
        
        return sessionId;
    }

    getSession(sessionId) {
        return this.sessions.get(sessionId);
    }

    updateSessionActivity(sessionId) {
        const session = this.sessions.get(sessionId);
        if (session) {
            session.lastActivity = Date.now();
        }
    }

    endSession(sessionId) {
        const session = this.sessions.get(sessionId);
        if (session) {
            this.revokeToken(session.token);
            this.sessions.delete(sessionId);
        }
    }

    // Cleanup expired tokens and sessions
    cleanup() {
        const now = Date.now();
        
        // Clean expired tokens
        for (const [token, data] of this.tokens.entries()) {
            if (now > data.expiresAt) {
                this.tokens.delete(token);
            }
        }
        
        // Clean inactive sessions (30 minutes of inactivity)
        for (const [sessionId, session] of this.sessions.entries()) {
            if (now - session.lastActivity > 30 * 60 * 1000) {
                this.endSession(sessionId);
            }
        }
    }

    // Authentication flow
    authenticate(playerName, ip, password = null) {
        // Check blacklist
        if (this.isBlacklisted(playerName) || this.isBlacklisted(ip)) {
            return {
                success: false,
                error: 'You are banned from this server',
                code: 'BLACKLISTED'
            };
        }
        
        // Check whitelist
        if (!this.isWhitelisted(playerName)) {
            return {
                success: false,
                error: 'You are not whitelisted on this server',
                code: 'NOT_WHITELISTED'
            };
        }
        
        // Check rate limit
        const rateLimit = this.checkRateLimit(ip);
        if (!rateLimit.allowed) {
            return {
                success: false,
                error: 'Too many requests. Please try again later.',
                code: 'RATE_LIMITED',
                resetAt: rateLimit.resetAt
            };
        }
        
        // Optional password check
        if (this.config.requirePassword && password) {
            const validPassword = this.validatePassword(playerName, password);
            if (!validPassword) {
                return {
                    success: false,
                    error: 'Invalid password',
                    code: 'INVALID_PASSWORD'
                };
            }
        }
        
        // Generate UUID and token
        const uuid = crypto.createHash('md5').update(playerName).digest('hex');
        const token = this.generateToken(uuid, playerName);
        const sessionId = this.createSession(uuid, token);
        
        return {
            success: true,
            uuid,
            token,
            sessionId,
            expiresAt: Date.now() + this.config.tokenExpiration
        };
    }

    validatePassword(playerName, password) {
        // Simple password validation (in production, use bcrypt)
        const storedHash = this.getPasswordHash(playerName);
        if (!storedHash) return false;
        
        const providedHash = crypto
            .createHash('sha256')
            .update(password + this.config.secret)
            .digest('hex');
        
        return storedHash === providedHash;
    }

    getPasswordHash(playerName) {
        // In production, this would fetch from database
        // For now, return null (no password required)
        return null;
    }

    // Statistics
    getStats() {
        return {
            activeTokens: this.tokens.size,
            activeSessions: this.sessions.size,
            whitelistSize: this.whitelist.size,
            blacklistSize: this.blacklist.size,
            rateLimitEntries: this.rateLimits.size
        };
    }
}

// Start cleanup interval
const authManager = new AuthenticationManager();
setInterval(() => authManager.cleanup(), 5 * 60 * 1000); // Every 5 minutes

module.exports = authManager;
