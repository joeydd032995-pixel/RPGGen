export const CLASSIC_MODEL_BUDGET=Object.freeze({vertices:2048,faces:2048,materials:8});

function validateLimit(value,name){if(!Number.isInteger(value)||value<0)throw new RangeError(`${name} budget must be a nonnegative integer`);}

export function measureModel(model){
  const materials=new Set((model.faces||[]).map(face=>face.material).filter(value=>value!==undefined));
  return {vertices:model.vertices?.length||0,faces:model.faces?.length||0,materials:materials.size};
}

export function validateModelBudget(modelOrCounts,budget=CLASSIC_MODEL_BUDGET){
  const limits={...CLASSIC_MODEL_BUDGET,...budget};
  Object.entries(limits).forEach(([name,value])=>validateLimit(value,name));
  const counts='vertices'in modelOrCounts&&Number.isInteger(modelOrCounts.vertices)?modelOrCounts:measureModel(modelOrCounts);
  for(const key of ['vertices','faces','materials'])if(counts[key]>limits[key])throw new RangeError(`Model exceeds ${key} budget: ${counts[key]} > ${limits[key]}`);
  return counts;
}

export function computeLabelPivots(model){
  const totals={};
  for(const vertex of model.vertices||[]){const label=vertex.label||'rigid';totals[label]??={x:0,y:0,z:0,count:0};const total=totals[label];total.x+=vertex.x;total.y+=vertex.y;total.z+=vertex.z;total.count+=1;}
  return Object.fromEntries(Object.entries(totals).map(([label,total])=>[label,{x:total.x/total.count,y:total.y/total.count,z:total.z/total.count}]));
}

function rotate(vertex,options){
  let x=vertex.x*(options.scale??1),y=vertex.y*(options.scale??1),z=vertex.z*(options.scale??1);
  for(const [axis,angle] of [['x',options.rotateX||0],['y',options.rotateY||0],['z',options.rotateZ||0]]){
    if(!angle)continue;const cosine=Math.cos(angle),sine=Math.sin(angle);
    if(axis==='x')[y,z]=[y*cosine-z*sine,y*sine+z*cosine];
    else if(axis==='y')[x,z]=[x*cosine+z*sine,-x*sine+z*cosine];
    else [x,y]=[x*cosine-y*sine,x*sine+y*cosine];
  }
  return {...vertex,x:x+(options.translate?.x||0),y:y+(options.translate?.y||0),z:z+(options.translate?.z||0),label:options.label||vertex.label||'rigid'};
}

export function attachEquipment(base,equipment,options={}){
  const vertexOffset=base.vertices.length,materialOffset=base.materials?.length||0;
  const labelPivots=base.labelPivots||computeLabelPivots(base);
  const result={
    ...base,
    vertices:base.vertices.map(vertex=>({...vertex})).concat(equipment.vertices.map(vertex=>rotate(vertex,options))),
    faces:base.faces.map(face=>({...face})).concat(equipment.faces.map(face=>({...face,a:face.a+vertexOffset,b:face.b+vertexOffset,c:face.c+vertexOffset,material:face.material===undefined?undefined:face.material+materialOffset}))),
    materials:(base.materials||[]).concat(equipment.materials||[]),
    labelPivots,
    parts:[...(base.parts||[]),{name:options.name||'equipment',label:options.label||'rigid',vertexStart:vertexOffset,vertexCount:equipment.vertices.length}],
  };
  validateModelBudget(result,options.budget||CLASSIC_MODEL_BUDGET);
  return result;
}
