/**
 * UIUpdater - Synchronizes game state with UI elements
 * Handles status updates, move history, analysis panels, and logging
 * ENHANCED: Now includes engine status updates
 */

class UIUpdater {
    constructor() {
        this.gameEngine = null;
        this.boardManager = null;
        this.stockfishInterface = null;
        this.eventListeners = {};
        this.elements = {};
    }

    /**
     * Initialize the UI updater
     */
    initialize(gameEngine, boardManager, stockfishInterface = null) {
        this.gameEngine = gameEngine;
        this.boardManager = boardManager;
        this.stockfishInterface = stockfishInterface;
        
        this.cacheElements();
        this.setupEventListeners();
        this.emit('ui-updater-ready');
    }

    /**
     * Cache DOM elements for performance
     */
    cacheElements() {
        this.elements = {
            status: document.getElementById('status'),
            turnDisplay: document.getElementById('turnDisplay'),
            moveCount: document.getElementById('moveCount'),
            moveHistory: document.getElementById('moveHistory'),
            lastMove: document.getElementById('lastMove'),
            gameAnalysis: document.getElementById('gameAnalysis'),
            positionInfo: document.getElementById('positionInfo'),
            debugLog: document.getElementById('debugLog'),
            undoBtn: document.getElementById('undoBtn'),
            engineStatus: document.getElementById('engineStatus'),
            engineStatusText: document.getElementById('engineStatusText')
        };
    }

    /**
     * Setup event listeners for game and board events
     */
    setupEventListeners() {
        // Game events
        this.gameEngine.on('move-made', (data) => {
            this.updateAll();
            this.log(`[OK] Legal move: ${data.move.san}`, 'success');
        });

        this.gameEngine.on('move-undone', (data) => {
            this.updateAll();
            this.log(`[UNDO] Undid move: ${data.undoneMove.san}`, 'warning');
        });

        this.gameEngine.on('game-reset', (data) => {
            this.updateAll();
            this.log('[GAME] New game started', 'success');
        });

        this.gameEngine.on('move-invalid', (data) => {
            this.log('[ERROR] Illegal move attempted', 'error');
        });

        this.gameEngine.on('move-error', (data) => {
            this.log(`[ERROR] Move failed: ${data.error}`, 'error');
        });

        // Board events
        this.boardManager.on('piece-selected', (data) => {
            this.log(`[SELECT] Selected ${data.piece.type} on ${data.square}`, 'move');
        });

        this.boardManager.on('piece-deselected', (data) => {
            this.log(`[SELECT] Deselected ${data.square}`, 'move');
        });

        this.boardManager.on('drag-started', (data) => {
            this.log(`[DRAG] Dragging ${data.piece} from ${data.source}`, 'move');
        });

        this.boardManager.on('board-flipped', () => {
            this.log('[BOARD] Board flipped', 'move');
        });

        this.boardManager.on('board-cleared', () => {
            this.log('[BOARD] Board cleared', 'warning');
        });

        this.boardManager.on('game-over-click', () => {
            this.log('[GAME] Game over - no moves allowed', 'warning');
        });

        this.boardManager.on('drag-wrong-turn', (data) => {
            this.log(`[TURN] Wrong turn - can't move ${data.piece}`, 'warning');
        });

        // Engine events
        this.gameEngine.on('engine-ready', () => {
            this.log('[ENGINE] Chess game instance created', 'success');
            this.updateStatus('White to move - Click pieces to select and move!');
        });

        this.gameEngine.on('chess-loaded', (data) => {
            this.log(`[TEST] Basic test: turn=${data.turn}, legal moves=${data.moves}`, 'success');
        });

        // Stockfish events
        if (this.stockfishInterface) {
            this.setupStockfishEventListeners();
        }
    }

