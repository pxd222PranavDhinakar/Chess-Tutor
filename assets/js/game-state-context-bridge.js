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

    /**
     * SAFE VERSION - Replace the methods in GameStateContextBridge with these fixed versions
     */

    /**
     * Generate human-readable board representation for AI - SAFE VERSION
     */
    generateBoardRepresentation() {
        if (!this.currentGameState) return null;

        try {
            // Get the chess instance from game engine safely
            const chess = this.gameEngine && this.gameEngine.game ? this.gameEngine.game : null;
            
            if (!chess) {
                console.warn('No chess instance available for board representation');
                return "Board representation not available - no chess instance";
            }

            // Create visual board representation using FEN parsing instead of board() method
            const fen = chess.fen();
            const boardState = this.parseFenForBoard(fen);
            
            let boardVisual = "\n=== BOARD POSITION ===\n";
            boardVisual += "  a b c d e f g h\n";
            
            for (let rank = 8; rank >= 1; rank--) {
                boardVisual += `${rank} `;
                for (let file of 'abcdefgh') {
                    const square = file + rank;
                    const piece = boardState[square];
                    if (piece) {
                        const symbol = this.getPieceSymbol(piece);
                        boardVisual += `${symbol} `;
                    } else {
                        boardVisual += `. `;
                    }
                }
                boardVisual += `${rank}\n`;
            }
            boardVisual += "  a b c d e f g h\n";

            return boardVisual;
            
        } catch (error) {
            console.error('Error generating board representation:', error);
            return "Board representation failed - " + error.message;
        }
    }

    /**
     * Parse FEN to get board state - SAFE HELPER METHOD
     */
    parseFenForBoard(fen) {
        const boardState = {};
        
        if (!fen) return boardState;
        
        const fenParts = fen.split(' ');
        const position = fenParts[0];
        const ranks = position.split('/');
        
        for (let rankIndex = 0; rankIndex < 8; rankIndex++) {
            const rank = 8 - rankIndex; // Convert to 1-8 rank numbering
            const rankString = ranks[rankIndex];
            let fileIndex = 0;
            
            for (let char of rankString) {
                if (isNaN(char)) {
                    // It's a piece
                    const file = String.fromCharCode(97 + fileIndex); // 'a' + fileIndex
                    const square = file + rank;
                    boardState[square] = {
                        type: char.toLowerCase(),
                        color: char === char.toUpperCase() ? 'w' : 'b'
                    };
                    fileIndex++;
                } else {
                    // It's a number indicating empty squares
                    fileIndex += parseInt(char);
                }
            }
        }
        
        return boardState;
    }

    /**
     * Get piece layout by square for AI understanding - SAFE VERSION
     */
    generatePieceLayout() {
        if (!this.currentGameState) return null;

        try {
            const chess = this.gameEngine && this.gameEngine.game ? this.gameEngine.game : null;
            
            if (!chess) {
                return {
                    white: { pieces: [], positions: {} },
                    black: { pieces: [], positions: {} },
                    error: "No chess instance available"
                };
            }

            const pieces = {
                white: { pieces: [], positions: {} },
                black: { pieces: [], positions: {} }
            };

            // Parse FEN to get piece positions safely
            const fen = chess.fen();
            const boardState = this.parseFenForBoard(fen);
            
            Object.entries(boardState).forEach(([square, piece]) => {
                const color = piece.color === 'w' ? 'white' : 'black';
                const pieceInfo = {
                    type: this.getPieceFullName(piece.type),
                    square: square,
                    symbol: this.getPieceSymbol(piece)
                };
                
                pieces[color].pieces.push(pieceInfo);
                pieces[color].positions[square] = pieceInfo;
            });

            return pieces;
            
        } catch (error) {
            console.error('Error generating piece layout:', error);
            return {
                white: { pieces: [], positions: {} },
                black: { pieces: [], positions: {} },
                error: error.message
            };
        }
    }

    /**
     * Generate comprehensive legal moves analysis - SAFE VERSION
     */
    generateLegalMovesAnalysis() {
        if (!this.currentGameState) return null;

        try {
            const chess = this.gameEngine && this.gameEngine.game ? this.gameEngine.game : null;
            
            if (!chess) {
                return {
                    totalMoves: 0,
                    byPiece: {},
                    captures: [],
                    checks: [],
                    castling: [],
                    promotions: [],
                    detailed: [],
                    error: "No chess instance available"
                };
            }

            // Try to get moves - handle different Chess.js versions
            let legalMoves = [];
            try {
                legalMoves = chess.moves({ verbose: true });
            } catch (e) {
                try {
                    // Fallback - try simple moves and create verbose format
                    const simpleMoves = chess.moves();
                    legalMoves = simpleMoves.map(move => ({ san: move }));
                } catch (e2) {
                    console.error('Unable to get legal moves:', e2);
                    return {
                        totalMoves: 0,
                        byPiece: {},
                        captures: [],
                        checks: [],
                        castling: [],
                        promotions: [],
                        detailed: [],
                        error: "Unable to get legal moves"
                    };
                }
            }
            
            const movesAnalysis = {
                totalMoves: legalMoves.length,
                byPiece: {},
                captures: [],
                checks: [],
                castling: [],
                promotions: [],
                detailed: []
            };

            legalMoves.forEach(move => {
                try {
                    // Handle both verbose and simple move formats
                    const moveInfo = {
                        from: move.from || 'unknown',
                        to: move.to || 'unknown', 
                        san: move.san || move,
                        piece: move.piece ? this.getPieceFullName(move.piece) : 'unknown',
                        isCapture: !!(move.captured || (move.san && move.san.includes('x'))),
                        isCheck: !!(move.san && (move.san.includes('+') || move.san.includes('#'))),
                        isCheckmate: !!(move.san && move.san.includes('#')),
                        capturedPiece: move.captured ? this.getPieceFullName(move.captured) : null
                    };

                    // Categorize by piece type
                    const pieceType = moveInfo.piece;
                    if (!movesAnalysis.byPiece[pieceType]) {
                        movesAnalysis.byPiece[pieceType] = [];
                    }
                    movesAnalysis.byPiece[pieceType].push(moveInfo);
                    movesAnalysis.detailed.push(moveInfo);

                    // Special move categories
                    if (moveInfo.isCapture) {
                        movesAnalysis.captures.push(moveInfo);
                    }
                    if (moveInfo.isCheck) {
                        movesAnalysis.checks.push(moveInfo);
                    }
                    if (move.san && (move.san.includes('O-O') || move.san.includes('0-0'))) {
                        movesAnalysis.castling.push(moveInfo);
                    }
                    if (move.promotion) {
                        movesAnalysis.promotions.push(moveInfo);
                    }
                } catch (moveError) {
                    console.warn('Error processing move:', move, moveError);
                }
            });

            return movesAnalysis;
            
        } catch (error) {
            console.error('Error generating legal moves analysis:', error);
            return {
                totalMoves: 0,
                byPiece: {},
                captures: [],
                checks: [],
                castling: [],
                promotions: [],
                detailed: [],
                error: error.message
            };
        }
    }

    /**
     * Helper methods - SAFE VERSIONS
     */
    getPieceSymbol(piece) {
        const symbols = {
            'p': piece.color === 'w' ? '♙' : '♟',
            'r': piece.color === 'w' ? '♖' : '♜',
            'n': piece.color === 'w' ? '♘' : '♞',
            'b': piece.color === 'w' ? '♗' : '♝',
            'q': piece.color === 'w' ? '♕' : '♛',
            'k': piece.color === 'w' ? '♔' : '♚'
        };
        return symbols[piece.type] || '?';
    }

    getPieceFullName(pieceType) {
        const names = {
            'p': 'pawn',
            'r': 'rook', 
            'n': 'knight',
            'b': 'bishop',
            'q': 'queen',
            'k': 'king'
        };
        return names[pieceType] || pieceType;
    }

    /**
     * Enhanced context generation with comprehensive board understanding - SAFE VERSION
     */
    generateEnhancedContext() {
        if (!this.isInitialized || !this.currentGameState) {
            return {
                available: false,
                error: "Game state not available"
            };
        }

        try {
            const context = {
                available: true,
                timestamp: new Date().toISOString(),
                
                // Visual board representation
                boardVisual: this.generateBoardRepresentation(),
                
                // Piece positions and layout
                pieceLayout: this.generatePieceLayout(),
                
                // Comprehensive legal moves analysis
                legalMoves: this.generateLegalMovesAnalysis(),
                
                // Current position basics
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
                    legalMovesCount: this.currentGameState.legalMoves ? this.currentGameState.legalMoves.length : 0
                },

                // Move history in readable format
                moveHistory: this.formatMoveHistory(),

                // Opening knowledge
                openingKnowledge: this.getOpeningKnowledge(),

                // Position characteristics
                positionInfo: this.analyzePositionCharacteristics()
            };

            return context;
            
        } catch (error) {
            console.error('Error generating enhanced context:', error);
            return {
                available: false,
                error: "Enhanced context generation failed: " + error.message
            };
        }
    }

    /**
     * Format enhanced context for LLM consumption - SAFE VERSION
     */
    formatEnhancedContextForLLM() {
        try {
            const context = this.generateEnhancedContext();
            
            if (!context.available) {
                return `Current Game State: Not available (${context.error || 'Unknown error'})`;
            }

            let formatted = "=== ENHANCED GAME CONTEXT ===\n\n";
            
            // Board visualization
            if (context.boardVisual && !context.boardVisual.includes('failed')) {
                formatted += context.boardVisual + "\n";
            } else {
                formatted += "Board visualization not available\n\n";
            }
            
            // Current turn and status
            formatted += `Turn: ${context.currentPosition.turn} to move\n`;
            formatted += `Move Number: ${context.currentPosition.moveNumber}\n`;
            formatted += `Legal Moves Available: ${context.gameStatus.legalMovesCount}\n\n`;
            
            // Piece positions
            if (context.pieceLayout && !context.pieceLayout.error) {
                formatted += "=== PIECE POSITIONS ===\n";
                formatted += `White pieces: ${context.pieceLayout.white.pieces.map(p => `${p.type} on ${p.square}`).join(', ')}\n`;
                formatted += `Black pieces: ${context.pieceLayout.black.pieces.map(p => `${p.type} on ${p.square}`).join(', ')}\n\n`;
            }
            
            // Legal moves analysis
            if (context.legalMoves && !context.legalMoves.error && context.legalMoves.totalMoves > 0) {
                formatted += "=== AVAILABLE MOVES ===\n";
                
                Object.entries(context.legalMoves.byPiece).forEach(([piece, moves]) => {
                    if (moves.length > 0) {
                        formatted += `${piece.charAt(0).toUpperCase() + piece.slice(1)} moves: `;
                        formatted += moves.map(m => {
                            if (m.from && m.to && m.from !== 'unknown' && m.to !== 'unknown') {
                                return `${m.from}-${m.to}`;
                            } else {
                                return m.san;
                            }
                        }).join(', ') + '\n';
                    }
                });
                
                if (context.legalMoves.captures.length > 0) {
                    formatted += `\nCapture opportunities: `;
                    formatted += context.legalMoves.captures.map(m => {
                        if (m.from && m.to && m.from !== 'unknown' && m.to !== 'unknown') {
                            return `${m.from}x${m.to}${m.capturedPiece ? ' (takes ' + m.capturedPiece + ')' : ''}`;
                        } else {
                            return m.san;
                        }
                    }).join(', ') + '\n';
                }
                
                if (context.legalMoves.checks.length > 0) {
                    formatted += `\nChecking moves: `;
                    formatted += context.legalMoves.checks.map(m => {
                        if (m.from && m.to && m.from !== 'unknown' && m.to !== 'unknown') {
                            return `${m.from}-${m.to}`;
                        } else {
                            return m.san;
                        }
                    }).join(', ') + '\n';
                }
            }
            
            // Opening information
            if (context.openingKnowledge && context.openingKnowledge.available) {
                formatted += `\n=== OPENING ===\n`;
                formatted += `Opening: ${context.openingKnowledge.opening.name} (${context.openingKnowledge.opening.eco})\n`;
                formatted += `Moves so far: ${context.openingKnowledge.opening.moves}\n`;
            }
            
            formatted += "\n=== END ENHANCED CONTEXT ===\n";
            
            return formatted;
            
        } catch (error) {
            console.error('Error formatting enhanced context for LLM:', error);
            return `Enhanced Game Context: Error formatting context - ${error.message}`;
        }
    }
}

// Make it available globally
window.GameStateContextBridge = GameStateContextBridge;