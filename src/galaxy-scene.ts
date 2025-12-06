import {
  buildPlanetMeshData,
  composeModelMatrix,
  createPlanetGeometryFromMesh,
  createPlanetProgram,
  renderPlanetInstance
} from "./planet-generator";
import { createRocketGeometry, createRocketState, updateRocketState, adjustThrottle, rocketModelMatrix } from "./rocket";
import type { Planet, PlanetGeometry, PlanetInstance } from "./types";

interface ScenePlanet extends PlanetInstance {
  modelMatrix: number[];
  geometry: PlanetGeometry;
}

interface ScreenPosition {
  x: number;
  y: number;
  onScreen: boolean;
}

const PROXIMITY_DISTANCE = 14;

function normalizeVector(v: [number, number, number]): [number, number, number] {
  const len = Math.hypot(v[0], v[1], v[2]) || 1;
  return [v[0] / len, v[1] / len, v[2] / len];
}

function lookAt(eye: [number, number, number], target: [number, number, number], up: [number, number, number]): number[] {
  const zAxis = normalizeVector([eye[0] - target[0], eye[1] - target[1], eye[2] - target[2]]);
  let xAxis = [
    up[1] * zAxis[2] - up[2] * zAxis[1],
    up[2] * zAxis[0] - up[0] * zAxis[2],
    up[0] * zAxis[1] - up[1] * zAxis[0]
  ];
  xAxis = normalizeVector(xAxis as [number, number, number]);
  const yAxis: [number, number, number] = [
    zAxis[1]! * xAxis[2]! - zAxis[2]! * xAxis[1]!,
    zAxis[2]! * xAxis[0]! - zAxis[0]! * xAxis[2]!,
    zAxis[0]! * xAxis[1]! - zAxis[1]! * xAxis[0]!
  ];

  return [
    xAxis[0]!, yAxis[0]!, zAxis[0]!, 0,
    xAxis[1]!, yAxis[1]!, zAxis[1]!, 0,
    xAxis[2]!, yAxis[2]!, zAxis[2]!, 0,
    -(xAxis[0]! * eye[0] + xAxis[1]! * eye[1] + xAxis[2]! * eye[2]),
    -(yAxis[0]! * eye[0] + yAxis[1]! * eye[1] + yAxis[2]! * eye[2]),
    -(zAxis[0]! * eye[0] + zAxis[1]! * eye[1] + zAxis[2]! * eye[2]),
    1
  ];
}

function perspective(fovRad: number, aspect: number, near: number, far: number): number[] {
  const f = 1.0 / Math.tan(fovRad / 2);
  return [
    f / aspect, 0, 0, 0,
    0, f, 0, 0,
    0, 0, (far + near) / (near - far), -1,
    0, 0, (2 * far * near) / (near - far), 0
  ];
}

function multiply4x4(a: number[], b: number[]): number[] {
  const result = new Array(16).fill(0);
  for (let col = 0; col < 4; col++) {
    for (let row = 0; row < 4; row++) {
      let sum = 0;
      for (let k = 0; k < 4; k++) {
        sum += (a[k * 4 + row] ?? 0) * (b[col * 4 + k] ?? 0);
      }
      result[col * 4 + row] = sum;
    }
  }
  return result;
}

function distance(a: [number, number, number], b: [number, number, number]): number {
  const dx = a[0] - b[0];
  const dy = a[1] - b[1];
  const dz = a[2] - b[2];
  return Math.hypot(dx, dy, dz);
}

