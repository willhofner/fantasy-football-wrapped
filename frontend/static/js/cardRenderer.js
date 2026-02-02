/**
 * ============================================================================
 * FANTASY WRAPPED - CARD RENDERER
 * ============================================================================
 *
 * Generates HTML markup for cards based on card objects from CardBuilder.
 * Handles different card types (player, moment, superlative) and rarity effects.
 *
 * ============================================================================
 */


/* ===== CONSTANTS ===== */

/**
 * Player image cache to avoid duplicate fetches
 */
const playerImageCache = new Map();


/* ===== IMAGE UTILITIES ===== */

/**
 * Get player headshot URL from ESPN
 * Uses the search API to find the player and extract their image
 * @param {string} playerName - Player's full name
 * @returns {Promise<string|null>} Image URL or null if not found
 */
async function fetchPlayerImage(playerName) {
    // Check cache first
    if (playerImageCache.has(playerName)) {
        return playerImageCache.get(playerName);
    }

    try {
        // Use ESPN search API
        const searchUrl = `https://site.web.api.espn.com/apis/common/v3/search?query=${encodeURIComponent(playerName)}&limit=1&mode=prefix&type=player&sport=football`;
        const response = await fetch(searchUrl);

        if (!response.ok) {
            throw new Error('ESPN search failed');
        }

        const data = await response.json();

        if (data.items && data.items.length > 0 && data.items[0].image) {
            const imageUrl = data.items[0].image;
            playerImageCache.set(playerName, imageUrl);
            return imageUrl;
        }
    } catch (error) {
        console.warn(`Could not fetch image for ${playerName}:`, error);
    }

    // Return null if not found
    playerImageCache.set(playerName, null);
    return null;
}

/**
 * Generate a placeholder image URL using UI Avatars
 * @param {string} name - Name to generate initials from
 * @returns {string} Placeholder image URL
 */
function getPlaceholderImageUrl(name) {
    const initials = name
        .split(' ')
        .map(n => n[0])
        .join('')
        .substring(0, 2)
        .toUpperCase();

    return `https://ui-avatars.com/api/?name=${encodeURIComponent(initials)}&background=252530&color=fff&size=200&bold=true`;
}


/* ===== CARD RENDERERS ===== */

/**
 * Render a complete card element
 * @param {Object} card - Card object from CardBuilder
 * @param {Object} options - Rendering options
 * @returns {Promise<HTMLElement>} Card DOM element
 */
async function renderCard(card, options = {}) {
    const {
        flipped = false,
        interactive = true,
        size = 'normal' // 'small', 'normal', 'large'
    } = options;

    // Create card container
    const cardEl = document.createElement('div');
    cardEl.className = `card ${card.rarity.class}`;
    cardEl.dataset.cardId = card.id;
    cardEl.dataset.rarity = card.rarity.id;
    cardEl.dataset.type = card.type;

    if (card.cardClass) {
        cardEl.classList.add(...card.cardClass.split(' '));
    }

    if (flipped) {
        cardEl.classList.add('flipped');
    }

    // Create inner container for 3D flip
    const innerEl = document.createElement('div');
    innerEl.className = 'card__inner';

    // Create back face
    const backEl = renderCardBack(card);

    // Create front face based on card type
    let frontEl;
    switch (card.type) {
        case 'player':
            frontEl = await renderPlayerCardFront(card);
            break;
        case 'moment':
            frontEl = await renderMomentCardFront(card);
            break;
        case 'superlative':
            frontEl = renderSuperlativeCardFront(card);
            break;
        case 'overview':
            frontEl = renderOverviewCardFront(card);
            break;
        default:
            frontEl = renderGenericCardFront(card);
    }

    // Assemble card
    innerEl.appendChild(backEl);
    innerEl.appendChild(frontEl);
    cardEl.appendChild(innerEl);

    // Add click handler for flip if interactive
    if (interactive) {
        cardEl.addEventListener('click', () => handleCardClick(cardEl, card));
    }

    return cardEl;
}

/**
 * Render card back (shared across all card types)
 * @param {Object} card - Card object
 * @returns {HTMLElement} Card back element
 */
function renderCardBack(card) {
    const backEl = document.createElement('div');
    backEl.className = 'card__face card__back';

    // Logo/icon
    const logoEl = document.createElement('div');
    logoEl.className = 'card__back-logo';
    logoEl.textContent = '🏈';

    backEl.appendChild(logoEl);

    return backEl;
}

/**
 * Render player card front
 * @param {Object} card - Player card object
 * @returns {Promise<HTMLElement>} Card front element
 */
