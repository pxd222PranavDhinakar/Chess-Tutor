/**
 * ChessCoachAgent - True Agentic AI System
 * Implements self-monitoring, goal persistence, learning, and dynamic planning
 */

class ChessCoachAgent {
    constructor() {
        this.userProfile = null;
        this.goalManager = null;
        this.conversationMemory = [];
        this.teachingStrategies = new Map();
        this.errorPatterns = new Map();
        this.isInitialized = false;
        
        // Agent state
        this.currentSession = {
            startTime: Date.now(),
            interactions: 0,
            successfulTeaching: 0,
            userConfusion: 0,
            toolUsageSuccess: 0,
            toolUsageFailures: 0
        };
        
        // Meta-reasoning parameters
        this.reflectionThreshold = 3; // Reflect after 3 interactions
        this.adaptationRate = 0.1; // How quickly to adapt strategies
        this.confidenceThreshold = 0.7; // When to be confident in approach
        
        console.log('🤖 ChessCoachAgent: Agentic AI system initialized');
    }

    /**
     * Initialize the agentic system - NEW FEATURE
     */
    async initialize(userProfileSystem, goalManager) {
        this.userProfile = userProfileSystem;
        this.goalManager = goalManager;
        
        // Load teaching strategies
        this.initializeTeachingStrategies();
        
        // Load error patterns
        this.initializeErrorPatterns();
        
        this.isInitialized = true;
        console.log('🤖 ChessCoachAgent: Fully initialized with agentic capabilities');
    }

    /**
     * Initialize teaching strategies based on user characteristics - NEW FEATURE
     */
    initializeTeachingStrategies() {
        this.teachingStrategies.set('beginner', {
            preferredTools: ['search_opening', 'load_position', 'create_annotation'],
            explanationDepth: 'simple',
            visualsFrequency: 'high',
            repetitionRate: 'high',
            pacePreference: 'slow'
        });
        
        this.teachingStrategies.set('intermediate', {
            preferredTools: ['get_opening_details', 'analyze_current_position', 'search_opening'],
            explanationDepth: 'moderate',
            visualsFrequency: 'medium',
            repetitionRate: 'medium',
            pacePreference: 'medium'
        });
        
        this.teachingStrategies.set('advanced', {
            preferredTools: ['analyze_current_position', 'get_opening_details'],
            explanationDepth: 'deep',
            visualsFrequency: 'low',
            repetitionRate: 'low',
            pacePreference: 'fast'
        });
        
        this.teachingStrategies.set('visual_learner', {
            preferredTools: ['create_annotation', 'load_position', 'search_opening'],
            explanationDepth: 'moderate',
            visualsFrequency: 'very_high',
            repetitionRate: 'medium',
            pacePreference: 'medium'
        });
        
        console.log('🧠 ChessCoachAgent: Teaching strategies initialized');
    }

    /**
     * Initialize error pattern recognition - NEW FEATURE
     */
    initializeErrorPatterns() {
        this.errorPatterns.set('tool_failure', {
            indicators: ['failed', 'error', 'not available', 'sorry'],
            adaptations: ['try_alternative_tool', 'simplify_approach', 'explain_limitation']
        });
        
        this.errorPatterns.set('user_confusion', {
            indicators: ['what do you mean', 'i don\'t understand', 'confused', 'explain again'],
            adaptations: ['simplify_explanation', 'add_visuals', 'break_into_steps']
        });
        
        this.errorPatterns.set('repetitive_questions', {
            indicators: ['same_topic_3_times', 'circular_conversation'],
            adaptations: ['change_approach', 'suggest_practice', 'assess_understanding']
        });
        
        console.log('🔍 ChessCoachAgent: Error patterns initialized');
    }

