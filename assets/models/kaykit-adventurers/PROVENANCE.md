# KayKit Adventurers Provenance

- Creator: Kay Lousberg
- Source: https://kaylousberg.itch.io/kaykit-adventurers
- Retrieved: 2026-08-16
- Archive: `KayKit_Adventurers_2.0_FREE.zip`
- Archive SHA-256: `abe48f4763fba0896bab486ee9e6d08ca6b5b3884b9601f235c8847ae94dc479`
- License: CC0 1.0 Universal
- Selected source: `Characters/gltf/Knight.glb`
- Conversion: removed renderer-unused `NORMAL`, `TEXCOORD_0`, and `TANGENT` attributes, then applied
  `@gltf-transform/functions@4.1.1` `weld()`, Meshoptimizer `simplify({ratio:0.1,error:0.35})`, and `prune()`.
  Positions, joints, weights, skin, and all 18 dominant-joint labels are preserved.
- Selected SHA-256: `701e9fa73928bd1fc954555fbd38ac0297261761703612d86e38588f5abcbad6`
- Runtime budget: 323 vertices, 571 faces, one material.
