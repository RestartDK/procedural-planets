import type { Camera, PlanetGeometry, SphereGeometry, MVP, RenderParams } from "./types";

let gl: WebGLRenderingContext | null = null;
let program: WebGLProgram | null = null;
let planetGeometry: PlanetGeometry | null = null;
let camera: Camera = {
  rotationX: 0,
  rotationY: 0,
  distance: 20.0,
  targetRotationX: 0,
  targetRotationY: 0,
  targetDistance: 20.0
};

let isDragging = false;
let lastMouseX = 0;
let lastMouseY = 0;

// Simple noise function (simplified Perlin noise)
function noise(x: number, y: number, z: number): number {
  // Simple hash-based noise
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
 * Initialize WebGL context
 */
function initWebGL(canvas: HTMLCanvasElement): boolean {
  const context = canvas.getContext('webgl');
  
  if (!context) {
    const errorEl = document.getElementById('webgl-error');
    if (errorEl) {
      errorEl.style.display = 'block';
    }
    return false;
  }
  
  gl = context;
  
  // Set canvas size
  const resizeCanvas = () => {
    if (!gl) return;
    const rect = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    canvas.style.width = rect.width + 'px';
    canvas.style.height = rect.height + 'px';
    gl.viewport(0, 0, canvas.width, canvas.height);
  };
  
  resizeCanvas();
  window.addEventListener('resize', resizeCanvas);
  
  return true;
}

/**
 * Create and compile shader
 */
function createShader(type: number, source: string): WebGLShader | null {
  if (!gl) return null;
  
  const shader = gl.createShader(type);
  if (!shader) return null;
  
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    console.error('Shader compilation error:', gl.getShaderInfoLog(shader));
    gl.deleteShader(shader);
    return null;
  }
  
  return shader;
}

/**
 * Create shader program
 */
function createProgram(vertexSource: string, fragmentSource: string): WebGLProgram | null {
  if (!gl) return null;
  
  const vertexShader = createShader(gl.VERTEX_SHADER, vertexSource);
  const fragmentShader = createShader(gl.FRAGMENT_SHADER, fragmentSource);
  
  if (!vertexShader || !fragmentShader) {
    return null;
  }
  
  const program = gl.createProgram();
  if (!program) return null;
  
  gl.attachShader(program, vertexShader);
  gl.attachShader(program, fragmentShader);
  gl.linkProgram(program);
  
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    console.error('Program linking error:', gl.getProgramInfoLog(program));
    gl.deleteProgram(program);
    return null;
  }
  
  return program;
}

/**
 * Generate icosphere geometry (subdivided icosahedron)
 */
