// File: assets/js/ai/tool-integration.js
// Integration layer for chess tools and enhanced chat interface - FIXED for CommonJS

/**
 * Initialize the enhanced chat interface with tools
 */
async function initializeEnhancedChat(gameStateContextBridge) {
    console.log('🔧 ToolIntegration: Starting enhanced chat initialization...');
    
    try {
        // Ensure global references are available
        if (!window.openingKnowledgeSystem) {
            console.warn('⚠️ ToolIntegration: Opening knowledge system not found on window');
        }
        
        if (!window.appOrchestrator) {
            console.warn('⚠️ ToolIntegration: App orchestrator not found on window');
        }
        
        // Check if enhanced interface is available
        if (!window.EnhancedChatInterface) {
            console.error('❌ ToolIntegration: EnhancedChatInterface not available');
            throw new Error('Enhanced chat interface not loaded');
        }
        
        // Check if ChessTools is available
        if (!window.ChessTools) {
            console.error('❌ ToolIntegration: ChessTools not available');
            throw new Error('Chess tools not loaded');
        }
        
        // Create enhanced chat interface
        const enhancedChat = new window.EnhancedChatInterface();
        
        // Initialize with game state bridge
        await enhancedChat.initialize(gameStateContextBridge);
        
        console.log('✅ ToolIntegration: Enhanced chat interface ready');
        console.log('🛠️ Available tools:', enhancedChat.getAvailableTools().map(t => t.name));
        
        return enhancedChat;
        
    } catch (error) {
        console.error('❌ ToolIntegration: Failed to initialize enhanced chat:', error);
        
        // Fallback to basic chat interface
        console.log('🔄 ToolIntegration: Falling back to basic chat interface');
        const basicChat = new window.ChatInterface();
        await basicChat.initialize(gameStateContextBridge);
        return basicChat;
    }
}

/**
 * Setup global tool access points
 */
function setupGlobalToolAccess() {
    console.log('🔧 ToolIntegration: Setting up global tool access...');
    
    // Ensure appOrchestrator is globally accessible for tools
    if (window.appOrchestrator && !window.appOrchestrator.loadFEN) {
        console.warn('⚠️ ToolIntegration: loadFEN method not found on appOrchestrator');
    }
    
    // Verify opening knowledge system
    if (window.openingKnowledgeSystem) {
        console.log('✅ ToolIntegration: Opening knowledge system available');
        console.log('📊 Database size:', Object.keys(window.openingKnowledgeSystem.ecoDatabase || {}).length, 'positions');
    }
    
    // Verify game state bridge
    if (window.gameStateContextBridge) {
        console.log('✅ ToolIntegration: Game state bridge available');
        console.log('🎯 Bridge ready:', window.gameStateContextBridge.isReady());
    }
}

/**
 * Test tool functionality
 */
async function testToolFunctionality() {
    console.log('🧪 ToolIntegration: Testing tool functionality...');
    
    const tests = {
        openingSearch: false,
        fenLoading: false,
        gameStateAccess: false,
        chessToolsClass: false,
        enhancedChatClass: false
    };
    
    // Test class availability
    try {
        tests.chessToolsClass = typeof window.ChessTools === 'function';
        console.log('✅ ChessTools class test:', tests.chessToolsClass ? 'PASS' : 'FAIL');
    } catch (error) {
        console.log('❌ ChessTools class test: FAIL -', error.message);
    }
    
    try {
        tests.enhancedChatClass = typeof window.EnhancedChatInterface === 'function';
        console.log('✅ EnhancedChatInterface class test:', tests.enhancedChatClass ? 'PASS' : 'FAIL');
    } catch (error) {
        console.log('❌ EnhancedChatInterface class test: FAIL -', error.message);
    }
    
    // Test opening search
    try {
        if (window.openingKnowledgeSystem?.isInitialized) {
            const searchResults = window.openingKnowledgeSystem.searchByName('sicilian');
            tests.openingSearch = searchResults.length > 0;
            console.log('✅ Opening search test:', tests.openingSearch ? 'PASS' : 'FAIL');
        }
    } catch (error) {
        console.log('❌ Opening search test: FAIL -', error.message);
    }
    
    // Test FEN loading capability
    try {
        tests.fenLoading = typeof window.appOrchestrator?.loadFEN === 'function';
        console.log('✅ FEN loading test:', tests.fenLoading ? 'PASS' : 'FAIL');
    } catch (error) {
        console.log('❌ FEN loading test: FAIL -', error.message);
    }
    
    // Test game state access
    try {
        if (window.gameStateContextBridge?.isReady()) {
            const context = window.gameStateContextBridge.getContextForAI();
            tests.gameStateAccess = context && context.available;
            console.log('✅ Game state access test:', tests.gameStateAccess ? 'PASS' : 'FAIL');
        }
    } catch (error) {
        console.log('❌ Game state access test: FAIL -', error.message);
    }
    
    const allPassed = Object.values(tests).every(test => test);
    console.log('🧪 Tool integration tests:', allPassed ? 'ALL PASS' : 'SOME FAILED');
    console.log('🧪 Test results:', tests);
    
    return tests;
}

