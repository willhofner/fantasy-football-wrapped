/**
 * ============================================================================
 * FANTASY WRAPPED - CARD BUILDER
 * ============================================================================
 *
 * Transforms wrapped API data into collectible card objects and generates
 * the HTML for rendering cards. Each card type has its own builder function.
 *
 * Card Types:
 * - Player Cards: MVP, Bust, Sleeper, Breakout, Benchwarmer
 * - Moment Cards: Lucky Win, Tough Loss, Perfect Week, Blowout
 * - Superlative Cards: League awards
 * - Overview Card: Season summary
 *
 * ============================================================================
 */


/* ===== CONSTANTS ===== */

/**
 * Rarity tier definitions with thresholds and styling
 */
const RARITY = {
    COMMON: {
        id: 'common',
        name: 'Common',
        class: 'card--common'
    },
    UNCOMMON: {
        id: 'uncommon',
        name: 'Uncommon',
        class: 'card--uncommon'
    },
    RARE: {
        id: 'rare',
        name: 'Rare',
        class: 'card--rare'
    },
    EPIC: {
        id: 'epic',
        name: 'Epic',
        class: 'card--epic'
    },
    LEGENDARY: {
        id: 'legendary',
        name: 'Legendary',
        class: 'card--legendary'
    }
};

/**
 * Card type definitions
 */
const CARD_TYPE = {
    PLAYER: 'player',
    MOMENT: 'moment',
    SUPERLATIVE: 'superlative',
    OVERVIEW: 'overview'
};

/**
 * Superlative definitions from ROADMAP.md
 * Each has an icon, title, criteria description, and vibe (roast/praise/neutral/sympathy)
 */
const SUPERLATIVES = {
    CLOWN: {
        id: 'clown',
        icon: '🤡',
        title: 'The Clown',
        description: 'Most goose eggs in starting lineup',
        vibe: 'roast',
        rarity: RARITY.COMMON
    },
    SPEEDRUNNER: {
        id: 'speedrunner',
        icon: '🏃',
        title: 'Speedrunner',
        description: 'Most roster moves of the season',
        vibe: 'neutral',
        rarity: RARITY.UNCOMMON
    },
    SNAIL: {
        id: 'snail',
        icon: '🐌',
        title: 'The Snail',
        description: 'Fewest roster moves all season',
        vibe: 'roast',
        rarity: RARITY.COMMON
    },
    SNIPER: {
        id: 'sniper',
        icon: '🎯',
        title: 'The Sniper',
        description: 'Highest-scoring free agent pickup',
        vibe: 'praise',
        rarity: RARITY.RARE
    },
    DRAFT_KING: {
        id: 'draft_king',
        icon: '👑',
        title: 'Draft King',
        description: 'Best draft class performance',
        vibe: 'praise',
        rarity: RARITY.EPIC
    },
    BLUE_CHIP: {
        id: 'blue_chip',
        icon: '💎',
        title: 'Blue Chip',
        description: 'Highest average win margin',
        vibe: 'praise',
        rarity: RARITY.RARE
    },
    SKULL: {
        id: 'skull',
        icon: '💀',
        title: 'Walking L',
        description: 'Highest average loss margin',
        vibe: 'roast',
        rarity: RARITY.COMMON
    },
    DICE_ROLL: {
        id: 'dice_roll',
        icon: '🎲',
        title: 'Dice Roll',
        description: 'Every game came down to the wire',
        vibe: 'neutral',
        rarity: RARITY.UNCOMMON
    },
    TOP_HEAVY: {
        id: 'top_heavy',
        icon: '⚖️',
        title: 'Top Heavy',
        description: 'Most points from top 2 players',
        vibe: 'neutral',
        rarity: RARITY.UNCOMMON
    },
    HOME_GROWN: {
        id: 'home_grown',
        icon: '🌱',
        title: 'Home Grown',
        description: 'Most starts from drafted players',
        vibe: 'praise',
        rarity: RARITY.RARE
    },
    WAIVER_MVP: {
        id: 'waiver_mvp',
        icon: '📈',
        title: 'Waiver Wire MVP',
        description: 'Most points from pickups',
        vibe: 'praise',
        rarity: RARITY.EPIC
    },
    BENCH_WARMER: {
        id: 'bench_warmer',
        icon: '🪑',
        title: 'Bench Warmer',
        description: 'Most points left on the bench',
        vibe: 'roast',
        rarity: RARITY.COMMON
    },
    LUCKY: {
        id: 'lucky',
        icon: '🍀',
        title: 'Lucky Charm',
        description: 'Won games you had no business winning',
        vibe: 'neutral',
        rarity: RARITY.UNCOMMON
    },
    UNLUCKY: {
        id: 'unlucky',
        icon: '😢',
        title: 'Unlucky',
        description: 'Lost games you deserved to win',
        vibe: 'sympathy',
        rarity: RARITY.UNCOMMON
    },
    HEARTBREAK: {
        id: 'heartbreak',
        icon: '💔',
        title: 'Heartbreak Kid',
        description: 'Multiple close losses',
        vibe: 'sympathy',
        rarity: RARITY.UNCOMMON
    },
    PERFECT_CLUB: {
        id: 'perfect_club',
        icon: '✨',
        title: 'Perfect Week Club',
        description: 'Achieved a perfect lineup',
        vibe: 'praise',
        rarity: RARITY.LEGENDARY
    },
    BEST_MANAGER: {
        id: 'best_manager',
        icon: '🧠',
        title: 'Galaxy Brain',
        description: 'Best lineup decisions all season',
        vibe: 'praise',
        rarity: RARITY.LEGENDARY
    },
    WORST_MANAGER: {
        id: 'worst_manager',
        icon: '🤡',
        title: 'Smooth Brain',
        description: 'Worst lineup decisions all season',
        vibe: 'roast',
        rarity: RARITY.COMMON
    }
};

