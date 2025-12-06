import { composeModelMatrix } from "./planet-generator";
import type { PlanetGeometry } from "./types";

export interface RocketGeometry extends PlanetGeometry {}

export interface RocketState {
  position: [number, number, number];
  yaw: number;
  pitch: number;
  roll: number;
  visualRoll: number;
  visualPitch: number;
  speed: number;
  targetSpeed: number;
  forward: [number, number, number];
}

export interface RocketInput {
  aimX: number; // normalized -1..1 (screen space)
  aimY: number; // normalized -1..1 (screen space)
  thrusting: boolean;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function defaultRocketState(): RocketState {
  return {
    position: [0, 0, 0],
    yaw: 0,
    pitch: 0,
    roll: 0,
    visualRoll: 0,
    visualPitch: 0,
    speed: 8,
    targetSpeed: 8,
    forward: [0, 0, 1]
  };
}

function createNormalBuffer(vertices: number[], indices: number[]): number[] {
  const normals = new Array(vertices.length).fill(0);

  for (let i = 0; i < indices.length; i += 3) {
    // Validate triangle indices exist
    if (indices[i] === undefined || indices[i + 1] === undefined || indices[i + 2] === undefined) {
      throw new Error(`Invalid triangle indices at index ${i}`);
    }

    const i0 = indices[i]! * 3;
    const i1 = indices[i + 1]! * 3;
    const i2 = indices[i + 2]! * 3;

    // Validate vertex indices are within bounds and vertices exist
    const maxIndex = Math.max(i0 + 2, i1 + 2, i2 + 2);
    if (maxIndex >= vertices.length) {
      throw new Error(`Vertex index out of bounds: ${maxIndex} >= ${vertices.length}`);
    }

    // Validate all vertex components exist
    const v0x = vertices[i0];
    const v0y = vertices[i0 + 1];
    const v0z = vertices[i0 + 2];
    const v1x = vertices[i1];
    const v1y = vertices[i1 + 1];
    const v1z = vertices[i1 + 2];
    const v2x = vertices[i2];
    const v2y = vertices[i2 + 1];
    const v2z = vertices[i2 + 2];

    if (
      v0x === undefined || v0y === undefined || v0z === undefined ||
      v1x === undefined || v1y === undefined || v1z === undefined ||
      v2x === undefined || v2y === undefined || v2z === undefined
    ) {
      throw new Error(`Invalid vertex data at indices ${i0}, ${i1}, ${i2}`);
    }

    const v0 = [v0x, v0y, v0z];
    const v1 = [v1x, v1y, v1z];
    const v2 = [v2x, v2y, v2z];

    const edge1 = [v1[0]! - v0[0]!, v1[1]! - v0[1]!, v1[2]! - v0[2]!];
    const edge2 = [v2[0]! - v0[0]!, v2[1]! - v0[1]!, v2[2]! - v0[2]!];

    const nx = edge1[1]! * edge2[2]! - edge1[2]! * edge2[1]!;
    const ny = edge1[2]! * edge2[0]! - edge1[0]! * edge2[2]!;
    const nz = edge1[0]! * edge2[1]! - edge1[1]! * edge2[0]!;

    normals[i0] += nx; normals[i0 + 1] += ny; normals[i0 + 2] += nz;
    normals[i1] += nx; normals[i1 + 1] += ny; normals[i1 + 2] += nz;
    normals[i2] += nx; normals[i2 + 1] += ny; normals[i2 + 2] += nz;
  }

  // Normalize
  for (let i = 0; i < normals.length; i += 3) {
    const nx = normals[i];
    const ny = normals[i + 1];
    const nz = normals[i + 2];
    
    if (nx === undefined || ny === undefined || nz === undefined) {
      throw new Error(`Invalid normal data at index ${i}`);
    }
    
    const len = Math.hypot(nx, ny, nz) || 1;
    normals[i] = nx / len;
    normals[i + 1] = ny / len;
    normals[i + 2] = nz / len;
  }

  return normals;
}

function addRing(vertices: number[], z: number, radius: number, segments: number): number[] {
  const idx: number[] = [];
  for (let i = 0; i < segments; i++) {
    const angle = (i / segments) * Math.PI * 2;
    vertices.push(Math.cos(angle) * radius, Math.sin(angle) * radius, z);
    idx.push(vertices.length / 3 - 1);
  }
  return idx;
}

function connectRings(indices: number[], a: number[], b: number[]): void {
  const len = a.length;
  if (b.length !== len) {
    throw new Error(`Ring arrays must have the same length: ${a.length} !== ${b.length}`);
  }
  
  for (let i = 0; i < len; i++) {
    const next = (i + 1) % len;
    
    const ai = a[i];
    const bi = b[i];
    const anext = a[next];
    const bnext = b[next];
    
    if (ai === undefined || bi === undefined || anext === undefined || bnext === undefined) {
      throw new Error(`Invalid ring index at position ${i}`);
    }
    
    indices.push(
      ai, bi, bnext,
      ai, bnext, anext
    );
  }
}

function addNose(indices: number[], tipIndex: number, ring: number[]): void {
  const len = ring.length;
  for (let i = 0; i < len; i++) {
    const next = (i + 1) % len;
    
    const ri = ring[i];
    const rnext = ring[next];
    
    if (ri === undefined || rnext === undefined) {
      throw new Error(`Invalid ring index at position ${i}`);
    }
    
    indices.push(tipIndex, ri, rnext);
  }
}

function addCap(indices: number[], centerIndex: number, ring: number[]): void {
  const len = ring.length;
  for (let i = 0; i < len; i++) {
    const next = (i + 1) % len;
    
    const ri = ring[i];
    const rnext = ring[next];
    
    if (ri === undefined || rnext === undefined) {
      throw new Error(`Invalid ring index at position ${i}`);
    }
    
    indices.push(centerIndex, rnext, ri);
  }
}

function addFin(
  vertices: number[],
  indices: number[],
  angle: number,
  baseRadius: number,
  finLength: number,
  finDepth: number
): void {
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);

