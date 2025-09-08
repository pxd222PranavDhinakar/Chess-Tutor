/**
 * UserProfileSystem - Learning from user interactions
 * Tracks user progress, preferences, and learning patterns
 */

class UserProfileSystem {
    constructor() {
        this.profile = {
            // Basic characteristics
            skillLevel: 'beginner', // beginner, intermediate, advanced
            learningStyle: 'mixed', // visual, analytical, kinesthetic, mixed
            preferredPace: 'medium', // slow, medium, fast
            
            // Learning patterns
            strongTopics: [],
            weakTopics: [],
            preferredExplanationDepth: 'medium',
            visualPreference: 0.5, // 0-1 scale
            
            // Interaction history
            totalInteractions: 0,
            successfulLearning: 0,
            confusionInstances: 0,
            topicInterests: new Map(),
            
            // Progress tracking
            openingsLearned: [],
            conceptsMastered: [],
            improvementAreas: [],
            
            // Session data
            sessionsCompleted: 0,
            averageSessionLength: 0,
            lastSessionDate: null,
            
            // Adaptation history
            adaptationsMade: [],
            strategiesUsed: new Map()
        };
        
        this.isInitialized = false;
        console.log('📊 UserProfileSystem: Initialized');
    }

    /**
     * Initialize user profile system - NEW FEATURE
     */
    async initialize() {
        // In a real system, this would load from persistent storage
        await this.loadProfileFromStorage();
        this.isInitialized = true;
        console.log('📊 UserProfileSystem: Ready');
    }

    /**
     * Load profile from storage - COMPLETE FIX
     */
    async loadProfileFromStorage() {
        try {
            const stored = localStorage.getItem('chess_user_profile');
            if (stored) {
                const parsed = JSON.parse(stored);
                
                // Restore the base profile
                this.profile = { ...this.profile, ...parsed };
                
                // CRITICAL FIX: Properly restore Map objects from arrays
                if (parsed.topicInterests && Array.isArray(parsed.topicInterests)) {
                    this.profile.topicInterests = new Map(parsed.topicInterests);
                } else {
                    this.profile.topicInterests = new Map();
                }
                
                if (parsed.strategiesUsed && Array.isArray(parsed.strategiesUsed)) {
                    this.profile.strategiesUsed = new Map(parsed.strategiesUsed);
                } else {
                    this.profile.strategiesUsed = new Map();
                }
                
                console.log('📊 UserProfileSystem: Profile loaded from storage with', 
                        this.profile.topicInterests.size, 'topic interests');
            } else {
                // Initialize empty Maps for new profiles
                this.profile.topicInterests = new Map();
                this.profile.strategiesUsed = new Map();
            }
        } catch (error) {
            console.log('📊 UserProfileSystem: No existing profile found, using defaults');
            // Ensure Maps are properly initialized even on error
            this.profile.topicInterests = new Map();
            this.profile.strategiesUsed = new Map();
        }
    }

   /**
    * Save profile to storage - NEW FEATURE
    */
   async saveProfileToStorage() {
       try {
           // Convert Map objects to arrays for JSON storage
           const profileToSave = {
               ...this.profile,
               topicInterests: Array.from(this.profile.topicInterests.entries()),
               strategiesUsed: Array.from(this.profile.strategiesUsed.entries())
           };
           
           localStorage.setItem('chess_user_profile', JSON.stringify(profileToSave));
           console.log('📊 UserProfileSystem: Profile saved to storage');
       } catch (error) {
           console.error('📊 UserProfileSystem: Error saving profile:', error);
       }
   }

   /**
    * Update profile from interaction analysis - NEW FEATURE
    */
   async updateFromInteraction(messageAnalysis) {
       this.profile.totalInteractions++;
       
       // Update skill level indicators
       await this.updateSkillLevel(messageAnalysis);
       
       // Update learning style preferences
       await this.updateLearningStyle(messageAnalysis);
       
       // Update topic interests
       await this.updateTopicInterests(messageAnalysis.topics);
       
       // Update explanation depth preference
       await this.updateExplanationDepth(messageAnalysis.complexity);
       
       // Save changes
       await this.saveProfileToStorage();
       
       console.log('📊 UserProfileSystem: Profile updated from interaction');
   }

   /**
    * Update skill level assessment - NEW FEATURE
    */
   async updateSkillLevel(analysis) {
       const currentLevel = this.profile.skillLevel;
       let newLevel = currentLevel;
       
       // Indicators for skill level changes
       if (analysis.skillLevel === 'advanced' && currentLevel !== 'advanced') {
           if (analysis.complexity === 'high') {
               newLevel = 'advanced';
           } else if (currentLevel === 'beginner') {
               newLevel = 'intermediate';
           }
       } else if (analysis.skillLevel === 'beginner' && currentLevel === 'advanced') {
           // Don't downgrade too quickly - might be asking simple questions
           // Keep advanced unless we see consistent beginner patterns
       }
       
       if (newLevel !== currentLevel) {
           this.profile.skillLevel = newLevel;
           console.log(`📊 UserProfileSystem: Skill level updated to ${newLevel}`);
       }
   }

