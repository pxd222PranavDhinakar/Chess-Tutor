/**
 * AppOrchestrator - Main application coordinator and initialization
 * Coordinates all modules and handles application lifecycle
 * UPDATED: Now includes Stockfish integration
 */

class AppOrchestrator {
    constructor() {
        this.gameEngine = null;
        this.boardManager = null;
        this.moveHighlighter = null;
        this.uiUpdater = null;
        this.stockfishInterface = null;
        this.boardAnnotations = null;
        this.gameStateContextBridge = null; // NEW: Game state bridge
        this.initialized = false;
        this.initializationSteps = 0;
        this.totalSteps = 7; // Updated for game state bridge
        this.isPlayingAgainstEngine = false;
    }

    /**
     * Initialize the entire application
     */
    async initialize() {
        try {
            this.showLoadingStatus('Initializing Chess Tutor...');
            
            // Load dependencies first
            await this.loadDependencies();
            this.updateInitializationProgress('Dependencies loaded');

            // Create module instances
            this.createModules();
            this.updateInitializationProgress('Modules created');

            // Initialize modules in proper order (including Stockfish)
            await this.initializeModules();
            this.updateInitializationProgress('All modules initialized');

            // Setup inter-module communication
            this.setupCommunication();
            this.updateInitializationProgress('Communication setup');

            // Setup controls and finalize
            this.setupControls();
            this.updateInitializationProgress('Application ready');

            this.initialized = true;
            this.onApplicationReady();
            
        } catch (error) {
            console.error('Application initialization failed:', error);
            this.showError('Failed to initialize application: ' + error.message);
        }
    }

    /**
     * Load required dependencies
     */
    async loadDependencies() {
        // Load jQuery first
        try {
            const $ = require('jquery');
            window.$ = window.jQuery = $;
            global.$ = global.jQuery = $;
            console.log('jQuery loaded successfully');
        } catch (error) {
            throw new Error('Failed to load jQuery: ' + error.message);
        }

        // Wait for chessboard.js to be available
        let attempts = 0;
        const maxAttempts = 50;
        
        while (typeof window.Chessboard === 'undefined' && attempts < maxAttempts) {
            await new Promise(resolve => setTimeout(resolve, 100));
            attempts++;
        }

        if (typeof window.Chessboard === 'undefined') {
            throw new Error('Chessboard.js library not loaded after ' + maxAttempts + ' attempts');
        }

        console.log('Chessboard.js loaded successfully');
    }

    /**
     * Create all module instances - UPDATED
     */
    createModules() {
        this.gameEngine = new GameEngine();
        this.boardManager = new BoardManager();
        this.moveHighlighter = new MoveHighlighter();
        this.uiUpdater = new UIUpdater();
        this.boardAnnotations = new BoardAnnotations();
        this.stockfishInterface = new StockfishInterface();
        this.gameStateContextBridge = new GameStateContextBridge(); // NEW
    }

    /**
     * Initialize all modules - UPDATED
     */
    async initializeModules() {
        // Initialize game engine first
        const engineReady = await this.gameEngine.initialize();
        if (!engineReady) {
            throw new Error('Game engine initialization failed');
        }

        // Initialize board manager
        const boardReady = await this.boardManager.initialize(this.gameEngine);
        if (!boardReady) {
            throw new Error('Board manager initialization failed');
        }

        // CRITICAL FIX: Set up starting position BEFORE other modules
        this.gameEngine.resetGame(); // Ensure we have a valid starting position
        await new Promise(resolve => setTimeout(resolve, 100)); // Small delay
        
        // Initialize board annotations
        this.boardAnnotations.initialize(this.boardManager);

        // Initialize move highlighter
        this.moveHighlighter.initialize(this.boardManager, this.gameEngine);

        // Initialize Stockfish BEFORE UI updater
        await this.initializeStockfish();

        // NEW: Initialize game state context bridge with knowledge AFTER game is set up
        console.log('🔧 Initializing game state bridge with opening knowledge...');
        await this.gameStateContextBridge.initialize(
            this.gameEngine, 
            this.boardManager, 
            this.stockfishInterface
        );
        console.log('✅ Game state bridge with opening knowledge ready');

        // Initialize UI updater with all dependencies including Stockfish
        this.uiUpdater.initialize(this.gameEngine, this.boardManager, this.stockfishInterface);
    }

