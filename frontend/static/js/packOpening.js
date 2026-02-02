/**
 * ============================================================================
 * FANTASY WRAPPED - PACK OPENING EXPERIENCE
 * ============================================================================
 *
 * Orchestrates the collectible card pack opening sequence:
 * 1. Pack presentation and shake animation
 * 2. Pack tear/open animation
 * 3. Sequential card reveal with flip animations
 * 4. Rarity celebration effects
 * 5. Collection gallery view
 *
 * Dependencies:
 * - CardBuilder (cardBuilder.js)
 * - CardRenderer (cardRenderer.js)
 *
 * ============================================================================
 */


/* ===== STATE ===== */

/**
 * Pack opening state management
 */
const PackState = {
    // Current wrapped data
    wrappedData: null,

    // All cards in the pack
    cards: [],

    // Currently revealed cards
    revealedCards: [],

    // Current card index being revealed
    currentIndex: 0,

    // Experience phase: 'idle' | 'pack' | 'revealing' | 'gallery'
    phase: 'idle',

    // Pack has been opened
    packOpened: false
};


/* ===== DOM REFERENCES ===== */

let packExperienceEl = null;
let packEl = null;
let cardRevealEl = null;
let cardGalleryEl = null;


/* ===== INITIALIZATION ===== */

/**
 * Initialize the pack opening experience
 * @param {Object} wrappedData - Wrapped data from API
 */
async function initPackExperience(wrappedData) {
    console.log('[PackOpening] Initializing with data:', wrappedData);

    // Store data
    PackState.wrappedData = wrappedData;
    PackState.phase = 'idle';
    PackState.packOpened = false;
    PackState.currentIndex = 0;
    PackState.revealedCards = [];

    // Build card pack
    PackState.cards = CardBuilder.buildCardPack(wrappedData);
    console.log('[PackOpening] Built cards:', PackState.cards.length);

    // Create DOM structure if needed
    createPackExperienceDOM();

    // Show pack presentation
    showPackPresentation();
}

/**
 * Create the DOM structure for pack experience
 */
function createPackExperienceDOM() {
    // Check if already exists
    if (document.getElementById('packExperience')) {
        packExperienceEl = document.getElementById('packExperience');
        packEl = document.getElementById('pack');
        cardRevealEl = document.getElementById('cardReveal');
        cardGalleryEl = document.getElementById('cardGallery');
        return;
    }

    // Create container
    packExperienceEl = document.createElement('div');
    packExperienceEl.id = 'packExperience';
    packExperienceEl.className = 'pack-experience';

    // Create pack element
    packEl = document.createElement('div');
    packEl.id = 'pack';
    packEl.className = 'pack';
    packEl.innerHTML = `
        <div class="pack__wrapper">
            <div class="pack__tear-line"></div>
            <div class="pack__preview">
                <div class="pack__preview-card"></div>
                <div class="pack__preview-card"></div>
                <div class="pack__preview-card"></div>
            </div>
            <div class="pack__branding">
                <div class="pack__logo">🏈</div>
                <div class="pack__title">Fantasy Wrapped</div>
                <div class="pack__subtitle">Season Pack</div>
            </div>
        </div>
    `;

    // Create card reveal container
    cardRevealEl = document.createElement('div');
    cardRevealEl.id = 'cardReveal';
    cardRevealEl.className = 'card-reveal';
    cardRevealEl.style.display = 'none';

    // Create card gallery container
    cardGalleryEl = document.createElement('div');
    cardGalleryEl.id = 'cardGallery';
    cardGalleryEl.className = 'card-gallery';
    cardGalleryEl.style.display = 'none';

    // Create navigation
    const navEl = document.createElement('div');
    navEl.className = 'pack-nav';
    navEl.innerHTML = `
        <button class="pack-nav__btn" id="packNavBack" style="display: none;">Back</button>
        <button class="pack-nav__btn pack-nav__btn--primary" id="packNavNext">Tap Pack to Open</button>
    `;

    // Create background particles
    const particlesEl = document.createElement('div');
    particlesEl.className = 'pack-experience__particles';
    particlesEl.id = 'packParticles';

    // Assemble
    packExperienceEl.appendChild(particlesEl);
    packExperienceEl.appendChild(packEl);
    packExperienceEl.appendChild(cardRevealEl);
    packExperienceEl.appendChild(cardGalleryEl);
    packExperienceEl.appendChild(navEl);

    // Add to body
    document.body.appendChild(packExperienceEl);

    // Setup event listeners
    setupEventListeners();

    // Create particles
    createBackgroundParticles();
}

