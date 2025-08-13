/**
 * GameStateContextBridge - Makes chess game state available to AI chat interface
 * This bridge module captures real-time game state and provides structured context
 * for the AI coach to understand the current position and game history.
 */

class GameStateContextBridge {
    constructor() {
        this.gameEngine = null;
        this.boardManager = null;
        this.stockfishInterface = null;
        this.currentGameState = null;
        this.gameHistory = [];
        this.lastAnalysis = null;
        this.isInitialized = false;
        
        // Cache for performance
        this.cachedContext = null;
        this.lastUpdateTime = 0;
        this.cacheTimeout = 1000; // 1 second cache

        // Chess knowledge systems
        this.openingKnowledge = new OpeningKnowledgeSystem();
        this.knowledgeInitialized = false;
    }

    /**
     * Initialize knowledge systems
     */
    async initializeKnowledge() {
        try {
            console.log('🔧 GameStateContextBridge: Initializing chess knowledge...');
            await this.openingKnowledge.initialize();
            this.knowledgeInitialized = true;
            console.log('✅ GameStateContextBridge: Chess knowledge systems ready');
        } catch (error) {
            console.error('❌ GameStateContextBridge: Knowledge initialization failed:', error);
            this.knowledgeInitialized = false;
        }
    }

    /**
     * Initialize the bridge with chess application modules
     */
    async initialize(gameEngine, boardManager, stockfishInterface = null) {
        this.gameEngine = gameEngine;
        this.boardManager = boardManager;
        this.stockfishInterface = stockfishInterface;
        
        // Initialize knowledge systems first
        await this.initializeKnowledge();
        
        this.setupEventListeners();
        
        // Wait for game engine to have a valid state
        await this.waitForGameState();
        this.updateGameState();
        this.isInitialized = true;
        
        console.log('✅ GameStateContextBridge initialized with valid game state');
        console.log('🎯 Initial game state:', this.getSimpleContext());
        
        // Log initial opening if detected
        if (this.knowledgeInitialized) {
            const openingInfo = this.getOpeningKnowledge();
            if (openingInfo && openingInfo.available) {
                console.log('🎯 Initial opening detected:', openingInfo.opening.name, openingInfo.opening.eco);
            }
        }
    }

    /**
     * Wait for game engine to have a valid state
     */
    async waitForGameState() {
        let attempts = 0;
        const maxAttempts = 50; // 5 seconds max wait
        
        while (attempts < maxAttempts) {
            try {
                const gameState = this.gameEngine.getGameState();
                if (gameState && gameState.fen) {
                    console.log('🎯 Game state detected:', gameState.fen);
                    return true;
                }
            } catch (error) {
                console.log('⏳ Waiting for game state...', error.message);
            }
            
            await new Promise(resolve => setTimeout(resolve, 100));
            attempts++;
        }
        
        console.warn('⚠️ Timeout waiting for game state, proceeding anyway');
        return false;
    }

    /**
     * Setup event listeners to track game state changes
     */
    setupEventListeners() {
        // Listen for moves
        this.gameEngine.on('move-made', (data) => {
            this.updateGameState();
            this.addToGameHistory('move', data.move);
        });

        // Listen for undos
        this.gameEngine.on('move-undone', (data) => {
            this.updateGameState();
            this.addToGameHistory('undo', data.undoneMove);
        });

        // Listen for game resets
        this.gameEngine.on('game-reset', () => {
            this.updateGameState();
            this.gameHistory = [];
            this.addToGameHistory('reset');
        });

        // Listen for position loads (FEN)
        this.gameEngine.on('position-loaded', (data) => {
            this.updateGameState();
            this.addToGameHistory('fen_loaded', { fen: data.fen });
        });

        // Listen for Stockfish analysis if available
        if (this.stockfishInterface) {
            this.stockfishInterface.on('analysis-update', (data) => {
                this.lastAnalysis = {
                    depth: data.depth,
                    score: data.score,
                    nodes: data.nodes,
                    time: data.time,
                    principalVariation: data.principalVariation,
                    timestamp: new Date().toISOString()
                };
            });

            this.stockfishInterface.on('best-move', (data) => {
                if (this.lastAnalysis) {
                    this.lastAnalysis.bestMove = data.move;
                }
            });
        }
    }

    /**
     * Update current game state from engine
     */
    updateGameState() {
        if (!this.gameEngine) return;

        this.currentGameState = this.gameEngine.getGameState();
        this.invalidateCache();
        
        // Log opening information when position changes
        if (this.knowledgeInitialized && this.currentGameState) {
            const openingInfo = this.getOpeningKnowledge();
            if (openingInfo && openingInfo.available) {
                console.log('🎯 Opening detected:', openingInfo.opening.name, `(${openingInfo.opening.eco})`);
            }
        }
    }