   /**
    * Update learning style preferences - NEW FEATURE
    */
   async updateLearningStyle(analysis) {
       const inferredStyle = analysis.learningStyle;
       
       // Gradually adjust towards observed preferences
       const styles = ['visual', 'analytical', 'kinesthetic', 'mixed'];
       const currentIndex = styles.indexOf(this.profile.learningStyle);
       const inferredIndex = styles.indexOf(inferredStyle);
       
       if (inferredIndex !== -1 && Math.abs(currentIndex - inferredIndex) === 1) {
           // Small adjustment towards inferred style
           this.profile.learningStyle = inferredStyle;
           console.log(`📊 UserProfileSystem: Learning style adjusted to ${inferredStyle}`);
       }
       
       // Update visual preference score
       if (inferredStyle === 'visual') {
           this.profile.visualPreference = Math.min(1.0, this.profile.visualPreference + 0.1);
       } else if (inferredStyle === 'analytical') {
           this.profile.visualPreference = Math.max(0.0, this.profile.visualPreference - 0.05);
       }
   }

   /**
    * Update topic interests and strengths - NEW FEATURE
    */
   async updateTopicInterests(topics) {
       for (const topic of topics) {
           const current = this.profile.topicInterests.get(topic) || 0;
           this.profile.topicInterests.set(topic, current + 1);
           
           // If user frequently asks about a topic, consider it an interest
           if (current + 1 >= 3 && !this.profile.strongTopics.includes(topic)) {
               this.profile.strongTopics.push(topic);
               console.log(`📊 UserProfileSystem: Added ${topic} to strong topics`);
           }
       }
   }

   /**
    * Update explanation depth preference - NEW FEATURE
    */
   async updateExplanationDepth(complexity) {
       const currentDepth = this.profile.preferredExplanationDepth;
       
       // Adjust based on user's question complexity
       if (complexity === 'high' && currentDepth === 'simple') {
           this.profile.preferredExplanationDepth = 'medium';
       } else if (complexity === 'high' && currentDepth === 'medium') {
           this.profile.preferredExplanationDepth = 'deep';
       } else if (complexity === 'low' && currentDepth === 'deep') {
           this.profile.preferredExplanationDepth = 'medium';
       }
   }

   /**
    * Record successful learning instance - NEW FEATURE
    */
   async recordSuccessfulLearning(topic, concept) {
       this.profile.successfulLearning++;
       
       if (topic === 'openings' && !this.profile.openingsLearned.includes(concept)) {
           this.profile.openingsLearned.push(concept);
       }
       
       if (!this.profile.conceptsMastered.includes(concept)) {
           this.profile.conceptsMastered.push(concept);
       }
       
       await this.saveProfileToStorage();
       console.log(`📊 UserProfileSystem: Recorded learning success for ${concept}`);
   }

   /**
    * Record confusion or difficulty - NEW FEATURE
    */
   async recordConfusion(topic, reason) {
       this.profile.confusionInstances++;
       
       if (!this.profile.weakTopics.includes(topic)) {
           this.profile.weakTopics.push(topic);
       }
       
       if (!this.profile.improvementAreas.includes(topic)) {
           this.profile.improvementAreas.push(topic);
       }
       
       await this.saveProfileToStorage();
       console.log(`📊 UserProfileSystem: Recorded confusion in ${topic}`);
   }

   /**
    * Record adaptation made by agent - NEW FEATURE
    */
   async recordAdaptation(errorPatterns) {
       const adaptation = {
           timestamp: Date.now(),
           patterns: errorPatterns,
           response: 'agent_self_correction'
       };
       
       this.profile.adaptationsMade.push(adaptation);
       
       // Keep adaptation history manageable
       if (this.profile.adaptationsMade.length > 20) {
           this.profile.adaptationsMade = this.profile.adaptationsMade.slice(-15);
       }
       
       await this.saveProfileToStorage();
       console.log('📊 UserProfileSystem: Recorded agent adaptation');
   }

   /**
    * Get current skill level - NEW FEATURE
    */
   async getSkillLevel() {
       return this.profile.skillLevel;
   }

   /**
    * Get learning style preference - NEW FEATURE
    */
   async getLearningStyle() {
       return this.profile.learningStyle;
   }

