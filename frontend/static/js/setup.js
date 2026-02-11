/* ===== SETUP FLOW ===== */

// Default loading taglines (pages can override by setting window.SETUP_TAGLINES before this script loads)
const DEFAULT_SETUP_TAGLINES = [
    'Analyzing 1,000+ roster decisions...',
    'Calculating your biggest mistakes...',
    'Finding your luckiest wins...',
    'Preparing the roast...',
    'Ranking every decision you made...',
    'Crunching the numbers...',
    'Reviewing the tape...',
    'Judging your lineup choices...',
    'Measuring your fantasy IQ...',
    'Comparing you to the league...',
];

let _setupTaglineInterval = null;

function _startSetupTaglineCycle() {
    _stopSetupTaglineCycle();
    const el = document.getElementById('setupLoadingTagline');
    if (!el) return;
    const taglines = window.SETUP_TAGLINES || DEFAULT_SETUP_TAGLINES;
    let idx = 0;
    el.textContent = taglines[0];
    _setupTaglineInterval = setInterval(() => {
        idx = (idx + 1) % taglines.length;
        el.style.opacity = '0';
        setTimeout(() => {
            el.textContent = taglines[idx];
            el.style.opacity = '1';
        }, 300);
    }, 2500);
}

function _stopSetupTaglineCycle() {
    if (_setupTaglineInterval) {
        clearInterval(_setupTaglineInterval);
        _setupTaglineInterval = null;
    }
}

// State management
const setupState = {
    currentLeagueId: null,
    currentYear: null,
    currentStartWeek: null,
    currentEndWeek: null,
    selectedTeamId: null,
    leagueTeams: [],
};

/**
 * Toggle advanced options visibility
 */
function toggleAdvanced() {
    document.getElementById('advancedContent').classList.toggle('show');
}

/**
 * Show a specific setup step
 */
function showStep(stepNumber) {
    // Stop any running tagline cycle when leaving a step
    _stopSetupTaglineCycle();

    document.querySelectorAll('.step').forEach(step => step.classList.remove('active'));
    const stepEl = document.getElementById(`step${stepNumber}`);
    if (stepEl) {
        stepEl.classList.add('active');
    }

    // Start tagline cycling on loading steps
    if (stepNumber === 2 || stepNumber === 4) {
        _startSetupTaglineCycle();
    }
}

/**
 * Show error message for a step.
 * Renders a structured error box with title, message, and debug info.
 * The message may contain newlines — lines after the first are treated as debug details.
 */
function showError(stepId, message) {
    const errorEl = document.getElementById(`${stepId}Error`);
    if (!errorEl) return;

    // Split message: first line is the summary, remaining lines are debug details
    const lines = String(message).split('\n');
    const summary = lines[0];
    const debugLines = lines.slice(1).filter(l => l.trim() !== '');

    let debugHtml = '';
    if (debugLines.length > 0) {
        debugHtml = `<div class="error-debug"><strong>Debug Info:</strong><pre>${debugLines.join('\n')}</pre></div>`;
    }

    errorEl.innerHTML = `
        <div class="error">
            <div class="error-title">Something went wrong</div>
            <div class="error-message">${summary}</div>
            ${debugHtml}
        </div>
    `;
    errorEl.style.display = 'block';
}

/**
 * Clear error message for a step
 */
function clearError(stepId) {
    const errorEl = document.getElementById(`${stepId}Error`);
    if (!errorEl) return;
    errorEl.innerHTML = '';
    errorEl.style.display = 'none';
}

/**
 * Fetch and display league information
 */
async function fetchLeague() {
    const leagueId = document.getElementById('leagueId').value.trim();
    const year = document.getElementById('year').value;
    const startWeek = document.getElementById('startWeek').value;
    const endWeek = document.getElementById('endWeek').value;

    // Validation
    if (!leagueId) {
        showError('step1', 'Please enter a League ID');
        return;
    }

    if (parseInt(startWeek) > parseInt(endWeek)) {
        showError('step1', 'Start week must be before end week');
        return;
    }

    clearError('step1');
    
    // Save state
    setupState.currentLeagueId = leagueId;
    setupState.currentYear = year;
    setupState.currentStartWeek = startWeek;
    setupState.currentEndWeek = endWeek;

    // Show loading
    showStep(2);

    try {
        // Fetch league info
        const { data: leagueInfo, error: infoError } = await fetchLeagueInfo(leagueId, year);
        if (infoError) throw new Error(infoError);

        // Fetch teams
        const { data: teamsData, error: teamsError } = await fetchLeagueTeams(leagueId, year);
        if (teamsError) throw new Error(teamsError);

        setupState.leagueTeams = teamsData.teams;

        // Display results
        displayLeagueInfo(leagueInfo);
        displayTeams(teamsData.teams);
        showStep(3);
    } catch (error) {
        console.error('Error:', error);
        showError('step1', error.message);
        showStep(1);
    }
}

