# Sphere Geometry Generation Algorithms

This document explains different algorithms for generating 3D sphere geometry in computer graphics, particularly for WebGL rendering.

## Overview

WebGL can only render triangles, so any curved surface like a sphere must be approximated using many small triangular faces. Different algorithms provide different trade-offs between complexity, visual quality, and use case optimization.

---

## 1. UV Sphere (Latitude/Longitude)

The UV sphere is the most common and simplest approach, generating a sphere similar to how we map Earth with latitude and longitude lines.

### Algorithm

```
North Pole
    *
   /|\
  / | \
 *--*--*  ← Latitude ring
/|\/|\/|\
*--*--*--* ← Equator (widest ring)
\|/\|/\|/
 *--*--*
  \ | /
   \|/
    *
South Pole
```

**Step 1: Generate vertices**

For each latitude angle θ (from 0 to π) and longitude angle φ (from 0 to 2π):

```
x = cos(φ) × sin(θ)
y = cos(θ)
z = sin(φ) × sin(θ)
```

This is the **spherical to Cartesian coordinate conversion** formula.

**Step 2: Connect vertices into triangles**

Each "quad" between latitude/longitude lines is split into two triangles:

```
A --- B
|  \  |    → Triangle 1: A,C,B
|   \ |      Triangle 2: C,D,B
C --- D
```

### Pros
- Simple to implement
- Easy UV texture mapping (latitude/longitude maps directly to texture coordinates)
- Intuitive to understand

### Cons
- **Pole pinching**: All triangles converge at the poles, creating degenerate (very thin) triangles
- **Uneven distribution**: Triangles near equator are much larger than near poles
- **Texture stretching**: Textures get stretched at the poles

### Best For
- Quick prototypes
- Planets with polar texture maps
- Cases where poles won't be visible

---

## 2. Icosphere (Subdivided Icosahedron)

An icosphere starts with a regular icosahedron (20-sided polyhedron) and recursively subdivides each triangular face.

### Algorithm

**Step 1: Create initial icosahedron**

An icosahedron has 12 vertices positioned using the golden ratio τ = (1 + √5) / 2 ≈ 1.618:

```
12 vertices at positions:
(±1, ±τ, 0)
(0, ±1, ±τ)
(±τ, 0, ±1)

These form 20 equilateral triangular faces
```

**Step 2: Normalize to sphere**

Project all vertices to the surface of a unit sphere by normalizing them:

```
vertex_normalized = vertex / |vertex|
```

**Step 3: Subdivide recursively**

For each subdivision level, split every triangle into 4 smaller triangles:

```
      A                    A
     / \        →         /\
    /   \               ab--ac
   B-----C             / \/ \
                      B--bc--C

Where ab, bc, ac are midpoints projected to sphere
```

### Subdivision Levels

| Level | Faces | Vertices | Use Case |
|-------|-------|----------|----------|
| 0 | 20 | 12 | Testing only |
| 1 | 80 | 42 | Low poly |
| 2 | 320 | 162 | Medium detail |
| 3 | 1,280 | 642 | **Recommended default** |
| 4 | 5,120 | 2,562 | High detail |
| 5 | 20,480 | 10,242 | Very high detail |

### Pros
- **Uniform triangle distribution**: All triangles are roughly the same size
- **No singularities**: No poles or special points
- **Better for procedural generation**: Noise and displacement work uniformly
- **Industry standard**: Used in games like No Man's Sky, Astroneer

### Cons
- More complex to implement
- UV mapping is less intuitive (requires special algorithms)
- Slight increase in vertex count vs UV sphere for same visual quality

### Best For
- Procedural planets
- Deformable spheres
- Physics simulations
- Any case requiring uniform vertex distribution

---

## 3. Cube Sphere (Normalized Cube)

A cube sphere creates a cube, subdivides each face into a grid, then normalizes all vertices to the sphere surface.

### Algorithm

**Step 1: Create 6 cube faces**