   /**
    * Get personalized recommendations - NEW FEATURE
    */
   async getRecommendations() {
       const recommendations = [];
       
       // Recommend based on weak topics
       if (this.profile.weakTopics.length > 0) {
           recommendations.push({
               type: 'improvement',
               topic: this.profile.weakTopics[0],
               reason: 'Focus on areas that need strengthening'
           });
       }
       
       // Recommend based on interests
       const topInterest = Array.from(this.profile.topicInterests.entries())
           .sort((a, b) => b[1] - a[1])[0];
       
       if (topInterest) {
           recommendations.push({
               type: 'exploration',
               topic: topInterest[0],
               reason: 'Build on your current interests'
           });
       }
       
       // Recommend based on skill level
       const skillRecommendations = {
           beginner: ['basic_tactics', 'opening_principles', 'endgame_basics'],
           intermediate: ['tactical_patterns', 'strategic_concepts', 'opening_theory'],
           advanced: ['complex_endgames', 'advanced_strategy', 'preparation_techniques']
       };
       
       const skillRecs = skillRecommendations[this.profile.skillLevel] || [];
       for (const rec of skillRecs) {
           if (!this.profile.conceptsMastered.includes(rec)) {
               recommendations.push({
                   type: 'skill_development',
                   topic: rec,
                   reason: `Appropriate for ${this.profile.skillLevel} level`
               });
           }
       }
       
       return recommendations.slice(0, 3); // Return top 3 recommendations
   }

   /**
    * Get profile summary for agent decision making - NEW FEATURE
    */
   getProfileSummary() {
       return {
           skillLevel: this.profile.skillLevel,
           learningStyle: this.profile.learningStyle,
           preferredPace: this.profile.preferredPace,
           visualPreference: this.profile.visualPreference,
           strongTopics: this.profile.strongTopics.slice(0, 3),
           weakTopics: this.profile.weakTopics.slice(0, 3),
           recentConfusion: this.profile.confusionInstances / Math.max(1, this.profile.totalInteractions),
           successRate: this.profile.successfulLearning / Math.max(1, this.profile.totalInteractions),
           totalInteractions: this.profile.totalInteractions
       };
   }

   /**
    * Start new session tracking - NEW FEATURE
    */
   startSession() {
       this.currentSession = {
           startTime: Date.now(),
           interactions: 0,
           learningInstances: 0,
           confusionInstances: 0
       };
       
       console.log('📊 UserProfileSystem: Started new session tracking');
   }

   /**
    * End session and update statistics - NEW FEATURE
    */
   async endSession() {
       if (!this.currentSession) return;
       
       const sessionLength = Date.now() - this.currentSession.startTime;
       
       // Update session statistics
       this.profile.sessionsCompleted++;
       this.profile.averageSessionLength = 
           (this.profile.averageSessionLength * (this.profile.sessionsCompleted - 1) + sessionLength) / 
           this.profile.sessionsCompleted;
       this.profile.lastSessionDate = new Date().toISOString();
       
       await this.saveProfileToStorage();
       console.log('📊 UserProfileSystem: Session ended and statistics updated');
       
       this.currentSession = null;
   }

   /**
    * Get learning progress report - NEW FEATURE
    */
   getProgressReport() {
       const totalSessions = this.profile.sessionsCompleted;
       const avgSessionMinutes = Math.round(this.profile.averageSessionLength / (1000 * 60));
       const successRate = Math.round((this.profile.successfulLearning / Math.max(1, this.profile.totalInteractions)) * 100);
       
       return {
           summary: {
               skillLevel: this.profile.skillLevel,
               totalSessions: totalSessions,
               averageSessionLength: `${avgSessionMinutes} minutes`,
               successRate: `${successRate}%`,
               conceptsMastered: this.profile.conceptsMastered.length
           },
           strengths: this.profile.strongTopics,
           improvementAreas: this.profile.improvementAreas,
           openingsLearned: this.profile.openingsLearned,
           recentAdaptations: this.profile.adaptationsMade.slice(-3)
       };
   }

   /**
    * Reset profile (for testing or new user) - NEW FEATURE
    */
   async resetProfile() {
       this.profile = {
           skillLevel: 'beginner',
           learningStyle: 'mixed',
           preferredPace: 'medium',
           strongTopics: [],
           weakTopics: [],
           preferredExplanationDepth: 'medium',
           visualPreference: 0.5,
           totalInteractions: 0,
           successfulLearning: 0,
           confusionInstances: 0,
           topicInterests: new Map(),
           openingsLearned: [],
           conceptsMastered: [],
           improvementAreas: [],
           sessionsCompleted: 0,
           averageSessionLength: 0,
           lastSessionDate: null,
           adaptationsMade: [],
           strategiesUsed: new Map()
       };
       
       await this.saveProfileToStorage();
       console.log('📊 UserProfileSystem: Profile reset to defaults');
   }
}

// Make it available globally
window.UserProfileSystem = UserProfileSystem;