/**
 * Flavor text templates for different card vibes
 * {player} and {stat} will be replaced with actual values
 */
const FLAVOR_TEXT = {
    mvp: [
        "Carried your sorry team all season.",
        "Where would you be without {player}?",
        "The only reason you're still in contention.",
        "Your golden goose. Don't mess this up."
    ],
    bust: [
        "You believed in {player}. That was your first mistake.",
        "All that draft capital for this?",
        "Should've trusted your gut and benched him.",
        "A cautionary tale in trusting the hype."
    ],
    sleeper: [
        "{player} was right there. You just didn't see it.",
        "Turns out the real treasure was on your bench.",
        "If only you had the vision.",
        "A hidden gem you refused to polish."
    ],
    breakout: [
        "{player} chose violence that week.",
        "Absolute dominance. Chef's kiss.",
        "This is the week you'll tell your grandkids about.",
        "Peak performance. Everything clicked."
    ],
    benchwarmer: [
        "You benched {player}. He took it personally.",
        "This one's gonna haunt you.",
        "Some decisions age like milk.",
        "The bench points that could've been yours."
    ],
    lucky_win: [
        "You escaped with this one.",
        "Sometimes it's better to be lucky than good.",
        "Your opponent is still mad about this.",
        "The fantasy gods smiled upon you."
    ],
    tough_loss: [
        "You did everything right. Life isn't fair.",
        "This loss wasn't your fault. Mostly.",
        "Pour one out for this week.",
        "The cruelest outcome of your season."
    ],
    perfect_week: [
        "For one glorious week, you were perfect.",
        "The stars aligned. You didn't mess it up.",
        "This is what peak performance looks like.",
        "Frame this. You'll never be this good again."
    ]
};


/* ===== UTILITY FUNCTIONS ===== */

/**
 * Get a random flavor text for a given type
 * @param {string} type - The flavor text category
 * @param {Object} replacements - Values to replace in the template
 * @returns {string} A random flavor text with replacements applied
 */
function getFlavorText(type, replacements = {}) {
    const texts = FLAVOR_TEXT[type];
    if (!texts || texts.length === 0) return '';

    let text = texts[Math.floor(Math.random() * texts.length)];

    // Apply replacements
    Object.entries(replacements).forEach(([key, value]) => {
        text = text.replace(`{${key}}`, value);
    });

    return text;
}

