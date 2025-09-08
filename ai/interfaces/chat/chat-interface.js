// DEBUGGING VERSION of chat-interface.js with extensive logging
// Replace your current chat-interface.js with this version

class ChatInterface {
    constructor() {
        this.llm = null;
        this.isInitialized = false;
        this.conversationHistory = [];
        this.gameStateContextBridge = null;
        
        // Enhanced system prompt with game state awareness
        this.systemPrompt = `You are a friendly and knowledgeable chess coach and tutor. You love helping players of all levels improve their chess skills.

Your capabilities:
- Analyze chess positions and explain strategic/tactical concepts
- Provide move recommendations and explanations
- Teach chess principles appropriate to the player's level
- Discuss opening theory, middlegame strategy, and endgame technique
- Help identify mistakes and suggest improvements

Your personality:
- Be encouraging and supportive
- Explain concepts clearly with appropriate depth
- Give practical, actionable advice
- Ask follow-up questions to understand the player's needs
- Stay focused on chess instruction and improvement

When game state is available, you can:
- Comment on the current position
- Explain the last move played
- Suggest candidate moves
- Point out tactical opportunities or threats
- Discuss positional considerations

Game State Context Format:
You will receive game state information in this format when available:
{
  "available": true/false,
  "currentPosition": { "fen": "...", "turn": "White/Black", "moveNumber": n },
  "gameStatus": { "isCheck": bool, "isCheckmate": bool, etc. },
  "moveHistory": [ { "moveNumber": n, "white": {...}, "black": {...} } ],
  "analysis": { "evaluation": number, "bestMove": "...", etc. },
  "positionInfo": { "gamePhase": "opening/middlegame/endgame", etc. }
}

Guidelines:
- Always be helpful and educational
- When game state is available, reference specific moves and positions
- When no game state is available, provide general chess instruction
- Keep responses concise but thorough
- Encourage questions and deeper exploration of concepts`;
    }

    /**
     * Initialize the chat interface with game state bridge - UPDATED FOR DEEPSEEK
     */
    async initialize(gameStateContextBridge = null) {
        console.log('🔧 ChatInterface: Initializing with game state awareness...');
        console.log('🔧 ChatInterface: Game state bridge received:', !!gameStateContextBridge);
        
        try {
            // Store game state bridge reference
            this.gameStateContextBridge = gameStateContextBridge;
            
            // Test the bridge immediately
            if (gameStateContextBridge) {
                console.log('🔧 ChatInterface: Testing game state bridge...');
                console.log('🔧 ChatInterface: Bridge is ready:', gameStateContextBridge.isReady());
                if (gameStateContextBridge.isReady()) {
                    const testContext = gameStateContextBridge.getSimpleContext();
                    console.log('🔧 ChatInterface: Initial context test:', testContext);
                }
            }
            
            // Use require instead of import for Electron
            const { ChatOllama } = require('@langchain/ollama');
            const { HumanMessage, SystemMessage, AIMessage } = require('@langchain/core/messages');
            
            // Store message classes for later use
            this.HumanMessage = HumanMessage;
            this.SystemMessage = SystemMessage;
            this.AIMessage = AIMessage;
            
            // UPDATED: Initialize with DeepSeek-R1:14b for enhanced reasoning
            this.llm = new ChatOllama({
                model: "deepseek-r1:14b",
                temperature: 0.1,        // Very low for logical reasoning
                num_predict: 300,        // Moderate tokens for basic chat
                top_p: 0.3,             // More focused text generation  
                top_k: 5,               // Consider fewer token options
                repeat_penalty: 1.1,    // Reduce repetition
                baseUrl: "http://localhost:11434",
            });

            // Test the connection
            await this.testConnection();
            
            this.isInitialized = true;
            console.log('✅ ChatInterface: Initialized successfully with game state awareness');
            
        } catch (error) {
            console.error('❌ ChatInterface: Failed to initialize:', error);
            throw new Error(`Chat initialization failed: ${error.message}`);
        }
    }

    /**
     * Test the connection to Ollama
     */
    async testConnection() {
        try {
            const testMessage = new this.SystemMessage("Test connection");
            const response = await this.llm.invoke([testMessage]);
            console.log('✅ ChatInterface: Ollama connection test successful');
            return true;
        } catch (error) {
            console.error('❌ ChatInterface: Ollama connection test failed:', error);
            throw new Error('Cannot connect to Ollama. Make sure Ollama is running with: ollama serve');
        }
    }

