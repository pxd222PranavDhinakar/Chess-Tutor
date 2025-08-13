/**
 * GameEngine - Core chess logic and game state management
 * Handles Chess.js integration, move validation, and game state
 */

class GameEngine {
    constructor() {
        this.game = null;
        this.Chess = null;
        this.eventListeners = {};
        this.lastMove = null;
        this.moveHistory = [];
    }

    /**
     * Initialize the chess engine with proper dependency loading
     */
    async initialize() {
        try {
            await this.loadChessJS();
            this.game = new this.Chess();
            this.emit('engine-ready');
            return true;
        } catch (error) {
            this.emit('engine-error', { error: error.message });
            return false;
        }
    }

    /**
     * Load Chess.js library with multiple fallback methods
     */
    async loadChessJS() {
        let chessModule, testGame;
        
        try {
            // Method 1: Try modern import
            chessModule = require('chess.js');
            this.Chess = chessModule.Chess;
            testGame = new this.Chess();
        } catch (e1) {
            try {
                // Method 2: Try direct import
                this.Chess = require('chess.js');
                testGame = new this.Chess();
            } catch (e2) {
                try {
                    // Method 3: Try fallback import
                    chessModule = require('chess.js');
                    this.Chess = chessModule.Chess || chessModule.default || chessModule;
                    testGame = new this.Chess();
                } catch (e3) {
                    throw new Error(`Chess.js loading failed: ${e1.message} | ${e2.message} | ${e3.message}`);
                }
            }
        }

        // Verify the chess instance works
        if (!testGame || typeof testGame.turn !== 'function') {
            throw new Error('Chess.js loaded but not functioning correctly');
        }

        this.emit('chess-loaded', { 
            turn: testGame.turn(), 
            moves: testGame.moves().length 
        });
    }

    /**
     * Attempt to make a move
     */
    makeMove(from, to, promotion = null) {
        if (!this.game) {
            throw new Error('Game engine not initialized');
        }

        const moveObj = { from, to };
        
        // Handle pawn promotion
        if (promotion) {
            moveObj.promotion = promotion;
        } else {
            // Auto-promote pawns to queen
            const piece = this.game.get(from);
            if (piece && piece.type === 'p' && (to[1] === '8' || to[1] === '1')) {
                moveObj.promotion = 'q';
            }
        }

        try {
            const move = this.game.move(moveObj);
            
            if (move) {
                this.lastMove = move;
                this.moveHistory.push(move);
                
                this.emit('move-made', {
                    move: move,
                    fen: this.game.fen(),
                    turn: this.game.turn(),
                    gameState: this.getGameState()
                });
                
                return move;
            } else {
                this.emit('move-invalid', { from, to });
                return null;
            }
        } catch (error) {
            this.emit('move-error', { error: error.message, from, to });
            throw error;
        }
    }

    /**
     * Undo the last move
     */
    undoMove() {
        if (!this.game || this.game.history().length === 0) {
            return null;
        }

        const undoneMove = this.game.undo();
        this.moveHistory.pop();
        
        // Update last move to previous move
        const history = this.game.history({ verbose: true });
        this.lastMove = history.length > 0 ? history[history.length - 1] : null;

        this.emit('move-undone', {
            undoneMove: undoneMove,
            fen: this.game.fen(),
            turn: this.game.turn(),
            gameState: this.getGameState()
        });

        return undoneMove;
    }

    /**
     * Reset the game to starting position
     */
    resetGame() {
        if (!this.game) return;

        this.game.reset();
        this.lastMove = null;
        this.moveHistory = [];

        this.emit('game-reset', {
            fen: this.game.fen(),
            turn: this.game.turn(),
            gameState: this.getGameState()
        });
    }

    /**
     * Load position from FEN notation - ROBUST VERSION FOR CHESS.JS v1.0.0
     */
    loadFen(fen) {
        if (!this.game || !fen) {
            console.error('GameEngine: No game instance or FEN provided');
            return false;
        }

        try {
            console.log('GameEngine: Attempting to load FEN:', fen);
            
            // First, let's test what methods are available on the chess instance
            console.log('GameEngine: Available methods:', Object.getOwnPropertyNames(this.game));
            console.log('GameEngine: Chess.js constructor:', this.Chess);
            
            // Try to create a new instance with the FEN
            let testGame;
            try {
                // Method 1: Try constructor with FEN
                testGame = new this.Chess(fen);
                console.log('GameEngine: Constructor with FEN succeeded');
            } catch (e1) {
                console.log('GameEngine: Constructor with FEN failed:', e1.message);
                try {
                    // Method 2: Try load method
                    testGame = new this.Chess();
                    const loadResult = testGame.load(fen);
                    console.log('GameEngine: Load method result:', loadResult);
                    if (!loadResult) {
                        console.error('GameEngine: Load method returned false');
                        return false;
                    }
                } catch (e2) {
                    console.error('GameEngine: Both methods failed:', e1.message, e2.message);
                    return false;
                }
            }

            // If we get here, one of the methods worked
            // Replace our current game instance
            this.game = testGame;
            
            // Verify the FEN was loaded correctly
            const currentFen = this.game.fen();
            console.log('GameEngine: Current FEN after load:', currentFen);
            
            // Update internal state
            const history = this.game.history({ verbose: true });
            this.lastMove = history.length > 0 ? history[history.length - 1] : null;
            this.moveHistory = [...history];
            
            this.emit('position-loaded', {
                fen: currentFen,
                turn: this.game.turn(),
                gameState: this.getGameState()
            });
            
            console.log('GameEngine: FEN loaded successfully');
            return true;
            
        } catch (error) {
            console.error('GameEngine: Error loading FEN:', error);
            console.error('GameEngine: Error stack:', error.stack);
            this.emit('fen-load-error', { error: error.message, fen });
            return false;
        }
    }

    /**
     * Get current game state information
     */
    getGameState() {
        if (!this.game) return null;

        return {
            turn: this.game.turn(),
            fen: this.game.fen(),
            history: this.game.history({ verbose: true }),
            isCheck: this.game.isCheck ? this.game.isCheck() : false,
            isCheckmate: this.game.isCheckmate ? this.game.isCheckmate() : false,
            isStalemate: this.game.isStalemate ? this.game.isStalemate() : false,
            isDraw: this.game.isDraw ? this.game.isDraw() : false,
            isGameOver: this.game.isGameOver ? this.game.isGameOver() : false,
            legalMoves: this.game.moves(),
            moveCount: Math.floor(this.game.history().length / 2) + 1
        };
    }

    /**
     * Get possible moves for a specific square
     */
    getPossibleMoves(square) {
        if (!this.game) return [];
        return this.game.moves({ square: square, verbose: true });
    }

    /**
     * Get piece at a specific square
     */
    getPiece(square) {
        if (!this.game) return null;
        return this.game.get(square);
    }

    /**
     * Get the last move made
     */
    getLastMove() {
        return this.lastMove;
    }

    /**
     * Check if it's a specific color's turn
     */
    isPlayerTurn(color) {
        if (!this.game) return false;
        return this.game.turn() === color;
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
window.GameEngine = GameEngine;