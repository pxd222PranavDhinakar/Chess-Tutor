/**
 * BoardManager - Chess board rendering and piece interaction
 * Uses chessboard.js native infrastructure for highlighting
 * FIXED: Prevents right-click from triggering piece dragging
 */

class BoardManager {
    constructor() {
        this.board = null;
        this.selectedSquare = null;
        this.eventListeners = {};
        this.config = {
            draggable: true,
            position: 'start',
            pieceTheme: 'assets/img/chesspieces/wikipedia/{piece}.png'
        };
        
        this.clickInProgress = false;
        this.lastMouseButton = null; // Track which mouse button was pressed
    }

    /**
     * Initialize the chess board
     */
    async initialize(gameEngine) {
        this.gameEngine = gameEngine;
        
        try {
            await this.loadChessboard();
            this.setupBoard();
            this.setupClickHandlers();
            
            this.emit('board-ready');
            return true;
        } catch (error) {
            this.emit('board-error', { error: error.message });
            return false;
        }
    }

    /**
     * Load chessboard.js library with proper dependency checking
     */
    async loadChessboard() {
        // Ensure jQuery is available
        if (typeof window.jQuery === 'undefined') {
            const $ = require('jquery');
            window.$ = window.jQuery = $;
        }

        // Wait for chessboard to be available
        let attempts = 0;
        const maxAttempts = 10;

        while (typeof window.Chessboard === 'undefined' && attempts < maxAttempts) {
            await new Promise(resolve => setTimeout(resolve, 200));
            attempts++;
        }

        if (typeof window.Chessboard === 'undefined') {
            throw new Error('Chessboard.js library not loaded');
        }

        this.emit('chessboard-loaded');
    }

    /**
     * Setup the chess board with configuration
     */
    setupBoard() {
        // Ensure the board element exists
        const boardElement = document.getElementById('board');
        if (!boardElement) {
            throw new Error('Board element with ID "board" not found');
        }

        const boardConfig = {
            ...this.config,
            onDragStart: this.onDragStart.bind(this),
            onDrop: this.onDrop.bind(this),
            onSnapEnd: this.onSnapEnd.bind(this)
        };

        this.board = window.Chessboard(boardElement, boardConfig);
        this.emit('board-initialized');
    }

    /**
     * Setup click event handlers for piece selection
     */
    setupClickHandlers() {
        const boardElement = document.getElementById('board');
        if (!boardElement) return;

        // CRITICAL: Capture mousedown in the CAPTURE phase to intercept before chessboard.js
        boardElement.addEventListener('mousedown', (e) => {
            console.log(`Mouse down: button=${e.button}, target=${e.target.className}`);
            this.lastMouseButton = e.button;
            
            // If it's a right-click, we need to prevent chessboard.js from seeing it
            // but NOT prevent our annotation system from seeing it
            if (e.button === 2) {
                console.log('Right-click detected, will prevent chessboard.js drag but allow annotations');
                // Don't stop propagation here - let annotations handle it
                // Just mark that this was a right-click for onDragStart
            }
        }, true); // TRUE = capture phase, fires before chessboard.js handlers

        // Handle ALL click events here - both left and right
        boardElement.addEventListener('click', (e) => {
            // COMPLETELY IGNORE right clicks for piece movement
            if (e.button === 2 || this.lastMouseButton === 2) {
                console.log('Right-click detected in click handler, ignoring for piece movement');
                // Don't stop propagation - let annotations handle it
                return; // Exit early, don't process right-clicks at all
            }

            // Only handle left clicks for piece movement
            if (e.button === 0 || this.lastMouseButton === 0) {
                const square = this.getClickedSquare(e);
                console.log('Left-click on square:', square, 'selectedSquare:', this.selectedSquare);
                
                if (square) {
                    this.handleSquareClick(square);
                }
            }
        });

        // Also prevent any other click handlers from interfering with right-clicks
        boardElement.addEventListener('contextmenu', (e) => {
            e.preventDefault(); // Prevent context menu
        });

        this.emit('click-handlers-ready');
    }

