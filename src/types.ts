// Type definitions for the procedural planets app

export interface PlanetParameters {
  terrainComplexity: number;
  color: string;
  size: number;
}

export interface Planet {
  id: string;
  createdAt: string;
  parameters: PlanetParameters;
}

export interface Camera {
  rotationX: number;
  rotationY: number;
  distance: number;
  targetRotationX: number;
  targetRotationY: number;
  targetDistance: number;
}

export interface PlanetGeometry {
  positions: WebGLBuffer;
  normals: WebGLBuffer;
  indices: WebGLBuffer;
  indexCount: number;
}

export interface SphereGeometry {
  vertices: number[];
  indices: number[];
  normals: number[];
  uvs: number[];
}

export interface MVP {
  mvp: number[];
  modelView: number[];
  normalMatrix: number[];
}

export interface RenderParams {
  color: [number, number, number];
  modelMatrix?: number[];
  viewMatrix?: number[];
  projectionMatrix?: number[];
  lightDirection?: [number, number, number];
}

// Reusable math/geometry helpers for 3D scenes
export interface PlanetMeshData {
  vertices: number[];
  normals: number[];
  indices: number[];
}

export interface PlanetInstance {
  planet: Planet;
  position: [number, number, number];
  size: number;
  color: [number, number, number];
  geometry?: PlanetGeometry;
}
