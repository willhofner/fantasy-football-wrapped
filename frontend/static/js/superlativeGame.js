/**
 * ============================================================================
 * FANTASY WRAPPED - SUPERLATIVE GUESSING GAME
 * ============================================================================
 *
 * Interactive game where users try to guess which league superlative
 * award they earned. Cards are laid face-down showing only the award title,
 * and the user picks which one they think they got.
 *
 * Features:
 * - Face-down cards with award titles visible
 * - Pick to reveal mechanic
 * - Correct/incorrect feedback with celebration/roast
 * - Shows the correct answer if wrong
 *
 * ============================================================================
 */


/* ===== STATE ===== */

const SuperlativeGameState = {
    // The user's actual superlative(s)
    userSuperlatives: [],

    // All available superlative options
    options: [],

    // User's guess
    selectedOption: null,

    // Game phase: 'selecting' | 'revealed' | 'complete'
    phase: 'selecting',

    // Number of correct guesses
    correctGuesses: 0
};


/* ===== DOM REFERENCES ===== */

let gameContainerEl = null;


/* ===== INITIALIZATION ===== */

/**
 * Initialize the superlative guessing game
 * @param {Array} userSuperlatives - The superlatives the user actually earned
 * @param {Object} leagueStats - League-wide statistics for context
 * @param {HTMLElement} container - Container element to render into
 */
function initSuperlativeGame(userSuperlatives, leagueStats, container) {
    console.log('[SuperlativeGame] Initializing with:', userSuperlatives);

    // Store state
    SuperlativeGameState.userSuperlatives = userSuperlatives;
    SuperlativeGameState.selectedOption = null;
    SuperlativeGameState.phase = 'selecting';
    SuperlativeGameState.correctGuesses = 0;

    // Build options (mix of user's superlatives and decoys)
    SuperlativeGameState.options = buildSuperlativeOptions(userSuperlatives, leagueStats);

    // Store container reference
    gameContainerEl = container;

    // Render the game
    renderGame();
}

/**
 * Build the superlative options for the game
 * Includes the user's actual superlatives plus some decoys
 * @param {Array} userSuperlatives - User's earned superlatives
 * @param {Object} leagueStats - League statistics
 * @returns {Array} Array of superlative options
 */
function buildSuperlativeOptions(userSuperlatives, leagueStats) {
    const options = [];
    const usedIds = new Set();

    // Add user's actual superlatives
    userSuperlatives.forEach(sup => {
        options.push({
            ...sup,
            isCorrect: true
        });
        usedIds.add(sup.id);
    });

    // Add decoy superlatives (ones the user didn't earn)
    const decoys = [
        CardBuilder.SUPERLATIVES.CLOWN,
        CardBuilder.SUPERLATIVES.SPEEDRUNNER,
        CardBuilder.SUPERLATIVES.SNAIL,
        CardBuilder.SUPERLATIVES.SNIPER,
        CardBuilder.SUPERLATIVES.BLUE_CHIP,
        CardBuilder.SUPERLATIVES.SKULL,
        CardBuilder.SUPERLATIVES.DICE_ROLL,
        CardBuilder.SUPERLATIVES.TOP_HEAVY,
        CardBuilder.SUPERLATIVES.BENCH_WARMER,
        CardBuilder.SUPERLATIVES.LUCKY,
        CardBuilder.SUPERLATIVES.UNLUCKY,
        CardBuilder.SUPERLATIVES.HEARTBREAK
    ];

    // Shuffle and pick decoys until we have 6-8 options total
    const shuffledDecoys = shuffleArray(decoys.filter(d => !usedIds.has(d.id)));
    const targetCount = Math.min(8, userSuperlatives.length + 5);

    for (let i = 0; i < shuffledDecoys.length && options.length < targetCount; i++) {
        options.push({
            ...shuffledDecoys[i],
            isCorrect: false
        });
    }

    // Shuffle final options
    return shuffleArray(options);
}

/**
 * Shuffle an array using Fisher-Yates algorithm
 * @param {Array} array - Array to shuffle
 * @returns {Array} Shuffled array
 */
function shuffleArray(array) {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
}


/* ===== RENDERING ===== */

/**
 * Render the superlative game UI
 */
function renderGame() {
    if (!gameContainerEl) return;

    gameContainerEl.innerHTML = '';
    gameContainerEl.className = 'superlative-game';

    // Prompt section
    const promptEl = document.createElement('div');
    promptEl.className = 'superlative-game__prompt';
    promptEl.innerHTML = `
        <h2 class="superlative-game__title">Which Award Did You Win?</h2>
        <p class="superlative-game__subtitle">
            Pick the superlative you think you earned this season
        </p>
    `;
    gameContainerEl.appendChild(promptEl);

    // Cards container
    const cardsEl = document.createElement('div');
    cardsEl.className = 'superlative-game__cards';

    // Render each option as a face-down card
    SuperlativeGameState.options.forEach((option, index) => {
        const cardEl = createSuperlativeCard(option, index);
        cardsEl.appendChild(cardEl);
    });

    gameContainerEl.appendChild(cardsEl);
}

