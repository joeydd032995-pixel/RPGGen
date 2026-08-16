import { buildHslPalette, clearSurface, createSurface, drawDemoOverlay, hashSurface, loadGlbModel, presentSurface, renderCommands } from '../../src/software-renderer/index.mjs';
import { buildDemoScene, prepareKayKitKnight } from './scene.mjs';

const canvas = document.querySelector('#software-canvas');
const hashOutput = document.querySelector('#frame-hash');
const frameSlider = document.querySelector('#frame-slider');
const surface = createSurface(canvas.width, canvas.height);
const context = canvas.getContext('2d', { alpha:false });
const palette = buildHslPalette(0.82);
let assets={};

function renderFrame(frame) {
  clearSurface(surface, 0x0d1218);
  renderCommands(surface, buildDemoScene(frame,palette,assets), palette);
  drawDemoOverlay(surface,frame);
  presentSurface(context, surface);
  const hash = hashSurface(surface);
  hashOutput.textContent = hash;
  return hash;
}

frameSlider.addEventListener('input', () => renderFrame(Number(frameSlider.value)));
window.__cpuRendererDemo = { renderFrame, pixelHash:() => hashSurface(surface) };
renderFrame(0);

Promise.all([
  loadGlbModel(new URL('../../assets/models/kenney-nature/tree_oak.glb',import.meta.url),{doubleSided:true}),
  loadGlbModel(new URL('../../assets/models/kenney-nature/rock_largeC.glb',import.meta.url),{doubleSided:true}),
  loadGlbModel(new URL('../../assets/models/kenney-nature/plant_bushDetailed.glb',import.meta.url),{doubleSided:true}),
  loadGlbModel(new URL('../../assets/models/kenney-nature/log.glb',import.meta.url),{doubleSided:true}),
  loadGlbModel(new URL('../../assets/models/kaykit-adventurers/knight-classic.glb',import.meta.url)),
  loadGlbModel(new URL('../../assets/models/kaykit-fantasy-weapons/sword-a.glb',import.meta.url)),
]).then(([tree,rock,bush,log,knight,sword])=>{
  assets={tree,rock,bush,log,knight:prepareKayKitKnight(knight,sword)};
  renderFrame(Number(frameSlider.value));
});
