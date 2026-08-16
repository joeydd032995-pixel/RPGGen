function subtract(a, b) {
  return { x:a.x-b.x, y:a.y-b.y, z:a.z-b.z };
}

function dot(a, b) {
  return a.x*b.x + a.y*b.y + a.z*b.z;
}

export function createTexturePlane(origin, uPoint, vPoint) {
  const uAxis=subtract(uPoint,origin);
  const vAxis=subtract(vPoint,origin);
  const uu=dot(uAxis,uAxis), uv=dot(uAxis,vAxis), vv=dot(vAxis,vAxis);
  const determinant=uu*vv-uv*uv;
  if (!Number.isFinite(determinant) || Math.abs(determinant)<1e-12) throw new RangeError('Texture plane axes must be finite and independent');
  return {origin:{...origin},uAxis,vAxis,uu,uv,vv,inverseDeterminant:1/determinant};
}

export function mapPointToTexturePlane(point, plane, textureScale=128) {
  const relative=subtract(point,plane.origin);
  const ru=dot(relative,plane.uAxis), rv=dot(relative,plane.vAxis);
  const u=(ru*plane.vv-rv*plane.uv)*plane.inverseDeterminant;
  const v=(rv*plane.uu-ru*plane.uv)*plane.inverseDeterminant;
  return {u:u*textureScale,v:v*textureScale};
}