    /**
     * Initialize Stockfish engine
     */
    async initializeStockfish() {
        try {
            const stockfishReady = await this.stockfishInterface.initialize(this.gameEngine, this.boardManager);
            if (!stockfishReady) {
                console.warn('Stockfish initialization failed - continuing without engine');
                this.stockfishInterface = null; // Set to null if failed
                return false;
            }
            return true;
        } catch (error) {
            console.warn('Stockfish not available:', error.message);
            this.stockfishInterface = null; // Set to null on error
            return false;
        }
    }

    /**
     * Setup communication between modules - UPDATED TO CLEAR HINTS ON MOVES
     */
    setupCommunication() {
        // Game engine events
        this.gameEngine.on('engine-ready', () => {
            this.uiUpdater.log('🚀 Chess game engine ready', 'success');
        });

        this.gameEngine.on('engine-error', (data) => {
            this.uiUpdater.log(`❌ Engine error: ${data.error}`, 'error');
        });

        // Game engine move events - UPDATED TO CLEAR HINTS
        this.gameEngine.on('move-made', (data) => {
            // Clear hint highlights when any move is made
            if (this.boardAnnotations) {
                this.boardAnnotations.clearHintHighlights();
            }
        });

        this.gameEngine.on('move-undone', (data) => {
            // Clear hint highlights when move is undone
            if (this.boardAnnotations) {
                this.boardAnnotations.clearHintHighlights();
            }
        });

        this.gameEngine.on('game-reset', (data) => {
            // Clear hint highlights when game is reset
            if (this.boardAnnotations) {
                this.boardAnnotations.clearHintHighlights();
            }
        });

        // Board manager events
        this.boardManager.on('board-ready', () => {
            this.uiUpdater.log('✅ Interactive chessboard ready', 'success');
        });

        this.boardManager.on('board-error', (data) => {
            this.uiUpdater.log(`❌ Board error: ${data.error}`, 'error');
        });

        this.boardManager.on('board-cleared', () => {
            // Clear hint highlights when board is cleared
            if (this.boardAnnotations) {
                this.boardAnnotations.clearHintHighlights();
            }
        });

        // Board annotations events
        this.boardAnnotations.on('annotations-ready', () => {
            this.uiUpdater.log('🎨 Board annotations ready', 'success');
        });

        // Move highlighter events
        this.moveHighlighter.on('highlighter-ready', () => {
            this.uiUpdater.log('🎨 Move highlighter ready', 'success');
        });

        // UI updater events
        this.uiUpdater.on('ui-updater-ready', () => {
            this.uiUpdater.log('📱 UI updater ready', 'success');
        });

        // Stockfish events
        if (this.stockfishInterface) {
            console.log('Setting up Stockfish event listeners...');
            
            this.stockfishInterface.on('stockfish-ready', () => {
                this.uiUpdater.log('🤖 Stockfish engine ready', 'success');
                console.log('Stockfish ready event received, enabling controls...');
                this.enableEngineControls();
            });

            this.stockfishInterface.on('stockfish-error', (data) => {
                this.uiUpdater.log(`❌ Stockfish error: ${data.error}`, 'error');
            });

            this.stockfishInterface.on('engine-thinking', () => {
                this.uiUpdater.updateStatus('Engine is thinking...');
            });

            this.stockfishInterface.on('engine-move-made', (data) => {
                this.uiUpdater.log(`🤖 Engine played: ${data.move.san}`, 'success');
            });

            this.stockfishInterface.on('engine-game-started', (data) => {
                this.isPlayingAgainstEngine = true;
                this.uiUpdater.log(`🎮 Playing against engine (${data.engineColor})`, 'success');
                this.updateEngineControls();
            });

            this.stockfishInterface.on('engine-game-stopped', () => {
                this.isPlayingAgainstEngine = false;
                this.uiUpdater.log('🎮 Stopped playing against engine', 'warning');
                this.updateEngineControls();
            });
            
            console.log('Stockfish event listeners setup complete');
        } else {
            console.log('No Stockfish interface available, skipping engine event listeners');
        }
    }

    /**
     * Setup control button event listeners - UPDATED WITH FEN CONTROLS
     */
    setupControls() {
        // Existing controls
        this.setupExistingControls();
        
        // Engine controls
        this.setupEngineControls();
        
        // FEN controls - NEW
        this.setupFenControls();
    }

