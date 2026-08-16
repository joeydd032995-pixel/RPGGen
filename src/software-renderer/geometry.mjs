import { clampInt } from './fixed.mjs';
import { createTexturePlane, mapPointToTexturePlane } from './plane.mjs';

function subtract(a,b){return{x:a.x-b.x,y:a.y-b.y,z:a.z-b.z};}
function cross(a,b){return{x:a.y*b.z-a.z*b.y,y:a.z*b.x-a.x*b.z,z:a.x*b.y-a.y*b.x};}
function dot(a,b){return a.x*b.x+a.y*b.y+a.z*b.z;}
function length(vector){return Math.hypot(vector.x,vector.y,vector.z);}
function normalize(vector){const magnitude=length(vector)||1;return{x:vector.x/magnitude,y:vector.y/magnitude,z:vector.z/magnitude};}
function add(a,b){return{x:a.x+b.x,y:a.y+b.y,z:a.z+b.z};}
function scale(a,factor){return{x:a.x*factor,y:a.y*factor,z:a.z*factor};}
const normalCache=new WeakMap();

export function createCamera(options={}) {
  const camera={x:options.x??0,y:options.y??0,z:options.z??0,yaw:options.yaw??0,pitch:options.pitch??0,focalLength:options.focalLength??256,centerX:options.centerX??160,centerY:options.centerY??100,near:options.near??8,far:options.far??1499};
  if(camera.focalLength<=0||camera.near<=0||camera.far<=camera.near)throw new RangeError('Camera requires positive focal length and 0 < near < far');
  return camera;
}

export function transformToView(point,camera,trig) {
  const dx=point.x-camera.x,dy=point.y-camera.y,dz=point.z-camera.z;
  const yawCos=trig?.yawCos??Math.cos(camera.yaw),yawSin=trig?.yawSin??Math.sin(camera.yaw);
  const x=dx*yawCos-dz*yawSin;
  const yawZ=dx*yawSin+dz*yawCos;
  const pitchCos=trig?.pitchCos??Math.cos(camera.pitch),pitchSin=trig?.pitchSin??Math.sin(camera.pitch);
  return {x,y:dy*pitchCos-yawZ*pitchSin,z:dy*pitchSin+yawZ*pitchCos};
}

export function projectViewPoint(point,camera) {
  return {x:camera.centerX+point.x*camera.focalLength/point.z,y:camera.centerY-point.y*camera.focalLength/point.z,z:point.z};
}

function transformModelPoint(point,transform,trig) {
  const size=transform.scale??1;
  const scaled={x:point.x*size,y:point.y*size,z:point.z*size};
  const cosine=trig?.cosine??Math.cos(transform.rotationY??0),sine=trig?.sine??Math.sin(transform.rotationY??0);
  return {
    x:scaled.x*cosine-scaled.z*sine+(transform.x??0),
    y:scaled.y+(transform.y??0),
    z:scaled.x*sine+scaled.z*cosine+(transform.z??0),
    label:point.label,
  };
}

function clipDepth(vertices,limit,keepGreater) {
  const output=[];
  for(let index=0;index<vertices.length;index+=1){
    const current=vertices[index],previous=vertices[(index+vertices.length-1)%vertices.length];
    const currentInside=keepGreater?current.view.z>=limit:current.view.z<=limit;
    const previousInside=keepGreater?previous.view.z>=limit:previous.view.z<=limit;
    if(currentInside!==previousInside){
      const amount=(limit-previous.view.z)/(current.view.z-previous.view.z);
      const interpolate=(key)=>previous[key]+(current[key]-previous[key])*amount;
      output.push({
        view:{x:previous.view.x+(current.view.x-previous.view.x)*amount,y:previous.view.y+(current.view.y-previous.view.y)*amount,z:limit},
        light:interpolate('light'),u:interpolate('u'),v:interpolate('v'),
      });
    }
    if(currentInside)output.push(current);
  }
  return output.filter((vertex,index)=>index===0||vertex.view.x!==output[index-1].view.x||vertex.view.y!==output[index-1].view.y||vertex.view.z!==output[index-1].view.z);
}

function computeNormals(vertices,faces) {
  const faceNormals=[];
  const vertexNormals=vertices.map(()=>({x:0,y:0,z:0}));
  faces.forEach((face,index)=>{
    const normal=normalize(cross(subtract(vertices[face.b],vertices[face.a]),subtract(vertices[face.c],vertices[face.a])));
    faceNormals[index]=normal;
    for(const vertexIndex of [face.a,face.b,face.c])vertexNormals[vertexIndex]=add(vertexNormals[vertexIndex],normal);
  });
  return {faceNormals,vertexNormals:vertexNormals.map(normalize)};
}

function modelNormals(model){
  let normals=normalCache.get(model);
  if(!normals){normals=computeNormals(model.vertices,model.faces);normalCache.set(model,normals);}
  return normals;
}

function rotateNormal(normal,cosine,sine){return{x:normal.x*cosine-normal.z*sine,y:normal.y,z:normal.x*sine+normal.z*cosine};}

function lightness(normal,lighting) {
  const diffuse=Math.max(0,dot(normal,lighting.direction));
  return clampInt(Math.round(lighting.ambient+diffuse*lighting.intensity),2,126);
}