    /**
     * Setup Stockfish-specific event listeners
     */
    setupStockfishEventListeners() {
        this.stockfishInterface.on('stockfish-ready', () => {
            this.log('[STOCKFISH] Engine ready', 'success');
            this.updateEngineStatus('Ready', '#28a745');
        });

        this.stockfishInterface.on('stockfish-error', (data) => {
            this.log(`[STOCKFISH] Error: ${data.error}`, 'error');
            this.updateEngineStatus('Error', '#dc3545');
        });

        this.stockfishInterface.on('engine-thinking', () => {
            this.updateStatus('Engine is thinking...');
            this.updateEngineStatus('Thinking...', '#ffc107');
        });

        this.stockfishInterface.on('engine-move-made', (data) => {
            this.log(`[STOCKFISH] Engine played: ${data.move.san}`, 'success');
            this.updateEngineStatus('Ready', '#28a745');
        });

        this.stockfishInterface.on('engine-game-started', (data) => {
            this.log(`[GAME] Playing against engine (${data.engineColor})`, 'success');
            this.updateEngineStatus(`Playing as ${data.engineColor}`, '#007bff');
        });

        this.stockfishInterface.on('engine-game-stopped', () => {
            this.log('[GAME] Stopped playing against engine', 'warning');
            this.updateEngineStatus('Ready', '#28a745');
        });

        this.stockfishInterface.on('analysis-update', (data) => {
            if (data.depth && data.score !== undefined) {
                this.log(`[ANALYSIS] Depth ${data.depth}: ${data.score}`, 'move');
            }
        });

        this.stockfishInterface.on('best-move', (data) => {
            this.log(`[ANALYSIS] Best move: ${data.move}`, 'success');
        });

        this.stockfishInterface.on('strength-changed', (data) => {
            const strength = data.skillLevel === 'max' ? 'Maximum' : `Level ${data.skillLevel}`;
            this.log(`[ENGINE] Strength set to ${strength}`, 'move');
        });
    }

    /**
     * Update engine status display
     */
    updateEngineStatus(statusText, color = '#495057') {
        if (this.elements.engineStatusText) {
            this.elements.engineStatusText.textContent = statusText;
            this.elements.engineStatusText.style.color = color;
        }
    }

    /**
     * Update all UI elements
     */
    updateAll() {
        this.updateStatus();
        this.updateGameInfo();
        this.updateMoveHistory();
        this.updateGameAnalysis();
        this.updatePositionInfo();
        this.updateControls();
    }

    /**
     * Update the main status display
     */
    updateStatus(customMessage = null) {
        if (!this.elements.status) return;

        if (customMessage) {
            this.elements.status.textContent = customMessage;
            this.resetStatusStyling();
            return;
        }

        const gameState = this.gameEngine.getGameState();
        if (!gameState) return;

        const moveColor = gameState.turn === 'w' ? 'White' : 'Black';
        let status = '';

        if (gameState.isCheckmate) {
            status = `Game Over - ${moveColor} is in checkmate!`;
            this.setStatusStyling('#dc3545', '#f8d7da');
        } else if (gameState.isDraw) {
            status = 'Game Over - Draw!';
            this.setStatusStyling('#ffc107', '#fff3cd');
        } else if (gameState.isStalemate) {
            status = 'Game Over - Stalemate!';
            this.setStatusStyling('#ffc107', '#fff3cd');
        } else {
            status = `${moveColor} to move`;
            if (gameState.isCheck) {
                status += ' (in check!)';
                this.setStatusStyling('#fd7e14', '#fff3cd');
            } else {
                this.resetStatusStyling();
            }
        }

        this.elements.status.textContent = status;
    }

    /**
     * Update game information (turn, move count)
     */
    updateGameInfo() {
        const gameState = this.gameEngine.getGameState();
        if (!gameState) return;

        if (this.elements.turnDisplay) {
            this.elements.turnDisplay.textContent = gameState.turn === 'w' ? 'White' : 'Black';
        }

        if (this.elements.moveCount) {
            this.elements.moveCount.textContent = gameState.moveCount;
        }
    }

    /**
     * Update move history display
     */
    updateMoveHistory() {
        if (!this.elements.moveHistory) return;

        const gameState = this.gameEngine.getGameState();
        if (!gameState) return;

        const history = gameState.history;
        let historyHTML = '';

        if (history.length === 0) {
            historyHTML = '<div style="color: #6c757d; font-style: italic;">No moves yet</div>';
        } else {
            for (let i = 0; i < history.length; i += 2) {
                const moveNumber = Math.floor(i / 2) + 1;
                const whiteMove = history[i] ? history[i].san : '';
                const blackMove = history[i + 1] ? history[i + 1].san : '';
                
                historyHTML += `<div style="margin: 4px 0; padding: 4px 8px; background: white; border-radius: 4px; border-left: 3px solid #007bff;">`;
                historyHTML += `<strong style="color: #495057;">${moveNumber}.</strong> `;
                historyHTML += `<span style="color: #007bff; font-weight: 500;">${whiteMove}</span> `;
                if (blackMove) {
                    historyHTML += `<span style="color: #dc3545; font-weight: 500;">${blackMove}</span>`;
                }
                historyHTML += `</div>`;
            }
        }

        this.elements.moveHistory.innerHTML = historyHTML;
        this.updateLastMove(history);
    }

