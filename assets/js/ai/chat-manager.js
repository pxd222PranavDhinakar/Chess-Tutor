// Chat Manager - UI integration for chess coach chat
// FIXED VERSION: Now properly uses passed ChatInterface instead of creating new one

class ChatManager {
    constructor() {
        this.messages = [];
        this.isConnected = false;
        this.isThinking = false;
        this.chatInterface = null;
        this.elements = {};
        this.eventListeners = {};
    }

    /**
     * Initialize the chat manager and UI - FIXED
     */
    async initialize(chatInterface) {
        console.log('Initializing ChatManager...');
        
        // ✅ FIX: Use the passed chatInterface instead of creating new one
        if (!chatInterface) {
            throw new Error('ChatInterface must be provided to ChatManager');
        }
        
        this.chatInterface = chatInterface; // ✅ Use existing instance
        
        this.createChatUI();
        this.setupEventListeners();
        
        // Check if interface is already initialized
        if (this.chatInterface.isInitialized) {
            this.setConnectionStatus(true, 'Connected');
            this.addSystemMessage('Chess coach connected! Ask me anything about chess.');
        } else {
            // Try to connect if not already initialized
            try {
                await this.connect();
                this.addSystemMessage('Chess coach connected! Ask me anything about chess.');
            } catch (error) {
                console.error('Failed to connect to chat interface:', error);
                this.addSystemMessage('Failed to connect to chess coach. Please check if Ollama is running.');
            }
        }
    }

    /**
     * Create the chat UI elements
     */
    createChatUI() {
        // Find the right panel to add chat to
        const rightPanel = document.querySelector('.right-panel');
        if (!rightPanel) {
            console.error('Right panel not found for chat UI');
            return;
        }

        // Create chat panel HTML
        const chatPanelHTML = `
            <div class="analysis-section">
                <h3>Chess Coach</h3>
                <div class="ai-chat-panel">
                    <div class="ai-chat-header">
                        <div class="ai-chat-status disconnected" id="chatStatus"></div>
                        <span id="chatStatusText">Connecting...</span>
                    </div>
                    <div class="ai-chat-messages" id="chatMessages">
                        <div class="ai-chat-empty">
                            <div class="ai-chat-empty-icon">♟️</div>
                            <div class="ai-chat-empty-text">Chess Coach</div>
                            <div class="ai-chat-empty-subtitle">Ask me about positions, moves, or strategy!</div>
                        </div>
                    </div>
                    <div class="ai-chat-input-container">
                        <textarea 
                            id="chatInput" 
                            class="ai-chat-input" 
                            placeholder="Ask me about chess..."
                            rows="1"
                        ></textarea>
                        <button id="chatSend" class="ai-chat-send" disabled>Send</button>
                    </div>
                </div>
            </div>
        `;

        // Insert before the first analysis section
        const firstSection = rightPanel.querySelector('.analysis-section');
        if (firstSection) {
            firstSection.insertAdjacentHTML('beforebegin', chatPanelHTML);
        } else {
            rightPanel.insertAdjacentHTML('afterbegin', chatPanelHTML);
        }

        // Cache DOM elements
        this.elements = {
            status: document.getElementById('chatStatus'),
            statusText: document.getElementById('chatStatusText'),
            messages: document.getElementById('chatMessages'),
            input: document.getElementById('chatInput'),
            sendButton: document.getElementById('chatSend')
        };

        console.log('Chat UI created successfully');
    }

