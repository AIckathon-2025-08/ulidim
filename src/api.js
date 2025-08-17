// API Service for Two Truths and a Lie Game
class ApiService {
    constructor() {
        // In browser, always use relative URLs to go through Vite proxy
        // This works both in dev (proxy) and production (same origin)
        this.baseURL = '/api';

        // WebSocket URL - use the current origin but switch to ws/wss protocol
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const host = window.location.host;
        this.wsURL = `${protocol}//${host}`;
        this.socket = null;
        this.userSession = this.getUserSession();

        console.log('🔧 API Service initialized');
        console.log('📡 API URL:', this.baseURL);
        console.log('🔌 WebSocket URL:', this.wsURL);
    }

    // Generate or retrieve user session ID
    getUserSession() {
        let session = sessionStorage.getItem('userSession');
        if (!session) {
            session = `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
            sessionStorage.setItem('userSession', session);
        }
        return session;
    }

    // Get authentication headers for admin requests
    getAuthHeaders() {
        const adminSession = sessionStorage.getItem('adminSession');
        if (adminSession) {
            return {
                'Authorization': `Bearer ${adminSession}`
            };
        }
        return {};
    }

    // Check if endpoint requires authentication
    needsAuth(endpoint) {
        const protectedEndpoints = [
            '/games',  // POST /games (create game)
            // Note: GET /games/:id, voting, and other endpoints don't require auth
        ];

        // Check if this is a POST to /games (create game)
        return protectedEndpoints.some(protectedPath => {
            if (protectedPath === '/games') {
                // Only protect POST requests to /games
                return endpoint === '/games';
            }
            return endpoint.startsWith(protectedPath);
        });
    }

    // HTTP request helper
    async request(endpoint, options = {}) {
        const url = `${this.baseURL}${endpoint}`;

        // Add authentication headers for protected endpoints
        const authHeaders = this.needsAuth(endpoint) ? this.getAuthHeaders() : {};

        const config = {
            headers: {
                'Content-Type': 'application/json',
                ...authHeaders,
                ...options.headers
            },
            ...options
        };

        if (config.body && typeof config.body === 'object') {
            config.body = JSON.stringify(config.body);
        }

        console.log(`🌐 Making API request to: ${url}`, {
            method: config.method || 'GET',
            body: config.body,
            hasAuth: Object.keys(authHeaders).length > 0
        });

        try {
            const response = await fetch(url, config);

            console.log(`📡 API Response (${response.status}):`, response.statusText);

            let data;
            try {
                data = await response.json();
            } catch (jsonError) {
                console.error('Failed to parse JSON response:', jsonError);
                throw new Error(`Invalid JSON response from server`);
            }

            if (!response.ok) {
                console.error(`❌ API Error:`, data);

                // Don't throw error for "already revealed" case, just log it
                if (response.status === 404 && data.error && data.error.includes('already revealed')) {
                    console.warn('⚠️ Lie already revealed on server, this is expected');
                    return { success: false, alreadyRevealed: true, message: data.error };
                }

                throw new Error(data.error || `HTTP error! status: ${response.status}`);
            }

            console.log(`✅ API Success:`, data);
            return data;
        } catch (error) {
            // Enhance error information for better retry logic
            if (error.name === 'TypeError' && error.message.includes('fetch')) {
                console.error(`❌ Network Error (${endpoint}):`, 'Failed to fetch - server may be unavailable');
                throw new Error(`Network error: Failed to fetch from ${endpoint}. Server may be unavailable.`);
            } else if (error.name === 'AbortError') {
                console.error(`❌ Request Timeout (${endpoint}):`, error);
                throw new Error(`Network error: Request timeout for ${endpoint}`);
            } else {
                console.error(`❌ API Request Failed (${endpoint}):`, error);
                throw error;
            }
        }
    }

    // Game API methods
    async createGame(gameData) {
        return this.request('/games', {
            method: 'POST',
            body: gameData
        });
    }

    async getGame(gameId) {
        return this.request(`/games/${gameId}`);
    }

    async revealLie(gameId) {
        return this.request(`/games/${gameId}/reveal-lie`, {
            method: 'PUT',
            body: {
                creator_session: this.userSession
            }
        });
    }

    async getGameStats(gameId) {
        return this.request(`/games/${gameId}/stats`);
    }

    // Vote API methods
    async submitVote(gameId, votedStatement) {
        return this.request('/votes', {
            method: 'POST',
            body: {
                game_id: gameId,
                voted_statement: votedStatement,
                user_session: this.userSession
            }
        });
    }

    async getVotes(gameId) {
        return this.request(`/votes/game/${gameId}`);
    }

    async checkVoteStatus(gameId) {
        return this.request(`/votes/check/${gameId}/${this.userSession}`);
    }

    // WebSocket methods
    connectWebSocket(gameId, isAdmin = false) {
        return new Promise((resolve, reject) => {
            try {
                // Import socket.io-client dynamically for better compatibility
                if (typeof io === 'undefined') {
                    throw new Error('Socket.IO client not loaded');
                }

                this.socket = io(this.wsURL.replace('ws://', 'http://').replace('wss://', 'https://'));

                this.socket.on('connect', () => {
                    console.log('✅ WebSocket connected');

                    // Join the game room
                    this.socket.emit('joinGame', {
                        gameId,
                        userSession: this.userSession,
                        isAdmin
                    });

                    resolve(this.socket);
                });

                this.socket.on('connect_error', (error) => {
                    console.error('❌ WebSocket connection error:', error);
                    reject(error);
                });

                this.socket.on('error', (error) => {
                    console.error('🔌 WebSocket error:', error);
                });

                this.socket.on('disconnect', (reason) => {
                    console.log('🔌 WebSocket disconnected:', reason);
                });

            } catch (error) {
                console.error('Failed to initialize WebSocket:', error);
                reject(error);
            }
        });
    }

    disconnectWebSocket() {
        if (this.socket) {
            this.socket.disconnect();
            this.socket = null;
            console.log('🔌 WebSocket disconnected');
        }
    }

    // WebSocket event listeners
    onVoteUpdate(callback) {
        if (this.socket) {
            this.socket.on('voteUpdate', callback);
        }
    }

    onLieRevealed(callback) {
        if (this.socket) {
            this.socket.on('lieRevealed', callback);
        }
    }

    onGameUpdate(callback) {
        if (this.socket) {
            this.socket.on('gameUpdate', callback);
        }
    }

    onUserJoined(callback) {
        if (this.socket) {
            this.socket.on('userJoined', callback);
        }
    }

    onUserLeft(callback) {
        if (this.socket) {
            this.socket.on('userLeft', callback);
        }
    }

    onParticipantCountUpdate(callback) {
        if (this.socket) {
            this.socket.on('participantCountUpdate', callback);
        }
    }

    onTimerUpdate(callback) {
        if (this.socket) {
            this.socket.on('timerUpdate', callback);
        }
    }

    // Admin actions via WebSocket
    revealLieViaWebSocket(gameId) {
        if (this.socket) {
            this.socket.emit('revealLie', { gameId });
        }
    }

    sendTimerUpdate(gameId, timeRemaining) {
        if (this.socket) {
            this.socket.emit('timerUpdate', { gameId, timeRemaining });
        }
    }

    requestVoteUpdate(gameId) {
        if (this.socket) {
            this.socket.emit('requestVoteUpdate', { gameId });
        }
    }

    // Health check
    async healthCheck() {
        try {
            return await this.request('/health');
        } catch (error) {
            console.error('Health check failed:', error);
            return { status: 'ERROR', error: error.message };
        }
    }
}

// Create singleton instance
export const apiService = new ApiService();
