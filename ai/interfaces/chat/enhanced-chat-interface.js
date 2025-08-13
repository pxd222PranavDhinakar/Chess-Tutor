// File: ai/interfaces/chat/enhanced-chat-interface.js
// Enhanced chat interface with tool-calling capabilities - FIXED for Ollama

class EnhancedChatInterface {
    constructor() {
        this.llm = null;
        this.agent = null;
        this.agentExecutor = null;
        this.isInitialized = false;
        this.conversationHistory = [];
        this.gameStateContextBridge = null;
        this.tools = [];
        this.chessTools = null;
        
        // Enhanced system prompt with tool awareness
        this.systemPrompt = `You are a friendly and knowledgeable chess coach and tutor with access to powerful tools to help teach chess.

Your capabilities and tools:
- SEARCH OPENINGS: Use search_opening tool to find openings by name
- LOAD POSITIONS: Use load_position tool to set up specific positions on the board
- GET OPENING DETAILS: Use get_opening_details tool for comprehensive opening information
- ANALYZE POSITIONS: Use analyze_current_position tool to examine the current board

Your teaching approach:
- When a user asks about a specific opening, use your tools to:
  1. Search for the opening to get basic info
  2. Get detailed information about it
  3. Load the position on the board to demonstrate
  4. Explain the key concepts and strategies

Your personality:
- Be encouraging and supportive
- Use your tools proactively to enhance learning
- Always explain WHY you're using a tool
- Break down complex concepts into digestible steps
- Ask follow-up questions to deepen understanding

Tool Usage Guidelines:
- Use search_opening when users ask about openings by name
- Use load_position to demonstrate positions and teach visually
- Use get_opening_details for comprehensive opening information
- Use analyze_current_position before giving advice about the current game
- Always explain to the user what you're doing with the tools

Example interaction flow:
User: "Teach me the French Defense"
1. Use search_opening to find French Defense variations
2. Use get_opening_details to get comprehensive info
3. Use load_position to set up the typical French Defense position
4. Explain the key ideas, strategies, and typical moves

Remember: You have the power to actively demonstrate chess concepts by loading positions and accessing detailed opening information.

If the user asks about identifying the current position or opening (like "What opening is this?"), always use the analyze_current_position tool to examine the current board state.`;
        
        console.log('🔧 EnhancedChatInterface: Initializing with tools...');
    }

    /**
     * Initialize the enhanced chat interface - FIXED FOR OLLAMA
     */
    async initialize(gameStateContextBridge) {
        console.log('🚀 EnhancedChatInterface: Starting initialization...');
        
        this.gameStateContextBridge = gameStateContextBridge;

        try {
            // ✅ FIXED: Import LangChain components for Ollama (same as working chat-interface.js)
            const { HumanMessage, AIMessage, SystemMessage } = require('@langchain/core/messages');
            const { ChatOllama } = require('@langchain/ollama');  // ✅ Use ChatOllama, not ChatOpenAI
            
            this.HumanMessage = HumanMessage;
            this.AIMessage = AIMessage;
            this.SystemMessage = SystemMessage;
            
            // ✅ FIXED: Initialize with Ollama (exact same config as working chat-interface.js)
            this.llm = new ChatOllama({
                model: "llama3.2:3b",
                temperature: 0.3,        // Same as working version
                num_predict: 200,        // Increased for tool usage
                top_p: 0.5,             // Same as working version
                top_k: 10,              // Same as working version
                baseUrl: "http://localhost:11434",
            });
            
            console.log('🔧 EnhancedChatInterface: LLM initialized');
            
            // Initialize chess tools
            this.chessTools = new window.ChessTools();
            await this.chessTools.initialize();
            this.tools = this.chessTools.getToolsArray();
            
            console.log('🔧 EnhancedChatInterface: Loaded', this.tools.length, 'chess tools');
            
            this.isInitialized = true;
            console.log('✅ EnhancedChatInterface: Initialized successfully with tools');
            
            // Test basic LLM connection (but don't block initialization)
            try {
                const testResponse = await this.llm.invoke([new this.SystemMessage('Respond with "OK"'), new this.HumanMessage('Test')]);
                console.log('✅ EnhancedChatInterface: Basic LLM connection test successful');
            } catch (testError) {
                console.warn('⚠️ EnhancedChatInterface: LLM test failed but continuing:', testError.message);
            }
            
            return true;
            
        } catch (error) {
            console.error('❌ EnhancedChatInterface: Initialization failed:', error);
            this.isInitialized = false;
            throw error;
        }
    }

