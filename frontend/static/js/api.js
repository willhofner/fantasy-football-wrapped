/* ===== API FUNCTIONS ===== */

/**
 * Generic fetch wrapper with error handling
 */
async function apiFetch(url, options = {}) {
    try {
        const response = await fetch(url, {
            ...options,
            headers: {
                'Content-Type': 'application/json',
                ...options.headers,
            },
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || `HTTP error ${response.status}`);
        }

        return { data, error: null };
    } catch (error) {
        console.error('API Error:', error);
        return { data: null, error: error.message };
    }
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