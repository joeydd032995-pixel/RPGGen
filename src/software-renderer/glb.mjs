import { packHsl } from './palette.mjs';
import { CLASSIC_MODEL_BUDGET, validateModelBudget } from './model.mjs';
import { prepareTexture128 } from './texture.mjs';

const GLB_MAGIC=0x46546c67;
const JSON_CHUNK=0x4e4f534a;
const BIN_CHUNK=0x004e4942;
const COMPONENTS={SCALAR:1,VEC2:2,VEC3:3,VEC4:4,MAT4:16};
const COMPONENT_BYTES={5121:1,5123:2,5125:4,5126:4};

function rgbToHsl(red,green,blue){
  const maximum=Math.max(red,green,blue),minimum=Math.min(red,green,blue);
  let hue=0,saturation=0;
  const lightness=(maximum+minimum)/2;
  if(maximum!==minimum){
    const delta=maximum-minimum;
    saturation=lightness>0.5?delta/(2-maximum-minimum):delta/(maximum+minimum);
    if(maximum===red)hue=(green-blue)/delta+(green<blue?6:0);
    else if(maximum===green)hue=(blue-red)/delta+2;
    else hue=(red-green)/delta+4;
    hue/=6;
  }
  return packHsl(Math.round(hue*63),Math.round(saturation*7),Math.round(lightness*127));
}

function readComponent(view,offset,type){
  if(type===5121)return view.getUint8(offset);
  if(type===5123)return view.getUint16(offset,true);
  if(type===5125)return view.getUint32(offset,true);
  if(type===5126)return view.getFloat32(offset,true);
  throw new RangeError(`Unsupported GLB component type ${type}`);
}

function readAccessor(gltf,binary,index){
  const accessor=gltf.accessors[index],bufferView=gltf.bufferViews[accessor.bufferView];
  const components=COMPONENTS[accessor.type],componentBytes=COMPONENT_BYTES[accessor.componentType];
  if(!components||!componentBytes)throw new RangeError(`Unsupported GLB accessor ${accessor.type}/${accessor.componentType}`);
  const stride=bufferView.byteStride||components*componentBytes;
  const start=(bufferView.byteOffset||0)+(accessor.byteOffset||0);
  const view=new DataView(binary.buffer,binary.byteOffset,binary.byteLength);
  const values=new Array(accessor.count);
  for(let item=0;item<accessor.count;item+=1){
    const normalizeValue=(value)=>accessor.normalized&&accessor.componentType===5121?value/255:accessor.normalized&&accessor.componentType===5123?value/65535:value;
    if(components===1)values[item]=normalizeValue(readComponent(view,start+item*stride,accessor.componentType));
    else {const tuple=new Array(components);for(let component=0;component<components;component+=1)tuple[component]=normalizeValue(readComponent(view,start+item*stride+component*componentBytes,accessor.componentType));values[item]=tuple;}
  }
  return values;
}

