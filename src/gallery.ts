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

/**
 * Create a simple preview for a planet
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
  
  // Draw a simple gradient circle based on parameters
  const centerX = 100;
  const centerY = 100;
  const radius = 80;
  
  // Base color based on color variation
  const hue = (parameters.colorVariation || 0.5) * 360;
  const saturation = 50 + (parameters.colorVariation || 0.5) * 30;
  const lightness = 40 + (parameters.colorVariation || 0.5) * 20;
  
  // Create gradient
  const gradient = ctx.createRadialGradient(
    centerX - 20, centerY - 20, 0,
    centerX, centerY, radius
  );
  
  gradient.addColorStop(0, `hsl(${hue}, ${saturation}%, ${lightness + 20}%)`);
  gradient.addColorStop(0.5, `hsl(${hue}, ${saturation}%, ${lightness}%)`);
  gradient.addColorStop(1, `hsl(${hue}, ${saturation}%, ${lightness - 10}%)`);
  
  ctx.fillStyle = gradient;
  ctx.beginPath();
  ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
  ctx.fill();
  
  // Add some texture based on terrain complexity
  const terrainComplexity = parameters.terrainComplexity || 0.5;
  if (terrainComplexity > 0.3) {
    ctx.fillStyle = 'rgba(0, 0, 0, 0.1)';
    for (let i = 0; i < 20; i++) {
      const angle = Math.random() * Math.PI * 2;
      const dist = Math.random() * radius * 0.8;
      const x = centerX + Math.cos(angle) * dist;
      const y = centerY + Math.sin(angle) * dist;
      const size = terrainComplexity * 5;
      ctx.beginPath();
      ctx.arc(x, y, size, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  
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
      <img src="${preview}" alt="${escapeHtml(planet.name)}" style="width: 100%; height: 100%; object-fit: cover; border-radius: 8px;">
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
