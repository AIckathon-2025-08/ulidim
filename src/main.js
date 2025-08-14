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

        this.currentPage = 'admin';
        this.timerInterval = null;
        this.timeRemaining = 0;
        this.phaserGame = null;
        this.backgroundAudio = null;
        this.musicEnabled = true; // legacy flag (proxied to musicService)
        this.realTimeUpdateInterval = null;
        this.socket = null;
        this.participantCount = 0;

        this.init();
    }

    init() {
        this.setupEventListeners();
        this.initializePhaser();
        this.loadDefaultMusic();
        musicService.setEnabled(this.musicEnabled);
        musicService.updateButtons();
        this.updateMusicButtonText();
        this.checkURLForGameId();
    }

    setupEventListeners() {
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

            const success = await this.loadGameData(gameId);
            if (success) {
                this.showPage('voting');
            } else {
                alert('Game not found or has expired.');
                // Redirect to home page
                window.location.href = window.location.pathname;
            }
        } else {
            // This is the admin page
            this.gameData.admin = true;
            this.showPage('admin');
        }
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
        const file = event.target.files[0];
        if (file && file.type === 'audio/mpeg') {
            const reader = new FileReader();
            reader.onload = (e) => {
                this.gameData.backgroundMusic = e.target.result;
            };
            reader.readAsDataURL(file);
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

            const gameData = {
                teammate_name: teammateNameElement?.value || '',
                teammate_picture: this.gameData.teammate.pictureUrl || '',
                statement_1: statement1Element?.value || '',
                statement_2: statement2Element?.value || '',
                statement_3: statement3Element?.value || '',
                lie_index: lieStatementElement?.value ? parseInt(lieStatementElement.value) - 1 : -1,
                timer_duration: votingTimerElement?.value ? parseInt(votingTimerElement.value) : null,
                background_music: this.gameData.backgroundMusic || null
            };

            console.log('📊 Collected game data:', gameData);

            // Validate required fields
            if (!gameData.teammate_name || !gameData.teammate_picture ||
                !gameData.statement_1 || !gameData.statement_2 || !gameData.statement_3 ||
                gameData.lie_index < 0) {
                console.error('❌ Validation failed:', {
                    teammate_name: !!gameData.teammate_name,
                    teammate_picture: !!gameData.teammate_picture,
                    statement_1: !!gameData.statement_1,
                    statement_2: !!gameData.statement_2,
                    statement_3: !!gameData.statement_3,
                    lie_index: gameData.lie_index
                });
                alert('Please fill in all required fields.');
                return;
            }

            console.log('✅ Validation passed, making API call...');

            // Show loading state
            this.setLoadingState(true);

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

            // Show game controls
            document.getElementById('admin-form').style.display = 'none';
            document.getElementById('game-controls').style.display = 'block';

            // Generate and display game link
            const gameLink = `${window.location.origin}${window.location.pathname}?game=${this.gameData.id}`;
            document.getElementById('game-link').value = gameLink;

            console.log('🔗 Game link generated:', gameLink);

            // Start timer if set
            if (this.gameData.timer) {
                this.startTimer();
            }

            // Copy link to clipboard automatically
            this.copyGameLink();

            this.setLoadingState(false);
            console.log('🎉 Game creation completed successfully!');

        } catch (error) {
            console.error('❌ Error starting game:', error);
            console.error('❌ Error stack:', error.stack);
            alert(`Failed to start game: ${error.message}`);
            this.setLoadingState(false);
        }
    }

    validateGameData() {
        return this.gameData.teammate.name &&
               this.gameData.teammate.pictureUrl &&
               this.gameData.statements.every(s => s.trim()) &&
               this.gameData.lieIndex !== null;
    }

    generateGameId() {
        return Date.now().toString(36) + Math.random().toString(36).substr(2);
    }

    // This method is no longer needed as data is stored in the database
    // Kept for backward compatibility but does nothing
    saveGameData() {
        // No longer needed - data is stored in database
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
                }

                // Connect to WebSocket as participant
                this.socket = await apiService.connectWebSocket(gameId, false);
                this.setupWebSocketListeners();

                this.populateVotingPage();
                return true;
            }
            return false;
        } catch (error) {
            console.error('Error loading game data:', error);
            return false;
        }
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

    startRealTimeUpdates() {
        // Clear any existing interval
        if (this.realTimeUpdateInterval) {
            clearInterval(this.realTimeUpdateInterval);
        }

        // Start polling for updates every 2 seconds
        this.realTimeUpdateInterval = setInterval(() => {
            this.checkForUpdates();
        }, 2000);
    }

    stopRealTimeUpdates() {
        if (this.realTimeUpdateInterval) {
            clearInterval(this.realTimeUpdateInterval);
            this.realTimeUpdateInterval = null;
        }
    }

        setupWebSocketListeners() {
        if (!this.socket) return;

        // Listen for vote updates
        apiService.onVoteUpdate((data) => {
            if (data.gameId === this.gameData.id) {
                this.gameData.votes = data.votes;
                if (this.currentPage === 'results') {
                    this.updateResults();
                }
            }
        });

        // Listen for lie reveals
        apiService.onLieRevealed((data) => {
            if (data.gameId === this.gameData.id) {
                this.gameData.lieRevealed = true;
                this.gameData.lieIndex = data.lieIndex;

                // Show lie reveal immediately
                if (this.currentPage === 'results') {
                    this.showLieRevealUI();
                }
            }
        });

        // Listen for game updates
        apiService.onGameUpdate((data) => {
            if (data.gameId === this.gameData.id) {
                // Update game state
                this.gameData.votes = data.votes;
                this.gameData.lieRevealed = data.lie_revealed;
                this.gameData.lieIndex = data.lie_index;

                if (this.currentPage === 'results') {
                    this.updateResults();
                }
            }
        });

        // Listen for participant count updates
        apiService.onParticipantCountUpdate((data) => {
            this.participantCount = data.count;
            this.updateParticipantCount();
        });

        // Listen for timer updates
        apiService.onTimerUpdate((data) => {
            if (!this.gameData.admin) {
                this.timeRemaining = data.timeRemaining;
                this.updateTimerDisplay();
            }
        });

        console.log('✅ WebSocket listeners setup complete');
    }

    updateParticipantCount() {
        // You can add UI element to show participant count if needed
        console.log(`👥 Participants: ${this.participantCount}`);
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
        this.saveGameData();

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

        // Auto-reveal lie if admin - this will trigger real-time updates for all users
        if (this.gameData.admin) {
            setTimeout(() => {
                this.revealLie();
            }, 1000);
        }
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

                // Show results page
                this.showPage('results');
                this.updateResults();
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

    // This method is no longer needed as votes are handled by the API
    // Kept for backward compatibility but does nothing
    incrementVote(statementIndex) {
        // No longer needed - handled by API
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
            return;
        }

        try {
            // Reveal lie via WebSocket for real-time updates
            apiService.revealLieViaWebSocket(this.gameData.id);

            // Also make API call for persistence
            await apiService.revealLie(this.gameData.id);

            // Update local state
            this.gameData.lieRevealed = true;

            // Update UI
            this.showLieRevealUI();

        } catch (error) {
            console.error('Error revealing lie:', error);
            alert('Failed to reveal lie. Please try again.');
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
            const barFill = document.querySelector(`#result-${i + 1} .bar-fill`);
            if (i === this.gameData.lieIndex) {
                barFill.classList.add('correct');
            } else {
                barFill.classList.add('incorrect');
            }
        }
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

        // Populate page data and start real-time updates
        if (pageName === 'voting') {
            this.populateVotingPage();
            if (!this.gameData.admin) {
                this.startRealTimeUpdates();
            }
        } else if (pageName === 'results') {
            this.populateResultsPage();
            this.updateResults();
            this.startRealTimeUpdates();
        }
    }

    cleanup() {
        // Stop intervals
        this.stopRealTimeUpdates();

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
