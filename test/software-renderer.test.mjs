import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import {
  DrawQueue,
  CLASSIC_MODEL_BUDGET,
  applyLabelPose,
  attachEquipment,
  buildHslPalette,
  clearSurface,
  createTexturePlane,
  createCamera,
  createSurface,
  drawTriangle,
  drawDemoOverlay,
  enqueueModel,
  hashSurface,
  packHsl,
  parseGlbModel,
  mapPointToTexturePlane,
  measureModel,
  isPreparedTexelOpaque,
  prepareTexture128,
  projectViewPoint,
  renderCommands,
  toFixed,
  validateModelBudget,
} from '../src/software-renderer/index.mjs';
import { buildDemoScene, prepareKayKitKnight } from '../demo/software-renderer/scene.mjs';

function buildRiggedGlb(){
  const binary=new ArrayBuffer(264),view=new DataView(binary);
  [0,0,0,1,0,0,0,1,0].forEach((value,index)=>view.setFloat32(index*4,value,true));
  [0,1,2].forEach((value,index)=>view.setUint16(36+index*2,value,true));
  new Uint8Array(binary,44,12).set([0,1,0,0,0,1,0,0,0,1,0,0]);
  [1,0,0,0,0,1,0,0,.2,.8,0,0].forEach((value,index)=>view.setFloat32(56+index*4,value,true));
  for(let matrix=0;matrix<2;matrix++) for(let diagonal=0;diagonal<4;diagonal++) view.setFloat32(104+matrix*64+diagonal*20,1,true);
  [0,1].forEach((value,index)=>view.setFloat32(232+index*4,value,true));
  [0,0,0,1,0,0].forEach((value,index)=>view.setFloat32(240+index*4,value,true));
  const json={asset:{version:'2.0'},buffers:[{byteLength:264}],bufferViews:[
    {buffer:0,byteOffset:0,byteLength:36},{buffer:0,byteOffset:36,byteLength:6},
    {buffer:0,byteOffset:44,byteLength:12},{buffer:0,byteOffset:56,byteLength:48},
    {buffer:0,byteOffset:104,byteLength:128},{buffer:0,byteOffset:232,byteLength:8},
    {buffer:0,byteOffset:240,byteLength:24}
  ],accessors:[
    {bufferView:0,componentType:5126,count:3,type:'VEC3'},
    {bufferView:1,componentType:5123,count:3,type:'SCALAR'},
    {bufferView:2,componentType:5121,count:3,type:'VEC4'},
    {bufferView:3,componentType:5126,count:3,type:'VEC4'},
    {bufferView:4,componentType:5126,count:2,type:'MAT4'},
    {bufferView:5,componentType:5126,count:2,type:'SCALAR'},
    {bufferView:6,componentType:5126,count:2,type:'VEC3'}
  ],materials:[{name:'cloth',pbrMetallicRoughness:{baseColorFactor:[.2,.4,.6,1]}}],
  meshes:[{primitives:[{attributes:{POSITION:0,JOINTS_0:2,WEIGHTS_0:3},indices:1,material:0}]}],
  nodes:[{name:'character',mesh:0,skin:0},{name:'root'},{name:'hand'}],
  skins:[{name:'humanoid',joints:[1,2],inverseBindMatrices:4}],
  animations:[{name:'wave',samplers:[{input:5,output:6}],channels:[{sampler:0,target:{node:2,path:'translation'}}]}],
  scenes:[{nodes:[0]}],scene:0};
  const encoded=new TextEncoder().encode(JSON.stringify(json)),jsonLength=(encoded.length+3)&~3;
  const glb=new ArrayBuffer(12+8+jsonLength+8+binary.byteLength),glbView=new DataView(glb);
  glbView.setUint32(0,0x46546c67,true);glbView.setUint32(4,2,true);glbView.setUint32(8,glb.byteLength,true);
  glbView.setUint32(12,jsonLength,true);glbView.setUint32(16,0x4e4f534a,true);
  const jsonBytes=new Uint8Array(glb,20,jsonLength);jsonBytes.fill(0x20);jsonBytes.set(encoded);
  const binaryHeader=20+jsonLength;glbView.setUint32(binaryHeader,binary.byteLength,true);glbView.setUint32(binaryHeader+4,0x004e4942,true);
  new Uint8Array(glb,binaryHeader+8).set(new Uint8Array(binary));
  return glb;
}

const palette = buildHslPalette(0.82);

test('16.16 conversion and HSL packing are stable', () => {
  assert.equal(toFixed(1.5), 98304);
  assert.equal(packHsl(63, 7, 127), 65535);
  assert.equal(palette.length, 65536);
  assert.equal(palette[packHsl(0, 0, 0)], 0);
});