async function renderPlayerCardFront(card) {
    const frontEl = document.createElement('div');
    frontEl.className = 'card__face card__front';

    // Image container
    const imageContainerEl = document.createElement('div');
    imageContainerEl.className = 'card__image-container';

    // Player image
    const imgEl = document.createElement('img');
    imgEl.className = 'card__image';
    imgEl.alt = card.player.name;

    // Try to fetch player image
    const imageUrl = await fetchPlayerImage(card.player.name);
    imgEl.src = imageUrl || getPlaceholderImageUrl(card.player.name);
    imgEl.onerror = () => {
        imgEl.src = getPlaceholderImageUrl(card.player.name);
    };

    imageContainerEl.appendChild(imgEl);

    // Position badge
    if (card.player.position) {
        const posEl = document.createElement('div');
        posEl.className = 'card__position';
        posEl.textContent = card.player.position;
        imageContainerEl.appendChild(posEl);
    }

    // Rarity badge
    const rarityEl = document.createElement('div');
    rarityEl.className = 'card__rarity';
    rarityEl.textContent = card.rarity.name;
    imageContainerEl.appendChild(rarityEl);

    frontEl.appendChild(imageContainerEl);

    // Info section
    const infoEl = document.createElement('div');
    infoEl.className = 'card__info';

    // Player name
    const nameEl = document.createElement('div');
    nameEl.className = 'card__name';
    nameEl.textContent = card.player.name;
    infoEl.appendChild(nameEl);

    // Card type
    const typeEl = document.createElement('div');
    typeEl.className = 'card__type';
    typeEl.textContent = card.title;
    infoEl.appendChild(typeEl);

    // Stats grid
    if (card.stats && card.stats.length > 0) {
        const statsEl = renderStatsGrid(card.stats);
        infoEl.appendChild(statsEl);
    }

    // Flavor text
    if (card.flavorText) {
        const flavorEl = document.createElement('div');
        flavorEl.className = 'card__flavor';
        flavorEl.textContent = card.flavorText;
        infoEl.appendChild(flavorEl);
    }

    frontEl.appendChild(infoEl);

    return frontEl;
}

/**
 * Render moment card front
 * @param {Object} card - Moment card object
 * @returns {HTMLElement} Card front element
 */
async function renderMomentCardFront(card) {
    const frontEl = document.createElement('div');
    frontEl.className = 'card__face card__front card--moment';

    // Image container (matchup display)
    const imageContainerEl = document.createElement('div');
    imageContainerEl.className = 'card__image-container';

    // Week label
    const weekEl = document.createElement('div');
    weekEl.className = 'card__week';
    weekEl.textContent = card.subtitle || `Week ${card.moment?.week}`;
    imageContainerEl.appendChild(weekEl);

    // Matchup display
    if (card.moment) {
        const matchupEl = document.createElement('div');
        matchupEl.className = 'card__matchup';

        // Your score
        const yourTeamEl = document.createElement('div');
        yourTeamEl.className = 'card__team';
        yourTeamEl.innerHTML = `
            <div class="card__score">${formatScore(card.moment.yourScore)}</div>
            <div class="card__team-name">You</div>
        `;

        // VS
        const vsEl = document.createElement('div');
        vsEl.className = 'card__vs';
        vsEl.textContent = 'vs';

        // Opponent score
        const oppTeamEl = document.createElement('div');
        oppTeamEl.className = 'card__team';
        oppTeamEl.innerHTML = `
            <div class="card__score">${formatScore(card.moment.oppScore)}</div>
            <div class="card__team-name">${truncateName(card.moment.opponent, 12)}</div>
        `;

        matchupEl.appendChild(yourTeamEl);
        matchupEl.appendChild(vsEl);
        matchupEl.appendChild(oppTeamEl);
        imageContainerEl.appendChild(matchupEl);

        // Outcome badge
        const outcomeEl = document.createElement('div');
        outcomeEl.className = `card__outcome card__outcome--${card.moment.outcome}`;
        outcomeEl.textContent = card.moment.outcome.toUpperCase();
        imageContainerEl.appendChild(outcomeEl);
    }

    // Rarity badge
    const rarityEl = document.createElement('div');
    rarityEl.className = 'card__rarity';
    rarityEl.textContent = card.rarity.name;
    imageContainerEl.appendChild(rarityEl);

    frontEl.appendChild(imageContainerEl);

    // Info section
    const infoEl = document.createElement('div');
    infoEl.className = 'card__info';

    // Card title
    const nameEl = document.createElement('div');
    nameEl.className = 'card__name';
    nameEl.textContent = card.title;
    infoEl.appendChild(nameEl);

    // Stats grid
    if (card.stats && card.stats.length > 0) {
        const statsEl = renderStatsGrid(card.stats);
        infoEl.appendChild(statsEl);
    }

    // Flavor text
    if (card.flavorText) {
        const flavorEl = document.createElement('div');
        flavorEl.className = 'card__flavor';
        flavorEl.textContent = card.flavorText;
        infoEl.appendChild(flavorEl);
    }

    frontEl.appendChild(infoEl);

    return frontEl;
}

