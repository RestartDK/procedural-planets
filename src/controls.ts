import { loadPlanet, savePlanet } from "./storage";
import type { PlanetParameters } from "./types";
import { 
  initPlanetGenerator, 
  updatePlanet, 
  startRenderLoop, 
  updateRenderParams 
} from "./planet-generator";

let currentParams: PlanetParameters = {
  terrainComplexity: 0.5,
  colorVariation: 0.5,
  size: 1.0
};

let updateTimeout: ReturnType<typeof setTimeout> | null = null;

/**
 * Initialize controls
 */
function initControls(): void {
  const canvas = document.getElementById('planet-canvas') as HTMLCanvasElement | null;
  
  if (!canvas) {
    console.error('Canvas element not found');
    return;
  }
  
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
function updateSliders(): void {
  const terrainSlider = document.getElementById('terrain-slider') as HTMLInputElement | null;
  const colorSlider = document.getElementById('color-slider') as HTMLInputElement | null;
  const sizeSlider = document.getElementById('size-slider') as HTMLInputElement | null;
  
  if (terrainSlider) terrainSlider.value = currentParams.terrainComplexity.toString();
  if (colorSlider) colorSlider.value = currentParams.colorVariation.toString();
  if (sizeSlider) sizeSlider.value = currentParams.size.toString();
  
  updateSliderDisplay();
}

/**
 * Update slider display values
 */
function updateSliderDisplay(): void {
  const terrainValue = document.getElementById('terrain-value');
  const colorValue = document.getElementById('color-value');
  const sizeValue = document.getElementById('size-value');
  
  if (terrainValue) terrainValue.textContent = currentParams.terrainComplexity.toFixed(2);
  if (colorValue) colorValue.textContent = currentParams.colorVariation.toFixed(2);
  if (sizeValue) sizeValue.textContent = currentParams.size.toFixed(2);
}

/**
 * Update planet parameters (debounced)
 */
function updatePlanetParams(): void {
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
function setupEventListeners(): void {
  // Terrain slider
  const terrainSlider = document.getElementById('terrain-slider') as HTMLInputElement | null;
  if (terrainSlider) {
    terrainSlider.addEventListener('input', (e) => {
      const target = e.target as HTMLInputElement;
      currentParams.terrainComplexity = parseFloat(target.value);
      const terrainValue = document.getElementById('terrain-value');
      if (terrainValue) terrainValue.textContent = currentParams.terrainComplexity.toFixed(2);
      updatePlanetParams();
    });
  }
  
  // Color slider
  const colorSlider = document.getElementById('color-slider') as HTMLInputElement | null;
  if (colorSlider) {
    colorSlider.addEventListener('input', (e) => {
      const target = e.target as HTMLInputElement;
      currentParams.colorVariation = parseFloat(target.value);
      const colorValue = document.getElementById('color-value');
      if (colorValue) colorValue.textContent = currentParams.colorVariation.toFixed(2);
      updatePlanetParams();
    });
  }
  
  // Size slider
  const sizeSlider = document.getElementById('size-slider') as HTMLInputElement | null;
  if (sizeSlider) {
    sizeSlider.addEventListener('input', (e) => {
      const target = e.target as HTMLInputElement;
      currentParams.size = parseFloat(target.value);
      const sizeValue = document.getElementById('size-value');
      if (sizeValue) sizeValue.textContent = currentParams.size.toFixed(2);
      updatePlanetParams();
    });
  }
  
  // Randomize button
  const randomizeBtn = document.getElementById('randomize-btn');
  if (randomizeBtn) {
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
  }
  
  // Save button
  const saveBtn = document.getElementById('save-btn');
  if (saveBtn) {
    saveBtn.addEventListener('click', () => {
      saveCurrentPlanet();
    });
  }
}

/**
 * Randomize all parameters
 */
function randomizeParameters(): void {
  currentParams.terrainComplexity = Math.random();
  currentParams.colorVariation = Math.random();
  currentParams.size = 0.5 + Math.random() * 1.5; // Between 0.5 and 2.0
}

/**
 * Save current planet
 */
function saveCurrentPlanet(): void {
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
