// LocalStorage utilities for saving/loading planets

const STORAGE_KEY = 'procedural-planets';

/**
 * Generate a unique ID for a planet
 */
function generatePlanetId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

/**
 * Save a planet to localStorage
 * @param {string} name - Planet name
 * @param {Object} parameters - Planet parameters
 * @returns {Object} Saved planet object
 */
function savePlanet(name, parameters) {
    try {
        const planet = {
            id: generatePlanetId(),
            name: name || 'Unnamed Planet',
            createdAt: new Date().toISOString(),
            parameters: {
                terrainComplexity: parameters.terrainComplexity || 0.5,
                colorVariation: parameters.colorVariation || 0.5,
                size: parameters.size || 1.0
            }
        };
        
        const planets = getAllPlanets();
        planets.push(planet);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(planets));
        
        return planet;
    } catch (error) {
        if (error.name === 'QuotaExceededError') {
            alert('Storage quota exceeded. Please delete some planets to save new ones.');
        } else {
            alert('Error saving planet: ' + error.message);
        }
        throw error;
    }
}

/**
 * Load a planet by ID
 * @param {string} id - Planet ID
 * @returns {Object|null} Planet object or null if not found
 */
function loadPlanet(id) {
    const planets = getAllPlanets();
    return planets.find(planet => planet.id === id) || null;
}

/**
 * Get all saved planets
 * @returns {Array} Array of planet objects
 */
function getAllPlanets() {
    try {
        const data = localStorage.getItem(STORAGE_KEY);
        return data ? JSON.parse(data) : [];
    } catch (error) {
        console.error('Error loading planets:', error);
        return [];
    }
}

/**
 * Delete a planet by ID
 * @param {string} id - Planet ID
 * @returns {boolean} True if deleted, false if not found
 */
function deletePlanet(id) {
    try {
        const planets = getAllPlanets();
        const filtered = planets.filter(planet => planet.id !== id);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
        return planets.length !== filtered.length;
    } catch (error) {
        console.error('Error deleting planet:', error);
        return false;
    }
}

