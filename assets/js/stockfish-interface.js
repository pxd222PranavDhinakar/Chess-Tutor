/**
 * StockfishInterface - Engine communication and analysis
 * Handles Stockfish UCI protocol communication and move analysis
 * UPDATED: Full implementation with IPC communication
 */

class StockfishInterface {
    constructor() {
        this.gameEngine = null;
        this.eventListeners = {};
        this.isAnalyzing = false;
        this.isEngineReady = false;
        this.engineDepth = 15;
        this.engineTime = 1000; // 1 second
        this.engineStrength = null; // null = full strength
        this.pendingCallbacks = new Map();
        this.callbackId = 0;
        this.isPlayingAsEngine = false;
        this.engineColor = 'black'; // Engine plays as black by default
        this.bestMoveCallback = null;
    }

    /**
     * Initialize the Stockfish interface
     */
    async initialize(gameEngine, boardManager = null) {
        this.gameEngine = gameEngine;
        this.boardManager = boardManager; // Store board manager reference
        
        try {
            await this.setupIPCCommunication();
            await this.initializeEngine();
            this.setupGameEventListeners();
            
            this.emit('stockfish-ready');
            return true;
        } catch (error) {
            console.error('Stockfish initialization failed:', error);
            this.emit('stockfish-error', { error: error.message });
            return false;
        }
    }

    /**
     * Setup IPC communication with main process
     */
    async setupIPCCommunication() {
        if (typeof require === 'undefined') {
            throw new Error('Stockfish requires Electron environment');
        }

        const { ipcRenderer } = require('electron');
        this.ipcRenderer = ipcRenderer;

        // Listen for Stockfish output
        this.ipcRenderer.on('stockfish-output', (event, output) => {
            this.handleEngineOutput(output);
        });

        console.log('IPC communication setup complete');
    }

    /**
     * Initialize the Stockfish engine
     */
    async initializeEngine() {
        return new Promise((resolve, reject) => {
            const timeout = setTimeout(() => {
                reject(new Error('Engine initialization timeout'));
            }, 5000);

            // Wait for UCI OK response
            const initCallback = (data) => {
                if (data.type === 'uciok') {
                    clearTimeout(timeout);
                    this.off('engine-response', initCallback);
                    this.isEngineReady = true;
                    console.log('Stockfish engine ready');
                    
                    // EMIT THE READY EVENT HERE
                    this.emit('stockfish-ready');
                    
                    resolve();
                }
            };

            this.on('engine-response', initCallback);
            
            // Send UCI initialization
            this.sendCommand('uci');
        });
    }

    /**
     * Setup event listeners for game events
     */
    setupGameEventListeners() {
        // Listen for moves to check if engine should respond
        this.gameEngine.on('move-made', (data) => {
            if (this.isPlayingAsEngine && this.shouldEngineMove()) {
                // Small delay to let UI update
                setTimeout(() => {
                    this.makeEngineMove();
                }, 500);
            }
        });

        // Listen for game reset
        this.gameEngine.on('game-reset', () => {
            this.stopAnalysis();
        });
    }

    /**
     * Handle output from Stockfish engine
     */
    handleEngineOutput(output) {
        console.log('Stockfish output:', output);

        const lines = output.split('\n').filter(line => line.trim());
        
        lines.forEach(line => {
            this.parseEngineResponse(line.trim());
        });
    }

    /**
     * Parse individual engine response lines
     */
    parseEngineResponse(line) {
        if (line === 'uciok') {
            this.emit('engine-response', { type: 'uciok' });
        } else if (line === 'readyok') {
            this.emit('engine-response', { type: 'readyok' });
        } else if (line.startsWith('bestmove')) {
            this.handleBestMoveResponse(line);
        } else if (line.startsWith('info')) {
            this.handleInfoResponse(line);
        }
    }

    /**
     * Handle best move response
     */
    handleBestMoveResponse(line) {
        const parts = line.split(' ');
        const bestMove = parts[1];
        
        if (bestMove && bestMove !== '(none)') {
            console.log('Best move received:', bestMove);
            
            if (this.bestMoveCallback) {
                this.bestMoveCallback(bestMove);
                this.bestMoveCallback = null;
            }
            
            this.emit('best-move', { move: bestMove });
        }
        
        this.isAnalyzing = false;
    }

    /**
     * Handle info response (analysis data)
     */
    handleInfoResponse(line) {
        const info = this.parseInfoLine(line);
        if (info.depth && info.score !== undefined) {
            this.emit('analysis-update', info);
        }
    }