test('flat scanline coverage is winding-independent and crack-free', () => {
  const render = (reverse = false) => {
    const surface = createSurface(8, 8);
    clearSurface(surface, 0);
    const triangles = [
      [{x:1,y:1},{x:5,y:1},{x:5,y:5}],
      [{x:1,y:1},{x:5,y:5},{x:1,y:5}],
    ];
    for (const vertices of triangles) drawTriangle(surface, {mode:'flat',color:0xffffff,vertices:reverse?vertices.slice().reverse():vertices}, palette);
    return surface;
  };
  const forward = render(false);
  const reverse = render(true);
  assert.deepEqual(forward.pixels, reverse.pixels);
  let whitePixels = 0;
  for (let offset=0;offset<forward.pixels.length;offset+=4) if (forward.pixels[offset]===255) whitePixels += 1;
  assert.equal(whitePixels, 16);
});

test('Gouraud mode changes only palette lightness across a face', () => {
  const surface = createSurface(16, 12);
  clearSurface(surface, 0);
  renderCommands(surface, [{
    mode:'gouraud',hueSaturation:44,
    vertices:[{x:1,y:1,light:8},{x:14,y:1,light:120},{x:7,y:10,light:64}],
  }], palette);
  const left=(3*surface.width+3)*4, right=(3*surface.width+11)*4;
  assert.notDeepEqual(surface.pixels.slice(left,left+3),surface.pixels.slice(right,right+3));
});

test('128 texture preparation creates exact four shade banks', () => {
  const source = new Uint32Array(128*128).fill(0xabcdef);
  const texture = prepareTexture128(source);
  const base = 0xabcdef & 0xf8f8ff;
  assert.equal(texture.banks[0], base);
  assert.equal(texture.banks[128*128], (base-(base>>>3))&0xf8f8ff);
  assert.equal(texture.banks[128*128*2], (base-(base>>>2))&0xf8f8ff);
  assert.equal(texture.banks[128*128*3], (base-(base>>>2)-(base>>>3))&0xf8f8ff);
});

test('texture opacity remains separate from quantized black shading', () => {
  const source=new Uint32Array(128*128);source[0]=0x000100;
  const texture=prepareTexture128(source);
  assert.equal(texture.banks[0],0);
  assert.equal(isPreparedTexelOpaque(texture,0,0),true);
  assert.equal(isPreparedTexelOpaque(texture,toFixed(1),0),false);
});

test('model-space texture plane maps points without conventional stored UVs', () => {
  const plane=createTexturePlane({x:0,y:0,z:0},{x:2,y:0,z:0},{x:0,y:0,z:4});
  assert.deepEqual(mapPointToTexturePlane({x:1,y:3,z:2},plane,128),{u:64,v:64});
});

test('licensed Kenney GLB assets convert into deterministic renderer models', () => {
  const expected={
    tree_oak:{vertices:648,faces:196,materials:['leafsGreen','woodBark']},
    rock_largeC:{vertices:264,faces:72,materials:['dirt','grass']},
    grass_large:{vertices:448,faces:224,materials:['grass']},
    log:{vertices:624,faces:200,materials:['woodBark','woodInner']},
    plant_bushDetailed:{vertices:232,faces:104,materials:['grass']}
  };
  for(const [name,want] of Object.entries(expected)){
    const bytes=readFileSync(new URL(`../assets/models/kenney-nature/${name}.glb`,import.meta.url));
    const buffer=bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength);
    const model=parseGlbModel(buffer);
    assert.deepEqual(validateModelBudget(model),{
      vertices:want.vertices,faces:want.faces,materials:want.materials.length
    },name);
    assert.deepEqual(model.materials.map(material=>material.name),want.materials,name);
    assert.ok(model.faces.every(face=>face.material>=0&&face.material<want.materials.length),name);
  }
});

test('model budgets reject oversized assets before runtime rendering', () => {
  assert.deepEqual(validateModelBudget({vertices:2048,faces:2048,materials:8}),CLASSIC_MODEL_BUDGET);
  assert.throws(()=>validateModelBudget({vertices:2049,faces:0,materials:0}),/vertices budget/);
  assert.throws(()=>validateModelBudget({vertices:0,faces:2049,materials:0}),/faces budget/);
  assert.throws(()=>validateModelBudget({vertices:0,faces:0,materials:9}),/materials budget/);
});

test('rigged GLB import preserves skin, animation, material, and dominant-joint labels', () => {
  const glb=buildRiggedGlb();
  const model=parseGlbModel(glb);
  assert.deepEqual(model.vertices.map(vertex=>vertex.label),['root','hand','hand']);
  assert.equal(model.materials[0].name,'cloth');
  assert.deepEqual(model.materials[0].baseColor,[.2,.4,.6,1]);
  assert.equal(model.faces[0].material,0);
  assert.deepEqual(model.rig.skins[0].joints,[1,2]);
  assert.equal(model.rig.skins[0].inverseBindMatrices.length,2);
  assert.equal(model.rig.animations[0].name,'wave');
  assert.equal(model.rig.animations[0].channels,1);
  assert.throws(()=>parseGlbModel(glb,{budget:{vertices:2,faces:1,materials:1}}),/vertices budget/);
});

