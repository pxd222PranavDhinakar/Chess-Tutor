/**
 * GoalManagementSystem - Persistent goal tracking and management
 * Maintains learning objectives across conversations and sessions
 */

class GoalManagementSystem {
    constructor() {
        this.goals = [];
        this.completedGoals = [];
        this.goalHistory = [];
        this.currentFocus = null;
        this.isInitialized = false;
        
        // Goal types and their characteristics
        this.goalTypes = {
            opening_mastery: {
                description: 'Master specific chess openings',
                estimatedSessions: 3,
                measurementCriteria: ['can_explain_principles', 'can_play_moves', 'understands_strategy'],
                subgoals: ['learn_moves', 'understand_principles', 'practice_variations']
            },
            tactical_improvement: {
                description: 'Improve tactical pattern recognition',
                estimatedSessions: 5,
                measurementCriteria: ['recognizes_patterns', 'calculates_correctly', 'finds_tactics'],
                subgoals: ['basic_patterns', 'combination_tactics', 'defensive_tactics']
            },
            position_analysis: {
                description: 'Develop position evaluation skills',
                estimatedSessions: 4,
                measurementCriteria: ['evaluates_structure', 'identifies_weaknesses', 'plans_strategy'],
                subgoals: ['pawn_structure', 'piece_activity', 'king_safety']
            },
            general_improvement: {
                description: 'Overall chess skill development',
                estimatedSessions: 8,
                measurementCriteria: ['plays_stronger', 'makes_fewer_mistakes', 'understands_concepts'],
                subgoals: ['opening_basics', 'tactical_awareness', 'endgame_knowledge']
            },
            endgame_study: {
                description: 'Master endgame techniques',
                estimatedSessions: 6,
                measurementCriteria: ['knows_basic_mates', 'calculates_endgames', 'understands_principles'],
                subgoals: ['basic_checkmates', 'king_pawn_endgames', 'piece_endgames']
            }
        };
        
        console.log('🎯 GoalManagementSystem: Initialized');
    }

    /**
     * Initialize goal management system - NEW FEATURE
     */
    async initialize() {
        await this.loadGoalsFromStorage();
        this.isInitialized = true;
        console.log('🎯 GoalManagementSystem: Ready with', this.goals.length, 'active goals');
    }

    /**
     * Load goals from persistent storage - NEW FEATURE
     */
    async loadGoalsFromStorage() {
        try {
            const stored = localStorage.getItem('chess_learning_goals');
            if (stored) {
                const parsed = JSON.parse(stored);
                this.goals = parsed.goals || [];
                this.completedGoals = parsed.completedGoals || [];
                this.goalHistory = parsed.goalHistory || [];
                this.currentFocus = parsed.currentFocus || null;
                console.log('🎯 GoalManagementSystem: Loaded', this.goals.length, 'goals from storage');
            }
        } catch (error) {
            console.log('🎯 GoalManagementSystem: No existing goals found, starting fresh');
        }
    }

    /**
     * Save goals to persistent storage - NEW FEATURE
     */
    async saveGoalsToStorage() {
        try {
            const dataToSave = {
                goals: this.goals,
                completedGoals: this.completedGoals,
                goalHistory: this.goalHistory,
                currentFocus: this.currentFocus,
                lastUpdated: new Date().toISOString()
            };
            
            localStorage.setItem('chess_learning_goals', JSON.stringify(dataToSave));
            console.log('🎯 GoalManagementSystem: Goals saved to storage');
        } catch (error) {
            console.error('🎯 GoalManagementSystem: Error saving goals:', error);
        }
    }

    /**
     * Update goals based on new user input and context - NEW FEATURE
     */
    async updateGoals(extractedGoals, gameContext) {
        const updatedGoals = [...this.goals];
        
        // Process newly extracted goals
        for (const newGoal of extractedGoals) {
            const existingGoal = this.findSimilarGoal(newGoal, updatedGoals);
            
            if (existingGoal) {
                // Update existing goal
                this.updateExistingGoal(existingGoal, newGoal, gameContext);
            } else {
                // Create new goal
                const createdGoal = await this.createGoal(newGoal, gameContext);
                updatedGoals.push(createdGoal);
            }
        }
        
        // Update goal progress based on context
        await this.updateGoalProgress(updatedGoals, gameContext);
        
        this.goals = updatedGoals;
        await this.saveGoalsToStorage();
        
        return this.goals;
    }