  const base1 = [cos * baseRadius, sin * baseRadius, -0.4];
  const base2 = [cos * baseRadius, sin * baseRadius, -0.9];
  const tip = [cos * (baseRadius + finLength), sin * (baseRadius + finLength), -0.7 - finDepth];

  const startIndex = vertices.length / 3;
  vertices.push(...base1, ...base2, ...tip);

  // Two-sided fin for consistent lighting
  indices.push(
    startIndex, startIndex + 1, startIndex + 2,
    startIndex, startIndex + 2, startIndex + 1
  );
}

function buildRocketMesh(): { vertices: number[]; indices: number[]; normals: number[] } {
  const vertices: number[] = [];
  const indices: number[] = [];
  const segments = 14;

  // Nose tip points forward on +Z
  vertices.push(0, 0, 1.6);
  const tipIndex = 0;

  const ringA = addRing(vertices, 1.0, 0.35, segments);
  const ringB = addRing(vertices, 0.4, 0.5, segments);
  const ringC = addRing(vertices, -0.5, 0.5, segments);
  const ringD = addRing(vertices, -0.9, 0.38, segments);
  const nozzleRing = addRing(vertices, -1.2, 0.25, segments);

  vertices.push(0, 0, -1.3);
  const tailIndex = vertices.length / 3 - 1;

  addNose(indices, tipIndex, ringA);
  connectRings(indices, ringA, ringB);
  connectRings(indices, ringB, ringC);
  connectRings(indices, ringC, ringD);
  connectRings(indices, ringD, nozzleRing);
  addCap(indices, tailIndex, nozzleRing);

  // Fins
  for (let i = 0; i < 4; i++) {
    addFin(vertices, indices, (i / 4) * Math.PI * 2, 0.55, 0.35, 0.05);
  }

  const normals = createNormalBuffer(vertices, indices);
  return { vertices, indices, normals };
}

export function createRocketGeometry(gl: WebGLRenderingContext): RocketGeometry {
  const mesh = buildRocketMesh();

  const positionBuffer = gl.createBuffer();
  if (!positionBuffer) {
    throw new Error('Failed to create rocket position buffer');
  }
  gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(mesh.vertices), gl.STATIC_DRAW);

  const normalBuffer = gl.createBuffer();
  if (!normalBuffer) {
    throw new Error('Failed to create rocket normal buffer');
  }
  gl.bindBuffer(gl.ARRAY_BUFFER, normalBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(mesh.normals), gl.STATIC_DRAW);

  const indexBuffer = gl.createBuffer();
  if (!indexBuffer) {
    throw new Error('Failed to create rocket index buffer');
  }
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);
  gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(mesh.indices), gl.STATIC_DRAW);

  return {
    positions: positionBuffer,
    normals: normalBuffer,
    indices: indexBuffer,
    indexCount: mesh.indices.length
  };
}

export class Rocket {
  state: RocketState;

  constructor(initialState?: Partial<RocketState>) {
    this.state = { ...defaultRocketState(), ...initialState };
  }

  static fromState(state: RocketState): Rocket {
    const rocket = new Rocket();
    rocket.state = state;
    return rocket;
  }

  adjustThrottle(delta: number, min = 2, max = 50): void {
    this.state.targetSpeed = clamp(this.state.targetSpeed + delta, min, max);
  }

