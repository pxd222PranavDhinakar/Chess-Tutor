/**
 * BoardAnnotations - Right-click highlighting and arrows
 * Uses BoardManager's native square highlighting system
 * UPDATED: Thicker arrows and L-shaped arrows for knight moves
 */

class BoardAnnotations {
    constructor() {
        this.boardManager = null;
        this.annotations = {
            highlights: new Set(), // Track highlighted squares
            arrows: new Map()      // Track arrows: "from-to" -> arrow element
        };
        this.isRightDragging = false;
        this.dragStartSquare = null;
        this.tempArrow = null;
        this.eventListeners = {};
    }

    /**
     * Initialize board annotations
     */
    initialize(boardManager) {
        this.boardManager = boardManager;
        this.setupEventListeners();
        this.emit('annotations-ready');
    }

    /**
     * Setup right-click event listeners
     */
    setupEventListeners() {
        const boardElement = document.getElementById('board');
        if (!boardElement) return;

        // Prevent context menu on right-click
        boardElement.addEventListener('contextmenu', (e) => {
            e.preventDefault();
        });

        // Right mouse button down - start annotation
        boardElement.addEventListener('mousedown', (e) => {
            if (e.button === 2) { // Right mouse button
                e.preventDefault();
                this.handleRightMouseDown(e);
            }
        });

        // Mouse move - handle arrow dragging
        boardElement.addEventListener('mousemove', (e) => {
            if (this.isRightDragging) {
                e.preventDefault();
                this.handleRightMouseMove(e);
            }
        });

        // Mouse up - complete annotation
        boardElement.addEventListener('mouseup', (e) => {
            if (e.button === 2 && this.isRightDragging) { // Right mouse button
                e.preventDefault();
                this.handleRightMouseUp(e);
            }
        });

        // Global mouse up (in case mouse leaves board area)
        document.addEventListener('mouseup', (e) => {
            if (e.button === 2 && this.isRightDragging) {
                this.handleRightMouseUp(e);
            }
        });

        console.log('BoardAnnotations: Event listeners setup complete');
    }

    /**
     * Handle right mouse button down
     */
    handleRightMouseDown(e) {
        const square = this.getSquareFromMouseEvent(e);
        if (!square) return;

        console.log(`Right-click started on square: ${square}`);
        
        this.isRightDragging = true;
        this.dragStartSquare = square;
        
        // Clear any existing temporary arrow
        this.clearTempArrow();
    }

    /**
     * Handle mouse move during right-drag
     */
    handleRightMouseMove(e) {
        if (!this.isRightDragging || !this.dragStartSquare) return;

        const currentSquare = this.getSquareFromMouseEvent(e);
        
        // If we're over a different square, show temporary arrow
        if (currentSquare && currentSquare !== this.dragStartSquare) {
            this.showTempArrow(this.dragStartSquare, currentSquare);
        } else {
            this.clearTempArrow();
        }
    }

    /**
     * Handle right mouse button up
     */
    handleRightMouseUp(e) {
        if (!this.isRightDragging) return;

        const endSquare = this.getSquareFromMouseEvent(e);
        
        console.log(`Right-click ended. Start: ${this.dragStartSquare}, End: ${endSquare}`);

        if (this.dragStartSquare === endSquare) {
            // Single right-click - toggle square highlight
            this.toggleSquareHighlight(this.dragStartSquare);
        } else if (endSquare) {
            // Right-click drag - create arrow
            this.toggleArrow(this.dragStartSquare, endSquare);
        }

        // Clean up
        this.clearTempArrow();
        this.isRightDragging = false;
        this.dragStartSquare = null;
    }

    /**
     * Get chess square from mouse event coordinates
     */
    getSquareFromMouseEvent(e) {
        const boardEl = document.getElementById('board');
        if (!boardEl) return null;

        const rect = boardEl.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        
        const squareSize = rect.width / 8;
        const isFlipped = this.boardManager.getOrientation() === 'black';
        
        let file, rank;
        if (isFlipped) {
            file = 7 - Math.floor(x / squareSize);
            rank = Math.floor(y / squareSize);
        } else {
            file = Math.floor(x / squareSize);
            rank = 7 - Math.floor(y / squareSize);
        }
        
        // Convert to chess notation
        if (file >= 0 && file < 8 && rank >= 0 && rank < 8) {
            return String.fromCharCode(97 + file) + (rank + 1);
        }
        
        return null;
    }

