import { clampInt } from './fixed.mjs';

function hueToRgb(p, q, hue) {
  let t = hue;
  if (t < 0) t += 1;
  if (t > 1) t -= 1;
  if (t < 1 / 6) return p + (q - p) * 6 * t;
  if (t < 1 / 2) return q;
  if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
  return p;
}

export function packHsl(hue, saturation, lightness) {
  return (clampInt(hue, 0, 63) << 10) | (clampInt(saturation, 0, 7) << 7) | clampInt(lightness, 0, 127);
}

export function buildHslPalette(brightness = 1) {
  if (!Number.isFinite(brightness) || brightness <= 0) throw new RangeError('brightness must be positive');
  const palette = new Uint32Array(65536);
  for (let hueSaturation = 0; hueSaturation < 512; hueSaturation += 1) {
    const hue = ((hueSaturation >> 3) + 0.5) / 64;
    const saturation = ((hueSaturation & 7) + 0.5) / 8;
    for (let lightnessIndex = 0; lightnessIndex < 128; lightnessIndex += 1) {
      const lightness = lightnessIndex / 128;
      let red = lightness;
      let green = lightness;
      let blue = lightness;
      if (saturation !== 0) {
        const q = lightness < 0.5 ? lightness * (1 + saturation) : lightness + saturation - lightness * saturation;
        const p = 2 * lightness - q;
        red = hueToRgb(p, q, hue + 1 / 3);
        green = hueToRgb(p, q, hue);
        blue = hueToRgb(p, q, hue - 1 / 3);
      }
      const r = clampInt(Math.trunc(Math.pow(red, brightness) * 256), 0, 255);
      const g = clampInt(Math.trunc(Math.pow(green, brightness) * 256), 0, 255);
      const b = clampInt(Math.trunc(Math.pow(blue, brightness) * 256), 0, 255);
      palette[(hueSaturation << 7) | lightnessIndex] = (r << 16) | (g << 8) | b;
    }
  }
  return palette;
}
