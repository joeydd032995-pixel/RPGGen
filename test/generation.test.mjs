import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';

const source = readFileSync(new URL('../index.html', import.meta.url), 'utf8');

test('runtime has named deterministic streams and save support', () => {
  assert.match(source, /function getRunRng\(name\)/);
  assert.match(source, /const SAVE_KEY = 'promptrealm-save-v1'/);
  assert.doesNotMatch(source, /new RNG\(String\(Math\.random\(\)\)\)/);
});

test('combat and modal state use the unified gameplay lock', () => {
  assert.match(source, /function isGameplayLocked\(\)/);
  assert.match(source, /if \(STATE\.combat\) \{ syncGameplayLock\(\); return; \}/);
  assert.match(source, /if \(STATE\.combat \|\| isGameplayLocked\(\)\) \{ return; \}/);
});

test('save migration preserves expanded runtime state', () => {
  assert.match(source, /const SAVE_VERSION = 2/);
  assert.match(source, /function migrateSave\(snapshot\)/);
  assert.match(source, /runtime:\{distanceAccum:STATE\.distanceAccum/);
  assert.match(source, /snapPlayerSprite\(\); redrawMinimap\(true\)/);
});

test('generation drives factions and biome presentation', () => {
  assert.match(source, /function buildFactionRelations\(factions, style\)/);
  assert.match(source, /issuerFactionId:npc\.factionId/);
  assert.match(source, /function biomeVisualProfile\(biome\)/);
  assert.match(source, /propSprites = \(data\.props\|\|\[\]\)\.map/);
});

test('interactive overlays expose accessibility semantics', () => {
  assert.match(source, /role="dialog" aria-modal="true"/);
  assert.match(source, /prefers-reduced-motion:reduce/);
  assert.match(source, /function initDialogKeyboard\(\)/);
  assert.match(source, /document\.createElement\('button'\); slot\.type='button'/);
});
