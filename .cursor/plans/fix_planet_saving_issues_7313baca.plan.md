---
name: Fix Planet Saving Issues
overview: "Fix three bugs related to planet saving: mismatched preview colors, missing edit state (creating duplicates), and value clamping for values below 0.5."
todos:
  - id: fix-preview-colors
    content: Update gallery.ts createPlanetPreview to match WebGL shader colors
    status: completed
  - id: add-edit-state
    content: Add currentPlanetId tracking in controls.ts and updatePlanet function in storage.ts
    status: completed
  - id: fix-nullish-coalescing
    content: Replace || with ?? in storage.ts and gallery.ts for default values
    status: completed
---

# Fix Planet Saving Issues

## Issue 1: Preview Doesn't Match WebGL Renderer

### 1a. Color Mismatch

Update `src/gallery.ts` `createPlanetPreview` to use same RGB calculation as WebGL shader:

```typescript
// Match: vec3(0.2 + cv * 0.3, 0.4 + cv * 0.2, 0.3 + (1.0 - cv) * 0.4)
const r = Math.round((0.2 + colorVariation * 0.3) * 255);
const g = Math.round((0.4 + colorVariation * 0.2) * 255);
const b = Math.round((0.3 + (1.0 - colorVariation) * 0.4) * 255);
```

### 1b. Missing Terrain Shape (planet looks like a circle)

Port the noise functions (`noise`, `smoothNoise`, `fbm`) from `planet-generator.ts` to `gallery.ts`, then draw the planet outline using the noise to create an irregular silhouette based on `terrainComplexity`:

- Draw path around circle where radius varies by noise value at each angle
- Use same noise parameters as WebGL: `noiseScale = 0.5 + terrainComplexity * 1.5`, `noiseStrength = 0.1 + terrainComplexity * 0.2`

## Issue 2: Missing Edit State

1. **`src/controls.ts`**: Add `currentPlanetId` variable to track if editing existing planet
2. **`src/storage.ts`**: Add `updatePlanet(id, name, parameters)` function that updates existing entry
3. **`src/controls.ts`**: Modify `saveCurrentPlanet` to call `updatePlanet` when `currentPlanetId` exists

## Issue 3: Value Clamping Bug

Replace `||` with `??` (nullish coalescing) in:

- `src/storage.ts` lines 24-26 (savePlanet)
- `src/gallery.ts` lines 40-42, 60 (createPlanetPreview)