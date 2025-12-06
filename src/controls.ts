import { loadPlanet, savePlanet, updatePlanet as updatePlanetStorage } from "./storage";
import type { PlanetParameters, RenderParams } from "./types";
import { 
  initPlanetGenerator, 
  updatePlanet, 
  startRenderLoop, 
  updateRenderParams 
} from "./planet-generator";

const DEFAULT_COLOR = '#66a0ff';

let currentParams: PlanetParameters = {
  terrainComplexity: 0.5,
  color: DEFAULT_COLOR,
  size: 1.0
};

let currentPlanetId: string | null = null;
let updateTimeout: ReturnType<typeof setTimeout> | null = null;

function hexToRGB(color: string): [number, number, number] {
  const hex = color.replace('#', '');
  if (hex.length !== 6) {
    return [0.4, 0.6, 1];
  }
  const r = parseInt(hex.slice(0, 2), 16) / 255;
  const g = parseInt(hex.slice(2, 4), 16) / 255;
  const b = parseInt(hex.slice(4, 6), 16) / 255;
  return [r, g, b];
}

function paramsToRenderParams(params: PlanetParameters): RenderParams {
  return {
    color: hexToRGB(params.color)
  };
}

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
      currentPlanetId = planetId;
      currentParams = { ...planet.parameters };
      currentParams.color = currentParams.color || DEFAULT_COLOR;
    } else {
      currentPlanetId = null;
      randomizeParameters();
    }
  } else {
    currentPlanetId = null;
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
  updatePlanet(currentParams.terrainComplexity, currentParams.size);
  
  // Start render loop
  startRenderLoop(paramsToRenderParams(currentParams));
  
  // Setup event listeners
  setupEventListeners();
}

/**
 * Update slider values from current parameters
 */
function updateSliders(): void {
  const terrainSlider = document.getElementById('terrain-slider') as HTMLInputElement | null;
  const colorPicker = document.getElementById('color-picker') as HTMLInputElement | null;
  const sizeSlider = document.getElementById('size-slider') as HTMLInputElement | null;
  
  if (terrainSlider) terrainSlider.value = currentParams.terrainComplexity.toString();
  if (colorPicker) colorPicker.value = currentParams.color;
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
  if (colorValue) colorValue.textContent = currentParams.color.toUpperCase();
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
  updateRenderParams(paramsToRenderParams(currentParams));
  
  // Debounce geometry regeneration for performance
  updateTimeout = setTimeout(() => {
    updatePlanet(
      currentParams.terrainComplexity,
      currentParams.size
    );
    updateRenderParams(paramsToRenderParams(currentParams));
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
  const colorPicker = document.getElementById('color-picker') as HTMLInputElement | null;
  if (colorPicker) {
    colorPicker.addEventListener('input', (e) => {
      const target = e.target as HTMLInputElement;
      currentParams.color = target.value;
      const colorValue = document.getElementById('color-value');
      if (colorValue) colorValue.textContent = currentParams.color.toUpperCase();
      updateRenderParams(paramsToRenderParams(currentParams));
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
        currentParams.size
      );
      updateRenderParams(paramsToRenderParams(currentParams));
    });
  }
  
  // Save button
  const saveBtn = document.getElementById('save-btn');
  if (saveBtn) {
    saveBtn.addEventListener('click', (e) => {
      e.preventDefault();
      saveCurrentPlanet();
    });
  }
}

/**
 * Randomize all parameters
 */
function randomizeParameters(): void {
  currentParams.terrainComplexity = Math.random();
  currentParams.color = `#${Math.floor(Math.random() * 0xffffff).toString(16).padStart(6, '0')}`;
  currentParams.size = 0.5 + Math.random() * 1.5; // Between 0.5 and 2.0
}

/**
 * Save current planet
 */
function saveCurrentPlanet(): void {
  const isEditing = currentPlanetId !== null;

  try {
    if (isEditing && currentPlanetId) {
      const planet = updatePlanetStorage(currentPlanetId, currentParams);
      if (!planet) {
        console.warn('Planet not found while updating; creating new planet instead.');
        const newPlanet = savePlanet(currentParams);
        currentPlanetId = newPlanet.id;
      } else {
        // updated silently
      }
    } else {
      const planet = savePlanet(currentParams);
      currentPlanetId = planet.id;
    }

    // After successful save/update, go back to gallery
    window.location.href = '/';
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
