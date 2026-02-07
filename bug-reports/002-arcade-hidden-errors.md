# Bug Report: Arcade experience silently swallows errors — error div has `display: none`

## Priority
High
- The arcade experience appears to do nothing when an error occurs, with no feedback to the user. Makes debugging impossible.

## Summary
When an API error occurs in the arcade experience, the error message is written into a `<div>` that has an inline `style="display: none;"`. The `showError()` function in `setup.js` sets innerHTML but never removes the inline `display: none`, so the error is invisible. The user sees the page appear to reload and stay on step 1 with no explanation.

## Steps to Reproduce
1. Navigate to `arcade.html` (with any League ID that would trigger an API error)
2. Enter a League ID and click "START GAME"
3. Observe: page briefly flickers (shows step 2 loading, then reverts to step 1)
4. No error message is visible anywhere on screen

**Environment:** Any browser. Specific to `arcade.html`.
**Reproducibility:** Always (whenever any API error occurs)

## Expected Behavior
An error message should be visible to the user explaining what went wrong.

## Actual Behavior
Page reverts to step 1 with no visible error. The error text IS written to the DOM (inspectable via DevTools) but the parent container is hidden.

## Error Details
No visible error. DOM inspection would show the error div has content but `style="display: none;"` prevents it from rendering.

## Relevant Code Paths

### Data Flow
1. User clicks "START GAME" → `setup.js:fetchLeague()` (line 54)
2. API call fails → catch block (line 97) calls `showError('step1', error.message)` (line 99)
3. `showError()` (line 34) finds `#step1Error` and sets its innerHTML
4. But `#step1Error` in `arcade.html` (line 110) has `style="display: none;"` — innerHTML changes are invisible
5. `showStep(1)` (line 100) shows step 1 again — user sees no change

### Files to Examine
| File | Why |
|------|-----|
| `frontend/arcade.html:110` | `<div id="step1Error" class="error" style="display: none;"></div>` — inline display:none |
| `frontend/arcade.html:136` | `<div id="step3Error" class="error" style="display: none;"></div>` — same issue for step 3 |
| `frontend/static/js/setup.js:34-39` | `showError()` sets innerHTML but doesn't toggle visibility |
| `frontend/slides.html:86` | Compare: `<div id="step1Error"></div>` — no display:none, so errors work here |

### Suspect Code

```html
<!-- frontend/arcade.html:110 — BUG: inline style hides errors -->
<div id="step1Error" class="error" style="display: none;"></div>

<!-- frontend/arcade.html:136 — same bug -->
<div id="step3Error" class="error" style="display: none;"></div>
```

```javascript
// frontend/static/js/setup.js:34-39
// BUG: Sets innerHTML but never changes display property
function showError(stepId, message) {
    const errorEl = document.getElementById(`${stepId}Error`);
    if (errorEl) {
        errorEl.innerHTML = `<div class="error">${message}</div>`;
        // MISSING: errorEl.style.display = 'block';
    }
}
```

## Root Cause Hypothesis
`arcade.html` adds `style="display: none;"` to both error divs (lines 110 and 136), likely added during the arcade UI design to hide empty error containers. The shared `showError()` function in `setup.js` was never updated to toggle visibility — it only sets innerHTML. In `slides.html` and `pack-opening.html`, the error divs don't have this inline style, so errors are visible there.

## Suggested Fix Direction
Two changes needed:

1. **In `setup.js`:** Update `showError()` to also set `errorEl.style.display = 'block'` (or remove the `display: none`), and update `clearError()` to set `errorEl.style.display = 'none'`.

2. **In `arcade.html`:** Remove the `style="display: none;"` from both `#step1Error` (line 110) and `#step3Error` (line 136) — let CSS handle default visibility, and let `showError()`/`clearError()` toggle it.

## Additional Context
- `slides.html:86` uses `<div id="step1Error"></div>` (no inline style) — errors work fine there
- `pack-opening.html` should be checked for the same issue
- The `.error` class in `base.css:108` does NOT have `display: none`, confirming the bug is the inline style in `arcade.html` specifically