    /**
     * Send a message and get a response - FIXED VERSION
     */
    async sendMessage(userMessage) {
        console.log('📨 EnhancedChatInterface: Processing message with tools:', userMessage);
        
        try {
            // Plan tool usage based on message content
            const plan = this.analyzeMessageForToolUsage(userMessage);
            console.log('🧠 Tool usage plan:', plan);
            
            let toolResults = [];
            
            // Execute tools if needed
            if (plan.shouldUseTool && plan.toolSequence.length > 0) {
                console.log('🛠️ Executing tool sequence:', plan.toolSequence);
                toolResults = await this.executeTools(plan);
            }
            
            // ✅ QUICK FIX: If we have tool results for opening identification, return directly
            if (toolResults.length > 0 && plan.reason === 'Opening identification question detected') {
                const result = toolResults[0];
                console.log('🔍 DEBUG: Tool result for opening identification:', JSON.stringify(result, null, 2));
                
                if (result.success && result.result.analysis) {
                    const analysis = result.result.analysis;
                    console.log('🔍 DEBUG: Analysis object:', JSON.stringify(analysis, null, 2));
                    
                    if (analysis.openingInfo) {
                        const opening = analysis.openingInfo;
                        console.log('🔍 DEBUG: Found opening info:', JSON.stringify(opening, null, 2));
                        return `This position is from the **${opening.name}** (${opening.eco}). ${opening.moves ? `The moves are: ${opening.moves}` : ''}`;
                    } else {
                        console.log('❌ DEBUG: No openingInfo in analysis object');
                        // Let's check if the opening info is available in the game context directly
                        const gameContext = this.getGameStateContext();
                        if (gameContext && gameContext.openingKnowledge && gameContext.openingKnowledge.available) {
                            const opening = gameContext.openingKnowledge.opening;
                            console.log('🔍 DEBUG: Found opening in game context:', opening.name);
                            return `This position is from the **${opening.name}** (${opening.eco}). The moves that led to this position are: ${opening.moves || 'Not available'}`;
                        } else {
                            console.log('❌ DEBUG: No opening info in game context either');
                        }
                    }
                } else {
                    console.log('❌ DEBUG: Tool result not successful or no analysis');
                }
            }
            
            // For other cases, try LLM or use fallback
            try {
                // Build conversation context with tool results
                const messages = this.buildConversationContext(userMessage, toolResults);
                
                // Get response from LLM
                const response = await this.llm.invoke(messages);
                const assistantReply = response.content || 'I apologize, but I couldn\'t generate a proper response. Could you try rephrasing?';
                
                // Update conversation history
                this.updateConversationHistory(userMessage, assistantReply);
                
                console.log('✅ EnhancedChatInterface: Response ready:', assistantReply.slice(0, 100) + '...');
                return assistantReply;
            } catch (llmError) {
                console.log('⚠️ LLM failed, using tool results fallback');
                return this.buildToolResultsFallback(userMessage, toolResults);
            }
            
        } catch (error) {
            console.error('❌ EnhancedChatInterface: Error in sendMessage:', error);
            console.error('❌ Error details:', error.stack);
            
            // Fallback to basic response if enhanced features fail
            return this.getFallbackResponse(userMessage, error);
        }
    }
    