    /**
     * Find similar existing goal - NEW FEATURE
     */
    findSimilarGoal(newGoal, existingGoals) {
        return existingGoals.find(goal => 
            goal.type === newGoal.type && 
            (goal.specificity === newGoal.specificity || 
             (!goal.specificity && !newGoal.specificity))
        );
    }

    /**
     * Update existing goal with new information - NEW FEATURE
     */
    updateExistingGoal(existingGoal, newGoal, gameContext) {
        // Increase priority if user mentions it again
        if (newGoal.priority === 'high') {
            existingGoal.priority = 'high';
        }
        
        // Update specificity if new goal is more specific
        if (newGoal.specificity && newGoal.specificity !== 'general') {
            existingGoal.specificity = newGoal.specificity;
            existingGoal.description = newGoal.description;
        }
        
        // Update last mentioned timestamp
        existingGoal.lastMentioned = Date.now();
        existingGoal.mentionCount = (existingGoal.mentionCount || 1) + 1;
        
        console.log('🎯 GoalManagementSystem: Updated existing goal:', existingGoal.description);
    }

    /**
     * Create new goal with full metadata - NEW FEATURE
     */
    async createGoal(goalData, gameContext) {
        const goalTemplate = this.goalTypes[goalData.type] || this.goalTypes.general_improvement;
        
        const newGoal = {
            id: this.generateGoalId(),
            type: goalData.type,
            description: goalData.description,
            priority: goalData.priority || 'medium',
            specificity: goalData.specificity || 'general',
            
            // Metadata
            createdAt: Date.now(),
            lastMentioned: Date.now(),
            mentionCount: 1,
            
            // Progress tracking
            progress: 0, // 0-100
            subgoals: goalTemplate.subgoals.map(sg => ({
                description: sg,
                completed: false,
                progressNotes: []
            })),
            
            // Context
            gameContextWhenCreated: gameContext ? {
                fen: gameContext.currentPosition?.fen,
                moveNumber: gameContext.currentPosition?.moveNumber
            } : null,
            
            // Estimates
            estimatedSessions: goalTemplate.estimatedSessions,
            sessionsWorked: 0,
            
            // Measurement
            measurementCriteria: goalTemplate.measurementCriteria,
            criteriaProgress: goalTemplate.measurementCriteria.map(criteria => ({
                criteria: criteria,
                achieved: false,
                evidence: []
            }))
        };
        
        console.log('🎯 GoalManagementSystem: Created new goal:', newGoal.description);
        return newGoal;
    }

    /**
     * Update progress on existing goals - NEW FEATURE
     */
    async updateGoalProgress(goals, gameContext) {
        for (const goal of goals) {
            // Update session count if user is actively working on this goal
            if (this.isActivelyWorkingOn(goal, gameContext)) {
                goal.sessionsWorked++;
            }
            
            // Check for progress indicators in context
            await this.assessGoalProgress(goal, gameContext);
            
            // Update overall progress percentage
            this.calculateGoalProgress(goal);
        }
    }

    /**
     * Determine if user is actively working on a goal - NEW FEATURE
     */
    isActivelyWorkingOn(goal, gameContext) {
        // Check if current context relates to the goal
        if (goal.type === 'opening_mastery' && gameContext?.openingKnowledge?.available) {
            return true;
        }
        
        if (goal.type === 'position_analysis' && gameContext?.analysis) {
            return true;
        }
        
        if (goal.type === 'tactical_improvement' && gameContext?.currentPosition) {
            // Simple heuristic: if pieces are being moved, tactical work might be happening
            return gameContext.currentPosition.moveNumber > 1;
        }
        
        return false;
    }