/**
 * Render superlative card front
 * @param {Object} card - Superlative card object
 * @returns {HTMLElement} Card front element
 */
function renderSuperlativeCardFront(card) {
    const frontEl = document.createElement('div');
    frontEl.className = 'card__face card__front card--superlative';

    // Image container (icon display)
    const imageContainerEl = document.createElement('div');
    imageContainerEl.className = 'card__image-container';

    // Large icon
    const iconEl = document.createElement('div');
    iconEl.className = 'card__icon';
    iconEl.textContent = card.icon;
    imageContainerEl.appendChild(iconEl);

    // Rarity badge
    const rarityEl = document.createElement('div');
    rarityEl.className = 'card__rarity';
    rarityEl.textContent = card.rarity.name;
    imageContainerEl.appendChild(rarityEl);

    frontEl.appendChild(imageContainerEl);

    // Info section
    const infoEl = document.createElement('div');
    infoEl.className = 'card__info';

    // Award title
    const nameEl = document.createElement('div');
    nameEl.className = 'card__name';
    nameEl.textContent = card.title;
    infoEl.appendChild(nameEl);

    // Award description
    const typeEl = document.createElement('div');
    typeEl.className = 'card__type';
    typeEl.textContent = card.description;
    infoEl.appendChild(typeEl);

    // Stats grid
    if (card.stats && card.stats.length > 0) {
        const statsEl = renderStatsGrid(card.stats);
        infoEl.appendChild(statsEl);
    }

    // Flavor text
    if (card.flavorText) {
        const flavorEl = document.createElement('div');
        flavorEl.className = 'card__flavor';
        flavorEl.textContent = card.flavorText;
        infoEl.appendChild(flavorEl);
    }

    frontEl.appendChild(infoEl);

    return frontEl;
}

/**
 * Render overview card front
 * @param {Object} card - Overview card object
 * @returns {HTMLElement} Card front element
 */
function renderOverviewCardFront(card) {
    const frontEl = document.createElement('div');
    frontEl.className = 'card__face card__front';

    // Image container (season branding)
    const imageContainerEl = document.createElement('div');
    imageContainerEl.className = 'card__image-container';
    imageContainerEl.style.display = 'flex';
    imageContainerEl.style.flexDirection = 'column';
    imageContainerEl.style.alignItems = 'center';
    imageContainerEl.style.justifyContent = 'center';
    imageContainerEl.style.background = 'radial-gradient(ellipse at center, #252530 0%, #14141c 70%)';

    // Season icon
    const iconEl = document.createElement('div');
    iconEl.className = 'card__icon';
    iconEl.textContent = '🏈';
    iconEl.style.fontSize = '4rem';
    imageContainerEl.appendChild(iconEl);

    // Season year
    const yearEl = document.createElement('div');
    yearEl.style.fontSize = 'var(--text-3xl)';
    yearEl.style.fontWeight = '800';
    yearEl.style.marginTop = 'var(--space-3)';
    yearEl.textContent = card.subtitle || '2024 Season';
    imageContainerEl.appendChild(yearEl);

    // Rarity badge
    const rarityEl = document.createElement('div');
    rarityEl.className = 'card__rarity';
    rarityEl.textContent = card.rarity.name;
    imageContainerEl.appendChild(rarityEl);

    frontEl.appendChild(imageContainerEl);

    // Info section
    const infoEl = document.createElement('div');
    infoEl.className = 'card__info';

    // Team name
    const nameEl = document.createElement('div');
    nameEl.className = 'card__name';
    nameEl.textContent = card.title;
    infoEl.appendChild(nameEl);

    // Type label
    const typeEl = document.createElement('div');
    typeEl.className = 'card__type';
    typeEl.textContent = 'Season Overview';
    infoEl.appendChild(typeEl);

    // Stats grid
    if (card.stats && card.stats.length > 0) {
        const statsEl = renderStatsGrid(card.stats);
        infoEl.appendChild(statsEl);
    }

    // Flavor text
    if (card.flavorText) {
        const flavorEl = document.createElement('div');
        flavorEl.className = 'card__flavor';
        flavorEl.textContent = card.flavorText;
        infoEl.appendChild(flavorEl);
    }

    frontEl.appendChild(infoEl);

    return frontEl;
}