    /**
     * Setup existing control buttons - UPDATED TO CLEAR HINTS
     */
    setupExistingControls() {
        // New Game button
        const newGameBtn = document.getElementById('newGameBtn');
        if (newGameBtn) {
            newGameBtn.addEventListener('click', () => {
                this.handleNewGame();
            });
        }

        // Undo Move button
        const undoBtn = document.getElementById('undoBtn');
        if (undoBtn) {
            undoBtn.addEventListener('click', () => {
                this.handleUndo();
            });
        }

        // Flip Board button
        const flipBtn = document.getElementById('flipBtn');
        if (flipBtn) {
            flipBtn.addEventListener('click', () => {
                this.handleFlip();
            });
        }

        // Clear Board button
        const clearBtn = document.getElementById('clearBtn');
        if (clearBtn) {
            clearBtn.addEventListener('click', () => {
                this.handleClear();
            });
        }

        // Clear Annotations - UPDATED TO INCLUDE HINT CLEARING
        const clearAnnotationsBtn = document.getElementById('clearAnnotationsBtn');
        if (clearAnnotationsBtn) {
            clearAnnotationsBtn.addEventListener('click', () => {
                this.boardAnnotations.clearAllAnnotations();
                // Also clear hint highlights
                this.boardAnnotations.clearHintHighlights();
            });
        }
    }

    /**
     * Setup engine control buttons - UPDATED FOR HINT BUTTON
     */
    setupEngineControls() {
        console.log('Setting up engine controls...');
        
        // Play vs Engine button
        const playEngineBtn = document.getElementById('playEngineBtn');
        if (playEngineBtn) {
            console.log('Found playEngineBtn, adding event listener');
            playEngineBtn.addEventListener('click', () => {
                console.log('Play Engine button clicked!');
                this.handlePlayEngine();
            });
        } else {
            console.error('playEngineBtn not found!');
        }

        // Stop Engine button
        const stopEngineBtn = document.getElementById('stopEngineBtn');
        if (stopEngineBtn) {
            console.log('Found stopEngineBtn, adding event listener');
            stopEngineBtn.addEventListener('click', () => {
                console.log('Stop Engine button clicked!');
                this.handleStopEngine();
            });
        } else {
            console.error('stopEngineBtn not found!');
        }

        // Get Hint button - UPDATED FROM ANALYZE
        const hintBtn = document.getElementById('hintBtn');
        if (hintBtn) {
            console.log('Found hintBtn, adding event listener');
            hintBtn.addEventListener('click', () => {
                console.log('Get Hint button clicked!');
                this.handleGetHint();
            });
        } else {
            console.error('hintBtn not found!');
        }

        // Rating slider - ADD NULL CHECK
        const ratingSlider = document.getElementById('ratingSlider');
        if (ratingSlider) {
            console.log('Found ratingSlider, adding event listener');
            ratingSlider.addEventListener('input', (e) => {
                const rating = e.target.value;
                const timeSlider = document.getElementById('timeSlider');
                const time = timeSlider ? timeSlider.value : 0.3;
                const options = this.getAdvancedOptions();
                this.handleEngineRatingChange(rating, time, options);
                
                // Update UI display
                this.updateSliderDisplays(rating, time);
            });
        } else {
            console.warn('ratingSlider not found - will be available after UI update');
        }
        
        // Time slider - ADD NULL CHECK
        const timeSlider = document.getElementById('timeSlider');
        if (timeSlider) {
            console.log('Found timeSlider, adding event listener');
            timeSlider.addEventListener('input', (e) => {
                const time = e.target.value;
                const ratingSlider = document.getElementById('ratingSlider');
                const rating = ratingSlider ? ratingSlider.value : 400;
                const options = this.getAdvancedOptions();
                this.handleEngineRatingChange(rating, time, options);
                
                // Update UI display
                this.updateSliderDisplays(rating, time);
            });
        } else {
            console.warn('timeSlider not found - will be available after UI update');
        }
        
        // Preset buttons - ADD NULL CHECK
        const presetButtons = document.querySelectorAll('.preset-btn');
        if (presetButtons.length > 0) {
            console.log(`Found ${presetButtons.length} preset buttons, adding event listeners`);
            presetButtons.forEach(btn => {
                btn.addEventListener('click', () => {
                    const rating = btn.dataset.rating;
                    const time = btn.dataset.time;
                    const options = { allowBlunders: true, limitDepth: true };
                    
                    // Update sliders
                    const ratingSlider = document.getElementById('ratingSlider');
                    const timeSlider = document.getElementById('timeSlider');
                    if (ratingSlider) ratingSlider.value = rating;
                    if (timeSlider) timeSlider.value = time;
                    
                    // Clear other active presets
                    presetButtons.forEach(b => b.classList.remove('active'));
                    btn.classList.add('active');
                    
                    // Apply settings
                    this.handleEngineRatingChange(rating, time, options);
                    this.updateSliderDisplays(rating, time);
                });
            });
        } else {
            console.warn('No preset buttons found - will be available after UI update');
        }
        
        console.log('Engine controls setup complete');
    }

