// API Service for Two Truths and a Lie Game
class ApiService {
    constructor() {
        // Normalize API base to always include /api
        const rawApiBase = (import.meta.env?.VITE_API_URL || 'http://localhost:3001');
        const normalizedApiBase = rawApiBase.replace(/\/$/, '');
        this.baseURL = normalizedApiBase.endsWith('/api') ? normalizedApiBase : `${normalizedApiBase}/api`;

        // WebSocket base (no /api segment)
        this.wsURL = (import.meta.env?.VITE_WS_URL || 'ws://localhost:3001').replace(/\/$/, '');
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

    // HTTP request helper
    async request(endpoint, options = {}) {
        const url = `${this.baseURL}${endpoint}`;
        const config = {
            headers: {
                'Content-Type': 'application/json',
                ...options.headers
            },
            ...options
        };

        if (config.body && typeof config.body === 'object') {
            config.body = JSON.stringify(config.body);
        }

        console.log(`🌐 Making API request to: ${url}`, {
            method: config.method || 'GET',
            body: config.body
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
                throw new Error(data.error || `HTTP error! status: ${response.status}`);
            }

            console.log(`✅ API Success:`, data);
            return data;
        } catch (error) {
            console.error(`❌ API Request Failed (${endpoint}):`, error);
            throw error;
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
            method: 'PUT'
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
