/* ===== CONFIGURATION ===== */

const CONFIG = {
    // API Configuration
    API_BASE_URL: 'http://localhost:5001/api',
    
    // Default values
    DEFAULT_YEAR: 2024,
    DEFAULT_START_WEEK: 1,
    DEFAULT_END_WEEK: 14,
    
    // Timing
    SLIDE_TRANSITION_DURATION: 600, // ms
    AUTO_ADVANCE_DELAY: 5000, // ms (for future auto-play feature)
    
    // Feature flags
    ENABLE_AUTO_PLAY: false,
    ENABLE_SOUND_EFFECTS: false,
    ENABLE_CONFETTI: false,
    
    // Player headshot configuration
    HEADSHOT_CACHE_ENABLED: true,
    HEADSHOT_FALLBACK_ENABLED: true,
    
    // ESPN API URLs (for player images)
    ESPN_SEARCH_API: 'https://site.web.api.espn.com/apis/search/v2',
    ESPN_HEADSHOT_BASE: 'https://a.espncdn.com/i/headshots/nfl/players/full/',
    
    // UI Avatars fallback
    UI_AVATARS_BASE: 'https://ui-avatars.com/api/',
};

// Slide class mappings (for backgrounds)
const SLIDE_CLASSES = {
    WELCOME: 'slide-welcome',
    POINTS: 'slide-points',
    POINTS_REVEAL: 'slide-points-reveal',
    RECORD: 'slide-record',
    RECORD_REVEAL: 'slide-record-reveal',
    OPTIMAL: 'slide-optimal',
    OPTIMAL_REVEAL: 'slide-optimal-reveal',
    BENCH: 'slide-bench',
    BENCH_REVEAL: 'slide-bench-reveal',
    SLEPT_ON: 'slide-slept-on',
    SLEPT_ON_REVEAL: 'slide-slept-on-reveal',
    OVERRATED: 'slide-overrated',
    OVERRATED_REVEAL: 'slide-overrated-reveal',
    PERFECT: 'slide-perfect',
    PERFECT_REVEAL: 'slide-perfect-reveal',
    LUCKY: 'slide-lucky',
    LUCKY_REVEAL: 'slide-lucky-reveal',
    TOUGH: 'slide-tough',
    TOUGH_REVEAL: 'slide-tough-reveal',
    BREAKOUT: 'slide-breakout',
    BREAKOUT_REVEAL: 'slide-breakout-reveal',
    WASTED: 'slide-wasted',
    WASTED_REVEAL: 'slide-wasted-reveal',
    RANKING: 'slide-ranking',
    SUPERLATIVES: 'slide-superlatives',
    SUMMARY: 'slide-summary',
};

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { CONFIG, SLIDE_CLASSES };
}