    /**
     * Setup FEN control event listeners - NEW FUNCTION
     */
    setupFenControls() {
        // Load FEN button
        const loadFenBtn = document.getElementById('loadFenBtn');
        if (loadFenBtn) {
            loadFenBtn.addEventListener('click', () => {
                this.handleLoadFen();
            });
        }

        // Copy FEN button
        const copyFenBtn = document.getElementById('copyFenBtn');
        if (copyFenBtn) {
            copyFenBtn.addEventListener('click', () => {
                this.handleCopyFen();
            });
        }

        // FEN input change validation
        const fenInput = document.getElementById('fenInput');
        if (fenInput) {
            fenInput.addEventListener('input', () => {
                this.handleFenInputChange();
            });
            
            // Also validate on paste
            fenInput.addEventListener('paste', () => {
                setTimeout(() => {
                    this.handleFenInputChange();
                }, 10);
            });
        }
    }


    /**
     * Update slider displays
     */
    updateSliderDisplays(rating, time) {
        const ratingValue = document.getElementById('ratingValue');
        const timeValue = document.getElementById('timeValue');
        const engineRating = document.getElementById('engineRating');
        
        if (ratingValue) ratingValue.textContent = rating;
        if (timeValue) timeValue.textContent = time + 's';
        if (engineRating) engineRating.textContent = rating;
        
        // Update opponent description
        if (this.uiUpdater) {
            this.uiUpdater.updateOpponentDescription(parseInt(rating));
        }
    }

    /**
     * Helper method to get advanced options - ADD NULL CHECKS
     */
    getAdvancedOptions() {
        return {
            allowBlunders: document.getElementById('allowBlunders')?.checked || true,
            limitDepth: document.getElementById('limitDepth')?.checked || true,
            varyStyle: document.getElementById('varyStyle')?.checked || false
        };
    }


    /**
     * Handle new game action - UPDATED TO CLEAR HINT HIGHLIGHTS
     */
    handleNewGame() {
        if (!this.initialized) return;

        this.gameEngine.resetGame();
        this.boardManager.start();
        this.moveHighlighter.clearHighlights();
        
        // Clear hint highlights when starting new game
        if (this.boardAnnotations) {
            this.boardAnnotations.clearHintHighlights();
        }
        
        if (this.stockfishInterface && this.isPlayingAgainstEngine) {
            // If engine plays white, make first move
            if (this.stockfishInterface.engineColor === 'white') {
                setTimeout(() => {
                    this.stockfishInterface.makeEngineMove();
                }, 1000);
            }
        }
    }

    /**
     * Handle undo move action
     */
    handleUndo() {
        if (!this.initialized) return;

        const undoneMove = this.gameEngine.undoMove();
        if (undoneMove) {
            this.boardManager.updatePosition();
            
            // If playing against engine, undo engine's move too
            if (this.isPlayingAgainstEngine) {
                setTimeout(() => {
                    const secondUndo = this.gameEngine.undoMove();
                    if (secondUndo) {
                        this.boardManager.updatePosition();
                    }
                }, 100);
            }
        }
    }

    /**
     * Handle flip board action
     */
    handleFlip() {
        if (!this.initialized) return;
        this.boardManager.flip();
    }

    /**
     * Handle clear board action
     */
    handleClear() {
        if (!this.initialized) return;
        this.boardManager.clear();
        this.moveHighlighter.clearHighlights();
        
        if (this.stockfishInterface) {
            this.stockfishInterface.stopEngineGame();
        }
    }