    /**
     * Update last move display
     */
    updateLastMove(history) {
        if (!this.elements.lastMove) return;

        if (history.length > 0) {
            const lastMoveObj = history[history.length - 1];
            const moveColor = lastMoveObj.color === 'w' ? 'White' : 'Black';
            
            this.elements.lastMove.innerHTML = `
                <div style="background: #f8f9fa; padding: 12px; border-radius: 6px; border-left: 3px solid ${lastMoveObj.color === 'w' ? '#007bff' : '#dc3545'};">
                    <div style="font-size: 18px; font-weight: 600; color: #495057; margin-bottom: 6px;">${lastMoveObj.san}</div>
                    <div style="font-size: 12px; color: #6c757d;">
                        ${moveColor}: ${lastMoveObj.from} to ${lastMoveObj.to}
                    </div>
                    ${lastMoveObj.captured ? `<div style="font-size: 11px; color: #dc3545; margin-top: 4px;">Captured: ${lastMoveObj.captured}</div>` : ''}
                </div>
            `;
        } else {
            this.elements.lastMove.innerHTML = '<p style="color: #6c757d; font-style: italic;">No moves yet</p>';
        }
    }

    /**
     * Update game analysis display
     */
    updateGameAnalysis() {
        if (!this.elements.gameAnalysis) return;

        const gameState = this.gameEngine.getGameState();
        if (!gameState) return;

        let analysis = '';

        if (gameState.isCheck) {
            analysis += '<div style="background: #fff3cd; border-left: 4px solid #fd7e14; padding: 12px; border-radius: 6px; margin: 8px 0;"><strong style="color: #fd7e14;">[CHECK] Check!</strong></div>';
        }
        if (gameState.isCheckmate) {
            analysis += '<div style="background: #f8d7da; border-left: 4px solid #dc3545; padding: 12px; border-radius: 6px; margin: 8px 0;"><strong style="color: #dc3545;">[MATE] Checkmate!</strong></div>';
        }
        if (gameState.isStalemate) {
            analysis += '<div style="background: #fff3cd; border-left: 4px solid #ffc107; padding: 12px; border-radius: 6px; margin: 8px 0;"><strong style="color: #856404;">[DRAW] Stalemate!</strong></div>';
        }
        if (gameState.isDraw) {
            analysis += '<div style="background: #e2e3e5; border-left: 4px solid #6c757d; padding: 12px; border-radius: 6px; margin: 8px 0;"><strong style="color: #495057;">[DRAW] Draw!</strong></div>';
        }

        if (!gameState.isCheck && !gameState.isCheckmate && !gameState.isStalemate && !gameState.isDraw) {
            analysis += '<div style="background: #d1ecf1; border-left: 4px solid #17a2b8; padding: 12px; border-radius: 6px; margin: 8px 0;"><span style="color: #0c5460;">Position is normal</span></div>';
        }

        analysis += `<div style="background: #f8f9fa; padding: 10px; border-radius: 6px; margin: 8px 0; text-align: center;">
            <small style="color: #6c757d;">Legal moves available: <strong style="color: #495057;">${gameState.legalMoves.length}</strong></small>
        </div>`;

        this.elements.gameAnalysis.innerHTML = analysis;
    }

    /**
     * Update position information display - UPDATED WITH INTERACTIVE FEN
     */
    updatePositionInfo() {
        if (!this.elements.positionInfo) return;

        const gameState = this.gameEngine.getGameState();
        if (!gameState) return;

        // Update the FEN input with current position
        const fenInput = document.getElementById('fenInput');
        if (fenInput) {
            fenInput.value = gameState.fen;
        }
        
        // Clear any validation messages
        this.clearFenValidation();
    }

