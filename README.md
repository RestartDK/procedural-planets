# Procedural Planets

<div align="center">
  <img src="docs/Screenshot%202025-12-06%20at%2000.07.58.png" width="45%" />
  <img src="docs/Screenshot%202025-12-06%20at%2000.13.00.png" width="45%" />
</div>

A 3D galaxy explorer where you can create and explore procedurally generated planets.

Why? Well why not.

## Controls

- Move mouse to steer
- Scroll wheel to adjust speed
- Hold Space to thrust
- Fly near planets to interact

## Tech Stack

- **Bun** - JavaScript runtime and package manager
- **TypeScript** - Type-safe JavaScript
- **WebGL** - Low-level 3D graphics API
- **HTML/CSS** - Frontend structure and styling

This project uses raw WebGL (no Three.js or other frameworks) to render 3D graphics directly in the browser. The rendering pipeline includes:

## Sphere Generation Algorithm

The planets are generated using the **Icosphere (Subdivided Icosahedron)** algorithm, which provides uniform triangle distribution across the sphere surface.

### How it works

1. **Initial Icosahedron**: Start with a regular icosahedron (20 triangular faces) using 12 vertices positioned with the golden ratio
2. **Normalize to sphere**: Project all vertices to the surface of a unit sphere
3. **Recursive subdivision**: Split each triangle into 4 smaller triangles by finding midpoints and projecting them to the sphere surface
4. **Subdivision level**: Uses 3 levels of subdivision, resulting in 1,280 faces and 642 vertices per planet

## Getting Started

To install dependencies:

```bash
bun install
```

To run:

```bash
bun run dev
```

---

<p align="center">made with ❤️ by DK</p>
