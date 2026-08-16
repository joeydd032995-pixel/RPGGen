const imageDataCache=new WeakMap();

export function presentSurface(context, surface) {
  if (!context || typeof context.putImageData !== 'function') throw new TypeError('A 2D canvas context is required');
  let imageData=imageDataCache.get(surface);
  if(!imageData){imageData=new ImageData(surface.pixels,surface.width,surface.height);imageDataCache.set(surface,imageData);}
  context.putImageData(imageData,0,0);
}