    /**
     * Parse UCI info line
     */
    parseInfoLine(line) {
        const info = {};
        const parts = line.split(' ');
        
        for (let i = 0; i < parts.length; i++) {
            switch (parts[i]) {
                case 'depth':
                    info.depth = parseInt(parts[i + 1]);
                    i++;
                    break;
                case 'score':
                    if (parts[i + 1] === 'cp') {
                        info.score = parseInt(parts[i + 2]) / 100; // Convert centipawns to pawns
                        i += 2;
                    } else if (parts[i + 1] === 'mate') {
                        info.score = parts[i + 2];
                        i += 2;
                    }
                    break;
                case 'nodes':
                    info.nodes = parseInt(parts[i + 1]);
                    i++;
                    break;
                case 'time':
                    info.time = parseInt(parts[i + 1]);
                    i++;
                    break;
                case 'pv':
                    info.principalVariation = parts.slice(i + 1);
                    break;
            }
        }
        
        return info;
    }

    /**
     * Send command to Stockfish engine
     */
    sendCommand(command) {
        if (!this.ipcRenderer) {
            console.error('IPC not available');
            return;
        }
        
        console.log('Sending to Stockfish:', command);
        this.ipcRenderer.send('stockfish-command', command);
    }

    /**
     * Set current position in engine
     */
    setPosition(fen) {
        if (!this.isEngineReady) return;
        
        this.sendCommand(`position fen ${fen}`);
    }

    /**
     * Start engine analysis - RESPECTS CURRENT DIFFICULTY SETTINGS
     */
    async analyzePosition(fen, depth = null, timeMs = null) {
        if (!this.isEngineReady || this.isAnalyzing) {
            return null;
        }

        this.isAnalyzing = true;
        this.setPosition(fen);
        
        // Use current engine settings (respects difficulty)
        let actualDepth;
        if (depth !== null) {
            actualDepth = depth;
        } else if (this.targetRating && this.targetRating <= 1000) {
            actualDepth = this.ratingToDepthLimit(this.targetRating);
            console.log(`Using rating-based depth: ${actualDepth} for ${this.targetRating} rating`);
        } else {
            actualDepth = this.engineDepth;
            console.log(`Using default depth: ${actualDepth} for strong engine`);
        }
        
        const actualTime = timeMs || this.engineTime;
        
        // Configure search parameters
        if (this.engineStrength !== null) {
            this.sendCommand(`setoption name Skill Level value ${this.engineStrength}`);
        }
        
        // Use current settings (may be limited for difficulty)
        if (this.targetRating && this.targetRating <= 1000) {
            console.log(`Using depth limit ${actualDepth} for ${this.targetRating} rating engine`);
            this.sendCommand(`go depth ${actualDepth}`);
        } else {
            console.log(`Using time-based search: depth ${actualDepth}, time ${actualTime}ms`);
            this.sendCommand(`go depth ${actualDepth} movetime ${actualTime}`);
        }
        
        return new Promise((resolve) => {
            const timeout = setTimeout(() => {
                this.isAnalyzing = false;
                resolve(null);
            }, actualTime + 2000);
            
            const callback = (data) => {
                if (data.type === 'best-move') {
                    clearTimeout(timeout);
                    this.off('engine-response', callback);
                    resolve(data.move);
                }
            };
            
            this.on('engine-response', callback);
        });
    }

    /**
     * Get hint using maximum engine strength - IGNORES DIFFICULTY SETTINGS
     */
    async getHint(fen = null) {
        if (!this.isEngineReady || this.isAnalyzing) {
            console.log('Engine not ready or already analyzing');
            return null;
        }

        const gameState = this.gameEngine.getGameState();
        const position = fen || gameState.fen;
        
        console.log('🔍 Getting hint with maximum engine strength...');
        
        // Store current engine settings
        const originalSettings = {
            strength: this.engineStrength,
            time: this.engineTime,
            depth: this.engineDepth,
            targetRating: this.targetRating
        };
        
        this.isAnalyzing = true;
        this.setPosition(position);
        
        try {
            // Temporarily set to maximum strength for hint
            console.log('💡 Hint: Using maximum engine strength (ignoring difficulty settings)');
            this.sendCommand('setoption name UCI_LimitStrength value false');
            this.sendCommand('setoption name Skill Level value 20');
            
            // Use deep analysis settings for hint
            const hintDepth = 18;
            const hintTime = 3000; // 3 seconds
            
            console.log(`💡 Hint: Analyzing at depth ${hintDepth} for ${hintTime}ms`);
            this.sendCommand(`go depth ${hintDepth} movetime ${hintTime}`);
            
            return new Promise((resolve) => {
                const timeout = setTimeout(() => {
                    this.isAnalyzing = false;
                    console.log('💡 Hint: Analysis timeout');
                    resolve(null);
                }, hintTime + 2000);
                
                this.bestMoveCallback = (bestMove) => {
                    clearTimeout(timeout);
                    this.bestMoveCallback = null;
                    console.log(`💡 Hint: Best move found: ${bestMove}`);
                    
                    // Parse the move to extract from and to squares
                    let fromSquare = null;
                    let toSquare = null;
                    
                    if (bestMove && bestMove.length >= 4) {
                        fromSquare = bestMove.substring(0, 2);
                        toSquare = bestMove.substring(2, 4);
                    }
                    
                    resolve({
                        move: bestMove,
                        fromSquare: fromSquare,
                        toSquare: toSquare
                    });
                };
            });
            
        } finally {
            // Always restore original settings after hint analysis
            setTimeout(() => {
                console.log('💡 Hint: Restoring original engine settings');
                this.engineStrength = originalSettings.strength;
                this.engineTime = originalSettings.time;
                this.engineDepth = originalSettings.depth;
                this.targetRating = originalSettings.targetRating;
                
                // Restore difficulty settings if they were active
                if (originalSettings.targetRating) {
                    this.sendCommand('setoption name UCI_LimitStrength value true');
                    this.sendCommand(`setoption name UCI_Elo value ${originalSettings.targetRating}`);
                    this.sendCommand(`setoption name Skill Level value ${originalSettings.strength}`);
                    console.log(`💡 Hint: Restored difficulty to ${originalSettings.targetRating} rating`);
                }
            }, 100);
        }
    }