    /**
     * Handle play against engine
     */
    handlePlayEngine() {
        if (!this.stockfishInterface || !this.stockfishInterface.getStatus().ready) {
            this.uiUpdater.log('❌ Stockfish engine not available', 'error');
            return;
        }

        // Start new game
        this.gameEngine.resetGame();
        this.boardManager.start();
        this.moveHighlighter.clearHighlights();
        
        // Ask user for color preference (default: human plays white)
        const humanPlaysWhite = confirm('Do you want to play as White? (OK = White, Cancel = Black)');
        const engineColor = humanPlaysWhite ? 'black' : 'white';
        
        this.stockfishInterface.startEngineGame(engineColor);
    }

    /**
     * Handle stop engine game
     */
    handleStopEngine() {
        if (this.stockfishInterface) {
            this.stockfishInterface.stopEngineGame();
        }
    }

    /**
     * Handle engine strength change
     */
    handleEngineRatingChange(rating, time, options) {
        if (!this.stockfishInterface) {
            console.warn('Stockfish interface not available');
            return;
        }
        
        console.log(`Setting engine rating to ${rating}, time to ${time}s`);
        
        this.stockfishInterface.setEngineByRating(
            parseInt(rating), 
            parseFloat(time) * 1000, // Convert to milliseconds
            options || this.getAdvancedOptions()
        );
        
        this.uiUpdater.log(`🤖 Engine difficulty set to ${rating} rating`, 'move');
    }

    /** 
     * Preset Change
     */
    handlePresetChange(presetName) {
        if (!this.stockfishInterface) return;
        
        this.stockfishInterface.applyPreset(presetName);
        this.uiUpdater.log(`Applied ${presetName} preset`, 'move');
    }

    /**
     * Handle get hint request - UPDATED WITH VISUAL HIGHLIGHTING
     */
    async handleGetHint() {
        if (!this.stockfishInterface || !this.stockfishInterface.getStatus().ready) {
            this.uiUpdater.log('❌ Stockfish engine not available', 'error');
            return;
        }

        const gameState = this.gameEngine.getGameState();
        if (!gameState) return;
        
        // Clear any previous hint highlights
        if (this.boardAnnotations) {
            this.boardAnnotations.clearHintHighlights();
        }
        
        this.uiUpdater.log('💡 Getting hint with maximum engine strength...', 'move');
        
        try {
            const hintResult = await this.stockfishInterface.getHint(gameState.fen);
            if (hintResult && hintResult.move) {
                this.uiUpdater.log(`💡 Hint: Best move is ${hintResult.move}`, 'success');
                
                // Highlight the hint move squares
                if (this.boardAnnotations && hintResult.fromSquare && hintResult.toSquare) {
                    this.boardAnnotations.highlightHintMove(hintResult.fromSquare, hintResult.toSquare);
                    this.uiUpdater.log(`💡 Highlighted move: ${hintResult.fromSquare} → ${hintResult.toSquare}`, 'success');
                }
            } else {
                this.uiUpdater.log('❌ Hint analysis failed', 'error');
            }
        } catch (error) {
            this.uiUpdater.log(`❌ Hint error: ${error.message}`, 'error');
        }
    }

    /**
     * Handle load FEN button click - CORRECTED VERSION
     */
    handleLoadFen() {
        const fenInput = document.getElementById('fenInput');
        if (!fenInput) {
            this.uiUpdater.log('❌ FEN input not found', 'error');
            return;
        }

        const fenValue = fenInput.value.trim();
        if (!fenValue) {
            this.uiUpdater.showFenValidation('Please enter a FEN notation', true);
            return;
        }

        console.log('Loading FEN:', fenValue);

        // Validate the FEN format first
        const validation = this.uiUpdater.validateFen(fenValue);
        if (!validation.valid) {
            this.uiUpdater.showFenValidation(validation.error, true);
            this.uiUpdater.log(`❌ Invalid FEN format: ${validation.error}`, 'error');
            return;
        }

        try {
            // Stop any engine game in progress
            if (this.stockfishInterface && this.isPlayingAgainstEngine) {
                this.stockfishInterface.stopEngineGame();
            }

            // Clear all highlights and annotations
            this.moveHighlighter.clearHighlights();
            if (this.boardAnnotations) {
                this.boardAnnotations.clearAllAnnotations();
                this.boardAnnotations.clearHintHighlights();
            }

            // Try to load the position into the game engine
            const success = this.gameEngine.loadFen(fenValue);
            
            if (success) {
                // Update the board to show the new position
                this.boardManager.updatePosition();
                
                // Update all UI elements
                this.uiUpdater.updateAll();
                this.uiUpdater.showFenValidation('FEN loaded successfully!');
                this.uiUpdater.log(`✅ Loaded FEN: ${fenValue}`, 'success');
                
                // Clear success message after 3 seconds
                setTimeout(() => {
                    this.uiUpdater.clearFenValidation();
                }, 3000);
                
            } else {
                this.uiUpdater.showFenValidation('Invalid FEN - Chess.js cannot parse this position', true);
                this.uiUpdater.log('❌ Chess.js rejected the FEN notation', 'error');
            }
            
        } catch (error) {
            console.error('FEN loading error:', error);
            this.uiUpdater.showFenValidation('Error loading FEN: ' + error.message, true);
            this.uiUpdater.log(`❌ FEN load error: ${error.message}`, 'error');
        }
    }

