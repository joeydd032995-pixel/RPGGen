# Software Renderer

The software-renderer work is isolated from the Phaser game while its pixel contract is established.
It renders into an explicit RGBA byte buffer and only uses Canvas 2D to present the completed frame.

## Implemented foundation

- Signed 16.16 helpers for raster edge and attribute interpolation.
- Scanline flat, packed-HSL Gouraud, and homogeneous textured triangle paths.
- A deterministic 65,536-entry palette: 6 hue bits, 3 saturation bits, and 7 lightness bits.
- 128x128 textures with four pre-generated shade banks and the `0xF8F8FF` packed-RGB mask.
- Model-space texture-plane coordinate derivation without requiring stored per-vertex UVs.
- Back-to-front depth buckets and explicit priorities, including special priorities 10 and 11.
- Instanced low-poly models, camera/view transforms, near-plane clipping, back-face culling, and directional lighting.
- Label-group translation and rotation for rigid, keyframed character posing without weighted skinning.
- Integer alpha compositing, raw framebuffer hashing, and a standalone 320x200 browser demo.
- Embedded GLB PNG extraction, conventional UV preservation, browser-side 128x128 atlas preparation,
  and perspective-correct textured model rendering.
- A responsive primary-game presentation layer with portrait/landscape camera profiles, authored
  settlement dressing, cached articulated poses, and projected combat indicators.

The CPU implementation is retained as the deterministic reference, test, and fallback subsystem.
Primary gameplay now uses a Three.js/WebGL scene so production presentation can provide native
resolution, PBR GLTF materials, soft shadow maps, ACES tone mapping, atmospheric fog, and a denser
scene without weakening the CPU renderer's deterministic contracts.

Open `software-renderer.html` through the Vite development server to inspect the three fill modes.
The frame slider uses caller-supplied integer frames; it does not depend on wall-clock time.

## Fidelity contract

The same commands, palette brightness, texture data, and output dimensions must produce the same raw
RGBA hash. Browser screenshots are not the source of truth because browser color management and CSS
scaling can differ. The current procedural frame-zero test hash is `23af56e3`. The browser demo
adds locally licensed GLB scenery and project-owned overlays after those assets load; that integrated
frame hash is `1137371c` with the licensed KayKit knight and sword loaded in deterministic flat-color
fixture mode. Browser-loaded KayKit models additionally use their embedded 128x128 gradient atlases.

The current Node benchmark averages approximately 26.2 ms per procedural 320x200 frame on the
development host, improved from the initial 33.7 ms baseline. The complete licensed scene averages
87.5 ms/frame: Kenney scenery accounts for about 70.6 ms and the reduced KayKit actor adds about
17.2 ms. Browser performance remains a separate release gate and will vary by CPU and JavaScript
engine.

## Not yet claimed as exact

- Revision-specific camera FOV, projection constants, clipping interpolation, and scissor edge behavior.
- The original eight-pixel perspective approximation and exact texture shade-bit addressing.
- Complete priority threshold behavior for every historical client revision.
- Original model/cache decoding, face texture-triangle metadata, and animation keyframe decoding.
- Reference-image parity. No original frame captures or model fixtures are currently in this repo.

These must be implemented and measured before describing output as pixel-identical to a particular
client revision. Proprietary game assets or copied client source are not required by this clean-room
implementation; reference fixtures should be assets the project is licensed to redistribute.

## Next integration layer

1. Formalize the current low-poly model objects into a versioned file schema with validation.
2. Replace floating model/view setup math with revision-calibrated lookup tables and fixed-point transforms.
3. Add far and viewport clipping plus the classic eight-pixel textured perspective stepping behavior.
4. Add keyframe sequence decoding on top of the implemented label-group transforms.
5. Establish licensed model and reference-frame fixtures and compare raw pixel hashes or bounded pixel diffs.