/**
 * Calculate rarity based on points for a player card
 * @param {number} points - Player's points
 * @param {string} context - Context for rarity calculation (single_week, season_total)
 * @returns {Object} Rarity tier object
 */
function calculatePlayerRarity(points, context = 'single_week') {
    if (context === 'single_week') {
        if (points >= 40) return RARITY.LEGENDARY;
        if (points >= 30) return RARITY.EPIC;
        if (points >= 20) return RARITY.RARE;
        if (points >= 15) return RARITY.UNCOMMON;
        return RARITY.COMMON;
    }

    // Season total context
    if (points >= 250) return RARITY.LEGENDARY;
    if (points >= 200) return RARITY.EPIC;
    if (points >= 150) return RARITY.RARE;
    if (points >= 100) return RARITY.UNCOMMON;
    return RARITY.COMMON;
}

/**
 * Calculate rarity based on margin for moment cards
 * @param {number} margin - Point margin (positive or negative)
 * @returns {Object} Rarity tier object
 */
function calculateMomentRarity(margin) {
    const absMargin = Math.abs(margin);
    if (absMargin >= 50) return RARITY.EPIC;
    if (absMargin >= 30) return RARITY.RARE;
    if (absMargin >= 15) return RARITY.UNCOMMON;
    return RARITY.COMMON;
}

/**
 * Format a number with appropriate precision
 * @param {number} num - Number to format
 * @returns {string} Formatted number string
 */
function formatCardNumber(num) {
    if (typeof num !== 'number') return num;
    return num % 1 === 0 ? num.toString() : num.toFixed(1);
}

/**
 * Get opponent name from team map
 * @param {number} opponentId - Opponent team ID
 * @param {Object} teamNames - Map of team IDs to names
 * @returns {string} Opponent team name
 */
function getOpponentNameFromMap(opponentId, teamNames) {
    return teamNames?.[opponentId] || `Team ${opponentId}`;
}


/* ===== CARD BUILDERS ===== */

/**
 * Build the season overview card
 * @param {Object} data - Wrapped data from API
 * @returns {Object} Card object
 */
function buildOverviewCard(data) {
    return {
        id: 'overview',
        type: CARD_TYPE.OVERVIEW,
        rarity: RARITY.RARE,
        title: data.team_name,
        subtitle: `${data.league_context?.year || 2024} Season`,
        stats: [
            { label: 'Record', value: `${data.records.actual.wins}-${data.records.actual.losses}`, highlight: true },
            { label: 'Points', value: formatCardNumber(data.overview.total_points) },
            { label: 'Rank', value: `#${data.overview.standing}` }
        ],
        flavorText: `${data.overview.total_errors} lineup mistakes. ${data.overview.perfect_week_count} perfect weeks.`
    };
}

/**
 * Build MVP player card (top scorer)
 * @param {Object} data - Wrapped data from API
 * @returns {Object|null} Card object or null if no data
 */
function buildMVPCard(data) {
    const topScorer = data.top_scorers?.[0];
    if (!topScorer) return null;

    const rarity = calculatePlayerRarity(topScorer.points, 'season_total');

    return {
        id: 'mvp',
        type: CARD_TYPE.PLAYER,
        rarity: rarity,
        title: 'Season MVP',
        player: {
            name: topScorer.name,
            position: topScorer.position || 'FLEX',
            imageUrl: null // Will be fetched by renderer
        },
        stats: [
            { label: 'Total Pts', value: formatCardNumber(topScorer.points), highlight: true },
            { label: 'Games', value: topScorer.games || '-' },
            { label: 'Avg', value: topScorer.games ? formatCardNumber(topScorer.points / topScorer.games) : '-' }
        ],
        flavorText: getFlavorText('mvp', { player: topScorer.name })
    };
}

/**
 * Build second best player card
 * @param {Object} data - Wrapped data from API
 * @returns {Object|null} Card object or null if no data
 */
