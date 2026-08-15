# RPGGen

**PromptRealm MMORPG Generator** — a prompt-to-playable-world mini-MMORPG prototype. Describe a
world in a sentence and it generates a genre, biomes, factions, NPCs, quests, and a walkable
isometric overworld you can explore, fight through, and regenerate on the fly.

The playable runtime remains in `index.html` (Phaser 3 loaded from CDN), with a small `assets/`
folder for the isometric art. The repository now includes a lightweight Vite build and Node test
command for repeatable delivery checks.

## Play

Open `index.html` in a modern browser. Because the game loads image assets from `assets/`,
browsers block those over the `file://` protocol — serve the folder over HTTP instead:

```
python3 -m http.server 8000
# then visit http://127.0.0.1:8000/index.html
```

GitHub Pages (or any static host) works too — just keep `index.html` and the `assets/` folder
side by side. If the art ever fails to load, the game falls back to procedurally generated
placeholder tiles and characters so it still runs.

## Development

```
npm install
npm test
npm run build
npm run serve
```

The game uses a deterministic seed for world and runtime random streams. Use the in-game **Save**
button to retain character progression, quests, inventory, faction reputation, and random-stream
state in browser storage; **Continue Saved Adventure** appears on the title screen when a valid
save is available.

World scale now controls settlement and landmark density, magic/technology affects merchant stock,
faction allegiance changes reputation with rival powers, and dangerous landmarks trigger seeded
encounters. Procedural biome props, climate tinting, temporary weather, keyboard-safe dialogs, and
reduced-motion support provide a richer presentation without requiring additional downloads.

## Controls

- **Keyboard:** WASD / arrow keys to move.
- **Touch:** the bottom-left virtual joystick, or press-and-drag anywhere on the world.
- Tap an NPC to talk; tap an enemy to engage. A drag that starts on a character moves you
  instead of triggering it, so canvas-drag works even where characters are clustered.

## Graphics

The overworld is rendered with native Phaser isometric tilemaps. Terrain is drawn as isometric
cubes (water and voids sink below the walkable ground for real depth), biomes are matched to
tiles by a hue-aware color metric, and the player, NPCs, and enemies use an 8-direction animated
character sheet whose facing follows the on-screen movement direction. The minimap stays a flat
top-down biome view for readability.

## Assets & attribution

Isometric tiles and character art in `assets/` are derived from **Kenney** CC0 asset packs
(<https://kenney.nl>) — see `assets/LICENSE.txt`. Kenney assets are released under Creative
Commons Zero (public domain); no attribution is required, but it is included with thanks.
