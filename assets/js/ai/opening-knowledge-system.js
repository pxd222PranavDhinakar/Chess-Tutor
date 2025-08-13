/**
 * FIXED: Opening Knowledge System - Position lookup corrected
 * The issue was in extractPositionKey() method - it was only taking first 4 components
 * but ECO database stores COMPLETE FEN strings
 */

class OpeningKnowledgeSystem {
    constructor() {
        this.ecoDatabase = null;
        this.openingCache = new Map();
        this.isInitialized = false;
    }

    /**
     * Initialize the opening knowledge system
     */
    async initialize() {
        try {
            console.log('🔧 OpeningKnowledgeSystem: Loading ECO database...');
            
            // Load ECO database from local file
            const response = await fetch('./data/chess-knowledge/eco.json');
            if (!response.ok) {
                throw new Error(`Failed to load ECO database: ${response.status}`);
            }
            
            this.ecoDatabase = await response.json();
            this.isInitialized = true;
            
            console.log('✅ OpeningKnowledgeSystem: Loaded', Object.keys(this.ecoDatabase).length, 'opening positions');
            
            // DEBUG: Log a few sample keys to understand the format
            const sampleKeys = Object.keys(this.ecoDatabase).slice(0, 3);
            console.log('🔍 Sample database keys:', sampleKeys);
            
        } catch (error) {
            console.error('❌ OpeningKnowledgeSystem: Failed to initialize:', error);
            throw error;
        }
    }

    /**
     * Get opening information for a given FEN position
     * FIXED: Now properly handles FEN string matching
     */
    getOpeningInfo(fen) {
        if (!this.isInitialized) {
            console.warn('⚠️ OpeningKnowledgeSystem: Not initialized');
            return null;
        }

        console.log('🔍 OpeningKnowledgeSystem: Looking up FEN:', fen);

        // OPTION 1: Try exact match first (for complete FEN strings)
        if (this.ecoDatabase[fen]) {
            console.log('✅ OpeningKnowledgeSystem: Found exact FEN match');
            const result = this.enrichOpeningData(this.ecoDatabase[fen]);
            this.openingCache.set(fen, result);
            return result;
        }

        // OPTION 2: Try position-only key (first 4 components)
        const positionKey = this.extractPositionKey(fen);
        console.log('🔍 OpeningKnowledgeSystem: Trying position key:', positionKey);
        
        if (this.ecoDatabase[positionKey]) {
            console.log('✅ OpeningKnowledgeSystem: Found position-only match');
            const result = this.enrichOpeningData(this.ecoDatabase[positionKey]);
            this.openingCache.set(fen, result);
            return result;
        }

        // OPTION 3: Try without move counts (useful for transpositions)
        const reducedKey = this.extractReducedKey(fen);
        console.log('🔍 OpeningKnowledgeSystem: Trying reduced key:', reducedKey);
        
        if (this.ecoDatabase[reducedKey]) {
            console.log('✅ OpeningKnowledgeSystem: Found reduced key match');
            const result = this.enrichOpeningData(this.ecoDatabase[reducedKey]);
            this.openingCache.set(fen, result);
            return result;
        }

        // OPTION 4: Search for partial matches in database keys
        const partialMatch = this.findPartialMatch(fen);
        if (partialMatch) {
            console.log('✅ OpeningKnowledgeSystem: Found partial match');
            const result = this.enrichOpeningData(this.ecoDatabase[partialMatch]);
            this.openingCache.set(fen, result);
            return result;
        }

        console.log('❌ OpeningKnowledgeSystem: No match found for FEN');
        return null;
    }

    /**
     * Extract position key from FEN for database lookup
     * This keeps board position, turn, castling, en passant but removes move counters
     */
    extractPositionKey(fen) {
        const parts = fen.split(' ');
        // Keep first 4 parts: board, color, castling, en passant
        return parts.slice(0, 4).join(' ');
    }

    /**
     * Extract further reduced key (board + turn only)
     */
    extractReducedKey(fen) {
        const parts = fen.split(' ');
        // Keep only board and turn
        return parts.slice(0, 2).join(' ');
    }

    /**
     * Find partial match by checking if any database key starts with our position
     */
    findPartialMatch(fen) {
        const positionKey = this.extractPositionKey(fen);
        const reducedKey = this.extractReducedKey(fen);
        
        // Look for database entries that match our position
        for (const dbKey of Object.keys(this.ecoDatabase)) {
            // Check if database key starts with our position key
            if (dbKey.startsWith(positionKey) || dbKey.startsWith(reducedKey)) {
                console.log('🔍 Found partial match:', dbKey, 'for', positionKey);
                return dbKey;
            }
        }
        
        return null;
    }

    /**
     * Enhanced debugging method to understand database structure
     */
    debugDatabaseStructure() {
        if (!this.ecoDatabase) {
            console.log('❌ Database not loaded');
            return;
        }

        console.log('🔍 === DATABASE STRUCTURE ANALYSIS ===');
        console.log('Total entries:', Object.keys(this.ecoDatabase).length);
        
        // Analyze key formats
        const keys = Object.keys(this.ecoDatabase);
        const sampleKeys = keys.slice(0, 10);
        
        console.log('Sample keys:');
        sampleKeys.forEach((key, i) => {
            const parts = key.split(' ');
            console.log(`${i+1}. "${key}" (${parts.length} parts)`);
        });

        // Check for specific position
        const testFen = "rnbqkbnr/pp1p1ppp/2p5/8/2B1Pp2/8/PPPP2PP/RNBQK1NR w KQkq - 0 4";
        console.log('\nSearching for test FEN:', testFen);
        console.log('Exact match exists:', !!this.ecoDatabase[testFen]);
        
        const posKey = this.extractPositionKey(testFen);
        console.log('Position key:', posKey);
        console.log('Position key match exists:', !!this.ecoDatabase[posKey]);
        
        // Find any keys that start with the board position
        const boardPart = testFen.split(' ')[0];
        const boardMatches = keys.filter(key => key.startsWith(boardPart));
        console.log(`Found ${boardMatches.length} keys starting with board position:`, boardMatches.slice(0, 5));
        
        console.log('🔍 === END ANALYSIS ===');
    }