function projectToScreen(point: [number, number, number], viewProjection: number[], width: number, height: number): ScreenPosition {
  // Check if matrix is valid - a 4x4 matrix needs all 16 elements defined
  for (let i = 0; i < 16; i++) {
    if (viewProjection[i] === undefined) {
      return { x: 0, y: 0, onScreen: false };
    }
  }

  const x = point[0], y = point[1], z = point[2];
  const clipX = viewProjection[0]! * x + viewProjection[4]! * y + viewProjection[8]! * z + viewProjection[12]!;
  const clipY = viewProjection[1]! * x + viewProjection[5]! * y + viewProjection[9]! * z + viewProjection[13]!;
  const clipZ = viewProjection[2]! * x + viewProjection[6]! * y + viewProjection[10]! * z + viewProjection[14]!;
  const clipW = viewProjection[3]! * x + viewProjection[7]! * y + viewProjection[11]! * z + viewProjection[15]!;

  if (clipW === 0) {
    return { x: 0, y: 0, onScreen: false };
  }

  const ndcX = clipX / clipW;
  const ndcY = clipY / clipW;
  const onScreen = Math.abs(ndcX) <= 1 && Math.abs(ndcY) <= 1 && clipW > 0;

  return {
    x: (ndcX * 0.5 + 0.5) * width,
    y: (-ndcY * 0.5 + 0.5) * height,
    onScreen
  };
}

const rocketVertexShader = `
attribute vec3 a_position;
attribute vec3 a_normal;

uniform mat4 u_modelViewProjection;
uniform mat4 u_modelView;
uniform mat3 u_normalMatrix;

varying vec3 v_normal;

void main() {
  v_normal = normalize(u_normalMatrix * a_normal);
  gl_Position = u_modelViewProjection * vec4(a_position, 1.0);
}
`;

const rocketFragmentShader = `
precision mediump float;

uniform vec3 u_color;
uniform vec3 u_lightDirection;

varying vec3 v_normal;

void main() {
  vec3 normal = normalize(v_normal);
  float diffuse = max(dot(normal, u_lightDirection), 0.0);
  float ambient = 0.25;
  float light = ambient + diffuse * 0.75;
  gl_FragColor = vec4(u_color * light, 1.0);
}
`;

const starVertexShader = `
attribute vec3 a_position;
uniform mat4 u_viewProjection;
varying float v_brightness;

float hash(vec3 p) {
  return fract(sin(dot(p, vec3(12.9898, 78.233, 45.543))) * 43758.5453);
}

void main() {
  gl_Position = u_viewProjection * vec4(a_position, 1.0);
  gl_PointSize = 2.0;
  v_brightness = 0.6 + hash(a_position) * 0.4;
}
`;

const starFragmentShader = `
precision mediump float;
varying float v_brightness;

void main() {
  vec2 uv = gl_PointCoord - vec2(0.5);
  float d = length(uv);
  float alpha = smoothstep(0.5, 0.0, d);
  gl_FragColor = vec4(vec3(v_brightness), alpha);
}
`;

export class GalaxyScene {
  private canvas: HTMLCanvasElement;
  private gl: WebGLRenderingContext | null = null;
  private planetProgram: WebGLProgram | null = null;
  private rocketProgram: WebGLProgram | null = null;
  private starProgram: WebGLProgram | null = null;
  private rocketGeometry: PlanetGeometry | null = null;
  private planets: ScenePlanet[] = [];
  private rocketState = createRocketState();
  private mouse: { x: number; y: number } = { x: 0, y: 0 };
  private thrusting = false;
  private starBuffer: WebGLBuffer | null = null;
  private starCount = 350;
  private running = false;
  private lastTime = 0;
  private onFocusChange?: (planet: ScenePlanet | null, screen: ScreenPosition | null) => void;

  constructor(canvas: HTMLCanvasElement, onFocusChange?: (planet: ScenePlanet | null, screen: ScreenPosition | null) => void) {
    this.canvas = canvas;
    this.onFocusChange = onFocusChange;
    this.initGL();
    this.initEvents();
  }

  private initGL(): void {
    const context = this.canvas.getContext('webgl');
    if (!context) {
      throw new Error('Unable to initialize WebGL for galaxy scene');
    }
    this.gl = context;
    this.resize();

    this.planetProgram = createPlanetProgram(context);

    const rocketVS = this.compileShader(context.VERTEX_SHADER, rocketVertexShader);
    const rocketFS = this.compileShader(context.FRAGMENT_SHADER, rocketFragmentShader);
    this.rocketProgram = this.linkProgram(rocketVS, rocketFS);

    const starVS = this.compileShader(context.VERTEX_SHADER, starVertexShader);
    const starFS = this.compileShader(context.FRAGMENT_SHADER, starFragmentShader);
    this.starProgram = this.linkProgram(starVS, starFS);

    this.rocketGeometry = createRocketGeometry(context);
    this.setupStars();
  }

