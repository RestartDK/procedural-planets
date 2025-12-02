// WebGL Planet Generator

let gl;
let program;
let planetGeometry = null;
let camera = {
    rotationX: 0,
    rotationY: 0,
    distance: 3.0,
    targetRotationX: 0,
    targetRotationY: 0,
    targetDistance: 3.0
};

let isDragging = false;
let lastMouseX = 0;
let lastMouseY = 0;

// Simple noise function (simplified Perlin noise)
function noise(x, y, z) {
    // Simple hash-based noise
    const n = Math.sin(x * 12.9898 + y * 78.233 + z * 37.719) * 43758.5453;
    return n - Math.floor(n);
}

function smoothNoise(x, y, z) {
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

function fbm(x, y, z, octaves, frequency, amplitude) {
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
function initWebGL(canvas) {
    gl = canvas.getContext('webgl');
    
    if (!gl) {
        document.getElementById('webgl-error').style.display = 'block';
        return false;
    }
    
    // Set canvas size
    const resizeCanvas = () => {
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
function createShader(type, source) {
    const shader = gl.createShader(type);
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
function createProgram(vertexSource, fragmentSource) {
    const vertexShader = createShader(gl.VERTEX_SHADER, vertexSource);
    const fragmentShader = createShader(gl.FRAGMENT_SHADER, fragmentSource);
    
    if (!vertexShader || !fragmentShader) {
        return null;
    }
    
    const program = gl.createProgram();
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
 * Generate sphere geometry
 */
function generateSphereGeometry(segments = 32) {
    const vertices = [];
    const indices = [];
    const normals = [];
    const uvs = [];
    
    for (let lat = 0; lat <= segments; lat++) {
        const theta = lat * Math.PI / segments;
        const sinTheta = Math.sin(theta);
        const cosTheta = Math.cos(theta);
        
        for (let lon = 0; lon <= segments; lon++) {
            const phi = lon * 2 * Math.PI / segments;
            const sinPhi = Math.sin(phi);
            const cosPhi = Math.cos(phi);
            
            const x = cosPhi * sinTheta;
            const y = cosTheta;
            const z = sinPhi * sinTheta;
            
            vertices.push(x, y, z);
            normals.push(x, y, z);
            uvs.push(lon / segments, lat / segments);
        }
    }
    
    for (let lat = 0; lat < segments; lat++) {
        for (let lon = 0; lon < segments; lon++) {
            const first = lat * (segments + 1) + lon;
            const second = first + segments + 1;
            
            indices.push(first, second, first + 1);
            indices.push(second, second + 1, first + 1);
        }
    }
    
    return { vertices, indices, normals, uvs };
}

/**
 * Apply noise to vertices for terrain
 */
function applyNoise(vertices, terrainComplexity, size) {
    const noisyVertices = [];
    const noiseScale = 0.5 + terrainComplexity * 1.5;
    const noiseStrength = 0.1 + terrainComplexity * 0.2;
    
    for (let i = 0; i < vertices.length; i += 3) {
        const x = vertices[i];
        const y = vertices[i + 1];
        const z = vertices[i + 2];
        
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
function initializePlanet(terrainComplexity, colorVariation, size) {
    const baseGeometry = generateSphereGeometry(32);
    const noisyVertices = applyNoise(baseGeometry.vertices, terrainComplexity, size);
    
    // Create buffers
    const positionBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(noisyVertices), gl.STATIC_DRAW);
    
    const normalBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, normalBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(baseGeometry.normals), gl.STATIC_DRAW);
    
    const indexBuffer = gl.createBuffer();
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
function setupCameraControls(canvas) {
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
        if (e.touches.length === 1) {
            isDragging = true;
            lastMouseX = e.touches[0].clientX;
            lastMouseY = e.touches[0].clientY;
        } else if (e.touches.length === 2) {
            const dx = e.touches[0].clientX - e.touches[1].clientX;
            const dy = e.touches[0].clientY - e.touches[1].clientY;
            lastTouchDistance = Math.sqrt(dx * dx + dy * dy);
        }
    });
    
    canvas.addEventListener('touchmove', (e) => {
        e.preventDefault();
        if (e.touches.length === 1 && isDragging) {
            const deltaX = e.touches[0].clientX - lastMouseX;
            const deltaY = e.touches[0].clientY - lastMouseY;
            
            camera.targetRotationY += deltaX * 0.01;
            camera.targetRotationX += deltaY * 0.01;
            camera.targetRotationX = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, camera.targetRotationX));
            
            lastMouseX = e.touches[0].clientX;
            lastMouseY = e.touches[0].clientY;
        } else if (e.touches.length === 2) {
            const dx = e.touches[0].clientX - e.touches[1].clientX;
            const dy = e.touches[0].clientY - e.touches[1].clientY;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            if (lastTouchDistance > 0) {
                const scale = distance / lastTouchDistance;
                camera.targetDistance *= scale;
                camera.targetDistance = Math.max(1.5, Math.min(5.0, camera.targetDistance));
            }
            lastTouchDistance = distance;
        }
    });
    
    canvas.addEventListener('touchend', () => {
        isDragging = false;
        lastTouchDistance = 0;
    });
    
    // Zoom with mouse wheel
    canvas.addEventListener('wheel', (e) => {
        e.preventDefault();
        const delta = e.deltaY * 0.001;
        camera.targetDistance += delta;
        camera.targetDistance = Math.max(1.5, Math.min(5.0, camera.targetDistance));
    });
}

/**
 * Get model-view-projection matrix
 */
function getMVP() {
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
    function multiply4x4(a, b) {
        const result = new Array(16);
        for (let i = 0; i < 4; i++) {
            for (let j = 0; j < 4; j++) {
                result[i * 4 + j] = 0;
                for (let k = 0; k < 4; k++) {
                    result[i * 4 + j] += a[i * 4 + k] * b[k * 4 + j];
                }
            }
        }
        return result;
    }
    
    const modelView = multiply4x4(view, model);
    const mvp = multiply4x4(projection, modelView);
    
    // Normal matrix (3x3)
    const normalMatrix = [
        modelView[0], modelView[1], modelView[2],
        modelView[4], modelView[5], modelView[6],
        modelView[8], modelView[9], modelView[10]
    ];
    
    return { mvp, modelView, normalMatrix };
}

/**
 * Render the planet
 */
function renderPlanet(params) {
    if (!gl || !program || !planetGeometry) {
        return;
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
    gl.uniformMatrix4fv(mvpLocation, false, mvp);
    
    const modelViewLocation = gl.getUniformLocation(program, 'u_modelView');
    gl.uniformMatrix4fv(modelViewLocation, false, modelView);
    
    const normalMatrixLocation = gl.getUniformLocation(program, 'u_normalMatrix');
    gl.uniformMatrix3fv(normalMatrixLocation, false, normalMatrix);
    
    const colorVariationLocation = gl.getUniformLocation(program, 'u_colorVariation');
    gl.uniform1f(colorVariationLocation, effectiveParams.colorVariation || planetGeometry.colorVariation || 0.5);
    
    const lightDirection = [0.5, 0.8, 0.3];
    const lightDirLength = Math.sqrt(lightDirection[0] ** 2 + lightDirection[1] ** 2 + lightDirection[2] ** 2);
    const lightDirNormalized = [
        lightDirection[0] / lightDirLength,
        lightDirection[1] / lightDirLength,
        lightDirection[2] / lightDirLength
    ];
    const lightLocation = gl.getUniformLocation(program, 'u_lightDirection');
    gl.uniform3fv(lightLocation, lightDirNormalized);
    
    // Draw
    gl.drawElements(gl.TRIANGLES, planetGeometry.indexCount, gl.UNSIGNED_SHORT, 0);
}

/**
 * Initialize planet generator
 */
function initPlanetGenerator(canvas) {
    if (!initWebGL(canvas)) {
        return false;
    }
    
    program = createProgram(vertexShaderSource, fragmentShaderSource);
    if (!program) {
        return false;
    }
    
    setupCameraControls(canvas);
    
    // Auto-rotate when not dragging (handled in render loop)
    
    return true;
}

/**
 * Update planet with new parameters
 */
function updatePlanet(terrainComplexity, colorVariation, size) {
    if (!gl || !program) {
        return;
    }
    
    initializePlanet(terrainComplexity, colorVariation, size);
}

// Global render loop state
let renderLoopRunning = false;
let currentRenderParams = null;

/**
 * Start rendering loop
 */
function startRenderLoop(params) {
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
function stopRenderLoop() {
    renderLoopRunning = false;
}

/**
 * Update render parameters
 */
function updateRenderParams(params) {
    currentRenderParams = params;
}