    /**
     * Analyze message for tool usage - FIXED VERSION
     */
    analyzeMessageForToolUsage(message) {
        const lowerMessage = message.toLowerCase();
        
        console.log('🧠 Analyzing message for tool usage:', lowerMessage);
        
        const openingName = this.extractOpeningNameSimple(lowerMessage);
        console.log('🔍 Extracted opening:', openingName);
        
        // ✅ FIXED: Opening identification questions - should analyze current position
        if (lowerMessage.includes('what opening') || lowerMessage.includes('which opening') || 
            lowerMessage.includes('opening is this') || lowerMessage.includes('what\'s this opening') ||
            lowerMessage.includes('identify this opening') || lowerMessage.includes('name of this opening') ||
            lowerMessage.includes('current opening') || lowerMessage.includes('what opening is this')) {
            
            console.log('🎯 Detected: Opening identification question');
            return {
                shouldUseTool: true,
                toolSequence: ['analyze_current_position'],  // ✅ FIXED - analyze current position
                analysisType: 'opening',  // ✅ FIXED - use valid enum value
                reason: 'Opening identification question detected'
            };
        }
        
        // Teaching about specific opening (different from identifying current opening)
        if (openingName && (lowerMessage.includes('teach') || lowerMessage.includes('learn') || 
            lowerMessage.includes('explain') || lowerMessage.includes('show me'))) {
            
            console.log('🎯 Detected: Opening teaching request');
            return {
                shouldUseTool: true,
                toolSequence: ['search_opening', 'get_opening_details', 'load_position'],
                openingName: openingName,
                reason: 'Opening teaching request detected'
            };
        }
        
        // Direct opening questions (tell me about X opening)
        if ((lowerMessage.includes('what is') || lowerMessage.includes('tell me about') || lowerMessage.includes('explain')) && 
            (openingName || lowerMessage.includes('opening') || lowerMessage.includes('defense'))) {
            
            console.log('🎯 Detected: Opening question');
            return {
                shouldUseTool: true,
                toolSequence: ['search_opening', 'get_opening_details'],
                openingName: openingName || 'french defense',
                reason: 'Opening question detected'
            };
        }
        
        // Position analysis
        if (lowerMessage.includes('analyze') || lowerMessage.includes('current position') || 
            lowerMessage.includes('what do you think') || lowerMessage.includes('evaluate')) {
            
            console.log('🎯 Detected: Analysis request');
            return {
                shouldUseTool: true,
                toolSequence: ['analyze_current_position'],
                analysisType: 'general',
                reason: 'Analysis request detected'
            };
        }
        
        // Load position requests
        if ((lowerMessage.includes('load') || lowerMessage.includes('set up') || lowerMessage.includes('demonstrate')) && 
            (openingName || lowerMessage.includes('position'))) {
            
            console.log('🎯 Detected: Load request');
            return {
                shouldUseTool: true,
                toolSequence: ['search_opening', 'load_position'],
                openingName: openingName || 'french defense',
                reason: 'Load position request detected'
            };
        }
        
        // If opening mentioned without other context, search for it
        if (openingName) {
            console.log('🎯 Detected: Opening mentioned');
            return {
                shouldUseTool: true,
                toolSequence: ['search_opening', 'get_opening_details'],
                openingName: openingName,
                reason: 'Opening mentioned'
            };
        }
        
        console.log('🔍 No tool usage needed');
        return {
            shouldUseTool: false,
            toolSequence: [],
            reason: 'No matching patterns detected'
        };
    }

    extractOpeningNameSimple(message) {
        const lowerMessage = message.toLowerCase();
        
        // List of known openings
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
            { name: 'scandinavian defense', patterns: ['scandinavian defense', 'scandinavian'] }
        ];
        
        for (const opening of openings) {
            for (const pattern of opening.patterns) {
                if (lowerMessage.includes(pattern)) {
                    console.log('🎯 Found opening:', opening.name);
                    return opening.name;
                }
            }
        }
        
