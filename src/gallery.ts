import { GalaxyScene } from "./galaxy-scene";
import { deletePlanet, getAllPlanets } from "./storage";

function hideActions(actions: HTMLElement | null): void {
  if (actions) {
    actions.style.display = 'none';
    actions.removeAttribute('data-planet-id');
  }
}

function initGalaxyExplorer(): void {
  const canvas = document.getElementById('galaxy-canvas') as HTMLCanvasElement | null;
  const actions = document.getElementById('planet-actions');
  const editBtn = document.getElementById('edit-btn');
  const deleteBtn = document.getElementById('delete-btn');
  const emptyState = document.getElementById('empty-state');

  if (!canvas) {
    console.error('Galaxy canvas missing');
    return;
  }

  const scene = new GalaxyScene(canvas, (planet, screen) => {
    if (!actions || !planet || !screen || !screen.onScreen) {
      hideActions(actions);
      return;
    }
    actions.style.display = 'flex';
    actions.style.left = `${screen.x}px`;
    actions.style.top = `${screen.y}px`;
    actions.setAttribute('data-planet-id', planet.planet.id);
  });

  const refreshPlanets = () => {
    const planets = getAllPlanets();
    scene.setPlanets(planets);
    if (emptyState) {
      emptyState.style.display = planets.length === 0 ? 'block' : 'none';
    }
    if (planets.length === 0) {
      hideActions(actions);
    }
  };

  if (editBtn) {
    editBtn.addEventListener('click', () => {
      const targetId = actions?.getAttribute('data-planet-id');
      if (targetId) {
        window.location.href = `/creator?id=${targetId}`;
      }
    });
  }

  if (deleteBtn) {
    deleteBtn.addEventListener('click', () => {
      const targetId = actions?.getAttribute('data-planet-id');
      if (!targetId) return;
      const planets = getAllPlanets();
      const target = planets.find((p) => p.id === targetId);
      const confirmed = target ? confirm(`Delete "${target.name}"?`) : confirm('Delete this planet?');
      if (confirmed && deletePlanet(targetId)) {
        scene.deletePlanet(targetId);
        refreshPlanets();
      }
    });
  }

  refreshPlanets();
  scene.start();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initGalaxyExplorer);
} else {
  initGalaxyExplorer();
}
