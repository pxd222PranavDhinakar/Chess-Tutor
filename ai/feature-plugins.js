/**
 * Feature Plugins System - Modular AI Features
 * Simple plugin system to separate AI functionalities without interference
 */

class FeaturePlugins {
    constructor() {
        this.plugins = [];
        this.debugMode = true; // Set to false to reduce logging
    }
    
    /**
     * Register a new plugin - ADD NEW PLUGINS HERE
     */
    register(plugin) {
        this.plugins.push(plugin);
        if (this.debugMode) {
            console.log(`🔌 FeaturePlugins: Registered ${plugin.name} plugin`);
        }
    }
    
    /**
     * Handle message with plugins - MAIN ROUTING METHOD
     */
    async handleMessage(message, context) {
        if (this.debugMode) {
            console.log('🔍 FeaturePlugins: Checking', this.plugins.length, 'plugins for message:', message.substring(0, 50) + '...');
        }
        
        for (const plugin of this.plugins) {
            try {
                if (plugin.canHandle(message, context)) {
                    if (this.debugMode) {
                        console.log(`✅ FeaturePlugins: ${plugin.name} plugin will handle this message`);
                    }
                    const result = await plugin.process(message, context);
                    if (result) {
                        return result;
                    }
                }
            } catch (error) {
                console.error(`❌ FeaturePlugins: Error in ${plugin.name} plugin:`, error);
                // Continue to next plugin instead of failing completely
            }
        }
        
        if (this.debugMode) {
            console.log('🔄 FeaturePlugins: No plugin handled this message, falling back to basic chat');
        }
        return null; // No plugin handled it
    }
    
    /**
     * Get list of available plugins - DEBUGGING METHOD
     */
    getAvailablePlugins() {
        return this.plugins.map(p => ({
            name: p.name,
            description: p.description || 'No description'
        }));
    }
}

// =============================================================================
// OPENING LOOKUP PLUGIN - Self-contained opening identification and information
// =============================================================================