function generateIcosphere(subdivisions: number): SphereGeometry {
  const t = (1 + Math.sqrt(5)) / 2; // Golden ratio

  // Step 1: Create initial icosahedron vertices
  let vertices: number[] = [
    -1,  t,  0,   1,  t,  0,  -1, -t,  0,   1, -t,  0,
     0, -1,  t,   0,  1,  t,   0, -1, -t,   0,  1, -t,
     t,  0, -1,   t,  0,  1,  -t,  0, -1,  -t,  0,  1
  ];

  // Normalize initial vertices to unit sphere
  for (let i = 0; i < vertices.length; i += 3) {
    const x = vertices[i]!;
    const y = vertices[i + 1]!;
    const z = vertices[i + 2]!;
    const length = Math.sqrt(x * x + y * y + z * z);
    vertices[i] = x / length;
    vertices[i + 1] = y / length;
    vertices[i + 2] = z / length;
  }

  // Step 2: Create initial 20 faces
  let indices: number[] = [
    0, 11, 5,   0, 5, 1,   0, 1, 7,   0, 7, 10,   0, 10, 11,
    1, 5, 9,    5, 11, 4,  11, 10, 2,  10, 7, 6,   7, 1, 8,
    3, 9, 4,    3, 4, 2,   3, 2, 6,    3, 6, 8,    3, 8, 9,
    4, 9, 5,    2, 4, 11,  6, 2, 10,   8, 6, 7,    9, 8, 1
  ];

  // Step 3: Subdivide triangles
  const midpointCache = new Map<string, number>();

  const getMidpoint = (v1: number, v2: number): number => {
    const key = v1 < v2 ? `${v1},${v2}` : `${v2},${v1}`;

    if (midpointCache.has(key)) {
      return midpointCache.get(key)!;
    }

    const x = (vertices[v1 * 3]! + vertices[v2 * 3]!) / 2;
    const y = (vertices[v1 * 3 + 1]! + vertices[v2 * 3 + 1]!) / 2;
    const z = (vertices[v1 * 3 + 2]! + vertices[v2 * 3 + 2]!) / 2;

    // Project to sphere
    const length = Math.sqrt(x * x + y * y + z * z);
    vertices.push(x / length, y / length, z / length);

    const index = vertices.length / 3 - 1;
    midpointCache.set(key, index);
    return index;
  };

  // Subdivide each triangle
  for (let i = 0; i < subdivisions; i++) {
    const newIndices: number[] = [];

    for (let j = 0; j < indices.length; j += 3) {
      const v1 = indices[j]!;
      const v2 = indices[j + 1]!;
      const v3 = indices[j + 2]!;

      const a = getMidpoint(v1, v2);
      const b = getMidpoint(v2, v3);
      const c = getMidpoint(v3, v1);

      newIndices.push(v1, a, c);
      newIndices.push(v2, b, a);
      newIndices.push(v3, c, b);
      newIndices.push(a, b, c);
    }

    indices = newIndices;
    midpointCache.clear();
  }

  // Step 4: Generate normals (for unit sphere, normal = position)
  const normals: number[] = [...vertices];

  // Step 5: Generate simple UVs (spherical mapping)
  const uvs: number[] = [];
  for (let i = 0; i < vertices.length; i += 3) {
    const x = vertices[i]!;
    const y = vertices[i + 1]!;
    const z = vertices[i + 2]!;

    const u = 0.5 + Math.atan2(z, x) / (2 * Math.PI);
    const v = 0.5 - Math.asin(y) / Math.PI;

    uvs.push(u, v);
  }

  return { vertices, indices, normals, uvs };
}

/**
 * Recalculate normals after terrain displacement
 */
function recalculateNormals(vertices: number[], indices: number[]): number[] {
  // Initialize normals array with zeros
  const normals = new Array(vertices.length).fill(0);

  // Calculate face normals and accumulate to vertex normals
  for (let i = 0; i < indices.length; i += 3) {
    const i0 = indices[i]! * 3;
    const i1 = indices[i + 1]! * 3;
    const i2 = indices[i + 2]! * 3;

    // Get triangle vertices
    const v0x = vertices[i0]!;
    const v0y = vertices[i0 + 1]!;
    const v0z = vertices[i0 + 2]!;

    const v1x = vertices[i1]!;
    const v1y = vertices[i1 + 1]!;
    const v1z = vertices[i1 + 2]!;

    const v2x = vertices[i2]!;
    const v2y = vertices[i2 + 1]!;
    const v2z = vertices[i2 + 2]!;

    // Calculate edges
    const edge1x = v1x - v0x;
    const edge1y = v1y - v0y;
    const edge1z = v1z - v0z;

    const edge2x = v2x - v0x;
    const edge2y = v2y - v0y;
    const edge2z = v2z - v0z;

    // Calculate face normal via cross product
    const nx = edge1y * edge2z - edge1z * edge2y;
    const ny = edge1z * edge2x - edge1x * edge2z;
    const nz = edge1x * edge2y - edge1y * edge2x;

    // Accumulate to vertex normals
    normals[i0] = (normals[i0] || 0) + nx;
    normals[i0 + 1] = (normals[i0 + 1] || 0) + ny;
    normals[i0 + 2] = (normals[i0 + 2] || 0) + nz;

    normals[i1] = (normals[i1] || 0) + nx;
    normals[i1 + 1] = (normals[i1 + 1] || 0) + ny;
    normals[i1 + 2] = (normals[i1 + 2] || 0) + nz;

    normals[i2] = (normals[i2] || 0) + nx;
    normals[i2 + 1] = (normals[i2 + 1] || 0) + ny;
    normals[i2 + 2] = (normals[i2 + 2] || 0) + nz;
  }

  // Normalize all vertex normals
  for (let i = 0; i < normals.length; i += 3) {
    const nx = normals[i]!;
    const ny = normals[i + 1]!;
    const nz = normals[i + 2]!;
    const length = Math.sqrt(nx * nx + ny * ny + nz * nz);

    if (length > 0) {
      normals[i] = nx / length;
      normals[i + 1] = ny / length;
      normals[i + 2] = nz / length;
    }
  }

  return normals;
}