function buildSecondBestCard(data) {
    const player = data.top_scorers?.[1];
    if (!player) return null;

    const rarity = calculatePlayerRarity(player.points, 'season_total');

    return {
        id: 'second-best',
        type: CARD_TYPE.PLAYER,
        rarity: rarity,
        title: 'Second Fiddle',
        player: {
            name: player.name,
            position: player.position || 'FLEX',
            imageUrl: null
        },
        stats: [
            { label: 'Total Pts', value: formatCardNumber(player.points), highlight: true },
            { label: 'Games', value: player.games || '-' },
            { label: 'Avg', value: player.games ? formatCardNumber(player.points / player.games) : '-' }
        ],
        flavorText: "Not the star, but definitely the supporting actor."
    };
}

/**
 * Build third best player card
 * @param {Object} data - Wrapped data from API
 * @returns {Object|null} Card object or null if no data
 */
function buildThirdBestCard(data) {
    const player = data.top_scorers?.[2];
    if (!player) return null;

    const rarity = calculatePlayerRarity(player.points, 'season_total');

    return {
        id: 'third-best',
        type: CARD_TYPE.PLAYER,
        rarity: rarity,
        title: 'Bronze Medal',
        player: {
            name: player.name,
            position: player.position || 'FLEX',
            imageUrl: null
        },
        stats: [
            { label: 'Total Pts', value: formatCardNumber(player.points), highlight: true },
            { label: 'Games', value: player.games || '-' },
            { label: 'Avg', value: player.games ? formatCardNumber(player.points / player.games) : '-' }
        ],
        flavorText: "Third place is still a podium finish."
    };
}

/**
 * Build bust (most overrated) player card
 * @param {Object} data - Wrapped data from API
 * @returns {Object|null} Card object or null if no data
 */
function buildBustCard(data) {
    const bust = data.most_overrated;
    if (!bust) return null;

    return {
        id: 'bust',
        type: CARD_TYPE.PLAYER,
        rarity: RARITY.COMMON, // Busts are always common (the shame)
        title: 'Biggest Bust',
        player: {
            name: bust.name,
            position: bust.position || 'FLEX',
            imageUrl: null
        },
        stats: [
            { label: 'Bad Starts', value: bust.times_started, highlight: true },
            { label: 'Points', value: formatCardNumber(bust.points_from_starts) },
            { label: 'Avg/Start', value: formatCardNumber(bust.points_from_starts / bust.times_started) }
        ],
        flavorText: getFlavorText('bust', { player: bust.name }),
        cardClass: 'card--roast'
    };
}

/**
 * Build sleeper (most slept on) player card
 * @param {Object} data - Wrapped data from API
 * @returns {Object|null} Card object or null if no data
 */
function buildSleeperCard(data) {
    const sleeper = data.most_slept_on;
    if (!sleeper) return null;

    return {
        id: 'sleeper',
        type: CARD_TYPE.PLAYER,
        rarity: RARITY.RARE, // Sleepers are rare hidden gems
        title: 'Most Slept On',
        player: {
            name: sleeper.name,
            position: sleeper.position || 'FLEX',
            imageUrl: null
        },
        stats: [
            { label: 'Times Benched', value: sleeper.times_benched, highlight: true },
            { label: 'Pts Missed', value: formatCardNumber(sleeper.points_missed) },
            { label: 'Avg Missed', value: formatCardNumber(sleeper.points_missed / sleeper.times_benched) }
        ],
        flavorText: getFlavorText('sleeper', { player: sleeper.name })
    };
}

/**
 * Build breakout performance card
 * @param {Object} data - Wrapped data from API
 * @returns {Object|null} Card object or null if no data
 */
