# Arcade Cabinet Visual Realism Overhaul

**Spec:** 002
**Date:** 2026-02-09
**Status:** Backlog — Requires design ideation session before implementation

## Overview

Transform the arcade experience from a flat, colorful arcade cabinet into a **super realistic, authentic retro arcade machine** with depth, texture, and authentic materials. This is a pure visual enhancement pass to maximize the "you're playing a real arcade game" immersion. Think classic 80s/90s arcade cabinets with wood grain, metallic details, worn textures, and convincing 3D perspective.

## User Story

As a fantasy manager viewing my Wrapped in arcade mode, I want the cabinet to look and feel like a real vintage arcade machine so that I'm fully immersed in the retro gaming experience and compelled to screenshot/share it.

## Detailed Behavior

**No functional changes.** This is a visual-only enhancement. All interactions (keyboard navigation, button presses, joystick animations) remain identical. The goal is to make users say "wow, that looks like a real arcade machine" when they load the page.

### Visual Enhancements

The arcade cabinet should convey:
1. **Depth & 3D perspective** — Not a flat drawing, but a convincing 3D object you're standing in front of
2. **Authentic materials** — Wood grain on cabinet body, metallic/plastic details, textured control panel
3. **Realistic screen housing** — Deep-set CRT monitor with authentic bezel and shadows
4. **Wear & authenticity** — Subtle scuff marks, worn edges, "played 1000 times" character
5. **Better lighting** — Realistic shadows, highlights, screen glow effects

## Design & UX

### Current State Analysis

**What's already good:**
- Clean arcade structure (marquee → screen → control panel)
- Working joystick and button animations
- CRT scanline effect and screen glare
- Retro color palette (green terminal text, bright buttons)

**What needs enhancement:**
- Cabinet body is flat black — needs texture/depth
- Control panel is bright flat yellow/orange — could be more realistic
- Screen bezel is bright lime green — too cartoonish, needs darker/metallic look
- No visible side panels or 3D perspective
- Lacks authentic arcade details (T-molding, speaker grilles, wear/texture)

### Target Aesthetic

**"Super realistic"** — Aim for photorealistic arcade cabinet rendering using CSS, pseudo-elements, gradients, shadows, and potentially texture images. Think:
- Angled side panels visible (3D perspective)
- Wood grain texture on cabinet body
- Metallic screen housing
- Authentic button shadows and depth
- Realistic marquee (backlit translucent plastic look)
- T-molding edge trim around cabinet edges
- Optional: speaker grilles, coin return details, scuff marks

### Shareability

A visually stunning arcade cabinet makes the entire experience more shareable:
- "Wow look at this retro arcade UI" screenshots
- Nostalgia factor drives engagement
- Differentiates from generic "Wrapped" experiences
- Shows attention to craft/detail

## Technical Approach

### Implementation Strategy

**Pure CSS + Pseudo-elements (Preferred):**
- Use gradients, box-shadows, and transforms for 3D depth
- Pseudo-elements (`::before`, `::after`) for decorative details
- CSS filters for textures/lighting effects
- No external image dependencies if possible

**Optional Texture Images:**
- Wood grain PNG (small, repeating)
- Metal/brushed aluminum textures
- Only if CSS alone can't achieve the desired realism

**HTML Structure Changes:**
May need to add decorative elements:
```html
<div class="arcade-cabinet">
  <div class="cabinet-side cabinet-side-left"></div>  <!-- 3D side panel -->
  <div class="cabinet-front">
    <div class="cabinet-top"><!-- Marquee --></div>
    <div class="screen-housing"><!-- CRT --></div>
    <div class="control-panel"><!-- Joystick/buttons --></div>
  </div>
  <div class="cabinet-side cabinet-side-right"></div>  <!-- 3D side panel -->
</div>
```

### Data Requirements

None. This is pure CSS/HTML visual enhancement.

### Architecture

**Files to modify:**
- `frontend/arcade.html` — Add decorative HTML elements for 3D panels/details (if needed)
- `frontend/static/css/arcade.css` — Major visual overhaul

**Key CSS areas to enhance:**

| Element | Current | Target Enhancement |
|---------|---------|-------------------|
| `.arcade-cabinet` | Flat black background | Wood grain texture, 3D depth with side panels visible |
| `.cabinet-top` (marquee) | Bright orange/yellow gradient | Backlit translucent plastic look with glow |
| `.screen-housing` | Bright lime green bezel | Dark metallic/industrial housing, deeply recessed |
| `.crt-monitor` | Simple black border | Realistic CRT bezel with reflection, depth |
| `.control-panel` | Flat yellow/orange gradient | Textured surface (brushed metal or plastic), realistic shadows |
| `.joystick-base` | Simple gradient circle | More authentic arcade joystick mounting plate |
| `.arcade-button` | Clean gradient buttons | Deeper shadows, authentic arcade button look with rim/base separation |

