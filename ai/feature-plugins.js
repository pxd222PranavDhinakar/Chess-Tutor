/**
 * Feature Plugins System - DISABLED TO PREVENT LLM BYPASS
 * This system was bypassing the LLM entirely, creating hardcoded responses.
 * Now disabled in favor of LLM-driven tool usage.
 */

class FeaturePlugins {
    constructor() {
        this.plugins = [];
        this.debugMode = true;
        this.disabled = true; // DISABLED to prevent LLM bypass
        console.log('⚠️ FeaturePlugins: System disabled to prevent LLM bypass');
    }
    
    /**
     * Register a new plugin - DISABLED
     */
    register(plugin) {
        if (this.disabled) {
            console.log(`🚫 FeaturePlugins: Plugin registration disabled (${plugin.name})`);
            return;
        }
        this.plugins.push(plugin);
    }
    
    /**
     * Handle message with plugins - DISABLED TO PREVENT LLM BYPASS
     */
    async handleMessage(message, context) {
        if (this.disabled) {
            console.log('🚫 FeaturePlugins: System disabled, returning null to allow LLM processing');
            return null; // Always return null to let LLM handle the message
        }
        
        // Legacy code kept for reference but not executed
        return null;
    }
    
    /**
     * Get list of available plugins - DISABLED
     */
    getAvailablePlugins() {
        return [];
    }
}

// Create placeholder plugins for compatibility but don't register them
const openingLookupPlugin = {
    name: 'opening-lookup-disabled',
    description: 'Disabled - now handled by LLM-driven tools'
};

const positionLoadingPlugin = {
    name: 'position-loading-disabled', 
    description: 'Disabled - now handled by LLM-driven tools'
};

const strategicAnnotationPlugin = {
    name: 'strategic-annotation-disabled',
    description: 'Disabled - now handled by LLM-driven tools'
};

// Make available globally for compatibility
if (typeof window !== 'undefined') {
    window.FeaturePlugins = FeaturePlugins;
    window.openingLookupPlugin = openingLookupPlugin;
    window.positionLoadingPlugin = positionLoadingPlugin;
    window.strategicAnnotationPlugin = strategicAnnotationPlugin;
    
    console.log('✅ Feature Plugins System loaded in DISABLED mode (prevents LLM bypass)');
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        FeaturePlugins,
        openingLookupPlugin,
        positionLoadingPlugin,
        strategicAnnotationPlugin
    };
}