    /**
     * Handle copy FEN button click - NEW FUNCTION
     */
    async handleCopyFen() {
        await this.uiUpdater.copyFenToClipboard();
    }

    /**
     * Load FEN position - PLUGIN INTEGRATION METHOD
     * Called by position loading plugin
     */
    loadFEN(fenString) {
        try {
            console.log('🎯 AppOrchestrator.loadFEN: Loading FEN via plugin:', fenString);
            
            // Stop any engine game in progress
            if (this.stockfishInterface && this.isPlayingAgainstEngine) {
                this.stockfishInterface.stopEngineGame();
            }
            
            // Clear highlights
            this.moveHighlighter.clearHighlights();
            if (this.boardAnnotations) {
                this.boardAnnotations.clearAllAnnotations();
                this.boardAnnotations.clearHintHighlights();
            }
            
            // Use the existing gameEngine.loadFen method
            const success = this.gameEngine.loadFen(fenString);
            
            if (success) {
                // Update the board and UI
                this.boardManager.updatePosition();
                this.uiUpdater.updateAll();
                this.uiUpdater.log(`✅ Plugin loaded FEN: ${fenString}`, 'success');
                return true;
            } else {
                this.uiUpdater.log('❌ Chess.js rejected the FEN notation', 'error');
                return false;
            }
        } catch (error) {
            console.error('FEN loading error:', error);
            this.uiUpdater.log(`❌ FEN load error: ${error.message}`, 'error');
            return false;
        }
    }

    /**
     * Handle FEN input real-time validation - NEW FUNCTION
     */
    handleFenInputChange() {
        const fenInput = document.getElementById('fenInput');
        if (!fenInput) return;

        const fenValue = fenInput.value.trim();
        
        if (!fenValue) {
            this.uiUpdater.clearFenValidation();
            return;
        }

        // Debounce validation to avoid constant checking while typing
        clearTimeout(this.fenValidationTimeout);
        this.fenValidationTimeout = setTimeout(() => {
            const validation = this.uiUpdater.validateFen(fenValue);
            if (!validation.valid) {
                this.uiUpdater.showFenValidation(validation.error, true);
            } else {
                this.uiUpdater.showFenValidation('Valid FEN notation ✓');
            }
        }, 500);
    }


    /**
     * Enable engine controls when Stockfish is ready - UPDATED FOR HINT BUTTON
     */
    enableEngineControls() {
        console.log('Enabling engine controls...');
        const engineButtons = ['playEngineBtn', 'hintBtn']; // CHANGED FROM analyzeBtn to hintBtn
        engineButtons.forEach(btnId => {
            const btn = document.getElementById(btnId);
            if (btn) {
                console.log(`Enabling button: ${btnId}`);
                btn.disabled = false;
            } else {
                console.error(`Button not found: ${btnId}`);
            }
        });
        
        const engineStrengthSelect = document.getElementById('engineStrength');
        if (engineStrengthSelect) {
            console.log('Enabling engine strength selector');
            engineStrengthSelect.disabled = false;
        } else {
            console.error('Engine strength selector not found');
        }
        
        console.log('Engine controls enabled');
    }

    /**
     * Update engine controls based on game state
     */
    updateEngineControls() {
        const playEngineBtn = document.getElementById('playEngineBtn');
        const stopEngineBtn = document.getElementById('stopEngineBtn');
        
        if (playEngineBtn) {
            playEngineBtn.disabled = this.isPlayingAgainstEngine;
        }
        
        if (stopEngineBtn) {
            stopEngineBtn.disabled = !this.isPlayingAgainstEngine;
        }
    }