    /**
     * Setup event listeners
     */
    setupEventListeners() {
        if (!this.elements.input || !this.elements.sendButton) {
            console.error('Chat elements not found for event listeners');
            return;
        }

        // Send button click
        this.elements.sendButton.addEventListener('click', () => {
            this.sendMessage();
        });

        // Enter key to send (Shift+Enter for new line)
        this.elements.input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                this.sendMessage();
            }
        });

        // Auto-resize textarea
        this.elements.input.addEventListener('input', () => {
            this.autoResizeInput();
        });

        // Enable/disable send button based on input
        this.elements.input.addEventListener('input', () => {
            this.updateSendButton();
        });

        console.log('Chat event listeners setup complete');
    }

    /**
     * Connect to the chat interface - UPDATED
     */
    async connect() {
        if (!this.chatInterface) {
            throw new Error('No chat interface available');
        }

        try {
            // If already initialized, we're good
            if (this.chatInterface.isInitialized) {
                this.setConnectionStatus(true, 'Connected');
                return;
            }
            
            // Otherwise, try to initialize
            await this.chatInterface.initialize();
            this.setConnectionStatus(true, 'Connected');
        } catch (error) {
            this.setConnectionStatus(false, 'Connection failed');
            throw error;
        }
    }

    /**
     * Send a message to the chat interface
     */
    async sendMessage() {
        const input = this.elements.input;
        const message = input.value.trim();
        
        if (!message || this.isThinking) {
            return;
        }

        // Add user message to UI
        this.addMessage('user', message);
        
        // Clear input
        input.value = '';
        this.autoResizeInput();
        this.updateSendButton();

        // Set thinking state
        this.setThinkingState(true);

        try {
            // Send to chat interface and get response
            const response = await this.chatInterface.sendMessage(message);
            
            // Add assistant response
            this.addMessage('assistant', response);
            
        } catch (error) {
            console.error('Error sending message:', error);
            this.addMessage('system', 'Sorry, I encountered an error. Please try again.');
        } finally {
            this.setThinkingState(false);
        }
    }

    /**
     * Add a message to the chat UI
     */
    addMessage(type, content, timestamp = null) {
        const messageData = {
            type,
            content,
            timestamp: timestamp || new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        };

        this.messages.push(messageData);
        this.renderMessage(messageData);
        this.scrollToBottom();
    }

    /**
     * Add a system message
     */
    addSystemMessage(content) {
        this.addMessage('system', content);
    }

    /**
     * Render a single message in the UI
     */
    renderMessage(messageData) {
        // Remove empty state if present
        const emptyState = this.elements.messages.querySelector('.ai-chat-empty');
        if (emptyState) {
            emptyState.remove();
        }

        const messageEl = document.createElement('div');
        messageEl.className = `ai-message ${messageData.type}`;
        
        const contentEl = document.createElement('div');
        contentEl.textContent = messageData.content;
        
        const timestampEl = document.createElement('div');
        timestampEl.className = 'ai-message-timestamp';
        timestampEl.textContent = messageData.timestamp;
        
        messageEl.appendChild(contentEl);
        messageEl.appendChild(timestampEl);
        
        this.elements.messages.appendChild(messageEl);
    }

    /**
     * Set connection status
     */
    setConnectionStatus(connected, statusText) {
        this.isConnected = connected;
        
        if (this.elements.status && this.elements.statusText) {
            this.elements.status.className = `ai-chat-status ${connected ? 'connected' : 'disconnected'}`;
            this.elements.statusText.textContent = statusText;
        }

        // Enable/disable input based on connection
        this.updateSendButton();
    }

    /**
     * Set thinking state
     */
    setThinkingState(thinking) {
        this.isThinking = thinking;
        
        if (this.elements.status) {
            if (thinking) {
                this.elements.status.className = 'ai-chat-status thinking';
                this.elements.statusText.textContent = 'Thinking...';
                this.showTypingIndicator();
            } else {
                this.elements.status.className = 'ai-chat-status connected';
                this.elements.statusText.textContent = 'Connected';
                this.hideTypingIndicator();
            }
        }
        
        this.updateSendButton();
    }

    /**
     * Show typing indicator
     */
    showTypingIndicator() {
        const existing = this.elements.messages.querySelector('.ai-typing-indicator');
        if (existing) return;

        const typingEl = document.createElement('div');
        typingEl.className = 'ai-typing-indicator';
        typingEl.innerHTML = `
            Chess coach is thinking
            <div class="ai-typing-dots">
                <div class="ai-typing-dot"></div>
                <div class="ai-typing-dot"></div>
                <div class="ai-typing-dot"></div>
            </div>
        `;
        
        this.elements.messages.appendChild(typingEl);
        this.scrollToBottom();
    }

    /**
     * Hide typing indicator
     */
    hideTypingIndicator() {
        const typingIndicator = this.elements.messages.querySelector('.ai-typing-indicator');
        if (typingIndicator) {
            typingIndicator.remove();
        }
    }

    /**
     * Auto-resize input textarea
     */
    autoResizeInput() {
        const input = this.elements.input;
        if (!input) return;

        input.style.height = 'auto';
        input.style.height = Math.min(input.scrollHeight, 80) + 'px';
    }

    /**
     * Update send button state
     */
    updateSendButton() {
        if (!this.elements.sendButton || !this.elements.input) return;

        const hasText = this.elements.input.value.trim().length > 0;
        const canSend = this.isConnected && hasText && !this.isThinking;
        
        this.elements.sendButton.disabled = !canSend;
    }

    /**
     * Scroll messages to bottom
     */
    scrollToBottom() {
        if (this.elements.messages) {
            this.elements.messages.scrollTop = this.elements.messages.scrollHeight;
        }
    }

    /**
     * Clear all messages
     */
    clearMessages() {
        this.messages = [];
        if (this.elements.messages) {
            this.elements.messages.innerHTML = `
                <div class="ai-chat-empty">
                    <div class="ai-chat-empty-icon">♟️</div>
                    <div class="ai-chat-empty-text">Chess Coach</div>
                    <div class="ai-chat-empty-subtitle">Ask me about positions, moves, or strategy!</div>
                </div>
            `;
        }
    }

    /**
     * Get chat history
     */
    getChatHistory() {
        return this.messages.filter(msg => msg.type !== 'system');
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
}

// Make it available globally
window.ChatManager = ChatManager;