    /**
     * Assess progress on specific goal based on context - NEW FEATURE
     */
    async assessGoalProgress(goal, gameContext) {
        // Opening mastery progress
        if (goal.type === 'opening_mastery' && gameContext?.openingKnowledge?.available) {
            const opening = gameContext.openingKnowledge.opening;
            
            if (goal.specificity === opening.name || goal.specificity === 'general') {
                // Mark subgoals as potentially progressing
                const learningSubgoal = goal.subgoals.find(sg => sg.description === 'learn_moves');
                if (learningSubgoal && !learningSubgoal.completed) {
                    learningSubgoal.progressNotes.push({
                        timestamp: Date.now(),
                        note: `Studied ${opening.name} moves`,
                        evidence: opening.moves
                    });
                }
            }
        }
        
        // Position analysis progress
        if (goal.type === 'position_analysis' && gameContext?.analysis) {
            const analysisSubgoal = goal.subgoals.find(sg => sg.description.includes('analysis'));
            if (analysisSubgoal && !analysisSubgoal.completed) {
                analysisSubgoal.progressNotes.push({
                    timestamp: Date.now(),
                    note: 'Performed position analysis',
                    evidence: 'Used analysis tools'
                });
            }
        }
    }

    /**
     * Calculate overall goal progress percentage - NEW FEATURE
     */
    calculateGoalProgress(goal) {
        const completedSubgoals = goal.subgoals.filter(sg => sg.completed).length;
        const totalSubgoals = goal.subgoals.length;
        
        const achievedCriteria = goal.criteriaProgress.filter(cp => cp.achieved).length;
        const totalCriteria = goal.criteriaProgress.length;
        
        // Weighted progress calculation
        const subgoalProgress = (completedSubgoals / totalSubgoals) * 60; // 60% weight
        const criteriaProgress = (achievedCriteria / totalCriteria) * 40; // 40% weight
        
        goal.progress = Math.round(subgoalProgress + criteriaProgress);
        
        // Mark goal as completed if progress is high enough
        if (goal.progress >= 90 && !goal.completed) {
            this.completeGoal(goal);
        }
    }

    /**
     * Mark goal as completed - NEW FEATURE
     */
    completeGoal(goal) {
        goal.completed = true;
        goal.completedAt = Date.now();
        
        // Move to completed goals
        this.completedGoals.push(goal);
        this.goals = this.goals.filter(g => g.id !== goal.id);
        
        // Add to history
        this.goalHistory.push({
            action: 'completed',
            goal: goal,
            timestamp: Date.now()
        });
        
        console.log('🎯 GoalManagementSystem: Goal completed:', goal.description);
    }

    /**
     * Prioritize goals based on user profile and context - NEW FEATURE
     */
    async prioritizeGoals(userProfile) {
        if (!userProfile) return this.goals;
        
        const profileSummary = userProfile.getProfileSummary();
        
        // Create prioritized copy of goals
        const prioritized = [...this.goals].map(goal => ({
            ...goal,
            priorityScore: this.calculatePriorityScore(goal, profileSummary)
        }));
        
        // Sort by priority score (highest first)
        prioritized.sort((a, b) => b.priorityScore - a.priorityScore);
        
        // Update current focus if needed
        if (prioritized.length > 0 && prioritized[0].priorityScore > 0.7) {
            this.currentFocus = prioritized[0];
        }
        
        return prioritized;
    }