    /**
     * Get the best move for current position
     */
    async getBestMove(fen = null) {
        const gameState = this.gameEngine.getGameState();
        const position = fen || gameState.fen;
        
        return new Promise((resolve) => {
            this.bestMoveCallback = resolve;
            this.analyzePosition(position);
        });
    }

    /**
     * Check if engine should make a move
     */
    shouldEngineMove() {
        const gameState = this.gameEngine.getGameState();
        if (!gameState || gameState.isGameOver) return false;
        
        const currentTurn = gameState.turn === 'w' ? 'white' : 'black';
        return currentTurn === this.engineColor;
    }

    /**
     * Make engine move
     */
    async makeEngineMove() {
        if (!this.isPlayingAsEngine || !this.shouldEngineMove()) return;
        
        const gameState = this.gameEngine.getGameState();
        if (!gameState || gameState.isGameOver) return;
        
        console.log('Engine is thinking...');
        this.emit('engine-thinking');
        
        try {
            const bestMove = await this.getBestMove();
            
            if (bestMove) {
                const from = bestMove.substring(0, 2);
                const to = bestMove.substring(2, 4);
                const promotion = bestMove.length > 4 ? bestMove.substring(4) : null;
                
                console.log(`Engine move: ${from} to ${to}${promotion ? ' promote to ' + promotion : ''}`);
                
                const move = this.gameEngine.makeMove(from, to, promotion);
                
                if (move) {
                    // FORCE UPDATE THE BOARD POSITION IMMEDIATELY
                    if (this.boardManager) {
                        this.boardManager.updatePosition();
                    }
                    
                    this.emit('engine-move-made', { move, engineMove: bestMove });
                    console.log('Engine move completed successfully');
                } else {
                    console.error('Engine move failed:', bestMove);
                    this.emit('engine-move-failed', { move: bestMove });
                }
            } else {
                console.error('Engine could not find a move');
                this.emit('engine-no-move');
            }
        } catch (error) {
            console.error('Engine move error:', error);
            this.emit('engine-move-error', { error: error.message });
        }
    }

    /**
     * Start playing against the engine
     */
    startEngineGame(engineColor = 'black') {
        this.isPlayingAsEngine = true;
        this.engineColor = engineColor;
        
        console.log(`Started engine game - Engine plays as ${engineColor}`);
        this.emit('engine-game-started', { engineColor });
        
        // If engine plays white, make first move
        if (engineColor === 'white') {
            setTimeout(() => {
                this.makeEngineMove();
            }, 1000);
        }
    }

    /**
     * Stop playing against the engine
     */
    stopEngineGame() {
        this.isPlayingAsEngine = false;
        this.stopAnalysis();
        
        console.log('Stopped engine game');
        this.emit('engine-game-stopped');
    }

    /**
     * Set engine playing strength (0-20, where 20 is strongest)
     */
    setEngineStrength(skillLevel) {
        this.engineStrength = Math.max(0, Math.min(20, skillLevel));
        
        if (this.isEngineReady) {
            this.sendCommand(`setoption name Skill Level value ${this.engineStrength}`);
        }
        
        console.log(`Engine strength set to ${this.engineStrength}`);
        this.emit('strength-changed', { skillLevel: this.engineStrength });
    }