    /**
     * Main agentic message processing - ENHANCED WITH AGENT REASONING
     */
    async processMessage(userMessage, gameContext, toolResults = []) {
        console.log('🤖 ChessCoachAgent: Processing message with agentic reasoning');
        
        // Update session stats
        this.currentSession.interactions++;
        
        // Self-monitoring: Evaluate previous interaction results
        if (this.currentSession.interactions > 1) {
            await this.performSelfMonitoring(toolResults);
        }
        
        // Goal management: Update and assess current goals
        const currentGoals = await this.assessAndUpdateGoals(userMessage, gameContext);
        
        // Learning: Update user profile based on interaction
        await this.updateUserProfile(userMessage, gameContext);
        
        // Meta-reasoning: Determine teaching strategy
        const strategy = await this.selectTeachingStrategy(userMessage, currentGoals);
        
        // Dynamic planning: Generate tool sequence
        const toolPlan = await this.generateDynamicToolSequence(userMessage, strategy, currentGoals);
        
        // Store interaction for future learning
        this.recordInteraction(userMessage, gameContext, strategy, toolPlan);
        
        return {
            toolPlan,
            strategy,
            goals: currentGoals,
            reasoning: this.generateReasoningExplanation(toolPlan, strategy)
        };
    }

    /**
     * Self-monitoring and error correction - NEW FEATURE
     */
    async performSelfMonitoring(previousToolResults) {
        console.log('🔄 ChessCoachAgent: Performing self-monitoring');
        
        // Analyze success of previous tools
        const toolSuccessRate = this.analyzeToolSuccess(previousToolResults);
        
        // Check for error patterns in recent interactions
        const errorPatterns = this.detectErrorPatterns();
        
        // Update session statistics
        if (toolSuccessRate > 0.8) {
            this.currentSession.toolUsageSuccess++;
        } else {
            this.currentSession.toolUsageFailures++;
        }
        
        // Self-correction if needed
        if (toolSuccessRate < 0.5 || errorPatterns.length > 0) {
            console.log('🔧 ChessCoachAgent: Triggering self-correction');
            await this.performSelfCorrection(errorPatterns);
        }
        
        // Reflection trigger
        if (this.currentSession.interactions % this.reflectionThreshold === 0) {
            await this.performReflection();
        }
    }

    /**
     * Analyze tool execution success rates - NEW FEATURE
     */
    analyzeToolSuccess(toolResults) {
        if (!toolResults || toolResults.length === 0) return 1.0;
        
        const successfulTools = toolResults.filter(result => result.success).length;
        return successfulTools / toolResults.length;
    }

    /**
     * Detect patterns indicating problems - NEW FEATURE
     */
    detectErrorPatterns() {
        const recentInteractions = this.conversationMemory.slice(-5);
        const detectedPatterns = [];
        
        // Check for repetitive topics
        const topics = recentInteractions.map(i => i.extractedTopic);
        const topicCounts = {};
        topics.forEach(topic => {
            topicCounts[topic] = (topicCounts[topic] || 0) + 1;
        });
        
        for (const [topic, count] of Object.entries(topicCounts)) {
            if (count >= 3) {
                detectedPatterns.push({
                    type: 'repetitive_questions',
                    topic: topic,
                    count: count
                });
            }
        }
        
        // Check for user confusion indicators
        const recentMessages = recentInteractions.map(i => i.userMessage.toLowerCase());
        for (const message of recentMessages) {
            for (const [patternType, pattern] of this.errorPatterns.entries()) {
                if (pattern.indicators.some(indicator => message.includes(indicator))) {
                    detectedPatterns.push({
                        type: patternType,
                        message: message
                    });
                }
            }
        }
        
        return detectedPatterns;
    }

    /**
     * Perform self-correction based on detected issues - NEW FEATURE
     */
    async performSelfCorrection(errorPatterns) {
        console.log('🔧 ChessCoachAgent: Performing self-correction for patterns:', errorPatterns);
        
        for (const pattern of errorPatterns) {
            const adaptations = this.errorPatterns.get(pattern.type)?.adaptations || [];
            
            for (const adaptation of adaptations) {
                switch (adaptation) {
                    case 'try_alternative_tool':
                        this.adjustToolPreferences('more_reliable');
                        break;
                    case 'simplify_approach':
                        this.adjustComplexityLevel('decrease');
                        break;
                    case 'add_visuals':
                        this.adjustVisualFrequency('increase');
                        break;
                    case 'change_approach':
                        this.adjustTeachingStyle('alternative');
                        break;
                }
            }
        }
        
        // Update user profile with learning
        if (this.userProfile) {
            await this.userProfile.recordAdaptation(errorPatterns);
        }
    }