    /**
     * Calculate priority score for goal based on user profile - NEW FEATURE
     */
    calculatePriorityScore(goal, profileSummary) {
        let score = 0;
        
        // Base priority
        const priorityScores = { high: 1.0, medium: 0.6, low: 0.3 };
        score += priorityScores[goal.priority] || 0.6;
        
        // Recent mention boost
        const daysSinceLastMention = (Date.now() - goal.lastMentioned) / (1000 * 60 * 60 * 24);
        if (daysSinceLastMention < 1) score += 0.3;
        else if (daysSinceLastMention < 3) score += 0.1;
        
        // User profile alignment
        if (profileSummary.strongTopics.some(topic => goal.type.includes(topic.replace('_', '')))) {
            score += 0.2; // User shows strength in this area
        }
        
        if (profileSummary.weakTopics.some(topic => goal.type.includes(topic.replace('_', '')))) {
            score += 0.4; // User needs improvement in this area
        }
        
        // Skill level appropriateness
        const skillBasedBoost = {
            beginner: { opening_mastery: 0.3, general_improvement: 0.4 },
            intermediate: { tactical_improvement: 0.3, position_analysis: 0.3 },
            advanced: { endgame_study: 0.3, position_analysis: 0.2 }
        };
        
        const skillBoost = skillBasedBoost[profileSummary.skillLevel]?.[goal.type] || 0;
        score += skillBoost;
        
        // Progress-based adjustments
        if (goal.progress > 50 && goal.progress < 90) {
            score += 0.2; // Boost nearly complete goals
        } else if (goal.progress < 10 && goal.sessionsWorked > 2) {
            score -= 0.1; // Slightly lower priority for stalled goals
        }
        
        return Math.min(1.0, score);
    }

    /**
     * Assess overall progress across all goals - NEW FEATURE
     */
    async assessProgress() {
        const totalGoals = this.goals.length + this.completedGoals.length;
        const completedCount = this.completedGoals.length;
        const avgProgress = this.goals.reduce((sum, goal) => sum + goal.progress, 0) / Math.max(1, this.goals.length);
        
        return {
            totalGoals: totalGoals,
            completedGoals: completedCount,
            activeGoals: this.goals.length,
            completionRate: totalGoals > 0 ? (completedCount / totalGoals) * 100 : 0,
            averageProgress: Math.round(avgProgress),
            currentFocus: this.currentFocus?.description || 'No current focus',
            recommendedAction: this.getRecommendedAction()
        };
    }

    /**
     * Get recommended action based on goal status - NEW FEATURE
     */
    getRecommendedAction() {
        if (this.goals.length === 0) {
            return 'Set learning goals to track progress';
        }
        
        if (this.currentFocus) {
            return `Continue working on: ${this.currentFocus.description}`;
        }
        
        const highPriorityGoals = this.goals.filter(g => g.priority === 'high');
        if (highPriorityGoals.length > 0) {
            return `Focus on high priority goal: ${highPriorityGoals[0].description}`;
        }
        
        const nearCompletionGoals = this.goals.filter(g => g.progress > 70);
        if (nearCompletionGoals.length > 0) {
            return `Complete nearly finished goal: ${nearCompletionGoals[0].description}`;
        }
        
        return 'Continue with current learning plan';
    }

