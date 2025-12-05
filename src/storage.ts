// LocalStorage utilities for saving/loading planets

import type { Planet, PlanetParameters } from "./types";

const STORAGE_KEY = 'procedural-planets';

/**
 * Generate a unique ID for a planet
 */
function generatePlanetId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substring(2);
}

/**
 * Save a planet to localStorage
 */
export function savePlanet(name: string, parameters: PlanetParameters): Planet {
  try {
    const planet: Planet = {
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
    const err = error as Error & { name?: string };
    if (err.name === 'QuotaExceededError') {
      alert('Storage quota exceeded. Please delete some planets to save new ones.');
    } else {
      alert('Error saving planet: ' + err.message);
    }
    throw error;
  }
}

/**
 * Load a planet by ID
 */
export function loadPlanet(id: string): Planet | null {
  const planets = getAllPlanets();
  return planets.find(planet => planet.id === id) || null;
}

/**
 * Get all saved planets
 */
export function getAllPlanets(): Planet[] {
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
 */
export function deletePlanet(id: string): boolean {
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