    /**
     * Perform meta-reasoning reflection - NEW FEATURE
     */
    async performReflection() {
        console.log('🤔 ChessCoachAgent: Performing meta-reasoning reflection');
        
        const sessionAnalysis = {
            interactionCount: this.currentSession.interactions,
            successRate: this.currentSession.toolUsageSuccess / 
                        (this.currentSession.toolUsageSuccess + this.currentSession.toolUsageFailures),
            userEngagement: this.assessUserEngagement(),
            goalProgress: await this.goalManager.assessProgress(),
            strategiesUsed: this.getStrategiesUsed()
        };
        
        // Adjust future behavior based on reflection
        if (sessionAnalysis.successRate < 0.6) {
            console.log('🔄 ChessCoachAgent: Low success rate detected, adjusting strategy');
            this.adaptationRate = Math.min(0.3, this.adaptationRate + 0.05);
        }
        
        if (sessionAnalysis.userEngagement < 0.5) {
            console.log('🔄 ChessCoachAgent: Low engagement detected, increasing interactivity');
            this.adjustEngagementStrategy('increase');
        }
        
        // Record reflection for learning
        this.recordReflection(sessionAnalysis);
    }

    /**
     * Assess and update goals dynamically - NEW FEATURE
     */
    async assessAndUpdateGoals(userMessage, gameContext) {
        if (!this.goalManager) return [];
        
        // Extract potential new goals from message
        const extractedGoals = this.extractGoalsFromMessage(userMessage);
        
        // Update existing goals based on context
        const updatedGoals = await this.goalManager.updateGoals(extractedGoals, gameContext);
        
        // Prioritize goals based on user progress and needs
        const prioritizedGoals = await this.goalManager.prioritizeGoals(this.userProfile);
        
        console.log('🎯 ChessCoachAgent: Updated goals:', prioritizedGoals.map(g => g.description));
        
        return prioritizedGoals;
    }

    /**
     * Extract learning goals from user message - NEW FEATURE
     */
    extractGoalsFromMessage(message) {
        const lower = message.toLowerCase();
        const goals = [];
        
        // Opening learning goals
        if (lower.includes('learn') && (lower.includes('opening') || lower.includes('defense'))) {
            goals.push({
                type: 'opening_mastery',
                description: 'Master chess openings',
                priority: 'high',
                specificity: this.extractOpeningName(message) || 'general'
            });
        }
        
        // Tactical improvement goals
        if (lower.includes('tactics') || lower.includes('combinations') || lower.includes('puzzle')) {
            goals.push({
                type: 'tactical_improvement',
                description: 'Improve tactical awareness',
                priority: 'medium'
            });
        }
        
        // Position analysis goals
        if (lower.includes('analyze') || lower.includes('understand position')) {
            goals.push({
                type: 'position_analysis',
                description: 'Develop position evaluation skills',
                priority: 'medium'
            });
        }
        
        // Game improvement goals
        if (lower.includes('improve my game') || lower.includes('get better')) {
            goals.push({
                type: 'general_improvement',
                description: 'Overall chess improvement',
                priority: 'high'
            });
        }
        
        return goals;
    }

    /**
     * Update user profile with learning insights - NEW FEATURE
     */
    async updateUserProfile(userMessage, gameContext) {
        if (!this.userProfile) return;
        
        // Analyze message characteristics
        const messageAnalysis = {
            complexity: this.analyzeMessageComplexity(userMessage),
            topics: this.extractTopics(userMessage),
            learningStyle: this.inferLearningStyle(userMessage),
            skillLevel: this.inferSkillLevel(userMessage, gameContext)
        };
        
        // Update profile
        await this.userProfile.updateFromInteraction(messageAnalysis);
        
        console.log('📈 ChessCoachAgent: Updated user profile');
    }

