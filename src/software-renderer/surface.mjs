function assertDimension(value, name) {
  if (!Number.isInteger(value) || value <= 0 || value > 8192) {
    throw new RangeError(`${name} must be an integer from 1 to 8192`);
  }
}

export function createSurface(width, height) {
  assertDimension(width, 'width');
  assertDimension(height, 'height');
  const pixels=new Uint8ClampedArray(width*height*4);
  return {width,height,pixels,words:new Uint32Array(pixels.buffer)};
}

export function clearSurface(surface, rgb = 0) {
  const red = (rgb >>> 16) & 255;
  const green = (rgb >>> 8) & 255;
  const blue = rgb & 255;
  surface.words.fill((255<<24)|(blue<<16)|(green<<8)|red);
}

export function writePixel(surface, x, y, rgb, alpha = 255) {
  if (x < 0 || y < 0 || x >= surface.width || y >= surface.height || alpha <= 0) return;
  const offset = (y * surface.width + x) * 4;
  const red = (rgb >>> 16) & 255;
  const green = (rgb >>> 8) & 255;
  const blue = rgb & 255;
  if (alpha >= 255) {
    surface.pixels[offset] = red;
    surface.pixels[offset + 1] = green;
    surface.pixels[offset + 2] = blue;
  } else {
    const inverse = 255 - alpha;
    surface.pixels[offset] = Math.trunc((red * alpha + surface.pixels[offset] * inverse + 127) / 255);
    surface.pixels[offset + 1] = Math.trunc((green * alpha + surface.pixels[offset + 1] * inverse + 127) / 255);
    surface.pixels[offset + 2] = Math.trunc((blue * alpha + surface.pixels[offset + 2] * inverse + 127) / 255);
  }
  surface.pixels[offset + 3] = 255;
}

export function hashSurface(surface) {
  let hash = 0x811c9dc5;
  for (let index=0;index<surface.pixels.length;index+=1) {
    hash ^= surface.pixels[index];
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(16).padStart(8, '0');
}
