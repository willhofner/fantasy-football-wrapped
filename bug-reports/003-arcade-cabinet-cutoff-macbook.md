# Bug Report: Arcade Cabinet Cut Off on 14-inch MacBook

## Priority
**High** — Core experience is partially unusable on common laptop screens

## Summary
The arcade cabinet experience doesn't fit properly on 14-inch MacBook screens. The bottom portion (control panel with joystick and buttons) is cut off below the viewport, and users cannot scroll to see it. The cabinet is functional (arrow keys work) but the visual experience is incomplete and doesn't convey the full arcade aesthetic.

## Steps to Reproduce
1. Open `arcade.html` on a 14-inch MacBook (or any laptop with ~900px viewport height)
2. Complete setup flow (enter league ID, select team)
3. View any slide in the wrapped experience

**Environment:** Chrome on 14-inch MacBook
**Reproducibility:** Always (on 14-inch and likely 13-inch MacBooks)
**League/Team:** 17810260 / Will (test configuration)

## Expected Behavior
The entire arcade cabinet should be visible on screen, including:
- Marquee (top sign)
- Screen housing with CRT monitor
- Control panel with joystick and arcade buttons

The experience should scale appropriately for common laptop screen sizes (13", 14", 15", 16").

## Actual Behavior
On a 14-inch MacBook:
- ✅ Top of arcade machine (marquee) is visible
- ✅ Most of the CRT screen is visible
- ❌ Bottom of screen is partially cut off
- ❌ Control panel (joystick, buttons, coin slot) is cut off below viewport
- ❌ Cannot scroll to see the missing content

The user can still navigate with arrow keys (functionality works), but the visual payoff of the arcade aesthetic is lost.

## Error Details
No console errors observed. This is a CSS layout/sizing issue, not a JavaScript error.

## Relevant Code Paths

### Root Cause File
**`frontend/static/css/arcade.css`** — Cabinet sizing and layout

### Key Problem Areas

#### 1. Cabinet Height Calculation ([arcade.css:62-70](frontend/static/css/arcade.css#L62-L70))
```css
.arcade-cabinet {
    position: relative;
    width: 700px;
    height: 90vh;          /* ⚠️ PROBLEM: 90vh on 14" MacBook ≈ 810px */
    max-height: 850px;     /* ⚠️ PROBLEM: Still too tall for smaller screens */
    display: flex;
    flex-direction: column;
    filter: drop-shadow(0 20px 40px rgba(0,0,0,0.8));
}
```

**Issue:** `90vh` on a 14-inch MacBook (viewport height ~900px) = ~810px total cabinet height

#### 2. Cabinet Component Heights
- **Marquee** ([arcade.css:73-88](frontend/static/css/arcade.css#L73-L88)): `height: 80px` (fixed)
- **Screen Housing** ([arcade.css:117-127](frontend/static/css/arcade.css#L117-L127)): `flex: 1` (takes remaining space)
- **Control Panel** ([arcade.css:238-252](frontend/static/css/arcade.css#L238-L252)): `height: 160px` (fixed)

**Total minimum height:** 80px + 160px + screen content = **240px + screen content**

When cabinet is `90vh` (~810px), the screen gets `810 - 240 = 570px`. But the body/viewport relationship causes the control panel to overflow below the viewport.

#### 3. Overflow Hidden ([arcade.css:46-59](frontend/static/css/arcade.css#L46-L59))
```css
html, body {
    height: 100%;
    overflow: hidden;    /* ⚠️ Prevents scrolling to see cut-off content */
}

body.arcade-mode {
    /* ... */
    overflow: hidden;    /* ⚠️ Reinforced here */
}
```

**Issue:** Users can't scroll to see the control panel even though it exists in the DOM.

## Root Cause Hypothesis
The arcade cabinet sizing uses `90vh` with `max-height: 850px`, which doesn't account for:
1. **Smaller laptop viewports** — 13"/14" MacBooks have ~900px viewport height
2. **Fixed component heights** — Marquee (80px) + Control Panel (160px) = 240px of fixed height
3. **No responsive breakpoints** — Same sizing applied to all screen heights
4. **Body centering with flex** — `body.arcade-mode` uses `display: flex; align-items: center`, which centers the cabinet vertically but doesn't prevent overflow

The cabinet is essentially **always 90vh tall**, but on smaller screens, the bottom 10-15% extends below the viewport. Since `overflow: hidden` is set, this content is simply cut off.

## Suggested Fix Direction

### Option A: Dynamic Height Scaling (Recommended)
Adjust cabinet height based on viewport using CSS media queries:
```css
.arcade-cabinet {
    height: min(90vh, 750px);
}

@media (max-height: 900px) {
    .arcade-cabinet {
        height: 85vh;
        max-height: 750px;
    }
}

@media (max-height: 800px) {
    .arcade-cabinet {
        height: 80vh;
        max-height: 650px;
    }
}
```

**Pros:** Ensures cabinet always fits, maintains proportions
**Cons:** Cabinet slightly smaller on small screens

### Option B: Scale Control Panel Size
Make control panel responsive with `clamp()`:
```css
.control-panel {
    height: clamp(120px, 18vh, 160px);
}
```

**Pros:** Screen gets more space
**Cons:** More CSS changes required

### Option C: Allow Scrolling (Not Recommended)
Remove `overflow: hidden` from body.

**Cons:** Breaks immersion, feels wrong

## Recommendation

**Go with Option A (Dynamic Height Scaling)**. Use CSS media queries based on viewport height to ensure the cabinet always fits on screen. Set `max-height: 750px` as default and add responsive breakpoints for smaller screens.

## Files to Modify

| File | Changes Needed |
|------|----------------|
| `frontend/static/css/arcade.css` | Add responsive height breakpoints for `.arcade-cabinet` (lines 62-70) |

## Additional Notes

**Related Enhancement:** User also wants visual improvements (wood grain, better 3D perspective, more realistic bezel styling). This is a separate feature request that should be spec'd via `/ideate` after this bug is fixed.