  private initEvents(): void {
    window.addEventListener('resize', () => this.resize());
    this.canvas.addEventListener('mousemove', (e) => {
      const rect = this.canvas.getBoundingClientRect();
      this.mouse.x = ((e.clientX - rect.left) / rect.width - 0.5) * 2;
      this.mouse.y = ((e.clientY - rect.top) / rect.height - 0.5) * 2;
    });
    this.canvas.addEventListener('wheel', (e) => {
      e.preventDefault();
      adjustThrottle(this.rocketState, -e.deltaY * 0.01);
    }, { passive: false });
    window.addEventListener('keydown', (e) => {
      if (e.code === 'Space') {
        e.preventDefault();
        this.thrusting = true;
      }
    });
    window.addEventListener('keyup', (e) => {
      if (e.code === 'Space') {
        this.thrusting = false;
      }
    });
  }

  private resize(): void {
    if (!this.gl) return;
    const rect = this.canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    this.canvas.width = rect.width * dpr;
    this.canvas.height = rect.height * dpr;
    this.canvas.style.width = `${rect.width}px`;
    this.canvas.style.height = `${rect.height}px`;
    this.gl.viewport(0, 0, this.canvas.width, this.canvas.height);
  }

  private compileShader(type: number, source: string): WebGLShader | null {
    if (!this.gl) return null;
    const shader = this.gl.createShader(type);
    if (!shader) return null;
    this.gl.shaderSource(shader, source);
    this.gl.compileShader(shader);
    if (!this.gl.getShaderParameter(shader, this.gl.COMPILE_STATUS)) {
      console.error('Shader compile error:', this.gl.getShaderInfoLog(shader));
      this.gl.deleteShader(shader);
      return null;
    }
    return shader;
  }

  private linkProgram(vs: WebGLShader | null, fs: WebGLShader | null): WebGLProgram | null {
    if (!this.gl || !vs || !fs) return null;
    const program = this.gl.createProgram();
    if (!program) return null;
    this.gl.attachShader(program, vs);
    this.gl.attachShader(program, fs);
    this.gl.linkProgram(program);
    if (!this.gl.getProgramParameter(program, this.gl.LINK_STATUS)) {
      console.error('Program link error:', this.gl.getProgramInfoLog(program));
      this.gl.deleteProgram(program);
      return null;
    }
    return program;
  }