    /**
     * Send a message with game state context
     */
    async sendMessage(userMessage) {
        if (!this.isInitialized) {
            throw new Error('Chat interface not initialized');
        }

        try {
            console.log('📨 ChatInterface: Sending message to chess coach:', userMessage);

            // DEBUG: Test game state context before building messages
            this.debugGameStateContext();

            // Build conversation context with game state
            const messages = this.buildConversationContext(userMessage);
            
            console.log('📨 ChatInterface: Built message context with', messages.length, 'messages');
            // Log the actual messages being sent (first few for debugging)
            messages.forEach((msg, i) => {
                if (i < 3) { // Only log first 3 messages to avoid spam
                    console.log(`📨 Message ${i}:`, msg.constructor.name, msg.content.slice(0, 100) + '...');
                }
            });
            
            // Get response from the model
            const response = await this.llm.invoke(messages);
            
            // Extract the content from the response
            const assistantReply = response.content || response.text || 'I apologize, but I had trouble processing that. Could you try rephrasing?';
            
            // Update conversation history
            this.updateConversationHistory(userMessage, assistantReply);
            
            console.log('✅ ChatInterface: Received response from chess coach:', assistantReply.slice(0, 100) + '...');
            return assistantReply;
            
        } catch (error) {
            console.error('❌ ChatInterface: Error in sendMessage:', error);
            throw new Error(`Failed to get response: ${error.message}`);
        }
    }

    /**
     * Debug game state context - NEW DEBUGGING METHOD
     */
    debugGameStateContext() {
        console.log('🔍 ChatInterface: === GAME STATE DEBUG ===');
        console.log('🔍 ChatInterface: Bridge exists:', !!this.gameStateContextBridge);
        
        if (!this.gameStateContextBridge) {
            console.log('❌ ChatInterface: No game state bridge available');
            return;
        }
        
        console.log('🔍 ChatInterface: Bridge is ready:', this.gameStateContextBridge.isReady());
        
        if (!this.gameStateContextBridge.isReady()) {
            console.log('❌ ChatInterface: Game state bridge not ready');
            return;
        }
        
        try {
            const simpleContext = this.gameStateContextBridge.getSimpleContext();
            console.log('🔍 ChatInterface: Simple context:', simpleContext);
            
            const fullContext = this.gameStateContextBridge.getContextForAI();
            console.log('🔍 ChatInterface: Full context available:', fullContext.available);
            console.log('🔍 ChatInterface: Full context keys:', Object.keys(fullContext));
            
            if (fullContext.available) {
                console.log('🔍 ChatInterface: Current position:', fullContext.currentPosition);
                console.log('🔍 ChatInterface: Move history length:', fullContext.moveHistory?.length || 0);
            }
            
        } catch (error) {
            console.error('❌ ChatInterface: Error getting context:', error);
        }
        
        console.log('🔍 ChatInterface: === END DEBUG ===');
    }

    /**
     * Build conversation context with system prompt, game state, and history
     */
    buildConversationContext(userMessage) {
        console.log('🏗️ ChatInterface: Building conversation context...');
        const messages = [];
        
        // Add enhanced system prompt
        messages.push(new this.SystemMessage(this.systemPrompt));
        console.log('🏗️ ChatInterface: Added system prompt');
        
        // Add game state context if available
        const gameContext = this.getGameStateContext();
        console.log('🏗️ ChatInterface: Retrieved game context:', !!gameContext);
        
        if (gameContext) {
            const contextMessage = this.formatGameStateForLLM(gameContext);
            console.log('🏗️ ChatInterface: Formatted context message length:', contextMessage.length);
            console.log('🏗️ ChatInterface: Context preview:', contextMessage.slice(0, 200) + '...');
            messages.push(new this.SystemMessage(contextMessage));
        } else {
            console.log('⚠️ ChatInterface: No game context available');
        }
        
        // Add conversation history (keep last 10 exchanges to manage context length)
        const recentHistory = this.conversationHistory.slice(-10);
        console.log('🏗️ ChatInterface: Adding', recentHistory.length, 'history exchanges');
        
        for (const exchange of recentHistory) {
            messages.push(new this.HumanMessage(exchange.user));
            messages.push(new this.AIMessage(exchange.assistant));
        }
        
        // Add current user message
        messages.push(new this.HumanMessage(userMessage));
        console.log('🏗️ ChatInterface: Added current user message');
        
        console.log('🏗️ ChatInterface: Total messages built:', messages.length);
        return messages;
    }

    /**
     * Get current game state context
     */
    getGameStateContext() {
        console.log('🎯 ChatInterface: Getting game state context...');
        
        if (!this.gameStateContextBridge) {
            console.log('❌ ChatInterface: No game state bridge');
            return null;
        }
        
        if (!this.gameStateContextBridge.isReady()) {
            console.log('❌ ChatInterface: Bridge not ready');
            return null;
        }

        try {
            const context = this.gameStateContextBridge.getContextForAI();
            console.log('✅ ChatInterface: Retrieved context, available:', context.available);
            return context;
        } catch (error) {
            console.error('❌ ChatInterface: Error getting game state context:', error);
            return null;
        }
    }

