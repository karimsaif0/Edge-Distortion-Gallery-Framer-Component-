# Edge Distortion Gallery — Framer Component

<div align="center">

### Infinite images. Distorted edges. Endless exploration.

**An immersive WebGL image gallery with fisheye edge distortion, chromatic aberration, and infinite drag-to-explore navigation.**

[**Live Demo**](https://edgedistortiongallery.framer.website/) · [**Creator on X**](https://x.com/karimsaif0) · [**Contact**](mailto:karimsaif010@gmail.com)

**Made with 💛 by Karim Saif**

</div>

---

## Experience

A continuously flowing, interactive image gallery that turns a classic card grid into a cinematic canvas. Move through an endlessly repeating collection with mouse, pen, or touch. At the edges, a custom GLSL shader bends the gallery and separates red and blue channels for a subtle optical-glass finish.

**[Explore the live interactive preview](https://edgedistortiongallery.framer.website/)**

## Highlights

| Visual | Interaction | Production-conscious |
| --- | --- | --- |
| WebGL edge fisheye distortion | Infinite wrap in both directions | Native Framer property controls |
| RGB chromatic aberration | Mouse / pen / optional touch drag | Reduced-motion handling |
| Rounded photographic cards | Momentum and diagonal auto-drift | Viewport-aware pausing |
| Responsive card grid | Adjustable zoom and movement | DPR and texture-resolution limits |
| Orthographic flat-card layout | Configurable speed and friction | Static image-grid fallback |

## Built For

Creative portfolios, fashion editorials, photography collections, design studios, art direction, immersive landing pages, and experimental digital experiences.

## Getting Started in Framer

1. Open a Framer project.
2. Create a new **Code Component** named `KarimSaifEdgeDistortionGallery.tsx`.
3. Paste the component's complete TSX source into that file.
4. Add the component to the canvas and give it a size (for example, a full-width hero).
5. Replace reference images with your own licensed images.
6. Tune the image grid, fisheye distortion, RGB split, drift, zoom and interaction settings in the property panel.

**Source:** [KarimSaifEdgeDistortionGallery.tsx](./KarimSaifEdgeDistortionGallery.tsx) — complete Framer React + TypeScript component with shader and property controls. The live demo showcases the published Framer experience.

## Customize

| Control group | Options |
| --- | --- |
| Content | Image array, background color |
| Layout | Minimum rows and columns, card width / height, horizontal / vertical gaps, rounded corners |
| Optical effects | Fisheye strength, RGB split, edge start |
| Navigation | Zoom, pointer dragging, optional mobile touch dragging, drag speed, inertia |
| Motion | Auto-drift, horizontal / vertical drift speed, pause |
| Performance | Maximum device pixel ratio, maximum texture dimension |

Every included Framer property control has a description to make editing easy.

## Design & Engineering

The component is designed around React, TypeScript, Three.js, and custom GLSL. An orthographic camera preserves flat image geometry; a postprocessing shader applies viewport-edge barrel distortion and chromatic aberration. Shared geometry and materials help minimize overhead. Responsive overscan maintains gallery coverage across viewport sizes.

The implementation also includes a static image-grid fallback, reduced-motion checks, and GPU-conscious quality controls.

## Notes

- WebGL, image loading, and touch behavior should be tested on your target desktop and mobile browsers before reusing the source in production.
- Supply images you own or have rights to use. The source's initial Pinterest examples are not included as distributable assets.
- Some external image hosts block cross-origin WebGL textures. Prefer direct Framer-hosted or CORS-enabled image URLs.
- The static fallback is a representative grid, not a pixel-exact rendering of the shader.

## Support & Feedback

Questions, suggestions, or something cool built with the gallery?

- **X:** [@karimsaif0](https://x.com/karimsaif0)
- **Email:** [karimsaif010@gmail.com](mailto:karimsaif010@gmail.com)
- **Live Demo:** [edgedistortiongallery.framer.website](https://edgedistortiongallery.framer.website/)

---

<div align="center">

**Design outside the grid.**

Made with 💛 by Karim Saif

</div>