const openingLookupPlugin = {
    name: 'opening-lookup',
    description: 'Identifies current opening and provides opening information',
    
    /**
     * Check if this plugin should handle the message - DETECTION LOGIC
     */
    canHandle(message, context) {
        const lower = message.toLowerCase();
        
        // Opening identification queries
        const identificationQueries = [
            'what opening',
            'which opening', 
            'opening is this',
            'what\'s this opening',
            'identify this opening',
            'name of this opening',
            'current opening',
            'what opening is this'
        ];
        
        // Opening information queries
        const informationQueries = [
            'tell me about',
            'explain the',
            'what is the'
        ];
        
        // Check for identification queries
        for (const query of identificationQueries) {
            if (lower.includes(query)) {
                return true;
            }
        }
        
        // Check for information queries about openings
        for (const query of informationQueries) {
            if (lower.includes(query) && (lower.includes('opening') || lower.includes('defense') || lower.includes('gambit'))) {
                return true;
            }
        }
        
        return false;
    },
    
    /**
     * Process opening lookup request - MAIN PROCESSING LOGIC
     */
    async process(message, context) {
        const lower = message.toLowerCase();
        
        try {
            // Check if opening knowledge system is available
            if (!window.openingKnowledgeSystem || !window.openingKnowledgeSystem.isInitialized) {
                return "I'm sorry, but the opening database is not currently available. Please ensure the opening knowledge system is loaded.";
            }
            
            const oks = window.openingKnowledgeSystem;
            
            // Determine if this is current position analysis or specific opening query
            const isCurrentPositionQuery = lower.includes('this opening') || 
                                         lower.includes('current opening') || 
                                         lower.includes('what opening is this');
            
            if (isCurrentPositionQuery) {
                return await this.analyzeCurrentPosition(context, oks);
            } else {
                return await this.provideOpeningInformation(message, oks);
            }
            
        } catch (error) {
            console.error('❌ Opening Lookup Plugin Error:', error);
            return "I encountered an error while looking up opening information. Please try again.";
        }
    },
    
    /**
     * Analyze current board position for opening - CURRENT POSITION ANALYSIS
     */
    async analyzeCurrentPosition(context, oks) {
        // Get current position from game state
        if (!context || !context.available || !context.currentPosition) {
            return "I can't analyze the current position because game state information is not available.";
        }
        
        const currentFEN = context.currentPosition.fen;
        console.log('🔍 Opening Lookup: Analyzing current FEN:', currentFEN);
        
        // Look up opening information
        const openingInfo = oks.getOpeningInfo(currentFEN);
        
        if (openingInfo) {
            let response = `This position is from the **${openingInfo.name}**`;
            
            if (openingInfo.eco) {
                response += ` (${openingInfo.eco})`;
            }
            
            response += `.`;
            
            if (openingInfo.moves) {
                response += `\n\nThe moves that led to this position are: **${openingInfo.moves}**`;
            }
            
            if (openingInfo.category) {
                response += `\n\nThis opening belongs to the ${openingInfo.category} category.`;
            }
            
            if (openingInfo.strategicThemes && openingInfo.strategicThemes.length > 0) {
                response += `\n\nKey strategic themes: ${openingInfo.strategicThemes.join(', ')}.`;
            }
            
            if (openingInfo.principles && openingInfo.principles.length > 0) {
                response += `\n\nImportant principles for this opening:\n`;
                openingInfo.principles.slice(0, 3).forEach(principle => {
                    response += `• ${principle}\n`;
                });
            }
            
            return response;
        } else {
            return `I couldn't identify this position as a known opening. This might be a middlegame or endgame position, or a less common variation. The current position has ${context.currentPosition.turn} to move on move ${context.currentPosition.moveNumber}.`;
        }
    },
    
    /**
     * Provide information about a specific opening - OPENING INFORMATION
     */
    async provideOpeningInformation(message, oks) {
        // Extract opening name from message
        const openingName = this.extractOpeningName(message);
        
        if (!openingName) {
            return "I'd be happy to provide opening information! Could you specify which opening you'd like to learn about? For example, 'Tell me about the French Defense' or 'What is the Sicilian Defense?'";
        }
        
        console.log('🔍 Opening Lookup: Searching for opening:', openingName);
        
        // Search for opening
        const searchResults = oks.searchByName(openingName);
        
        if (searchResults.length === 0) {
            return `I couldn't find information about "${openingName}". Could you try a different spelling or check if it's a well-known opening name?`;
        }
        
        // Use the first (best) result
        const opening = searchResults[0];
        
        let response = `**${opening.name}**`;
        
        if (opening.eco) {
            response += ` (${opening.eco})`;
        }
        
        response += '\n\n';
        
        if (opening.moves) {
            response += `**Typical moves:** ${opening.moves}\n\n`;
        }
        
        if (opening.category) {
            response += `**Category:** ${opening.category}\n\n`;
        }
        
        if (opening.strategicThemes && opening.strategicThemes.length > 0) {
            response += `**Strategic themes:** ${opening.strategicThemes.join(', ')}\n\n`;
        }
        
        if (opening.principles && opening.principles.length > 0) {
            response += `**Key principles:**\n`;
            opening.principles.slice(0, 4).forEach(principle => {
                response += `• ${principle}\n`;
            });
        }
        
        return response;
    },
    
    /**
     * Extract opening name from message - UTILITY METHOD
     */
    extractOpeningName(message) {
        const lower = message.toLowerCase();
        
        // Known opening patterns
        const openings = [
            { name: 'french defense', patterns: ['french defense', 'french'] },
            { name: 'sicilian defense', patterns: ['sicilian defense', 'sicilian dragon', 'sicilian'] },
            { name: 'ruy lopez', patterns: ['ruy lopez', 'spanish opening'] },
            { name: 'italian game', patterns: ['italian game', 'italian'] },
            { name: 'caro-kann', patterns: ['caro-kann', 'caro kann'] },
            { name: 'king\'s indian', patterns: ['king\'s indian', 'kings indian'] },
            { name: 'queen\'s gambit', patterns: ['queen\'s gambit', 'queens gambit'] },
            { name: 'english opening', patterns: ['english opening', 'english'] },
            { name: 'alekhine defense', patterns: ['alekhine defense', 'alekhine'] },
            { name: 'scandinavian defense', patterns: ['scandinavian defense', 'scandinavian'] },
            { name: 'nimzo-indian', patterns: ['nimzo-indian', 'nimzo indian'] },
            { name: 'catalan', patterns: ['catalan opening', 'catalan'] }
        ];
        
        for (const opening of openings) {
            for (const pattern of opening.patterns) {
                if (lower.includes(pattern)) {
                    return opening.name;
                }
            }
        }
        
        return null;
    }
};

// =============================================================================
// POSITION LOADING PLUGIN - Self-contained FEN loading and teaching
// =============================================================================

