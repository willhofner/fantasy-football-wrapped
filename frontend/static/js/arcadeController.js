/* ===== ARCADE CONTROLLER ===== */
/* Handles joystick animations, button effects, and arcade-specific interactions */

const ArcadeController = {
    joystickLeft: null,
    joystickRight: null,
    buttons: [],
    coinInsertText: null,

    /**
     * Initialize the arcade controller
     */
    init() {
        console.log('[Arcade] Initializing arcade controller');

        // Get DOM elements
        this.joystickLeft = document.getElementById('joystickLeft');
        this.joystickRight = document.getElementById('joystickRight');
        this.buttons = document.querySelectorAll('.arcade-button');
        this.coinInsertText = document.querySelector('.insert-coin');

        // Set up keyboard listeners for joystick animation
        this.setupKeyboardListeners();

        // Set up button hover effects
        this.setupButtonEffects();

        // Update coin text based on context
        this.updateCoinText();

        console.log('[Arcade] Controller initialized');
    },

    /**
     * Set up keyboard listeners for joystick movement
     */
    setupKeyboardListeners() {
        document.addEventListener('keydown', (e) => {
            this.handleKeyDown(e);
        });

        document.addEventListener('keyup', (e) => {
            this.handleKeyUp(e);
        });
    },

    /**
     * Handle key down - move joysticks and animate buttons
     */
    handleKeyDown(e) {
        // Move both joysticks in sync for visual effect
        const joysticks = [this.joystickLeft, this.joystickRight].filter(j => j);

        // Clear previous movement classes
        joysticks.forEach(joystick => {
            joystick.classList.remove('move-left', 'move-right', 'move-up', 'move-down');
        });

        switch (e.key) {
            case 'ArrowLeft':
                joysticks.forEach(j => j.classList.add('move-left'));
                this.pulseButton(0);
                break;
            case 'ArrowRight':
                joysticks.forEach(j => j.classList.add('move-right'));
                this.pulseButton(1);
                break;
            case 'ArrowUp':
                joysticks.forEach(j => j.classList.add('move-up'));
                this.pulseButton(2);
                break;
            case 'ArrowDown':
                joysticks.forEach(j => j.classList.add('move-down'));
                this.pulseButton(3);
                break;
            case 'Enter':
            case ' ':
                // Pulse all buttons on enter/space
                this.buttons.forEach((_, i) => this.pulseButton(i));
                break;
            case 'Escape':
                this.pulseButton(0);
                this.pulseButton(3);
                break;
        }
    },

    /**
     * Handle key up - reset joystick position
     */
    handleKeyUp(e) {
        const joysticks = [this.joystickLeft, this.joystickRight].filter(j => j);

        // Reset joysticks on arrow key release
        if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(e.key)) {
            joysticks.forEach(joystick => {
                joystick.classList.remove('move-left', 'move-right', 'move-up', 'move-down');
            });
        }
    },

    /**
     * Pulse a button to show it was "pressed"
     */
    pulseButton(index) {
        const button = this.buttons[index];
        if (!button) return;

        button.classList.add('pressed');
        setTimeout(() => {
            button.classList.remove('pressed');
        }, 150);
    },

    /**
     * Set up button hover effects
     */
    setupButtonEffects() {
        this.buttons.forEach((button, index) => {
            button.addEventListener('mouseenter', () => {
                button.style.filter = 'brightness(1.2)';
            });

            button.addEventListener('mouseleave', () => {
                button.style.filter = '';
            });

            button.addEventListener('click', () => {
                this.pulseButton(index);
                this.handleButtonClick(index);
            });
        });
    },

    /**
     * Handle physical button clicks
     */
    handleButtonClick(index) {
        switch (index) {
            case 0: // First button - Back
                if (typeof prevSlide === 'function') prevSlide();
                break;
            case 1: // Second button - Next
                if (typeof nextSlide === 'function') nextSlide();
                break;
            case 2: // Third button - First slide
                if (typeof goToSlide === 'function') goToSlide(0);
                break;
            case 3: // Fourth button - Last slide
                if (typeof goToSlide === 'function' && typeof slides !== 'undefined') {
                    goToSlide(slides.length - 1);
                }
                break;
        }
    },

    /**
     * Update the "INSERT COIN" text based on current state
     */
    updateCoinText() {
        if (!this.coinInsertText) return;

        const step1 = document.getElementById('step1');
        const step3 = document.getElementById('step3');
        const wrappedContainer = document.getElementById('wrappedContainer');

        if (wrappedContainer && wrappedContainer.classList.contains('active')) {
            this.coinInsertText.innerHTML = '← → NAVIGATE<br>ENTER: NEXT | ESC: RESTART';
        } else if (step3 && step3.classList.contains('active')) {
            this.coinInsertText.textContent = 'SELECT TEAM - PRESS START';
        } else if (step1 && step1.classList.contains('active')) {
            this.coinInsertText.textContent = 'ENTER LEAGUE ID TO BEGIN';
        } else {
            this.coinInsertText.textContent = 'PLEASE WAIT...';
        }
    },

    /**
     * Add screen flash effect for transitions
     */
    flashScreen() {
        const content = document.querySelector('.crt-content');
        if (!content) return;

        const flash = document.createElement('div');
        flash.style.cssText = `
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: white;
            opacity: 0.15;
            pointer-events: none;
            z-index: 100;
            animation: flash-out 0.15s ease-out forwards;
        `;
        content.appendChild(flash);

        setTimeout(() => flash.remove(), 150);
    }
};