/**
 * Enhanced initialization function for index.html
 */
async function initializeAIWithTools() {
    console.log('🚀 ToolIntegration: Starting AI initialization with tools...');
    
    try {
        // Wait for all systems to be ready
        if (!window.gameStateContextBridge?.isReady()) {
            console.log('⏳ ToolIntegration: Waiting for game state bridge...');
            await new Promise(resolve => {
                const checkReady = () => {
                    if (window.gameStateContextBridge?.isReady()) {
                        resolve();
                    } else {
                        setTimeout(checkReady, 100);
                    }
                };
                checkReady();
            });
        }
        
        // Setup global access
        setupGlobalToolAccess();
        
        // Test functionality
        const testResults = await testToolFunctionality();
        
        // Check if we can use enhanced chat
        let chatInterface;
        let isEnhanced = false;
        
        if (testResults.chessToolsClass && testResults.enhancedChatClass) {
            console.log('🛠️ ToolIntegration: Enhanced features available, attempting initialization...');
            try {
                // Initialize enhanced chat
                chatInterface = await initializeEnhancedChat(window.gameStateContextBridge);
                
                // Check if it's actually enhanced or fallback
                isEnhanced = chatInterface.constructor.name === 'EnhancedChatInterface';
                
                if (isEnhanced) {
                    console.log('✅ ToolIntegration: Successfully initialized enhanced chat interface');
                } else {
                    console.log('🔄 ToolIntegration: Fell back to basic chat interface during enhanced init');
                }
                
            } catch (error) {
                console.error('❌ ToolIntegration: Enhanced chat failed, using basic:', error);
                isEnhanced = false;
            }
        } else {
            console.log('🔄 ToolIntegration: Enhanced features not available, using basic chat');
            isEnhanced = false;
        }
        
        // If enhanced failed or not available, use basic chat
        if (!isEnhanced || !chatInterface) {
            console.log('🔄 ToolIntegration: Initializing basic chat interface...');
            chatInterface = new window.ChatInterface();
            await chatInterface.initialize(window.gameStateContextBridge);
        }
        
        // Store globally for access
        window.aiChatInterface = chatInterface;
        
        // Initialize chat manager with the chat interface
        if (window.ChatManager) {
            const chatManager = new window.ChatManager();
            await chatManager.initialize(chatInterface);
            window.aiChatManager = chatManager;
            console.log('✅ ToolIntegration: Chat manager initialized');
        }
        
        console.log('🎉 ToolIntegration: AI initialization complete!');
        
        return {
            success: true,
            chatInterface,
            isEnhanced,
            testResults,
            toolsAvailable: chatInterface.getAvailableTools?.() || []
        };
        
    } catch (error) {
        console.error('❌ ToolIntegration: Failed to initialize AI with tools:', error);
        return {
            success: false,
            error: error.message,
            isEnhanced: false
        };
    }
}

/**
 * Quick test function for chess tools
 */
async function quickTestChessTools() {
    console.log('🧪 ToolIntegration: Quick chess tools test...');
    
    try {
        // Test ChessTools class initialization
        const chessTools = new window.ChessTools();
        await chessTools.initialize();
        
        const tools = chessTools.getToolsArray();
        console.log('✅ Chess tools initialized:', tools.length, 'tools available');
        
        // Test search tool
        const searchTool = tools.find(t => t.name === 'search_opening');
        if (searchTool) {
            const result = await searchTool.call({ searchTerm: 'french' });
            const parsed = JSON.parse(result);
            console.log('✅ Search tool test:', parsed.success ? 'PASS' : 'FAIL');
        }
        
        return true;
        
    } catch (error) {
        console.error('❌ Chess tools test failed:', error);
        return false;
    }
}

// Export functions
if (typeof window !== 'undefined') {
    window.ToolIntegration = {
        initializeEnhancedChat,
        setupGlobalToolAccess,
        testToolFunctionality,
        initializeAIWithTools,
        quickTestChessTools
    };
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        initializeEnhancedChat,
        setupGlobalToolAccess,
        testToolFunctionality,
        initializeAIWithTools,
        quickTestChessTools
    };
}