function projectedArea(a,b,c){return(b.x-a.x)*(c.y-a.y)-(b.y-a.y)*(c.x-a.x);}

export function enqueueModel(queue,model,options) {
  const {camera,palette}=options;
  const transform=options.transform||{};
  const lighting={ambient:options.lighting?.ambient??32,intensity:options.lighting?.intensity??82,direction:normalize(options.lighting?.direction||{x:-0.35,y:0.8,z:-0.48})};
  const modelAngle=transform.rotationY??0,modelTrig={cosine:Math.cos(modelAngle),sine:Math.sin(modelAngle)};
  const cameraTrig={yawCos:Math.cos(camera.yaw),yawSin:Math.sin(camera.yaw),pitchCos:Math.cos(camera.pitch),pitchSin:Math.sin(camera.pitch)};
  const worldVertices=model.vertices.map(vertex=>transformModelPoint(vertex,transform,modelTrig));
  const localNormals=modelNormals(model);
  const faceNormals=localNormals.faceNormals.map(normal=>rotateNormal(normal,modelTrig.cosine,modelTrig.sine));
  const vertexNormals=localNormals.vertexNormals.map(normal=>rotateNormal(normal,modelTrig.cosine,modelTrig.sine));
  const faceLights=faceNormals.map(normal=>lightness(normal,lighting));
  const vertexLights=vertexNormals.map(normal=>lightness(normal,lighting));
  const viewVertices=worldVertices.map(vertex=>transformToView(vertex,camera,cameraTrig));
  let facesQueued=0;

  model.faces.forEach((face,faceIndex)=>{
    const mode=face.mode??'flat';
    if(mode!=='flat'&&mode!=='gouraud'&&mode!=='textured')throw new RangeError(`Unknown face mode ${mode}`);
    const indices=[face.a,face.b,face.c];
    const packedHsl=face.hsl??0;
    const hueSaturation=packedHsl>>7;
    const shadeLight=(raw)=>mode==='textured'?raw:clampInt(Math.round((packedHsl&127)*raw/127),2,126);
    if(!face.texturePlane&&indices.every(vertexIndex=>viewVertices[vertexIndex].z>=camera.near&&viewVertices[vertexIndex].z<=camera.far)){
      const projected=indices.map(vertexIndex=>{
        const view=viewVertices[vertexIndex],uv=model.vertices[vertexIndex].uv;
        return{...projectViewPoint(view,camera),light:shadeLight(mode==='gouraud'?vertexLights[vertexIndex]:faceLights[faceIndex]),u:uv?uv[0]*127:0,v:uv?(1-uv[1])*127:0,q:1/view.z};
      });
      const area=projectedArea(...projected);
      if(area===0||(!face.doubleSided&&area>=0))return;
      const command={mode,vertices:projected,depth:Math.round(indices.reduce((sum,index)=>sum+viewVertices[index].z,0)/3),priority:face.priority??0,alpha:face.alpha??255};
      if(mode==='flat')command.color=palette[(hueSaturation<<7)|projected[0].light];
      else if(mode==='gouraud')command.hueSaturation=hueSaturation;
      else {command.texture=options.textures?.[face.texture]||model.textures?.[face.texture];if(!command.texture)return;}
      queue.add(command);facesQueued+=1;return;
    }
    let mapping=null;
    if(face.texturePlane){
      const [origin,uPoint,vPoint]=face.texturePlane.map(index=>worldVertices[index]);
      mapping=createTexturePlane(origin,uPoint,vPoint);
    }
    const polygon=indices.map(vertexIndex=>{
      const uv=model.vertices[vertexIndex].uv;
      const mapped=mapping?mapPointToTexturePlane(worldVertices[vertexIndex],mapping,127):uv?{u:uv[0]*127,v:(1-uv[1])*127}:{u:0,v:0};
      return {
        view:viewVertices[vertexIndex],u:mapped.u,v:mapped.v,
        light:shadeLight(mode==='gouraud'?vertexLights[vertexIndex]:faceLights[faceIndex]),
      };
    });
    const clipped=clipDepth(clipDepth(polygon,camera.near,true),camera.far,false);
    if(clipped.length<3)return;
    for(let triangleIndex=1;triangleIndex<clipped.length-1;triangleIndex+=1){
      const triangle=[clipped[0],clipped[triangleIndex],clipped[triangleIndex+1]];
      const projected=triangle.map(vertex=>({...projectViewPoint(vertex.view,camera),light:vertex.light,u:vertex.u,v:vertex.v,q:1/vertex.view.z}));
      const area=projectedArea(...projected);
      if(area===0||(!face.doubleSided&&area>=0))continue;
      const depth=Math.round(triangle.reduce((sum,vertex)=>sum+vertex.view.z,0)/3);
      const command={mode,vertices:projected,depth,priority:face.priority??0,alpha:face.alpha??255};
      if(command.mode==='flat')command.color=palette[(hueSaturation<<7)|triangle[0].light];
      else if(command.mode==='gouraud')command.hueSaturation=hueSaturation;
      else {command.texture=options.textures?.[face.texture]||model.textures?.[face.texture];if(!command.texture)return;}
      queue.add(command);facesQueued+=1;
    }
  });
  return facesQueued;
}

export function faceNormal(a,b,c){return normalize(cross(subtract(b,a),subtract(c,a)));}
