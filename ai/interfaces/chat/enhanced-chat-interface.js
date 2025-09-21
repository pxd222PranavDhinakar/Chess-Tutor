/**
 * Enhanced chat interface with LLM-driven tool usage - COMPLETE REWRITE WITH AGENTIC INTEGRATION
 */


/**
 * ResponseCache - Caches model responses to speed up repeated queries
 */
class ResponseCache {
    constructor() {
        this.cache = new Map();
        this.maxSize = 50;
        this.defaultTTL = 300000; // 5 minutes in milliseconds
    }
    
    /**
     * Generate cache key from message and context
     */
    getCacheKey(message, context) {
        const normalizedMessage = message.toLowerCase().trim();
        const contextKey = context?.fen || 'start';
        return `${normalizedMessage}-${contextKey}`;
    }
    
    /**
     * Get cached response if it exists and is still valid
     */
    get(key) {
        const cached = this.cache.get(key);
        if (cached && Date.now() - cached.timestamp < this.defaultTTL) {
            console.log('📦 ResponseCache: Cache hit for key:', key.substring(0, 50) + '...');
            return cached.response;
        }
        
        // Remove expired entry
        if (cached) {
            console.log('⏰ ResponseCache: Cache expired for key:', key.substring(0, 50) + '...');
            this.cache.delete(key);
        }
        
        return null;
    }
    
    /**
     * Set cached response with timestamp
     */
    set(key, response) {
        // Implement LRU eviction - remove oldest entry if at max size
        if (this.cache.size >= this.maxSize) {
            const firstKey = this.cache.keys().next().value;
            console.log('🗑️ ResponseCache: Evicting oldest entry:', firstKey.substring(0, 50) + '...');
            this.cache.delete(firstKey);
        }
        
        this.cache.set(key, { 
            response, 
            timestamp: Date.now() 
        });
        
        console.log('💾 ResponseCache: Cached response for key:', key.substring(0, 50) + '...');
        console.log('📊 ResponseCache: Cache size:', this.cache.size, '/', this.maxSize);
    }
    
    /**
     * Clear all cached responses
     */
    clear() {
        this.cache.clear();
        console.log('🧹 ResponseCache: Cache cleared');
    }
    