function buildBreakoutCard(data) {
    const breakout = data.highest_scorer_week;
    if (!breakout) return null;

    const rarity = calculatePlayerRarity(breakout.points, 'single_week');

    return {
        id: 'breakout',
        type: CARD_TYPE.PLAYER,
        rarity: rarity,
        title: 'Breakout Performance',
        subtitle: `Week ${breakout.week}`,
        player: {
            name: breakout.name,
            position: breakout.position || 'FLEX',
            imageUrl: null
        },
        stats: [
            { label: 'Points', value: formatCardNumber(breakout.points), highlight: true },
            { label: 'Week', value: breakout.week },
            { label: 'Result', value: breakout.won ? 'W' : 'L' }
        ],
        flavorText: getFlavorText('breakout', { player: breakout.name }),
        cardClass: 'card--praise'
    };
}

/**
 * Build benchwarmer (wasted potential) card
 * @param {Object} data - Wrapped data from API
 * @returns {Object|null} Card object or null if no data
 */
function buildBenchwarmerCard(data) {
    const benched = data.highest_bench_week;
    if (!benched) return null;

    const rarity = calculatePlayerRarity(benched.points, 'single_week');

    let outcomeText = '';
    if (benched.won_anyway) {
        outcomeText = "You won anyway. Still hurts.";
    } else if (benched.would_have_won) {
        outcomeText = "Would've won if you started him. Ouch.";
    } else {
        outcomeText = "Wouldn't have mattered. Still a waste.";
    }

    return {
        id: 'benchwarmer',
        type: CARD_TYPE.PLAYER,
        rarity: rarity,
        title: 'Wasted Potential',
        subtitle: `Week ${benched.week}`,
        player: {
            name: benched.name,
            position: benched.position || 'FLEX',
            imageUrl: null
        },
        stats: [
            { label: 'Bench Pts', value: formatCardNumber(benched.points), highlight: true },
            { label: 'Week', value: benched.week },
            { label: 'Result', value: benched.won_anyway ? 'W' : 'L' }
        ],
        flavorText: outcomeText,
        cardClass: 'card--roast'
    };
}

/**
 * Build lucky win moment card
 * @param {Object} data - Wrapped data from API
 * @returns {Object|null} Card object or null if no data
 */
function buildLuckyWinCard(data) {
    const lucky = data.lucky_break;
    if (!lucky) return null;

    const margin = lucky.my_score - lucky.opp_score;
    const rarity = calculateMomentRarity(margin);

    return {
        id: 'lucky-win',
        type: CARD_TYPE.MOMENT,
        rarity: RARITY.UNCOMMON, // Lucky wins are always uncommon
        title: 'Lucky Win',
        subtitle: `Week ${lucky.week}`,
        moment: {
            week: lucky.week,
            yourScore: lucky.my_score,
            oppScore: lucky.opp_score,
            opponent: getOpponentNameFromMap(lucky.opponent_id, data.team_names),
            outcome: 'win',
            margin: margin
        },
        stats: [
            { label: 'Your Score', value: formatCardNumber(lucky.my_score), highlight: true },
            { label: 'Opp Score', value: formatCardNumber(lucky.opp_score) },
            { label: 'Margin', value: `+${formatCardNumber(margin)}` }
        ],
        flavorText: getFlavorText('lucky_win'),
        extras: lucky.opp_zeros > 0 ? { oppZeros: lucky.opp_zeros } : null
    };
}

/**
 * Build tough loss moment card
 * @param {Object} data - Wrapped data from API
 * @returns {Object|null} Card object or null if no data
 */
function buildToughLossCard(data) {
    const tough = data.tough_luck;
    if (!tough) return null;

    const margin = tough.my_score - tough.opp_score;

    return {
        id: 'tough-loss',
        type: CARD_TYPE.MOMENT,
        rarity: RARITY.UNCOMMON, // Tough losses get sympathy rarity
        title: 'Tough Loss',
        subtitle: `Week ${tough.week}`,
        moment: {
            week: tough.week,
            yourScore: tough.my_score,
            oppScore: tough.opp_score,
            opponent: getOpponentNameFromMap(tough.opponent_id, data.team_names),
            outcome: 'loss',
            margin: margin
        },
        stats: [
            { label: 'Your Score', value: formatCardNumber(tough.my_score), highlight: true },
            { label: 'Opp Score', value: formatCardNumber(tough.opp_score) },
            { label: 'Margin', value: formatCardNumber(margin) }
        ],
        flavorText: getFlavorText('tough_loss')
    };
}