    /**
     * Show loading status
     */
    showLoadingStatus(message) {
        const statusEl = document.getElementById('status');
        if (statusEl) {
            statusEl.textContent = message;
        }
    }

    /**
     * Update initialization progress
     */
    updateInitializationProgress(message) {
        this.initializationSteps++;
        const progress = Math.round((this.initializationSteps / this.totalSteps) * 100);
        this.showLoadingStatus(`${message} (${progress}%)`);
    }

    /**
     * Show error message
     */
    showError(message) {
        const statusEl = document.getElementById('status');
        if (statusEl) {
            statusEl.textContent = message;
            statusEl.style.borderColor = '#dc3545';
            statusEl.style.background = '#f8d7da';
        }
    }

    /**
     * Called when application is fully ready - UPDATED TO EXPOSE BOARD ANNOTATIONS
     */
    onApplicationReady() {
        this.uiUpdater.log('🎮 Chess Tutor ready to play!', 'success');
        this.uiUpdater.log('🧠 Game state awareness enabled for AI coach', 'success');
        this.uiUpdater.updateStatus('White to move - Click pieces to select and move!');
        
        // Update all UI elements
        this.uiUpdater.updateAll();
        
        // Enable controls
        this.enableControls();
        
        // Initialize engine difficulty UI
        this.initializeEngineUI();
        
        // FORCE ENABLE ENGINE CONTROLS
        console.log('Force enabling engine controls...');
        this.enableEngineControls();

        // Make game state bridge available globally for AI chat
        window.gameStateContextBridge = this.gameStateContextBridge;
        
        // NEW: Make board annotations available globally for AI tools
        window.boardAnnotations = this.boardAnnotations;
        console.log('🎨 Board annotations system made available for AI tools');
    }

    /**
     * Initialize engine difficulty UI with default values
     */
    initializeEngineUI() {
        // Set default engine difficulty
        if (this.stockfishInterface) {
            this.handleEngineRatingChange(400, 0.3, {
                allowBlunders: true,
                limitDepth: true,
                varyStyle: false
            });
        }
        
        // Update displays
        this.updateSliderDisplays(400, 0.3);
    }

    /**
     * Enable all control buttons - UPDATED FOR HINT BUTTON
     */
    enableControls() {
        const buttons = ['newGameBtn', 'flipBtn', 'clearBtn'];
        buttons.forEach(btnId => {
            const btn = document.getElementById(btnId);
            if (btn) {
                btn.disabled = false;
            }
        });
    }

    /**
     * Disable all control buttons - UPDATED FOR HINT BUTTON
     */
    disableControls() {
        const buttons = ['newGameBtn', 'undoBtn', 'flipBtn', 'clearBtn', 'playEngineBtn', 'stopEngineBtn', 'hintBtn']; // CHANGED FROM analyzeBtn
        buttons.forEach(btnId => {
            const btn = document.getElementById(btnId);
            if (btn) {
                btn.disabled = true;
            }
        });
    }

    /**
     * Get current application state - UPDATED
     */
    getApplicationState() {
        return {
            initialized: this.initialized,
            gameState: this.gameEngine ? this.gameEngine.getGameState() : null,
            selectedSquare: this.boardManager ? this.boardManager.getSelectedSquare() : null,
            boardOrientation: this.boardManager ? this.boardManager.getOrientation() : null,
            stockfishStatus: this.stockfishInterface ? this.stockfishInterface.getStatus() : null,
            playingAgainstEngine: this.isPlayingAgainstEngine,
            gameStateContextAvailable: this.gameStateContextBridge ? this.gameStateContextBridge.isReady() : false
        };
    }

    /**
     * Shutdown the application
     */
    shutdown() {
        this.disableControls();
        
        if (this.moveHighlighter) {
            this.moveHighlighter.clearHighlights();
        }
        
        if (this.stockfishInterface) {
            this.stockfishInterface.shutdown();
        }
        
        if (this.uiUpdater) {
            this.uiUpdater.log('👋 Application shutting down', 'warning');
        }
        
        this.initialized = false;
    }
}

// Make it available globally
window.AppOrchestrator = AppOrchestrator;