/**
 * Create a superlative card element for the game
 * @param {Object} option - Superlative option data
 * @param {number} index - Card index
 * @returns {HTMLElement} Card element
 */
function createSuperlativeCard(option, index) {
    const cardEl = document.createElement('div');
    cardEl.className = `card ${option.rarity?.class || 'card--common'}`;
    cardEl.dataset.index = index;
    cardEl.dataset.superlativeId = option.id;

    // Card inner for 3D flip
    const innerEl = document.createElement('div');
    innerEl.className = 'card__inner';

    // Card back (face-down state) - shows title hint
    const backEl = document.createElement('div');
    backEl.className = 'card__face card__back';
    backEl.innerHTML = `
        <div class="card__back-logo">${option.icon}</div>
        <div class="card__back-title">${option.title}</div>
    `;

    // Card front (revealed state)
    const frontEl = document.createElement('div');
    frontEl.className = 'card__face card__front card--superlative';

    // Image container with icon
    const imageContainerEl = document.createElement('div');
    imageContainerEl.className = 'card__image-container';
    imageContainerEl.innerHTML = `
        <div class="card__icon" style="font-size: 4rem;">${option.icon}</div>
        <div class="card__rarity">${option.rarity?.name || 'Common'}</div>
    `;

    // Info section
    const infoEl = document.createElement('div');
    infoEl.className = 'card__info';
    infoEl.innerHTML = `
        <div class="card__name">${option.title}</div>
        <div class="card__type">${option.description}</div>
        ${option.flavorText ? `<div class="card__flavor">${option.flavorText}</div>` : ''}
    `;

    frontEl.appendChild(imageContainerEl);
    frontEl.appendChild(infoEl);

    // Assemble card
    innerEl.appendChild(backEl);
    innerEl.appendChild(frontEl);
    cardEl.appendChild(innerEl);

    // Add click handler
    cardEl.addEventListener('click', () => handleCardSelect(cardEl, option, index));

    // Add entrance animation
    cardEl.classList.add('card--entering');
    cardEl.style.animationDelay = `${index * 100}ms`;

    return cardEl;
}

/**
 * Render the result after user makes a selection
 * @param {boolean} correct - Whether the guess was correct
 * @param {Object} selectedOption - The option the user selected
 */
function renderResult(correct, selectedOption) {
    // Find or create result element
    let resultEl = gameContainerEl.querySelector('.superlative-game__result');

    if (!resultEl) {
        resultEl = document.createElement('div');
        resultEl.className = 'superlative-game__result';
        gameContainerEl.appendChild(resultEl);
    }

    if (correct) {
        resultEl.className = 'superlative-game__result superlative-game__result--correct';
        resultEl.innerHTML = `
            <div class="superlative-game__result-icon">🎉</div>
            <div class="superlative-game__result-text">
                You got it! You earned the <strong>${selectedOption.title}</strong> award!
            </div>
        `;
    } else {
        // Find the correct answer(s)
        const correctOptions = SuperlativeGameState.userSuperlatives;
        const correctNames = correctOptions.map(o => o.title).join(', ');

        resultEl.className = 'superlative-game__result superlative-game__result--wrong';
        resultEl.innerHTML = `
            <div class="superlative-game__result-icon">😅</div>
            <div class="superlative-game__result-text">
                Not quite! You actually earned: <strong>${correctNames || 'No superlatives this season'}</strong>
            </div>
        `;
    }

    // Add continue button
    const continueBtn = document.createElement('button');
    continueBtn.className = 'btn';
    continueBtn.style.marginTop = '20px';
    continueBtn.textContent = 'Continue';
    continueBtn.addEventListener('click', handleContinue);
    resultEl.appendChild(continueBtn);
}


/* ===== EVENT HANDLERS ===== */

/**
 * Handle card selection
 * @param {HTMLElement} cardEl - Selected card element
 * @param {Object} option - Selected option data
 * @param {number} index - Card index
 */
function handleCardSelect(cardEl, option, index) {
    if (SuperlativeGameState.phase !== 'selecting') return;

    console.log('[SuperlativeGame] Selected:', option.title);

    SuperlativeGameState.selectedOption = option;
    SuperlativeGameState.phase = 'revealed';

    // Flip the selected card
    cardEl.classList.add('flipped');

    // Add selection highlight
    cardEl.style.transform = 'scale(1.1)';
    cardEl.style.zIndex = '10';

    // Add rarity reveal effect
    if (option.rarity?.id && option.rarity.id !== 'common') {
        cardEl.classList.add(`rarity-reveal--${option.rarity.id}`);
    }

    // Disable other cards
    const allCards = gameContainerEl.querySelectorAll('.card');
    allCards.forEach(card => {
        if (card !== cardEl) {
            card.style.opacity = '0.5';
            card.style.pointerEvents = 'none';
        }
    });

    // Check if correct
    const isCorrect = option.isCorrect;

    if (isCorrect) {
        SuperlativeGameState.correctGuesses++;
        // Celebration effect
        cardEl.classList.add('correct-guess');
    } else {
        // Show the correct answer
        revealCorrectAnswers();
    }

    // Show result after animation
    setTimeout(() => {
        renderResult(isCorrect, option);
    }, 800);
}