const positionLoadingPlugin = {
    name: 'position-loading',
    description: 'Loads chess positions and provides teaching demonstrations',
    
    /**
     * Check if this plugin should handle the message - DETECTION LOGIC
     */
    canHandle(message, context) {
        const lower = message.toLowerCase();
        
        // Teaching requests
        const teachingQueries = [
            'teach me',
            'show me',
            'demonstrate',
            'load the',
            'set up the'
        ];
        
        // Position loading requests
        const positionQueries = [
            'load position',
            'load fen',
            'set position',
            'go to position'
        ];
        
        // Check for teaching queries with openings
        for (const query of teachingQueries) {
            if (lower.includes(query) && (lower.includes('opening') || lower.includes('defense') || lower.includes('gambit'))) {
                return true;
            }
        }
        
        // Check for direct position loading
        for (const query of positionQueries) {
            if (lower.includes(query)) {
                return true;
            }
        }
        
        return false;
    },
    
    /**
     * Process position loading request - MAIN PROCESSING LOGIC
     */
    async process(message, context) {
        const lower = message.toLowerCase();
        
        try {
            // Check if app orchestrator is available for FEN loading
            if (!window.appOrchestrator || typeof window.appOrchestrator.loadFEN !== 'function') {
                return "I'm sorry, but the position loading system is not currently available. Please ensure the game engine is properly initialized.";
            }
            
            // Determine what opening/position to load
            const openingName = this.extractOpeningName(message);
            
            if (!openingName) {
                return "I'd be happy to load a position for you! Could you specify which opening you'd like me to demonstrate? For example, 'Show me the French Defense' or 'Teach me the Italian Game'.";
            }
            
            return await this.loadOpeningPosition(openingName);
            
        } catch (error) {
            console.error('❌ Position Loading Plugin Error:', error);
            return "I encountered an error while trying to load the position. Please try again.";
        }
    },
    
    /**
     * Load opening position on the board - POSITION LOADING LOGIC
     */
    async loadOpeningPosition(openingName) {
        console.log('🎯 Position Loading: Searching for opening to load:', openingName);
        
        // Check if opening knowledge system is available
        if (!window.openingKnowledgeSystem || !window.openingKnowledgeSystem.isInitialized) {
            return "I can't load the position because the opening database is not available.";
        }
        
        const oks = window.openingKnowledgeSystem;
        
        // Search for the opening
        const searchResults = oks.searchByName(openingName);
        
        if (searchResults.length === 0) {
            return `I couldn't find "${openingName}" in the opening database. Could you try a different opening name?`;
        }
        
        // Get the first result
        const opening = searchResults[0];
        
        if (!opening.fen) {
            return `I found the ${opening.name} but don't have position data to load it on the board.`;
        }
        
        console.log('🎯 Position Loading: Loading FEN:', opening.fen);
        
        // Load the position using app orchestrator
        const loadResult = window.appOrchestrator.loadFEN(opening.fen);
        
        if (loadResult === false) {
            return `I found the ${opening.name} but encountered an error loading the position. The FEN data might be invalid.`;
        }
        
        // Build response
        let response = `✅ I've loaded the **${opening.name}**`;
        
        if (opening.eco) {
            response += ` (${opening.eco})`;
        }
        
        response += ` on the board!`;
        
        if (opening.moves) {
            response += `\n\n**Moves:** ${opening.moves}`;
        }
        
        if (opening.strategicThemes && opening.strategicThemes.length > 0) {
            response += `\n\n**Key themes for this opening:** ${opening.strategicThemes.slice(0, 3).join(', ')}`;
        }
        
        if (opening.principles && opening.principles.length > 0) {
            response += `\n\n**Important principles:**\n`;
            opening.principles.slice(0, 3).forEach(principle => {
                response += `• ${principle}\n`;
            });
        }
        
        response += `\n\nYou can now study this position and continue playing from here!`;
        
        return response;
    },
    
    /**
     * Extract opening name from message - UTILITY METHOD (same as opening lookup)
     */
    extractOpeningName(message) {
        const lower = message.toLowerCase();
        
        // Known opening patterns
        const openings = [
            { name: 'french defense', patterns: ['french defense', 'french'] },
            { name: 'sicilian defense', patterns: ['sicilian defense', 'sicilian dragon', 'sicilian'] },
            { name: 'ruy lopez', patterns: ['ruy lopez', 'spanish opening'] },
            { name: 'italian game', patterns: ['italian game', 'italian'] },
            { name: 'caro-kann', patterns: ['caro-kann', 'caro kann'] },
            { name: 'king\'s indian', patterns: ['king\'s indian', 'kings indian'] },
            { name: 'queen\'s gambit', patterns: ['queen\'s gambit', 'queens gambit'] },
            { name: 'english opening', patterns: ['english opening', 'english'] },
            { name: 'alekhine defense', patterns: ['alekhine defense', 'alekhine'] },
            { name: 'scandinavian defense', patterns: ['scandinavian defense', 'scandinavian'] },
            { name: 'nimzo-indian', patterns: ['nimzo-indian', 'nimzo indian'] },
            { name: 'catalan', patterns: ['catalan opening', 'catalan'] }
        ];
        
        for (const opening of openings) {
            for (const pattern of opening.patterns) {
                if (lower.includes(pattern)) {
                    return opening.name;
                }
            }
        }
        
        return null;
    }
};


// =============================================================================
// STRATEGIC ANNOTATION PLUGIN - Enhanced with arrow detection and move analysis
// =============================================================================