    /**
     * Set engine strength with fine-grained rating control - FIXED VERSION
     */
    setEngineByRating(targetRating, thinkingTimeMs = 500, options = {}) {
        let skillLevel = this.ratingToSkillLevel(targetRating);
        let depthLimit = this.ratingToDepthLimit(targetRating);
        
        this.engineStrength = skillLevel;
        this.engineTime = thinkingTimeMs;
        this.targetRating = targetRating;
        
        // CRITICAL: Set maxDepth properly
        if (options.limitDepth) {
            this.maxDepth = depthLimit;
            console.log(`Setting maxDepth to ${depthLimit} for ${targetRating} rating`);
        } else {
            this.maxDepth = null; // No depth limit
        }
        
        if (this.isEngineReady) {
            this.sendCommand('setoption name UCI_LimitStrength value true');
            this.sendCommand(`setoption name UCI_Elo value ${targetRating}`);
            this.sendCommand(`setoption name Skill Level value ${skillLevel}`);
            
            if (options.allowBlunders) {
                this.sendCommand(`setoption name Skill Level value ${Math.max(0, skillLevel - 1)}`);
            }
        }
        
        console.log(`Engine set to ${targetRating} rating, skill ${skillLevel}, maxDepth ${this.maxDepth}, time ${thinkingTimeMs}ms`);
        this.emit('rating-changed', { rating: targetRating, time: thinkingTimeMs, options });
    }

    /**
     * Convert target rating to Stockfish skill level
     */
    ratingToSkillLevel(rating) {
        if (rating <= 300) return 0;
        if (rating <= 400) return 1;
        if (rating <= 500) return 2;
        if (rating <= 600) return 3;
        if (rating <= 700) return 4;
        if (rating <= 800) return 5;
        if (rating <= 900) return 6;
        if (rating <= 1000) return 7;
        if (rating <= 1100) return 8;
        if (rating <= 1200) return 9;
        if (rating <= 1300) return 10;
        if (rating <= 1400) return 12;
        return Math.min(15, 13 + Math.floor((rating - 1400) / 100));
    }

    /**
     * Convert target rating to appropriate search depth
     */
    ratingToDepthLimit(rating) {
        return Math.max(1, Math.min(8, Math.floor(rating / 200)));
    }

    /**
     * Apply preset difficulty settings
     */
    applyPreset(presetName) {
        const presets = {
            learning: { rating: 400, time: 300, options: { allowBlunders: true, limitDepth: true } },
            practice: { rating: 600, time: 500, options: { allowBlunders: true, limitDepth: true } },
            challenge: { rating: 800, time: 800, options: { allowBlunders: false, limitDepth: true } },
            improve: { rating: 1000, time: 1000, options: { allowBlunders: false, limitDepth: false } }
        };
        
        const preset = presets[presetName];
        if (preset) {
            this.setEngineByRating(preset.rating, preset.time, preset.options);
        }
    }

    /**
     * Set full engine strength
     */
    setFullStrength() {
        this.engineStrength = null;
        
        if (this.isEngineReady) {
            this.sendCommand('setoption name Skill Level value 20');
        }
        
        console.log('Engine set to full strength');
        this.emit('strength-changed', { skillLevel: 'max' });
    }

    /**
     * Set analysis depth
     */
    setAnalysisDepth(depth) {
        this.engineDepth = Math.max(1, Math.min(30, depth));
        console.log(`Analysis depth set to ${this.engineDepth}`);
        this.emit('depth-changed', { depth: this.engineDepth });
    }

    /**
     * Set analysis time limit
     */
    setAnalysisTime(timeMs) {
        this.engineTime = Math.max(100, timeMs);
        console.log(`Analysis time set to ${this.engineTime}ms`);
        this.emit('time-changed', { time: this.engineTime });
    }

    /**
     * Stop current analysis
     */
    stopAnalysis() {
        if (this.isAnalyzing) {
            this.sendCommand('stop');
            this.isAnalyzing = false;
            this.emit('analysis-stopped');
        }
    }

    /**
     * Get current engine status
     */
    getStatus() {
        return {
            ready: this.isEngineReady,
            analyzing: this.isAnalyzing,
            playingAsEngine: this.isPlayingAsEngine,
            engineColor: this.engineColor,
            strength: this.engineStrength,
            depth: this.engineDepth,
            time: this.engineTime
        };
    }

    /**
     * Shutdown the engine
     */
    shutdown() {
        this.stopAnalysis();
        this.isPlayingAsEngine = false;
        
        if (this.isEngineReady) {
            this.sendCommand('quit');
        }
        
        this.isEngineReady = false;
        this.emit('stockfish-shutdown');
    }

    /**
     * Event system for communication with other modules
     */
    on(event, callback) {
        if (!this.eventListeners[event]) {
            this.eventListeners[event] = [];
        }
        this.eventListeners[event].push(callback);
    }

    emit(event, data = null) {
        if (this.eventListeners[event]) {
            this.eventListeners[event].forEach(callback => callback(data));
        }
    }

    off(event, callback) {
        if (this.eventListeners[event]) {
            this.eventListeners[event] = this.eventListeners[event].filter(cb => cb !== callback);
        }
    }
}

// Make it available globally
window.StockfishInterface = StockfishInterface;