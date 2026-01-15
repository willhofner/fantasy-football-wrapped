/* ===== SLIDE RENDERER ===== */

/**
 * Render all slides to the DOM
 */
function renderSlides() {
    const container = document.getElementById('wrappedContainer');
    container.innerHTML = '';

    // Add all slides
    slides.forEach((slide, index) => {
        const slideDiv = document.createElement('div');
        slideDiv.className = `slide ${slide.class}`;
        slideDiv.id = `slide-${index}`;
        slideDiv.innerHTML = slide.content;
        container.appendChild(slideDiv);
    });

    // Add navigation controls
    addNavigationControls(container);
    
    // Create slide dots
    createSlideDots();
    
    log('Slides rendered to DOM');
}

/**
 * Add navigation buttons and restart button
 */
function addNavigationControls(container) {
    const navHtml = `
        <div class="slide-dots" id="slideDots"></div>
        <div class="slide-nav">
            <button class="nav-btn" id="prevBtn" onclick="prevSlide()">← Back</button>
            <button class="nav-btn" id="nextBtn" onclick="nextSlide()">Next →</button>
        </div>
        <button class="restart-btn" onclick="restart()">✕ Start Over</button>
    `;
    container.insertAdjacentHTML('beforeend', navHtml);
}

/**
 * Create navigation dots for each slide
 */
function createSlideDots() {
    const dotsContainer = document.getElementById('slideDots');
    if (!dotsContainer) return;
    
    dotsContainer.innerHTML = '';
    
    for (let i = 0; i < slides.length; i++) {
        const dot = document.createElement('div');
        dot.className = 'dot';
        if (i === 0) dot.classList.add('active');
        dot.onclick = () => goToSlide(i);
        dotsContainer.appendChild(dot);
    }
}

/**
 * Update slide dots active state
 */
function updateSlideDots(index) {
    const dots = document.querySelectorAll('.dot');
    dots.forEach((dot, i) => {
        dot.classList.toggle('active', i === index);
    });
}

/**
 * Update navigation button states
 */
function updateNavButtons(index) {
    const prevBtn = document.getElementById('prevBtn');
    const nextBtn = document.getElementById('nextBtn');
    
    if (prevBtn) {
        prevBtn.disabled = index === 0;
    }
    
    if (nextBtn) {
        nextBtn.textContent = index === slides.length - 1 ? 'Finish' : 'Next →';
    }
}