const strategicAnnotationPlugin = {
   name: 'strategic-annotation',
   description: 'Creates board annotations to explain strategic concepts and moves',
   
   /**
    * Check if this plugin should handle the message - ENHANCED DETECTION WITH ARROWS
    */
   canHandle(message, context) {
       const lower = message.toLowerCase();
       
       // Enhanced detection patterns for highlighting (pieces/squares)
       const highlightQueries = [
           'highlight',
           'mark',
           'show',
           'point out',
           'indicate',
           'circle',
           'annotate'
       ];
       
       const targetQueries = [
           'king', 'kings', 'king squares',
           'queen', 'queens',
           'knight', 'knights', 
           'bishop', 'bishops',
           'rook', 'rooks',
           'pawn', 'pawns',
           'piece', 'pieces',
           'weakness', 'weaknesses',
           'strength', 'strengths',
           'attack', 'attacks',
           'threat', 'threats',
           'target', 'targets',
           'center', 'squares',
           'development',
           'back rank',
           'file', 'rank',
           'diagonal'
       ];
       
       // Arrow detection patterns for movement/strategy
       const arrowQueries = [
           'draw arrow',
           'draw an arrow',
           'show arrow',
           'create arrow',
           'arrow from',
           'arrow to',
           'point from',
           'connect',
           'best move',
           'good move',
           'show move',
           'demonstrate move',
           'show the move',
           'illustrate move',
           'move suggestion',
           'recommended move',
           'show strategy',
           'demonstrate strategy',
           'show plan',
           'illustrate plan',
           'show how to',
           'how should I move'
       ];
       
       // Check for arrow patterns (movement/strategy)
       for (const query of arrowQueries) {
           if (lower.includes(query)) {
               console.log(`🏹 Strategic Annotation: Detected arrow pattern "${query}"`);
               return true;
           }
       }
       
       // Check for highlight + target combinations (pieces/squares)
       for (const highlight of highlightQueries) {
           if (lower.includes(highlight)) {
               for (const target of targetQueries) {
                   if (lower.includes(target)) {
                       console.log(`🎯 Strategic Annotation: Detected "${highlight}" + "${target}" pattern`);
                       return true;
                   }
               }
               // If we have a highlight word but no specific target, still try to handle it
               return true;
           }
       }
       
       // General strategy explanation requests
       const strategyQueries = [
           'explain the strategy',
           'show me the strategy',
           'demonstrate the plan',
           'illustrate the',
           'show the weakness',
           'show the strength',
           'where is vulnerable',
           'find the weakness',
           'what are the threats'
       ];
       
       for (const query of strategyQueries) {
           if (lower.includes(query)) {
               return true;
           }
       }
       
       return false;
   },
   
   /**
    * Process strategic annotation request - ENHANCED WITH ARROW LOGIC
    */
   async process(message, context) {
       const lower = message.toLowerCase();
       
       try {
           console.log('🎯 Strategic Annotation: Processing request:', message);
           
           // Check if board annotations system is available
           if (!window.appOrchestrator || !window.appOrchestrator.boardAnnotations) {
               return "I'm sorry, but the board annotation system is not currently available.";
           }
           
           const annotations = window.appOrchestrator.boardAnnotations;
           
           // Get current position context
           if (!context || !context.available) {
               return "I need to see the current board position to create strategic annotations.";
           }
           
           // Clear existing annotations before creating new ones
           annotations.clearAllAnnotations();
           
           // Determine if this is an arrow request (movement) or highlight request (pieces/squares)
           const isArrowRequest = this.isArrowRequest(lower);
           
           let analysisResult;
           if (isArrowRequest) {
               analysisResult = await this.analyzeForArrows(context, message);
           } else {
               analysisResult = await this.analyzeForHighlights(context, message);
           }
           
           if (analysisResult.annotations && analysisResult.annotations.length > 0) {
               // Apply the annotations to the board
               this.applyAnnotations(annotations, analysisResult.annotations);
               
               // Return explanation with annotation summary
               let response = analysisResult.explanation + "\n\n";
               response += "✨ I've added visual annotations to the board:\n";
               
               analysisResult.annotations.forEach((annotation, index) => {
                   if (annotation.type === 'highlight') {
                       response += `• Highlighted ${annotation.square}: ${annotation.reason}\n`;
                   } else if (annotation.type === 'arrow') {
                       response += `• Arrow from ${annotation.from} to ${annotation.to}: ${annotation.reason}\n`;
                   }
               });
               
               return response;
           } else {
               return analysisResult.explanation || "I analyzed the position but didn't find specific elements that would benefit from visual annotations.";
           }
           
       } catch (error) {
           console.error('❌ Strategic Annotation Plugin Error:', error);
           return "I encountered an error while trying to create strategic annotations. Please try again.";
       }
   },
   
   /**
    * Determine if request is for arrows (movement) vs highlights (pieces/squares) - NEW FUNCTION
    */
   isArrowRequest(lowerMessage) {
       const arrowIndicators = [
           'arrow',
           'move',
           'strategy',
           'plan',
           'how to',
           'best move',
           'good move',
           'show move',
           'demonstrate move',
           'recommended',
           'suggestion',
           'connect',
           'from',
           'to'
       ];
       
       return arrowIndicators.some(indicator => lowerMessage.includes(indicator));
   },
   
   /**
    * Analyze position for arrow annotations (movement/strategy) - NEW FUNCTION
    */
   async analyzeForArrows(context, message) {
       const lower = message.toLowerCase();
       const annotations = [];
       let explanation = "";
       
       // Try to extract specific squares from message first
       const squarePattern = /([a-h][1-8])/g;
       const squares = message.match(squarePattern);
       
       if (squares && squares.length >= 2) {
           // User specified exact squares
           const from = squares[0];
           const to = squares[1];
           
           annotations.push({
               type: 'arrow',
               from: from,
               to: to,
               reason: 'Requested move'
           });
           
           explanation = `🏹 **Move Demonstration:**\n\nShowing the requested move from ${from} to ${to}.`;
       }
       // Check for best move requests
       else if (lower.includes('best move') || lower.includes('good move') || lower.includes('recommended')) {
           return this.showBestMoveArrow(context);
       }
       // Check for strategic move requests
       else if (lower.includes('strategy') || lower.includes('plan')) {
           return this.showStrategicMove(context);
       }
       // Generic arrow request
       else {
           return this.showSampleMove(context);
       }
       
       return { annotations, explanation };
   },
   
   /**
    * Analyze position for highlight annotations (pieces/squares) - UPDATED FUNCTION
    */
   async analyzeForHighlights(context, message) {
       const lower = message.toLowerCase();
       
       console.log('🔍 Strategic Annotation: Analyzing position for highlights:', message);
       
       // KING-specific requests
       if (lower.includes('king')) {
           return this.highlightKings(context);
       }
       
       // PIECE-specific requests
       if (lower.includes('queen')) {
           return this.highlightQueens(context);
       }
       
       if (lower.includes('knight')) {
           return this.highlightKnights(context);
       }
       
       if (lower.includes('bishop')) {
           return this.highlightBishops(context);
       }
       
       if (lower.includes('rook')) {
           return this.highlightRooks(context);
       }
       
       if (lower.includes('pawn')) {
           return this.highlightPawns(context);
       }
       
       // WEAKNESS/THREAT analysis
       if (lower.includes('weakness') || lower.includes('threat') || lower.includes('vulnerable')) {
           return this.analyzeWeaknesses(context);
       }
       
       // CENTER control
       if (lower.includes('center')) {
           return this.analyzeCenterControl(context);
       }
       
       // DEVELOPMENT analysis
       if (lower.includes('development')) {
           return this.analyzeDevelopment(context);
       }
       
       // Default: general position analysis
       return this.analyzeGeneralPosition(context);
   },
   
   /**
    * Show best move with arrow (using engine analysis if available) - UPDATED FOR ARROWS
    */
   showBestMoveArrow(context) {
       const annotations = [];
       let explanation = "🎯 **Best Move Analysis:**\n\n";
       
       // Check if we have engine analysis
       if (context.engineAnalysis && context.engineAnalysis.bestMove) {
           const bestMove = context.engineAnalysis.bestMove;
           const evaluation = context.engineAnalysis.evaluation;
           
           // Parse move (assuming format like "e2e4" or "e2-e4")
           const from = bestMove.substring(0, 2);
           const to = bestMove.substring(2, 4);
           
           annotations.push({
               type: 'arrow',
               from: from,
               to: to,
               reason: 'Engine best move'
           });
           
           explanation += `The engine suggests ${bestMove} as the best move`;
           if (evaluation !== undefined) {
               explanation += ` (evaluation: ${evaluation})`;
           }
           explanation += ".";
           
       } else {
           explanation += "Engine analysis is not available. I'll show a common good move for the opening position.";
           
           // Fallback: show common opening moves based on position
           const fen = context.currentPosition.fen;
           const turn = context.currentPosition.turn;
           
           if (fen.includes('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR')) {
               // Starting position
               if (turn === 'White') {
                   annotations.push({
                       type: 'arrow',
                       from: 'e2',
                       to: 'e4',
                       reason: 'Good opening move'
                   });
                   explanation += " Showing e2-e4, a classic opening move that controls the center.";
               } else {
                   annotations.push({
                       type: 'arrow',
                       from: 'e7',
                       to: 'e5',
                       reason: 'Good opening response'
                   });
                   explanation += " Showing e7-e5, a solid response that mirrors White's center control.";
               }
           } else {
               // Mid-game position - show a sample strategic move
               annotations.push({
                   type: 'arrow',
                   from: 'g1',
                   to: 'f3',
                   reason: 'Development move'
               });
               explanation += " Showing a typical development move. For specific analysis, engine evaluation would be helpful.";
           }
       }
       
       return { annotations, explanation };
   },
   
   /**
    * Show strategic move suggestion - NEW FUNCTION
    */
   showStrategicMove(context) {
       const annotations = [];
       let explanation = "♟️ **Strategic Move Suggestion:**\n\n";
       
       const fen = context.currentPosition.fen;
       const turn = context.currentPosition.turn;
       
       // Basic strategic suggestions based on position
       if (fen.includes('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR')) {
           // Opening phase
           if (turn === 'White') {
               annotations.push({
                   type: 'arrow',
                   from: 'd2',
                   to: 'd4',
                   reason: 'Strategic center control'
               });
               explanation += "Controlling the center with d2-d4 is a fundamental strategic principle in the opening.";
           } else {
               annotations.push({
                   type: 'arrow',
                   from: 'd7',
                   to: 'd5',
                   reason: 'Counter-center strategy'
               });
               explanation += "Responding with d7-d5 challenges White's center and fights for space.";
           }
       } else {
           // General strategic move
           annotations.push({
               type: 'arrow',
               from: 'b1',
               to: 'c3',
               reason: 'Piece development'
           });
           explanation += "Developing pieces toward the center is usually a good strategic approach.";
       }
       
       return { annotations, explanation };
   },
   
   /**
    * Show sample move for generic requests - NEW FUNCTION
    */
   showSampleMove(context) {
       const annotations = [];
       
       annotations.push({
           type: 'arrow',
           from: 'e2',
           to: 'e4',
           reason: 'Sample move'
       });
       
       const explanation = "🏹 **Arrow Demonstration:**\n\nI've drawn a sample arrow from e2 to e4. To request specific moves, try: 'Show the best move' or 'Draw an arrow from d2 to d4'.";
       
       return { annotations, explanation };
   },
   
   /**
    * Highlight king squares
    */
   highlightKings(context) {
       const annotations = [];
       const fen = context.currentPosition.fen;
       
       const whiteKing = this.findKingSquare(fen, 'White');
       const blackKing = this.findKingSquare(fen, 'Black');
       
       if (whiteKing) {
           annotations.push({
               type: 'highlight',
               square: whiteKing,
               reason: 'White King'
           });
       }
       
       if (blackKing) {
           annotations.push({
               type: 'highlight',
               square: blackKing,
               reason: 'Black King'
           });
       }
       
       let explanation = "👑 **King Analysis:**\n\n";
       if (whiteKing) explanation += `White king is on ${whiteKing}. `;
       if (blackKing) explanation += `Black king is on ${blackKing}. `;
       
       if (context.gameStatus.isCheck) {
           const kingInCheck = context.currentPosition.turn === 'White' ? whiteKing : blackKing;
           explanation += `\n\n⚠️ The ${context.currentPosition.turn.toLowerCase()} king on ${kingInCheck} is currently in check!`;
       } else {
           explanation += "\n\nBoth kings appear to be safe for now.";
       }
       
       return { annotations, explanation };
   },
   
   /**
    * Highlight all queens
    */
   highlightQueens(context) {
       const annotations = [];
       const queens = this.findPieceSquares(context.currentPosition.fen, ['Q', 'q']);
       
       queens.forEach(({square, piece}) => {
           const color = piece === 'Q' ? 'White' : 'Black';
           annotations.push({
               type: 'highlight',
               square: square,
               reason: `${color} Queen`
           });
       });
       
       const explanation = `👸 **Queen Analysis:**\n\nFound ${queens.length} queen(s) on the board: ${queens.map(q => `${q.piece === 'Q' ? 'White' : 'Black'} queen on ${q.square}`).join(', ')}.`;
       
       return { annotations, explanation };
   },
   
   /**
    * Highlight all knights
    */
   highlightKnights(context) {
       const annotations = [];
       const knights = this.findPieceSquares(context.currentPosition.fen, ['N', 'n']);
       
       knights.forEach(({square, piece}) => {
           const color = piece === 'N' ? 'White' : 'Black';
           annotations.push({
               type: 'highlight',
               square: square,
               reason: `${color} Knight`
           });
       });
       
       const explanation = `🐴 **Knight Analysis:**\n\nFound ${knights.length} knight(s) on the board: ${knights.map(k => `${k.piece === 'N' ? 'White' : 'Black'} knight on ${k.square}`).join(', ')}.`;
       
       return { annotations, explanation };
   },
   
   /**
    * Highlight all bishops
    */
   highlightBishops(context) {
       const annotations = [];
       const bishops = this.findPieceSquares(context.currentPosition.fen, ['B', 'b']);
       
       bishops.forEach(({square, piece}) => {
           const color = piece === 'B' ? 'White' : 'Black';
           annotations.push({
               type: 'highlight',
               square: square,
               reason: `${color} Bishop`
           });
       });
       
       const explanation = `♗ **Bishop Analysis:**\n\nFound ${bishops.length} bishop(s) on the board: ${bishops.map(b => `${b.piece === 'B' ? 'White' : 'Black'} bishop on ${b.square}`).join(', ')}.`;
       
       return { annotations, explanation };
   },
   
   /**
    * Highlight all rooks
    */
   highlightRooks(context) {
       const annotations = [];
       const rooks = this.findPieceSquares(context.currentPosition.fen, ['R', 'r']);
       
       rooks.forEach(({square, piece}) => {
           const color = piece === 'R' ? 'White' : 'Black';
           annotations.push({
               type: 'highlight',
               square: square,
               reason: `${color} Rook`
           });
       });
       
       const explanation = `♖ **Rook Analysis:**\n\nFound ${rooks.length} rook(s) on the board: ${rooks.map(r => `${r.piece === 'R' ? 'White' : 'Black'} rook on ${r.square}`).join(', ')}.`;
       
       return { annotations, explanation };
   },
   
   /**
    * Highlight all pawns
    */
   highlightPawns(context) {
       const annotations = [];
       const pawns = this.findPieceSquares(context.currentPosition.fen, ['P', 'p']);
       
       pawns.forEach(({square, piece}) => {
           const color = piece === 'P' ? 'White' : 'Black';
           annotations.push({
               type: 'highlight',
               square: square,
               reason: `${color} Pawn`
           });
       });
       
       const explanation = `♟️ **Pawn Analysis:**\n\nFound ${pawns.length} pawn(s) on the board. Pawns form the backbone of your position and control key squares.`;
       
       return { annotations, explanation };
   },
   
   /**
    * Analyze weaknesses and threats
    */
   analyzeWeaknesses(context) {
       const annotations = [];
       let explanation = "⚠️ **Weakness Analysis:**\n\n";
       
       const fen = context.currentPosition.fen;
       const turn = context.currentPosition.turn;
       
       // Check for king safety
       const kingSquare = this.findKingSquare(fen, turn);
       if (kingSquare) {
           const backRankCheck = this.checkBackRankWeakness(fen, turn);
           if (backRankCheck.hasWeakness) {
               annotations.push({
                   type: 'highlight',
                   square: kingSquare,
                   reason: 'King vulnerability'
               });
               explanation += `The ${turn.toLowerCase()} king on ${kingSquare} may be vulnerable to back-rank tactics.\n\n`;
           }
       }
       
       // Check for undefended pieces (simplified)
       const allPieces = this.findPieceSquares(fen, ['Q', 'R', 'B', 'N', 'q', 'r', 'b', 'n']);
       const vulnerablePieces = allPieces.filter(({piece}) => {
           // Simple heuristic: major pieces that might be exposed
           return ['Q', 'R', 'q', 'r'].includes(piece);
       }).slice(0, 2); // Limit to avoid too many highlights
       
       vulnerablePieces.forEach(({square, piece}) => {
           const color = piece === piece.toUpperCase() ? 'White' : 'Black';
           annotations.push({
               type: 'highlight',
               square: square,
               reason: `${color} ${this.getPieceName(piece)} to watch`
           });
       });
       
       if (vulnerablePieces.length > 0) {
           explanation += `Keep an eye on these valuable pieces: ${vulnerablePieces.map(p => `${this.getPieceName(p.piece)} on ${p.square}`).join(', ')}.`;
       } else {
           explanation += "No obvious weaknesses detected in the current position.";
       }
       
       return { annotations, explanation };
   },
   
   /**
    * Analyze center control
    */
   analyzeCenterControl(context) {
       const annotations = [];
       const centerSquares = ['d4', 'd5', 'e4', 'e5'];
       const extendedCenter = ['c3', 'c4', 'c5', 'c6', 'd3', 'd6', 'e3', 'e6', 'f3', 'f4', 'f5', 'f6'];
       
       let explanation = "🎯 **Center Control Analysis:**\n\n";
       
       // Find pieces on center squares
       const piecesOnCenter = this.findPiecesOnSquares(context.currentPosition.fen, centerSquares);
       const piecesNearCenter = this.findPiecesOnSquares(context.currentPosition.fen, extendedCenter);
       
       // Highlight center squares with pieces
       piecesOnCenter.forEach(({square, piece}) => {
           annotations.push({
               type: 'highlight',
               square: square,
               reason: 'Center control'
           });
       });
       
       // If no pieces in center, highlight the center squares themselves
       if (piecesOnCenter.length === 0) {
           centerSquares.forEach(square => {
               annotations.push({
                   type: 'highlight',
                   square: square,
                   reason: 'Key center square'
               });
           });
           explanation += "The central squares d4, d5, e4, e5 are currently unoccupied. Control of these squares is crucial for a strong position.\n\n";
       } else {
           explanation += `Center occupation: ${piecesOnCenter.map(p => `${this.getPieceName(p.piece)} on ${p.square}`).join(', ')}.\n\n`;
       }
       
       explanation += "Remember: controlling the center gives you more space and better piece coordination!";
       
       return { annotations, explanation };
   },
   
   /**
    * Analyze piece development
    */
   analyzeDevelopment(context) {
       const annotations = [];
       let explanation = "🏗️ **Development Analysis:**\n\n";
       
       const fen = context.currentPosition.fen;
       
       // Check for undeveloped pieces (knights and bishops on starting squares)
       const undevelopedWhite = this.findPiecesOnSquares(fen, ['b1', 'c1', 'f1', 'g1'], ['N', 'B']);
       const undevelopedBlack = this.findPiecesOnSquares(fen, ['b8', 'c8', 'f8', 'g8'], ['n', 'b']);
       
       const allUndeveloped = [...undevelopedWhite, ...undevelopedBlack];
       
       allUndeveloped.forEach(({square, piece}) => {
           const color = piece === piece.toUpperCase() ? 'White' : 'Black';
           annotations.push({
               type: 'highlight',
               square: square,
               reason: `Undeveloped ${color.toLowerCase()} ${this.getPieceName(piece)}`
           });
       });
       
       if (allUndeveloped.length > 0) {
           explanation += `Undeveloped pieces: ${allUndeveloped.map(p => `${this.getPieceName(p.piece)} on ${p.square}`).join(', ')}.\n\n`;
           explanation += "Consider developing these pieces to more active squares!";
       } else {
           explanation += "Good job! Most pieces appear to be developed from their starting positions.";
       }
       
       return { annotations, explanation };
   },
   
   /**
    * General position analysis
    */
   analyzeGeneralPosition(context) {
       const annotations = [];
       let explanation = "📊 **General Position Analysis:**\n\n";
       
       const fen = context.currentPosition.fen;
       const turn = context.currentPosition.turn;
       
       // Highlight both kings
       const whiteKing = this.findKingSquare(fen, 'White');
       const blackKing = this.findKingSquare(fen, 'Black');
       
       if (whiteKing) {
           annotations.push({
               type: 'highlight',
               square: whiteKing,
               reason: 'White King'
           });
       }
       
       if (blackKing) {
           annotations.push({
               type: 'highlight',
               square: blackKing,
               reason: 'Black King'
           });
       }
       
       explanation += `It's ${turn}'s turn to move. `;
       
       if (context.gameStatus.isCheck) {
           explanation += `${turn} is in check! `;
       }
       
       explanation += `\n\nKing positions: White on ${whiteKing}, Black on ${blackKing}.`;
       
       return { annotations, explanation };
   },
   
   // =============================================================================
   // UTILITY METHODS - Enhanced chess analysis helpers
   // =============================================================================
   
   /**
    * Find squares containing specific pieces
    */
   findPieceSquares(fen, pieceTypes) {
       const position = fen.split(' ')[0];
       const ranks = position.split('/');
       const pieces = [];
       
       for (let rankIndex = 0; rankIndex < 8; rankIndex++) {
           const rank = ranks[rankIndex];
           let fileIndex = 0;
           
           for (let char of rank) {
               if (pieceTypes.includes(char)) {
                   const file = String.fromCharCode(97 + fileIndex); // 'a' + fileIndex
                   const rankNum = 8 - rankIndex;
                   pieces.push({
                       square: file + rankNum,
                       piece: char
                   });
               }
               
               if (char >= '1' && char <= '8') {
                   fileIndex += parseInt(char);
               } else {
                   fileIndex++;
               }
           }
       }
       
       return pieces;
   },
   
   /**
    * Find pieces on specific squares
    */
   findPiecesOnSquares(fen, squares, pieceTypes = null) {
       const position = fen.split(' ')[0];
       const ranks = position.split('/');
       const pieces = [];
       
       for (let rankIndex = 0; rankIndex < 8; rankIndex++) {
           const rank = ranks[rankIndex];
           let fileIndex = 0;
           
           for (let char of rank) {
               if (char !== '/' && isNaN(char)) {
                   const file = String.fromCharCode(97 + fileIndex);
                   const rankNum = 8 - rankIndex;
                   const square = file + rankNum;
                   
                   if (squares.includes(square)) {
                       if (!pieceTypes || pieceTypes.includes(char)) {
                           pieces.push({
                               square: square,
                               piece: char
                           });
                       }
                   }
               }
               
               if (char >= '1' && char <= '8') {
                   fileIndex += parseInt(char);
               } else {
                   fileIndex++;
               }
           }
       }
       
       return pieces;
   },
   
   /**
    * Get piece name for display
    */
   getPieceName(piece) {
       const names = {
           'K': 'King', 'Q': 'Queen', 'R': 'Rook', 'B': 'Bishop', 'N': 'Knight', 'P': 'Pawn',
           'k': 'King', 'q': 'Queen', 'r': 'Rook', 'b': 'Bishop', 'n': 'Knight', 'p': 'Pawn'
       };
       return names[piece] || 'Unknown';
   },
   
   /**
    * Find king square for given color
    */
   findKingSquare(fen, color) {
       const position = fen.split(' ')[0];
       const king = color === 'White' ? 'K' : 'k';
       
       const ranks = position.split('/');
       for (let rankIndex = 0; rankIndex < 8; rankIndex++) {
           const rank = ranks[rankIndex];
           let fileIndex = 0;
           
           for (let char of rank) {
               if (char === king) {
                   const file = String.fromCharCode(97 + fileIndex); // 'a' + fileIndex
                   const rankNum = 8 - rankIndex;
                   return file + rankNum;
               } else if (char >= '1' && char <= '8') {
                   fileIndex += parseInt(char);
               } else {
                   fileIndex++;
               }
           }
       }
       return null;
   },
   
   /**
    * Check for back rank weakness
    */
   checkBackRankWeakness(fen, color) {
       const kingSquare = this.findKingSquare(fen, color);
       if (!kingSquare) return { hasWeakness: false };
       
       const kingRank = kingSquare[1];
       const expectedBackRank = color === 'White' ? '1' : '8';
       
       return {
           hasWeakness: kingRank === expectedBackRank,
           kingSquare: kingSquare
       };
   },
   
   /**
    * Apply annotations to the board
    */
   applyAnnotations(annotationSystem, annotations) {
       annotations.forEach(annotation => {
           try {
               if (annotation.type === 'highlight') {
                   annotationSystem.addSquareHighlight(annotation.square);
                   console.log(`✅ Applied highlight to ${annotation.square}: ${annotation.reason}`);
               } else if (annotation.type === 'arrow') {
                   annotationSystem.addArrow(annotation.from, annotation.to);
                   console.log(`✅ Applied arrow from ${annotation.from} to ${annotation.to}: ${annotation.reason}`);
               }
           } catch (error) {
               console.error(`❌ Failed to apply annotation:`, error);
           }
       });
   }
};

// Make sure the plugin is available globally
window.strategicAnnotationPlugin = strategicAnnotationPlugin;

// =============================================================================
// GLOBAL EXPORTS - Make available to other scripts
// =============================================================================

if (typeof window !== 'undefined') {
    window.FeaturePlugins = FeaturePlugins;
    window.openingLookupPlugin = openingLookupPlugin;
    window.positionLoadingPlugin = positionLoadingPlugin;
    window.strategicAnnotationPlugin = strategicAnnotationPlugin;
    
    console.log('✅ Feature Plugins System loaded with', 3, 'plugins available');
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        FeaturePlugins,
        openingLookupPlugin,
        positionLoadingPlugin
    };
}