    /**
     * Get cache statistics
     */
    getStats() {
        return {
            size: this.cache.size,
            maxSize: this.maxSize,
            entries: Array.from(this.cache.keys()).map(key => ({
                key: key.substring(0, 50) + '...',
                age: Date.now() - this.cache.get(key).timestamp
            }))
        };
    }
}

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
        
        // NEW: Agentic components
        this.chessCoachAgent = null;
        this.userProfileSystem = null;
        this.goalManagementSystem = null;
        this.agenticMode = false;
        
        // Enhanced system prompt with agentic awareness - UPDATED
        this.systemPrompt = `You are a chess coach AI that uses specialized tools to provide accurate chess instruction.

        CORE CAPABILITIES:
        - Search chess openings and load positions on the board
        - Analyze current board positions 
        - Create visual annotations (highlights, arrows)
        - Provide educational explanations appropriate to student level

        RESPONSE REQUIREMENTS:
        - Always acknowledge when tools were used and what they accomplished
        - Reference specific results from tool execution
        - Provide educational context about what was found/shown
        - Keep responses conversational and encouraging
        - Connect tool results to learning objectives

        AVAILABLE TOOLS:
        - search_opening: Find chess openings by name
        - load_position: Display positions on the board using FEN
        - get_opening_details: Get comprehensive opening information  
        - analyze_current_position: Examine current board state
        - create_annotation: Add visual highlights and arrows

        When tools are used, integrate their results naturally into your response. For example:
        - "I've found the French Defense and loaded it on the board. As you can see..."
        - "I've highlighted the key squares. Notice how..."
        - "The position analysis shows..."

        Stay focused on chess education and avoid meta-commentary about your thought process.`;

        this.responseCache = new ResponseCache();
        
        console.log('🧠 EnhancedChatInterface: Initializing with agentic capabilities...');
    }



    

    /**
     * Initialize the enhanced chat interface - UPDATED FOR DEEPSEEK WITH PROPER HANDLING
     */
    async initialize(gameStateContextBridge) {
        console.log('🚀 EnhancedChatInterface: Starting agentic initialization...');
        
        this.gameStateContextBridge = gameStateContextBridge;

        try {
            // Import LangChain components for Ollama
            const { HumanMessage, AIMessage, SystemMessage } = require('@langchain/core/messages');
            const { ChatOllama } = require('@langchain/ollama');
            
            this.HumanMessage = HumanMessage;
            this.AIMessage = AIMessage;
            this.SystemMessage = SystemMessage;
            
            // UPDATED: Initialize with DeepSeek-R1:14b with proper parameters
            this.llm = new ChatOllama({
                model: "deepseek-r1:14b",
                temperature: 0.1,
                num_predict: 200,        // Reduce from 600 to 200-300
                top_p: 0.3,
                top_k: 5,
                repeat_penalty: 1.1,
                baseUrl: "http://localhost:11434",
            });
            
            console.log('🔧 EnhancedChatInterface: LLM initialized with DeepSeek-R1:14b');
            
            // Initialize chess tools
            this.chessTools = new window.ChessTools();
            await this.chessTools.initialize();
            this.tools = this.chessTools.getToolsArray();
            
            console.log('🔧 EnhancedChatInterface: Loaded', this.tools.length, 'chess tools');
            
            // NEW: Initialize agentic components
            await this.initializeAgenticSystems();
            
            this.isInitialized = true;
            console.log('✅ EnhancedChatInterface: Agentic initialization completed');
            
            // Test basic LLM connection
            try {
                const testResponse = await this.llm.invoke([new this.SystemMessage('Respond with "OK"'), new this.HumanMessage('Test')]);
                console.log('✅ EnhancedChatInterface: LLM connection test successful');
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
     * Initialize agentic systems - NEW FEATURE
     */
    async initializeAgenticSystems() {
        try {
            console.log('🤖 EnhancedChatInterface: Initializing agentic systems...');
            
            // Initialize user profile system
            this.userProfileSystem = new window.UserProfileSystem();
            await this.userProfileSystem.initialize();
            
            // Initialize goal management system  
            this.goalManagementSystem = new window.GoalManagementSystem();
            await this.goalManagementSystem.initialize();
            
            // Initialize chess coach agent
            this.chessCoachAgent = new window.ChessCoachAgent();
            await this.chessCoachAgent.initialize(this.userProfileSystem, this.goalManagementSystem);
            
            this.agenticMode = true;
            console.log('✅ EnhancedChatInterface: Agentic systems ready');
            
        } catch (error) {
            console.warn('⚠️ EnhancedChatInterface: Agentic initialization failed, using standard mode:', error);
            this.agenticMode = false;
        }
    }

    /**
     * Send a message with model-driven tool selection - COMPLETE RESTRUCTURE
     */
    async sendMessage(userMessage) {
        console.log('💬 EnhancedChatInterface: Processing message with model-driven approach:', userMessage);
        
        try {
            // Get game context for cache key
            const gameContext = this.getGameStateContext();
            const cacheKey = this.responseCache.getCacheKey(userMessage, gameContext);
            
            // Check cache first
            const cachedResponse = this.responseCache.get(cacheKey);
            if (cachedResponse) {
                console.log('⚡ EnhancedChatInterface: Using cached response');
                this.updateConversationHistory(userMessage, cachedResponse);
                return cachedResponse;
            }
            
            // Cache miss - get fresh response from model
            console.log('🔄 EnhancedChatInterface: Cache miss, querying model...');
            const modelResponse = await this.getModelDecisionAndResponse(userMessage, gameContext);
            
            // Cache the response
            this.responseCache.set(cacheKey, modelResponse.finalResponse);
            
            // Update conversation history
            this.updateConversationHistory(userMessage, modelResponse.finalResponse);
            
            // Optional: Update agentic systems for learning
            if (this.agenticMode && this.chessCoachAgent) {
                await this.updateAgenticLearning(userMessage, modelResponse.finalResponse);
            }
            
            console.log('✅ EnhancedChatInterface: Model-driven response ready');
            return modelResponse.finalResponse;
            
        } catch (error) {
            console.error('❌ EnhancedChatInterface: Error in model-driven sendMessage:', error);
            return this.getFallbackResponse(userMessage);
        }
    }

    /**
     * Let model decide and execute tools - NEW MODEL-DRIVEN APPROACH
     */
    async getModelDecisionAndResponse(userMessage, gameContext) {
        console.log('🧠 Model: Making decision about response and tools');
        
        // Phase 1: Model analyzes request and decides on tool usage
        const decisionPrompt = this.buildDecisionPrompt(userMessage, gameContext);
        const decision = await this.getModelDecision(decisionPrompt);
        
        console.log('🤖 Model decision:', decision);
        
        // Phase 2: Execute tools if model requested them
        let toolResults = [];
        if (decision.useTools && decision.toolPlan.length > 0) {
            console.log('🛠️ Model requested tools:', decision.toolPlan.map(t => t.tool));
            toolResults = await this.executeModelRequestedTools(decision.toolPlan);
        }
        
        // Phase 3: Model generates final response with tool results
        const responsePrompt = this.buildResponsePrompt(userMessage, gameContext, toolResults, decision);
        const finalResponse = await this.getModelResponse(responsePrompt);
        
        return {
            decision: decision,
            toolResults: toolResults,
            finalResponse: finalResponse
        };
    }

    /**
     * Build prompt for model decision making - FIXED VERSION with clearer tool logic
     */
    buildDecisionPrompt(userMessage, gameContext) {
        let prompt = `You are a chess coach AI. A student has sent you this message: "${userMessage}"

    `;

        // Enhanced game context section using the new formatting
        if (gameContext && gameContext.available) {
            // Use the enhanced context formatting
            const enhancedContext = this.gameStateContextBridge ? 
                this.gameStateContextBridge.formatEnhancedContextForLLM() : 
                "Enhanced context not available";
            
            prompt += enhancedContext + "\n";
        } else {
            prompt += `CURRENT GAME CONTEXT: No active game position available\n\n`;
        }

        prompt += `AVAILABLE TOOLS:
    - search_opening: Find chess openings by name
    - load_position: Load a chess position on the board  
    - get_opening_details: Get comprehensive opening information
    - analyze_current_position: Analyze the current board position
    - create_annotation: Add visual highlights/arrows to the board

    CRITICAL TOOL SEQUENCE RULES:
    1. If student asks to "learn", "teach me", "show me" an OPENING by name → ALWAYS use this sequence:
    → search_opening (find the opening) 
    → load_position (load the opening position on board)
    → create_annotation (highlight key squares/moves)

    2. If student asks about "moves available", "best moves", "what should I play" in CURRENT position → use:
    → analyze_current_position
    → create_annotation (show arrows for best moves)

    3. For highlighting/arrows: ONLY use squares that contain pieces and their legal destinations from the AVAILABLE MOVES section above

    EXAMPLES:
    "Teach me the Italian Game" → search_opening + load_position + create_annotation
    "Show me the French Defense" → search_opening + load_position + create_annotation  
    "What are my best moves here?" → analyze_current_position + create_annotation
    "Highlight the center squares" → create_annotation only

    TASK: Decide how to respond to this student's message.

    Respond with a JSON object with this exact format:
    {
        "useTools": true/false,
        "reasoning": "explanation of your decision and why you chose this tool sequence",
        "toolPlan": [
            {"tool": "search_opening", "input": "Italian Game", "reason": "student wants to learn this opening"},
            {"tool": "load_position", "input": "fen_from_search_result", "reason": "must load the opening position to show it visually"},
            {"tool": "create_annotation", "input": {"squares": ["e4", "e5", "c4", "f3"], "annotationType": "highlight", "reason": "highlight key strategic squares"}, "reason": "show important squares in this opening"}
        ],
        "responseStrategy": "how you plan to respond after tools execute"
    }

    IMPORTANT: When teaching openings, you MUST load the position first, then annotate it. Never analyze the starting position when teaching a specific opening!`

        return prompt;
    }

    /**
     * Get model decision about tool usage - NEW
     */
    async getModelDecision(decisionPrompt) {
        try {
            const messages = [
                new this.SystemMessage("You are a helpful assistant that responds with valid JSON only."),
                new this.HumanMessage(decisionPrompt)
            ];
            
            const response = await this.llm.invoke(messages);
            const content = this.processDeepSeekResponse(response.content || response.text || '');
            
            // Try to parse JSON from response
            let decision;
            try {
                // Extract JSON from response if it contains other text
                const jsonMatch = content.match(/\{[\s\S]*\}/);
                const jsonStr = jsonMatch ? jsonMatch[0] : content;
                decision = JSON.parse(jsonStr);
            } catch (parseError) {
                console.warn('⚠️ Failed to parse model decision, using fallback');
                decision = {
                    useTools: false,
                    reasoning: "Could not parse decision",
                    toolPlan: [],
                    responseStrategy: "Provide helpful response without tools"
                };
            }
            
            // Validate decision structure
            if (!decision.hasOwnProperty('useTools')) {
                decision.useTools = false;
            }
            if (!Array.isArray(decision.toolPlan)) {
                decision.toolPlan = [];
            }
            
            return decision;
            
        } catch (error) {
            console.error('❌ Error getting model decision:', error);
            return {
                useTools: false,
                reasoning: "Error in decision making",
                toolPlan: [],
                responseStrategy: "Provide basic response"
            };
        }
    }

    /**
     * Execute tools as requested by model - COMPLETE FIX
     */
    async executeModelRequestedTools(toolPlan) {
        const results = [];
        
        for (const toolRequest of toolPlan) {
            console.log(`🔧 Executing ${toolRequest.tool} as requested by model`);
            
            try {
                const tool = this.tools.find(t => t.name === toolRequest.tool);
                if (!tool) {
                    console.warn(`⚠️ Tool ${toolRequest.tool} not found`);
                    results.push({
                        tool: toolRequest.tool,
                        success: false,
                        error: 'Tool not found'
                    });
                    continue;
                }
                
                // Prepare input in correct format for the tool
                let toolInput;
                switch (toolRequest.tool) {
                    case 'search_opening':
                        toolInput = { searchTerm: toolRequest.input };
                        break;
                    case 'load_position':
                        // Always prioritize search results over model's FEN
                        const searchResult = results.find(r => r.tool === 'search_opening' && r.success);
                        if (searchResult && searchResult.data) {
                            // Parse the search result data
                            let searchData;
                            try {
                                if (typeof searchResult.data === 'string') {
                                    searchData = JSON.parse(searchResult.data);
                                } else {
                                    searchData = searchResult.data;
                                }
                                
                                if (searchData.openings && searchData.openings.length > 0) {
                                    const opening = searchData.openings[0];
                                    console.log('🎯 Using FEN from search results:', opening.fen);
                                    console.log('🎯 Opening name:', opening.name);
                                    toolInput = { 
                                        fen: opening.fen, 
                                        reason: `Loading ${opening.name} position from search results` 
                                    };
                                } else {
                                    console.warn('⚠️ No openings found in search results');
                                    toolInput = { fen: toolRequest.input, reason: 'Fallback to model FEN' };
                                }
                            } catch (parseError) {
                                console.error('❌ Error parsing search results:', parseError);
                                toolInput = { fen: toolRequest.input, reason: 'Fallback to model FEN' };
                            }
                        } else {
                            // Fallback to model's input if no search results
                            console.log('⚠️ No search results available, using model FEN');
                            toolInput = { fen: toolRequest.input, reason: 'Model provided FEN' };
                        }
                        break;
                    case 'get_opening_details':
                        toolInput = { openingName: toolRequest.input };
                        break;
                    case 'analyze_current_position':
                        toolInput = { analysisType: toolRequest.input || 'general' };
                        break;
                    case 'create_annotation':
                        // Handle model's actual output format vs expected tool schema
                        if (typeof toolRequest.input === 'object' && toolRequest.input !== null) {
                            // Handle model's format: {moves: [...], highlights: [...]}
                            if (toolRequest.input.moves || toolRequest.input.highlights) {
                                const squares = [];
                                
                                // Extract squares from moves array
                                if (toolRequest.input.moves && Array.isArray(toolRequest.input.moves)) {
                                    toolRequest.input.moves.forEach(move => {
                                        if (typeof move === 'string' && move.length === 2) {
                                            squares.push(move);
                                        }
                                    });
                                }
                                
                                // Extract squares from highlights array  
                                if (toolRequest.input.highlights && Array.isArray(toolRequest.input.highlights)) {
                                    toolRequest.input.highlights.forEach(square => {
                                        if (typeof square === 'string' && square.length === 2) {
                                            squares.push(square);
                                        }
                                    });
                                }
                                
                                // Fallback to Italian Game strategic squares if nothing found
                                if (squares.length === 0) {
                                    squares.push('e4', 'e5', 'c4', 'f3');
                                }
                                
                                toolInput = {
                                    squares: squares,
                                    annotationType: 'highlight',
                                    reason: 'Highlighting strategic squares and key moves for the Italian Game'
                                };
                            } else if (toolRequest.input.squares && Array.isArray(toolRequest.input.squares)) {
                                // Handle already correct format
                                toolInput = {
                                    squares: toolRequest.input.squares,
                                    annotationType: toolRequest.input.annotationType || 'highlight',
                                    reason: toolRequest.input.reason || 'Strategic highlighting'
                                };
                            } else {
                                // Handle other object formats - try to extract any square-like strings
                                const allValues = Object.values(toolRequest.input).flat();
                                const squares = allValues.filter(val => 
                                    typeof val === 'string' && 
                                    val.length === 2 && 
                                    /^[a-h][1-8]$/.test(val)
                                );
                                
                                toolInput = {
                                    squares: squares.length > 0 ? squares : ['e4', 'e5', 'c4', 'f3'],
                                    annotationType: 'highlight',
                                    reason: 'Extracted squares from model input'
                                };
                            }
                        } else {
                            // Default fallback for null/undefined input
                            toolInput = {
                                squares: ['e4', 'e5', 'c4', 'f3'], // Italian Game key squares
                                annotationType: 'highlight',
                                reason: 'Default Italian Game strategic squares highlighting'
                            };
                        }
                        break;
                    default:
                        toolInput = toolRequest.input;
                }

                console.log(`🔧 Direct tool input prepared for ${toolRequest.tool}:`, toolInput);
                                


                // Handle special case where model wants FEN from previous search
                if (typeof toolRequest.input === 'string' && toolRequest.input.includes('fen_from_search_result')) {
                    const searchResult = results.find(r => r.tool === 'search_opening' && r.success);
                    if (searchResult && searchResult.data && searchResult.data.length > 0) {
                        toolInput = this.prepareToolInput(toolRequest.tool, searchResult.data[0].fen);
                    }
                }
                
                console.log(`🔧 Tool input prepared:`, toolInput);
                
                // FIXED: Use 'call' method (LangChain tools use 'call', not 'execute')
                const rawResult = await tool.call(toolInput);
                console.log(`🔧 Raw tool result:`, rawResult);
                
                // Parse JSON result (LangChain tools return JSON strings)
                let parsedResult;
                try {
                    parsedResult = JSON.parse(rawResult);
                } catch (parseError) {
                    console.warn('⚠️ Could not parse tool result as JSON:', rawResult);
                    parsedResult = { success: false, error: 'Could not parse tool result', rawResult };
                }
                
                results.push({
                    tool: toolRequest.tool,
                    success: parsedResult.success || false,
                    data: parsedResult.data || parsedResult,
                    reason: toolRequest.reason,
                    rawResult: rawResult
                });
                
                console.log(`✅ Tool ${toolRequest.tool} completed:`, parsedResult.success ? 'SUCCESS' : 'FAILED');
                
            } catch (error) {
                console.error(`❌ Error executing ${toolRequest.tool}:`, error);
                results.push({
                    tool: toolRequest.tool,
                    success: false,
                    error: error.message
                });
            }
        }
        
        return results;
    }

    /**
     * Prepare tool input in correct format - CORRECTED VERSION
     */
    prepareToolInput(toolName, rawInput) {
        switch (toolName) {
            case 'search_opening':
                // Use the actual input, never default to 'french'
                return { searchTerm: rawInput };
                
            case 'load_position':
                return { fen: rawInput, reason: 'Model requested position load' };
                
            case 'get_opening_details':
                return { openingName: rawInput };
                
            case 'analyze_current_position':
                return { analysisType: rawInput || 'general' };
                
            case 'create_annotation':
                if (typeof rawInput === 'object') {
                    return rawInput;
                } else {
                    return {
                        squares: ['e4', 'd4', 'e5', 'd5'],
                        annotationType: 'highlight',
                        reason: rawInput || 'Model requested annotation'
                    };
                }
                
            default:
                return rawInput;
        }
    }

    /**
     * Extract topics from user message - NEW HELPER
     */
    extractTopics(message) {
        const topics = [];
        const lower = message.toLowerCase();
        
        if (lower.includes('opening') || lower.includes('defense') || lower.includes('gambit')) {
            topics.push('openings');
        }
        if (lower.includes('tactic') || lower.includes('attack')) {
            topics.push('tactics');
        }
        if (lower.includes('endgame')) {
            topics.push('endgames');
        }
        if (lower.includes('strategy')) {
            topics.push('strategy');
        }
        
        return topics.length > 0 ? topics : ['general'];
    }

    /**
     * Assess message complexity - NEW HELPER
     */
    assessComplexity(message) {
        const wordCount = message.split(' ').length;
        const hasSpecificTerms = /defense|gambit|variation|theory|analysis/i.test(message);
        
        if (wordCount > 15 || hasSpecificTerms) {
            return 'high';
        } else if (wordCount > 8) {
            return 'medium';
        } else {
            return 'low';
        }
    }

    /**
     * Infer learning style from message - NEW HELPER
     */
    inferLearningStyle(message) {
        const lower = message.toLowerCase();
        
        if (lower.includes('show') || lower.includes('highlight') || lower.includes('visual')) {
            return 'visual';
        } else if (lower.includes('explain') || lower.includes('why') || lower.includes('analyze')) {
            return 'analytical';
        } else {
            return 'mixed';
        }
    }

    /**
     * Build prompt for final response - NEW
     */
    buildResponsePrompt(userMessage, gameContext, toolResults, decision) {
        let prompt = `You are a chess coach responding to a student's message: "${userMessage}"

    Your previous decision: ${decision.reasoning}

    `;

        if (toolResults.length > 0) {
            prompt += `Tool execution results:\n`;
            for (const result of toolResults) {
                if (result.success) {
                    prompt += `✅ ${result.tool}: ${result.reason} - SUCCESS\n`;
                    if (result.data) {
                        // Summarize tool data
                        if (result.tool === 'search_opening' && Array.isArray(result.data)) {
                            const opening = result.data[0];
                            prompt += `   Found: ${opening?.name} (${opening?.eco})\n`;
                        } else if (result.tool === 'load_position') {
                            prompt += `   Position loaded on board\n`;
                        } else if (result.tool === 'create_annotation') {
                            prompt += `   Visual annotations added\n`;
                        }
                    }
                } else {
                    prompt += `❌ ${result.tool}: Failed - ${result.error}\n`;
                }
            }
            prompt += `\n`;
        }

        prompt += `Now respond to the student naturally, acknowledging what you've done and providing educational value. Be conversational and helpful.`;

        return prompt;
    }

    /**
     * Get final model response - NEW
     */
    async getModelResponse(responsePrompt) {
        try {
            const messages = [
                new this.SystemMessage(this.systemPrompt),
                new this.HumanMessage(responsePrompt)
            ];
            
            const response = await this.llm.invoke(messages);
            const content = this.processDeepSeekResponse(response.content || response.text || '');
            
            return content || "I'm here to help you with chess! What would you like to learn?";
            
        } catch (error) {
            console.error('❌ Error generating final response:', error);
            return "I apologize, but I had trouble generating a response. Please try again.";
        }
    }

    /**
     * Update agentic learning systems without them controlling tools - NEW
     */
    async updateAgenticLearning(userMessage, finalResponse) {
        try {
            // Update user profile based on interaction
            if (this.userProfileSystem) {
                await this.userProfileSystem.updateFromInteraction({
                    topics: this.extractTopics(userMessage),
                    complexity: this.assessComplexity(userMessage),
                    learningStyle: this.inferLearningStyle(userMessage)
                });
            }
            
            // Update goals if needed
            if (this.goalManagementSystem) {
                await this.goalManagementSystem.updateFromConversation(userMessage, finalResponse);
            }
            
            console.log('📚 Agentic learning updated');
        } catch (error) {
            console.warn('⚠️ Error updating agentic learning:', error);
        }
    }

    /**
     * Execute agent's dynamic tool plan - NEW FEATURE
     */
    async executeAgentToolPlan(toolPlan) {
        const results = [];
        let previousResults = {};
        
        // Sort by priority (lower number = higher priority)
        const sortedPlan = toolPlan.sort((a, b) => a.priority - b.priority);
        
        for (const toolStep of sortedPlan) {
            try {
                const tool = this.tools.find(t => t.name === toolStep.tool);
                if (!tool) {
                    console.warn('⚠️ Tool not found:', toolStep.tool);
                    results.push({
                        toolName: toolStep.tool,
                        error: 'Tool not found',
                        success: false,
                        reason: toolStep.reason
                    });
                    continue;
                }
                
                // Prepare input using agent reasoning and previous results
                const toolInput = this.prepareAgentToolInput(toolStep, previousResults);
                console.log(`🛠️ Executing ${toolStep.tool} with input:`, toolInput);
                console.log(`🎯 Reason: ${toolStep.reason}`);
                
                const rawResult = await tool.call(toolInput);
                const parsedResult = JSON.parse(rawResult);
                
                // Store results for subsequent tools
                previousResults[toolStep.tool] = parsedResult;
                
                results.push({
                    toolName: toolStep.tool,
                    input: toolInput,
                    result: parsedResult,
                    success: parsedResult.success || false,
                    data: rawResult,
                    reason: toolStep.reason
                });
                
                console.log(`✅ Tool ${toolStep.tool} completed:`, parsedResult.success ? 'SUCCESS' : 'FAILED');
                
            } catch (error) {
                console.error(`❌ Tool ${toolStep.tool} failed:`, error);
                results.push({
                    toolName: toolStep.tool,
                    input: toolInput || {},
                    error: error.message,
                    success: false,
                    reason: toolStep.reason
                });
            }
        }
        
        return results;
    }

    /**
     * Prepare tool input using agent reasoning - NEW FEATURE
     */
    prepareAgentToolInput(toolStep, previousResults) {
        const toolName = toolStep.tool;
        
        switch (toolName) {
            case 'search_opening':
                // Agent might have determined specific opening to search for
                return { 
                    searchTerm: this.extractOpeningFromReasoning(toolStep.reason) || 'french'
                };
                
            case 'get_opening_details':
                // Use results from search_opening if available
                const searchResults = previousResults.search_opening;
                if (searchResults && searchResults.success && searchResults.openings?.[0]) {
                    return { 
                        openingName: searchResults.openings[0].name 
                    };
                }
                return { 
                    openingName: this.extractOpeningFromReasoning(toolStep.reason) || 'french defense'
                };
                
            case 'load_position':
                // Try to get FEN from previous tool results
                let fen = null;
                
                // Check search results first
                const searchRes = previousResults.search_opening;
                if (searchRes?.success && searchRes.openings?.[0]?.fen) {
                    fen = searchRes.openings[0].fen;
                }
                
                // Check opening details
                const detailsRes = previousResults.get_opening_details;
                if (!fen && detailsRes?.success && detailsRes.opening?.fen) {
                    fen = detailsRes.opening.fen;
                }
                
                // Fallback
                if (!fen) {
                    fen = 'rnbqkbnr/ppp2ppp/4p3/3p4/3PP3/8/PPP2PPP/RNBQKBNR w KQkq - 0 3';
                }
                
                return {
                    fen: fen,
                    reason: toolStep.reason
                };
                
            case 'analyze_current_position':
                return { 
                    analysisType: this.inferAnalysisTypeFromReason(toolStep.reason)
                };
                
            case 'create_annotation':
                return this.prepareAnnotationInputFromReason(toolStep.reason);
                
            default:
                return {};
        }
    }

    /**
     * Extract opening name from agent reasoning - NEW FEATURE
     */
    extractOpeningFromReasoning(reason) {
        if (!reason) return null;
        
        const lower = reason.toLowerCase();
        const openings = [
            'french defense', 'sicilian defense', 'ruy lopez', 'italian game',
            'caro-kann', 'queen\'s gambit', 'english opening', 'king\'s indian'
        ];
        
        for (const opening of openings) {
            if (lower.includes(opening)) {
                return opening;
            }
        }
        
        return null;
    }

    /**
     * Infer analysis type from reasoning - NEW FEATURE
     */
    inferAnalysisTypeFromReason(reason) {
        const lower = reason.toLowerCase();
        
        if (lower.includes('opening')) return 'opening';
        if (lower.includes('tactical') || lower.includes('tactics')) return 'tactical';
        if (lower.includes('strategic') || lower.includes('strategy')) return 'strategic';
        
        return 'general';
    }

    /**
     * Prepare annotation input from reasoning - NEW FEATURE
     */
    prepareAnnotationInputFromReason(reason) {
        const gameState = this.getGameStateContext();
        let squares = ['e4', 'd5']; // Default
        let annotationType = 'highlight';
        
        const lower = reason.toLowerCase();
        
        // Determine annotation type from reason
        if (lower.includes('arrow')) {
            annotationType = 'arrow';
            squares = ['e2', 'e4']; // Example arrow
        } else if (lower.includes('hint')) {
            annotationType = 'hint';
        }
        
        // Try to get meaningful squares from current position
        if (gameState?.available) {
            const board = this.parseFenForAnnotation(gameState.currentPosition.fen);
            if (lower.includes('center')) {
                squares = ['e4', 'd4', 'e5', 'd5'];
            } else if (lower.includes('pieces')) {
                squares = this.findRelevantPieces(board);
            }
        }
        
        return {
            squares: squares,
            annotationType: annotationType,
            reason: reason
        };
    }

    /**
     * Generate enhanced LLM response with agent insights - UPDATED FOR DEEPSEEK
     */
    async generateEnhancedLLMResponse(userMessage, toolResults, agentPlan) {
        const messages = this.buildEnhancedLLMContext(userMessage, toolResults, agentPlan);
        
        try {
            console.log('🧠 Generating enhanced LLM response with agent insights');
            
            // Add specific DeepSeek instructions
            const deepSeekInstructions = new this.SystemMessage(`CRITICAL INSTRUCTIONS FOR RESPONSE:

    You are a chess coach responding to a student. Based on the tool results and context provided above:

    1. DIRECTLY reference what the tools found and accomplished
    2. If opening search found results, mention the specific opening details  
    3. If position was loaded, acknowledge the board now shows that position
    4. If annotations were created, mention what was highlighted
    5. Keep response conversational and educational
    6. Do NOT include any thinking process or meta-commentary
    7. Respond as if you personally executed these actions

    Current context: ${toolResults.length} tools were used successfully.`);
            
            messages.splice(1, 0, deepSeekInstructions); // Insert after system prompt
            
            const response = await this.llm.invoke(messages);
            const rawContent = response.content || response.text || '';
            
            // Process DeepSeek-specific response format
            const processedContent = this.processDeepSeekResponse(rawContent);
            
            return processedContent;
            
        } catch (error) {
            console.error('❌ Enhanced LLM response generation failed:', error);
            return this.buildFallbackFromTools(userMessage, toolResults);
        }
    }

    /**
     * Process DeepSeek-R1 response and filter thinking tags - NEW DEEPSEEK HANDLER
     */
    processDeepSeekResponse(rawResponse) {
        if (!rawResponse || typeof rawResponse !== 'string') {
            return rawResponse;
        }
        
        console.log('🧠 DeepSeek: Processing response with thinking filter');
        
        // Remove <think> tags and their content
        let processedResponse = rawResponse.replace(/<think>[\s\S]*?<\/think>/gi, '');
        
        // Remove any remaining thinking indicators
        processedResponse = processedResponse.replace(/\*thinking\*[\s\S]*?\*\/thinking\*/gi, '');
        
        // Clean up extra whitespace and newlines
        processedResponse = processedResponse.replace(/\n\s*\n\s*\n/g, '\n\n').trim();
        
        // If response is empty after filtering, provide fallback
        if (!processedResponse || processedResponse.length < 10) {
            console.warn('⚠️ DeepSeek: Response was empty after filtering thinking tags');
            return "I understand your question about chess. Let me help you with that.";
        }
        
        console.log('✅ DeepSeek: Thinking filtered, clean response ready');
        return processedResponse;
    }

    /**
     * Build enhanced context with agent insights - NEW FEATURE
     */
    buildEnhancedLLMContext(userMessage, toolResults, agentPlan) {
        const messages = [];
        
        // Add enhanced system prompt
        messages.push(new this.SystemMessage(this.systemPrompt));
        
        // Add game state context
        const gameContext = this.getGameStateContext();
        if (gameContext) {
            const contextSummary = this.formatGameStateForLLM(gameContext);
            messages.push(new this.SystemMessage(contextSummary));
        }
        
        // NEW: Add agent insights and user profile context
        if (this.agenticMode && agentPlan) {
            const agentContext = this.formatAgentContextForLLM(agentPlan);
            messages.push(new this.SystemMessage(agentContext));
        }
        
        // Add tool results context
        if (toolResults.length > 0) {
            const toolContext = this.formatToolResultsForLLM(toolResults);
            messages.push(new this.SystemMessage(toolContext));
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
     * Format agent context for LLM - NEW FEATURE
     */
    formatAgentContextForLLM(agentPlan) {
        let context = "=== AGENT INSIGHTS ===\n";
        
        // Agent's strategy
        if (agentPlan.strategy) {
            context += `Teaching Strategy: ${agentPlan.strategy.explanationDepth} explanations, ${agentPlan.strategy.visualsFrequency} visual aids\n`;
            context += `Preferred tools: ${agentPlan.strategy.preferredTools.join(', ')}\n`;
        }
        
        // Current goals
        if (agentPlan.goals && agentPlan.goals.length > 0) {
            context += `\nActive Learning Goals:\n`;
            agentPlan.goals.slice(0, 3).forEach((goal, i) => {
                context += `${i + 1}. ${goal.description} (${goal.progress || 0}% complete)\n`;
            });
        }
        
        // Agent reasoning
        if (agentPlan.reasoning) {
            context += `\nAgent Reasoning: ${agentPlan.reasoning}\n`;
        }
        
        // User profile insights (if available)
        if (this.userProfileSystem) {
            const profile = this.userProfileSystem.getProfileSummary();
            context += `\nUser Profile: ${profile.skillLevel} level, ${profile.learningStyle} learner\n`;
            if (profile.strongTopics.length > 0) {
                context += `Strong in: ${profile.strongTopics.join(', ')}\n`;
            }
            if (profile.weakTopics.length > 0) {
                context += `Needs work on: ${profile.weakTopics.join(', ')}\n`;
            }
        }
        
        context += "=== END AGENT INSIGHTS ===\n\n";
        context += "Use these insights to provide personalized, goal-oriented instruction that builds on the user's profile and current learning objectives.";
        
        return context;
    }

    /**
     * Process agent learning from interaction - NEW FEATURE
     */
    async processAgentLearning(userMessage, response, toolResults, agentPlan) {
        try {
            // Update user profile based on interaction
            if (this.userProfileSystem) {
                const messageAnalysis = {
                    complexity: this.analyzeMessageComplexity(userMessage),
                    topics: this.extractTopics(userMessage),
                    learningStyle: this.inferLearningStyle(userMessage),
                    skillLevel: this.inferSkillLevel(userMessage)
                };
                
                await this.userProfileSystem.updateFromInteraction(messageAnalysis);
            }
            
            // Update goals based on interaction
            if (this.goalManagementSystem && agentPlan?.goals) {
                // Check if any goals made progress
                for (const goal of agentPlan.goals) {
                    if (this.indicatesLearningSuccess(userMessage, response)) {
                        await this.goalManagementSystem.recordGoalTeachingSuccess(
                            goal.id, 
                            'explained_concept', 
                            'User engaged with explanation'
                        );
                    }
                }
            }
            
            // Agent self-monitoring
            if (this.chessCoachAgent) {
                // This will be called automatically by the agent's processMessage method
                console.log('🤖 Agent learning processed');
            }
            
        } catch (error) {
            console.error('❌ Error in agent learning processing:', error);
        }
    }

    /**
     * Determine if interaction indicates learning success - NEW FEATURE
     */
    indicatesLearningSuccess(userMessage, response) {
        const userLower = userMessage.toLowerCase();
        const responseLower = response.toLowerCase();
        
        // Positive indicators in user message
        const positiveIndicators = ['thanks', 'understand', 'got it', 'makes sense', 'i see'];
        const hasPositiveResponse = positiveIndicators.some(indicator => userLower.includes(indicator));
        
        // Check if response provided substantial teaching content
        const hasSubstantialTeaching = response.length > 100 && 
                                     (responseLower.includes('because') || 
                                      responseLower.includes('this is') ||
                                      responseLower.includes('the reason'));
        
        return hasPositiveResponse || hasSubstantialTeaching;
    }

    /**
     * Helper methods for analysis - ENHANCED VERSIONS
     */
    analyzeMessageComplexity(message) {
        const wordCount = message.split(' ').length;
        const chessTerms = ['opening', 'tactic', 'position', 'strategy', 'endgame', 'middlegame', 'development', 'castle', 'fork', 'pin'];
        const termCount = chessTerms.filter(term => message.toLowerCase().includes(term)).length;
        
        if (wordCount > 25 && termCount > 3) return 'high';
        if (wordCount > 15 && termCount > 1) return 'medium';
        return 'low';
    }

    extractTopics(message) {
        const lower = message.toLowerCase();
        const topics = [];
        
        if (lower.includes('opening') || lower.includes('defense') || lower.includes('gambit')) topics.push('openings');
        if (lower.includes('tactic') || lower.includes('combination') || lower.includes('fork') || lower.includes('pin')) topics.push('tactics');
        if (lower.includes('endgame') || lower.includes('checkmate') || lower.includes('king')) topics.push('endgames');
        if (lower.includes('strategy') || lower.includes('plan') || lower.includes('structure')) topics.push('strategy');
        if (lower.includes('position') || lower.includes('analyze') || lower.includes('evaluate')) topics.push('position_analysis');
        
        return topics.length > 0 ? topics : ['general'];
    }

    inferLearningStyle(message) {
        const lower = message.toLowerCase();
        
        if (lower.includes('show') || lower.includes('see') || lower.includes('visual') || lower.includes('highlight')) {
            return 'visual';
        }
        if (lower.includes('explain') || lower.includes('why') || lower.includes('how') || lower.includes('understand')) {
            return 'analytical';
        }
        if (lower.includes('practice') || lower.includes('try') || lower.includes('do') || lower.includes('play')) {
            return 'kinesthetic';
        }
        
        return 'mixed';
    }

    inferSkillLevel(message) {
        const lower = message.toLowerCase();
        
        // Beginner indicators
        if (lower.includes('beginner') || lower.includes('new') || lower.includes('basic') || lower.includes('simple')) {
            return 'beginner';
        }
        
        // Advanced indicators
        const advancedTerms = ['zugzwang', 'zwischenzug', 'fianchetto', 'en passant', 'castle', 'development', 'initiative'];
        if (advancedTerms.some(term => lower.includes(term))) {
            return 'advanced';
        }
        
        // Intermediate indicators
        if (lower.includes('tactic') || lower.includes('strategy') || lower.includes('position')) {
            return 'intermediate';
        }
        
        return 'intermediate'; // Default assumption
    }

    /**
     * Get agentic status and capabilities - NEW FEATURE
     */
    getAgenticStatus() {
        return {
            agenticMode: this.agenticMode,
            agentInitialized: !!this.chessCoachAgent?.isInitialized,
            userProfileAvailable: !!this.userProfileSystem?.isInitialized,
            goalManagementAvailable: !!this.goalManagementSystem?.isInitialized,
            
            // Agent statistics
            agentStats: this.chessCoachAgent?.getAgentStatus() || null,
            
            // User profile summary
            userProfile: this.userProfileSystem?.getProfileSummary() || null,
            
            // Goals summary
            goals: this.goalManagementSystem?.getGoalsSummary() || null
        };
    }

    /**
     * Reset agentic systems for new user - NEW FEATURE
     */
    async resetAgenticSystems() {
        if (this.userProfileSystem) {
            await this.userProfileSystem.resetProfile();
        }
        
        if (this.goalManagementSystem) {
            await this.goalManagementSystem.resetAllGoals();
        }
        
        if (this.chessCoachAgent) {
            this.chessCoachAgent.resetSession();
        }
        
        console.log('🔄 EnhancedChatInterface: Agentic systems reset');
    }

    /**
     * All existing methods remain unchanged - PRESERVING EXISTING FUNCTIONALITY
     */
    
    analyzeToolNeed(userMessage) {
        // Keep existing implementation
        const lower = userMessage.toLowerCase();
        console.log('🔍 Analyzing message for tools:', lower);
        
        // Extract opening name first
        const openingName = this.extractOpeningName(userMessage);
        console.log('🎯 Extracted opening name:', openingName);
        
        // Annotation requests detection
        const annotationIndicators = [
            'highlight', 'show me', 'mark', 'annotate', 'point out', 'indicate',
            'draw arrow', 'draw an arrow', 'create arrow', 'circle','good move', 'best move', 'important', 'key squares', 'draw', 'arrow', 'connect'
       ];
       
       const annotationTargets = [
           'piece', 'pieces', 'pawn', 'pawns', 'queen', 'king', 'knight', 'bishop', 'rook',
           'square', 'squares', 'move', 'moves', 'position', 'threat', 'threats', 'center',
           'centre', 'weak', 'strong', 'advanced', 'important', 'good', 'best'
       ];
       
       const hasAnnotationIndicator = annotationIndicators.some(indicator => lower.includes(indicator));
       const hasAnnotationTarget = annotationTargets.some(target => lower.includes(target)) || 
                                  lower.includes('good') || lower.includes('best') || 
                                  lower.includes('important') || lower.includes('center') ||
                                  lower.includes('centre');
       
       const specialAnnotationPhrases = [
           'draw an arrow', 'draw arrow', 'create arrow', 'show arrow',
           'highlight center', 'highlight centre', 'mark center', 'mark centre',
           'show center', 'show centre'
       ];
       
       const hasSpecialPhrase = specialAnnotationPhrases.some(phrase => lower.includes(phrase));
       
       if ((hasAnnotationIndicator && hasAnnotationTarget) || hasSpecialPhrase) {
           console.log('✅ Detected annotation request');
           return {
               shouldUseTool: true,
               toolSequence: ['analyze_current_position', 'create_annotation'],
               reasoning: 'Visual annotation/highlighting request detected',
               extractedData: { 
                   annotationType: this.determineAnnotationType(lower),
                   targets: this.extractAnnotationTargets(lower)
               }
           };
       }
       
       // Opening requests
       const openingIndicators = [
           'teach', 'show', 'learn', 'tell me about', 'explain', 'describe',
           'demonstrate', 'what is', 'how does', 'help me with'
       ];
       
       const openingTargets = [
           'opening', 'defense', 'gambit', 'attack', 'variation', 'system'
       ];
       
       const hasOpeningIndicator = openingIndicators.some(indicator => lower.includes(indicator));
       const hasOpeningTarget = openingTargets.some(target => lower.includes(target)) || openingName;
       
       if (hasOpeningIndicator && hasOpeningTarget) {
           console.log('✅ Detected opening request');
           return {
               shouldUseTool: true,
               toolSequence: ['search_opening', 'get_opening_details', 'load_position'],
               reasoning: 'Opening teaching/information request detected',
               extractedData: { openingName: openingName || 'general opening' }
           };
       }

       // Opening identification requests  
       const identificationPatterns = [
           'what opening', 'which opening', 'opening is this', 'identify this opening',
           'name of this opening', 'current opening', 'this opening'
       ];
       
       if (identificationPatterns.some(pattern => lower.includes(pattern))) {
           console.log('✅ Detected opening identification request');
           return {
               shouldUseTool: true,
               toolSequence: ['analyze_current_position'],
               reasoning: 'Opening identification requested',
               extractedData: { analysisType: 'opening' }
           };
       }

       // Position analysis requests
       const analysisPatterns = [
           'analyze', 'evaluate', 'what do you think', 'assessment', 'opinion',
           'current position', 'this position', 'position analysis'
       ];
       
       if (analysisPatterns.some(pattern => lower.includes(pattern))) {
           console.log('✅ Detected position analysis request');
           return {
               shouldUseTool: true,
               toolSequence: ['analyze_current_position'],
               reasoning: 'Position analysis requested',
               extractedData: { analysisType: 'general' }
           };
       }

       // Load/set position requests
       if ((lower.includes('load') || lower.includes('set') || lower.includes('show me')) && 
           (lower.includes('position') || lower.includes('fen'))) {
           console.log('✅ Detected position loading request');
           return {
               shouldUseTool: true,
               toolSequence: ['load_position'],
               reasoning: 'Position loading requested',
               extractedData: { analysisType: 'load' }
           };
       }

       console.log('❌ No tool patterns detected');
       return {
           shouldUseTool: false,
           toolSequence: [],
           reasoning: 'General conversation, no tools needed',
           extractedData: {}
       };
   }

   async executeToolSequence(toolAnalysis) {
       // Keep existing implementation
       const results = [];
       let searchResults = null;
       
       for (const toolName of toolAnalysis.toolSequence) {
           try {
               const tool = this.tools.find(t => t.name === toolName);
               if (!tool) {
                   console.warn('⚠️ Tool not found:', toolName);
                   results.push({
                       toolName,
                       error: 'Tool not found',
                       success: false
                   });
                   continue;
               }
               
               const toolInput = this.prepareToolInput(toolName, toolAnalysis.extractedData, searchResults);
               console.log(`🛠️ Executing ${toolName} with input:`, toolInput);
               
               const rawResult = await tool.call(toolInput);
               const parsedResult = JSON.parse(rawResult);
               
               if (toolName === 'search_opening' && parsedResult.success) {
                   searchResults = parsedResult.openings;
               }
               
               results.push({
                   toolName,
                   input: toolInput,
                   result: parsedResult,
                   success: parsedResult.success || false,
                   data: rawResult
               });
               
               console.log(`✅ Tool ${toolName} completed:`, parsedResult.success ? 'SUCCESS' : 'FAILED');
               
           } catch (error) {
               console.error(`❌ Tool ${toolName} failed:`, error);
               results.push({
                   toolName,
                   input: toolInput || {},
                   error: error.message,
                   success: false
               });
           }
       }
       
       return results;
   }

   prepareToolInput(toolName, extractedData, searchResults) {
       // Keep existing implementation
       switch (toolName) {
           case 'search_opening':
               return { 
                   searchTerm: extractedData.openingName || 'french' 
               };
               
           case 'get_opening_details':
               return { 
                   openingName: extractedData.openingName || 'french defense' 
               };
               
           case 'load_position':
               let fen = null;
               
               if (searchResults && searchResults.length > 0 && searchResults[0].fen) {
                   fen = searchResults[0].fen;
                   console.log('🎯 Using FEN from search results:', fen);
               } else {
                   fen = 'rnbqkbnr/ppp2ppp/4p3/3p4/3PP3/8/PPP2PPP/RNBQKBNR w KQkq - 0 3';
                   console.log('🎯 Using default French Defense FEN:', fen);
               }
               
               return {
                   fen: fen,
                   reason: `to demonstrate the ${extractedData.openingName || 'requested opening'}`
               };
               
           case 'analyze_current_position':
               return { 
                   analysisType: extractedData.analysisType || 'general' 
               };
               
           case 'create_annotation':
               return this.prepareAnnotationInput(extractedData);
               
           default:
               return {};
       }
   }

   prepareAnnotationInput(extractedData) {
       // Keep existing implementation
       const annotationType = extractedData.annotationType || 'highlight';
       const targets = extractedData.targets || ['general'];
       
       const gameState = this.getGameStateContext();
       let squares = [];
       let reason = 'as requested';
       
       if (gameState && gameState.available) {
           squares = this.identifySquaresForAnnotation(gameState, targets);
           reason = `highlighting ${targets.join(', ')} in current position`;
       } else {
           squares = ['e4', 'd5'];
           reason = 'demonstration squares (no position available)';
       }
       
       return {
           squares: squares,
           annotationType: annotationType,
           reason: reason
       };
   }

   identifySquaresForAnnotation(gameState, targets) {
       // Keep existing implementation
       const squares = [];
       
       const fen = gameState.currentPosition?.fen;
       if (!fen) return ['e4', 'd5'];
       
       const board = this.parseFenBoard(fen);
       
       targets.forEach(target => {
           switch (target) {
               case 'queen':
                   squares.push(...this.findPieces(board, ['Q', 'q']));
                   break;
               case 'king':
                   squares.push(...this.findPieces(board, ['K', 'k']));
                   break;
               case 'pawn':
               case 'pawns':
                   squares.push(...this.findPieces(board, ['P', 'p']));
                   break;
               case 'rook':
                   squares.push(...this.findPieces(board, ['R', 'r']));
                   break;
               case 'bishop':
                   squares.push(...this.findPieces(board, ['B', 'b']));
                   break;
               case 'knight':
                   squares.push(...this.findPieces(board, ['N', 'n']));
                   break;
               case 'center':
                   squares.push('e4', 'd4', 'e5', 'd5');
                   break;
               case 'advanced':
                   squares.push(...this.findAdvancedPawns(board));
                   break;
               case 'arrow':
                    // Enhanced arrow creation using legal moves data
                    if (squares.length >= 2) {
                        // Group squares into from-to pairs
                        for (let i = 0; i < squares.length - 1; i += 2) {
                            const fromSquare = squares[i];
                            const toSquare = squares[i + 1];
                            
                            if (isValidSquare(fromSquare) && isValidSquare(toSquare)) {
                                // Verify this is a legal move if game engine is available
                                if (window.appOrchestrator.gameEngine) {
                                    const legalMoves = window.appOrchestrator.gameEngine.chess.moves({ verbose: true });
                                    const isLegalMove = legalMoves.some(move => 
                                        move.from === fromSquare && move.to === toSquare
                                    );
                                    
                                    if (isLegalMove) {
                                        boardAnnotations.addArrow(fromSquare, toSquare);
                                        annotationsCreated++;
                                        console.log(`🎯 Added legal move arrow: ${fromSquare} → ${toSquare}`);
                                    } else {
                                        console.warn(`⚠️ Skipped illegal move arrow: ${fromSquare} → ${toSquare}`);
                                    }
                                } else {
                                    // Fallback if no game engine
                                    boardAnnotations.addArrow(fromSquare, toSquare);
                                    annotationsCreated++;
                                }
                            }
                        }
                    }
                    break;
               case 'good':
               case 'best':
               case 'important':
                   squares.push(...this.findImportantSquares(board));
                   break;
               default:
                   squares.push('e4', 'd5', 'f3');
           }
       });
       
       const uniqueSquares = [...new Set(squares)];
       return uniqueSquares.slice(0, 8);
   }

   parseFenBoard(fen) {
       // Keep existing implementation
       const boardPart = fen.split(' ')[0];
       const ranks = boardPart.split('/');
       const board = {};
       
       for (let rankIndex = 0; rankIndex < 8; rankIndex++) {
           const rank = ranks[rankIndex];
           let fileIndex = 0;
           
           for (let i = 0; i < rank.length; i++) {
               const char = rank[i];
               
               if (/[1-8]/.test(char)) {
                   fileIndex += parseInt(char);
               } else {
                   const square = String.fromCharCode(97 + fileIndex) + (8 - rankIndex);
                   board[square] = char;
                   fileIndex++;
               }
           }
       }
       
       return board;
   }

   findPieces(board, pieceTypes) {
       // Keep existing implementation
       const squares = [];
       
       for (const [square, piece] of Object.entries(board)) {
           if (pieceTypes.includes(piece)) {
               squares.push(square);
           }
       }
       
       return squares;
   }

   findAdvancedPawns(board) {
       // Keep existing implementation
       const squares = [];
       
       for (const [square, piece] of Object.entries(board)) {
           if (piece === 'P' && parseInt(square[1]) >= 5) {
               squares.push(square);
           } else if (piece === 'p' && parseInt(square[1]) <= 4) {
               squares.push(square);
           }
       }
       
       return squares;
   }

   findImportantSquares(board) {
       // Keep existing implementation
       const squares = [];
       
       const centralSquares = ['e4', 'd4', 'e5', 'd5'];
       squares.push(...centralSquares);
       
       for (const [square, piece] of Object.entries(board)) {
           const rank = parseInt(square[1]);
           const file = square[0];
           
           if (['d', 'e'].includes(file)) {
               squares.push(square);
           }
           
           if (piece === piece.toUpperCase() && rank >= 4) {
               squares.push(square);
           } else if (piece === piece.toLowerCase() && rank <= 5) {
               squares.push(square);
           }
       }
       
       return squares;
   }

   determineAnnotationType(message) {
       // Keep existing implementation
       if (message.includes('arrow') || message.includes('connect') || message.includes('draw')) {
           return 'arrow';
       } else if (message.includes('hint') || message.includes('suggest') || message.includes('recommendation')) {
           return 'hint';
       } else if (message.includes('move') || message.includes('can go') || message.includes('possible')) {
           return 'move';
       } else {
           return 'highlight';
       }
   }

   extractAnnotationTargets(message) {
       // Keep existing implementation
       const targets = [];
       
       const pieceTypes = ['queen', 'king', 'rook', 'bishop', 'knight', 'pawn'];
       pieceTypes.forEach(piece => {
           if (message.includes(piece)) {
               targets.push(piece);
           }
       });
       
       if (message.includes('advanced')) targets.push('advanced');
       if (message.includes('weak') || message.includes('hanging')) targets.push('weak');
       if (message.includes('good') || message.includes('best')) targets.push('good');
       if (message.includes('important') || message.includes('key')) targets.push('important');
       if (message.includes('center') || message.includes('centre')) targets.push('center');
       if (message.includes('threat')) targets.push('threat');
       
       if (message.includes('arrow') || message.includes('draw') || message.includes('connect')) {
           targets.push('arrow');
       }
       
       return targets.length > 0 ? targets : ['general'];
   }

    /**
     * Build fallback response from tool results - ENHANCED FOR DEEPSEEK
     */
    buildFallbackFromTools(userMessage, toolResults) {
        if (!toolResults || toolResults.length === 0) {
            return "I'd be happy to help you with chess! Could you tell me what specific aspect you'd like to learn about?";
        }
        
        let response = "I've used my tools to help with your request:\n\n";
        
        for (const result of toolResults) {
            if (result.success && result.data) {
                switch (result.tool) {
                    case 'search_opening':
                        response += `🔍 I found information about the opening you asked about. `;
                        if (result.data.length > 0) {
                            const opening = result.data[0];
                            response += `The ${opening.name} is a ${opening.category} opening. `;
                        }
                        break;
                        
                    case 'load_position':
                        response += `♟️ I've loaded the position on the board for you to see. `;
                        break;
                        
                    case 'create_annotation':
                        response += `🎯 I've added visual highlights to help illustrate the key concepts. `;
                        break;
                        
                    case 'analyze_current_position':
                        response += `📊 I've analyzed the current position. `;
                        break;
                }
            }
        }
        
        response += "\n\nFeel free to ask me about any specific aspects you'd like to explore further!";
        return response;
    }

   extractOpeningName(message) {
       // Keep existing implementation
       const lower = message.toLowerCase();
       
       const openings = [
           { name: 'french defense', patterns: ['french defense', 'french'] },
           { name: 'sicilian defense', patterns: ['sicilian defense', 'sicilian dragon', 'sicilian najdorf', 'sicilian'] },
           { name: 'ruy lopez', patterns: ['ruy lopez', 'spanish opening', 'spanish game'] },
           { name: 'italian game', patterns: ['italian game', 'italian opening', 'italian'] },
           { name: 'caro-kann', patterns: ['caro-kann', 'caro kann', 'caro'] },
           { name: 'king\'s indian', patterns: ['king\'s indian', 'kings indian', 'kid'] },
           { name: 'queen\'s gambit', patterns: ['queen\'s gambit', 'queens gambit', 'qgd', 'qga'] },
           { name: 'english opening', patterns: ['english opening', 'english'] },
           { name: 'alekhine defense', patterns: ['alekhine defense', 'alekhine'] },
           { name: 'scandinavian defense', patterns: ['scandinavian defense', 'scandinavian'] },
           { name: 'nimzo-indian', patterns: ['nimzo-indian', 'nimzo indian', 'nimzo'] },
           { name: 'catalan', patterns: ['catalan opening', 'catalan'] },
           { name: 'london system', patterns: ['london system', 'london'] },
           { name: 'bird\'s opening', patterns: ['bird\'s opening', 'birds opening', 'bird'] },
           { name: 'pirc defense', patterns: ['pirc defense', 'pirc'] }
       ];
       
       for (const opening of openings) {
           for (const pattern of opening.patterns) {
               if (lower.includes(pattern)) {
                   console.log('🎯 Found opening pattern:', pattern, '→', opening.name);
                   return opening.name;
               }
           }
       }
       
       console.log('❌ No opening pattern found in:', lower);
       return null;
   }

   formatToolResultsForLLM(toolResults) {
       // Keep existing implementation with annotation support
       let context = "=== TOOL EXECUTION RESULTS ===\n";
       context += "The following tools were executed to gather information for your response:\n\n";
       
       toolResults.forEach((result, index) => {
           context += `Tool ${index + 1}: ${result.toolName}\n`;
           context += `Status: ${result.success ? 'SUCCESS' : 'FAILED'}\n`;
           
           if (result.success && result.result) {
               if (result.toolName === 'search_opening' && result.result.openings) {
                   const openings = result.result.openings;
                   context += `Found ${openings.length} opening(s):\n`;
                   openings.slice(0, 3).forEach(opening => {
                       context += `- ${opening.name} (${opening.eco})\n`;
                       context += `  Moves: ${opening.moves || 'Not specified'}\n`;
                       context += `  Strategic themes: ${opening.strategicThemes?.join(', ') || 'None listed'}\n`;
                       context += `  Principles: ${opening.principles?.slice(0, 2).join(', ') || 'None listed'}\n`;
                   });
               }
               
               if (result.toolName === 'get_opening_details' && result.result.opening) {
                   const opening = result.result.opening;
                   context += `Detailed information retrieved:\n`;
                   context += `- Name: ${opening.name}\n`;
                   context += `- ECO: ${opening.eco}\n`;
                   context += `- Category: ${opening.category}\n`;
                   context += `- Moves: ${opening.moves}\n`;
                   context += `- Strategic themes: ${opening.strategicThemes?.join(', ') || 'None'}\n`;
                   context += `- Key principles: ${opening.principles?.join('; ') || 'None'}\n`;
               }
               
               if (result.toolName === 'load_position') {
                   context += `Position loading result:\n`;
                   context += `- Status: ${result.result.message}\n`;
                   context += `- FEN: ${result.result.fen}\n`;
                   if (result.result.openingInfo) {
                       context += `- Opening detected: ${result.result.openingInfo.name}\n`;
                   }
               }
               
               if (result.toolName === 'analyze_current_position' && result.result.analysis) {
                   const analysis = result.result.analysis;
                   context += `Position analysis:\n`;
                   context += `- Current position: ${analysis.fen}\n`;
                   context += `- Turn: ${analysis.turn}\n`;
                   context += `- Move number: ${analysis.moveNumber}\n`;
                   context += `- Game phase: ${analysis.gamePhase}\n`;
                   if (analysis.openingInfo) {
                       context += `- Opening identified: ${analysis.openingInfo.name} (${analysis.openingInfo.eco})\n`;
                   }
               }
               
               if (result.toolName === 'create_annotation') {
                   context += `Annotation creation result:\n`;
                   context += `- Annotations created: ${result.result.annotationsCreated}\n`;
                   context += `- Type: ${result.result.type}\n`;
                   context += `- Squares annotated: ${result.result.squares?.join(', ')}\n`;
                   context += `- Reason: ${result.result.reason}\n`;
               }
               
           } else if (result.error) {
               context += `Error: ${result.error}\n`;
           } else if (!result.success) {
               context += `Failed: ${result.result?.error || result.result?.message || 'Unknown error'}\n`;
           }
           
           context += "\n";
       });
       
       context += "=== END TOOL RESULTS ===\n\n";
       context += "INSTRUCTIONS: Use the above tool results to provide a comprehensive, educational response. ";
       context += "Explain what the tools found, why it's relevant, and how it helps answer the user's question. ";
       context += "If annotations were created, mention what was highlighted and why it's important. ";
       context += "If any tools failed, work with the information you have and suggest alternatives if appropriate.";
       
       return context;
   }

   getGameStateContext() {
       // Keep existing implementation
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

   formatGameStateForLLM(gameContext) {
       // Keep existing implementation
       if (!gameContext.available) {
           return "Current Game State: Not available";
       }

       let contextString = "=== CURRENT GAME STATE ===\n";
       
       if (gameContext.currentPosition) {
           contextString += `Position: ${gameContext.currentPosition.fen}\n`;
           contextString += `Turn: ${gameContext.currentPosition.turn} to move\n`;
           contextString += `Move: ${gameContext.currentPosition.moveNumber}\n`;
       }

       if (gameContext.openingKnowledge && gameContext.openingKnowledge.available) {
           contextString += "\n=== OPENING ANALYSIS ===\n";
           contextString += gameContext.openingKnowledge.formatted + "\n";
       }

       contextString += "=== END GAME STATE ===\n\n";
       contextString += "Please respond to the user's message with specific reference to the current position when relevant.";

       return contextString;
   }

   updateConversationHistory(userMessage, assistantReply) {
       // Keep existing implementation
       this.conversationHistory.push({
           user: userMessage,
           assistant: assistantReply,
           timestamp: new Date().toISOString()
       });
       
       if (this.conversationHistory.length > 20) {
           this.conversationHistory = this.conversationHistory.slice(-20);
       }
   }

   getFallbackResponse(userMessage, error) {
       // Keep existing implementation with agentic awareness
       console.log('🔄 Using fallback response due to error');
       
       const lowerMessage = userMessage.toLowerCase();
       
       if (this.agenticMode) {
           return `I'm experiencing some technical difficulties with my advanced features, but I'm still here to help you learn chess! ${error.message ? 'The issue was: ' + error.message + '. ' : ''}Could you try rephrasing your question?`;
       }
       
       if (lowerMessage.includes('opening') || lowerMessage.includes('defense')) {
           return "I'd love to help you learn about that opening! However, I'm having some technical difficulties with my demonstration tools right now. I can still discuss chess theory and strategy with you. Could you ask me a specific question about the opening you're interested in?";
       }
       
       if (lowerMessage.includes('teach') || lowerMessage.includes('learn')) {
           return "I'm excited to teach you! I'm having some trouble with my position-loading tools at the moment, but I can still provide chess instruction and answer your questions. What would you like to learn about?";
       }
       
       if (lowerMessage.includes('analyze') || lowerMessage.includes('position')) {
           return "I'd be happy to help analyze positions! My advanced analysis tools aren't working properly right now, but I can still provide general chess guidance. Can you describe the position or ask a specific question?";
       }
       
       return `I apologize, but I'm experiencing some technical difficulties (${error.message}). I can still help you with general chess questions and advice though! What would you like to know about chess?`;
   }

   getAvailableTools() {
       // Keep existing implementation
       if (!this.chessTools?.isInitialized) {
           return [];
       }
       
       return this.chessTools.getToolsInfo();
   }

   resetConversation() {
       // Keep existing implementation
       this.conversationHistory = [];
       console.log('🔄 EnhancedChatInterface: Conversation history reset');
   }

   hasGameStateContext() {
       // Keep existing implementation
       return this.gameStateContextBridge && this.gameStateContextBridge.isReady();
   }

   getCurrentGameSummary() {
       // Keep existing implementation
       const context = this.getGameStateContext();
       if (!context || !context.available) {
           return "No game state available";
       }
       
       const pos = context.currentPosition;
       return `${pos.turn} to move, Move ${pos.moveNumber}, ${context.gameStatus.isGameOver ? 'Game Over' : 'In Progress'}`;
   }

   parseFenForAnnotation(fen) {
       // Helper method for annotation preparation
       return this.parseFenBoard(fen);
   }

   findRelevantPieces(board) {
       // Helper method for annotation preparation
       const pieces = [];
       for (const [square, piece] of Object.entries(board)) {
           if (['Q', 'q', 'R', 'r', 'N', 'n', 'B', 'b'].includes(piece)) {
               pieces.push(square);c
           }
       }
       return pieces.slice(0, 4); // Limit to 4 pieces
   }
}

window.clearResponseCache = function() {
    if (window.chessChat?.interface?.responseCache) {
        window.chessChat.interface.responseCache.clear();
        console.log('✅ Response cache cleared');
    } else {
        console.log('❌ No response cache found');
    }
};

window.getCacheStats = function() {
    if (window.chessChat?.interface?.responseCache) {
        const stats = window.chessChat.interface.responseCache.getStats();
        console.log('📊 Cache Stats:', stats);
        return stats;
    } else {
        console.log('❌ No response cache found');
        return null;
    }
};

// Export for use
if (typeof window !== 'undefined') {
   window.EnhancedChatInterface = EnhancedChatInterface;
}

if (typeof module !== 'undefined' && module.exports) {
   module.exports = EnhancedChatInterface;
}