/**
 * Setup event listeners for pack interaction
 */
function setupEventListeners() {
    // Pack click
    packEl.addEventListener('click', handlePackClick);

    // Navigation buttons
    document.getElementById('packNavNext').addEventListener('click', handleNextClick);
    document.getElementById('packNavBack').addEventListener('click', handleBackClick);

    // Card flip events
    document.addEventListener('card:flip', handleCardFlip);
}

/**
 * Create floating background particles
 */
function createBackgroundParticles() {
    const container = document.getElementById('packParticles');
    if (!container) return;

    // Clear existing
    container.innerHTML = '';

    // Create particles
    for (let i = 0; i < 20; i++) {
        const particle = document.createElement('div');
        particle.className = 'particle';
        particle.style.left = `${Math.random() * 100}%`;
        particle.style.animationDelay = `${Math.random() * 10}s`;
        particle.style.animationDuration = `${8 + Math.random() * 6}s`;
        container.appendChild(particle);
    }
}


/* ===== PHASE MANAGEMENT ===== */

/**
 * Show pack presentation (sealed pack view)
 */
function showPackPresentation() {
    PackState.phase = 'pack';

    // Show experience container
    packExperienceEl.classList.add('active');

    // Hide setup container
    const setupContainer = document.getElementById('setupContainer');
    if (setupContainer) {
        setupContainer.style.display = 'none';
    }

    // Hide slides container
    const wrappedContainer = document.getElementById('wrappedContainer');
    if (wrappedContainer) {
        wrappedContainer.style.display = 'none';
    }

    // Show pack, hide others
    packEl.style.display = 'block';
    cardRevealEl.style.display = 'none';
    cardGalleryEl.style.display = 'none';

    // Update nav
    updateNavigation();
}

/**
 * Start card reveal sequence
 */
async function startCardReveal() {
    PackState.phase = 'revealing';
    PackState.currentIndex = 0;

    // Hide pack, show reveal
    packEl.style.display = 'none';
    cardRevealEl.style.display = 'flex';
    cardGalleryEl.style.display = 'none';

    // Clear previous cards
    cardRevealEl.innerHTML = '';

    // Show first card
    await showCurrentCard();

    // Update nav
    updateNavigation();
}

/**
 * Show current card in reveal sequence
 */
async function showCurrentCard() {
    const card = PackState.cards[PackState.currentIndex];
    if (!card) return;

    // Clear reveal area
    cardRevealEl.innerHTML = '';

    // Render card (face down)
    const cardEl = await CardRenderer.renderCard(card, { flipped: false });
    cardEl.classList.add('card--entering');

    // Add instruction
    const instructionEl = document.createElement('div');
    instructionEl.className = 'card-reveal__instruction';
    instructionEl.textContent = 'Tap to reveal';

    // Add progress dots
    const progressEl = createProgressDots();

    // Add continue button (hidden initially)
    const continueEl = document.createElement('button');
    continueEl.className = 'card-reveal__continue';
    continueEl.textContent = PackState.currentIndex < PackState.cards.length - 1 ? 'Next Card' : 'View Collection';
    continueEl.addEventListener('click', handleContinueClick);

    // Assemble
    cardRevealEl.appendChild(cardEl);
    cardRevealEl.appendChild(instructionEl);
    cardRevealEl.appendChild(progressEl);
    cardRevealEl.appendChild(continueEl);
}

/**
 * Show gallery view of all revealed cards
 */
