---
name: Remove Gradients and Update Color Scheme
overview: ""
todos:
  - id: 2e426b41-f52f-46f3-8205-c06485a965a2
    content: Add Google Fonts links for Inter and Besley to index.html and creator.html
    status: pending
  - id: 1e95d02b-4c36-49aa-b047-c20abe9bdab4
    content: Add :root CSS variables for all colors in styles.css
    status: pending
  - id: 1f834d22-2d99-4a40-a9a9-44fb0898091b
    content: "Update styles.css: remove gradients, update colors to use variables, change font-family, remove hover transforms"
    status: pending
  - id: 993847e0-d3f6-4ffe-86b6-5d53ed51ad8a
    content: "Update creator.css: remove gradients, update colors to use variables, remove hover transforms, adjust sidebar and controls styling"
    status: pending
  - id: cdd043ce-6d3e-4fbf-8e3c-25904d4bfdc7
    content: "Update gallery.css: remove gradients, update colors to use variables, remove hover transforms, adjust card and button styling"
    status: pending
---

# Remove Gradients and Update Color Scheme

## Overview

Remove all gradient theming from the CSS files and replace with a flat color scheme using CSS variables. Update fonts to use Inter and Besley exclusively. Remove all hover transformations (translateY, scale, etc.) and use lighter color changes for hover feedback.

## Color Scheme (CSS Variables)

Define these variables in `:root` in `css/styles.css`:

- `--color-text: #39393A;` (dark gray for text)
- `--color-bg: #E6E6E6;` (light gray for backgrounds)
- `--color-primary: #297373;` (teal primary color)
- `--color-primary-light: #3a8a8a;` (lighter teal for hover states)
- `--color-border: #39393A;` (dark gray for borders)
- `--color-border-light: #2a2a2b;` (lighter border shade)
- `--color-border-dark: #1e1e1f;` (darker border shade)
- `--color-text-muted: rgba(57, 57, 58, 0.7);` (muted text with opacity)

## Changes Required

### 1. Add Font Imports

- Add Google Fonts links for Inter and Besley to both `index.html` and `creator.html` in the `<head>` section:
  ```html
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&family=Besley:wght@400;500;600&display=swap" rel="stylesheet">
  ```


### 2. Update `css/styles.css`

- **Add CSS Variables**: At the top of the file, add `:root` selector with all color variables
- **Line 9**: Replace font-family with `'Inter', 'Besley', sans-serif`
- **Line 10**: Replace `linear-gradient(135deg, #1e1e2e 0%, #2d2d44 100%)` with `var(--color-bg)`
- **Line 11**: Update text color to `var(--color-text)`
- **Line 19**: Update heading color to `var(--color-text)`
- **Line 47**: Replace `.btn-primary` gradient with `var(--color-primary)`
- **Line 52-54**: Remove `transform: translateY(-2px)` and `box-shadow` from `.btn-primary:hover`, replace with `background: var(--color-primary-light)`
- **Line 57-59**: Update `.btn-secondary` colors to use CSS variables
- **Line 62-65**: Remove `transform: translateY(-2px)` from `.btn-secondary:hover`, use lighter background color variable
- **Line 70**: Update error message background if needed (use variables)

### 3. Update `css/creator.css`

- **Line 10**: Update `.sidebar` background to `var(--color-bg)` or white
- **Line 11**: Update border color to `var(--color-border-light)` or appropriate border variable
- **Line 21-24**: Remove gradient text effect from `.sidebar-title` (remove `-webkit-background-clip`, `-webkit-text-fill-color`, `background-clip`), use `color: var(--color-primary)` or `var(--color-text)`
- **Line 35**: Update label color to `var(--color-text)`
- **Line 43**: Update range input background to use background color variable with opacity
- **Line 55**: Replace slider thumb gradient with `var(--color-primary)`
- **Line 61-64**: Remove `transform: scale(1.1)` from slider thumb hover, use lighter color or keep same
- **Line 70**: Replace slider thumb gradient (Firefox) with `var(--color-primary)`
- **Line 77-80**: Remove `transform: scale(1.1)` from Firefox slider thumb hover
- **Line 86**: Update `.slider-value` background to use primary color variable with opacity
- **Line 89**: Update slider value text color to `var(--color-text)`
- **Line 107**: Update border color to use border color variable
- **Line 111**: Update link color to `var(--color-primary)`
- **Line 117-119**: Remove any transform from link hover, use `var(--color-primary-light)` for color change
- **Line 124**: Update canvas container background to `var(--color-bg)` or appropriate shade

### 4. Update `css/gallery.css`

- **Line 20**: Update `.planet-card` background to `var(--color-bg)` or white
- **Line 21**: Update border color to use border color variable
- **Line 28-32**: Remove `transform: translateY(-4px)` from `.planet-card:hover`, use lighter border color or background for feedback
- **Line 31**: Update hover border color to use primary color variable
- **Line 39**: Replace `.planet-preview` gradient with `var(--color-bg)` or appropriate variable
- **Line 47-55**: Remove `.planet-preview::before` radial gradient effect entirely or replace with solid color
- **Line 64**: Update planet name color to `var(--color-text)`
- **Line 70**: Update planet date color to `var(--color-text-muted)` or text color with opacity
- **Line 98-102**: Replace `.create-new-btn` gradient with `var(--color-primary)`
- **Line 109-112**: Remove `transform: translateY(-2px)` from `.create-new-btn:hover`, use `background: var(--color-primary-light)` for color feedback
- **Line 117**: Update empty state text color to `var(--color-text)`
- **Line 122**: Update empty state heading color to `var(--color-text)`

## Implementation Notes

- **CSS Variables**: Define all color variables in `:root` selector in `styles.css` so they're available globally across all CSS files
- Remove all `linear-gradient()` and `radial-gradient()` declarations
- Remove all `transform` properties from hover states (translateY, scale, etc.)
- Remove `-webkit-background-clip: text` and `-webkit-text-fill-color: transparent` for gradient text effects
- Replace all hardcoded color values with CSS variable references (e.g., `var(--color-text)`, `var(--color-bg)`, `var(--color-primary)`)
- For hover states: Use lighter color variations (e.g., `var(--color-primary-light)`) instead of transformations
- Use `rgba()` with CSS variables when opacity is needed, or define separate opacity variables
- Ensure sufficient contrast between text and background colors
- Test hover states show clear color feedback without any movement/transformation