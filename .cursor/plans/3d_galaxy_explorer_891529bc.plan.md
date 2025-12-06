---
name: 3D Galaxy Explorer
overview: Transform the gallery page into a 3D WebGL galaxy exploration scene where users fly a rocket spaceship with mouse controls to visit their created planets, with proximity-based Edit/Delete buttons and a fixed Add Planet button.
todos:
  - id: extend-planet-generator
    content: Extend planet-generator.ts to support rendering planets at different world positions with model matrix transforms
    status: pending
  - id: create-rocket-geometry
    content: Create src/rocket.ts with low-poly rocket geometry (cone + cylinder + fins) and flight controls
    status: pending
  - id: create-galaxy-scene
    content: Create src/galaxy-scene.ts for multi-planet scene management, starfield, and camera system
    status: pending
  - id: update-gallery-html
    content: Update pages/index.html with fullscreen WebGL canvas and overlay UI (Add Planet button, Edit/Delete buttons)
    status: pending
  - id: rewrite-gallery-ts
    content: Rewrite src/gallery.ts to initialize 3D scene, handle proximity detection, and manage planet interactions
    status: pending
  - id: update-gallery-css
    content: Update css/gallery.css for fullscreen canvas layout and fixed-position overlay buttons
    status: pending
---

# 3D Galaxy Explorer Implementation

## Rocket Spaceship ASCII Design

The rocket will be a simple low-poly 3D model built from triangles, designed to look good from any angle:

```
        TOP VIEW                    SIDE VIEW
           /\                          /\
          /  \                        /  \
         /    \                      / ** \      <- Cockpit window
        /______\                    /______\
        |      |                    |      |
        |      |                    |      |
        |______|                    |______|
       /|      |\                  /|      |\
      / |______| \                / |______| \   <- Fins
     /____________\              /____________\
         \ || /                      \ || /
          \||/                        \||/      <- Engine exhaust
           \/                          \/

        3D WIREFRAME (isometric view)
              
               /\
              /  \
             /    \
            /      \
           /________\
          |\ ROCKET /|
          | \      / |
          |  \    /  |
          |   \  /   |
          |____\/____| 
         /|    ||    |\
        / |    ||    | \
       /__|____|_____|__\
          |    ||    |
          \    ||    /
           \   ||   /
            \  ||  /
             \ || /
              \||/
               \/
```

## How the 3D Rocket Will Be Built

The rocket geometry consists of:

1. **Nose Cone**: A cone made of triangular faces pointing forward (direction of travel)
2. **Body**: A cylinder/octagonal prism for the main fuselage  
3. **Fins**: 3-4 triangular fins at the back for stability visual
4. **Engine**: Small cone at the back (optional glow effect)

The rocket will be constructed using the same WebGL vertex/index buffer approach as the planets, with ~50-100 triangles.

## Control Scheme

```
                    SCREEN
    ┌────────────────────────────────────┐
    │                                    │
    │     Mouse Position = Target        │
    │            ┌───┐                   │
    │            │ X │ ← Rocket flies    │
    │            └───┘   toward cursor   │
    │                                    │
    │  Scroll Wheel = Speed/Throttle     │
    │                                    │
    │                      ┌──────────┐  │
    │                      │+ Add     │  │
    │                      │  Planet  │  │
    └──────────────────────┴──────────┴──┘
```

- **Mouse Position**: Rocket rotates and flies toward where the cursor is pointing
- **Scroll Wheel**: Controls speed (forward/backward thrust)
- **Click + Drag**: Look around (camera follows rocket orientation)

## Scene Layout & Planet Positioning

```
    GALAXY VIEW (top-down conceptual)
    
    ┌─────────────────────────────────────────────┐
    │     ★              ★              ★         │
    │           ┌─────────────────┐               │
    │    ★      │   🪐      🪐   │      ★        │
    │           │        🚀       │               │
    │      ★    │   🪐       🪐  │    ★          │
    │           │      🪐        │               │
    │     ★     └─────────────────┘     ★        │
    │                  ↑                          │
    │         "Spawn Zone" radius                 │
    │              ★         ★                   │
    └─────────────────────────────────────────────┘
    
    🪐 = Saved planets (3D rendered like creator view)
    🚀 = Player's rocket ship (starts at origin)
    ★  = Background stars (infinite starfield)
```

