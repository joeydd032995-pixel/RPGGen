import { FP_HALF, FP_ONE, ceilFixed, clampInt, divFixed, mulFixed, toFixed } from './fixed.mjs';
import { writePixel } from './surface.mjs';
import { isPreparedTexelOpaque, samplePreparedTexture } from './texture.mjs';

const EDGES = [[0, 1], [1, 2], [2, 0]];

function normalizeVertex(vertex) {
  const q = vertex.qFixed ?? toFixed(vertex.q ?? 1);
  const selectedQ=q/FP_ONE;
  const uQ = vertex.uQFixed ?? toFixed((vertex.u ?? 0) * selectedQ);
  const vQ = vertex.vQFixed ?? toFixed((vertex.v ?? 0) * selectedQ);
  return {
    x: vertex.xFixed ?? toFixed(vertex.x),
    y: vertex.yFixed ?? toFixed(vertex.y),
    light: vertex.lightFixed ?? toFixed(vertex.light ?? 127),
    q,
    uQ,
    vQ,
  };
}

function interpolate(a, b, amount) {
  return a + mulFixed(b - a, amount);
}

function edgeIntersection(a,b,sampleY,output) {
  let top = a;
  let bottom = b;
  if (top.y > bottom.y) [top, bottom] = [bottom, top];
  if (top.y === bottom.y || sampleY < top.y || sampleY >= bottom.y) return false;
  const amount = divFixed(sampleY - top.y, bottom.y - top.y);
  output.x=interpolate(top.x,bottom.x,amount);
  output.light=interpolate(top.light,bottom.light,amount);
  output.q=interpolate(top.q,bottom.q,amount);
  output.uQ=interpolate(top.uQ,bottom.uQ,amount);
  output.vQ=interpolate(top.vQ,bottom.vQ,amount);
  return true;
}

function spanValue(left,right,key,amount) {
  return interpolate(left[key],right[key],amount);
}

function triangleArea(vertices) {
  const [a, b, c] = vertices;
  return (b.x - a.x) * (c.y - a.y) - (b.y - a.y) * (c.x - a.x);
}

export function drawTriangle(surface, command, palette) {
  if (!command || !Array.isArray(command.vertices) || command.vertices.length !== 3) throw new TypeError('Triangle command requires three vertices');
  const vertices = command.vertices.map(normalizeVertex);
  const mode=command.mode||'flat';
  if(mode!=='flat'&&mode!=='gouraud'&&mode!=='textured')throw new RangeError(`Unknown triangle mode ${mode}`);
  if(mode==='gouraud'&&(!palette||palette.length!==65536))throw new TypeError('Gouraud mode requires a 65536-entry HSL palette');
  if(mode==='textured'&&!command.texture)throw new TypeError('Textured mode requires a prepared texture');
  const paletteBase=clampInt(command.hueSaturation??0,0,511)<<7;
  if (triangleArea(vertices) === 0) return 0;
  const minimumY = Math.min(...vertices.map(vertex => vertex.y));
  const maximumY = Math.max(...vertices.map(vertex => vertex.y));
  const startY = Math.max(0, ceilFixed(minimumY - FP_HALF));
  const endY = Math.min(surface.height, ceilFixed(maximumY - FP_HALF));
  const alpha = clampInt(command.alpha ?? 255, 0, 255);
  const opaque=alpha===255,pixels=surface.pixels;
  const intersections=[{},{},{}];
  let pixelsDrawn = 0;

  for (let y = startY; y < endY; y += 1) {
    const sampleY = y * FP_ONE + FP_HALF;
    let left=null,right=null;
    for(let edge=0;edge<3;edge+=1){
      const [from,to]=EDGES[edge],intersection=intersections[edge];
      if(!edgeIntersection(vertices[from],vertices[to],sampleY,intersection))continue;
      if(!left||intersection.x<left.x)left=intersection;
      if(!right||intersection.x>right.x)right=intersection;
    }
    if(!left||!right||left===right)continue;
    const startX = Math.max(0, ceilFixed(left.x - FP_HALF));
    const endX = Math.min(surface.width, ceilFixed(right.x - FP_HALF));
    for (let x = startX; x < endX; x += 1) {
      const sampleX = x * FP_ONE + FP_HALF;
      const amount=right.x===left.x?0:divFixed(sampleX-left.x,right.x-left.x);
      let rgb;
      if (mode === 'gouraud') {
        const lightness=clampInt(spanValue(left,right,'light',amount)>>16,0,127);
        rgb=palette[paletteBase|lightness];
      } else if (mode === 'textured') {
        const q=spanValue(left,right,'q',amount);
        if (q === 0) continue;
        const u=divFixed(spanValue(left,right,'uQ',amount),q);
        const v=divFixed(spanValue(left,right,'vQ',amount),q);
        const lightness=clampInt(spanValue(left,right,'light',amount)>>16,0,127);
        if(command.texture.transparent&&!isPreparedTexelOpaque(command.texture,u,v))continue;
        rgb = samplePreparedTexture(command.texture, u, v, lightness);
      } else {
        rgb = command.color ?? 0xffffff;
      }
      if(opaque){const offset=(y*surface.width+x)*4;pixels[offset]=(rgb>>>16)&255;pixels[offset+1]=(rgb>>>8)&255;pixels[offset+2]=rgb&255;pixels[offset+3]=255;}
      else writePixel(surface,x,y,rgb,alpha);
      pixelsDrawn += 1;
    }
  }
  return pixelsDrawn;
}

export function renderCommands(surface, commands, palette) {
  let pixelsDrawn = 0;
  const ordered = typeof commands.ordered === 'function' ? commands.ordered() : commands;
  for (const command of ordered) pixelsDrawn += drawTriangle(surface, command, palette);
  return pixelsDrawn;
}
