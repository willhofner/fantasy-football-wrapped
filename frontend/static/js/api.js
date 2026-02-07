/* ===== GLOBAL ERROR HANDLER ===== */

/**
 * Catches uncaught JS errors and unhandled promise rejections.
 * Displays a fixed debug toast at the bottom of the screen.
 */
(function initGlobalErrorHandler() {
    function showDebugToast(message, source, lineno, colno) {
        // Remove existing toast if any
        const existing = document.getElementById('debugToast');
        if (existing) existing.remove();

        const toast = document.createElement('div');
        toast.id = 'debugToast';
        toast.className = 'debug-toast';

        const details = [
            source ? `File: ${source}` : null,
            lineno ? `Line: ${lineno}${colno ? ':' + colno : ''}` : null,
        ].filter(Boolean).join(' | ');

        toast.innerHTML = `
            <div class="debug-toast-header">
                <strong>Uncaught Error</strong>
                <button class="debug-toast-dismiss" onclick="this.closest('.debug-toast').remove()">&times;</button>
            </div>
            <div class="debug-toast-message">${message}</div>
            ${details ? `<div class="debug-toast-details">${details}</div>` : ''}
        `;
        document.body.appendChild(toast);
    }

    window.onerror = function(message, source, lineno, colno, error) {
        console.error('Global error:', { message, source, lineno, colno, error });
        showDebugToast(message, source, lineno, colno);
        return false; // let default handler run too
    };

    window.addEventListener('unhandledrejection', function(event) {
        const reason = event.reason;
        const message = reason instanceof Error ? reason.message : String(reason);
        const stack = reason instanceof Error ? reason.stack : null;
        const source = stack ? stack.split('\n')[1]?.trim() : null;
        console.error('Unhandled rejection:', reason);
        showDebugToast(message, source, null, null);
    });
})();


/* ===== API FUNCTIONS ===== */

/**
 * Generic fetch wrapper with descriptive error handling.
 * Checks response type and status before parsing JSON.
 * Includes the fetched URL in all error messages.
 */
async function apiFetch(url, options = {}) {
    let response;
    try {
        response = await fetch(url, {
            ...options,
            headers: {
                'Content-Type': 'application/json',
                ...options.headers,
            },
        });
    } catch (networkError) {
        // fetch() itself threw — network error, DNS failure, CORS, backend not running
        console.error('API Network Error:', networkError, '| URL:', url);
        return {
            data: null,
            error: `Network error — could not reach the API. Check that the backend is running.\n\nURL: ${url}\nDetails: ${networkError.message}`,
        };
    }

    // Response received but may not be OK
    const contentType = response.headers.get('content-type') || '';

    // If the server returned HTML instead of JSON (common when frontend proxy serves index.html for unknown routes)
    if (contentType.includes('text/html')) {
        console.error('API returned HTML instead of JSON | URL:', url, '| Status:', response.status);
        return {
            data: null,
            error: `API returned HTML instead of JSON. Is the backend running on port 5001? The frontend may be hitting the wrong server.\n\nURL: ${url}\nStatus: ${response.status} ${response.statusText}\nContent-Type: ${contentType}`,
        };
    }

    // Try to parse JSON
    let data;
    try {
        data = await response.json();
    } catch (parseError) {
        console.error('API JSON parse error:', parseError, '| URL:', url);
        return {
            data: null,
            error: `Failed to parse API response as JSON.\n\nURL: ${url}\nStatus: ${response.status} ${response.statusText}\nContent-Type: ${contentType}\nParse error: ${parseError.message}`,
        };
    }

    // JSON parsed, but HTTP status was an error
    if (!response.ok) {
        const serverMessage = data.error || data.message || JSON.stringify(data);
        console.error('API HTTP Error:', response.status, '| URL:', url, '| Body:', data);
        return {
            data: null,
            error: `HTTP ${response.status} ${response.statusText}\n\nURL: ${url}\nServer message: ${serverMessage}`,
        };
    }

    return { data, error: null };
}

/**
 * Get basic league information
 */
async function fetchLeagueInfo(leagueId, year) {
    const url = `${CONFIG.API_BASE_URL}/league/${leagueId}/info?year=${year}`;
    return await apiFetch(url);
}

/**
 * Get all teams in a league
 */
async function fetchLeagueTeams(leagueId, year) {
    const url = `${CONFIG.API_BASE_URL}/league/${leagueId}/teams?year=${year}`;
    return await apiFetch(url);
}

/**
 * Analyze full season for all teams
 */
async function fetchLeagueAnalysis(leagueId, year, startWeek, endWeek) {
    const url = `${CONFIG.API_BASE_URL}/league/${leagueId}/analyze?year=${year}&start_week=${startWeek}&end_week=${endWeek}`;
    return await apiFetch(url);
}

/**
 * Get Wrapped data for a specific team
 */
async function fetchTeamWrapped(leagueId, teamId, year, startWeek, endWeek) {
    const url = `${CONFIG.API_BASE_URL}/league/${leagueId}/team/${teamId}/wrapped?year=${year}&start_week=${startWeek}&end_week=${endWeek}`;
    return await apiFetch(url);
}

/**
 * Batch fetch player headshots (if we add a backend endpoint for this)
 */
async function fetchPlayerHeadshots(playerNames) {
    // Future: implement backend endpoint for batch headshot fetching
    // For now, fetch individually
    const headshots = {};
    
    for (const name of playerNames) {
        const url = await getPlayerHeadshot(name);
        headshots[name] = url;
    }
    
    return headshots;
}

/**
 * Get all unique player names from wrapped data
 */
function extractPlayerNames(wrappedData) {
    const names = new Set();
    
    // Top scorers
    if (wrappedData.top_scorers) {
        wrappedData.top_scorers.forEach(p => names.add(p.name));
    }
    
    // Highest scorer week
    if (wrappedData.highest_scorer_week?.name) {
        names.add(wrappedData.highest_scorer_week.name);
    }
    
    // Highest bench week
    if (wrappedData.highest_bench_week?.name) {
        names.add(wrappedData.highest_bench_week.name);
    }
    
    // Most slept on
    if (wrappedData.most_slept_on?.name) {
        names.add(wrappedData.most_slept_on.name);
    }
    
    // Most overrated
    if (wrappedData.most_overrated?.name) {
        names.add(wrappedData.most_overrated.name);
    }
    
    // Weekly data starters
    if (wrappedData.weekly_data) {
        wrappedData.weekly_data.forEach(week => {
            if (week.starters) {
                week.starters.forEach(p => names.add(p.name));
            }
        });
    }
    
    return Array.from(names);
}

/**
 * Preload all player headshots for faster rendering
 */
async function preloadHeadshots(wrappedData) {
    if (!CONFIG.HEADSHOT_CACHE_ENABLED) return {};
    
    const playerNames = extractPlayerNames(wrappedData);
    log('Preloading headshots for', playerNames.length, 'players');
    
    const headshots = await fetchPlayerHeadshots(playerNames);
    
    log('Headshots preloaded');
    return headshots;
}