/**
 * Display league information
 */
function displayLeagueInfo(info) {
    const container = document.getElementById('leagueInfo');
    container.innerHTML = `
        <div class="league-info">
            <h3>${info.league_name}</h3>
            <p><strong>Teams:</strong> ${info.team_count}</p>
            <p><strong>Season:</strong> ${setupState.currentYear}</p>
            <p><strong>Weeks:</strong> ${setupState.currentStartWeek}-${setupState.currentEndWeek}</p>
        </div>
    `;
}

/**
 * Display team selection grid
 */
function displayTeams(teams) {
    const grid = document.getElementById('teamGrid');
    grid.innerHTML = '';
    
    teams.forEach(team => {
        const card = document.createElement('div');
        card.className = 'team-card';
        card.innerHTML = `
            <div class="team-name">${team.team_name}</div>
            <div class="team-id">Team ID: ${team.team_id}</div>
        `;
        card.onclick = () => selectTeam(team.team_id, card);
        grid.appendChild(card);
    });
}

/**
 * Select a team
 */
function selectTeam(teamId, cardElement) {
    // Remove selection from all cards
    document.querySelectorAll('.team-card').forEach(card => {
        card.classList.remove('selected');
    });
    
    // Select this card
    cardElement.classList.add('selected');
    setupState.selectedTeamId = teamId;
    
    // Enable generate button
    document.getElementById('generateBtn').disabled = false;
}

/**
 * Generate wrapped data
 */
async function generateWrapped() {
    if (!setupState.selectedTeamId) {
        showError('step3', 'Please select a team');
        return;
    }

    clearError('step3');
    showStep(4);

    try {
        const { data, error } = await fetchTeamWrapped(
            setupState.currentLeagueId,
            setupState.selectedTeamId,
            setupState.currentYear,
            setupState.currentStartWeek,
            setupState.currentEndWeek
        );

        if (error) throw new Error(error);

        log('Wrapped data received:', data);

        // Use slideshow experience
        await buildAndRenderSlides(data);
        startWrapped();
    } catch (error) {
        console.error('Error:', error);
        showError('step3', error.message);
        showStep(3);
    }
}

/**
 * Reset to step 1
 */
function resetToStep1() {
    setupState.selectedTeamId = null;
    document.getElementById('generateBtn').disabled = true;
    document.querySelectorAll('.team-card').forEach(card => {
        card.classList.remove('selected');
    });
    showStep(1);
}

/**
 * Start the wrapped presentation
 */
function startWrapped() {
    document.getElementById('setupContainer').style.display = 'none';
    document.getElementById('wrappedContainer').classList.add('active');
    initializeNavigation();
    showSlide(0);
}

/**
 * Restart and go back to setup
 */
function restart() {
    document.getElementById('wrappedContainer').classList.remove('active');
    document.getElementById('setupContainer').style.display = 'flex';
    setupState.selectedTeamId = null;
    document.querySelectorAll('.team-card').forEach(card => {
        card.classList.remove('selected');
    });
    document.getElementById('generateBtn').disabled = true;
    showStep(1);
    
    // Clear slides
    const container = document.getElementById('wrappedContainer');
    container.innerHTML = '';
}

/**
 * Read URL parameters and auto-fill form
 */
function initFromUrlParams() {
    const params = new URLSearchParams(window.location.search);

    const leagueId = params.get('leagueId');
    const year = params.get('year');
    const startWeek = params.get('startWeek');
    const endWeek = params.get('endWeek');

    if (leagueId) {
        const leagueIdInput = document.getElementById('leagueId');
        if (leagueIdInput) leagueIdInput.value = leagueId;
    }

    if (year) {
        const yearInput = document.getElementById('year');
        if (yearInput) yearInput.value = year;
    }

    if (startWeek) {
        const startWeekInput = document.getElementById('startWeek');
        if (startWeekInput) startWeekInput.value = startWeek;
    }

    if (endWeek) {
        const endWeekInput = document.getElementById('endWeek');
        if (endWeekInput) endWeekInput.value = endWeek;
    }

    // If we have a league ID from URL, auto-fetch the league
    if (leagueId) {
        // Small delay to ensure DOM is ready
        setTimeout(() => fetchLeague(), 100);
    }
}

// Initialize event listeners
document.addEventListener('DOMContentLoaded', () => {
    // Check for URL parameters and auto-fill
    initFromUrlParams();

    // Enter key on league ID input
    const leagueIdInput = document.getElementById('leagueId');
    if (leagueIdInput) {
        leagueIdInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') fetchLeague();
        });
    }
});