/**
 * Apply noise to vertices for terrain
 */
function applyNoise(vertices: number[], terrainComplexity: number, size: number): number[] {
  const noisyVertices: number[] = [];
  const noiseScale = 0.5 + terrainComplexity * 1.5;
  const noiseStrength = 0.1 + terrainComplexity * 0.2;
  
  for (let i = 0; i < vertices.length; i += 3) {
    const x = vertices[i];
    const y = vertices[i + 1];
    const z = vertices[i + 2];
    
    // Skip if any coordinate is undefined
    if (x === undefined || y === undefined || z === undefined) {
      continue;
    }
    
    // Calculate noise value
    const noiseValue = fbm(x, y, z, 4, noiseScale, 1.0);
    const displacement = (noiseValue - 0.5) * noiseStrength;
    
    // Apply displacement along normal
    const length = Math.sqrt(x * x + y * y + z * z);
    const nx = x / length;
    const ny = y / length;
    const nz = z / length;
    
    const newLength = (1.0 + displacement) * size;
    noisyVertices.push(nx * newLength, ny * newLength, nz * newLength);
  }
  
  return noisyVertices;
}

/**
 * Initialize planet geometry with parameters
 */
function initializePlanet(terrainComplexity: number, colorVariation: number, size: number): void {
  if (!gl) return;

  const baseGeometry = generateIcosphere(3);
  const noisyVertices = applyNoise(baseGeometry.vertices, terrainComplexity, size);

  // Recalculate normals after terrain displacement
  const recalculatedNormals = recalculateNormals(noisyVertices, baseGeometry.indices);

  // Adjust camera distance based on planet size
  camera.distance = size * 5.0;
  camera.targetDistance = size * 5.0;

  console.log('Icosphere generated:', {
    vertices: noisyVertices.length / 3,
    triangles: baseGeometry.indices.length / 3,
    size: size,
    cameraDistance: camera.distance
  });

  // Create buffers
  const positionBuffer = gl.createBuffer();
  if (!positionBuffer) return;

  gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(noisyVertices), gl.STATIC_DRAW);

  const normalBuffer = gl.createBuffer();
  if (!normalBuffer) return;

  gl.bindBuffer(gl.ARRAY_BUFFER, normalBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(recalculatedNormals), gl.STATIC_DRAW);
  
  const indexBuffer = gl.createBuffer();
  if (!indexBuffer) return;
  
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);
  gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(baseGeometry.indices), gl.STATIC_DRAW);
  
  planetGeometry = {
    positions: positionBuffer,
    normals: normalBuffer,
    indices: indexBuffer,
    indexCount: baseGeometry.indices.length,
    colorVariation: colorVariation
  };
}

/**
 * Vertex shader source
 */
const vertexShaderSource = `
attribute vec3 a_position;
attribute vec3 a_normal;

uniform mat4 u_modelViewProjection;
uniform mat4 u_modelView;
uniform mat3 u_normalMatrix;

varying vec3 v_normal;
varying vec3 v_position;

void main() {
    v_normal = normalize(u_normalMatrix * a_normal);
    v_position = (u_modelView * vec4(a_position, 1.0)).xyz;
    gl_Position = u_modelViewProjection * vec4(a_position, 1.0);
}
`;

/**
 * Fragment shader source
 */
const fragmentShaderSource = `
precision mediump float;

uniform float u_colorVariation;
uniform vec3 u_lightDirection;

varying vec3 v_normal;
varying vec3 v_position;

void main() {
    // Calculate lighting
    vec3 normal = normalize(v_normal);
    float light = max(dot(normal, u_lightDirection), 0.3);
    
    // Base color based on position (for variation)
    vec3 baseColor = vec3(0.2, 0.4, 0.8);
    
    // Add color variation based on height/position
    float height = v_position.y;
    vec3 color1 = vec3(0.1, 0.3, 0.6);
    vec3 color2 = vec3(0.3, 0.6, 0.2);
    vec3 color3 = vec3(0.8, 0.7, 0.4);
    
    vec3 finalColor = mix(color1, color2, smoothstep(-0.5, 0.5, height));
    finalColor = mix(finalColor, color3, u_colorVariation * smoothstep(0.0, 1.0, height));
    
    // Apply lighting
    finalColor *= light;
    
    gl_FragColor = vec4(finalColor, 1.0);
}
`;