    // ... rest of the existing methods remain the same ...

    /**
     * Enrich opening data with additional information
     */
    enrichOpeningData(rawData) {
        return {
            eco: rawData.eco,
            name: rawData.name,
            moves: rawData.moves,
            variation: rawData.variation || null,
            
            // Add derived information
            category: this.getOpeningCategory(rawData.eco),
            moveCount: this.countMoves(rawData.moves),
            isMainLine: this.isMainLine(rawData),
            
            // Add instructional content
            principles: this.getOpeningPrinciples(rawData.eco),
            commonContinuations: this.getCommonContinuations(rawData.eco),
            strategicThemes: this.getStrategicThemes(rawData.eco)
        };
    }

    /**
     * Get opening category from ECO code
     */
    getOpeningCategory(ecoCode) {
        if (!ecoCode) return 'Unknown';
        
        const firstLetter = ecoCode.charAt(0);
        switch (firstLetter) {
            case 'A': return 'Flank Openings';
            case 'B': return 'Semi-Open Games';
            case 'C': return 'Open Games';
            case 'D': return 'Closed Games';
            case 'E': return 'Indian Defenses';
            default: return 'Other';
        }
    }

    /**
     * Count moves in move string
     */
    countMoves(moveString) {
        if (!moveString) return 0;
        
        // Count move numbers (1. 2. 3. etc.)
        const moveNumbers = moveString.match(/\d+\./g);
        return moveNumbers ? moveNumbers.length : 0;
    }

    /**
     * Determine if this is a main line
     */
    isMainLine(openingData) {
        // Heuristic: main lines usually don't have variation names
        return !openingData.variation;
    }

    /**
     * Get opening principles for ECO category
     */
    getOpeningPrinciples(ecoCode) {
        if (!ecoCode) return [];
        
        const category = ecoCode.charAt(0);
        const commonPrinciples = [
            "Control the center with pawns and pieces",
            "Develop knights before bishops",
            "Castle early for king safety",
            "Don't move the same piece twice in the opening"
        ];

        const specificPrinciples = {
            'A': ["Focus on flank development", "Consider hypermodern piece placement"],
            'B': ["Challenge white's center immediately", "Aim for counterplay"],
            'C': ["Fight for central control", "Rapid development is key"],
            'D': ["Build solid pawn structure", "Prepare for strategic maneuvering"],
            'E': ["Develop pieces actively", "Control key central squares"]
        };

        return [...commonPrinciples, ...(specificPrinciples[category] || [])];
    }

    /**
     * Get common continuations for opening
     */
    getCommonContinuations(ecoCode) {
        // This would be populated with actual data in a full implementation
        return [
            "Continue development",
            "Consider central pawn breaks",
            "Look for tactical opportunities"
        ];
    }

    /**
     * Get strategic themes for opening
     */
    getStrategicThemes(ecoCode) {
        const themeMap = {
            'A': ["Hypermodern control", "Piece pressure on center"],
            'B': ["Asymmetrical pawn structure", "Dynamic piece play"],
            'C': ["Classical center control", "Rapid development"],
            'D': ["Solid pawn chains", "Strategic complexity"],
            'E': ["Flexible piece development", "Control of key squares"]
        };

        const category = ecoCode ? ecoCode.charAt(0) : null;
        return themeMap[category] || ["General strategic play"];
    }

    /**
     * Search openings by name - FIXED VERSION
     */
    searchByName(searchTerm) {
        if (!this.isInitialized) return [];
        
        const results = [];
        const lowerSearch = searchTerm.toLowerCase();
        
        for (const [position, data] of Object.entries(this.ecoDatabase)) {
            if (data.name && data.name.toLowerCase().includes(lowerSearch)) {
                const enrichedData = this.enrichOpeningData(data);
                // 🔥 CRITICAL FIX: Include the FEN (which is the database key)
                enrichedData.fen = position;
                results.push(enrichedData);
            }
        }
        
        return results.slice(0, 10); // Limit results
    }

    /**
     * Format opening information for LLM consumption
     */
    formatForLLM(openingInfo) {
        if (!openingInfo) return "Opening: Unknown position";
        
        let formatted = `Opening: ${openingInfo.name}`;
        if (openingInfo.eco) formatted += ` (${openingInfo.eco})`;
        if (openingInfo.variation) formatted += ` - ${openingInfo.variation}`;
        
        formatted += `\nMoves: ${openingInfo.moves}`;
        formatted += `\nCategory: ${openingInfo.category}`;
        
        if (openingInfo.principles && openingInfo.principles.length > 0) {
            formatted += `\nKey Principles:\n`;
            openingInfo.principles.slice(0, 3).forEach(principle => {
                formatted += `- ${principle}\n`;
            });
        }
        
        if (openingInfo.strategicThemes && openingInfo.strategicThemes.length > 0) {
            formatted += `Strategic Themes: ${openingInfo.strategicThemes.join(', ')}`;
        }
        
        return formatted;
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = OpeningKnowledgeSystem;
} else if (typeof window !== 'undefined') {
    window.OpeningKnowledgeSystem = OpeningKnowledgeSystem;
}

// Create and initialize the global instance
window.openingKnowledgeSystem = new OpeningKnowledgeSystem();
window.openingKnowledgeSystem.initialize().catch(error => {
    console.error('❌ Failed to initialize global opening knowledge system:', error);
});