    /**
     * Generate unique goal ID - NEW FEATURE
     */
    generateGoalId() {
        return 'goal_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }

    /**
     * Get goals summary for agent decision making - NEW FEATURE
     */
    getGoalsSummary() {
        return {
            activeGoalCount: this.goals.length,
            completedGoalCount: this.completedGoals.length,
            currentFocus: this.currentFocus,
            topPriorityGoals: this.goals
                .filter(g => g.priority === 'high')
                .slice(0, 3)
                .map(g => ({ id: g.id, description: g.description, progress: g.progress })),
            nearCompletionGoals: this.goals
                .filter(g => g.progress > 70)
                .map(g => ({ id: g.id, description: g.description, progress: g.progress }))
        };
    }

    /**
     * Record goal-related teaching success - NEW FEATURE
     */
    async recordGoalTeachingSuccess(goalId, criteria, evidence) {
        const goal = this.goals.find(g => g.id === goalId);
        if (!goal) return;
        
        // Update criteria progress
        const criteriaItem = goal.criteriaProgress.find(cp => cp.criteria === criteria);
        if (criteriaItem && !criteriaItem.achieved) {
            criteriaItem.achieved = true;
            criteriaItem.evidence.push({
                timestamp: Date.now(),
                evidence: evidence
            });
            
console.log(`🎯 GoalManagementSystem: Goal criteria achieved:`, criteria);
       }
       
       // Recalculate progress
       this.calculateGoalProgress(goal);
       
       await this.saveGoalsToStorage();
   }

   /**
    * Get goals needing attention - NEW FEATURE
    */
   getGoalsNeedingAttention() {
       const needingAttention = [];
       
       // Goals with no recent progress
       const stalledGoals = this.goals.filter(goal => {
           const daysSinceLastMention = (Date.now() - goal.lastMentioned) / (1000 * 60 * 60 * 24);
           return daysSinceLastMention > 7 && goal.progress < 30;
       });
       
       stalledGoals.forEach(goal => {
           needingAttention.push({
               goal: goal,
               reason: 'stalled_progress',
               priority: 'medium',
               recommendation: 'Break down into smaller steps'
           });
       });
       
       // High priority goals with low progress
       const urgentGoals = this.goals.filter(goal => 
           goal.priority === 'high' && goal.progress < 20
       );
       
       urgentGoals.forEach(goal => {
           needingAttention.push({
               goal: goal,
               reason: 'high_priority_low_progress',
               priority: 'high',
               recommendation: 'Focus immediate attention here'
           });
       });
       
       return needingAttention;
   }

   /**
    * Suggest next learning steps based on goals - NEW FEATURE
    */
   suggestNextSteps() {
       const suggestions = [];
       
       // Focus on current focus if available
       if (this.currentFocus && this.currentFocus.progress < 90) {
           const nextSubgoal = this.currentFocus.subgoals.find(sg => !sg.completed);
           if (nextSubgoal) {
               suggestions.push({
                   type: 'continue_focus',
                   goal: this.currentFocus,
                   action: `Work on: ${nextSubgoal.description}`,
                   priority: 'high'
               });
           }
       }
       
       // Suggest completing near-finished goals
       const nearComplete = this.goals.filter(g => g.progress > 70 && g.progress < 90);
       nearComplete.forEach(goal => {
           suggestions.push({
               type: 'complete_goal',
               goal: goal,
               action: `Complete remaining work on: ${goal.description}`,
               priority: 'medium'
           });
       });
       
       // Suggest starting new goals if user has few active goals
       if (this.goals.length < 2) {
           suggestions.push({
               type: 'start_new_goal',
               action: 'Consider setting a new learning goal',
               priority: 'low'
           });
       }
       
       return suggestions.slice(0, 3); // Return top 3 suggestions
   }

   /**
    * Reset all goals (for testing or new user) - NEW FEATURE
    */
   async resetAllGoals() {
       this.goals = [];
       this.completedGoals = [];
       this.goalHistory = [];
       this.currentFocus = null;
       
       await this.saveGoalsToStorage();
       console.log('🎯 GoalManagementSystem: All goals reset');
   }

   /**
    * Export goals for backup or analysis - NEW FEATURE
    */
   exportGoals() {
       return {
           exportDate: new Date().toISOString(),
           goals: this.goals,
           completedGoals: this.completedGoals,
           goalHistory: this.goalHistory,
           currentFocus: this.currentFocus,
           statistics: {
               totalGoalsCreated: this.goals.length + this.completedGoals.length,
               completionRate: this.completedGoals.length / Math.max(1, this.goals.length + this.completedGoals.length),
               averageProgress: this.goals.reduce((sum, g) => sum + g.progress, 0) / Math.max(1, this.goals.length)
           }
       };
   }

   /**
    * Import goals from backup - NEW FEATURE
    */
   async importGoals(goalData) {
       try {
           this.goals = goalData.goals || [];
           this.completedGoals = goalData.completedGoals || [];
           this.goalHistory = goalData.goalHistory || [];
           this.currentFocus = goalData.currentFocus || null;
           
           await this.saveGoalsToStorage();
           console.log('🎯 GoalManagementSystem: Goals imported successfully');
           return true;
       } catch (error) {
           console.error('🎯 GoalManagementSystem: Error importing goals:', error);
           return false;
       }
   }
}

// Make it available globally
window.GoalManagementSystem = GoalManagementSystem;