    /**
     * Toggle square highlight (red background) - UPDATED for native system
     */
    toggleSquareHighlight(square) {
        console.log(`Toggling highlight for square: ${square}`);

        if (this.annotations.highlights.has(square)) {
            // Remove existing highlight
            this.removeSquareHighlight(square);
        } else {
            // Add new highlight
            this.addSquareHighlight(square);
        }
    }

    /**
     * Add red highlight to a square - UPDATED for native system
     */
    addSquareHighlight(square) {
        const success = this.boardManager.addSquareClass(square, 'annotation-highlight');
        
        if (success) {
            this.annotations.highlights.add(square);
            console.log(`Added highlight to square: ${square}`);
        } else {
            console.warn(`Failed to add highlight to square: ${square}`);
        }
    }

    /**
     * Remove highlight from a square - UPDATED for native system
     */
    removeSquareHighlight(square) {
        const success = this.boardManager.removeSquareClass(square, 'annotation-highlight');
        
        if (success) {
            this.annotations.highlights.delete(square);
            console.log(`Removed highlight from square: ${square}`);
        } else {
            console.warn(`Failed to remove highlight from square: ${square}`);
        }
    }

    /**
     * Toggle arrow between two squares
     */
    toggleArrow(fromSquare, toSquare) {
        const arrowKey = `${fromSquare}-${toSquare}`;
        console.log(`Toggling arrow: ${arrowKey}`);

        if (this.annotations.arrows.has(arrowKey)) {
            // Remove existing arrow
            this.removeArrow(fromSquare, toSquare);
        } else {
            // Add new arrow
            this.addArrow(fromSquare, toSquare);
        }
    }

    /**
     * Add arrow between two squares - UPDATED with brighter colors and SVG arrows
     */
    addArrow(fromSquare, toSquare) {
        const arrowKey = `${fromSquare}-${toSquare}`;
        
        const arrow = this.createArrowElement(fromSquare, toSquare, {
            color: '#FF8C00', // Bright orange
            width: '8', // SVG stroke-width as string
            opacity: '0.9'
        });

        if (arrow) {
            arrow.setAttribute('data-annotation-arrow', arrowKey);
            this.annotations.arrows.set(arrowKey, arrow);
            console.log(`Added arrow: ${arrowKey}`);
        }
    }

    /**
     * Remove arrow between two squares
     */
    removeArrow(fromSquare, toSquare) {
        const arrowKey = `${fromSquare}-${toSquare}`;
        const boardEl = document.getElementById('board');
        if (!boardEl) return;

        const existingArrow = boardEl.querySelector(`[data-annotation-arrow="${arrowKey}"]`);
        if (existingArrow) {
            existingArrow.remove();
            this.annotations.arrows.delete(arrowKey);
            console.log(`Removed arrow: ${arrowKey}`);
        }
    }

    /**
     * Create arrow element between two squares - UPDATED with SVG-based predefined arrows
     */
    createArrowElement(fromSquare, toSquare, options = {}) {
        const boardEl = document.getElementById('board');
        if (!boardEl) return null;

        // Get actual square elements and their positions
        const fromSquareEl = this.boardManager.getSquareElement(fromSquare);
        const toSquareEl = this.boardManager.getSquareElement(toSquare);
        
        if (fromSquareEl.length === 0 || toSquareEl.length === 0) {
            console.warn(`Square elements not found: ${fromSquare} or ${toSquare}`);
            return null;
        }

        // Get positions relative to board
        const fromPos = fromSquareEl.position();
        const toPos = toSquareEl.position();
        const squareSize = fromSquareEl.width();

        // Calculate move type - check if it's a knight-like move
        const fromFile = fromSquare.charCodeAt(0) - 97; // 'a' = 0
        const fromRank = parseInt(fromSquare[1]) - 1;   // '1' = 0
        const toFile = toSquare.charCodeAt(0) - 97;
        const toRank = parseInt(toSquare[1]) - 1;
        
        const fileDiff = Math.abs(toFile - fromFile);
        const rankDiff = Math.abs(toRank - fromRank);
        const isKnightMove = (fileDiff === 2 && rankDiff === 1) || (fileDiff === 1 && rankDiff === 2);

        console.log(`Creating arrow from ${fromSquare} to ${toSquare}, knight move: ${isKnightMove}`);

        if (isKnightMove) {
            return this.createSVGKnightArrow(fromPos, toPos, squareSize, fromSquare, toSquare, options, boardEl);
        } else {
            return this.createSVGStraightArrow(fromPos, toPos, squareSize, options, boardEl);
        }
    }