    /**
     * Validate FEN notation - IMPROVED VERSION
     */
    validateFen(fen) {
        if (!fen || typeof fen !== 'string') {
            return { valid: false, error: 'FEN cannot be empty' };
        }

        const trimmedFen = fen.trim();
        if (!trimmedFen) {
            return { valid: false, error: 'FEN cannot be empty' };
        }

        // Split FEN into components
        const fenParts = trimmedFen.split(' ');
        
        // FEN should have at least the board position (piece placement)
        if (fenParts.length < 1) {
            return { valid: false, error: 'Invalid FEN format' };
        }

        const boardPart = fenParts[0];
        
        // Check if board part has 8 ranks
        const ranks = boardPart.split('/');
        if (ranks.length !== 8) {
            return { valid: false, error: 'FEN must have 8 ranks separated by /' };
        }

        // Validate each rank
        for (let i = 0; i < ranks.length; i++) {
            const rank = ranks[i];
            let squareCount = 0;
            
            for (let j = 0; j < rank.length; j++) {
                const char = rank[j];
                
                if (/[1-8]/.test(char)) {
                    squareCount += parseInt(char);
                } else if (/[rnbqkpRNBQKP]/.test(char)) {
                    squareCount += 1;
                } else {
                    return { valid: false, error: `Invalid character '${char}' in rank ${i + 1}` };
                }
            }
            
            if (squareCount !== 8) {
                return { valid: false, error: `Rank ${i + 1} must have exactly 8 squares, found ${squareCount}` };
            }
        }

        // If we have more parts, validate the active color
        if (fenParts.length >= 2) {
            const activeColor = fenParts[1];
            if (activeColor !== 'w' && activeColor !== 'b') {
                return { valid: false, error: 'Active color must be "w" or "b"' };
            }
        }

        // If we have castling rights, validate them
        if (fenParts.length >= 3) {
            const castling = fenParts[2];
            if (castling !== '-' && !/^[KQkq]*$/.test(castling)) {
                return { valid: false, error: 'Invalid castling rights format' };
            }
        }

        // If we have en passant square, validate it
        if (fenParts.length >= 4) {
            const enPassant = fenParts[3];
            if (enPassant !== '-' && !/^[a-h][36]$/.test(enPassant)) {
                return { valid: false, error: 'Invalid en passant square' };
            }
        }

        // If we have halfmove clock, validate it's a number
        if (fenParts.length >= 5) {
            const halfmove = fenParts[4];
            if (!/^\d+$/.test(halfmove)) {
                return { valid: false, error: 'Halfmove clock must be a number' };
            }
        }

        // If we have fullmove number, validate it's a positive number
        if (fenParts.length >= 6) {
            const fullmove = fenParts[5];
            if (!/^\d+$/.test(fullmove) || parseInt(fullmove) < 1) {
                return { valid: false, error: 'Fullmove number must be a positive number' };
            }
        }

        return { valid: true };
    }

    /**
     * Show FEN validation message - NEW FUNCTION
     */
    showFenValidation(message, isError = false) {
        const validationEl = document.getElementById('fenValidation');
        if (validationEl) {
            validationEl.textContent = message;
            validationEl.style.color = isError ? '#dc3545' : '#28a745';
            validationEl.style.fontWeight = '500';
        }
    }

    /**
     * Clear FEN validation message - NEW FUNCTION
     */
    clearFenValidation() {
        const validationEl = document.getElementById('fenValidation');
        if (validationEl) {
            validationEl.textContent = '';
        }
    }

    /**
     * Copy current FEN to clipboard - NEW FUNCTION
     */
    async copyFenToClipboard() {
        const fenInput = document.getElementById('fenInput');
        if (!fenInput || !fenInput.value) {
            this.showFenValidation('No FEN to copy', true);
            return false;
        }

        try {
            if (navigator.clipboard && navigator.clipboard.writeText) {
                await navigator.clipboard.writeText(fenInput.value);
                this.showFenValidation('FEN copied to clipboard!');
                this.log('[FEN] Copied to clipboard', 'success');
                
                // Clear success message after 3 seconds
                setTimeout(() => {
                    this.clearFenValidation();
                }, 3000);
                
                return true;
            } else {
                // Fallback for older browsers
                fenInput.select();
                fenInput.setSelectionRange(0, 99999);
                document.execCommand('copy');
                this.showFenValidation('FEN copied to clipboard!');
                this.log('[FEN] Copied to clipboard (fallback)', 'success');
                
                setTimeout(() => {
                    this.clearFenValidation();
                }, 3000);
                
                return true;
            }
        } catch (error) {
            this.showFenValidation('Failed to copy FEN', true);
            this.log('[FEN] Copy failed: ' + error.message, 'error');
            return false;
        }
    }