    /**
     * Add event to game history with timestamp
     */
    addToGameHistory(type, data = null) {
        const historyEntry = {
            type,
            data,
            timestamp: new Date().toISOString(),
            gameState: this.currentGameState ? {
                fen: this.currentGameState.fen,
                turn: this.currentGameState.turn,
                moveCount: this.currentGameState.moveCount,
                isCheck: this.currentGameState.isCheck,
                isCheckmate: this.currentGameState.isCheckmate,
                isStalemate: this.currentGameState.isStalemate
            } : null
        };

        this.gameHistory.push(historyEntry);

        // Keep last 50 history entries to prevent memory bloat
        if (this.gameHistory.length > 50) {
            this.gameHistory = this.gameHistory.slice(-50);
        }
    }

    /**
     * Get comprehensive context for AI - with caching for performance
     */
    getContextForAI() {
        const now = Date.now();
        
        // Return cached context if still valid
        if (this.cachedContext && (now - this.lastUpdateTime) < this.cacheTimeout) {
            return this.cachedContext;
        }

        // Generate fresh context
        this.cachedContext = this.generateFullContext();
        this.lastUpdateTime = now;
        
        return this.cachedContext;
    }

    /**
     * Generate comprehensive context object for AI
     */
    generateFullContext() {
        if (!this.isInitialized || !this.currentGameState) {
            return {
                available: false,
                error: "Game state not available"
            };
        }

        const context = {
            available: true,
            timestamp: new Date().toISOString(),
            
            // Current position
            currentPosition: {
                fen: this.currentGameState.fen,
                turn: this.currentGameState.turn === 'w' ? 'White' : 'Black',
                moveNumber: this.currentGameState.moveCount,
                halfMoveClock: this.extractHalfMoveClock(),
                castlingRights: this.extractCastlingRights(),
                enPassantSquare: this.extractEnPassantSquare()
            },

            // Game status
            gameStatus: {
                isCheck: this.currentGameState.isCheck,
                isCheckmate: this.currentGameState.isCheckmate,
                isStalemate: this.currentGameState.isStalemate,
                isDraw: this.currentGameState.isDraw,
                isGameOver: this.currentGameState.isGameOver,
                legalMovesCount: this.currentGameState.legalMoves.length
            },

            // Move history in readable format
            moveHistory: this.formatMoveHistory(),

            // Recent game events
            recentHistory: this.getRecentGameEvents(5),

            // Board state
            boardState: {
                orientation: this.boardManager ? this.boardManager.getOrientation() : 'white',
                selectedSquare: this.boardManager ? this.boardManager.getSelectedSquare() : null
            },

            // Engine analysis if available
            analysis: this.lastAnalysis ? {
                evaluation: this.lastAnalysis.score,
                depth: this.lastAnalysis.depth,
                bestMove: this.lastAnalysis.bestMove,
                principalVariation: this.lastAnalysis.principalVariation,
                nodes: this.lastAnalysis.nodes,
                analysisTime: this.lastAnalysis.time
            } : null,

            // Strategic position info
            positionInfo: this.analyzePositionCharacteristics(),

            // NEW: Opening knowledge
            openingKnowledge: this.getOpeningKnowledge()
        };

        return context;
    }

    /**
     * NEW: Get opening knowledge for current position
     */
    getOpeningKnowledge() {
        if (!this.knowledgeInitialized || !this.currentGameState) {
            return {
                available: false,
                reason: "Knowledge system not initialized"
            };
        }

        try {
            const openingInfo = this.openingKnowledge.getOpeningInfo(this.currentGameState.fen);
            
            if (openingInfo) {
                return {
                    available: true,
                    opening: openingInfo,
                    formatted: this.openingKnowledge.formatForLLM(openingInfo),
                    advice: this.generateOpeningAdvice(openingInfo)
                };
            }
            
            return {
                available: false,
                reason: "Position not in opening database"
            };
            
        } catch (error) {
            console.error('❌ GameStateContextBridge: Error getting opening knowledge:', error);
            return {
                available: false,
                error: error.message
            };
        }
    }

    /**
     * NEW: Generate position-specific opening advice
     */
    generateOpeningAdvice(openingInfo) {
        const advice = [];
        
        // Basic opening principles based on move count
        if (openingInfo.moveCount <= 3) {
            advice.push("Focus on controlling the center and developing pieces");
        }
        
        if (openingInfo.moveCount <= 6 && openingInfo.moveCount > 3) {
            advice.push("Consider castling for king safety");
        }

        if (openingInfo.moveCount <= 10 && openingInfo.moveCount > 6) {
            advice.push("Complete development before launching attacks");
        }
        
        // Opening-specific advice
        if (openingInfo.strategicThemes && openingInfo.strategicThemes.length > 0) {
            advice.push(`Key themes for this opening: ${openingInfo.strategicThemes.join(', ')}`);
        }

        // Category-specific advice
        const category = openingInfo.category;
        if (category === 'Open Games') {
            advice.push("In open games, rapid development and tactical awareness are crucial");
        } else if (category === 'Semi-Open Games') {
            advice.push("Look for counterplay and asymmetrical pawn structures");
        } else if (category === 'Closed Games') {
            advice.push("Focus on strategic maneuvering and pawn structure");
        }
        
        return advice;
    }