    /**
     * Create a clean SVG straight arrow
     */
    createSVGStraightArrow(fromPos, toPos, squareSize, options, boardEl) {
        const fromCenterX = fromPos.left + (squareSize / 2);
        const fromCenterY = fromPos.top + (squareSize / 2);
        const toCenterX = toPos.left + (squareSize / 2);
        const toCenterY = toPos.top + (squareSize / 2);

        // Calculate arrow direction and length
        const deltaX = toCenterX - fromCenterX;
        const deltaY = toCenterY - fromCenterY;
        const length = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
        const angle = Math.atan2(deltaY, deltaX) * (180 / Math.PI);

        // Shorten the arrow so it doesn't go all the way to the center
        const shortenBy = squareSize * 0.15; // Stop 15% before the center
        const adjustedLength = length - shortenBy;
        const endX = fromCenterX + (deltaX / length) * adjustedLength;
        const endY = fromCenterY + (deltaY / length) * adjustedLength;

        // Create SVG container
        const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        svg.style.position = 'absolute';
        svg.style.left = '0px';
        svg.style.top = '0px';
        svg.style.width = '100%';
        svg.style.height = '100%';
        svg.style.pointerEvents = 'none';
        svg.style.zIndex = '6';
        svg.style.overflow = 'visible';

        // Create arrow path with arrowhead
        const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        
        // Calculate arrowhead points
        const headLength = 20;
        const headWidth = 12;
        const unitX = deltaX / length;
        const unitY = deltaY / length;
        const perpX = -unitY;
        const perpY = unitX;

        // Arrow shaft end point (before arrowhead)
        const shaftEndX = endX - unitX * headLength;
        const shaftEndY = endY - unitY * headLength;

        // Arrowhead points
        const head1X = shaftEndX + perpX * headWidth;
        const head1Y = shaftEndY + perpY * headWidth;
        const head2X = shaftEndX - perpX * headWidth;
        const head2Y = shaftEndY - perpY * headWidth;

        // Create the path: line + arrowhead
        const pathData = `
            M ${fromCenterX} ${fromCenterY} 
            L ${shaftEndX} ${shaftEndY}
            M ${head1X} ${head1Y}
            L ${endX} ${endY}
            L ${head2X} ${head2Y}
        `;

        path.setAttribute('d', pathData);
        path.setAttribute('stroke', options.color || '#FF8C00');
        path.setAttribute('stroke-width', options.width || '8');
        path.setAttribute('stroke-linecap', 'round');
        path.setAttribute('stroke-linejoin', 'round');
        path.setAttribute('fill', 'none');
        path.setAttribute('opacity', options.opacity || '0.9');
        path.style.filter = 'drop-shadow(2px 2px 4px rgba(0,0,0,0.3))';

        svg.appendChild(path);
        boardEl.appendChild(svg);

        return svg;
    }