### Planet Positioning Rules

1. **Rocket starts at origin** (0, 0, 0)
2. **Planets spawn in a "neighborhood" around the rocket**:

   - Random positions within a **spawn radius** (e.g., 50-150 units from origin)
   - Ensures all planets are reachable within ~10-30 seconds of flight

3. **Minimum spacing between planets** (e.g., 20 units) to prevent overlap
4. **Random Y-axis offset** (slight vertical variation, ±10 units) for 3D depth
5. **New planets** added via creator will spawn at a random position within the same zone
```
    Position Algorithm (pseudocode):
    
    for each planet:
        angle = random(0, 2π)           // Random direction
        distance = random(50, 150)       // Within spawn zone
        y_offset = random(-10, 10)       // Slight vertical spread
        
        x = cos(angle) * distance
        y = y_offset
        z = sin(angle) * distance
        
        // Check minimum spacing from other planets
        // If too close, regenerate position
```


This ensures the player immediately sees planets nearby when entering the galaxy, without needing to search an empty void.

## Proximity Interaction

```
    FAR FROM PLANET              CLOSE TO PLANET
    
    ┌──────────────┐            ┌──────────────┐
    │              │            │  ┌────────┐  │
    │              │            │  │ Edit   │  │
    │    🪐       │     →      │  └────────┘  │
    │              │            │    🪐       │
    │              │            │  ┌────────┐  │
    │    🚀       │            │  │ Delete │  │
    └──────────────┘            └──────────────┘
    
    Distance > threshold        Distance < threshold
    (No buttons shown)          (HTML buttons appear)
```

## File Structure Changes

### Modified Files

- `pages/index.html` - Replace 2D gallery with 3D WebGL canvas + overlay UI
- `src/gallery.ts` - Complete rewrite for 3D scene management
- `css/gallery.css` - Update for fullscreen canvas + overlay positioning

### New Files

- `src/rocket.ts` - Rocket geometry, movement, and controls
- `src/galaxy-scene.ts` - Scene management, planet placement, rendering loop

## Key Implementation Details

### 1. Galaxy Scene (`src/galaxy-scene.ts`)

- Reuses planet rendering from `planet-generator.ts` (icosphere, shaders, noise)
- Adds multi-object rendering (render multiple planets at different positions)
- Implements starfield background (GL_POINTS or small quads)
- Camera follows rocket position with smooth interpolation

### 2. Rocket Ship (`src/rocket.ts`)

- Low-poly cone + cylinder + fins geometry
- Mouse-based flight controls (yaw/pitch toward cursor)
- Scroll wheel for thrust/speed
- Third-person camera offset

### 3. Updated Gallery (`src/gallery.ts`)

- Loads all planets from storage
- Positions them in 3D space (spiral/grid distribution)
- Tracks rocket-to-planet distances
- Shows/hides HTML buttons based on proximity
- Handles Edit (redirect to creator) and Delete (remove + re-render)

### 4. HTML Overlay (`pages/index.html`)

```html
<canvas id="galaxy-canvas"></canvas>
<div id="planet-actions" style="display: none;">
  <button id="edit-btn">Edit</button>
  <button id="delete-btn">Delete</button>
</div>
<a href="/creator" id="add-planet-btn">+ Add Planet</a>
```

## Technical Approach

1. **Extend planet-generator.ts exports** to allow rendering planets at arbitrary world positions (add model matrix parameter)
2. **Create rocket geometry** similar to `generateIcosphere()` but for rocket shape
3. **Implement flight physics** with smooth acceleration/deceleration
4. **Use raycasting or distance checks** for planet proximity detection
5. **Project 3D planet positions to 2D screen coords** to position HTML buttons