### Key Implementation Details

**3D Perspective Approach:**
- Add visible side panels using `transform: perspective()` and `rotateY()`
- Cabinet front remains centered
- Side panels angled ~20-30° to suggest depth
- Use shadows to reinforce 3D illusion

**Wood Grain:**
- CSS gradient pattern or small repeating background image
- Apply to cabinet body and/or side panels
- Subtle, not overpowering

**Metallic Screen Housing:**
- Replace bright green bezel with dark gray/black metallic look
- Use `box-shadow: inset` for deep-set recessed appearance
- Add highlights with gradients to suggest metal surface

**Authentic Details:**
- T-molding: thin colored strip around cabinet edges (CSS border or pseudo-element)
- Speaker grilles: perforated pattern using gradients or pseudo-elements
- Scuff marks: subtle texture overlays with reduced opacity
- Coin return: small metal slot/button details on control panel

**Lighting & Shadows:**
- Enhance drop shadow on entire cabinet
- Add realistic shadows where panels meet
- Screen glow should subtly illuminate surrounding cabinet areas
- Button shadows should suggest depth when pressed

## Files to Create/Modify

| File | Action | What |
|------|--------|------|
| `frontend/arcade.html` | Modify | Add decorative HTML elements for 3D side panels, T-molding, speaker grilles (if needed beyond CSS) |
| `frontend/static/css/arcade.css` | Modify | Complete visual overhaul — add 3D perspective, textures, realistic materials, enhanced lighting/shadows |
| `frontend/static/images/wood-grain.png` | Create (optional) | Repeating wood grain texture if CSS alone insufficient |
| `frontend/static/images/metal-texture.png` | Create (optional) | Brushed metal texture for control panel/bezel if needed |

## Edge Cases & Constraints

**Performance:**
- Heavy CSS effects (multiple shadows, gradients, transforms) may impact render performance on older devices
- Test on lower-end hardware to ensure smooth navigation
- Consider simplified fallback for low-power mode?

**Responsive Behavior:**
- 3D perspective must scale properly with cabinet size (already responsive per bug fix)
- Side panels should remain proportional on smaller screens
- Texture images must tile cleanly at all sizes

**Browser Compatibility:**
- CSS transforms and 3D perspective work in all modern browsers
- Test in Chrome, Firefox, Safari
- Avoid cutting-edge CSS that might break in older browsers

## Open Questions

**These must be resolved through collaborative ideation before implementation:**

1. **Exact 3D perspective angle** — How pronounced should the side panels be? Subtle or dramatic?
2. **Wood grain placement** — Cabinet sides only, or control panel too? What color/tone of wood?
3. **Color palette shift** — Keep current bright yellow/orange/green, or shift to more muted/authentic arcade colors?
4. **Marquee design** — Keep "FANTASY" text and stars, or redesign? Backlit plastic look or painted?
5. **Level of wear/authenticity** — Pristine arcade cabinet or show scuff marks/age?
6. **Speaker grilles** — Where to place them? Size? Style (perforated metal vs cloth)?
7. **T-molding color** — Classic red, or match existing color scheme?
8. **Reference cabinet** — Should we model this after a specific real arcade machine (Street Fighter II, Pac-Man, etc.)?

## Out of Scope

**This feature does NOT include:**
- Functional changes to navigation, keyboard controls, or slide behavior
- New animations beyond existing joystick/button effects
- Sound effects or audio enhancements
- Backend/API changes
- Content changes (slide templates, data formatting)
- Additional interactive elements (clickable decorations, easter eggs)

**Boundary:** This is purely a visual polish pass to make the existing arcade experience look more realistic and immersive. No new features, no behavior changes.

---

## Implementation Approach

**Before coding:**
1. Collaborative design session to answer open questions above
2. Find 2-3 reference images of real arcade cabinets for inspiration
3. Sketch out desired 3D perspective and material placement
4. Decide on pure CSS vs. texture images approach

**Implementation:**
1. Start with 3D perspective/side panels (biggest visual impact)
2. Add wood grain and material textures
3. Enhance screen housing/bezel for realism
4. Polish control panel, joystick, buttons
5. Add authentic details (T-molding, speaker grilles, wear)
6. Final lighting/shadow pass

**Testing:**
- Visual review on multiple screen sizes
- Performance check (render time, scroll smoothness)
- Cross-browser testing

---

**Priority:** Backlog — This is a "someday make it perfect" enhancement, not urgent for launch. Adds polish and shareability but doesn't unlock new functionality.