    /**
     * Create a clean SVG L-shaped arrow for knight moves
     */
    createSVGKnightArrow(fromPos, toPos, squareSize, fromSquare, toSquare, options, boardEl) {
        const fromCenterX = fromPos.left + (squareSize / 2);
        const fromCenterY = fromPos.top + (squareSize / 2);
        const toCenterX = toPos.left + (squareSize / 2);
        const toCenterY = toPos.top + (squareSize / 2);

        const deltaX = toCenterX - fromCenterX;
        const deltaY = toCenterY - fromCenterY;
        
        // Determine which way to bend the L
        const fromFile = fromSquare.charCodeAt(0) - 97;
        const fromRank = parseInt(fromSquare[1]) - 1;
        const toFile = toSquare.charCodeAt(0) - 97;
        const toRank = parseInt(toSquare[1]) - 1;
        
        const fileDiff = Math.abs(toFile - fromFile);
        const rankDiff = Math.abs(toRank - fromRank);
        
        // Go the longer distance first
        const goHorizontalFirst = fileDiff > rankDiff;
        
        // Calculate bend point and shortened end point
        const shortenBy = squareSize * 0.15;
        let bendX, bendY, endX, endY;
        
        if (goHorizontalFirst) {
            bendX = toCenterX;
            bendY = fromCenterY;
            // Shorten the final vertical segment
            endX = toCenterX;
            endY = toCenterY - Math.sign(deltaY) * shortenBy;
        } else {
            bendX = fromCenterX;
            bendY = toCenterY;
            // Shorten the final horizontal segment
            endX = toCenterX - Math.sign(deltaX) * shortenBy;
            endY = toCenterY;
        }

        // Create SVG container
        const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        svg.style.position = 'absolute';
        svg.style.left = '0px';
        svg.style.top = '0px';
        svg.style.width = '100%';
        svg.style.height = '100%';
        svg.style.pointerEvents = 'none';
        svg.style.zIndex = '6';
        svg.style.overflow = 'visible';

        // Create the L-shaped path
        const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        
        // Calculate arrowhead
        const headLength = 20;
        const headWidth = 12;
        
        let unitX, unitY, perpX, perpY;
        let shaftEndX, shaftEndY;
        
        if (goHorizontalFirst) {
            // Final segment is vertical
            unitX = 0;
            unitY = deltaY > 0 ? 1 : -1;
            perpX = 1;
            perpY = 0;
            shaftEndX = endX;
            shaftEndY = endY - unitY * headLength;
        } else {
            // Final segment is horizontal
            unitX = deltaX > 0 ? 1 : -1;
            unitY = 0;
            perpX = 0;
            perpY = 1;
            shaftEndX = endX - unitX * headLength;
            shaftEndY = endY;
        }

        // Arrowhead points
        const head1X = shaftEndX + perpX * headWidth;
        const head1Y = shaftEndY + perpY * headWidth;
        const head2X = shaftEndX - perpX * headWidth;
        const head2Y = shaftEndY - perpY * headWidth;

        // Create the L-shaped path with arrowhead
        const pathData = `
            M ${fromCenterX} ${fromCenterY} 
            L ${bendX} ${bendY}
            L ${shaftEndX} ${shaftEndY}
            M ${head1X} ${head1Y}
            L ${endX} ${endY}
            L ${head2X} ${head2Y}
        `;

        path.setAttribute('d', pathData);
        path.setAttribute('stroke', options.color || '#FF8C00');
        path.setAttribute('stroke-width', options.width || '8');
        path.setAttribute('stroke-linecap', 'round');
        path.setAttribute('stroke-linejoin', 'round');
        path.setAttribute('fill', 'none');
        path.setAttribute('opacity', options.opacity || '0.9');
        path.style.filter = 'drop-shadow(2px 2px 4px rgba(0,0,0,0.3))';

        svg.appendChild(path);
        boardEl.appendChild(svg);

        console.log(`Created SVG L-shaped arrow for knight move: ${fromSquare} to ${toSquare}`);
        return svg;
    }

    /**
     * Show temporary arrow during dragging
     */
    showTempArrow(fromSquare, toSquare) {
        this.clearTempArrow();
        
        this.tempArrow = this.createArrowElement(fromSquare, toSquare, {
            color: 'rgba(255, 165, 0, 0.7)',
            width: '6',
            opacity: '0.7'
        });

        if (this.tempArrow) {
            this.tempArrow.style.zIndex = '7'; // Above permanent arrows
        }
    }

    /**
     * Clear temporary arrow
     */
    clearTempArrow() {
        if (this.tempArrow) {
            this.tempArrow.remove();
            this.tempArrow = null;
        }
    }

    /**
     * Clear all annotations
     */
    clearAllAnnotations() {
        // Clear highlights using native system
        this.annotations.highlights.forEach(square => {
            this.removeSquareHighlight(square);
        });

        // Clear arrows
        this.annotations.arrows.forEach((arrow, key) => {
            const [fromSquare, toSquare] = key.split('-');
            this.removeArrow(fromSquare, toSquare);
        });

        console.log('All annotations cleared');
    }

    /**
     * Highlight hint move squares - NEW FUNCTION FOR HINT VISUALIZATION
     */
    highlightHintMove(fromSquare, toSquare) {
        console.log(`Highlighting hint move: ${fromSquare} → ${toSquare}`);
        
        // Clear any existing hint highlights first
        this.clearHintHighlights();
        
        // Add hint-specific highlighting class to both squares
        if (fromSquare && this.boardManager) {
            const success1 = this.boardManager.addSquareClass(fromSquare, 'hint-highlight');
            if (success1) {
                console.log(`Added hint highlight to FROM square: ${fromSquare}`);
            }
        }
        
        if (toSquare && this.boardManager) {
            const success2 = this.boardManager.addSquareClass(toSquare, 'hint-highlight');
            if (success2) {
                console.log(`Added hint highlight to TO square: ${toSquare}`);
            }
        }
    }

    /**
     * Clear hint move highlights - NEW FUNCTION FOR HINT CLEANUP
     */
    clearHintHighlights() {
        if (this.boardManager) {
            // Remove hint highlight class from all squares
            const boardEl = document.getElementById('board');
            if (boardEl) {
                const hintSquares = boardEl.querySelectorAll('.hint-highlight');
                hintSquares.forEach(square => {
                    square.classList.remove('hint-highlight');
                });
                console.log('Cleared all hint highlights');
            }
        }
    }

    /**
     * Event system
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
}

// Make it available globally
window.BoardAnnotations = BoardAnnotations;