    /**
     * Calculate which square was clicked
     */
    getClickedSquare(event) {
        const boardRect = document.getElementById('board').getBoundingClientRect();
        const x = event.clientX - boardRect.left;
        const y = event.clientY - boardRect.top;
        
        const squareSize = boardRect.width / 8;
        const isFlipped = this.board.orientation() === 'black';
        
        let file, rank;
        if (isFlipped) {
            file = 7 - Math.floor(x / squareSize);
            rank = Math.floor(y / squareSize);
        } else {
            file = Math.floor(x / squareSize);
            rank = 7 - Math.floor(y / squareSize);
        }
        
        // Convert to chess notation
        const square = String.fromCharCode(97 + file) + (rank + 1);
        
        // Only return valid squares
        if (file >= 0 && file < 8 && rank >= 0 && rank < 8) {
            return square;
        }
        
        return null;
    }

    // ===== NATIVE SQUARE HIGHLIGHTING METHODS =====
    
    /**
     * Get chessboard.js square element
     */
    getSquareElement(square) {
        return $(`#board .square-${square}`);
    }

    /**
     * Add CSS class to a specific square
     */
    addSquareClass(square, className) {
        const squareEl = this.getSquareElement(square);
        if (squareEl.length > 0) {
            squareEl.addClass(className);
            console.log(`BoardManager: Added class '${className}' to square ${square}`);
            return true;
        }
        console.warn(`BoardManager: Square element ${square} not found`);
        return false;
    }

    /**
     * Remove CSS class from a specific square
     */
    removeSquareClass(square, className) {
        const squareEl = this.getSquareElement(square);
        if (squareEl.length > 0) {
            squareEl.removeClass(className);
            console.log(`BoardManager: Removed class '${className}' from square ${square}`);
            return true;
        }
        return false;
    }

    /**
     * Clear all instances of a CSS class from the board
     */
    clearSquareClasses(className) {
        $(`#board .square-55d63.${className}`).removeClass(className);
        console.log(`BoardManager: Cleared all '${className}' classes from board`);
    }

    /**
     * Check if square has a specific CSS class
     */
    squareHasClass(square, className) {
        const squareEl = this.getSquareElement(square);
        return squareEl.length > 0 && squareEl.hasClass(className);
    }

    /**
     * Toggle CSS class on a square
     */
    toggleSquareClass(square, className) {
        if (this.squareHasClass(square, className)) {
            this.removeSquareClass(square, className);
            return false;
        } else {
            this.addSquareClass(square, className);
            return true;
        }
    }

    /**
     * Clear all highlighting classes
     */
    clearAllHighlights() {
        this.clearSquareClasses('last-move-from');
        this.clearSquareClasses('last-move-to');
        this.clearSquareClasses('selected-highlight');
        this.clearSquareClasses('annotation-highlight');
        console.log('BoardManager: All highlights cleared');
    }

    // ===== EXISTING METHODS (Updated to work with new system) =====

    /**
     * Handle square click events - UPDATED to handle all piece interaction logic
     */
    handleSquareClick(square) {
        // This method should only be called for left-clicks now
        console.log('handleSquareClick called for square:', square);
        
        const piece = this.gameEngine.getPiece(square);
        const gameState = this.gameEngine.getGameState();
        
        if (gameState.isGameOver) {
            this.emit('game-over-click');
            return;
        }
        
        // If clicking on the same square that's already selected, deselect it
        if (this.selectedSquare === square) {
            this.selectedSquare = null;
            this.emit('piece-deselected', { square });
            console.log(`Deselected square: ${square}`);
            return;
        }
        
        // If we have a selected square and click somewhere else, try to move there
        if (this.selectedSquare) {
            console.log(`Attempting move from ${this.selectedSquare} to ${square}`);
            this.attemptMove(this.selectedSquare, square);
            return; // Don't continue to piece selection logic
        }
        
        // If there's a piece and it's the current player's turn, select it
        if (piece && this.gameEngine.isPlayerTurn(piece.color)) {
            this.selectedSquare = square;
            this.emit('piece-selected', { 
                square, 
                piece, 
                possibleMoves: this.gameEngine.getPossibleMoves(square) 
            });
            console.log(`Selected piece: ${piece.type} on ${square}`);
            return;
        }
        
        // If clicked on empty square or opponent piece with no selection, do nothing
        console.log('Click on empty square or opponent piece with no selection');
    }

