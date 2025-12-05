// Type definitions for the procedural planets app

export interface PlanetParameters {
  terrainComplexity: number;
  colorVariation: number;
  size: number;
}

export interface Planet {
  id: string;
  name: string;
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
  colorVariation: number;
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
  colorVariation: number;
}