export function parseGlbModel(arrayBuffer,options={}){
  const bytes=new Uint8Array(arrayBuffer),header=new DataView(arrayBuffer,0,12);
  if(header.getUint32(0,true)!==GLB_MAGIC||header.getUint32(4,true)!==2)throw new RangeError('Expected a GLB 2.0 file');
  let offset=12,gltf=null,binary=null;
  while(offset<bytes.byteLength){
    const chunkHeader=new DataView(arrayBuffer,offset,8),length=chunkHeader.getUint32(0,true),type=chunkHeader.getUint32(4,true);
    const data=bytes.subarray(offset+8,offset+8+length);
    if(type===JSON_CHUNK)gltf=JSON.parse(new TextDecoder().decode(data).replace(/\0+$/,''));
    else if(type===BIN_CHUNK)binary=data;
    offset+=8+length;
  }
  if(!gltf||!binary)throw new RangeError('GLB must contain JSON and binary chunks');
  const preflight={vertices:0,faces:0,materials:0},referencedMaterials=new Set();
  for(const mesh of gltf.meshes||[])for(const primitive of mesh.primitives||[]){
    if((primitive.mode??4)!==4)continue;
    const positionCount=gltf.accessors[primitive.attributes.POSITION]?.count||0;
    const indexCount=primitive.indices===undefined?positionCount:gltf.accessors[primitive.indices]?.count||0;
    if(indexCount%3!==0)throw new RangeError('Triangle index accessor count must be divisible by three');
    preflight.vertices+=positionCount;preflight.faces+=indexCount/3;
    if(primitive.material!==undefined)referencedMaterials.add(primitive.material);
  }
  preflight.materials=referencedMaterials.size;
  if(options.budget!==false)validateModelBudget(preflight,options.budget||CLASSIC_MODEL_BUDGET);
  const materials=(gltf.materials||[]).map((material,index)=>{const pbr=material.pbrMetallicRoughness||{},factor=pbr.baseColorFactor||[.5,.5,.5,1],textureIndex=pbr.baseColorTexture?.index,source=textureIndex===undefined?undefined:gltf.textures?.[textureIndex]?.source;return{id:index,name:material.name||`material_${index}`,baseColor:factor.slice(),hsl:rgbToHsl(factor[0],factor[1],factor[2]),texture:source===undefined?null:`image_${source}`};});
  const skins=(gltf.skins||[]).map((skin,index)=>({name:skin.name||`skin_${index}`,joints:(skin.joints||[]).slice(),skeleton:skin.skeleton,inverseBindMatrices:skin.inverseBindMatrices===undefined?[]:readAccessor(gltf,binary,skin.inverseBindMatrices)}));
  const embeddedImages=(gltf.images||[]).map((image,index)=>{if(image.bufferView===undefined)return null;const view=gltf.bufferViews[image.bufferView],start=view.byteOffset||0;return{id:`image_${index}`,mimeType:image.mimeType||'image/png',bytes:binary.slice(start,start+view.byteLength)};}).filter(Boolean);
  const model={vertices:[],faces:[],materials,embeddedImages,textures:{},rig:{nodes:(gltf.nodes||[]).map(node=>({...node,children:node.children?.slice()})),skins,animations:(gltf.animations||[]).map(animation=>({name:animation.name||'animation',channels:animation.channels?.length||0,samplers:animation.samplers?.length||0}))}};
  for(const [meshIndex,mesh] of (gltf.meshes||[]).entries()){
    const meshNode=(gltf.nodes||[]).find(node=>node.mesh===meshIndex);
    const skin=meshNode?.skin===undefined?null:skins[meshNode.skin];
    for(const primitive of mesh.primitives||[]){
      if((primitive.mode??4)!==4)continue;
      const positions=readAccessor(gltf,binary,primitive.attributes.POSITION);
      const indices=primitive.indices===undefined?positions.map((_,index)=>index):readAccessor(gltf,binary,primitive.indices);
      const joints=primitive.attributes.JOINTS_0===undefined?null:readAccessor(gltf,binary,primitive.attributes.JOINTS_0);
      const weights=primitive.attributes.WEIGHTS_0===undefined?null:readAccessor(gltf,binary,primitive.attributes.WEIGHTS_0);
      const texcoords=primitive.attributes.TEXCOORD_0===undefined?null:readAccessor(gltf,binary,primitive.attributes.TEXCOORD_0);
      const base=model.vertices.length;
      positions.forEach((position,vertexIndex)=>{
        let label=options.label||'rigid';
        if(joints&&weights&&skin){let dominant=0;for(let influence=1;influence<weights[vertexIndex].length;influence+=1)if(weights[vertexIndex][influence]>weights[vertexIndex][dominant])dominant=influence;const jointNode=skin.joints[joints[vertexIndex][dominant]];label=gltf.nodes?.[jointNode]?.name||`joint_${jointNode}`;}
        model.vertices.push({x:position[0],y:position[1],z:position[2],label,joints:joints?.[vertexIndex]?.slice(),weights:weights?.[vertexIndex]?.slice(),uv:texcoords?.[vertexIndex]?.slice()});
      });
      const factor=gltf.materials?.[primitive.material]?.pbrMetallicRoughness?.baseColorFactor||[.5,.5,.5,1];
      const hsl=rgbToHsl(factor[0],factor[1],factor[2]);
      const texture=materials[primitive.material]?.texture;
      for(let index=0;index<indices.length;index+=3)model.faces.push({a:base+indices[index],b:base+indices[index+1],c:base+indices[index+2],material:primitive.material,hsl,mode:options.mode||'flat',texture,alpha:Math.round((factor[3]??1)*255),doubleSided:options.doubleSided??gltf.materials?.[primitive.material]?.doubleSided??false});
    }
  }
  return model;
}

async function decodeEmbeddedImage(image){
  const blob=new Blob([image.bytes],{type:image.mimeType});
  let source;
  if(typeof createImageBitmap==='function')source=await createImageBitmap(blob);
  else source=await new Promise((resolve,reject)=>{const element=new Image(),url=URL.createObjectURL(blob);element.onload=()=>{URL.revokeObjectURL(url);resolve(element);};element.onerror=reject;element.src=url;});
  const canvas=typeof OffscreenCanvas==='function'?new OffscreenCanvas(128,128):Object.assign(document.createElement('canvas'),{width:128,height:128});
  const context=canvas.getContext('2d',{willReadFrequently:true});
  context.imageSmoothingEnabled=false;context.clearRect(0,0,128,128);context.drawImage(source,0,0,128,128);
  if(typeof source.close==='function')source.close();
  const rgba=context.getImageData(0,0,128,128).data,texels=new Uint32Array(128*128);
  for(let index=0;index<texels.length;index+=1){const offset=index*4;texels[index]=rgba[offset+3]===0?0:((rgba[offset]<<16)|(rgba[offset+1]<<8)|rgba[offset+2])||1;}
  return prepareTexture128(texels);
}

export async function loadGlbModel(url,options){
  const response=await fetch(url);
  if(!response.ok)throw new Error(`Failed to load GLB ${url}: ${response.status}`);
  const model=parseGlbModel(await response.arrayBuffer(),options);
  await Promise.all(model.embeddedImages.map(async image=>{model.textures[image.id]=await decodeEmbeddedImage(image);}));
  if(!options?.mode)for(const face of model.faces)if(face.texture)face.mode='textured';
  return model;
}
