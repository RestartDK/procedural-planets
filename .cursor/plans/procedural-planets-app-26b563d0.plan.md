<!-- 26b563d0-bb9f-4cf7-9fd6-bd374b346454 e0910419-84be-4b7b-ade8-1458b74ac128 -->
# Procedural Planets App Implementation Plan

## Project Structure

```
procedural-planets/
├── index.html              # Gallery page (entry point)
├── creator.html            # Planet creator/viewer page
├── css/
│   ├── styles.css         # Shared styles
│   ├── gallery.css        # Gallery page styles
│   └── creator.css        # Creator page styles
├── js/
│   ├── gallery.js         # Gallery page logic (localStorage management)
│   ├── planet-generator.js # WebGL planet generation and rendering
│   ├── controls.js         # Parameter controls and UI interactions
│   └── storage.js          # LocalStorage utilities for saving/loading planets
└── pm-docs/                # Existing documentation
```

## Page 1: Gallery (index.html)

### ASCII UI Sketch

```
┌─────────────────────────────────────────────────────────────┐
│  Procedural Planets Gallery                                    │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐│
│  │                 │  │                 │  │                 ││
│  │   [Planet 1]   │  │   [Planet 2]   │  │   [Planet 3]   ││
│  │                 │  │                 │  │                 ││
│  │   Name: Earth   │  │   Name: Mars    │  │   Name: Venus   ││
│  │   Created: ...  │  │   Created: ...  │  │   Created: ...  ││
│  │                 │  │                 │  │                 ││
│  │  [View] [Delete]│  │  [View] [Delete]│  │  [View] [Delete]││
│  └─────────────────┘  └─────────────────┘  └─────────────────┘│
│                                                               │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │              [+ Create New Planet]                       │ │
│  └─────────────────────────────────────────────────────────┘ │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

**Features:**

- Grid/list view of saved planets (thumbnails or previews)
- Each card shows planet name, creation date
- "View" button navigates to creator.html with planet loaded
- "Delete" button removes from localStorage
- "+ Create New Planet" button navigates to creator.html (empty state)

## Page 2: Creator/Viewer (creator.html)

### ASCII UI Sketch

```
┌──────────────────────────────────────────────────────────────────────┐
│                                                                      │
│  ┌──────────────────────┐  ┌──────────────────────────────────────┐ │
│  │                      │  │                                      │ │
│  │   DK Planet          │  │                                      │ │
│  │                      │  │                                      │ │
│  │   ┌────────────────┐ │  │                                      │ │
│  │   │ Terrain        │ │  │                                      │ │
│  │   │ ●──────────────│ │  │         [WebGL Canvas]                │ │
│  │   └────────────────┘ │  │         (3D Planet Globe)            │ │
│  │                      │  │                                      │ │
│  │   ┌────────────────┐ │  │                                      │ │
│  │   │ Color          │ │  │                                      │ │
│  │   │ ──────●─────── │ │  │                                      │ │
│  │   └────────────────┘ │  │                                      │ │
│  │                      │  │                                      │ │
│  │   ┌────────────────┐ │  │                                      │ │
│  │   │ Size           │ │  │                                      │ │
│  │   │ ●──────────────│ │  │                                      │ │
│  │   └────────────────┘ │  │                                      │ │
│  │                      │  │                                      │ │
│  │   ┌────────────────┐ │  │                                      │ │
│  │   │ [Randomize]    │ │  │                                      │ │
│  │   └────────────────┘ │  │                                      │ │
│  │                      │  │                                      │ │
│  │   ┌────────────────┐ │  │                                      │ │
│  │   │ [Save Planet]  │ │  │                                      │ │
│  │   └────────────────┘ │  │                                      │ │
│  │                      │  │                                      │ │
│  │   [← Back to Gallery]│  │                                      │ │
│  │                      │  │                                      │ │
│  └──────────────────────┘  └──────────────────────────────────────┘ │
│                                                                      │
└──────────────────────────────────────────────────────────────────────┘
```

**Features:**

- Left sidebar (1/3 width): Parameter controls
- Right canvas area (2/3 width): WebGL planet visualization
- Three sliders: Terrain Complexity, Color Variation, Size
- Two buttons: Randomize (generates new random parameters), Save Planet (saves to localStorage)
- Navigation back to gallery
- Interactive 3D globe: drag to rotate, scroll/zoom to zoom

## Implementation Details

### 1. WebGL Planet Generation (`js/planet-generator.js`)

**Core Algorithm:**

- Use WebGL to render a 3D sphere
- Generate sphere vertices using parametric equations
- Apply procedural noise (simplex/perlin noise) for terrain height
- Use shaders for:
  - Vertex shader: Apply height displacement based on noise
  - Fragment shader: Color based on height/elevation and color variation parameter
- Implement camera controls (orbit, zoom)

**Key Functions:**

- `initWebGL(canvas)` - Initialize WebGL context
- `generateSphereGeometry(segments)` - Generate sphere mesh
- `applyNoise(vertices, terrainComplexity)` - Apply procedural terrain
- `renderPlanet(params)` - Main rendering loop
- `setupCameraControls(canvas)` - Mouse/touch controls for rotation and zoom

### 2. Parameter Controls (`js/controls.js`)

**Slider Management:**

- Terrain Complexity: 0-1, affects noise frequency/amplitude
- Color Variation: 0-1, affects color gradient range
- Size: 0.5-2.0, scales planet radius

**Button Actions:**

- Randomize: Generate random values for all three sliders, update planet
- Save Planet: Prompt for name, save current parameters + timestamp to localStorage

**Real-time Updates:**

- Slider changes trigger planet regeneration
- Debounce rapid slider movements for performance

### 3. LocalStorage Management (`js/storage.js`)

**Data Structure:**

```javascript
{
  id: "uuid",
  name: "Planet Name",
  createdAt: "ISO timestamp",
  parameters: {
    terrainComplexity: 0.5,
    colorVariation: 0.5,
    size: 1.0
  }
}
```

**Functions:**

- `savePlanet(name, parameters)` - Save to localStorage with unique ID
- `loadPlanet(id)` - Retrieve planet by ID
- `getAllPlanets()` - Get all saved planets
- `deletePlanet(id)` - Remove from localStorage

### 4. Gallery Page (`index.html` + `js/gallery.js`)

**Functionality:**

- Load all planets from localStorage on page load
- Display as grid of cards
- Each card: thumbnail preview (can be simple colored circle or generated mini-preview)
- Click "View" → navigate to `creator.html?id={planetId}`
- Click "Delete" → confirm and remove from storage
- "Create New" → navigate to `creator.html` (no ID)

### 5. Creator Page (`creator.html` + integration)

**URL Parameters:**

- `?id={planetId}` - Load existing planet
- No ID - Start with default/random parameters

**Initialization:**

- Check URL for planet ID
- If ID exists: load parameters and apply to sliders
- If no ID: use default or random parameters
- Initialize WebGL canvas
- Set up event listeners for sliders and buttons

### 6. Styling (`css/`)

**Design Principles:**

- Modern, clean interface
- Responsive layout (sidebar + canvas)
- Smooth transitions for slider updates
- Consistent color scheme
- Accessible form controls

**Key Styles:**

- Flexbox/Grid for layout
- Custom slider styling
- Button hover states
- Card-based gallery layout
- WebGL canvas full height in right panel

## Technical Considerations

1. **WebGL Compatibility:** Check for WebGL support, show fallback message if unavailable
2. **Performance:** Use requestAnimationFrame for smooth rendering
3. **Noise Generation:** Implement simple noise function (avoid external libraries per requirements)
4. **Mobile Support:** Touch events for planet interaction
5. **Browser Storage:** Handle localStorage quota exceeded errors gracefully

## File-by-File Breakdown

### `index.html`

- Gallery page structure
- Grid container for planet cards
- Navigation to creator page
- Link to CSS and JS files

### `creator.html`

- Two-column layout (sidebar + canvas)
- Sidebar with title, sliders, buttons
- WebGL canvas element
- Link to CSS and JS files

### `css/styles.css`

- Reset/normalize styles
- Base typography
- Common button styles
- Layout utilities

### `css/gallery.css`

- Gallery grid layout
- Planet card styling
- Responsive breakpoints

### `css/creator.css`

- Two-column flex layout
- Sidebar styling
- Slider custom styling
- Canvas container

### `js/planet-generator.js`

- WebGL initialization
- Sphere geometry generation
- Noise function implementation
- Shader compilation and linking
- Rendering loop
- Camera/orbit controls

### `js/controls.js`

- Slider event handlers
- Parameter update logic
- Randomize button handler
- Save button handler (with name prompt)
- Real-time planet regeneration

### `js/storage.js`

- LocalStorage CRUD operations
- Planet data serialization
- ID generation (UUID or timestamp-based)

### `js/gallery.js`

- Load planets on page init
- Render planet cards
- Handle view/delete actions
- Navigation to creator page

## Implementation Order

1. **Foundation:** HTML structure for both pages, basic CSS layout
2. **WebGL Core:** Planet generation and rendering (start with simple sphere)
3. **Procedural Generation:** Add noise-based terrain
4. **Controls:** Implement sliders and parameter updates
5. **Storage:** LocalStorage save/load functionality
6. **Gallery:** Display saved planets
7. **Interactions:** Drag/zoom controls, polish UI
8. **Integration:** Connect all pieces, handle edge cases

## Testing Checklist

- [ ] WebGL planet renders correctly
- [ ] Sliders update planet in real-time
- [ ] Randomize button generates new planets
- [ ] Save planet stores to localStorage
- [ ] Gallery displays saved planets
- [ ] Load planet from gallery works
- [ ] Delete planet removes from storage
- [ ] Drag to rotate planet works
- [ ] Zoom in/out works
- [ ] Mobile touch controls work
- [ ] Handles localStorage quota exceeded
- [ ] Handles WebGL not supported