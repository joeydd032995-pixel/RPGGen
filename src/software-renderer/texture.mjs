import { clampInt } from './fixed.mjs';

export const TEXTURE_SIZE = 128;
export const TEXTURE_TEXELS = TEXTURE_SIZE * TEXTURE_SIZE;
export const TEXTURE_SHADE_MASK = 0xf8f8ff;

export function prepareTexture128(source) {
  if (!source || source.length !== TEXTURE_TEXELS) throw new RangeError('Texture source must contain 16384 RGB texels');
  const banks = new Uint32Array(TEXTURE_TEXELS * 4);
  const opacity=new Uint8Array(TEXTURE_TEXELS);
  let transparent = false;
  for (let index = 0; index < TEXTURE_TEXELS; index += 1) {
    opacity[index]=source[index]===0?0:1;
    transparent ||= opacity[index]===0;
    const base = source[index] & TEXTURE_SHADE_MASK;
    banks[index] = base;
    banks[index + TEXTURE_TEXELS] = (base - (base >>> 3)) & TEXTURE_SHADE_MASK;
    banks[index + TEXTURE_TEXELS * 2] = (base - (base >>> 2)) & TEXTURE_SHADE_MASK;
    banks[index + TEXTURE_TEXELS * 3] = (base - (base >>> 2) - (base >>> 3)) & TEXTURE_SHADE_MASK;
  }
  return {width:TEXTURE_SIZE,height:TEXTURE_SIZE,banks,opacity,transparent};
}

export function samplePreparedTexture(texture, uFixed, vFixed, lightness) {
  const u = (uFixed >> 16) & 127;
  const v = (vFixed >> 16) & 127;
  const shadeBank = clampInt((127 - clampInt(lightness, 0, 127)) >> 5, 0, 3);
  return texture.banks[shadeBank * TEXTURE_TEXELS + v * TEXTURE_SIZE + u];
}

export function isPreparedTexelOpaque(texture,uFixed,vFixed){
  return texture.opacity[((vFixed>>16)&127)*TEXTURE_SIZE+((uFixed>>16)&127)]!==0;
}