/* ===== OVERRIDE NAVIGATION FOR ARCADE EFFECTS ===== */

// Store original functions
const originalShowSlide = typeof showSlide === 'function' ? showSlide : null;
const originalShowStep = typeof showStep === 'function' ? showStep : null;

// Override showSlide to add arcade effects
if (originalShowSlide) {
    window.showSlide = function(index) {
        ArcadeController.flashScreen();
        originalShowSlide(index);
        ArcadeController.updateCoinText();
    };
}

// Override showStep to update coin text
if (originalShowStep) {
    window.showStep = function(stepNum) {
        originalShowStep(stepNum);
        setTimeout(() => ArcadeController.updateCoinText(), 100);
    };
}

/* ===== ADDITIONAL STYLES ===== */
const arcadeStyles = document.createElement('style');
arcadeStyles.textContent = `
    @keyframes flash-out {
        0% { opacity: 0.15; }
        100% { opacity: 0; }
    }

    /* Joystick movement animations */
    .joystick-stick {
        transition: transform 0.08s ease-out;
    }

    .joystick-stick.move-left {
        transform: rotate(-18deg) translateX(-3px);
    }

    .joystick-stick.move-right {
        transform: rotate(18deg) translateX(3px);
    }

    .joystick-stick.move-up {
        transform: translateY(-6px) scale(0.95);
    }

    .joystick-stick.move-down {
        transform: translateY(4px) scale(1.02);
    }

    /* Button press animation */
    .arcade-button.pressed {
        transform: translateY(6px);
        filter: brightness(1.3);
        transition: all 0.05s ease;
    }

    /* Slide transitions */
    .slide {
        transition: opacity 0.15s ease;
    }

    .slide:not(.active) {
        opacity: 0;
    }

    .slide.active {
        animation: screen-on 0.2s ease-out;
    }

    @keyframes screen-on {
        0% {
            opacity: 0;
            filter: brightness(2);
        }
        100% {
            opacity: 1;
            filter: brightness(1);
        }
    }
`;
document.head.appendChild(arcadeStyles);

/* ===== INITIALIZE ON DOM READY ===== */
document.addEventListener('DOMContentLoaded', () => {
    ArcadeController.init();

    // Add observer to update coin text when DOM changes
    const observer = new MutationObserver(() => {
        ArcadeController.updateCoinText();
    });

    const setupContainer = document.getElementById('setupContainer');
    const wrappedContainer = document.getElementById('wrappedContainer');

    if (setupContainer) {
        observer.observe(setupContainer, { attributes: true, subtree: true, attributeFilter: ['class'] });
    }
    if (wrappedContainer) {
        observer.observe(wrappedContainer, { attributes: true, attributeFilter: ['class'] });
    }
});

/* ===== PREVENT SCROLL ON ARROW KEYS ===== */
document.addEventListener('keydown', (e) => {
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
        const wrappedContainer = document.getElementById('wrappedContainer');
        if (wrappedContainer && wrappedContainer.classList.contains('active')) {
            e.preventDefault();
        }
    }
});

console.log('[Arcade] Arcade controller script loaded');
