/* ===== NAVIGATION ===== */

let currentSlide = 0;

/**
 * Initialize navigation
 */
function initializeNavigation() {
    currentSlide = 0;
    
    // Keyboard navigation
    document.addEventListener('keydown', handleKeyboardNav);
    
    // Touch/swipe navigation (for mobile)
    let touchStartX = 0;
    let touchEndX = 0;
    
    document.addEventListener('touchstart', (e) => {
        touchStartX = e.changedTouches[0].screenX;
    });
    
    document.addEventListener('touchend', (e) => {
        touchEndX = e.changedTouches[0].screenX;
        handleSwipe();
    });
    
    function handleSwipe() {
        const swipeThreshold = 50;
        const diff = touchStartX - touchEndX;
        
        if (Math.abs(diff) > swipeThreshold) {
            if (diff > 0) {
                // Swipe left (next)
                nextSlide();
            } else {
                // Swipe right (previous)
                prevSlide();
            }
        }
    }
}

/**
 * Handle keyboard navigation
 */
function handleKeyboardNav(e) {
    // Don't navigate if modal is open
    if (document.getElementById('weekModal')?.classList.contains('active')) {
        if (e.key === 'Escape') {
            closeModal();
        }
        return;
    }
    
    // Don't navigate if not on wrapped screen
    if (!document.getElementById('wrappedContainer')?.classList.contains('active')) {
        return;
    }
    
    switch(e.key) {
        case 'ArrowRight':
        case ' ':
        case 'Enter':
            e.preventDefault();
            nextSlide();
            break;
        case 'ArrowLeft':
            e.preventDefault();
            prevSlide();
            break;
        case 'Escape':
            restart();
            break;
        case 'Home':
            e.preventDefault();
            goToSlide(0);
            break;
        case 'End':
            e.preventDefault();
            goToSlide(slides.length - 1);
            break;
    }
}

/**
 * Show a specific slide
 */
function showSlide(index) {
    // Clamp index to valid range
    index = clamp(index, 0, slides.length - 1);
    currentSlide = index;
    
    // Hide all slides
    document.querySelectorAll('.slide').forEach(slide => {
        slide.classList.remove('active');
    });
    
    // Show current slide
    const slideEl = document.getElementById(`slide-${index}`);
    if (slideEl) {
        slideEl.classList.add('active');
        
        // Scroll to top when changing slides
        scrollToTop();
    }
    
    // Update UI
    updateSlideDots(index);
    updateNavButtons(index);
    
    // Log for debugging
    log(`Showing slide ${index + 1}/${slides.length}: ${slides[index]?.id || 'unknown'}`);
}

/**
 * Go to next slide
 */
function nextSlide() {
    if (currentSlide < slides.length - 1) {
        showSlide(currentSlide + 1);
    } else {
        // At the end, restart
        restart();
    }
}

/**
 * Go to previous slide
 */
function prevSlide() {
    if (currentSlide > 0) {
        showSlide(currentSlide - 1);
    }
}

/**
 * Go to a specific slide by index
 */
function goToSlide(index) {
    showSlide(index);
}

/**
 * Get current slide index
 */
function getCurrentSlide() {
    return currentSlide;
}

/**
 * Get total number of slides
 */
function getTotalSlides() {
    return slides.length;
}

/**
 * Check if at first slide
 */
function isFirstSlide() {
    return currentSlide === 0;
}

/**
 * Check if at last slide
 */
function isLastSlide() {
    return currentSlide === slides.length - 1;
}

/**
 * Auto-advance slides (for future auto-play feature)
 */
let autoPlayInterval = null;

function startAutoPlay(delayMs = CONFIG.AUTO_ADVANCE_DELAY) {
    if (!CONFIG.ENABLE_AUTO_PLAY) return;
    
    stopAutoPlay(); // Clear any existing interval
    
    autoPlayInterval = setInterval(() => {
        if (isLastSlide()) {
            stopAutoPlay();
        } else {
            nextSlide();
        }
    }, delayMs);
    
    log('Auto-play started');
}

function stopAutoPlay() {
    if (autoPlayInterval) {
        clearInterval(autoPlayInterval);
        autoPlayInterval = null;
        log('Auto-play stopped');
    }
}

function toggleAutoPlay() {
    if (autoPlayInterval) {
        stopAutoPlay();
    } else {
        startAutoPlay();
    }
}