    /**
     * Attempt to make a move
     */
    attemptMove(from, to) {
        console.log('attemptMove called:', { from, to }); // DEBUG
        
        try {
            const move = this.gameEngine.makeMove(from, to);
            console.log('makeMove result:', move); // DEBUG
            
            if (move) {
                console.log('Move successful, clearing selection'); // DEBUG
                this.selectedSquare = null;
                this.updatePosition();
                this.emit('move-completed', { move, from, to });
            } else {
                console.log('Move failed - invalid move'); // DEBUG
                this.emit('move-failed', { from, to });
            }
        } catch (error) {
            console.log('Move error:', error); // DEBUG
            this.emit('move-error', { error: error.message, from, to });
        }
    }

    /**
     * Drag start handler - FIXED to prevent right-click dragging
     */
    onDragStart(source, piece, position, orientation) {
        console.log(`onDragStart called: source=${source}, piece=${piece}, lastMouseButton=${this.lastMouseButton}`);
        
        // CRITICAL FIX: Prevent dragging if right mouse button was pressed
        if (this.lastMouseButton === 2) {
            console.log('Right-click detected in onDragStart, preventing drag start');
            return false;
        }

        // Also check if lastMouseButton is null (timing issue) and there's ongoing annotation
        if (this.lastMouseButton === null) {
            console.log('Mouse button unknown, checking for recent right-click activity');
            // If we can't determine the mouse button, be safe and block
            return false;
        }

        const gameState = this.gameEngine.getGameState();
        
        if (gameState.isGameOver) {
            this.emit('drag-game-over');
            return false;
        }

        if (!this.gameEngine.isPlayerTurn(piece.charAt(0))) {
            this.emit('drag-wrong-turn', { piece });
            return false;
        }
        
        console.log('Allowing drag start for left-click');
        this.selectedSquare = source;
        this.emit('piece-selected', { 
            square: source, 
            piece: this.gameEngine.getPiece(source), 
            possibleMoves: this.gameEngine.getPossibleMoves(source) 
        });
        
        this.emit('drag-started', { source, piece });
        return true;
    }

    /**
     * Drop handler
     */
    onDrop(source, target) {
        try {
            const move = this.gameEngine.makeMove(source, target);
            
            if (move) {
                this.selectedSquare = null;
                this.emit('drop-successful', { move, source, target });
                return;
            } else {
                console.log('Drop failed but keeping selection for click-to-move');
                this.emit('drop-failed', { source, target });
                return 'snapback';
            }
        } catch (error) {
            console.log('Drop error but keeping selection for click-to-move');
            this.emit('drop-error', { error: error.message, source, target });
            return 'snapback';
        }
    }

    /**
     * Snap end handler
     */
    onSnapEnd() {
        this.updatePosition();
    }

    /**
     * Update board position to match game state
     */
    updatePosition() {
        if (this.board && this.gameEngine.game) {
            this.board.position(this.gameEngine.game.fen());
        }
    }

    /**
     * Flip the board orientation
     */
    flip() {
        if (this.board) {
            this.board.flip();
            this.emit('board-flipped');
        }
    }

    /**
     * Clear the board
     */
    clear() {
        if (this.board) {
            this.board.clear();
            this.selectedSquare = null;
            this.clearAllHighlights();
            this.emit('board-cleared');
        }
    }

    /**
     * Set board to starting position
     */
    start() {
        if (this.board) {
            this.board.start();
            this.selectedSquare = null;
            this.clearAllHighlights();
            this.emit('board-started');
        }
    }

    /**
     * Get currently selected square
     */
    getSelectedSquare() {
        return this.selectedSquare;
    }

    /**
     * Get board orientation
     */
    getOrientation() {
        return this.board ? this.board.orientation() : 'white';
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
window.BoardManager = BoardManager;