    /**
     * Select optimal teaching strategy - NEW FEATURE
     */
    async selectTeachingStrategy(userMessage, goals) {
        // Get user characteristics
        const userLevel = this.userProfile ? await this.userProfile.getSkillLevel() : 'beginner';
        const learningStyle = this.userProfile ? await this.userProfile.getLearningStyle() : 'visual_learner';
        
        // Base strategy on user profile
        let strategy = this.teachingStrategies.get(userLevel) || this.teachingStrategies.get('beginner');
        
        // Adjust for learning style
        if (learningStyle === 'visual') {
            strategy = { ...strategy, visualsFrequency: 'very_high' };
        } else if (learningStyle === 'analytical') {
            strategy = { ...strategy, explanationDepth: 'deep' };
        }
        
        // Adjust for current goals
        if (goals.some(g => g.type === 'opening_mastery')) {
            strategy.preferredTools = ['search_opening', 'get_opening_details', 'load_position'];
        }
        
        // Adjust based on recent success
        if (this.currentSession.toolUsageFailures > this.currentSession.toolUsageSuccess) {
            strategy.preferredTools = strategy.preferredTools.slice(0, 2); // Use fewer tools
        }
        
        console.log('🧠 ChessCoachAgent: Selected strategy for', userLevel, 'user with', learningStyle, 'style');
        
        return strategy;
    }

    /**
     * Generate dynamic tool sequence based on context - NEW FEATURE
     */
    async generateDynamicToolSequence(userMessage, strategy, goals) {
        console.log('🔀 ChessCoachAgent: Generating dynamic tool sequence');
        
        const sequence = [];
        const messageIntent = this.analyzeMessageIntent(userMessage);
        
        // Primary goal assessment
        const primaryGoal = goals[0];
        
        // Dynamic sequence generation based on intent and strategy
        if (messageIntent.type === 'opening_request') {
            // For opening requests, adapt sequence based on user level
            if (strategy.explanationDepth === 'simple') {
                sequence.push(
                    { tool: 'search_opening', priority: 1, reason: 'Find basic opening info' },
                    { tool: 'load_position', priority: 2, reason: 'Show position visually' },
                    { tool: 'create_annotation', priority: 3, reason: 'Highlight key pieces' }
                );
            } else {
                sequence.push(
                    { tool: 'search_opening', priority: 1, reason: 'Find comprehensive info' },
                    { tool: 'get_opening_details', priority: 2, reason: 'Get deep analysis' },
                    { tool: 'load_position', priority: 3, reason: 'Demonstrate position' }
                );
            }
        } else if (messageIntent.type === 'analysis_request') {
            sequence.push(
                { tool: 'analyze_current_position', priority: 1, reason: 'Understand current state' }
            );
            
            // Add visualization if user prefers visuals
            if (strategy.visualsFrequency === 'high' || strategy.visualsFrequency === 'very_high') {
                sequence.push(
                    { tool: 'create_annotation', priority: 2, reason: 'Visual learning aid' }
                );
            }
        } else if (messageIntent.type === 'visual_request') {
            sequence.push(
                { tool: 'analyze_current_position', priority: 1, reason: 'Context for annotations' },
                { tool: 'create_annotation', priority: 2, reason: 'Create requested visuals' }
            );
        }
        
        // Adjust sequence based on recent failures
        if (this.currentSession.toolUsageFailures > 2) {
            // Use more reliable tools only
            const reliableTools = ['search_opening', 'analyze_current_position'];
            return sequence.filter(step => reliableTools.includes(step.tool));
        }
        
        // Add exploratory tools if user is advanced and engaged
        if (strategy.explanationDepth === 'deep' && this.assessUserEngagement() > 0.8) {
            sequence.push(
                { tool: 'get_opening_details', priority: 4, reason: 'Advanced exploration' }
            );
        }
        
        return sequence;
    }

    /**
     * Analyze message intent with enhanced AI reasoning - NEW FEATURE
     */
    analyzeMessageIntent(message) {
        const lower = message.toLowerCase();
        
        // Opening requests
        if (lower.includes('teach') || lower.includes('learn') || lower.includes('explain')) {
            if (lower.includes('opening') || lower.includes('defense') || lower.includes('gambit')) {
                return {
                    type: 'opening_request',
                    confidence: 0.9,
                    specificity: this.extractOpeningName(message) ? 'specific' : 'general'
                };
            }
        }
        
        // Analysis requests
        if (lower.includes('analyze') || lower.includes('evaluate') || lower.includes('think about')) {
            return {
                type: 'analysis_request',
                confidence: 0.8,
                depth: lower.includes('deep') ? 'deep' : 'standard'
            };
        }
        
        // Visual requests
        if (lower.includes('show') || lower.includes('highlight') || lower.includes('mark')) {
            return {
                type: 'visual_request',
                confidence: 0.85,
                visualType: this.determineVisualType(message)
            };
        }
        
        // General conversation
        return {
            type: 'general',
            confidence: 0.6,
            needsContext: true
        };
    }