test('equipment attachment preserves the base joint pivot and follows its label pose', () => {
  const base={vertices:[{x:0,y:0,z:0,label:'body'},{x:2,y:0,z:0,label:'arm'}],faces:[],textures:{image_0:'body'}};
  const equipment={vertices:[{x:0,y:0,z:0,label:'rigid'}],faces:[{a:0,b:0,c:0,texture:'image_0'}],textures:{image_0:'blade'}};
  const equipped=attachEquipment(base,equipment,{name:'sword',label:'arm',translate:{x:3,y:0,z:0}});
  assert.equal(base.vertices.length,2);
  assert.deepEqual(equipped.labelPivots.arm,{x:2,y:0,z:0});
  assert.deepEqual(equipped.textures,{image_0:'body','sword:image_0':'blade'});
  assert.equal(equipped.faces[0].texture,'sword:image_0');
  const posed=applyLabelPose(equipped,{arm:{label:'arm',rotateZ:Math.PI/2}});
  assert.ok(Math.abs(posed.vertices[1].x-2)<1e-9);
  assert.ok(Math.abs(posed.vertices[2].y-1)<1e-9);
});

test('camera projection and near clipping produce finite draw commands', () => {
  const camera=createCamera({centerX:50,centerY:40,focalLength:100,near:10});
  assert.deepEqual(projectViewPoint({x:0,y:0,z:100},camera),{x:50,y:40,z:100});
  const queue=new DrawQueue();
  const model={vertices:[{x:-10,y:0,z:5},{x:10,y:0,z:30},{x:0,y:20,z:30}],faces:[{a:0,b:1,c:2,hsl:packHsl(10,4,60),mode:'flat',doubleSided:true}]};
  assert.equal(enqueueModel(queue,model,{camera,palette}),2);
  assert.equal(queue.ordered().length,2);
});

test('faces crossing the far plane are clipped instead of discarded', () => {
  const camera=createCamera({near:1,far:100});
  const queue=new DrawQueue();
  const model={vertices:[{x:-10,y:0,z:20},{x:10,y:0,z:20},{x:0,y:20,z:180}],faces:[{a:0,b:1,c:2,hsl:packHsl(10,4,60),mode:'flat',doubleSided:true}]};
  assert.equal(enqueueModel(queue,model,{camera,palette}),2);
});

test('procedural overlays composite deterministically over the software surface', () => {
  const surface=createSurface(320,200);clearSurface(surface,0);
  drawDemoOverlay(surface,0);
  assert.equal(hashSurface(surface),'2c2d3e77');
});

test('label poses move only vertices assigned to the transformed group', () => {
  const model={vertices:[{x:0,y:0,z:0,label:'body'},{x:1,y:0,z:0,label:'arm'}],faces:[]};
  const posed=applyLabelPose(model,{arm:{label:'arm',translate:{x:0,y:2,z:0}}});
  assert.deepEqual(posed.vertices[0],model.vertices[0]);
  assert.equal(posed.vertices[1].y,2);
});

test('depth buckets and explicit priorities produce deterministic ordering', () => {
  const queue = new DrawQueue(32,8);
  queue.add({id:'near',depth:4,priority:0});
  queue.add({id:'far',depth:20,priority:0});
  queue.add({id:'special',depth:24,priority:10});
  const first = queue.ordered().map(command=>command.id);
  const second = queue.ordered().map(command=>command.id);
  assert.deepEqual(first,second);
  assert.equal(first[0],'special');
  assert.ok(first.indexOf('far')<first.indexOf('near'));
});

test('demo frame has deterministic raw pixel output', () => {
  const render = () => {
    const surface=createSurface(320,200);
    clearSurface(surface,0x0d1218);
    renderCommands(surface,buildDemoScene(0,palette),palette);
    return hashSurface(surface);
  };
  assert.equal(render(),'23af56e3');
});

test('licensed scenery, character, equipment, and overlays have a stable integrated frame hash', () => {
  const load=(name)=>{const bytes=readFileSync(new URL(`../assets/models/kenney-nature/${name}.glb`,import.meta.url));return parseGlbModel(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength),{doubleSided:true});};
  const loadPath=(path)=>{const bytes=readFileSync(new URL(path,import.meta.url));return parseGlbModel(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength));};
  const knight=loadPath('../assets/models/kaykit-adventurers/knight-classic.glb');
  const sword=loadPath('../assets/models/kaykit-fantasy-weapons/sword-a.glb');
  assert.equal(knight.embeddedImages.length,1);
  assert.equal(knight.vertices.every(vertex=>vertex.uv?.length===2),true);
  assert.equal(knight.faces.every(face=>face.texture==='image_0'),true);
  const equipped=prepareKayKitKnight(knight,sword);
  assert.deepEqual(validateModelBudget(equipped),{vertices:2010,faces:1337,materials:2});
  const assets={tree:load('tree_oak'),rock:load('rock_largeC'),bush:load('plant_bushDetailed'),log:load('log'),knight:equipped};
  const surface=createSurface(320,200);clearSurface(surface,0x0d1218);
  renderCommands(surface,buildDemoScene(0,palette,assets),palette);drawDemoOverlay(surface,0);
  assert.equal(hashSurface(surface),'1137371c');
});
