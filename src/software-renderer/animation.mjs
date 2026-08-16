function rotatePoint(point, rotation) {
  let {x,y,z}=point;
  if (rotation.x) {
    const cosine=Math.cos(rotation.x), sine=Math.sin(rotation.x);
    [y,z]=[y*cosine-z*sine,y*sine+z*cosine];
  }
  if (rotation.y) {
    const cosine=Math.cos(rotation.y), sine=Math.sin(rotation.y);
    [x,z]=[x*cosine+z*sine,-x*sine+z*cosine];
  }
  if (rotation.z) {
    const cosine=Math.cos(rotation.z), sine=Math.sin(rotation.z);
    [x,y]=[x*cosine-y*sine,x*sine+y*cosine];
  }
  return {x,y,z};
}

export function applyLabelPose(model, pose={}) {
  const vertices=model.vertices.map(vertex=>({...vertex}));
  for (const transform of Object.values(pose)) {
    const labels=new Set(Array.isArray(transform.labels)?transform.labels:[transform.label]);
    const affected=vertices.filter(vertex=>labels.has(vertex.label));
    if (!affected.length) continue;
    const pivot=transform.pivot||model.labelPivots?.[transform.label]||affected.reduce((sum,vertex)=>({x:sum.x+vertex.x/affected.length,y:sum.y+vertex.y/affected.length,z:sum.z+vertex.z/affected.length}),{x:0,y:0,z:0});
    const rotation={x:transform.rotateX||0,y:transform.rotateY||0,z:transform.rotateZ||0};
    const translation=transform.translate||{x:0,y:0,z:0};
    for (const vertex of affected) {
      const rotated=rotatePoint({x:vertex.x-pivot.x,y:vertex.y-pivot.y,z:vertex.z-pivot.z},rotation);
      vertex.x=rotated.x+pivot.x+(translation.x||0);
      vertex.y=rotated.y+pivot.y+(translation.y||0);
      vertex.z=rotated.z+pivot.z+(translation.z||0);
    }
  }
  return {...model,vertices};
}