/**
 * Setup camera controls
 */
function setupCameraControls(canvas: HTMLCanvasElement): void {
  // Mouse controls
  canvas.addEventListener('mousedown', (e) => {
    isDragging = true;
    lastMouseX = e.clientX;
    lastMouseY = e.clientY;
  });
  
  canvas.addEventListener('mousemove', (e) => {
    if (isDragging) {
      const deltaX = e.clientX - lastMouseX;
      const deltaY = e.clientY - lastMouseY;
      
      camera.targetRotationY += deltaX * 0.01;
      camera.targetRotationX += deltaY * 0.01;
      
      // Clamp vertical rotation
      camera.targetRotationX = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, camera.targetRotationX));
      
      lastMouseX = e.clientX;
      lastMouseY = e.clientY;
    }
  });
  
  canvas.addEventListener('mouseup', () => {
    isDragging = false;
  });
  
  canvas.addEventListener('mouseleave', () => {
    isDragging = false;
  });
  
  // Touch controls
  let lastTouchDistance = 0;
  
  canvas.addEventListener('touchstart', (e) => {
    e.preventDefault();
    if (e.touches.length === 1 && e.touches[0]) {
      isDragging = true;
      lastMouseX = e.touches[0].clientX;
      lastMouseY = e.touches[0].clientY;
    } else if (e.touches.length === 2 && e.touches[0] && e.touches[1]) {
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      lastTouchDistance = Math.sqrt(dx * dx + dy * dy);
    }
  });
  
  canvas.addEventListener('touchmove', (e) => {
    e.preventDefault();
    if (e.touches.length === 1 && isDragging && e.touches[0]) {
      const deltaX = e.touches[0].clientX - lastMouseX;
      const deltaY = e.touches[0].clientY - lastMouseY;
      
      camera.targetRotationY += deltaX * 0.01;
      camera.targetRotationX += deltaY * 0.01;
      camera.targetRotationX = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, camera.targetRotationX));
      
      lastMouseX = e.touches[0].clientX;
      lastMouseY = e.touches[0].clientY;
    } else if (e.touches.length === 2 && e.touches[0] && e.touches[1]) {
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      const distance = Math.sqrt(dx * dx + dy * dy);
      
      if (lastTouchDistance > 0) {
        const scale = distance / lastTouchDistance;
        camera.targetDistance *= scale;
        camera.targetDistance = Math.max(3.0, Math.min(100.0, camera.targetDistance));
      }
      lastTouchDistance = distance;
    }
  });
  
  canvas.addEventListener('touchend', () => {
    isDragging = false;
    lastTouchDistance = 0;
  });
  
  // Zoom with mouse wheel and trackpad
  canvas.addEventListener('wheel', (e) => {
    e.preventDefault();
    
    // Handle different delta modes (pixel, line, page)
    // Trackpads often use pixel mode with smaller values
    // Note: deltaY is positive when scrolling down (zoom out), negative when scrolling up (zoom in)
    let delta: number;
    if (e.deltaMode === WheelEvent.DOM_DELTA_PIXEL) {
      // Pixel mode (trackpads) - more sensitive for smooth zooming
      delta = e.deltaY * 0.2;
    } else if (e.deltaMode === WheelEvent.DOM_DELTA_LINE) {
      // Line mode (mouse wheel) - standard sensitivity
      delta = e.deltaY * 1.0;
    } else {
      // Page mode or unknown - use pixel-based calculation
      delta = e.deltaY * 0.2;
    }
    
    // Note: positive deltaY = scroll down = zoom out (increase distance)
    //       negative deltaY = scroll up = zoom in (decrease distance)
    camera.targetDistance += delta;
    camera.targetDistance = Math.max(3.0, Math.min(100.0, camera.targetDistance));
  }, { passive: false });
}

/**
 * Get model-view-projection matrix
 */