    /**
     * Update control buttons state
     */
    updateControls() {
        if (this.elements.undoBtn) {
            const gameState = this.gameEngine.getGameState();
            this.elements.undoBtn.disabled = !gameState || gameState.history.length === 0;
        }
    }

    /**
     * Log a message to the debug console
     */
    log(message, type = 'info') {
        console.log(message);
        
        if (!this.elements.debugLog) return;

        const className = type === 'error' ? 'error' : 
                         type === 'success' ? 'success' : 
                         type === 'warning' ? 'warning' : 
                         type === 'move' ? 'move' : '';
        
        const timestamp = new Date().toLocaleTimeString();
        this.elements.debugLog.innerHTML += `<span class="${className}">[${timestamp}] ${message}</span><br>`;
        this.elements.debugLog.scrollTop = this.elements.debugLog.scrollHeight;
    }

    /**
     * Clear the debug log
     */
    clearLog() {
        if (this.elements.debugLog) {
            this.elements.debugLog.innerHTML = '';
        }
    }

    /**
     * Set status styling for different game states
     */
    setStatusStyling(borderColor, background) {
        if (this.elements.status) {
            this.elements.status.style.borderColor = borderColor;
            this.elements.status.style.background = background;
        }
    }

    /**
     * Reset status styling to default
     */
    resetStatusStyling() {
        if (this.elements.status) {
            this.elements.status.style.borderColor = '#007bff';
            this.elements.status.style.background = 'linear-gradient(135deg, #e9ecef 0%, #f8f9fa 100%)';
        }
    }

    /**
     * Show loading state
     */
    showLoading(message = 'Loading...') {
        if (this.elements.status) {
            this.elements.status.textContent = message;
        }
    }

    /**
     * Show engine analysis results
     */
    showEngineAnalysis(analysis) {
        if (!this.elements.gameAnalysis) return;
        
        let analysisHTML = this.elements.gameAnalysis.innerHTML;
        
        if (analysis.evaluation !== undefined) {
            const evalColor = analysis.evaluation > 0 ? '#28a745' : analysis.evaluation < 0 ? '#dc3545' : '#6c757d';
            analysisHTML += `
                <div style="background: #f8f9fa; border-left: 4px solid ${evalColor}; padding: 12px; border-radius: 6px; margin: 8px 0;">
                    <strong style="color: #495057;">[ENGINE] Evaluation: </strong>
                    <span style="color: ${evalColor}; font-weight: 600;">${analysis.evaluation > 0 ? '+' : ''}${analysis.evaluation}</span>
                </div>
            `;
        }
        
        if (analysis.bestMove) {
            analysisHTML += `
                <div style="background: #d1ecf1; border-left: 4px solid #17a2b8; padding: 12px; border-radius: 6px; margin: 8px 0;">
                    <strong style="color: #495057;">[ENGINE] Best move: </strong>
                    <span style="color: #17a2b8; font-weight: 600;">${analysis.bestMove}</span>
                </div>
            `;
        }
        
        this.elements.gameAnalysis.innerHTML = analysisHTML;
    }

    /**
     * Show hint analysis results - NEW FUNCTION FOR HINTS
     */
    showHintAnalysis(hintMove) {
        if (!this.elements.gameAnalysis) return;
        
        let analysisHTML = this.elements.gameAnalysis.innerHTML;
        
        if (hintMove) {
            analysisHTML += `
                <div style="background: #fff3cd; border-left: 4px solid #ffc107; padding: 12px; border-radius: 6px; margin: 8px 0;">
                    <strong style="color: #495057;">💡 [HINT] Suggested move: </strong>
                    <span style="color: #856404; font-weight: 600;">${hintMove}</span>
                </div>
            `;
        }
        
        this.elements.gameAnalysis.innerHTML = analysisHTML;
    }