async function showGallery() {
    PackState.phase = 'gallery';

    // Hide others, show gallery
    packEl.style.display = 'none';
    cardRevealEl.style.display = 'none';
    cardGalleryEl.style.display = 'grid';

    // Clear and rebuild gallery
    cardGalleryEl.innerHTML = '';

    // Header
    const headerEl = document.createElement('div');
    headerEl.className = 'card-gallery__header';
    headerEl.innerHTML = `
        <h2 class="card-gallery__title">Your Collection</h2>
        <p class="card-gallery__subtitle">${PackState.cards.length} cards from your ${PackState.wrappedData?.league_context?.year || 2024} season</p>
    `;
    cardGalleryEl.appendChild(headerEl);

    // Filter buttons
    const filtersEl = document.createElement('div');
    filtersEl.className = 'card-gallery__filters';
    filtersEl.innerHTML = `
        <button class="card-gallery__filter active" data-filter="all">All</button>
        <button class="card-gallery__filter" data-filter="legendary">Legendary</button>
        <button class="card-gallery__filter" data-filter="epic">Epic</button>
        <button class="card-gallery__filter" data-filter="rare">Rare</button>
    `;

    // Add filter event listeners
    filtersEl.querySelectorAll('.card-gallery__filter').forEach(btn => {
        btn.addEventListener('click', handleFilterClick);
    });

    cardGalleryEl.appendChild(filtersEl);

    // Render all cards (face up)
    for (const card of PackState.cards) {
        const cardEl = await CardRenderer.renderCard(card, { flipped: true, interactive: true });
        cardEl.classList.add('card--entering');
        cardGalleryEl.appendChild(cardEl);
    }

    // Update nav
    updateNavigation();
}


/* ===== EVENT HANDLERS ===== */

/**
 * Handle pack click
 */
function handlePackClick() {
    if (PackState.packOpened) return;

    // First click - shake animation
    if (!packEl.classList.contains('pack--ready')) {
        packEl.classList.add('pack--ready');
        document.getElementById('packNavNext').textContent = 'Tap Again to Open';
        return;
    }

    // Second click - open pack
    PackState.packOpened = true;
    packEl.classList.add('pack--opening');

    // Start card reveal after animation
    setTimeout(() => {
        startCardReveal();
    }, 800);
}

/**
 * Handle card flip event
 * @param {CustomEvent} event - Card flip event
 */
function handleCardFlip(event) {
    const { card, element } = event.detail;

    // Show continue button
    const continueBtn = cardRevealEl.querySelector('.card-reveal__continue');
    if (continueBtn) {
        continueBtn.classList.add('visible');
    }

    // Hide instruction
    const instruction = cardRevealEl.querySelector('.card-reveal__instruction');
    if (instruction) {
        instruction.style.display = 'none';
    }

    // Mark progress dot as complete
    const dots = cardRevealEl.querySelectorAll('.card-reveal__dot');
    if (dots[PackState.currentIndex]) {
        dots[PackState.currentIndex].classList.remove('active');
        dots[PackState.currentIndex].classList.add('complete');
    }

    // Track revealed card
    PackState.revealedCards.push(card);
}

/**
 * Handle continue button click
 */
async function handleContinueClick() {
    PackState.currentIndex++;

    if (PackState.currentIndex >= PackState.cards.length) {
        // All cards revealed, show gallery
        showGallery();
    } else {
        // Show next card
        await showCurrentCard();
    }
}

/**
 * Handle next navigation button
 */
function handleNextClick() {
    switch (PackState.phase) {
        case 'pack':
            // Simulate pack click
            handlePackClick();
            break;
        case 'revealing':
            // Skip to gallery
            showGallery();
            break;
        case 'gallery':
            // Close experience
            closePackExperience();
            break;
    }
}

/**
 * Handle back navigation button
 */
function handleBackClick() {
    switch (PackState.phase) {
        case 'revealing':
            // Go back to pack (reset)
            resetPackExperience();
            break;
        case 'gallery':
            // Go back to reveal (last card)
            PackState.currentIndex = PackState.cards.length - 1;
            startCardReveal();
            break;
    }
}

/**
 * Handle gallery filter click
 * @param {Event} event - Click event
 */
function handleFilterClick(event) {
    const filter = event.target.dataset.filter;

    // Update active state
    document.querySelectorAll('.card-gallery__filter').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.filter === filter);
    });

    // Filter cards
    document.querySelectorAll('.card-gallery .card').forEach(cardEl => {
        if (filter === 'all') {
            cardEl.style.display = 'block';
        } else {
            const rarity = cardEl.dataset.rarity;
            cardEl.style.display = rarity === filter ? 'block' : 'none';
        }
    });
}


/* ===== HELPERS ===== */

/**
 * Create progress dots for card reveal
 * @returns {HTMLElement} Progress dots element
 */