        return null;
    }

    /**
     * Execute tools based on plan
     */
    async executeTools(plan) {
        const toolResults = [];
        let searchResults = null; // Store search results for later tools
        
        try {
            for (const toolName of plan.toolSequence) {
                console.log('🛠️ Executing tool:', toolName);
                
                const tool = this.tools.find(t => t.name === toolName);
                if (!tool) {
                    console.warn('⚠️ Tool not found:', toolName);
                    toolResults.push({
                        toolName,
                        error: 'Tool not found',
                        success: false
                    });
                    continue;
                }
                
                let toolInput = {};
                let result = null;
                
                // Prepare tool input based on tool type and plan
                try {
                    switch (toolName) {
                        case 'search_opening':
                            toolInput = { searchTerm: plan.openingName || 'french' };
                            result = await tool.call(toolInput);
                            
                            // Store search results for other tools
                            if (result) {
                                try {
                                    const parsed = JSON.parse(result);
                                    if (parsed.success && parsed.openings?.length > 0) {
                                        searchResults = parsed.openings;
                                        console.log('💾 Stored search results:', searchResults.length, 'openings');
                                    }
                                } catch (e) {
                                    console.warn('⚠️ Could not parse search results');
                                }
                            }
                            break;
                            
                        case 'get_opening_details':
                            toolInput = { openingName: plan.openingName || 'french defense' };
                            result = await tool.call(toolInput);
                            break;
                            
                        case 'load_position':
                            // Get FEN from search results or use a default French Defense position
                            let fenToLoad = null;
                            
                            if (searchResults && searchResults.length > 0 && searchResults[0].fen) {
                                fenToLoad = searchResults[0].fen;
                                console.log('🎯 Using FEN from search results:', fenToLoad);
                            } else {
                                // Default French Defense position: 1.e4 e6 2.d4 d5
                                fenToLoad = 'rnbqkbnr/ppp2ppp/4p3/3p4/3PP3/8/PPP2PPP/RNBQKBNR w KQkq - 0 3';
                                console.log('🎯 Using default French Defense FEN:', fenToLoad);
                            }
                            
                            toolInput = { 
                                fen: fenToLoad,
                                reason: `to demonstrate the ${plan.openingName || 'French Defense'} opening`
                            };
                            result = await tool.call(toolInput);
                            break;
                            
                        case 'analyze_current_position':
                            toolInput = { analysisType: plan.analysisType || 'general' };
                            result = await tool.call(toolInput);
                            break;
                            
                        default:
                            console.warn('⚠️ Unknown tool:', toolName);
                            continue;
                    }
                    
                    // Parse and store result
                    const parsedResult = typeof result === 'string' ? JSON.parse(result) : result;
                    
                    toolResults.push({
                        toolName,
                        input: toolInput,
                        result: parsedResult,
                        success: parsedResult.success || false,
                        data: result
                    });
                    
                    console.log('✅ Tool executed:', toolName, 'success:', parsedResult.success || false);
                    
                    // If this tool failed and it's critical, maybe skip dependent tools
                    if (!parsedResult.success && toolName === 'search_opening') {
                        console.log('⚠️ Search failed, but continuing with default values...');
                    }
                    
                } catch (toolError) {
                    console.error('❌ Tool execution error:', toolError);
                    toolResults.push({
                        toolName,
                        input: toolInput,
                        error: toolError.message,
                        success: false
                    });
                }
            }
            
        } catch (error) {
            console.error('❌ Tool execution sequence error:', error);
            toolResults.push({
                toolName: 'sequence_error',
                error: error.message,
                success: false
            });
        }
        
        return toolResults;
    }
    
    /**
     * Build conversation context with tool results - USING SAME PATTERN AS WORKING CHAT INTERFACE
     */
    buildConversationContext(userMessage, toolResults) {
        const messages = [];
        
        // Add system prompt
        messages.push(new this.SystemMessage(this.systemPrompt));
        
        // Add game state context if available (same as working chat interface)
        const gameContext = this.getGameStateContext();
        if (gameContext) {
            const contextSummary = this.formatGameStateForLLM(gameContext);
            messages.push(new this.SystemMessage(contextSummary));
        }
        
        // Add tool results if any
        if (toolResults.length > 0) {
            let toolSummary = "Tool execution results:\n";
            toolResults.forEach(result => {
                if (result.error) {
                    toolSummary += `- ${result.toolName}: ERROR - ${result.error}\n`;
                } else if (result.result.success) {
                    toolSummary += `- ${result.toolName}: SUCCESS\n`;
                    if (result.result.message) {
                        toolSummary += `  Message: ${result.result.message}\n`;
                    }
                    if (result.result.opening) {
                        toolSummary += `  Opening: ${result.result.opening.name} (${result.result.opening.eco})\n`;
                    }
                } else {
                    toolSummary += `- ${result.toolName}: FAILED - ${result.result.error || result.result.message}\n`;
                }
            });
            messages.push(new this.SystemMessage(toolSummary));
        }
        
        // Add recent conversation history
        const recentHistory = this.conversationHistory.slice(-3);
        for (const exchange of recentHistory) {
            messages.push(new this.HumanMessage(exchange.user));
            messages.push(new this.AIMessage(exchange.assistant));
        }
        
        // Add current user message
        messages.push(new this.HumanMessage(userMessage));
        
        return messages;
    }
    
    /**
     * Get game state context - COPIED FROM WORKING CHAT INTERFACE
     */
    getGameStateContext() {
        if (!this.gameStateContextBridge) {
            return null;
        }
        
        if (!this.gameStateContextBridge.isReady()) {
            return null;
        }

        try {
            const context = this.gameStateContextBridge.getContextForAI();
            return context;
        } catch (error) {
            console.warn('⚠️ Could not get game context:', error);
            return null;
        }
    }
    
    /**
     * Format game state for LLM - COPIED FROM WORKING CHAT INTERFACE
     */
    formatGameStateForLLM(gameContext) {
        if (!gameContext.available) {
            return "Current Game State: Not available";
        }

        let contextString = "=== CURRENT GAME STATE ===\n";
        
        // Position info
        if (gameContext.currentPosition) {
            contextString += `Position: ${gameContext.currentPosition.fen}\n`;
            contextString += `Turn: ${gameContext.currentPosition.turn} to move\n`;
            contextString += `Move: ${gameContext.currentPosition.moveNumber}\n`;
        }

        // Opening knowledge
        if (gameContext.openingKnowledge && gameContext.openingKnowledge.available) {
            contextString += "\n=== OPENING ANALYSIS ===\n";
            contextString += gameContext.openingKnowledge.formatted + "\n";
        }

        contextString += "=== END GAME STATE ===\n\n";
        contextString += "Please respond to the user's message with specific reference to the current position when relevant.";

        return contextString;
    }
    
    /**
     * Build a response from tool results when LLM is not available
     */
    buildToolResultsFallback(userMessage, toolResults) {
        if (!toolResults || toolResults.length === 0) {
            return "I don't have enough information to answer that question right now.";
        }
        
        const result = toolResults[0];
        if (result.toolName === 'analyze_current_position' && result.success) {
            const analysis = result.result.analysis;
            
            if (analysis.openingInfo) {
                const opening = analysis.openingInfo;
                return `This position is from the **${opening.name}** (${opening.eco}).\n\n${opening.moves ? `The moves that led to this position are: ${opening.moves}` : ''}\n\nThis is a ${analysis.gamePhase} position with ${analysis.turn} to move.`;
            } else {
                return `This is a ${analysis.gamePhase} position with ${analysis.turn} to move. The position doesn't match any known opening in my database.`;
            }
        }
        
        if (result.toolName === 'search_opening' && result.success) {
            const openings = result.result.openings;
            if (openings && openings.length > 0) {
                const opening = openings[0];
                return `I found information about the **${opening.name}** (${opening.eco}).\n\n${opening.moves ? `Key moves: ${opening.moves}` : ''}\n\n${opening.strategicThemes ? `Strategic themes: ${opening.strategicThemes.join(', ')}` : ''}`;
            }
        }
        
        return "I was able to process your request, but I'm having trouble formatting the response. The opening database detector is working correctly though!";
    }
    
    /**
     * Update conversation history
     */
    updateConversationHistory(userMessage, assistantReply) {
        this.conversationHistory.push({
            user: userMessage,
            assistant: assistantReply,
            timestamp: new Date().toISOString()
        });
        
        // Keep last 20 exchanges
        if (this.conversationHistory.length > 20) {
            this.conversationHistory = this.conversationHistory.slice(-20);
        }
    }
    
    /**
     * Fallback response when enhanced features fail
     */
    getFallbackResponse(userMessage, error) {
        console.log('🔄 Using fallback response due to enhanced feature error');
        
        // Simple keyword-based responses for common requests
        const lowerMessage = userMessage.toLowerCase();
        
        if (lowerMessage.includes('opening') || lowerMessage.includes('defense')) {
            return "I'd love to help you learn about that opening! However, I'm having some technical difficulties with my demonstration tools right now. I can still discuss chess theory and strategy with you. Could you ask me a specific question about the opening you're interested in?";
        }
        
        if (lowerMessage.includes('teach') || lowerMessage.includes('learn')) {
            return "I'm excited to teach you! I'm having some trouble with my position-loading tools at the moment, but I can still provide chess instruction and answer your questions. What would you like to learn about?";
        }
        
        if (lowerMessage.includes('analyze') || lowerMessage.includes('position')) {
            return "I'd be happy to help analyze positions! My advanced analysis tools aren't working properly right now, but I can still provide general chess guidance. Can you describe the position or ask a specific question?";
        }
        
        return `I apologize, but I'm experiencing some technical difficulties with my enhanced features (${error.message}). I can still help you with general chess questions and advice though! What would you like to know about chess?`;
    }
    
    /**
     * Get available tools info
     */
    getAvailableTools() {
        if (!this.chessTools?.isInitialized) {
            return [];
        }
        
        return this.chessTools.getToolsInfo();
    }
    
    /**
     * Reset conversation
     */
    resetConversation() {
        this.conversationHistory = [];
        console.log('🔄 EnhancedChatInterface: Conversation history reset');
    }
    
    /**
     * Check if interface has game state context (compatibility method)
     */
    hasGameStateContext() {
        return this.gameStateContextBridge && this.gameStateContextBridge.isReady();
    }
    
    /**
     * Get current game summary (compatibility method)
     */
    getCurrentGameSummary() {
        const context = this.getGameStateContext();
        if (!context || !context.available) {
            return "No game state available";
        }
        
        const pos = context.currentPosition;
        return `${pos.turn} to move, Move ${pos.moveNumber}, ${context.gameStatus.isGameOver ? 'Game Over' : 'In Progress'}`;
    }
}

// Export for use
if (typeof window !== 'undefined') {
    window.EnhancedChatInterface = EnhancedChatInterface;
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = EnhancedChatInterface;
}