let frameCount = 0;
function getMVP(): MVP {
  if (!gl) {
    throw new Error('WebGL context not initialized');
  }
  
  // Smooth camera interpolation
  camera.rotationX += (camera.targetRotationX - camera.rotationX) * 0.1;
  camera.rotationY += (camera.targetRotationY - camera.rotationY) * 0.1;
  camera.distance += (camera.targetDistance - camera.distance) * 0.1;
  
  const width = gl.canvas.width;
  const height = gl.canvas.height;
  const aspect = width / height;
  
  // Projection matrix
  const fov = Math.PI / 4;
  const near = 0.1;
  const far = 100.0;
  const f = 1.0 / Math.tan(fov / 2);
  
  const projection = [
    f / aspect, 0, 0, 0,
    0, f, 0, 0,
    0, 0, (far + near) / (near - far), -1,
    0, 0, (2 * far * near) / (near - far), 0
  ];
  
  // View matrix (camera)
  const eyeX = Math.sin(camera.rotationY) * Math.cos(camera.rotationX) * camera.distance;
  const eyeY = Math.sin(camera.rotationX) * camera.distance;
  const eyeZ = Math.cos(camera.rotationY) * Math.cos(camera.rotationX) * camera.distance;
  
  const centerX = 0, centerY = 0, centerZ = 0;
  const upX = 0, upY = 1, upZ = 0;
  
  const zx = eyeX - centerX;
  const zy = eyeY - centerY;
  const zz = eyeZ - centerZ;
  const zlen = Math.sqrt(zx * zx + zy * zy + zz * zz);
  const zxNorm = zx / zlen;
  const zyNorm = zy / zlen;
  const zzNorm = zz / zlen;
  
  const xx = upY * zzNorm - upZ * zyNorm;
  const xy = upZ * zxNorm - upX * zzNorm;
  const xz = upX * zyNorm - upY * zxNorm;
  const xlen = Math.sqrt(xx * xx + xy * xy + xz * xz);
  const xxNorm = xx / xlen;
  const xyNorm = xy / xlen;
  const xzNorm = xz / xlen;
  
  const yx = zyNorm * xzNorm - zzNorm * xyNorm;
  const yy = zzNorm * xxNorm - zxNorm * xzNorm;
  const yz = zxNorm * xyNorm - zyNorm * xxNorm;
  
  const view = [
    xxNorm, yx, zxNorm, 0,
    xyNorm, yy, zyNorm, 0,
    xzNorm, yz, zzNorm, 0,
    -(xxNorm * eyeX + xyNorm * eyeY + xzNorm * eyeZ),
    -(yx * eyeX + yy * eyeY + yz * eyeZ),
    -(zxNorm * eyeX + zyNorm * eyeY + zzNorm * eyeZ),
    1
  ];
  
  // Model matrix (identity for now)
  const model = [
    1, 0, 0, 0,
    0, 1, 0, 0,
    0, 0, 1, 0,
    0, 0, 0, 1
  ];
  
  // Multiply matrices (simplified)
  function multiply4x4(a: number[], b: number[]): number[] {
    const result: number[] = new Array(16).fill(0);
    for (let i = 0; i < 4; i++) {
      for (let j = 0; j < 4; j++) {
        for (let k = 0; k < 4; k++) {
          const aVal = a[i * 4 + k];
          const bVal = b[k * 4 + j];
          if (aVal !== undefined && bVal !== undefined) {
            result[i * 4 + j] = (result[i * 4 + j] || 0) + aVal * bVal;
          }
        }
      }
    }
    return result;
  }
  
  const modelView = multiply4x4(view, model);
  const mvp = multiply4x4(projection, modelView);
  
  // Normal matrix (3x3)
  const normalMatrix: number[] = [
    modelView[0] ?? 0, modelView[1] ?? 0, modelView[2] ?? 0,
    modelView[4] ?? 0, modelView[5] ?? 0, modelView[6] ?? 0,
    modelView[8] ?? 0, modelView[9] ?? 0, modelView[10] ?? 0
  ];
  
  return { mvp, modelView, normalMatrix };
}

/**
 * Render the planet
 */
