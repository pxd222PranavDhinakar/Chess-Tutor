// File: ai/tools/chess-tools/chess-tools.js
// Chess Tools - Fixed for Electron CommonJS

console.log('🟢 ChessTools file is loading...');

try {
    console.log('🟢 Starting ChessTools initialization...');
    
    // Use CommonJS require instead of ES6 import
    const { tool } = require('@langchain/core/tools');
    const { z } = require('zod');
    
    console.log('🟢 LangChain dependencies loaded successfully');

    /**
     * Tool for searching openings by name
     */
    const searchOpeningTool = tool(
        async ({ searchTerm }) => {
            try {
                console.log('🔍 SearchOpeningTool: Searching for:', searchTerm);
                
                // Access the global opening knowledge system
                if (!window.openingKnowledgeSystem || !window.openingKnowledgeSystem.isInitialized) {
                    return JSON.stringify({
                        success: false,
                        error: "Opening database not available"
                    });
                }
                
                // Try multiple search variations
                let results = window.openingKnowledgeSystem.searchByName(searchTerm);
                if (results.length === 0) {
                    // Try capitalized version
                    const capitalizedTerm = searchTerm.split(' ').map(word => 
                        word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
                    ).join(' ');
                    results = window.openingKnowledgeSystem.searchByName(capitalizedTerm);
                }
                if (results.length === 0) {
                    // Try just the first word
                    const firstWord = searchTerm.split(' ')[0];
                    results = window.openingKnowledgeSystem.searchByName(firstWord);
                }
                
                if (results.length === 0) {
                    return JSON.stringify({
                        success: false,
                        message: `No openings found matching "${searchTerm}"`
                    });
                }
                
                // Format results for the AI
                const formattedResults = results.map(opening => ({
                    name: opening.name,
                    eco: opening.eco,
                    variation: opening.variation,
                    moves: opening.moves,
                    category: opening.category,
                    fen: opening.fen || "FEN not available",
                    principles: opening.principles?.slice(0, 3) || [],
                    strategicThemes: opening.strategicThemes || []
                }));
                
                console.log('✅ SearchOpeningTool: Found', results.length, 'results');
                
                return JSON.stringify({
                    success: true,
                    count: results.length,
                    openings: formattedResults
                });
                
            } catch (error) {
                console.error('❌ SearchOpeningTool: Error:', error);
                return JSON.stringify({
                    success: false,
                    error: error.message
                });
            }
        },
        {
            name: "search_opening",
            description: "Search for chess openings by name. Use this when the user asks about a specific opening or wants to learn about openings with certain names.",
            schema: z.object({
                searchTerm: z.string().describe("The name or partial name of the opening to search for (e.g. 'sicilian', 'french', 'ruy lopez')")
            })
        }
    );

    /**
     * Tool for loading a position by FEN
     */
    const loadPositionTool = tool(
        async ({ fen, reason }) => {
            try {
                console.log('🎯 LoadPositionTool: Loading FEN:', fen);
                console.log('🎯 LoadPositionTool: Reason:', reason);
                
                // Validate FEN format (basic check)
                if (!fen || typeof fen !== 'string' || fen.split(' ').length < 4) {
                    return JSON.stringify({
                        success: false,
                        error: "Invalid FEN format provided"
                    });
                }
                
                // Access the global app orchestrator to load the position
                if (!window.appOrchestrator) {
                    return JSON.stringify({
                        success: false,
                        error: "App orchestrator not available"
                    });
                }

                // Create loadFEN method if it doesn't exist
                if (typeof window.appOrchestrator.loadFEN !== 'function') {
                    window.appOrchestrator.loadFEN = function(fenString) {
                        try {
                            console.log('🎯 AppOrchestrator.loadFEN: Loading FEN via tool:', fenString);
                            
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
                                this.uiUpdater.log(`✅ Tool loaded FEN: ${fenString}`, 'success');
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
                    };
                    console.log('✅ LoadPositionTool: Created loadFEN method on appOrchestrator');
                }
                
                // Load the FEN onto the board
                const loadResult = window.appOrchestrator.loadFEN(fen);
                
                if (loadResult === false) {
                    return JSON.stringify({
                        success: false,
                        error: "Failed to load FEN - invalid position"
                    });
                }
                
                // Get opening information for this position
                let openingInfo = null;
                if (window.openingKnowledgeSystem?.isInitialized) {
                    openingInfo = window.openingKnowledgeSystem.getOpeningInfo(fen);
                }
                
                console.log('✅ LoadPositionTool: Successfully loaded position');
                
                return JSON.stringify({
                    success: true,
                    message: `Position loaded successfully. ${reason}`,
                    fen: fen,
                    openingInfo: openingInfo ? {
                        name: openingInfo.name,
                        eco: openingInfo.eco,
                        moves: openingInfo.moves,
                        principles: openingInfo.principles?.slice(0, 3) || []
                    } : null
                });
                
            } catch (error) {
                console.error('❌ LoadPositionTool: Error:', error);
                return JSON.stringify({
                    success: false,
                    error: error.message
                });
            }
        },
        {
            name: "load_position",
            description: "Load a chess position onto the board using FEN notation. Use this to show specific positions to teach openings, demonstrate tactical patterns, or set up positions for analysis.",
            schema: z.object({
                fen: z.string().describe("The FEN (Forsyth-Edwards Notation) string representing the chess position to load"),
                reason: z.string().describe("Brief explanation of why you're loading this position (e.g. 'to demonstrate the French Defense setup')")
            })
        }
    );

    /**
     * Tool for getting detailed opening information
     */
    const getOpeningDetailsTool = tool(
        async ({ ecoCode, openingName }) => {
            try {
                console.log('📚 GetOpeningDetailsTool: Getting details for:', ecoCode || openingName);
                
                if (!window.openingKnowledgeSystem?.isInitialized) {
                    return JSON.stringify({
                        success: false,
                        error: "Opening database not available"
                    });
                }
                
                let openingData = null;
                
                // Search by ECO code if provided
                if (ecoCode) {
                    // Need to search through database for ECO code
                    for (const [fen, data] of Object.entries(window.openingKnowledgeSystem.ecoDatabase)) {
                        if (data.eco === ecoCode) {
                            openingData = window.openingKnowledgeSystem.enrichOpeningData(data);
                            openingData.fen = fen;
                            break;
                        }
                    }
                }
                
                // Search by name if ECO code not found or not provided
                if (!openingData && openingName) {
                    const searchResults = window.openingKnowledgeSystem.searchByName(openingName);
                    if (searchResults.length > 0) {
                        openingData = searchResults[0];
                        // Find the FEN for this opening
                        for (const [fen, data] of Object.entries(window.openingKnowledgeSystem.ecoDatabase)) {
                            if (data.name === openingData.name && data.eco === openingData.eco) {
                                openingData.fen = fen;
                                break;
                            }
                        }
                    }
                }
                
                if (!openingData) {
                    return JSON.stringify({
                        success: false,
                        message: `No opening found for ${ecoCode || openingName}`
                    });
                }
                
                console.log('✅ GetOpeningDetailsTool: Found opening details');
                
                return JSON.stringify({
                    success: true,
                    opening: {
                        name: openingData.name,
                        eco: openingData.eco,
                        variation: openingData.variation,
                        moves: openingData.moves,
                        category: openingData.category,
                        fen: openingData.fen,
                        moveCount: openingData.moveCount,
                        isMainLine: openingData.isMainLine,
                        principles: openingData.principles || [],
                        strategicThemes: openingData.strategicThemes || [],
                        commonContinuations: openingData.commonContinuations || []
                    }
                });
                
            } catch (error) {
                console.error('❌ GetOpeningDetailsTool: Error:', error);
                return JSON.stringify({
                    success: false,
                    error: error.message
                });
            }
        },
        {
            name: "get_opening_details",
            description: "Get comprehensive details about a specific chess opening, including strategic themes, principles, and typical moves.",
            schema: z.object({
                ecoCode: z.string().optional().describe("The ECO code of the opening (e.g. 'C00', 'B22')"),
                openingName: z.string().optional().describe("The name of the opening (e.g. 'French Defense', 'Sicilian Dragon')")
            })
        }
    );

    /**
     * Tool for analyzing the current board position
     */
    const analyzeCurrentPositionTool = tool(
        async ({ analysisType }) => {
            try {
                console.log('🧠 AnalyzeCurrentPositionTool: Analysis type:', analysisType);
                
                // Get current game state
                if (!window.gameStateContextBridge?.isReady()) {
                    return JSON.stringify({
                        success: false,
                        error: "Game state not available"
                    });
                }
                
                const gameContext = window.gameStateContextBridge.getContextForAI();
                
                if (!gameContext.available) {
                    return JSON.stringify({
                        success: false,
                        error: "Current position not available"
                    });
                }
                
                const currentPosition = gameContext.currentPosition;
                const gameStatus = gameContext.gameStatus;
                
                // Get opening information if available
                let openingInfo = null;
                if (window.openingKnowledgeSystem?.isInitialized) {
                    openingInfo = window.openingKnowledgeSystem.getOpeningInfo(currentPosition.fen);
                }
                
                // Format analysis based on type
                let analysis = {
                    fen: currentPosition.fen,
                    turn: currentPosition.turn,
                    moveNumber: currentPosition.moveNumber,
                    gamePhase: gameContext.positionInfo?.gamePhase || "unknown"
                };
                
                switch (analysisType) {
                    case 'opening':
                        analysis.openingInfo = openingInfo;
                        analysis.focus = "Opening analysis and theory";
                        break;
                    case 'tactical':
                        analysis.gameStatus = gameStatus;
                        analysis.focus = "Tactical opportunities and threats";
                        break;
                    case 'strategic':
                        analysis.focus = "Strategic elements and position evaluation";
                        break;
                    default:
                        analysis.focus = "General position analysis";
                }
                
                console.log('✅ AnalyzeCurrentPositionTool: Analysis complete');
                
                return JSON.stringify({
                    success: true,
                    analysis: analysis
                });
                
            } catch (error) {
                console.error('❌ AnalyzeCurrentPositionTool: Error:', error);
                return JSON.stringify({
                    success: false,
                    error: error.message
                });
            }
        },
        {
            name: "analyze_current_position",
            description: "Analyze the current chess position on the board. Use this to get information about the current game state before providing coaching advice.",
            schema: z.object({
                analysisType: z.enum(['opening', 'tactical', 'strategic', 'general']).describe("Type of analysis to perform")
            })
        }
    );

    // Create ChessTools class
    class ChessTools {
        constructor() {
            console.log('🟢 ChessTools constructor called');
            this.tools = [
                searchOpeningTool,
                loadPositionTool,
                getOpeningDetailsTool,
                analyzeCurrentPositionTool
            ];
            this.isInitialized = true;
        }
        
        async initialize() {
            console.log('🟢 ChessTools initialize called');
            return this.tools;
        }
        
        getToolsArray() {
            console.log('🟢 ChessTools getToolsArray called');
            return this.tools;
        }
        
        getToolsInfo() {
            console.log('🟢 ChessTools getToolsInfo called');
            return this.tools.map(tool => ({
                name: tool.name,
                description: tool.description
            }));
        }
    }

    console.log('🟢 Making ChessTools available globally...');
    window.ChessTools = ChessTools;
    console.log('🟢 ChessTools assigned to window:', typeof window.ChessTools);
    
    // Also export the tools array directly for compatibility
    window.chessTools = [
        searchOpeningTool,
        loadPositionTool,
        getOpeningDetailsTool,
        analyzeCurrentPositionTool
    ];
    
    console.log('🟢 ChessTools tools count:', window.chessTools.length);
    
} catch (error) {
    console.error('🔴 Error in ChessTools file:', error);
    console.error('🔴 Error stack:', error.stack);
}

console.log('🟢 ChessTools file loaded completely');