```
   +-----+
  /     /|
 +-----+ |
 |     | +
 |     |/
 +-----+
```

**Step 2: Subdivide each face into grid**

For each of the 6 faces, create an NxN grid of vertices.

**Step 3: Project to sphere**

Normalize each vertex:

```
sphere_vertex = normalize(cube_vertex)
```

### Visual Result

```
      *---*---*
     /|  /|  /|
    * * * * * *    Each face becomes a
   /|/|/|/|/|/|    curved patch on the
  *-*-*-*-*-*-*    sphere surface
  | | | | | | |
  *-*-*-*-*-*-*
```

### Pros
- **Easy UV mapping**: Each face is a perfect square grid
- **No singularities**: No poles
- **Good for texturing**: Planet faces can use separate texture atlases
- **Efficient LOD**: Can use different subdivision levels per face

### Cons
- Visible "seams" at cube edges if not handled carefully
- Slightly uneven triangle distribution (corners vs edges vs centers)
- 6 distinct regions might be visible

### Best For
- Planets with texture atlases
- Level-of-detail (LOD) systems
- Skyboxes and environment maps

---

## 4. Fibonacci Sphere (Golden Spiral)

Uses the Fibonacci sequence and golden angle to distribute points evenly across the sphere surface.

### Algorithm

```
phi = π × (3 - √5)  // Golden angle ≈ 137.5°

for i in 0 to N:
    y = 1 - (i / (N-1)) × 2     // y from 1 to -1
    radius = sqrt(1 - y²)
    theta = phi × i

    x = cos(theta) × radius
    z = sin(theta) × radius
```

Creates a spiral pattern:

```
    *
   * *
  *   *
 *  *  *    Points distributed
*   *   *   in a spiral pattern
 *  *  *    using golden ratio
  *   *
   * *
    *
```

### Pros
- **Most uniform point distribution** of any algorithm
- **No visible patterns** or grid artifacts
- Beautiful mathematical properties

### Cons
- Produces points only (not triangles)
- Requires Delaunay triangulation to create mesh (complex)
- Triangulation can produce irregular topology

### Best For
- Point cloud rendering
- Particle systems
- Scientific visualizations
- Cases where you only need sample points, not meshes

---

## Comparison Table

| Algorithm | Uniformity | Complexity | UV Mapping | Best Use Case |
|-----------|------------|------------|------------|---------------|
| **UV Sphere** | Poor (poles) | Simple | Easy | Quick prototypes, textured globes |
| **Icosphere** | Excellent | Medium | Complex | Procedural planets, deformation |
| **Cube Sphere** | Good | Medium | Easy | Texture atlases, LOD systems |
| **Fibonacci** | Best | Complex | N/A | Point clouds, samples only |

---

## Recommendations

### For Procedural Planets → **Icosphere**
- Uniform geometry works best with noise-based terrain
- No artifacts from pole pinching
- Industry-proven approach

### For Textured Earth-like Planets → **UV Sphere** or **Cube Sphere**
- UV sphere if using equirectangular texture map
- Cube sphere if using cube map texture

### For Visual Effects → **Icosphere**
- Deformations, explosions, and dynamic geometry need uniform triangles

### For Point-based Rendering → **Fibonacci Sphere**
- Particle systems, atmospheric scattering, etc.

---

## Implementation Notes

All algorithms should:
1. Generate positions (x, y, z vertices)
2. Generate normals (for lighting calculations)
3. Generate indices (which vertices form triangles)
4. Optionally generate UVs (texture coordinates)

For a unit sphere (radius = 1), the normal at each vertex equals the normalized position vector.

---

## References

- [Geodesic Polyhedron](https://en.wikipedia.org/wiki/Geodesic_polyhedron)
- [Icosahedron](https://en.wikipedia.org/wiki/Regular_icosahedron)
- [Golden Ratio in Nature](https://en.wikipedia.org/wiki/Golden_ratio)
- [UV Mapping](https://en.wikipedia.org/wiki/UV_mapping)