/**
 * Reveal the correct answer cards
 */
function revealCorrectAnswers() {
    const allCards = gameContainerEl.querySelectorAll('.card');

    allCards.forEach(cardEl => {
        const supId = cardEl.dataset.superlativeId;
        const option = SuperlativeGameState.options.find(o => o.id === supId);

        if (option?.isCorrect) {
            // Flip and highlight correct card
            cardEl.classList.add('flipped');
            cardEl.style.opacity = '1';
            cardEl.classList.add('correct-answer');

            // Add green glow
            cardEl.style.boxShadow = '0 0 30px rgba(34, 197, 94, 0.5)';
        }
    });
}

/**
 * Handle continue button click
 */
function handleContinue() {
    SuperlativeGameState.phase = 'complete';

    // Emit completion event
    const event = new CustomEvent('superlativeGame:complete', {
        detail: {
            correct: SuperlativeGameState.correctGuesses > 0,
            guesses: SuperlativeGameState.correctGuesses,
            selected: SuperlativeGameState.selectedOption,
            actual: SuperlativeGameState.userSuperlatives
        }
    });
    document.dispatchEvent(event);
}


/* ===== UTILITY FUNCTIONS ===== */

/**
 * Determine user's superlatives based on wrapped data and league awards.
 * Uses the backend-computed awards system (16 awards) — checks which awards
 * belong to this team and maps them to CardBuilder SUPERLATIVES constants.
 *
 * @param {Object} wrappedData - Wrapped data from API
 * @param {Object} leagueStats - League-wide statistics (includes .awards)
 * @returns {Array} Array of earned superlative objects
 */
function determineUserSuperlatives(wrappedData, leagueStats) {
    const superlatives = [];
    const teamId = wrappedData.team_id;
    const awards = leagueStats.awards || {};

    // Map backend award IDs to CardBuilder SUPERLATIVE keys
    const AWARD_MAP = {
        'clown':        { key: 'CLOWN' },
        'speedrunner':  { key: 'SPEEDRUNNER' },
        'snail':        { key: 'SNAIL' },
        'sniper':       { key: 'SNIPER' },
        'draft_king':   { key: 'DRAFT_KING' },
        'blue_chip':    { key: 'BLUE_CHIP' },
        'skull':        { key: 'SKULL' },
        'dice_roll':    { key: 'DICE_ROLL' },
        'top_heavy':    { key: 'TOP_HEAVY' },
        'bench_warmer': { key: 'BENCH_WARMER' },
        'lucky':        { key: 'LUCKY' },
        'unlucky':      { key: 'UNLUCKY' },
        'heartbreak':   { key: 'HEARTBREAK' },
        'perfect_club': { key: 'PERFECT_CLUB' },
        'best_manager': { key: 'BEST_MANAGER' },
        'worst_manager':{ key: 'WORST_MANAGER' },
    };

    for (const [awardId, awardData] of Object.entries(awards)) {
        if (awardData.team_id !== teamId) continue;
        const mapping = AWARD_MAP[awardId];
        if (!mapping) continue;
        const supDef = CardBuilder.SUPERLATIVES[mapping.key];
        if (!supDef) continue;

        superlatives.push({
            ...supDef,
            flavorText: awardData.description || '',
            statValue: awardData.value,
        });
    }

    // If no superlatives earned, give them a participation trophy
    if (superlatives.length === 0) {
        superlatives.push({
            id: 'participant',
            icon: '🏅',
            title: 'Participant',
            description: 'You showed up this season',
            vibe: 'neutral',
            rarity: CardBuilder.RARITY.COMMON,
            flavorText: 'Hey, at least you tried.'
        });
    }

    return superlatives;
}


/* ===== PUBLIC API ===== */

/**
 * Start the superlative guessing game
 * @param {Object} wrappedData - Wrapped data from API
 * @param {HTMLElement} container - Container to render into
 */
function startSuperlativeGame(wrappedData, container) {
    const leagueStats = wrappedData.league_context || {};
    const userSuperlatives = determineUserSuperlatives(wrappedData, leagueStats);

    initSuperlativeGame(userSuperlatives, leagueStats, container);
}


/* ===== EXPORTS ===== */

window.SuperlativeGame = {
    start: startSuperlativeGame,
    init: initSuperlativeGame,
    determineUserSuperlatives,
    state: SuperlativeGameState
};