    /**
     * Record interaction for learning and analysis - NEW FEATURE
     */
    recordInteraction(userMessage, gameContext, strategy, toolPlan) {
        const interaction = {
            timestamp: Date.now(),
            userMessage: userMessage,
            gameContext: gameContext ? {
                fen: gameContext.currentPosition?.fen,
                turn: gameContext.currentPosition?.turn,
                moveNumber: gameContext.currentPosition?.moveNumber
            } : null,
            strategy: strategy,
            toolPlan: toolPlan,
            extractedTopic: this.extractMainTopic(userMessage),
            userEngagement: this.assessCurrentEngagement(userMessage)
        };
        
        this.conversationMemory.push(interaction);
        
        // Keep memory manageable
        if (this.conversationMemory.length > 50) {
            this.conversationMemory = this.conversationMemory.slice(-40);
        }
        
        console.log('📝 ChessCoachAgent: Recorded interaction for learning');
    }

    /**
     * Generate explanation of reasoning process - NEW FEATURE
     */
    generateReasoningExplanation(toolPlan, strategy) {
        const explanations = [];
        
        explanations.push(`Selected ${strategy.explanationDepth} explanation approach based on user profile`);
        
        if (toolPlan.length > 0) {
            explanations.push(`Planning ${toolPlan.length} tools: ${toolPlan.map(t => t.tool).join(' → ')}`);
            explanations.push(`Primary reason: ${toolPlan[0]?.reason || 'Contextual analysis'}`);
        }
        
        if (strategy.visualsFrequency === 'high') {
            explanations.push('Emphasizing visual learning aids based on user preference');
        }
        
        return explanations.join('. ');
    }

