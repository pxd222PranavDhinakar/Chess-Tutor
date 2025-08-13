/**
 * MoveHighlighter - Visual move indicators and board highlights
 * Uses BoardManager's native square highlighting system with CSS pseudo-elements
 */

class MoveHighlighter {
    constructor() {
        this.boardManager = null;
        this.gameEngine = null;
        this.eventListeners = {};
    }

    /**
     * Initialize the move highlighter
     */
    initialize(boardManager, gameEngine) {
        this.boardManager = boardManager;
        this.gameEngine = gameEngine;
        
        this.setupEventListeners();
        this.emit('highlighter-ready');
    }

    /**
     * Setup event listeners for board and game events
     */
    setupEventListeners() {
        // Listen for piece selection
        this.boardManager.on('piece-selected', (data) => {
            console.log('MoveHighlighter: Piece selected event received:', data);
            this.updateHighlights();
        });

        // Listen for piece deselection
        this.boardManager.on('piece-deselected', (data) => {
            console.log('MoveHighlighter: Piece deselected event received:', data);
            this.clearHighlights();
        });

        // Listen for moves
        this.gameEngine.on('move-made', (data) => {
            this.clearHighlights();
            this.highlightLastMove();
        });

        // Listen for game reset
        this.gameEngine.on('game-reset', (data) => {
            this.clearHighlights();
        });

        // Listen for board flip
        this.boardManager.on('board-flipped', () => {
            // No need for setTimeout - CSS classes work immediately
            this.updateHighlights();
        });
    }

    /**
     * Update all highlights based on current game state
     */
    updateHighlights() {
        this.clearMoveHighlights();
        this.highlightLastMove();
        this.highlightSelectedSquare();
        this.highlightPossibleMoves();
    }

    /**
     * Clear all move-related highlights (not annotations)
     */
    clearMoveHighlights() {
        this.boardManager.clearSquareClasses('last-move-from');
        this.boardManager.clearSquareClasses('last-move-to');
        this.boardManager.clearSquareClasses('selected-highlight');
        this.boardManager.clearSquareClasses('possible-move');
        this.boardManager.clearSquareClasses('capture-move');
        this.boardManager.clearSquareClasses('capture-move-small');
        console.log('MoveHighlighter: Move highlights cleared');
    }

    /**
     * Clear all highlights including annotations
     */
    clearHighlights() {
        this.clearMoveHighlights();
        // Note: We don't clear annotations here as they're user-created
    }

    /**
     * Highlight the last move using native square highlighting
     */
    highlightLastMove() {
        const lastMove = this.gameEngine.getLastMove();
        if (lastMove) {
            this.boardManager.addSquareClass(lastMove.from, 'last-move-from');
            this.boardManager.addSquareClass(lastMove.to, 'last-move-to');
            console.log(`MoveHighlighter: Highlighted last move ${lastMove.from} → ${lastMove.to}`);
        }
    }

    /**
     * Highlight selected square using native square highlighting
     */
    highlightSelectedSquare() {
        const selectedSquare = this.boardManager.getSelectedSquare();
        if (selectedSquare) {
            this.boardManager.addSquareClass(selectedSquare, 'selected-highlight');
            console.log(`MoveHighlighter: Highlighted selected square ${selectedSquare}`);
        }
    }

    /**
     * Show possible moves using CSS pseudo-elements - NEW FEATURE
     */
    highlightPossibleMoves() {
        const selectedSquare = this.boardManager.getSelectedSquare();
        if (!selectedSquare) return;

        const possibleMoves = this.gameEngine.getPossibleMoves(selectedSquare);
        console.log(`MoveHighlighter: Showing ${possibleMoves.length} possible moves for ${selectedSquare}`);
        
        possibleMoves.forEach(move => {
            const targetSquare = move.to;
            const isCapture = move.captured || move.flags.includes('c') || move.flags.includes('e');
            
            if (isCapture) {
                // Add capture circle for squares with enemy pieces
                this.boardManager.addSquareClass(targetSquare, 'capture-move');
                console.log(`MoveHighlighter: Added capture indicator to ${targetSquare}`);
            } else {
                // Add move dot for empty squares
                this.boardManager.addSquareClass(targetSquare, 'possible-move');
                console.log(`MoveHighlighter: Added move dot to ${targetSquare}`);
            }
        });
    }

    /**
     * Clear only possible move indicators (useful for partial updates)
     */
    clearPossibleMoves() {
        this.boardManager.clearSquareClasses('possible-move');
        this.boardManager.clearSquareClasses('capture-move');
        this.boardManager.clearSquareClasses('capture-move-small');
        console.log('MoveHighlighter: Possible move indicators cleared');
    }

    /**
     * Highlight specific moves (useful for showing threats, hints, etc.)
     */
    highlightSpecificMoves(moves, moveType = 'possible-move') {
        moves.forEach(move => {
            const square = typeof move === 'string' ? move : move.to;
            this.boardManager.addSquareClass(square, moveType);
        });
        console.log(`MoveHighlighter: Highlighted ${moves.length} specific moves with type '${moveType}'`);
    }

    /**
     * Advanced highlighting for different move types
     */
    highlightMovesByType(selectedSquare) {
        const possibleMoves = this.gameEngine.getPossibleMoves(selectedSquare);
        
        possibleMoves.forEach(move => {
            const targetSquare = move.to;
            
            // Categorize moves by type
            if (move.flags.includes('c')) {
                // Regular capture
                this.boardManager.addSquareClass(targetSquare, 'capture-move');
            } else if (move.flags.includes('e')) {
                // En passant capture
                this.boardManager.addSquareClass(targetSquare, 'capture-move');
            } else if (move.flags.includes('k') || move.flags.includes('q')) {
                // Castling moves - could have special styling
                this.boardManager.addSquareClass(targetSquare, 'possible-move');
            } else if (move.flags.includes('p')) {
                // Pawn promotion - could have special styling
                this.boardManager.addSquareClass(targetSquare, 'possible-move');
            } else {
                // Regular move
                this.boardManager.addSquareClass(targetSquare, 'possible-move');
            }
        });
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
window.MoveHighlighter = MoveHighlighter;