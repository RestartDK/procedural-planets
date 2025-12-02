// Parameter controls and UI interactions

let currentParams = {
    terrainComplexity: 0.5,
    colorVariation: 0.5,
    size: 1.0
};

let updateTimeout = null;

/**
 * Initialize controls
 */
function initControls() {
    const canvas = document.getElementById('planet-canvas');
    
    // Check if we're loading an existing planet
    const urlParams = new URLSearchParams(window.location.search);
    const planetId = urlParams.get('id');
    
    if (planetId) {
        const planet = loadPlanet(planetId);
        if (planet) {
            currentParams = { ...planet.parameters };
        }
    } else {
        // Start with random parameters
        randomizeParameters();
    }
    
    // Initialize WebGL
    if (!initPlanetGenerator(canvas)) {
        return;
    }
    
    // Set initial slider values
    updateSliders();
    
    // Initialize planet with current parameters
    updatePlanet(currentParams.terrainComplexity, currentParams.colorVariation, currentParams.size);
    
    // Start render loop
    startRenderLoop(currentParams);
    
    // Setup event listeners
    setupEventListeners();
}

/**
 * Update slider values from current parameters
 */
function updateSliders() {
    document.getElementById('terrain-slider').value = currentParams.terrainComplexity;
    document.getElementById('color-slider').value = currentParams.colorVariation;
    document.getElementById('size-slider').value = currentParams.size;
    
    updateSliderDisplay();
}

/**
 * Update slider display values
 */
function updateSliderDisplay() {
    document.getElementById('terrain-value').textContent = currentParams.terrainComplexity.toFixed(2);
    document.getElementById('color-value').textContent = currentParams.colorVariation.toFixed(2);
    document.getElementById('size-value').textContent = currentParams.size.toFixed(2);
}

/**
 * Update planet parameters (debounced)
 */
function updatePlanetParams() {
    // Clear existing timeout
    if (updateTimeout) {
        clearTimeout(updateTimeout);
    }
    
    // Update render params immediately for smooth slider updates
    updateRenderParams(currentParams);
    
    // Debounce geometry regeneration for performance
    updateTimeout = setTimeout(() => {
        updatePlanet(
            currentParams.terrainComplexity,
            currentParams.colorVariation,
            currentParams.size
        );
        updateRenderParams(currentParams);
    }, 100);
}

/**
 * Setup event listeners for sliders and buttons
 */
function setupEventListeners() {
    // Terrain slider
    const terrainSlider = document.getElementById('terrain-slider');
    terrainSlider.addEventListener('input', (e) => {
        currentParams.terrainComplexity = parseFloat(e.target.value);
        document.getElementById('terrain-value').textContent = currentParams.terrainComplexity.toFixed(2);
        updatePlanetParams();
    });
    
    // Color slider
    const colorSlider = document.getElementById('color-slider');
    colorSlider.addEventListener('input', (e) => {
        currentParams.colorVariation = parseFloat(e.target.value);
        document.getElementById('color-value').textContent = currentParams.colorVariation.toFixed(2);
        updatePlanetParams();
    });
    
    // Size slider
    const sizeSlider = document.getElementById('size-slider');
    sizeSlider.addEventListener('input', (e) => {
        currentParams.size = parseFloat(e.target.value);
        document.getElementById('size-value').textContent = currentParams.size.toFixed(2);
        updatePlanetParams();
    });
    
    // Randomize button
    const randomizeBtn = document.getElementById('randomize-btn');
    randomizeBtn.addEventListener('click', () => {
        randomizeParameters();
        updateSliders();
        updatePlanet(
            currentParams.terrainComplexity,
            currentParams.colorVariation,
            currentParams.size
        );
        updateRenderParams(currentParams);
    });
    
    // Save button
    const saveBtn = document.getElementById('save-btn');
    saveBtn.addEventListener('click', () => {
        saveCurrentPlanet();
    });
}

/**
 * Randomize all parameters
 */
function randomizeParameters() {
    currentParams.terrainComplexity = Math.random();
    currentParams.colorVariation = Math.random();
    currentParams.size = 0.5 + Math.random() * 1.5; // Between 0.5 and 2.0
}

/**
 * Save current planet
 */
function saveCurrentPlanet() {
    const name = prompt('Enter a name for this planet:');
    
    if (name === null) {
        return; // User cancelled
    }
    
    if (name.trim() === '') {
        alert('Please enter a valid name.');
        return;
    }
    
    try {
        const planet = savePlanet(name.trim(), currentParams);
        alert(`Planet "${planet.name}" saved successfully!`);
    } catch (error) {
        console.error('Error saving planet:', error);
    }
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initControls);
} else {
    initControls();
}