    /**
     * Helper method to extract opening name - ENHANCED FROM EXISTING
     */
    extractOpeningName(message) {
        const lower = message.toLowerCase();
        
        const openings = [
            { name: 'french defense', patterns: ['french defense', 'french'] },
            { name: 'sicilian defense', patterns: ['sicilian defense', 'sicilian'] },
            { name: 'ruy lopez', patterns: ['ruy lopez', 'spanish opening'] },
            { name: 'italian game', patterns: ['italian game', 'italian'] },
            { name: 'caro-kann', patterns: ['caro-kann', 'caro kann'] },
            { name: 'queen\'s gambit', patterns: ['queen\'s gambit', 'queens gambit'] }
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

    /**
     * Additional helper methods for agent functionality - NEW FEATURES
     */
    analyzeMessageComplexity(message) {
        const wordCount = message.split(' ').length;
        const chessTerms = ['opening', 'tactic', 'position', 'strategy', 'endgame', 'middlegame'];
        const termCount = chessTerms.filter(term => message.toLowerCase().includes(term)).length;
        
        if (wordCount > 20 && termCount > 2) return 'high';
        if (wordCount > 10 && termCount > 1) return 'medium';
        return 'low';
    }

    extractTopics(message) {
        const lower = message.toLowerCase();
        const topics = [];
        
        if (lower.includes('opening')) topics.push('openings');
        if (lower.includes('tactic')) topics.push('tactics');
        if (lower.includes('endgame')) topics.push('endgames');
        if (lower.includes('strategy')) topics.push('strategy');
        if (lower.includes('position')) topics.push('position_analysis');
        
        return topics.length > 0 ? topics : ['general'];
    }

    inferLearningStyle(message) {
        const lower = message.toLowerCase();
        
        if (lower.includes('show') || lower.includes('see') || lower.includes('visual')) {
            return 'visual';
        }
        if (lower.includes('explain') || lower.includes('why') || lower.includes('how')) {
            return 'analytical';
        }
        if (lower.includes('practice') || lower.includes('try') || lower.includes('do')) {
            return 'kinesthetic';
        }
        
        return 'mixed';
    }

    inferSkillLevel(message, gameContext) {
        const lower = message.toLowerCase();
        
        // Beginner indicators
        if (lower.includes('beginner') || lower.includes('new to chess') || lower.includes('just started')) {
            return 'beginner';
        }
        
        // Advanced indicators
        if (lower.includes('advanced') || lower.includes('master') || lower.includes('expert')) {
            return 'advanced';
        }
        
        // Check for technical terms
        const advancedTerms = ['zugzwang', 'zwischenzug', 'fianchetto', 'en passant', 'castling rights'];
        if (advancedTerms.some(term => lower.includes(term))) {
            return 'advanced';
        }
        
        return 'intermediate';
    }

    assessUserEngagement() {
        if (this.conversationMemory.length === 0) return 0.5;
        
        const recent = this.conversationMemory.slice(-5);
        const avgLength = recent.reduce((sum, i) => sum + i.userMessage.length, 0) / recent.length;
        const questionCount = recent.filter(i => i.userMessage.includes('?')).length;
        
        // Simple engagement scoring
        let score = 0.5;
        if (avgLength > 50) score += 0.2;
        if (questionCount > 0) score += 0.2;
        if (recent.length >= 3) score += 0.1;
        
        return Math.min(1.0, score);
    }

    assessCurrentEngagement(message) {
        const length = message.length;
        const hasQuestion = message.includes('?');
        const enthusiasm = /!|wow|great|awesome|cool/.test(message.toLowerCase());
        
        let score = 0.5;
        if (length > 30) score += 0.2;
        if (hasQuestion) score += 0.2;
        if (enthusiasm) score += 0.1;
        
        return Math.min(1.0, score);
    }

    extractMainTopic(message) {
        const topics = this.extractTopics(message);
        return topics[0] || 'general';
    }

    determineVisualType(message) {
        const lower = message.toLowerCase();
        
        if (lower.includes('arrow')) return 'arrow';
        if (lower.includes('highlight')) return 'highlight';
        if (lower.includes('circle')) return 'circle';
        
        return 'general';
    }

    getStrategiesUsed() {
        const recent = this.conversationMemory.slice(-10);
        const strategies = recent.map(i => i.strategy?.explanationDepth).filter(Boolean);
        return [...new Set(strategies)];
    }

    adjustToolPreferences(direction) {
        // Implementation would adjust tool selection preferences
        console.log('🔧 ChessCoachAgent: Adjusting tool preferences:', direction);
    }

    adjustComplexityLevel(direction) {
        // Implementation would adjust explanation complexity
        console.log('🔧 ChessCoachAgent: Adjusting complexity level:', direction);
    }

    adjustVisualFrequency(direction) {
        // Implementation would adjust visual aid usage
        console.log('🔧 ChessCoachAgent: Adjusting visual frequency:', direction);
    }

    adjustTeachingStyle(style) {
        // Implementation would change teaching approach
        console.log('🔧 ChessCoachAgent: Adjusting teaching style:', style);
    }

    adjustEngagementStrategy(direction) {
        // Implementation would modify engagement tactics
        console.log('🔧 ChessCoachAgent: Adjusting engagement strategy:', direction);
    }

    recordReflection(analysis) {
        console.log('📊 ChessCoachAgent: Recording reflection:', analysis);
        // Implementation would store reflection data for long-term learning
    }

    /**
     * Get agent status and statistics - NEW FEATURE
     */
    getAgentStatus() {
        return {
            isInitialized: this.isInitialized,
            sessionStats: this.currentSession,
            conversationLength: this.conversationMemory.length,
            userProfileAvailable: !!this.userProfile,
            goalManagerAvailable: !!this.goalManager,
            teachingStrategies: this.teachingStrategies.size,
            errorPatterns: this.errorPatterns.size
        };
    }

    /**
     * Reset agent for new session - NEW FEATURE
     */
    resetSession() {
        this.currentSession = {
            startTime: Date.now(),
            interactions: 0,
            successfulTeaching: 0,
            userConfusion: 0,
            toolUsageSuccess: 0,
            toolUsageFailures: 0
        };
        
        this.conversationMemory = [];
        console.log('🔄 ChessCoachAgent: Session reset');
    }
}

// Make it available globally
window.ChessCoachAgent = ChessCoachAgent;