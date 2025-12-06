---
name: Fix WebGL Sphere Bug
overview: Fix matrix math bugs in getMVP() where the view matrix uses incorrect row-major format and the multiply4x4 function uses wrong indexing for WebGL's column-major expectations, plus restore proper lighting in the fragment shader and add a verification harness.
todos:
  - id: fix-view-matrix
    content: Fix view matrix in getMVP() to use column-major format with translation in column 3
    status: pending
  - id: fix-multiply4x4
    content: Fix multiply4x4() function to use column-major indexing for WebGL
    status: pending
  - id: fix-fragment-shader
    content: Replace debug fragment shader with proper diffuse lighting shader
    status: pending
  - id: add-verification
    content: Add verifyRendering() function and export it for testing
    status: pending
  - id: run-tsc
    content: Run bun run tsc to verify no type errors
    status: pending
  - id: manual-test
    content: Test in browser that sphere renders and rotates correctly with mouse/trackpad controls
    status: pending
---

# Fix WebGL Sphere Rendering Bug

## Root Cause Analysis

The sphere fails to render properly due to **matrix format inconsistencies** in `src/planet-generator.ts`. WebGL expects matrices in **column-major** format, but the current implementation mixes row-major and column-major.

### Bug 1: View Matrix Structure (lines 619-627)

The view matrix translation components are in row 3 instead of column 3:

```typescript
// Current (BROKEN) - row-major with translation in row 3
const view = [
  xxNorm, xyNorm, xzNorm, 0,       // row 0
  yx, yy, yz, 0,                    // row 1
  zxNorm, zyNorm, zzNorm, 0,        // row 2
  Tx, Ty, Tz, 1                     // row 3 - WRONG POSITION
];
```

### Bug 2: Matrix Multiplication (lines 638-651)

The `multiply4x4()` function uses row-major indexing `a[i * 4 + k]` but WebGL expects column-major matrices. This produces incorrect MVP matrices.

### Bug 3: Debug Fragment Shader (line 447)

The fragment shader outputs solid blue for debugging instead of proper diffuse lighting:

```glsl
gl_FragColor = vec4(0.3, 0.5, 1.0, 1.0); // Debug only
```

## Fix Strategy

### Step 1: Fix View Matrix (column-major format)

Restructure the view matrix in `getMVP()` at lines 619-627:

```typescript
// Column-major: index = col * 4 + row
const view = [
  xxNorm, yx, zxNorm, 0,            // column 0
  xyNorm, yy, zyNorm, 0,            // column 1
  xzNorm, yz, zzNorm, 0,            // column 2
  -(xxNorm*eyeX + xyNorm*eyeY + xzNorm*eyeZ),
  -(yx*eyeX + yy*eyeY + yz*eyeZ),
  -(zxNorm*eyeX + zyNorm*eyeY + zzNorm*eyeZ),
  1                                  // column 3 (translation)
];
```

### Step 2: Fix multiply4x4 for Column-Major

Replace the indexing at lines 638-651 to use column-major order:

```typescript
function multiply4x4(a: number[], b: number[]): number[] {
  const result: number[] = new Array(16).fill(0);
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
```

### Step 3: Restore Fragment Shader Lighting

Replace debug shader at lines 445-448 with proper diffuse lighting:

```glsl
void main() {
    vec3 normal = normalize(v_normal);
    float diffuse = max(dot(normal, u_lightDirection), 0.0);
    float ambient = 0.2;
    float light = ambient + diffuse * 0.8;
    
    // Base planet color influenced by colorVariation
    vec3 baseColor = vec3(0.2 + u_colorVariation * 0.3, 
                          0.4 + u_colorVariation * 0.2, 
                          0.3 + (1.0 - u_colorVariation) * 0.4);
    
    gl_FragColor = vec4(baseColor * light, 1.0);
}
```

### Step 4: Add Verification Harness

Add a diagnostic function to log WebGL state and matrix values:

```typescript
function verifyRendering(): void {
  if (!gl || !program || !planetGeometry) {
    console.error('Verification failed: missing gl/program/geometry');
    return;
  }
  console.log('=== WebGL Verification ===');
  console.log('Canvas size:', gl.canvas.width, 'x', gl.canvas.height);
  console.log('Index count:', planetGeometry.indexCount);
  console.log('GL error:', gl.getError());
  const { mvp } = getMVP();
  console.log('MVP matrix:', mvp);
  console.log('Contains NaN:', mvp.some(v => isNaN(v)));
}
```

Export this function and call it after initialization.

## Files to Modify

- `src/planet-generator.ts` - All fixes

## Verification Steps

1. Run `bun run tsc` - ensure no type errors
2. Run `bun run dev` and navigate to `/creator`
3. Check browser console for verification output
4. Verify sphere renders as a 3D lit object that rotates
5. Verify mouse drag rotates the view correctly
6. Verify zoom (scroll) works correctly