    /**
     * Format move history for AI consumption
     */
    formatMoveHistory() {
        if (!this.currentGameState.history) return [];

        const history = this.currentGameState.history;
        const formattedHistory = [];

        for (let i = 0; i < history.length; i += 2) {
            const moveNumber = Math.floor(i / 2) + 1;
            const whiteMove = history[i];
            const blackMove = history[i + 1];

            const moveEntry = {
                moveNumber,
                white: whiteMove ? {
                    san: whiteMove.san,
                    from: whiteMove.from,
                    to: whiteMove.to,
                    piece: whiteMove.piece,
                    captured: whiteMove.captured || null,
                    promotion: whiteMove.promotion || null,
                    flags: whiteMove.flags
                } : null,
                black: blackMove ? {
                    san: blackMove.san,
                    from: blackMove.from,
                    to: blackMove.to,
                    piece: blackMove.piece,
                    captured: blackMove.captured || null,
                    promotion: blackMove.promotion || null,
                    flags: blackMove.flags
                } : null
            };

            formattedHistory.push(moveEntry);
        }

        return formattedHistory;
    }

    /**
     * Get recent game events for context
     */
    getRecentGameEvents(count = 5) {
        return this.gameHistory.slice(-count);
    }

    /**
     * Analyze position characteristics for AI context
     */
    analyzePositionCharacteristics() {
        if (!this.currentGameState) return null;

        const moves = this.currentGameState.legalMoves;
        const history = this.currentGameState.history;

        return {
            gamePhase: this.determineGamePhase(),
            moveCount: history.length,
            legalMoves: moves.length,
            hasRecentCapture: this.hasRecentCapture(),
            hasRecentCheck: this.hasRecentCheck(),
            materialBalance: this.calculateMaterialBalance(),
            castlingStatus: this.analyzeCastlingStatus()
        };
    }

    /**
     * Determine game phase based on move count and material
     */
    determineGamePhase() {
        const moveCount = this.currentGameState.history.length;
        
        if (moveCount < 20) return 'opening';
        if (moveCount < 40) return 'middlegame';
        return 'endgame';
    }

    /**
     * Check if there was a recent capture
     */
    hasRecentCapture() {
        const history = this.currentGameState.history;
        if (history.length === 0) return false;
        
        const lastMove = history[history.length - 1];
        return !!lastMove.captured;
    }

    /**
     * Check if there was a recent check
     */
    hasRecentCheck() {
        // This could be enhanced to look at previous positions
        return this.currentGameState.isCheck;
    }

    /**
     * Calculate approximate material balance
     */
    calculateMaterialBalance() {
        // This would require piece counting from FEN
        // For now, return placeholder
        return { white: 0, black: 0, difference: 0 };
    }

    /**
     * Analyze castling status
     */
    analyzeCastlingStatus() {
        const fen = this.currentGameState.fen;
        const parts = fen.split(' ');
        const castling = parts[2];

        return {
            whiteKingside: castling.includes('K'),
            whiteQueenside: castling.includes('Q'),
            blackKingside: castling.includes('k'),
            blackQueenside: castling.includes('q')
        };
    }

    /**
     * Extract half-move clock from FEN
     */
    extractHalfMoveClock() {
        const fen = this.currentGameState.fen;
        const parts = fen.split(' ');
        return parseInt(parts[4]) || 0;
    }

    /**
     * Extract castling rights from FEN
     */
    extractCastlingRights() {
        const fen = this.currentGameState.fen;
        const parts = fen.split(' ');
        return parts[2] || '-';
    }

    /**
     * Extract en passant square from FEN
     */
    extractEnPassantSquare() {
        const fen = this.currentGameState.fen;
        const parts = fen.split(' ');
        return parts[3] || '-';
    }

    /**
     * Invalidate context cache
     */
    invalidateCache() {
        this.cachedContext = null;
        this.lastUpdateTime = 0;
    }

    /**
     * Get simplified context for quick updates
     */
    getSimpleContext() {
        if (!this.currentGameState) return null;

        return {
            fen: this.currentGameState.fen,
            turn: this.currentGameState.turn === 'w' ? 'White' : 'Black',
            moveCount: this.currentGameState.moveCount,
            isCheck: this.currentGameState.isCheck,
            isGameOver: this.currentGameState.isGameOver,
            lastMove: this.getLastMoveDescription()
        };
    }

    /**
     * Get human-readable description of last move
     */
    getLastMoveDescription() {
        const history = this.currentGameState.history;
        if (history.length === 0) return null;

        const lastMove = history[history.length - 1];
        return {
            san: lastMove.san,
            description: `${lastMove.piece.toUpperCase()} from ${lastMove.from} to ${lastMove.to}`,
            captured: lastMove.captured || null
        };
    }

    /**
     * Check if bridge is ready
     */
    isReady() {
        return this.isInitialized && this.currentGameState !== null;
    }

    /**
     * NEW: Check if knowledge systems are ready
     */
    isKnowledgeReady() {
        return this.knowledgeInitialized;
    }

    /**
     * NEW: Search openings by name (for user queries)
     */
    searchOpenings(searchTerm) {
        if (!this.knowledgeInitialized) {
            return [];
        }
        
        return this.openingKnowledge.searchByName(searchTerm);
    }
}

// Make it available globally
window.GameStateContextBridge = GameStateContextBridge;