/**
 * Build perfect week moment card
 * @param {Object} data - Wrapped data from API
 * @returns {Object|null} Card object or null if no data
 */
function buildPerfectWeekCard(data) {
    const perfectWeeks = data.overview?.perfect_weeks;
    if (!perfectWeeks || perfectWeeks.length === 0) return null;

    return {
        id: 'perfect-week',
        type: CARD_TYPE.MOMENT,
        rarity: RARITY.LEGENDARY, // Perfect weeks are legendary
        title: 'Perfect Week',
        subtitle: perfectWeeks.length > 1 ? `${perfectWeeks.length} Perfect Weeks` : `Week ${perfectWeeks[0]}`,
        moment: {
            weeks: perfectWeeks,
            count: perfectWeeks.length
        },
        stats: [
            { label: 'Perfect', value: perfectWeeks.length, highlight: true },
            { label: 'Weeks', value: perfectWeeks.join(', ') }
        ],
        flavorText: getFlavorText('perfect_week'),
        cardClass: 'card--praise'
    };
}

/**
 * Build manager rating card
 * @param {Object} data - Wrapped data from API
 * @returns {Object} Card object
 */
function buildManagerCard(data) {
    const rank = data.overview.error_rank;
    const totalTeams = data.league_context?.team_count || 10;
    const errors = data.overview.total_errors;

    // Determine rarity based on rank
    let rarity = RARITY.COMMON;
    if (rank === 1) rarity = RARITY.LEGENDARY;
    else if (rank === 2) rarity = RARITY.EPIC;
    else if (rank === 3) rarity = RARITY.RARE;
    else if (rank <= Math.ceil(totalTeams / 2)) rarity = RARITY.UNCOMMON;

    let title = 'Manager Rating';
    let flavorText = '';

    if (rank === 1) {
        title = 'Best Manager';
        flavorText = "You actually knew what you were doing. Impressive.";
    } else if (rank === totalTeams) {
        title = 'Worst Manager';
        flavorText = "Maybe try auto-draft next year?";
    } else if (rank <= 3) {
        flavorText = "Top 3 in decision-making. Not bad.";
    } else if (rank <= Math.ceil(totalTeams / 2)) {
        flavorText = "Upper half of the league. Room to grow.";
    } else {
        flavorText = "Let's just say there's room for improvement.";
    }

    return {
        id: 'manager',
        type: CARD_TYPE.OVERVIEW,
        rarity: rarity,
        title: title,
        stats: [
            { label: 'Rank', value: `#${rank}`, highlight: true },
            { label: 'of', value: totalTeams },
            { label: 'Errors', value: errors }
        ],
        flavorText: flavorText,
        cardClass: rank === totalTeams ? 'card--roast' : (rank <= 3 ? 'card--praise' : '')
    };
}

/**
 * Build superlative card based on user's award
 * @param {string} superlativeId - ID of the superlative
 * @param {Object} data - Additional data for the card
 * @returns {Object} Card object
 */
function buildSuperlativeCard(superlativeId, data = {}) {
    const superlative = SUPERLATIVES[superlativeId.toUpperCase()];
    if (!superlative) return null;

    return {
        id: `superlative-${superlative.id}`,
        type: CARD_TYPE.SUPERLATIVE,
        rarity: superlative.rarity,
        title: superlative.title,
        icon: superlative.icon,
        description: superlative.description,
        vibe: superlative.vibe,
        stats: data.stats || [],
        flavorText: data.flavorText || '',
        cardClass: `card--superlative card--${superlative.vibe}`
    };
}


/* ===== PACK BUILDER ===== */

/**
 * Build a complete pack of cards from wrapped data
 * @param {Object} wrappedData - Full wrapped data from API
 * @returns {Array} Array of card objects in reveal order
 */