function renderPlanet(params?: RenderParams): void {
  if (!gl || !program || !planetGeometry) {
    return;
  }

  // Log first frame render
  if (frameCount === 0) {
    console.log('First render frame started');
  }

  // Auto-rotate when not dragging
  if (!isDragging) {
    camera.targetRotationY += 0.005;
  }
  
  const effectiveParams = params || currentRenderParams || { colorVariation: planetGeometry.colorVariation };
  
  gl.clearColor(0.05, 0.05, 0.1, 1.0);
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
  
  gl.enable(gl.DEPTH_TEST);
  gl.enable(gl.CULL_FACE);
  
  gl.useProgram(program);
  
  // Set up attributes
  const positionLocation = gl.getAttribLocation(program, 'a_position');
  const normalLocation = gl.getAttribLocation(program, 'a_normal');
  
  gl.bindBuffer(gl.ARRAY_BUFFER, planetGeometry.positions);
  gl.enableVertexAttribArray(positionLocation);
  gl.vertexAttribPointer(positionLocation, 3, gl.FLOAT, false, 0, 0);
  
  gl.bindBuffer(gl.ARRAY_BUFFER, planetGeometry.normals);
  gl.enableVertexAttribArray(normalLocation);
  gl.vertexAttribPointer(normalLocation, 3, gl.FLOAT, false, 0, 0);
  
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, planetGeometry.indices);
  
  // Set uniforms
  const { mvp, modelView, normalMatrix } = getMVP();
  
  const mvpLocation = gl.getUniformLocation(program, 'u_modelViewProjection');
  if (mvpLocation) {
    gl.uniformMatrix4fv(mvpLocation, false, mvp);
  }
  
  const modelViewLocation = gl.getUniformLocation(program, 'u_modelView');
  if (modelViewLocation) {
    gl.uniformMatrix4fv(modelViewLocation, false, modelView);
  }
  
  const normalMatrixLocation = gl.getUniformLocation(program, 'u_normalMatrix');
  if (normalMatrixLocation) {
    gl.uniformMatrix3fv(normalMatrixLocation, false, normalMatrix);
  }
  
  const colorVariationLocation = gl.getUniformLocation(program, 'u_colorVariation');
  if (colorVariationLocation) {
    gl.uniform1f(colorVariationLocation, effectiveParams.colorVariation || planetGeometry.colorVariation || 0.5);
  }
  
  const lightDirection: [number, number, number] = [0.5, 0.8, 0.3];
  const lightDirLength = Math.sqrt(lightDirection[0] ** 2 + lightDirection[1] ** 2 + lightDirection[2] ** 2);
  const lightDirNormalized: [number, number, number] = [
    lightDirection[0] / lightDirLength,
    lightDirection[1] / lightDirLength,
    lightDirection[2] / lightDirLength
  ];
  const lightLocation = gl.getUniformLocation(program, 'u_lightDirection');
  if (lightLocation) {
    gl.uniform3fv(lightLocation, lightDirNormalized);
  }
  
  // Draw
  gl.drawElements(gl.TRIANGLES, planetGeometry.indexCount, gl.UNSIGNED_SHORT, 0);
}

/**
 * Initialize planet generator
 */
export function initPlanetGenerator(canvas: HTMLCanvasElement): boolean {
  if (!initWebGL(canvas)) {
    console.error('Failed to initialize WebGL');
    return false;
  }

  if (!gl) {
    console.error('WebGL context is null');
    return false;
  }

  console.log('WebGL initialized successfully');

  program = createProgram(vertexShaderSource, fragmentShaderSource);
  if (!program) {
    console.error('Failed to create shader program');
    return false;
  }

  console.log('Shader program created successfully');

  setupCameraControls(canvas);

  return true;
}

/**
 * Update planet with new parameters
 */
export function updatePlanet(terrainComplexity: number, colorVariation: number, size: number): void {
  if (!gl || !program) {
    return;
  }
  
  initializePlanet(terrainComplexity, colorVariation, size);
}

// Global render loop state
let renderLoopRunning = false;
let currentRenderParams: RenderParams | null = null;

/**
 * Start rendering loop
 */
export function startRenderLoop(params: RenderParams): void {
  currentRenderParams = params;
  
  if (renderLoopRunning) {
    return; // Already running
  }
  
  renderLoopRunning = true;
  
  function render() {
    if (!renderLoopRunning) {
      return;
    }
    renderPlanet(currentRenderParams || params);
    requestAnimationFrame(render);
  }
  render();
}

/**
 * Stop rendering loop
 */
export function stopRenderLoop(): void {
  renderLoopRunning = false;
}

/**
 * Update render parameters
 */
export function updateRenderParams(params: RenderParams): void {
  currentRenderParams = params;
}
