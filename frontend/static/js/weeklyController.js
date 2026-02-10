/* Weekly Deep Dive Controller */

const WeeklyController = {
    // State
    state: {
        leagueId: null,
        year: null,
        teamId: null,
        teamName: null,
        currentWeek: 1,
        weekData: {},
        startWeek: 1,
        endWeek: 14
    },

    /**
     * Initialize the controller from URL params
     */
    async init() {
        const params = new URLSearchParams(window.location.search);

        this.state.leagueId = params.get('leagueId');
        this.state.year = parseInt(params.get('year')) || 2024;
        this.state.startWeek = parseInt(params.get('startWeek')) || 1;
        this.state.endWeek = parseInt(params.get('endWeek')) || 14;

        // Team ID might come from URL or we need to fetch and select
        const teamIdParam = params.get('teamId');
        const teamNameParam = params.get('team');

        if (!this.state.leagueId) {
            this.showError('Missing league ID. Please start from the hub page.');
            return;
        }

        // If no team specified, fetch teams and let user select
        if (!teamIdParam && !teamNameParam) {
            await this.fetchAndSelectTeam();
        } else if (teamIdParam) {
            this.state.teamId = parseInt(teamIdParam);
            await this.loadWeeklyData();
        } else if (teamNameParam) {
            // Look up team by name
            await this.findTeamByName(teamNameParam);
        }
    },

    /**
     * Fetch teams and auto-select the first one (or show selector)
     */
    async fetchAndSelectTeam() {
        try {
            const { data, error } = await fetchLeagueTeams(this.state.leagueId, this.state.year);
            if (error) throw new Error(error);

            const teams = data.teams;
            if (teams.length === 0) {
                throw new Error('No teams found in league');
            }

            // For now, just use the first team (later could add team selection UI)
            this.state.teamId = teams[0].team_id;
            this.state.teamName = teams[0].team_name;

            await this.loadWeeklyData();
        } catch (err) {
            this.showError(err.message);
        }
    },

    /**
     * Find team by owner name
     */
    async findTeamByName(teamName) {
        try {
            const { data, error } = await fetchLeagueTeams(this.state.leagueId, this.state.year);
            if (error) throw new Error(error);

            const team = data.teams.find(t =>
                t.team_name.toLowerCase().includes(teamName.toLowerCase())
            );

            if (!team) {
                throw new Error(`Team "${teamName}" not found`);
            }

            this.state.teamId = team.team_id;
            this.state.teamName = team.team_name;

            await this.loadWeeklyData();
        } catch (err) {
            this.showError(err.message);
        }
    },

    /**
     * Load weekly data and render week navigation
     */
    async loadWeeklyData() {
        try {
            // Render week navigation
            WeeklyRenderer.renderWeekNavigation(
                this.state.startWeek,
                this.state.endWeek,
                this.state.currentWeek
            );

            // Load first week
            await this.loadWeek(this.state.currentWeek);

            // Show main content
            document.getElementById('loading').style.display = 'none';
            document.getElementById('main-content').style.display = 'block';
        } catch (err) {
            this.showError(err.message);
        }
    },

    /**
     * Load data for a specific week
     */
    async loadWeek(week) {
        try {
            // Check cache first
            if (this.state.weekData[week]) {
                this.renderWeek(week);
                return;
            }

            // Fetch week data
            const url = `${CONFIG.API_BASE_URL}/league/${this.state.leagueId}/week/${week}/deep-dive?year=${this.state.year}&team_id=${this.state.teamId}`;
            const { data, error } = await apiFetch(url);

            if (error) {
                throw new Error(error);
            }

            // Cache the data
            this.state.weekData[week] = data;

            // Render the week
            this.renderWeek(week);
        } catch (err) {
            console.error('Error loading week:', err);
            this.showError(`Failed to load week ${week}: ${err.message}`);
        }
    },

    /**
     * Render a week's data
     */
    renderWeek(week) {
        this.state.currentWeek = week;

        const data = this.state.weekData[week];
        if (!data) return;

        // Update active week button
        document.querySelectorAll('.week-btn').forEach(btn => {
            btn.classList.toggle('active', parseInt(btn.dataset.week) === week);
        });

        // Render sections
        WeeklyRenderer.renderNFLSummary(week, data.nfl_summary);
        WeeklyRenderer.renderMatchupDetail(data.my_matchup, this.state.teamId);
        WeeklyRenderer.renderFantasyLeagueSummary(data.fantasy_summary);
        WeeklyRenderer.renderStandings(data.standings, this.state.teamId);
        WeeklyRenderer.renderNFLScores(data.nfl_scores);
        WeeklyRenderer.renderAllMatchups(data.all_matchups);

        // Scroll to top
        window.scrollTo({ top: 0, behavior: 'smooth' });
    },

    /**
     * Navigate to a different week
     */
    navigateToWeek(week) {
        this.loadWeek(week);
    },

    /**
     * Show error screen
     */
    showError(message) {
        document.getElementById('loading').style.display = 'none';
        document.getElementById('main-content').style.display = 'none';
        document.getElementById('error-message').textContent = message;
        document.getElementById('error-screen').style.display = 'flex';
    }
};

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
    WeeklyController.init();
});