  update(input: RocketInput, deltaSeconds: number): RocketState {
    const yawDeadzone = 0.25; // don't keep spinning when mouse is near center
    const yawMagnitude = Math.abs(input.aimX);
    const yawNormalized = yawMagnitude <= yawDeadzone
      ? 0
      : (yawMagnitude - yawDeadzone) / (1 - yawDeadzone);
    const yawSpeed = Math.sign(input.aimX) * yawNormalized * (Math.PI * 0.6); // smoother, edge-biased turn rate
    this.state.yaw += yawSpeed * deltaSeconds;

    const targetPitch = -input.aimY * 0.6; // lower sensitivity for vertical look
    this.state.pitch += (targetPitch - this.state.pitch) * 0.12;
    this.state.pitch = clamp(this.state.pitch, -Math.PI / 3, Math.PI / 3);

    // Visual roll and pitch add banking/tilt while keeping movement direction smooth
    // Inverted visual response so the mesh tilts opposite to input while movement stays unchanged
    const targetRoll = clamp(input.aimX * 0.5, -Math.PI / 3, Math.PI / 3);
    this.state.visualRoll += (targetRoll - this.state.visualRoll) * 0.12;

    const targetVisualPitch = clamp(-input.aimY * 0.3, -Math.PI / 4, Math.PI / 4);
    this.state.visualPitch += (targetVisualPitch - this.state.visualPitch) * 0.12;

    const cosPitch = Math.cos(this.state.pitch);
    this.state.forward = [
      Math.sin(this.state.yaw) * cosPitch,
      Math.sin(this.state.pitch),
      Math.cos(this.state.yaw) * cosPitch
    ];

    if (input.thrusting) {
      this.state.speed += (this.state.targetSpeed - this.state.speed) * 0.08;
    } else {
      this.state.speed *= 0.97;
      if (this.state.speed < 0.01) {
        this.state.speed = 0;
      }
    }
    const moveScale = this.state.speed * deltaSeconds;

    if (this.state.speed > 0.01) {
      this.state.position = [
        this.state.position[0] + this.state.forward[0] * moveScale,
        this.state.position[1] + this.state.forward[1] * moveScale,
        this.state.position[2] + this.state.forward[2] * moveScale
      ];
    }

    return this.state;
  }

  modelMatrix(scale = 1): number[] {
    // Orient the mesh along the movement direction (rocket mesh faces +Z)
    const forward = this.state.forward;
    // Derive orientation basis from forward/up
    const worldUp: [number, number, number] = [0, 1, 0];
    let right: [number, number, number] = [
      worldUp[1]! * forward[2]! - worldUp[2]! * forward[1]!,
      worldUp[2]! * forward[0]! - worldUp[0]! * forward[2]!,
      worldUp[0]! * forward[1]! - worldUp[1]! * forward[0]!
    ];

    let rightLen = Math.hypot(right[0], right[1], right[2]);
    if (rightLen < 1e-5) {
      right = [1, 0, 0];
      rightLen = 1;
    }
    right = [right[0] / rightLen, right[1] / rightLen, right[2] / rightLen];

    const up: [number, number, number] = [
      forward[1]! * right[2]! - forward[2]! * right[1]!,
      forward[2]! * right[0]! - forward[0]! * right[2]!,
      forward[0]! * right[1]! - forward[1]! * right[0]!
    ];

    // Apply visual banking (roll) around forward axis and nose pitch offset around right axis
    const cosRoll = Math.cos(this.state.visualRoll);
    const sinRoll = Math.sin(this.state.visualRoll);
    const rolledRight: [number, number, number] = [
      right[0]! * cosRoll + up[0]! * sinRoll,
      right[1]! * cosRoll + up[1]! * sinRoll,
      right[2]! * cosRoll + up[2]! * sinRoll
    ];
    const rolledUp: [number, number, number] = [
      up[0]! * cosRoll - right[0]! * sinRoll,
      up[1]! * cosRoll - right[1]! * sinRoll,
      up[2]! * cosRoll - right[2]! * sinRoll
    ];

    const cosVPitch = Math.cos(this.state.visualPitch);
    const sinVPitch = Math.sin(this.state.visualPitch);
    const pitchedForward: [number, number, number] = [
      forward[0]! * cosVPitch - rolledUp[0]! * sinVPitch,
      forward[1]! * cosVPitch - rolledUp[1]! * sinVPitch,
      forward[2]! * cosVPitch - rolledUp[2]! * sinVPitch
    ];
    const pitchedUp: [number, number, number] = [
      rolledUp[0]! * cosVPitch + forward[0]! * sinVPitch,
      rolledUp[1]! * cosVPitch + forward[1]! * sinVPitch,
      rolledUp[2]! * cosVPitch + forward[2]! * sinVPitch
    ];

    return [
      rolledRight[0]! * scale, pitchedUp[0]! * scale, pitchedForward[0]! * scale, 0,
      rolledRight[1]! * scale, pitchedUp[1]! * scale, pitchedForward[1]! * scale, 0,
      rolledRight[2]! * scale, pitchedUp[2]! * scale, pitchedForward[2]! * scale, 0,
      this.state.position[0]!, this.state.position[1]!, this.state.position[2]!, 1
    ];
  }
}

export function createRocketState(): RocketState {
  return defaultRocketState();
}

export function adjustThrottle(state: RocketState, delta: number, min = 2, max = 50): void {
  Rocket.fromState(state).adjustThrottle(delta, min, max);
}

export function updateRocketState(
  state: RocketState,
  input: RocketInput,
  deltaSeconds: number
): RocketState {
  return Rocket.fromState(state).update(input, deltaSeconds);
}

export function rocketModelMatrix(state: RocketState, scale = 1): number[] {
  return Rocket.fromState(state).modelMatrix(scale);
}

// Fallback helper when consumers just need translation+scale (matches planet helper)
export const rocketPlacementMatrix = composeModelMatrix;
