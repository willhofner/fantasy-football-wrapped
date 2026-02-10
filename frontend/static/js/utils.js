/* ===== UTILITY FUNCTIONS ===== */

/**
 * Escape HTML entities to prevent XSS
 */
function escapeHtml(str) {
    if (!str) return '';
    return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

/**
 * Add ordinal suffix to a number (1st, 2nd, 3rd, etc.)
 */
function ordinalSuffix(n) {
    const s = ["th", "st", "nd", "rd"];
    const v = n % 100;
    return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

/**
 * Format a number with commas (1234 -> 1,234)
 */
function formatNumber(num) {
    return Math.round(num).toLocaleString();
}

/**
 * Get opponent name from ID using team names map
 */
function getOpponentName(opponentId, teamNamesMap) {
    return teamNamesMap?.[opponentId] || `Team ${opponentId}`;
}

/**
 * Generate placeholder image URL
 */
function getPlaceholderImage(name, size = 150) {
    return `${CONFIG.UI_AVATARS_BASE}?name=${encodeURIComponent(name)}&size=${size}&background=random&color=fff`;
}

/**
 * Fetch player headshot from ESPN API
 */
async function getPlayerHeadshot(playerName) {
    try {
        const searchUrl = `${CONFIG.ESPN_SEARCH_API}?query=${encodeURIComponent(playerName)}&limit=5&type=player&sport=football&league=nfl`;
        const response = await fetch(searchUrl);
        
        if (!response.ok) return null;
        
        const data = await response.json();
        if (data.results?.length > 0) {
            const playerResults = data.results.find(r => r.type === 'player');
            if (playerResults?.contents?.length > 0) {
                const player = playerResults.contents[0];
                
                // Try to get player ID from link
                let playerId = null;
                if (player.link?.web) {
                    const match = player.link.web.match(/\/id\/(\d+)\//);
                    if (match) playerId = match[1];
                }
                
                // Return image URL if available
                if (player.image?.default) {
                    return player.image.default;
                }
                
                // Build URL from player ID
                if (playerId) {
                    return `${CONFIG.ESPN_HEADSHOT_BASE}${playerId}.png`;
                }
            }
        }
        return null;
    } catch (error) {
        console.error('Error fetching headshot:', error);
        return null;
    }
}

/**
 * Set image with fallback to placeholder
 */
function setImageWithFallback(img, url, name) {
    if (url) {
        img.src = url;
        img.onerror = () => { 
            img.src = getPlaceholderImage(name); 
        };
    } else {
        img.src = getPlaceholderImage(name);
    }
}

/**
 * Create an image element with headshot
 */
async function createPlayerImage(playerName, className = 'player-headshot') {
    const img = document.createElement('img');
    img.className = className;
    img.alt = playerName;
    
    const headshotUrl = await getPlayerHeadshot(playerName);
    setImageWithFallback(img, headshotUrl, playerName);
    
    return img;
}

/**
 * Debounce function to limit rapid calls
 */
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

/**
 * Sleep/delay function
 */
function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Safely parse JSON with error handling
 */
function safeJSONParse(str, fallback = null) {
    try {
        return JSON.parse(str);
    } catch (e) {
        console.error('JSON parse error:', e);
        return fallback;
    }
}

/**
 * Check if value exists and is not empty
 */
function isEmpty(value) {
    return value === null || 
           value === undefined || 
           value === '' || 
           (Array.isArray(value) && value.length === 0) ||
           (typeof value === 'object' && Object.keys(value).length === 0);
}

/**
 * Get a random item from an array
 */
function randomChoice(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
}

/**
 * Clamp a number between min and max
 */
function clamp(num, min, max) {
    return Math.min(Math.max(num, min), max);
}

/**
 * Linear interpolation between two values
 */
function lerp(start, end, t) {
    return start + (end - start) * t;
}

/**
 * Calculate percentage
 */
function percentage(value, total) {
    if (total === 0) return 0;
    return Math.round((value / total) * 100);
}

/**
 * Format time duration (seconds to MM:SS)
 */
function formatDuration(seconds) {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
}

/**
 * Scroll to top of page smoothly
 */
function scrollToTop() {
    window.scrollTo({
        top: 0,
        behavior: 'smooth'
    });
}

/**
 * Copy text to clipboard
 */
async function copyToClipboard(text) {
    try {
        await navigator.clipboard.writeText(text);
        return true;
    } catch (err) {
        console.error('Failed to copy:', err);
        return false;
    }
}

/**
 * Download data as JSON file
 */
function downloadJSON(data, filename = 'wrapped-data.json') {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

/**
 * Get contrast color (black or white) for a background color
 */
function getContrastColor(hexColor) {
    // Convert hex to RGB
    const r = parseInt(hexColor.substr(1, 2), 16);
    const g = parseInt(hexColor.substr(3, 2), 16);
    const b = parseInt(hexColor.substr(5, 2), 16);
    
    // Calculate luminance
    const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
    
    return luminance > 0.5 ? '#000000' : '#FFFFFF';
}

/**
 * Generate a random color
 */
function randomColor() {
    return '#' + Math.floor(Math.random()*16777215).toString(16).padStart(6, '0');
}

/**
 * Check if user prefers reduced motion
 */
function prefersReducedMotion() {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/**
 * Log with timestamp (for debugging)
 */
function log(...args) {
    const timestamp = new Date().toISOString().split('T')[1].split('.')[0];
    console.log(`[${timestamp}]`, ...args);
}