  private setupStars(): void {
    if (!this.gl) return;
    const positions: number[] = [];
    const spread = 320;
    for (let i = 0; i < this.starCount; i++) {
      const x = (Math.random() - 0.5) * spread;
      const y = (Math.random() - 0.5) * spread * 0.6;
      const z = (Math.random() - 0.5) * spread;
      positions.push(x, y, z);
    }
    this.starBuffer = this.gl.createBuffer();
    if (!this.starBuffer) return;
    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.starBuffer);
    this.gl.bufferData(this.gl.ARRAY_BUFFER, new Float32Array(positions), this.gl.STATIC_DRAW);
  }

  private generatePlanetPosition(existing: ScenePlanet[]): [number, number, number] {
    const minDistance = 20;
    const minRadius = 50;
    const maxRadius = 150;

    for (let attempt = 0; attempt < 100; attempt++) {
      const angle = Math.random() * Math.PI * 2;
      const distanceFromOrigin = minRadius + Math.random() * (maxRadius - minRadius);
      const yOffset = -10 + Math.random() * 20;

      const candidate: [number, number, number] = [
        Math.cos(angle) * distanceFromOrigin,
        yOffset,
        Math.sin(angle) * distanceFromOrigin
      ];

      if (existing.every(p => distance(p.position, candidate) > minDistance)) {
        return candidate;
      }
    }
    return [Math.random() * 50, Math.random() * 6 - 3, Math.random() * 50];
  }

  setPlanets(planets: Planet[]): void {
    if (!this.gl || !this.planetProgram) return;
    const placements: ScenePlanet[] = [];

    planets.forEach((planet) => {
      const mesh = buildPlanetMeshData(
        planet.parameters.terrainComplexity,
        planet.parameters.colorVariation,
        planet.parameters.size
      );
      const geometry = createPlanetGeometryFromMesh(this.gl!, mesh);
      const position = this.generatePlanetPosition(placements);
      const modelMatrix = composeModelMatrix(position, 1);

      placements.push({
        planet,
        position,
        size: planet.parameters.size,
        colorVariation: planet.parameters.colorVariation,
        geometry,
        modelMatrix
      });
    });

    this.planets = placements;
  }

  start(): void {
    if (this.running) return;
    this.running = true;
    this.lastTime = performance.now();
    requestAnimationFrame((t) => this.render(t));
  }

  stop(): void {
    this.running = false;
  }

  deletePlanet(id: string): void {
    this.planets = this.planets.filter(p => p.planet.id !== id);
  }

  private render(timestamp: number): void {
    if (!this.running || !this.gl || !this.planetProgram || !this.rocketProgram || !this.starProgram || !this.rocketGeometry) {
      return;
    }

    const delta = Math.min((timestamp - this.lastTime) / 1000, 0.05);
    this.lastTime = timestamp;

    updateRocketState(this.rocketState, { aimX: this.mouse.x, aimY: this.mouse.y, thrusting: this.thrusting }, delta);

    // Keep rocket within world bounds
    const WORLD_RADIUS = 200;
    const pos = this.rocketState.position;
    const dist = Math.hypot(pos[0], pos[1], pos[2]);
    if (dist > WORLD_RADIUS) {
      const scale = WORLD_RADIUS / dist;
      this.rocketState.position = [pos[0] * scale, pos[1] * scale, pos[2] * scale];
    }

    const viewportWidth = this.canvas.width;
    const viewportHeight = this.canvas.height;
    const dpr = window.devicePixelRatio || 1;
    const aspect = viewportWidth / viewportHeight;

    const cameraOffset = 8;
    const cameraHeight = 2.5;

    const cameraPos: [number, number, number] = [
      this.rocketState.position[0] - this.rocketState.forward[0] * cameraOffset,
      this.rocketState.position[1] - this.rocketState.forward[1] * cameraOffset + cameraHeight,
      this.rocketState.position[2] - this.rocketState.forward[2] * cameraOffset
    ];
    const cameraTarget: [number, number, number] = [
      this.rocketState.position[0] + this.rocketState.forward[0] * 2,
      this.rocketState.position[1] + this.rocketState.forward[1] * 2,
      this.rocketState.position[2] + this.rocketState.forward[2] * 2
    ];

    const viewMatrix = lookAt(cameraPos, cameraTarget, [0, 1, 0]);
    const flipXMatrix = [
      -1, 0, 0, 0,
       0, 1, 0, 0,
       0, 0, 1, 0,
       0, 0, 0, 1
    ];
    const viewMatrixFlipped = multiply4x4(flipXMatrix, viewMatrix);
    const projectionMatrix = perspective(Math.PI / 3, aspect, 0.1, 600);
    const viewProjection = multiply4x4(projectionMatrix, viewMatrixFlipped);

    this.gl.enable(this.gl.DEPTH_TEST);
    this.gl.enable(this.gl.CULL_FACE);
    this.gl.frontFace(this.gl.CW);
    this.gl.clearColor(0.02, 0.02, 0.05, 1.0);
    this.gl.clear(this.gl.COLOR_BUFFER_BIT | this.gl.DEPTH_BUFFER_BIT);

    // Stars
    if (this.starBuffer) {
      this.gl.useProgram(this.starProgram);
      const vpLocation = this.gl.getUniformLocation(this.starProgram, 'u_viewProjection');
      if (vpLocation) {
        this.gl.uniformMatrix4fv(vpLocation, false, viewProjection);
      }
      const positionLocation = this.gl.getAttribLocation(this.starProgram, 'a_position');
      this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.starBuffer);
      this.gl.enableVertexAttribArray(positionLocation);
      this.gl.vertexAttribPointer(positionLocation, 3, this.gl.FLOAT, false, 0, 0);
      this.gl.drawArrays(this.gl.POINTS, 0, this.starCount);
    }

    // Planets
    for (const planet of this.planets) {
      renderPlanetInstance({
        gl: this.gl,
        program: this.planetProgram,
        geometry: planet.geometry,
        modelMatrix: planet.modelMatrix,
        viewMatrix: viewMatrixFlipped,
        projectionMatrix,
        colorVariation: planet.colorVariation
      });
    }

    // Rocket
    const rocketModel = rocketModelMatrix(this.rocketState, 0.9);
    const rocketModelView = multiply4x4(viewMatrixFlipped, rocketModel);
    const rocketMVP = multiply4x4(projectionMatrix, rocketModelView);
    const rocketNormalMatrix = [
      rocketModelView[0] ?? 0, rocketModelView[1] ?? 0, rocketModelView[2] ?? 0,
      rocketModelView[4] ?? 0, rocketModelView[5] ?? 0, rocketModelView[6] ?? 0,
      rocketModelView[8] ?? 0, rocketModelView[9] ?? 0, rocketModelView[10] ?? 0
    ];

    this.gl.useProgram(this.rocketProgram);
    const posLoc = this.gl.getAttribLocation(this.rocketProgram, 'a_position');
    const normLoc = this.gl.getAttribLocation(this.rocketProgram, 'a_normal');
    if (posLoc !== -1) {
      this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.rocketGeometry.positions);
      this.gl.enableVertexAttribArray(posLoc);
      this.gl.vertexAttribPointer(posLoc, 3, this.gl.FLOAT, false, 0, 0);
    }
    if (normLoc !== -1) {
      this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.rocketGeometry.normals);
      this.gl.enableVertexAttribArray(normLoc);
      this.gl.vertexAttribPointer(normLoc, 3, this.gl.FLOAT, false, 0, 0);
    }
    this.gl.bindBuffer(this.gl.ELEMENT_ARRAY_BUFFER, this.rocketGeometry.indices);

    const mvpLoc = this.gl.getUniformLocation(this.rocketProgram, 'u_modelViewProjection');
    if (mvpLoc) this.gl.uniformMatrix4fv(mvpLoc, false, rocketMVP);
    const mvLoc = this.gl.getUniformLocation(this.rocketProgram, 'u_modelView');
    if (mvLoc) this.gl.uniformMatrix4fv(mvLoc, false, rocketModelView);
    const normalLoc = this.gl.getUniformLocation(this.rocketProgram, 'u_normalMatrix');
    if (normalLoc) this.gl.uniformMatrix3fv(normalLoc, false, rocketNormalMatrix);
    const colorLoc = this.gl.getUniformLocation(this.rocketProgram, 'u_color');
    if (colorLoc) this.gl.uniform3f(colorLoc, 0.9, 0.9, 0.95);
    const lightLoc = this.gl.getUniformLocation(this.rocketProgram, 'u_lightDirection');
    if (lightLoc) this.gl.uniform3f(lightLoc, 0.5, 0.8, 0.3);

    this.gl.drawElements(this.gl.TRIANGLES, this.rocketGeometry.indexCount, this.gl.UNSIGNED_SHORT, 0);

    // Proximity detection
    let focus: ScenePlanet | null = null;
    let focusScreen: ScreenPosition | null = null;
    let closest = Number.MAX_VALUE;

    for (const planet of this.planets) {
      const d = distance(this.rocketState.position, planet.position) - planet.size * 0.5;
      if (d < PROXIMITY_DISTANCE && d < closest) {
        closest = d;
        const projected = projectToScreen(planet.position, viewProjection, viewportWidth, viewportHeight);
        focus = planet;
        // Convert from device pixels (WebGL viewport) to CSS pixels for UI overlay positioning
        focusScreen = {
          ...projected,
          x: projected.x / dpr,
          y: projected.y / dpr
        };
      }
    }

    if (this.onFocusChange) {
      this.onFocusChange(focus, focusScreen);
    }

    requestAnimationFrame((t) => this.render(t));
  }
}