/**
 * Render generic card front (fallback)
 * @param {Object} card - Card object
 * @returns {HTMLElement} Card front element
 */
function renderGenericCardFront(card) {
    const frontEl = document.createElement('div');
    frontEl.className = 'card__face card__front';

    // Simple content display
    const contentEl = document.createElement('div');
    contentEl.className = 'card__info';
    contentEl.style.height = '100%';
    contentEl.style.justifyContent = 'center';

    const titleEl = document.createElement('div');
    titleEl.className = 'card__name';
    titleEl.textContent = card.title;
    contentEl.appendChild(titleEl);

    if (card.flavorText) {
        const flavorEl = document.createElement('div');
        flavorEl.className = 'card__flavor';
        flavorEl.textContent = card.flavorText;
        contentEl.appendChild(flavorEl);
    }

    frontEl.appendChild(contentEl);

    return frontEl;
}


/* ===== HELPER RENDERERS ===== */

/**
 * Render stats grid
 * @param {Array} stats - Array of stat objects
 * @returns {HTMLElement} Stats grid element
 */
function renderStatsGrid(stats) {
    const gridEl = document.createElement('div');
    gridEl.className = 'card__stats';

    stats.forEach(stat => {
        const statEl = document.createElement('div');
        statEl.className = 'card__stat';
        if (stat.highlight) {
            statEl.classList.add('card__stat--highlight');
        }

        const valueEl = document.createElement('div');
        valueEl.className = 'card__stat-value';
        valueEl.textContent = stat.value;

        const labelEl = document.createElement('div');
        labelEl.className = 'card__stat-label';
        labelEl.textContent = stat.label;

        statEl.appendChild(valueEl);
        statEl.appendChild(labelEl);
        gridEl.appendChild(statEl);
    });

    return gridEl;
}


/* ===== EVENT HANDLERS ===== */

/**
 * Handle card click for flip animation
 * @param {HTMLElement} cardEl - Card DOM element
 * @param {Object} card - Card data object
 */
function handleCardClick(cardEl, card) {
    // Don't flip if already flipped
    if (cardEl.classList.contains('flipped')) {
        // Emit event for card inspection
        const event = new CustomEvent('card:inspect', { detail: { card, element: cardEl } });
        document.dispatchEvent(event);
        return;
    }

    // Add flipping class for animation
    cardEl.classList.add('flipping');

    // Add rarity reveal effect
    if (card.rarity.id !== 'common') {
        cardEl.classList.add(`rarity-reveal--${card.rarity.id}`);

        // Screen shake for legendary
        if (card.rarity.id === 'legendary') {
            document.body.classList.add('legendary-shake');
            setTimeout(() => document.body.classList.remove('legendary-shake'), 500);
        }
    }

    // Trigger flip
    cardEl.classList.add('flipped');

    // Emit flip event
    const event = new CustomEvent('card:flip', { detail: { card, element: cardEl } });
    document.dispatchEvent(event);

    // Clean up animation classes
    setTimeout(() => {
        cardEl.classList.remove('flipping');
        cardEl.classList.remove(`rarity-reveal--${card.rarity.id}`);
    }, 800);
}


/* ===== UTILITY FUNCTIONS ===== */

/**
 * Format a score for display
 * @param {number} score - Score value
 * @returns {string} Formatted score
 */
function formatScore(score) {
    if (typeof score !== 'number') return score;
    return score % 1 === 0 ? score.toString() : score.toFixed(1);
}

/**
 * Truncate a name to fit in the card
 * @param {string} name - Name to truncate
 * @param {number} maxLength - Maximum length
 * @returns {string} Truncated name
 */
function truncateName(name, maxLength = 15) {
    if (!name) return '';
    if (name.length <= maxLength) return name;
    return name.substring(0, maxLength - 1) + '…';
}


/* ===== BATCH RENDERING ===== */

/**
 * Render multiple cards
 * @param {Array} cards - Array of card objects
 * @param {Object} options - Rendering options
 * @returns {Promise<Array<HTMLElement>>} Array of card DOM elements
 */
async function renderCards(cards, options = {}) {
    const renderedCards = await Promise.all(
        cards.map(card => renderCard(card, options))
    );
    return renderedCards;
}


/* ===== EXPORTS ===== */

window.CardRenderer = {
    renderCard,
    renderCards,
    fetchPlayerImage,
    getPlaceholderImageUrl
};