function buildCardPack(wrappedData) {
    const cards = [];

    // 1. Overview card (always first)
    const overview = buildOverviewCard(wrappedData);
    if (overview) cards.push(overview);

    // 2. MVP card
    const mvp = buildMVPCard(wrappedData);
    if (mvp) cards.push(mvp);

    // 3. Second best player
    const secondBest = buildSecondBestCard(wrappedData);
    if (secondBest) cards.push(secondBest);

    // 4. Third best player
    const thirdBest = buildThirdBestCard(wrappedData);
    if (thirdBest) cards.push(thirdBest);

    // 5. Bust card
    const bust = buildBustCard(wrappedData);
    if (bust) cards.push(bust);

    // 6. Sleeper card
    const sleeper = buildSleeperCard(wrappedData);
    if (sleeper) cards.push(sleeper);

    // 7. Breakout performance
    const breakout = buildBreakoutCard(wrappedData);
    if (breakout) cards.push(breakout);

    // 8. Benchwarmer / wasted potential
    const benchwarmer = buildBenchwarmerCard(wrappedData);
    if (benchwarmer) cards.push(benchwarmer);

    // 9. Lucky win (if exists)
    const luckyWin = buildLuckyWinCard(wrappedData);
    if (luckyWin) cards.push(luckyWin);

    // 10. Tough loss (if exists)
    const toughLoss = buildToughLossCard(wrappedData);
    if (toughLoss) cards.push(toughLoss);

    // 11. Perfect week (if exists)
    const perfectWeek = buildPerfectWeekCard(wrappedData);
    if (perfectWeek) cards.push(perfectWeek);

    // 12. Manager rating (always last before superlative)
    const manager = buildManagerCard(wrappedData);
    if (manager) cards.push(manager);

    return cards;
}

/**
 * Build all superlative cards for the guessing game
 * @param {Object} leagueStats - League-wide statistics
 * @returns {Array} Array of superlative card objects
 */
function buildSuperlativeOptions(leagueStats) {
    const options = [];

    // Add available superlatives based on league data
    if (leagueStats.best_manager) {
        options.push(buildSuperlativeCard('BEST_MANAGER', {
            stats: [{ label: 'Errors', value: leagueStats.best_manager.errors }],
            flavorText: `${leagueStats.best_manager.name} made the fewest mistakes.`
        }));
    }

    if (leagueStats.worst_manager) {
        options.push(buildSuperlativeCard('WORST_MANAGER', {
            stats: [{ label: 'Errors', value: leagueStats.worst_manager.errors }],
            flavorText: `${leagueStats.worst_manager.name} needs some help.`
        }));
    }

    if (leagueStats.luckiest_team) {
        options.push(buildSuperlativeCard('LUCKY', {
            stats: [{ label: 'Extra Wins', value: `+${leagueStats.luckiest_team.win_difference}` }],
            flavorText: `${leagueStats.luckiest_team.name} got away with some wins.`
        }));
    }

    if (leagueStats.biggest_underperformer) {
        options.push(buildSuperlativeCard('UNLUCKY', {
            stats: [{ label: 'Lost Wins', value: leagueStats.biggest_underperformer.win_difference }],
            flavorText: `${leagueStats.biggest_underperformer.name} deserved better.`
        }));
    }

    // Add standard superlatives
    options.push(buildSuperlativeCard('BENCH_WARMER'));
    options.push(buildSuperlativeCard('CLOWN'));
    options.push(buildSuperlativeCard('BLUE_CHIP'));
    options.push(buildSuperlativeCard('DICE_ROLL'));

    return options;
}


/* ===== EXPORTS ===== */

// Make functions available globally for use in other modules
window.CardBuilder = {
    RARITY,
    CARD_TYPE,
    SUPERLATIVES,
    buildCardPack,
    buildSuperlativeOptions,
    buildSuperlativeCard,
    buildOverviewCard,
    buildMVPCard,
    buildBustCard,
    buildSleeperCard,
    buildBreakoutCard,
    buildBenchwarmerCard,
    buildLuckyWinCard,
    buildToughLossCard,
    buildPerfectWeekCard,
    buildManagerCard,
    getFlavorText,
    calculatePlayerRarity,
    calculateMomentRarity
};