    /**
     * Format game state context for LLM consumption
     */
    formatGameStateForLLM(gameContext) {
        console.log('📝 ChatInterface: Formatting game state for LLM...');
        console.log('📝 ChatInterface: Context available:', gameContext.available);
        
        if (!gameContext.available) {
            console.log('❌ ChatInterface: Game context not available');
            return "Current Game State: Not available";
        }

        let contextString = "=== CURRENT GAME STATE ===\n";
        
        // Position info
        if (gameContext.currentPosition) {
            contextString += `Position: ${gameContext.currentPosition.fen}\n`;
            contextString += `Turn: ${gameContext.currentPosition.turn} to move\n`;
            contextString += `Move: ${gameContext.currentPosition.moveNumber}\n`;
            console.log('📝 ChatInterface: Added position info');
        }

        // Game status
        if (gameContext.gameStatus) {
            contextString += `Status: Game in progress\n`;
            contextString += `Legal moves available: ${gameContext.gameStatus.legalMovesCount}\n`;
            
            if (gameContext.gameStatus.isCheck) {
                contextString += `SPECIAL: King is in check!\n`;
            }
            console.log('📝 ChatInterface: Added game status');
        }

        // Move history
        if (gameContext.moveHistory && gameContext.moveHistory.length > 0) {
            contextString += `\nRecent moves:\n`;
            const recentMoves = gameContext.moveHistory.slice(-3); // Last 3 moves
            recentMoves.forEach(move => {
                let moveStr = `${move.moveNumber}.`;
                if (move.white) moveStr += ` ${move.white.san}`;
                if (move.black) moveStr += ` ${move.black.san}`;
                contextString += moveStr + '\n';
            });
            console.log('📝 ChatInterface: Added move history, moves:', gameContext.moveHistory.length);
        }

        // NEW: Opening knowledge
        if (gameContext.openingKnowledge) {
            if (gameContext.openingKnowledge.available) {
                contextString += "\n=== OPENING ANALYSIS ===\n";
                contextString += gameContext.openingKnowledge.formatted + "\n";
                
                if (gameContext.openingKnowledge.advice && gameContext.openingKnowledge.advice.length > 0) {
                    contextString += "\nOpening Guidance:\n";
                    gameContext.openingKnowledge.advice.forEach(advice => {
                        contextString += `- ${advice}\n`;
                    });
                }
                console.log('📝 ChatInterface: Added opening knowledge -', gameContext.openingKnowledge.opening.name);
            } else {
                contextString += "\nOpening: Position not in opening database (likely middlegame/endgame)\n";
                console.log('📝 ChatInterface: Position not in opening database');
            }
        }

        // Engine analysis
        if (gameContext.analysis) {
            contextString += `\nEngine Analysis:\n`;
            contextString += `Evaluation: ${gameContext.analysis.evaluation}\n`;
            if (gameContext.analysis.bestMove) {
                contextString += `Best move: ${gameContext.analysis.bestMove}\n`;
            }
            contextString += `Analysis depth: ${gameContext.analysis.depth}\n`;
            console.log('📝 ChatInterface: Added engine analysis');
        }

        // Position characteristics
        if (gameContext.positionInfo) {
            contextString += `\nPosition type: ${gameContext.positionInfo.gamePhase}\n`;
            console.log('📝 ChatInterface: Added position characteristics');
        }

        // Board state
        if (gameContext.boardState) {
            contextString += `Board view: ${gameContext.boardState.orientation}\n`;
            console.log('📝 ChatInterface: Added board state');
        }

        contextString += "=== END GAME STATE ===\n\n";
        contextString += "Please respond to the user's message with specific reference to the current position";
        
        // Add opening-specific instruction
        if (gameContext.openingKnowledge && gameContext.openingKnowledge.available) {
            contextString += ` and opening (${gameContext.openingKnowledge.opening.name})`;
        }
        
        contextString += " when relevant.";

        console.log('✅ ChatInterface: Formatted context string length:', contextString.length);
        console.log('📝 ChatInterface: Context preview:\n', contextString.slice(0, 200) + '...');

        return contextString;
    }

    /**
     * Update conversation history
     */
    updateConversationHistory(userMessage, assistantReply) {
        // Also store simplified game context for reference
        const gameContext = this.gameStateContextBridge ? 
            this.gameStateContextBridge.getSimpleContext() : null;
            
        this.conversationHistory.push({
            user: userMessage,
            assistant: assistantReply,
            gameContext: gameContext,
            timestamp: new Date().toISOString()
        });
        
        // Keep only the last 20 exchanges to prevent memory issues
        if (this.conversationHistory.length > 20) {
            this.conversationHistory = this.conversationHistory.slice(-20);
        }
    }

    /**
     * Clear conversation history
     */
    clearHistory() {
        this.conversationHistory = [];
        console.log('ChatInterface: Conversation history cleared');
    }

    /**
     * Get connection status including game state awareness
     */
    getStatus() {
        return {
            initialized: this.isInitialized,
            hasModel: !!this.llm,
            historyLength: this.conversationHistory.length,
            gameStateAvailable: this.gameStateContextBridge ? this.gameStateContextBridge.isReady() : false
        };
    }

    /**
     * Check if game state is currently available
     */
    hasGameStateContext() {
        return this.gameStateContextBridge && this.gameStateContextBridge.isReady();
    }

    /**
     * Get current game summary for debugging
     */
    getCurrentGameSummary() {
        if (!this.hasGameStateContext()) {
            return "No game state available";
        }

        const context = this.gameStateContextBridge.getSimpleContext();
        if (!context) return "Context is null";
        
        return `${context.turn} to move, Move ${context.moveCount}, ${context.isGameOver ? 'Game Over' : 'In Progress'}`;
    }
}

// Make it available globally
window.ChatInterface = ChatInterface;