// Two Truths and a Lie Game - Main Application
import { apiService } from './api.js';
import { musicService } from './services/music.js';

class TwoTruthsGame {
    constructor() {
        this.gameData = {
            id: null,
            admin: false,
            teammate: {
                name: '',
                picture: null,
                pictureUrl: ''
            },
            statements: ['', '', ''],
            lieIndex: null,
            timer: null,
            backgroundMusic: null,
            votes: [0, 0, 0],
            votedStatement: null,
            hasVoted: false,
            gameStarted: false,
            lieRevealed: false
        };

        this.isRevealingLie = false;

        // Authentication properties
        this.isAuthenticated = false;
        this.adminSession = null;

        this.currentPage = 'login'; // Start with login page
        this.timerInterval = null;
        this.timeRemaining = 0;
        this.phaserGame = null;
        this.backgroundAudio = null;
        this.musicEnabled = true; // legacy flag (proxied to musicService)
        this.socket = null;

        this.init();
    }

    init() {
        this.setupEventListeners();
        this.initializePhaser();
        this.loadDefaultMusic();
        musicService.setEnabled(this.musicEnabled);
        musicService.updateButtons();
        this.updateMusicButtonText();

        // Check authentication before proceeding
        this.checkAuthentication();
    }

    setupEventListeners() {
        // Login form submission
        document.getElementById('login-form').addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleLogin();
        });

        // Logout button
        document.getElementById('logout-btn').addEventListener('click', () => {
            this.handleLogout();
        });

        // Admin form submission
        document.getElementById('admin-form').addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleGameStart();
        });

        // File uploads
        document.getElementById('teammate-picture').addEventListener('change', (e) => {
            this.handlePictureUpload(e);
        });

        document.getElementById('background-music').addEventListener('change', (e) => {
            this.handleMusicUpload(e);
        });

        // Copy link button
        document.getElementById('copy-link').addEventListener('click', () => {
            this.copyGameLink();
        });

        // Show lie button
        document.getElementById('show-lie-btn').addEventListener('click', () => {
            this.revealLie();
        });

        // Statement selection
        document.querySelectorAll('.statement-option').forEach(button => {
            button.addEventListener('click', (e) => {
                this.selectStatement(e.target.closest('.statement-option'));
            });
        });

        // Submit vote button
        document.getElementById('submit-vote').addEventListener('click', () => {
            this.submitVote();
        });

        // Timer interruption modal buttons
        document.getElementById('timer-continue-btn').addEventListener('click', () => {
            this.hideTimerInterruptionModal();
        });

        document.getElementById('timer-interrupt-btn').addEventListener('click', () => {
            this.forceRevealLie();
        });

        // Music toggle buttons (will be added to voting and results pages)
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('music-toggle-btn')) {
                this.toggleMusic();
            }
        });
    }

    initializePhaser() {
        // Initialize Phaser for animations
        const config = {
            type: Phaser.AUTO,
            width: window.innerWidth,
            height: window.innerHeight,
            parent: 'phaser-container',
            transparent: true,
            physics: {
                default: 'arcade',
                arcade: {
                    gravity: { y: 300 },
                    debug: false
                }
            },
            scene: {
                preload: () => this.preloadAssets(),
                create: () => this.createAnimations()
            }
        };

        this.phaserGame = new Phaser.Game(config);
    }

    preloadAssets() {
        const scene = this.phaserGame.scene.scenes[0];

        // Load SVG assets for better quality particles
        scene.load.image('star', 'assets/images/star.svg');
        scene.load.image('confetti', 'assets/images/confetti.svg');

        // Create simple colored rectangles as fallback for thumbs down
        scene.add.graphics()
            .fillStyle(0xFF6B6B)
            .fillRect(0, 0, 12, 16)
            .generateTexture('thumbsdown', 12, 16);

        // Start loading assets
        scene.load.start();
    }

    createAnimations() {
        // Store scene reference for later use
        this.phaserScene = this.phaserGame.scene.scenes[0];
    }

    loadDefaultMusic() {
        this.backgroundAudio = document.getElementById('background-audio');
        musicService.init(this.backgroundAudio);
    }

    async checkURLForGameId() {
        const urlParams = new URLSearchParams(window.location.search);
        const gameId = urlParams.get('game');

        if (gameId) {
            // This is a voting page
            this.gameData.id = gameId;
            this.gameData.admin = false;

            // Try to load game data with retry logic for server availability
            const success = await this.loadGameDataWithRetry(gameId, 3, 1000);
            if (success) {
                this.showPage('voting');
            } else {
                alert('Game not found or has expired. Please check the link or try again later.');
                // Redirect to home page
                window.location.href = window.location.pathname;
            }
        } else {
            // This is the admin page
            this.gameData.admin = true;
            this.showPage('admin');
        }
    }

    // =============================================================================
    // AUTHENTICATION METHODS
    // =============================================================================

    checkAuthentication() {
        console.log('🔐 Checking authentication...');

        const urlParams = new URLSearchParams(window.location.search);
        const gameId = urlParams.get('game');

        if (gameId) {
            // This is a voting page - no authentication needed
            this.gameData.id = gameId;
            this.gameData.admin = false;
            this.checkURLForGameId();
            return;
        }

        // Admin page access - check session
        const session = sessionStorage.getItem('adminSession');
        if (session) {
            this.validateSession(session);
        } else {
            console.log('🔐 No session found, showing login page');
            this.showPage('login');
        }
    }

    async validateSession(session) {
        try {
            console.log('🔐 Validating session...');

            const response = await fetch('/api/auth/validate', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${session}`
                },
                body: JSON.stringify({ session })
            });

            const data = await response.json();

            if (data.valid) {
                console.log('✅ Session valid, granting admin access');
                this.isAuthenticated = true;
                this.adminSession = session;
                this.gameData.admin = true;
                this.showPage('admin');
            } else {
                console.log('❌ Session invalid, showing login page');
                sessionStorage.removeItem('adminSession');
                this.showPage('login');
            }

        } catch (error) {
            console.error('❌ Session validation error:', error);
            sessionStorage.removeItem('adminSession');
            this.showPage('login');
        }
    }

    async handleLogin() {
        const username = document.getElementById('username').value.trim();
        const password = document.getElementById('password').value.trim();
        const loginBtn = document.getElementById('login-btn');
        const errorDiv = document.getElementById('login-error');

        if (!username || !password) {
            this.showLoginError('Please enter both username and password');
            return;
        }

        // Show loading state
        loginBtn.disabled = true;
        loginBtn.textContent = 'Logging in...';
        errorDiv.style.display = 'none';

        try {
            console.log('🔐 Attempting login...');

            const response = await fetch('/api/auth/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ username, password })
            });

            const data = await response.json();

            if (response.ok && data.success) {
                console.log('✅ Login successful');

                // Store session
                sessionStorage.setItem('adminSession', data.session);
                this.isAuthenticated = true;
                this.adminSession = data.session;
                this.gameData.admin = true;

                // Clear form
                document.getElementById('login-form').reset();

                // Show admin page
                this.showPage('admin');

            } else {
                throw new Error(data.error || 'Login failed');
            }

        } catch (error) {
            console.error('❌ Login error:', error);
            this.showLoginError(error.message || 'Login failed. Please try again.');
        } finally {
            // Reset button state
            loginBtn.disabled = false;
            loginBtn.textContent = 'Login';
        }
    }

    async handleLogout() {
        try {
            console.log('🔐 Logging out...');

            if (this.adminSession) {
                await fetch('/api/auth/logout', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${this.adminSession}`
                    },
                    body: JSON.stringify({ session: this.adminSession })
                });
            }

        } catch (error) {
            console.error('❌ Logout error:', error);
        } finally {
            // Clear local state regardless of server response
            sessionStorage.removeItem('adminSession');
            this.isAuthenticated = false;
            this.adminSession = null;
            this.gameData.admin = false;

            console.log('✅ Logout complete');
            this.showPage('login');
        }
    }

    showLoginError(message) {
        const errorDiv = document.getElementById('login-error');
        errorDiv.textContent = message;
        errorDiv.style.display = 'block';

        // Auto-hide after 5 seconds
        setTimeout(() => {
            errorDiv.style.display = 'none';
        }, 5000);
    }

    handlePictureUpload(event) {
        const file = event.target.files[0];
        if (file && file.type.startsWith('image/')) {
            const reader = new FileReader();
            reader.onload = (e) => {
                this.gameData.teammate.pictureUrl = e.target.result;
                this.displayPicturePreview(e.target.result);
            };
            reader.readAsDataURL(file);
        }
    }

    displayPicturePreview(imageUrl) {
        const preview = document.getElementById('picture-preview');
        preview.innerHTML = `<img src="${imageUrl}" alt="Preview" style="max-width: 200px; border-radius: 12px;">`;
    }

    handleMusicUpload(event) {
        console.log('🎵 Processing music upload...');
        const file = event.target.files[0];

        if (!file) {
            console.log('📝 No file selected, clearing background music');
            this.gameData.backgroundMusic = null;
            return;
        }

        console.log('📁 File selected:', {
            name: file.name,
            size: file.size,
            type: file.type,
            sizeInMB: (file.size / 1024 / 1024).toFixed(2)
        });

        // Validate file type
        if (!file.type.startsWith('audio/')) {
            console.error('❌ Invalid file type:', file.type);
            alert('Please select an audio file (MP3, WAV, etc.)');
            event.target.value = ''; // Clear the input
            this.gameData.backgroundMusic = null;
            return;
        }

        // Validate file size (max 10MB)
        const maxSizeInMB = 10;
        if (file.size > maxSizeInMB * 1024 * 1024) {
            console.error('❌ File too large:', (file.size / 1024 / 1024).toFixed(2), 'MB');
            alert(`File too large. Please select an audio file smaller than ${maxSizeInMB}MB.`);
            event.target.value = ''; // Clear the input
            this.gameData.backgroundMusic = null;
            return;
        }

        try {
            const reader = new FileReader();

            reader.onload = (e) => {
                console.log('✅ Music file loaded successfully');
                this.gameData.backgroundMusic = e.target.result;
            };

            reader.onerror = (error) => {
                console.error('❌ Error reading music file:', error);
                alert('Error reading music file. Please try again or select a different file.');
                event.target.value = ''; // Clear the input
                this.gameData.backgroundMusic = null;
            };

            reader.onabort = () => {
                console.warn('⚠️ Music file reading aborted');
                this.gameData.backgroundMusic = null;
            };

            console.log('🔄 Starting file read...');
            reader.readAsDataURL(file);

        } catch (error) {
            console.error('❌ Unexpected error in music upload:', error);
            alert('Unexpected error processing music file. Please try again.');
            event.target.value = ''; // Clear the input
            this.gameData.backgroundMusic = null;
        }
    }

    async handleGameStart() {
        console.log('🎮 Starting game creation...');

        try {
            // Collect form data
            const teammateNameElement = document.getElementById('teammate-name');
            const statement1Element = document.getElementById('statement-1');
            const statement2Element = document.getElementById('statement-2');
            const statement3Element = document.getElementById('statement-3');
            const lieStatementElement = document.getElementById('lie-statement');
            const votingTimerElement = document.getElementById('voting-timer');

            console.log('📝 Form elements found:', {
                teammateNameElement: !!teammateNameElement,
                statement1Element: !!statement1Element,
                statement2Element: !!statement2Element,
                statement3Element: !!statement3Element,
                lieStatementElement: !!lieStatementElement,
                votingTimerElement: !!votingTimerElement
            });

            // Validate timer input
            let timerDuration = null;
            if (votingTimerElement?.value) {
                const timerValue = parseInt(votingTimerElement.value);
                if (isNaN(timerValue) || timerValue < 10 || timerValue > 600) {
                    console.error('❌ Invalid timer duration:', votingTimerElement.value);
                    alert('Timer must be between 10 and 600 seconds (10 minutes max)');
                    votingTimerElement.focus();
                    return;
                }
                timerDuration = timerValue;
                console.log('⏱️ Timer validated:', timerDuration, 'seconds');
            }

            // Validate lie index
            let lieIndex = -1;
            if (lieStatementElement?.value) {
                const lieValue = parseInt(lieStatementElement.value);
                if (isNaN(lieValue) || lieValue < 1 || lieValue > 3) {
                    console.error('❌ Invalid lie index:', lieStatementElement.value);
                    alert('Please select which statement is the lie (1, 2, or 3)');
                    lieStatementElement.focus();
                    return;
                }
                lieIndex = lieValue - 1; // Convert to 0-based index
                console.log('🎯 Lie index validated:', lieIndex);
            }

            const gameData = {
                teammate_name: teammateNameElement?.value?.trim() || '',
                teammate_picture: this.gameData.teammate.pictureUrl || '',
                statement_1: statement1Element?.value?.trim() || '',
                statement_2: statement2Element?.value?.trim() || '',
                statement_3: statement3Element?.value?.trim() || '',
                lie_index: lieIndex,
                timer_duration: timerDuration,
                background_music: this.gameData.backgroundMusic || null
            };

            console.log('📊 Collected game data:', {
                ...gameData,
                background_music: gameData.background_music ? 'present' : 'none'
            });

            // Enhanced validation with specific error messages
            const validationErrors = [];

            if (!gameData.teammate_name) validationErrors.push('Teammate name is required');
            if (!gameData.teammate_picture) validationErrors.push('Profile picture is required');
            if (!gameData.statement_1) validationErrors.push('Statement 1 is required');
            if (!gameData.statement_2) validationErrors.push('Statement 2 is required');
            if (!gameData.statement_3) validationErrors.push('Statement 3 is required');
            if (gameData.lie_index < 0) validationErrors.push('Please select which statement is the lie');

            if (validationErrors.length > 0) {
                console.error('❌ Validation failed:', validationErrors);
                alert('Please fix the following issues:\n• ' + validationErrors.join('\n• '));
                return;
            }

            console.log('✅ Validation passed, making API call...');

            // Show loading state
            this.setLoadingState(true);

            // Add creator session to game data
            gameData.creator_session = apiService.userSession;

            // Create game via API
            console.log('🌐 Calling apiService.createGame...');
            const response = await apiService.createGame(gameData);
            console.log('✅ API response received:', response);

            // Update local game data
            this.gameData.id = response.game.id;
            this.gameData.admin = true;
            this.gameData.teammate.name = response.game.teammate_name;
            this.gameData.teammate.pictureUrl = response.game.teammate_picture;
            this.gameData.statements = response.game.statements;
            this.gameData.lieIndex = gameData.lie_index;
            this.gameData.timer = response.game.timer_duration;
            this.gameData.gameStarted = true;

            console.log('🎯 Game data updated:', this.gameData);

            // Connect to WebSocket as admin
            console.log('🔌 Connecting to WebSocket...');
            this.socket = await apiService.connectWebSocket(this.gameData.id, true);
            this.setupWebSocketListeners();

            // Load initial data via WebSocket connection
            await this.requestInitialData();

            // Show game controls
            document.getElementById('admin-form').style.display = 'none';
            document.getElementById('game-controls').style.display = 'block';

            // Initialize vote count display
            this.updateTotalVotesDisplay();

            // Generate and display game link
            const gameLink = `${window.location.origin}${window.location.pathname}?game=${this.gameData.id}`;
            document.getElementById('game-link').value = gameLink;

            console.log('🔗 Game link generated:', gameLink);

            // Start timer if set
            if (this.gameData.timer) {
                console.log('⏱️ Starting timer for', this.gameData.timer, 'seconds');
                this.startTimer();
            }

            // Copy link to clipboard automatically
            this.copyGameLink();

            this.setLoadingState(false);
            console.log('🎉 Game creation completed successfully!');

        } catch (error) {
            console.error('❌ Error starting game:', {
                message: error.message,
                stack: error.stack
            });

            let userMessage = 'Failed to start game: ';
            if (error.message.includes('Network')) {
                userMessage += 'Network error. Please check your connection and try again.';
            } else if (error.message.includes('validation')) {
                userMessage += 'Please check your form inputs and try again.';
            } else {
                userMessage += error.message || 'Unknown error occurred. Please try again.';
            }

            alert(userMessage);
            this.setLoadingState(false);
        }
    }

    async loadGameData(gameId) {
        try {
            const response = await apiService.getGame(gameId);
            if (response.success) {
                const game = response.game;

                // Update local game data
                this.gameData.id = game.id;
                this.gameData.teammate.name = game.teammate_name;
                this.gameData.teammate.pictureUrl = game.teammate_picture;
                this.gameData.statements = game.statements;
                this.gameData.timer = game.timer_duration;
                this.gameData.timerStartTime = game.timer_start_time;
                this.gameData.backgroundMusic = game.background_music;
                this.gameData.lieRevealed = game.lie_revealed;
                this.gameData.lieIndex = game.lie_index;
                this.gameData.votes = game.votes;
                this.gameData.gameStarted = game.game_started;

                // Check if user has voted
                const voteStatus = await apiService.checkVoteStatus(gameId);
                if (voteStatus.success && voteStatus.hasVoted) {
                    this.gameData.hasVoted = true;
                    this.gameData.votedStatement = voteStatus.votedStatement;
                    console.log('✅ User has already voted - will connect to real-time updates');
                }

                // Connect to WebSocket as participant with enhanced error handling
                console.log('🔌 Establishing WebSocket connection for real-time updates...');
                this.socket = await apiService.connectWebSocket(gameId, false);
                this.setupWebSocketListeners();

                // Load initial data via WebSocket connection
                await this.requestInitialData();

                this.populateVotingPage();

                // Ensure we're connected to the game room for real-time updates
                console.log('✅ WebSocket connection established for real-time vote updates');
                return true;
            }
            return false;
        } catch (error) {
            console.error('Error loading game data:', error);
            return false;
        }
    }

    async loadGameDataWithRetry(gameId, maxRetries = 3, delayMs = 1000) {
        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            console.log(`🔄 Loading game data (attempt ${attempt}/${maxRetries})...`);

            try {
                const success = await this.loadGameData(gameId);
                if (success) {
                    console.log('✅ Game data loaded successfully');
                    return true;
                }

                // If the request succeeded but didn't find the game, don't retry
                console.log('❌ Game not found, not retrying');
                return false;

            } catch (error) {
                console.error(`❌ Attempt ${attempt} failed:`, error.message);

                // If this was the last attempt, fail
                if (attempt === maxRetries) {
                    console.error('❌ All retry attempts failed');
                    return false;
                }

                // Wait before retrying (only if it's a network/server error)
                if (error.message.includes('fetch') || error.message.includes('Network') || error.message.includes('Failed to fetch')) {
                    console.log(`⏳ Waiting ${delayMs}ms before retry...`);
                    await new Promise(resolve => setTimeout(resolve, delayMs));
                    delayMs *= 1.5; // Exponential backoff
                } else {
                    // For non-network errors, don't retry
                    console.log('❌ Non-network error, not retrying');
                    return false;
                }
            }
        }
        return false;
    }

    populateVotingPage() {
        // Set participant info
        document.getElementById('participant-img').src = this.gameData.teammate.pictureUrl;
        document.getElementById('participant-name').textContent = this.gameData.teammate.name;

        // Set statements
        document.getElementById('vote-statement-1').textContent = this.gameData.statements[0];
        document.getElementById('vote-statement-2').textContent = this.gameData.statements[1];
        document.getElementById('vote-statement-3').textContent = this.gameData.statements[2];

        // Check if timer is active
        if (this.gameData.timer && this.gameData.gameStarted) {
            this.checkTimerStatus();
        }
    }

    populateResultsPage() {
        // Set participant info (for results page display)
        const resultsTitleElement = document.querySelector('#results-page h2');
        if (resultsTitleElement && this.gameData.teammate.name) {
            resultsTitleElement.textContent = `Results for ${this.gameData.teammate.name}`;
        }

        // Set statement labels in results
        for (let i = 0; i < 3; i++) {
            const label = document.querySelector(`#result-${i + 1} .result-label`);
            if (label && this.gameData.statements[i]) {
                label.textContent = `Statement ${i + 1}: ${this.gameData.statements[i].substring(0, 30)}...`;
            }
        }
    }

    startBackgroundMusic() {
        if (!this.musicEnabled) return;

        const customSrc = this.gameData.backgroundMusic || undefined;
        musicService.maybeStartForPage(this.currentPage, customSrc);
    }

    stopBackgroundMusic() {
        musicService.stop();
    }

    toggleMusic() {
        this.musicEnabled = !this.musicEnabled;
        musicService.setEnabled(this.musicEnabled);

        // Honor page gating
        if (this.musicEnabled) {
            const customSrc = this.gameData.backgroundMusic || undefined;
            musicService.maybeStartForPage(this.currentPage, customSrc);
        } else {
            musicService.stop();
        }

        // Update button text
        this.updateMusicButtonText();
    }

    updateMusicButtonText() {
        const musicButtons = document.querySelectorAll('.music-toggle-btn');
        musicButtons.forEach(btn => {
            btn.textContent = this.musicEnabled ? '🔊 Music On' : '🔇 Music Off';
        });
    }

    async requestInitialData() {
        // Only used for initial data load when WebSocket connects
        if (!this.gameData.id) return;

        try {
            console.log('📡 Loading initial game data...');
            const response = await apiService.getGameStats(this.gameData.id);
            if (response.success) {
                this.gameData.votes = response.votes;
                this.updateTotalVotesDisplay();

                if (this.currentPage === 'results') {
                    this.updateResults();
                }
                console.log('✅ Initial data loaded successfully');
            }
        } catch (error) {
            console.error('❌ Failed to load initial data:', error.message);
        }
    }

    setupWebSocketListeners() {
        if (!this.socket) return;

        // Listen for connection events
        this.socket.on('connect', () => {
            console.log('🔌 WebSocket connected successfully');
            this.onWebSocketDataReceived();

            // Ensure we're always in the correct game room
            if (this.gameData.id) {
                console.log('🏠 Ensuring user is in game room for real-time updates');
            }
        });

        this.socket.on('disconnect', (reason) => {
            console.warn('🔌 WebSocket disconnected:', reason);
            // Auto-reconnect after 3 seconds if not a manual disconnect
            if (reason !== 'io client disconnect') {
                setTimeout(() => {
                    console.log('🔄 Attempting WebSocket reconnection...');
                    this.reconnectWebSocket();
                }, 3000);
            }
        });

        this.socket.on('connect_error', (error) => {
            console.error('🔌 WebSocket connection error:', error);
        });

        // Listen for vote updates - CRITICAL for real-time stats
        apiService.onVoteUpdate((data) => {
            if (data.gameId === this.gameData.id) {
                console.log('🔌 Real-time vote update received:', data.votes, 'Total:', data.totalVotes);
                this.gameData.votes = data.votes;
                this.updateTotalVotesDisplay();

                // Update results page immediately if user is viewing it
                if (this.currentPage === 'results') {
                    console.log('📊 Updating results page with new vote counts');
                    this.updateResults();
                }

                this.onWebSocketDataReceived();
            }
        });

        // Listen for lie reveals
        apiService.onLieRevealed((data) => {
            if (data.gameId === this.gameData.id) {
                console.log('🔌 WebSocket: Lie revealed event received', data);
                this.gameData.lieRevealed = true;
                this.gameData.lieIndex = data.lieIndex;

                // Only show UI for non-admin users (admin already handles it manually)
                if (!this.gameData.admin && this.currentPage === 'results') {
                    console.log('🎭 Showing lie reveal for non-admin user');
                    this.showLieRevealForUsers();
                } else {
                    console.log('⚠️ Admin user - UI already updated via manual trigger');
                }
            }
        });

        // Listen for game updates - backup for vote updates
        apiService.onGameUpdate((data) => {
            if (data.gameId === this.gameData.id) {
                console.log('🔌 Game state update received with votes:', data.votes);
                // Update game state
                this.gameData.votes = data.votes;
                this.gameData.lieRevealed = data.lie_revealed;
                this.gameData.lieIndex = data.lie_index;

                this.updateTotalVotesDisplay();
                if (this.currentPage === 'results') {
                    console.log('📊 Updating results page from game update');
                    this.updateResults();
                }
            }
        });

        // Listen for timer updates
        apiService.onTimerUpdate((data) => {
            if (!this.gameData.admin) {
                this.timeRemaining = data.timeRemaining;
                this.updateTimerDisplay();
            }
        });

        console.log('✅ WebSocket listeners setup complete for real-time updates');
    }

    updateTotalVotesDisplay() {
        const voteCountElement = document.getElementById('vote-count');
        if (voteCountElement && this.gameData.votes) {
            const totalVotes = this.gameData.votes.reduce((a, b) => a + b, 0);
            voteCountElement.textContent = totalVotes;
            console.log(`📊 Total votes updated: ${totalVotes}`);
        }
    }

    onWebSocketDataReceived() {
        // Track last WebSocket data reception time for connection health
        this.lastWebSocketDataTime = Date.now();
        console.log('🔌 WebSocket data received - connection healthy');
    }

    async reconnectWebSocket() {
        if (!this.gameData.id) return;

        try {
            console.log('🔄 Reconnecting WebSocket...');

            // Disconnect old socket if exists
            if (this.socket) {
                this.socket.disconnect();
            }

            // Create new connection
            this.socket = await apiService.connectWebSocket(this.gameData.id, this.gameData.admin);
            this.setupWebSocketListeners();

            // Reload current data
            await this.requestInitialData();

            console.log('✅ WebSocket reconnected successfully');

        } catch (error) {
            console.error('❌ WebSocket reconnection failed:', error);
            // Try again after 10 seconds
            setTimeout(() => {
                this.reconnectWebSocket();
            }, 10000);
        }
    }

    setLoadingState(loading) {
        const elements = document.querySelectorAll('button, input, select, textarea');
        elements.forEach(el => {
            el.disabled = loading;
        });

        if (loading) {
            document.body.style.cursor = 'wait';
        } else {
            document.body.style.cursor = 'default';
        }
    }

    startTimer() {
        this.timeRemaining = this.gameData.timer;
        this.gameData.timerStartTime = Date.now();

        this.updateTimerDisplay();
        this.timerInterval = setInterval(() => {
            this.timeRemaining--;
            this.updateTimerDisplay();

            if (this.timeRemaining <= 0) {
                this.timeExpired();
            }
        }, 1000);
    }

    checkTimerStatus() {
        if (this.gameData.timerStartTime) {
            const elapsed = Math.floor((Date.now() - this.gameData.timerStartTime) / 1000);
            this.timeRemaining = Math.max(0, this.gameData.timer - elapsed);

            if (this.timeRemaining > 0) {
                document.getElementById('timer-display').style.display = 'block';
                this.updateTimerDisplay();
                this.timerInterval = setInterval(() => {
                    this.timeRemaining--;
                    this.updateTimerDisplay();

                    if (this.timeRemaining <= 0) {
                        this.timeExpired();
                    }
                }, 1000);
            } else {
                this.timeExpired();
            }
        }
    }

    updateTimerDisplay() {
        const minutes = Math.floor(this.timeRemaining / 60);
        const seconds = this.timeRemaining % 60;
        const display = `${minutes}:${seconds.toString().padStart(2, '0')}`;

        const timerElement = document.getElementById('timer-display');
        timerElement.textContent = display;
        timerElement.style.display = 'block';

        // Change color when time is running out
        if (this.timeRemaining <= 10) {
            timerElement.style.color = '#ff6b6b';
            timerElement.style.animation = 'pulse 1s infinite';
        }
    }

    timeExpired() {
        clearInterval(this.timerInterval);

        // Disable voting if on voting page
        if (this.currentPage === 'voting' && !this.gameData.hasVoted) {
            this.disableVoting();
        }

        // Auto-redirect to results
        this.showPage('results');
        this.updateResults();

        // Note: Lie reveal is now manual only via the "Show Lie" button
        // This prevents duplicate API calls and gives admin control over timing
    }

    selectStatement(button) {
        // Remove previous selection
        document.querySelectorAll('.statement-option').forEach(btn => {
            btn.classList.remove('selected');
        });

        // Add selection to clicked button
        button.classList.add('selected');

        // Enable submit button
        const submitBtn = document.getElementById('submit-vote');
        submitBtn.disabled = false;

        // Store selected statement
        this.gameData.votedStatement = parseInt(button.dataset.statement) - 1;
    }

    async submitVote() {
        if (this.gameData.votedStatement === null || this.gameData.hasVoted) {
            return;
        }

        try {
            this.setLoadingState(true);

            // Submit vote via API
            const response = await apiService.submitVote(this.gameData.id, this.gameData.votedStatement);

            if (response.success) {
                // Update local state
                this.gameData.hasVoted = true;
                this.gameData.votes = response.currentVotes;

                // Show results page and ensure WebSocket connection
                this.showPage('results');
                this.updateResults();

                console.log('📊 Vote submitted successfully - staying connected for real-time updates');
            }

            this.setLoadingState(false);

        } catch (error) {
            console.error('Error submitting vote:', error);
            if (error.message.includes('already voted')) {
                alert('You have already voted for this game.');
                this.gameData.hasVoted = true;
                this.showPage('results');
            } else {
                alert('Failed to submit vote. Please try again.');
            }
            this.setLoadingState(false);
        }
    }

    disableVoting() {
        document.querySelectorAll('.statement-option').forEach(btn => {
            btn.disabled = true;
            btn.style.opacity = '0.6';
        });

        document.getElementById('submit-vote').disabled = true;
    }

    copyGameLink() {
        const linkInput = document.getElementById('game-link');
        linkInput.select();
        linkInput.setSelectionRange(0, 99999); // For mobile devices

        navigator.clipboard.writeText(linkInput.value).then(() => {
            const button = document.getElementById('copy-link');
            const originalText = button.textContent;
            button.textContent = 'Copied!';
            button.style.background = '#51cf66';

            setTimeout(() => {
                button.textContent = originalText;
                button.style.background = '';
            }, 2000);
        });
    }

    async revealLie() {
        if (!this.gameData.admin) {
            console.warn('🚫 revealLie called but user is not admin');
            return;
        }

        console.log('🎯 Starting lie reveal process...', {
            gameId: this.gameData.id,
            hasSocket: !!this.socket,
            socketConnected: this.socket?.connected,
            lieAlreadyRevealed: this.gameData.lieRevealed,
            lieIndex: this.gameData.lieIndex,
            timerRunning: !!this.timerInterval,
            timeRemaining: this.timeRemaining
        });

        // Check if lie is already revealed locally
        if (this.gameData.lieRevealed) {
            console.warn('⚠️ Lie already revealed locally, skipping API call');
            this.showLieRevealUI();
            return;
        }

        // Also check if the button is disabled (UI state check)
        const showLieBtn = document.getElementById('show-lie-btn');
        if (showLieBtn && (showLieBtn.disabled || showLieBtn.textContent === 'Lie Revealed')) {
            console.warn('⚠️ Show lie button is disabled or already shows "Lie Revealed", skipping API call');
            this.gameData.lieRevealed = true;
            this.showLieRevealUI();
            return;
        }

        // Check if timer is running and show confirmation modal
        if (this.timerInterval && this.timeRemaining > 0) {
            console.log('⏰ Timer is running, showing interruption confirmation');
            this.showTimerInterruptionModal();
            return;
        }

        // Add flag to prevent multiple simultaneous calls
        if (this.isRevealingLie) {
            console.warn('⚠️ Lie reveal already in progress, skipping duplicate call');
            return;
        }

        this.isRevealingLie = true;

        try {
            // Check WebSocket connection state before proceeding
            if (!this.socket) {
                console.error('❌ No WebSocket connection available');
                throw new Error('WebSocket connection not available. Please refresh the page.');
            }

            if (!this.socket.connected) {
                console.error('❌ WebSocket not connected');
                throw new Error('WebSocket disconnected. Please refresh the page.');
            }

            console.log('📡 Making single API call to reveal lie...');
            // Make API call - server will handle WebSocket broadcast
            const response = await apiService.revealLie(this.gameData.id);
            console.log('✅ API response received:', response);

            // Note: WebSocket event will be sent by server to all users
            // Admin UI is updated here, other users get WebSocket event

            // Handle "already revealed" case gracefully
            if (response && response.alreadyRevealed) {
                console.log('ℹ️ Lie was already revealed on server, updating local state');
                this.gameData.lieRevealed = true;
                this.showLieRevealUI();
                return;
            }

            // Update local state
            this.gameData.lieRevealed = true;

            console.log('🎨 Updating UI...');
            // Update UI
            this.showLieRevealUI();

            console.log('🎉 Lie reveal completed successfully!');

        } catch (error) {
            console.error('❌ Error revealing lie:', {
                message: error.message,
                stack: error.stack,
                gameId: this.gameData.id,
                socketState: this.socket ? {
                    connected: this.socket.connected,
                    id: this.socket.id
                } : 'no socket'
            });

            // Check if the error is because lie was already revealed
            if (error.message && (error.message.includes('already revealed') || error.message.includes('Game not found or lie already revealed'))) {
                console.log('ℹ️ Lie was already revealed on server, updating local state');
                this.gameData.lieRevealed = true;
                this.showLieRevealUI();
                return;
            }

            // More specific error messages
            let userMessage = 'Failed to reveal lie. ';
            if (error.message.includes('WebSocket')) {
                userMessage += 'Connection issue detected. Please refresh the page and try again.';
            } else if (error.message.includes('Network')) {
                userMessage += 'Network error. Please check your connection and try again.';
            } else {
                userMessage += 'Please try again or refresh the page.';
            }

            alert(userMessage);
        } finally {
            // Reset flag to allow future calls
            this.isRevealingLie = false;
        }
    }

    // =============================================================================
    // TIMER INTERRUPTION MODAL METHODS
    // =============================================================================

    showTimerInterruptionModal() {
        const modal = document.getElementById('timer-interruption-modal');
        const timerDisplay = document.getElementById('modal-timer-remaining');

        // Update modal timer display
        const minutes = Math.floor(this.timeRemaining / 60);
        const seconds = this.timeRemaining % 60;
        timerDisplay.textContent = `${minutes}:${seconds.toString().padStart(2, '0')}`;

        // Show modal
        modal.style.display = 'flex';

        // Focus management for accessibility
        document.getElementById('timer-continue-btn').focus();

        console.log('⏰ Timer interruption modal displayed');
    }

    hideTimerInterruptionModal() {
        const modal = document.getElementById('timer-interruption-modal');
        modal.style.display = 'none';

        console.log('⏰ Timer interruption modal hidden - continuing timer');
    }

    forceRevealLie() {
        console.log('⏰ Timer interruption confirmed - force revealing lie');

        // Hide modal first
        this.hideTimerInterruptionModal();

        // Stop timer
        if (this.timerInterval) {
            clearInterval(this.timerInterval);
            this.timerInterval = null;
            console.log('⏰ Timer stopped due to manual interruption');
        }

        // Continue with reveal logic (bypass timer check)
        this.executeRevealLie();
    }

    async executeRevealLie() {
        // This is the actual reveal logic extracted from revealLie() method
        // to be called after timer interruption confirmation

        // Add flag to prevent multiple simultaneous calls
        if (this.isRevealingLie) {
            console.warn('⚠️ Lie reveal already in progress, skipping duplicate call');
            return;
        }

        this.isRevealingLie = true;

        try {
            // Check WebSocket connection state before proceeding
            if (!this.socket) {
                console.error('❌ No WebSocket connection available');
                throw new Error('WebSocket connection not available. Please refresh the page.');
            }

            if (!this.socket.connected) {
                console.error('❌ WebSocket not connected');
                throw new Error('WebSocket disconnected. Please refresh the page.');
            }

            console.log('📡 Making single API call to reveal lie...');
            // Make API call - server will handle WebSocket broadcast
            const response = await apiService.revealLie(this.gameData.id);
            console.log('✅ API response received:', response);

            // Handle "already revealed" case gracefully
            if (response && response.alreadyRevealed) {
                console.log('ℹ️ Lie was already revealed on server, updating local state');
                this.gameData.lieRevealed = true;
                this.showLieRevealUI();
                return;
            }

            // Update local state
            this.gameData.lieRevealed = true;

            console.log('🎨 Updating UI...');
            // Update UI
            this.showLieRevealUI();

            console.log('🎉 Lie reveal completed successfully!');

        } catch (error) {
            console.error('❌ Error revealing lie:', error);
            console.error('Error details:', {
                message: error.message,
                stack: error.stack,
                gameId: this.gameData.id,
                socketState: this.socket ? {
                    connected: this.socket.connected,
                    id: this.socket.id
                } : 'no socket'
            });

            // Check if the error is because lie was already revealed
            if (error.message && (error.message.includes('already revealed') || error.message.includes('Game not found or lie already revealed'))) {
                console.log('ℹ️ Lie was already revealed on server, updating local state');
                this.gameData.lieRevealed = true;
                this.showLieRevealUI();
                return;
            }

            // More specific error messages
            let userMessage = 'Failed to reveal lie. ';
            if (error.message.includes('WebSocket')) {
                userMessage += 'Connection issue detected. Please refresh the page and try again.';
            } else if (error.message.includes('Network')) {
                userMessage += 'Network error. Please check your connection and try again.';
            } else {
                userMessage += 'Please try again or refresh the page.';
            }

            alert(userMessage);
        } finally {
            // Reset flag to allow future calls
            this.isRevealingLie = false;
        }
    }

    showLieRevealUI() {
        const lieReveal = document.getElementById('lie-reveal');
        const revealedLie = document.getElementById('revealed-lie');

        if (revealedLie && this.gameData.statements[this.gameData.lieIndex]) {
            revealedLie.textContent = this.gameData.statements[this.gameData.lieIndex];
            lieReveal.style.display = 'block';
        }

        // Update results to highlight correct answer
        this.highlightCorrectAnswer();

        // Disable show lie button if admin
        if (this.gameData.admin) {
            const showLieBtn = document.getElementById('show-lie-btn');
            if (showLieBtn) {
                showLieBtn.disabled = true;
                showLieBtn.textContent = 'Lie Revealed';
            }

            // Trigger FIREWORKS for admin lie reveal! 🎆
            console.log('🎆 Triggering fireworks for admin lie reveal!');
            this.showFireworksAnimation();
        }

        // Show feedback animation AFTER lie is revealed and highlighted
        setTimeout(() => {
            if (this.gameData.hasVoted) {
                // Show animation based on user's vote
                this.showFeedbackAnimation(this.gameData.votedStatement === this.gameData.lieIndex);
            } else {
                // Show general celebration for lie reveal
                this.showFeedbackAnimation(true);
            }
        }, 1000);
    }

    updateResults() {
        const totalVotes = this.gameData.votes.reduce((a, b) => a + b, 0);
        this.updateTotalVotesDisplay();

        for (let i = 0; i < 3; i++) {
            const percentage = totalVotes > 0 ? Math.round((this.gameData.votes[i] / totalVotes) * 100) : 0;
            const barFill = document.querySelector(`#result-${i + 1} .bar-fill`);
            const percentageLabel = document.querySelector(`#result-${i + 1} .result-percentage`);

            if (barFill && percentageLabel) {
                barFill.style.width = `${percentage}%`;
                barFill.dataset.percentage = percentage;
                percentageLabel.textContent = `${percentage}%`;
            }

            // Update label with statement preview
            const label = document.querySelector(`#result-${i + 1} .result-label`);
            if (label && this.gameData.statements[i]) {
                label.textContent = `Statement ${i + 1}: ${this.gameData.statements[i].substring(0, 30)}...`;
            }
        }

        // Check if lie is already revealed
        if (this.gameData.lieRevealed) {
            this.showLieRevealForUsers();
        }
    }

    highlightCorrectAnswer() {
        for (let i = 0; i < 3; i++) {
            const resultElement = document.querySelector(`#result-${i + 1}`);
            if (resultElement) {
                if (i === this.gameData.lieIndex) {
                    resultElement.classList.add('correct-answer');
                    resultElement.style.background = 'linear-gradient(135deg, #ff6b9d, #feca57)';
                    resultElement.style.boxShadow = '0 0 20px rgba(255, 107, 157, 0.5)';
                    resultElement.style.animation = 'highlight 2s ease-in-out infinite';
                } else {
                    resultElement.classList.remove('correct-answer');
                }
            }
        }
    }

    showLieRevealForUsers() {
        console.log('🎭 Showing lie reveal for users...');

        // This function handles lie reveal display for non-admin users
        const lieReveal = document.getElementById('lie-reveal');
        const revealedLie = document.getElementById('revealed-lie');

        if (revealedLie && this.gameData.statements[this.gameData.lieIndex]) {
            revealedLie.textContent = this.gameData.statements[this.gameData.lieIndex];
            if (lieReveal) {
                lieReveal.style.display = 'block';
            }
        }

        // Update results to highlight correct answer
        this.highlightCorrectAnswer();

        // Show feedback animation for users
        setTimeout(() => {
            if (this.gameData.hasVoted) {
                // Show animation based on user's vote
                this.showFeedbackAnimation(this.gameData.votedStatement === this.gameData.lieIndex);
            } else {
                // Show general celebration for lie reveal
                this.showFeedbackAnimation(true);
            }
        }, 1000);
    }

    showFeedbackAnimation(correct) {
        if (!this.phaserScene) return;

        const scene = this.phaserScene;

        if (correct) {
            // Show fireworks animation
            this.createFireworks(scene);
        } else {
            // Show thumbs down animation
            this.createThumbsDownRain(scene);
        }
    }

    createFireworks(scene) {
        // Create multiple firework bursts with both stars and confetti
        const colors = [0xFFD700, 0xFF6B6B, 0x51CF66, 0x667EEA, 0xFF8C42];
        const textures = ['star', 'confetti'];

        for (let i = 0; i < 8; i++) {
            setTimeout(() => {
                const x = Phaser.Math.Between(100, window.innerWidth - 100);
                const y = Phaser.Math.Between(100, window.innerHeight - 100);
                const color = colors[Math.floor(Math.random() * colors.length)];
                const texture = textures[Math.floor(Math.random() * textures.length)];

                // Create particle emitter for firework
                const particles = scene.add.particles(x, y, texture, {
                    speed: { min: 100, max: 300 },
                    scale: { start: 1, end: 0 },
                    tint: color,
                    lifespan: 1500,
                    quantity: 20,
                    gravityY: 50
                });

                // Add a secondary burst for more dramatic effect
                if (i % 2 === 0) {
                    setTimeout(() => {
                        const secondaryParticles = scene.add.particles(x, y, 'star', {
                            speed: { min: 50, max: 150 },
                            scale: { start: 0.8, end: 0 },
                            tint: 0xFFD700,
                            lifespan: 1000,
                            quantity: 10
                        });

                        setTimeout(() => {
                            secondaryParticles.destroy();
                        }, 1500);
                    }, 300);
                }

                // Remove after animation
                setTimeout(() => {
                    particles.destroy();
                }, 2500);
            }, i * 150);
        }
    }

    createThumbsDownRain(scene) {
        // Create falling thumbs down icons
        for (let i = 0; i < 10; i++) {
            setTimeout(() => {
                const x = Phaser.Math.Between(0, window.innerWidth);

                const particles = scene.add.particles(x, -50, 'thumbsdown', {
                    speedY: { min: 100, max: 200 },
                    speedX: { min: -50, max: 50 },
                    scale: { min: 0.5, max: 1 },
                    tint: 0xFF6B6B,
                    lifespan: 3000,
                    quantity: 1,
                    frequency: 100
                });

                // Remove after animation
                setTimeout(() => {
                    particles.destroy();
                }, 4000);
            }, i * 100);
        }
    }

    showPage(pageName) {
        // Hide all pages
        document.querySelectorAll('.page').forEach(page => {
            page.classList.remove('active');
        });

        // Show selected page
        document.getElementById(`${pageName}-page`).classList.add('active');
        this.currentPage = pageName;

        // Stop any existing real-time updates
        this.stopRealTimeUpdates();

        // Handle music based on page - ONLY on voting and results
        if (pageName === 'voting' || pageName === 'results') {
            this.startBackgroundMusic();
        } else {
            this.stopBackgroundMusic();
        }

        // Populate page data - WebSocket handles all real-time updates
        if (pageName === 'voting') {
            this.populateVotingPage();
            console.log('🔌 Voting page - using WebSocket for real-time updates');
        } else if (pageName === 'results') {
            this.populateResultsPage();
            this.updateResults();
            // Ensure WebSocket connection for real-time updates on results page
            this.ensureWebSocketConnection();
            console.log('🔌 Results page - using WebSocket for real-time updates');
        } else if (pageName === 'admin' && this.gameData.gameStarted) {
            console.log('🔌 Admin page - using WebSocket for real-time updates');
        }
    }

    async ensureWebSocketConnection() {
        // Ensure we have a valid WebSocket connection for real-time updates
        if (!this.socket || !this.socket.connected) {
            if (this.gameData.id) {
                console.log('🔄 Re-establishing WebSocket connection for real-time updates...');
                try {
                    this.socket = await apiService.connectWebSocket(this.gameData.id, this.gameData.admin);
                    this.setupWebSocketListeners();
                    console.log('✅ WebSocket reconnected for real-time statistics updates');
                } catch (error) {
                    console.error('❌ Failed to reconnect WebSocket:', error);
                }
            }
        } else {
            console.log('✅ WebSocket already connected for real-time updates');
        }
    }

    cleanup() {
        // Disconnect WebSocket
        if (this.socket) {
            apiService.disconnectWebSocket();
            this.socket = null;
        }

        // Stop music
        this.stopBackgroundMusic();

        // Clear timers
        if (this.timerInterval) {
            clearInterval(this.timerInterval);
        }

        console.log('🧹 Game cleanup completed');
    }

    showFireworksAnimation() {
        if (!this.phaserGame) {
            console.warn('⚠️ Phaser game not available for fireworks');
            return;
        }

        console.log('🎆 Creating fireworks animation...');

        // Pop-art color palette from VAN design
        const colors = [0xff6b9d, 0x4ecdc4, 0xfeca57, 0x45b7d1];
        const scene = this.phaserGame.scene.scenes[0]; // Get the active scene

        if (!scene) {
            console.warn('⚠️ No active Phaser scene for fireworks');
            return;
        }

        // Create multiple firework bursts
        const burstCount = 4;
        const fireworksGroup = scene.add.group();

        for (let burst = 0; burst < burstCount; burst++) {
            setTimeout(() => {
                this.createFireworksBurst(scene, colors, fireworksGroup, burst);
            }, burst * 300); // Stagger the bursts
        }

        // Cleanup after animation completes
        setTimeout(() => {
            fireworksGroup.clear(true, true);
            console.log('🎆 Fireworks animation completed');
        }, 4000);
    }

    createFireworksBurst(scene, colors, group, burstIndex) {
        // Random position for this burst
        const width = scene.cameras.main.width;
        const height = scene.cameras.main.height;
        const centerX = width * (0.3 + Math.random() * 0.4); // Central area
        const centerY = height * (0.2 + Math.random() * 0.3); // Upper area

        console.log(`🎇 Creating fireworks burst ${burstIndex + 1} at`, centerX, centerY);

        // Create pointillism-style firework particles
        const particleCount = 30 + Math.random() * 20; // 30-50 particles
        const burstColor = colors[burstIndex % colors.length];

        for (let i = 0; i < particleCount; i++) {
            // Create individual particle
            const particle = scene.add.graphics();
            const size = 3 + Math.random() * 8; // Varying dot sizes

            // Pointillism circle with slight transparency
            particle.fillStyle(burstColor, 0.8 + Math.random() * 0.2);
            particle.fillCircle(0, 0, size);

            // Add white dot in center for pop-art effect
            particle.fillStyle(0xffffff, 0.6);
            particle.fillCircle(0, 0, size * 0.3);

            // Position at burst center initially
            particle.x = centerX;
            particle.y = centerY;

            // Calculate random trajectory for explosion
            const angle = (Math.PI * 2 * i) / particleCount + (Math.random() - 0.5) * 0.5;
            const velocity = 100 + Math.random() * 150;
            const endX = centerX + Math.cos(angle) * velocity;
            const endY = centerY + Math.sin(angle) * velocity + Math.random() * 100; // Slight gravity

            // Add to group for cleanup
            group.add(particle);

            // Animate the particle explosion
            scene.tweens.add({
                targets: particle,
                x: endX,
                y: endY,
                scaleX: { from: 0.1, to: 1.2 },
                scaleY: { from: 0.1, to: 1.2 },
                alpha: { from: 1, to: 0 },
                duration: 1500 + Math.random() * 1000,
                ease: 'Cubic.easeOut',
                onComplete: () => {
                    particle.destroy();
                }
            });

            // Add rotation for extra pop-art flair
            scene.tweens.add({
                targets: particle,
                rotation: Math.PI * 2 * (Math.random() > 0.5 ? 1 : -1),
                duration: 1500 + Math.random() * 1000,
                ease: 'Power2.easeOut'
            });
        }

        // Add burst sound effect if possible
        try {
            // Create a brief audio context beep for firework sound
            const audioContext = new (window.AudioContext || window.webkitAudioContext)();
            const oscillator = audioContext.createOscillator();
            const gainNode = audioContext.createGain();

            oscillator.connect(gainNode);
            gainNode.connect(audioContext.destination);

            oscillator.frequency.setValueAtTime(800 + Math.random() * 400, audioContext.currentTime);
            gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);

            oscillator.start(audioContext.currentTime);
            oscillator.stop(audioContext.currentTime + 0.3);
        } catch (error) {
            // Ignore audio errors (some browsers may block audio)
            console.log('🔇 Audio not available for fireworks sound');
        }
    }

    stopRealTimeUpdates() {
        // Disconnect WebSocket if connected
        if (this.socket && this.socket.connected) {
            console.log('🔌 Disconnecting WebSocket...');
            this.socket.disconnect();
            this.socket = null;
        }
    }
}

// Initialize the game when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.gameInstance = new TwoTruthsGame();
});

// Cleanup intervals when page is closed
window.addEventListener('beforeunload', () => {
    if (window.gameInstance) {
        window.gameInstance.cleanup();
    }
});

// Add CSS animation for pulse effect
const style = document.createElement('style');
style.textContent = `
    @keyframes pulse {
        0% { transform: scale(1); }
        50% { transform: scale(1.05); }
        100% { transform: scale(1); }
    }
`;
document.head.appendChild(style);
