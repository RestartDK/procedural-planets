// Gallery page logic

import { getAllPlanets, deletePlanet } from "./storage";
import type { Planet, PlanetParameters } from "./types";

/**
 * Format date for display
 */
function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

// Noise functions ported from planet-generator.ts for preview
function noise(x: number, y: number, z: number): number {
  const n = Math.sin(x * 12.9898 + y * 78.233 + z * 37.719) * 43758.5453;
  return n - Math.floor(n);
}

function smoothNoise(x: number, y: number, z: number): number {
  const fx = Math.floor(x);
  const fy = Math.floor(y);
  const fz = Math.floor(z);
  
  const cx = x - fx;
  const cy = y - fy;
  const cz = z - fz;
  
  // Trilinear interpolation
  const n000 = noise(fx, fy, fz);
  const n001 = noise(fx, fy, fz + 1);
  const n010 = noise(fx, fy + 1, fz);
  const n011 = noise(fx, fy + 1, fz + 1);
  const n100 = noise(fx + 1, fy, fz);
  const n101 = noise(fx + 1, fy, fz + 1);
  const n110 = noise(fx + 1, fy + 1, fz);
  const n111 = noise(fx + 1, fy + 1, fz + 1);
  
  const nx00 = n000 * (1 - cx) + n100 * cx;
  const nx01 = n001 * (1 - cx) + n101 * cx;
  const nx10 = n010 * (1 - cx) + n110 * cx;
  const nx11 = n011 * (1 - cx) + n111 * cx;
  
  const nxy0 = nx00 * (1 - cy) + nx10 * cy;
  const nxy1 = nx01 * (1 - cy) + nx11 * cy;
  
  return nxy0 * (1 - cz) + nxy1 * cz;
}

function fbm(x: number, y: number, z: number, octaves: number, frequency: number, amplitude: number): number {
  let value = 0;
  let amp = amplitude;
  let freq = frequency;
  
  for (let i = 0; i < octaves; i++) {
    value += smoothNoise(x * freq, y * freq, z * freq) * amp;
    amp *= 0.5;
    freq *= 2.0;
  }
  
  return value;
}

/**
 * Create a preview for a planet that matches the WebGL renderer
 */
function createPlanetPreview(parameters: PlanetParameters): string {
  // Create a simple canvas-based preview
  const canvas = document.createElement('canvas');
  canvas.width = 200;
  canvas.height = 200;
  const ctx = canvas.getContext('2d');
  
  if (!ctx) {
    return '';
  }
  
  const centerX = 100;
  const centerY = 100;
  const baseRadius = 80;
  
  // Use same color calculation as WebGL shader
  // vec3(0.2 + u_colorVariation * 0.3, 0.4 + u_colorVariation * 0.2, 0.3 + (1.0 - u_colorVariation) * 0.4)
  const colorVariation = parameters.colorVariation ?? 0.5;
  const r = Math.round((0.2 + colorVariation * 0.3) * 255);
  const g = Math.round((0.4 + colorVariation * 0.2) * 255);
  const b = Math.round((0.3 + (1.0 - colorVariation) * 0.4) * 255);
  
  // Create gradient with WebGL colors
  const gradient = ctx.createRadialGradient(
    centerX - 20, centerY - 20, 0,
    centerX, centerY, baseRadius
  );
  
  // Lighter center, darker edges (simulating lighting)
  gradient.addColorStop(0, `rgb(${Math.min(255, r + 40)}, ${Math.min(255, g + 40)}, ${Math.min(255, b + 40)})`);
  gradient.addColorStop(0.5, `rgb(${r}, ${g}, ${b})`);
  gradient.addColorStop(1, `rgb(${Math.max(0, r - 30)}, ${Math.max(0, g - 30)}, ${Math.max(0, b - 30)})`);
  
  // Apply terrain complexity to create irregular shape
  const terrainComplexity = parameters.terrainComplexity ?? 0.5;
  const noiseScale = 0.5 + terrainComplexity * 1.5;
  const noiseStrength = 0.1 + terrainComplexity * 0.2;
  
  // Draw planet shape with noise-based deformation
  ctx.beginPath();
  const numPoints = 64; // Number of points around the circle
  for (let i = 0; i <= numPoints; i++) {
    const angle = (i / numPoints) * Math.PI * 2;
    
    // Convert angle to 3D coordinates for noise sampling
    const x = Math.cos(angle);
    const y = Math.sin(angle);
    const z = 0; // Use 2D projection
    
    // Sample noise at this angle
    const noiseValue = fbm(x, y, z, 4, noiseScale, 1.0);
    const displacement = (noiseValue - 0.5) * noiseStrength;
    const radius = baseRadius * (1.0 + displacement);
    
    const px = centerX + Math.cos(angle) * radius;
    const py = centerY + Math.sin(angle) * radius;
    
    if (i === 0) {
      ctx.moveTo(px, py);
    } else {
      ctx.lineTo(px, py);
    }
  }
  ctx.closePath();
  
  ctx.fillStyle = gradient;
  ctx.fill();
  
  return canvas.toDataURL();
}

/**
 * Escape HTML to prevent XSS
 */
function escapeHtml(text: string): string {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

/**
 * Create planet card element
 */
function createPlanetCard(planet: Planet): HTMLDivElement {
  const card = document.createElement('div');
  card.className = 'planet-card';
  
  const preview = createPlanetPreview(planet.parameters);
  
  card.innerHTML = `
    <div class="planet-preview">
      <img src="${preview}" alt="${escapeHtml(planet.name)}" style="width: 100%; height: 100%; object-fit: contain; border-radius: 8px;">
    </div>
    <div class="planet-info">
      <div class="planet-name">${escapeHtml(planet.name)}</div>
      <div class="planet-date">Created: ${formatDate(planet.createdAt)}</div>
    </div>
    <div class="planet-actions">
      <a href="/creator?id=${planet.id}" class="btn btn-primary">View</a>
      <button class="btn btn-delete" data-planet-id="${planet.id}">Delete</button>
    </div>
  `;
  
  // Add delete handler
  const deleteBtn = card.querySelector<HTMLButtonElement>('.btn-delete');
  if (deleteBtn) {
    deleteBtn.addEventListener('click', () => {
      if (confirm(`Are you sure you want to delete "${planet.name}"?`)) {
        if (deletePlanet(planet.id)) {
          card.remove();
          checkEmptyState();
        } else {
          alert('Error deleting planet.');
        }
      }
    });
  }
  
  return card;
}

/**
 * Check if gallery is empty and show message
 */
function checkEmptyState(): void {
  const grid = document.getElementById('planets-grid');
  if (!grid) return;
  
  const planets = getAllPlanets();
  
  if (planets.length === 0) {
    grid.innerHTML = `
      <div class="empty-state" style="grid-column: 1 / -1;">
        <h2>No planets yet</h2>
        <p>Create your first procedural planet to get started!</p>
      </div>
    `;
  }
}

/**
 * Load and display all planets
 */
function loadPlanets(): void {
  const grid = document.getElementById('planets-grid');
  if (!grid) return;
  
  const planets = getAllPlanets();
  
  // Sort by creation date (newest first)
  planets.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  
  if (planets.length === 0) {
    checkEmptyState();
    return;
  }
  
  grid.innerHTML = '';
  
  planets.forEach(planet => {
    const card = createPlanetCard(planet);
    grid.appendChild(card);
  });
}

// Initialize gallery when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', loadPlanets);
} else {
  loadPlanets();
}