    /**
     * Update engine thinking indicator
     */
    updateEngineThinking(isThinking, depth = null) {
        if (isThinking) {
            this.updateEngineStatus(depth ? `Thinking... (depth ${depth})` : 'Thinking...', '#ffc107');
        } else {
            this.updateEngineStatus('Ready', '#28a745');
        }
    }
    
    /**
     * Update engine rating display
     */
    updateEngineRatingDisplay(rating, time, options) {
        const ratingDisplay = document.getElementById('engineRating');
        const ratingValue = document.getElementById('ratingValue');
        const timeValue = document.getElementById('timeValue');
        
        if (ratingDisplay) ratingDisplay.textContent = rating;
        if (ratingValue) ratingValue.textContent = rating;
        if (timeValue) timeValue.textContent = time + 's';
        
        // Update opponent description
        this.updateOpponentDescription(rating);
    }

    /**
    * Update engine description
    */
    updateOpponentDescription(rating) {
        const descriptions = {
            200: { title: "Helpless Bot", desc: "Hangs pieces constantly, perfect for learning how pieces move and basic rules." },
            250: { title: "Blunder Bot", desc: "Makes obvious mistakes every few moves, great for building basic confidence." },
            300: { title: "Learning Bot", desc: "Misses simple tactics frequently, ideal for practicing basic captures and threats." },
            350: { title: "Beginner Bot", desc: "Understands basic rules but makes regular tactical errors. Good for fundamentals." },
            400: { title: "Novice Player", desc: "Makes frequent mistakes but occasionally finds good moves. Builds confidence steadily." },
            450: { title: "Improving Beginner", desc: "Your current level! Sometimes tactical, sometimes makes basic errors." },
            500: { title: "Casual Player", desc: "Decent at basics, good for developing pattern recognition and simple tactics." },
            550: { title: "Club Newcomer", desc: "Knows opening principles, decent tactics. Challenges your calculation skills." },
            600: { title: "Club Beginner", desc: "Solid tactical awareness, fewer blunders. Develops your positional thinking." },
            650: { title: "Developing Player", desc: "Good tactical vision, understands basic strategy. Tests your planning ability." },
            700: { title: "Club Regular", desc: "Strong tactics, knows common patterns. Challenges your strategic understanding." },
            750: { title: "Experienced Amateur", desc: "Well-rounded play, punishes most mistakes. Serious challenge for improvement." },
            800: { title: "Strong Club Player", desc: "Advanced tactics, solid positional play. Very challenging opponent." },
            900: { title: "Tournament Player", desc: "Expert-level tactics, deep understanding. Extremely challenging." },
            1000: { title: "Advanced Amateur", desc: "Near-expert strength with few weaknesses. Maximum challenge for rapid improvement." },
            1100: { title: "Expert Level", desc: "Master-level tactical vision and strategy. Formidable opponent." },
            1200: { title: "Strong Expert", desc: "Advanced strategic understanding, precise calculation. Very strong play." },
            1300: { title: "Near-Master", desc: "Sophisticated positional play, deep tactical vision. Approaching master level." },
            1400: { title: "Master Strength", desc: "High-level strategic and tactical play. Extremely challenging for any amateur." },
            1500: { title: "Strong Master", desc: "Professional-level understanding. Maximum difficulty for serious improvement." }
        };
        
        // Find closest description by rating
        const ratingKeys = Object.keys(descriptions).map(Number).sort((a, b) => a - b);
        let closestRating = ratingKeys[0];
        
        for (let ratingKey of ratingKeys) {
            if (Math.abs(ratingKey - rating) < Math.abs(closestRating - rating)) {
                closestRating = ratingKey;
            }
        }
        
        const opponentInfo = descriptions[closestRating];
        
        // Update UI elements if they exist
        const opponentTitle = document.getElementById('opponentTitle');
        const opponentDesc = document.getElementById('opponentDesc');
        
        if (opponentTitle) {
            opponentTitle.textContent = opponentInfo.title;
        }
        
        if (opponentDesc) {
            opponentDesc.textContent = opponentInfo.desc;
        }
        
        // Also log the change for debugging
        this.log(`🤖 Opponent set to: ${opponentInfo.title} (${rating} rating)`, 'move');
        
        return opponentInfo;
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
window.UIUpdater = UIUpdater;