function createProgressDots() {
    const progressEl = document.createElement('div');
    progressEl.className = 'card-reveal__progress';

    PackState.cards.forEach((_, index) => {
        const dot = document.createElement('div');
        dot.className = 'card-reveal__dot';
        if (index === PackState.currentIndex) {
            dot.classList.add('active');
        } else if (index < PackState.currentIndex) {
            dot.classList.add('complete');
        }
        progressEl.appendChild(dot);
    });

    return progressEl;
}

/**
 * Update navigation buttons based on current phase
 */
function updateNavigation() {
    const nextBtn = document.getElementById('packNavNext');
    const backBtn = document.getElementById('packNavBack');

    switch (PackState.phase) {
        case 'pack':
            nextBtn.textContent = 'Tap Pack to Open';
            nextBtn.style.display = 'block';
            backBtn.style.display = 'none';
            break;
        case 'revealing':
            nextBtn.textContent = 'Skip to Collection';
            nextBtn.style.display = 'block';
            backBtn.style.display = 'block';
            backBtn.textContent = 'Reset';
            break;
        case 'gallery':
            nextBtn.textContent = 'Done';
            nextBtn.style.display = 'block';
            backBtn.style.display = 'block';
            backBtn.textContent = 'View Cards Again';
            break;
    }
}

/**
 * Reset pack experience to initial state
 */
function resetPackExperience() {
    PackState.packOpened = false;
    PackState.currentIndex = 0;
    PackState.revealedCards = [];

    // Reset pack element
    packEl.classList.remove('pack--ready', 'pack--opening');

    // Show pack
    showPackPresentation();
}

/**
 * Close pack experience and return to setup
 */
function closePackExperience() {
    packExperienceEl.classList.remove('active');

    // Show setup
    const setupContainer = document.getElementById('setupContainer');
    if (setupContainer) {
        setupContainer.style.display = 'flex';
    }
}


/* ===== SUPERLATIVE GAME INTEGRATION ===== */

/**
 * Show the superlative guessing game after card reveal
 */
function showSuperlativeGame() {
    PackState.phase = 'superlative';

    // Hide other views
    packEl.style.display = 'none';
    cardRevealEl.style.display = 'none';
    cardGalleryEl.style.display = 'none';

    // Create superlative game container if needed
    let gameContainer = document.getElementById('superlativeGameContainer');
    if (!gameContainer) {
        gameContainer = document.createElement('div');
        gameContainer.id = 'superlativeGameContainer';
        gameContainer.style.display = 'flex';
        gameContainer.style.flexDirection = 'column';
        gameContainer.style.alignItems = 'center';
        gameContainer.style.justifyContent = 'center';
        gameContainer.style.minHeight = '100vh';
        gameContainer.style.padding = 'var(--space-6)';
        packExperienceEl.appendChild(gameContainer);
    }

    gameContainer.style.display = 'flex';

    // Start the superlative game if available
    if (window.SuperlativeGame) {
        SuperlativeGame.start(PackState.wrappedData, gameContainer);

        // Listen for game completion
        document.addEventListener('superlativeGame:complete', handleSuperlativeComplete, { once: true });
    } else {
        // Fallback - skip to gallery
        console.warn('[PackOpening] SuperlativeGame not loaded, skipping to gallery');
        showGallery();
    }

    updateNavigation();
}

/**
 * Handle superlative game completion
 * @param {CustomEvent} event - Game complete event
 */
function handleSuperlativeComplete(event) {
    console.log('[PackOpening] Superlative game complete:', event.detail);

    // Hide game container
    const gameContainer = document.getElementById('superlativeGameContainer');
    if (gameContainer) {
        gameContainer.style.display = 'none';
    }

    // Show gallery
    showGallery();
}


/* ===== PUBLIC API ===== */

/**
 * Start pack opening experience with wrapped data
 * @param {Object} wrappedData - Wrapped data from API
 */
async function startPackOpening(wrappedData) {
    await initPackExperience(wrappedData);
}

/**
 * Check if pack experience is currently active
 * @returns {boolean} True if active
 */
function isPackExperienceActive() {
    return packExperienceEl?.classList.contains('active') || false;
}


/* ===== EXPORTS ===== */

window.PackOpening = {
    start: startPackOpening,
    isActive: isPackExperienceActive,
    reset: resetPackExperience,
    close: closePackExperience,
    showGallery: showGallery,
    showSuperlativeGame: showSuperlativeGame,
    state: PackState
};
