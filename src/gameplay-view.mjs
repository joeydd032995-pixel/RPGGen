import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { clone as cloneSkeleton } from 'three/examples/jsm/utils/SkeletonUtils.js';

const WORLD_SCALE=.55;
const LEGACY_ASSET_URLS={
  hero:new URL('../assets/character.png',import.meta.url).href,
  isoTiles:new URL('../assets/iso-tiles.png',import.meta.url).href,
};

const ASSET_URLS={
  knight:new URL('../assets/models/kaykit-adventurers/knight-classic.glb',import.meta.url),
  sword:new URL('../assets/models/kaykit-fantasy-weapons/sword-a.glb',import.meta.url),
  mage:new URL('../assets/models/kaykit-adventurers/mage-classic.glb',import.meta.url),
  rogue:new URL('../assets/models/kaykit-adventurers/rogue-classic.glb',import.meta.url),
  barbarian:new URL('../assets/models/kaykit-adventurers/barbarian-classic.glb',import.meta.url),
  tree:new URL('../assets/models/kenney-nature/tree_oak.glb',import.meta.url),
  rock:new URL('../assets/models/kenney-nature/rock_largeC.glb',import.meta.url),
  bush:new URL('../assets/models/kenney-nature/plant_bushDetailed.glb',import.meta.url),
};

function material(color,options={}){
  return new THREE.MeshStandardMaterial({color,roughness:options.roughness??.72,metalness:options.metalness??.04,emissive:options.emissive??0,emissiveIntensity:options.emissiveIntensity??0});
}

function mesh(geometry,meshMaterial,castShadow=true){
  const value=new THREE.Mesh(geometry,meshMaterial);
  value.castShadow=castShadow;value.receiveShadow=true;
  return value;
}

function addBox(group,size,position,meshMaterial){
  const value=mesh(new THREE.BoxGeometry(...size),meshMaterial);
  value.position.set(...position);group.add(value);return value;
}

function prepareTemplate(scene,targetHeight){
  const root=scene;
  root.traverse(child=>{
    if(!child.isMesh)return;
    child.castShadow=true;child.receiveShadow=true;
    const source=Array.isArray(child.material)?child.material:[child.material];
    const prepared=source.map(entry=>{
      const value=entry.clone();
      if(value.map){value.map.colorSpace=THREE.SRGBColorSpace;value.map.anisotropy=8;}
      value.roughness=Math.max(.48,value.roughness??.72);value.metalness=Math.min(.18,value.metalness??0);
      return value;
    });
    child.material=Array.isArray(child.material)?prepared:prepared[0];
  });
  const initial=new THREE.Box3().setFromObject(root),size=initial.getSize(new THREE.Vector3());
  const scale=targetHeight/Math.max(.001,size.y);root.scale.setScalar(scale);root.updateMatrixWorld(true);
  const bounds=new THREE.Box3().setFromObject(root),center=bounds.getCenter(new THREE.Vector3());
  root.position.x-=center.x;root.position.z-=center.z;root.position.y-=bounds.min.y;
  return root;
}

function cloneTemplate(template){
  const root=cloneSkeleton(template);root.traverse(child=>{if(child.isMesh){child.castShadow=true;child.receiveShadow=true;}});return root;
}

function makeHouse(){
  const group=new THREE.Group(),plaster=material(0xc8aa6e,{roughness:.92}),timber=material(0x4a2715,{roughness:.84}),roof=material(0x713019,{roughness:.8}),stone=material(0x77756d,{roughness:1}),glass=material(0xffc76a,{emissive:0xff8a24,emissiveIntensity:2.2,roughness:.25});
  addBox(group,[34,23,29],[0,11.5,0],plaster);
  const roofMesh=mesh(new THREE.ConeGeometry(27,18,4),roof);roofMesh.position.y=31;roofMesh.rotation.y=Math.PI/4;roofMesh.scale.z=.78;group.add(roofMesh);
  addBox(group,[4,19,2.2],[0,9.5,15.4],timber);addBox(group,[31,3,2.2],[0,19,15.4],timber);
  addBox(group,[3,22,2.2],[-14,11,15.4],timber);addBox(group,[3,22,2.2],[14,11,15.4],timber);
  addBox(group,[8,14,2.5],[-7,7,15.6],material(0x382014,{roughness:.9}));
  addBox(group,[5,5,2.6],[8,11,15.7],glass);
  addBox(group,[6,16,6],[9,35,-6],stone);
  const doorstep=addBox(group,[11,2,6],[-7,1,19],stone);doorstep.castShadow=false;
  return group;
}

function makeFence(){
  const group=new THREE.Group(),wood=material(0x6a4528,{roughness:.9});
  addBox(group,[2.4,10,2.4],[-7,5,0],wood);addBox(group,[2.4,10,2.4],[7,5,0],wood);
  addBox(group,[17,2,2],[0,6,0],wood);addBox(group,[17,2,2],[0,2.8,0],wood);return group;
}

function makeDragon(){
  const group=new THREE.Group(),scales=material(0x7d2623,{roughness:.58,metalness:.08}),belly=material(0xd28b42,{roughness:.72}),horn=material(0xe0d1aa,{roughness:.65}),wing=material(0x4e171a,{roughness:.68});
  const body=mesh(new THREE.SphereGeometry(12,10,7),scales);body.scale.set(1,1.1,1.65);body.position.y=15;group.add(body);
  const head=mesh(new THREE.SphereGeometry(8,9,7),scales);head.position.set(0,22,-20);group.add(head);
  addBox(group,[9,8,7],[0,18,-26],belly);
  for(const x of [-7,7]){const leg=mesh(new THREE.CylinderGeometry(2.5,3.2,13,7),scales);leg.position.set(x,6,x>0?5:-3);group.add(leg);const spike=mesh(new THREE.ConeGeometry(1.5,8,6),horn);spike.position.set(x,31,-21);spike.rotation.x=-.35;group.add(spike);}
  const wingGeometry=new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0,23,0),new THREE.Vector3(-27,36,7),new THREE.Vector3(-20,17,14)]);wingGeometry.setIndex([0,1,2]);wingGeometry.computeVertexNormals();
  const left=mesh(wingGeometry,wing);group.add(left);const right=left.clone();right.scale.x=-1;group.add(right);
  const tail=mesh(new THREE.ConeGeometry(5,32,7),scales);tail.rotation.x=Math.PI/2;tail.position.set(0,14,25);group.add(tail);return group;
}

function makeQuestMarker(){
  const group=new THREE.Group(),gold=material(0xffb829,{emissive:0xff8b00,emissiveIntensity:3,roughness:.3,metalness:.2});
  const gem=mesh(new THREE.OctahedronGeometry(3.8,0),gold,false);gem.position.y=39;group.add(gem);
  const ring=mesh(new THREE.TorusGeometry(5.5,.45,8,24),gold,false);ring.position.y=39;ring.rotation.x=Math.PI/2;group.add(ring);group.userData.gem=gem;group.userData.ring=ring;return group;
}

function makeHealthBar(){
  const group=new THREE.Group(),track=mesh(new THREE.PlaneGeometry(18,2.2),new THREE.MeshBasicMaterial({color:0x251313,depthTest:false}),false),fill=mesh(new THREE.PlaneGeometry(17,1.25),new THREE.MeshBasicMaterial({color:0xe84b3d,depthTest:false}),false);
  track.renderOrder=20;fill.position.z=.05;fill.renderOrder=21;group.add(track,fill);group.userData.fill=fill;return group;
}

function skyTexture(){
  const canvas=document.createElement('canvas');canvas.width=16;canvas.height=512;const context=canvas.getContext('2d'),gradient=context.createLinearGradient(0,0,0,512);
  gradient.addColorStop(0,'#6fa7cf');gradient.addColorStop(.5,'#a9c6d4');gradient.addColorStop(1,'#d9c79d');context.fillStyle=gradient;context.fillRect(0,0,16,512);
  const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;return texture;
}

let terrainTextureCache;
function terrainDetailTexture(){
  if(terrainTextureCache)return terrainTextureCache;
  const canvas=document.createElement('canvas');canvas.width=128;canvas.height=128;const context=canvas.getContext('2d');context.fillStyle='#c8c8c8';context.fillRect(0,0,128,128);
  for(let index=0;index<1800;index++){const value=(index*1103515245+12345)>>>0,x=value&127,y=(value>>>8)&127,shade=174+(value>>>16)%64,size=1+(value>>>24)%2;context.fillStyle=`rgb(${shade},${shade},${shade})`;context.fillRect(x,y,size,size);}
  terrainTextureCache=new THREE.CanvasTexture(canvas);terrainTextureCache.colorSpace=THREE.SRGBColorSpace;terrainTextureCache.wrapS=THREE.RepeatWrapping;terrainTextureCache.wrapT=THREE.RepeatWrapping;terrainTextureCache.anisotropy=8;return terrainTextureCache;
}

function buildTerrain(snapshot){
  const {columns,rows,cells}=snapshot.terrain,spacing=snapshot.terrain.spacing*WORLD_SCALE,positions=[],colors=[],uvs=[],indices=[];
  const color=new THREE.Color();
  for(let row=0;row<rows;row++)for(let column=0;column<columns;column++){
    const sample=cells[row*columns+column],x=(column-(columns-1)/2)*spacing,z=-(row-(rows-1)/2)*spacing,y=sample.path?.04:0,base=positions.length/3;
    positions.push(x-spacing/2,y,z-spacing/2,x+spacing/2,y,z-spacing/2,x+spacing/2,y,z+spacing/2,x-spacing/2,y,z+spacing/2);
    uvs.push(column/3,row/3,(column+1)/3,row/3,(column+1)/3,(row+1)/3,column/3,(row+1)/3);
    color.set(sample.path?'#a8874e':sample.color||'#506c42');color.offsetHSL(((row*13+column*7)%9-4)/800,0,((row*3+column*5)%7-3)/300);
    for(let vertex=0;vertex<4;vertex++)colors.push(color.r,color.g,color.b);
    if((row+column)&1)indices.push(base,base+3,base+1,base+1,base+3,base+2);else indices.push(base,base+2,base+1,base,base+3,base+2);
  }
  const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));geometry.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));geometry.setAttribute('uv',new THREE.Float32BufferAttribute(uvs,2));geometry.setIndex(indices);geometry.computeVertexNormals();
  const terrain=mesh(geometry,new THREE.MeshStandardMaterial({vertexColors:true,map:terrainDetailTexture(),roughness:.9,metalness:0}),false);terrain.receiveShadow=true;return terrain;
}

function removeChildren(group){while(group.children.length){const child=group.children.pop();child.parent=null;}}

export class GameplayView{
  constructor(canvas){
    this.canvas=canvas;this.ready=false;this.lastRender=0;this.lastFrameMs=0;this.terrainKey='';this.propsKey='';this.npcsKey='';this.enemiesKey='';this.loader=new GLTFLoader();
    this.renderer=new THREE.WebGLRenderer({canvas,antialias:true,alpha:false,powerPreference:'high-performance'});
    this.renderer.outputColorSpace=THREE.SRGBColorSpace;this.renderer.toneMapping=THREE.ACESFilmicToneMapping;this.renderer.toneMappingExposure=1;this.renderer.shadowMap.enabled=true;this.renderer.shadowMap.type=THREE.PCFSoftShadowMap;this.renderer.shadowMap.autoUpdate=false;this.shadowFrame=0;
    this.scene=new THREE.Scene();this.scene.background=skyTexture();this.scene.fog=new THREE.FogExp2(0x9db6b5,.0022);
    this.camera=new THREE.PerspectiveCamera(43,1,.1,1400);this.scene.add(this.camera);
    const hemisphere=new THREE.HemisphereLight(0xc9e7ff,0x344125,1.55);this.scene.add(hemisphere);
    this.sun=new THREE.DirectionalLight(0xffe1b0,3.25);this.sun.position.set(-130,190,110);this.sun.castShadow=true;this.sun.shadow.mapSize.set(2048,2048);this.sun.shadow.camera.left=-180;this.sun.shadow.camera.right=180;this.sun.shadow.camera.top=180;this.sun.shadow.camera.bottom=-180;this.sun.shadow.camera.near=20;this.sun.shadow.camera.far=500;this.sun.shadow.bias=-.0005;this.scene.add(this.sun,this.sun.target);
    const rim=new THREE.DirectionalLight(0x7daeff,.72);rim.position.set(120,70,-180);this.scene.add(rim);
    this.terrainGroup=new THREE.Group();this.buildingGroup=new THREE.Group();this.propGroup=new THREE.Group();this.npcGroup=new THREE.Group();this.enemyGroup=new THREE.Group();this.playerRoot=new THREE.Group();
    this.scene.add(this.terrainGroup,this.buildingGroup,this.propGroup,this.npcGroup,this.enemyGroup,this.playerRoot);
    this.resizeObserver=new ResizeObserver(()=>this.resize());this.resizeObserver.observe(canvas);this.resize();this.loadAssets();
  }

  resize(){
    const rect=this.canvas.getBoundingClientRect();if(rect.width<1||rect.height<1)return;
    const portrait=rect.height>rect.width*1.2,pixelRatio=Math.min(devicePixelRatio||1,portrait?1.25:2);this.portrait=portrait;
    this.renderer.setPixelRatio(pixelRatio);this.renderer.setSize(Math.round(rect.width),Math.round(rect.height),false);this.sun.shadow.mapSize.set(portrait?1024:2048,portrait?1024:2048);this.camera.aspect=rect.width/rect.height;this.camera.fov=portrait?48:40;this.camera.position.set(0,portrait?145:82,portrait?300:140);this.camera.lookAt(0,portrait?10:10,portrait?-35:-45);this.camera.updateProjectionMatrix();this.shadowFrame=0;
  }

  async loadAssets(){
    try{
      const entries=await Promise.all(Object.entries(ASSET_URLS).map(async([name,url])=>[name,(await this.loader.loadAsync(url.href)).scene]));this.assets=Object.fromEntries(entries);
      this.templates={
        knight:prepareTemplate(this.assets.knight,31),mage:prepareTemplate(this.assets.mage,29),rogue:prepareTemplate(this.assets.rogue,29),barbarian:prepareTemplate(this.assets.barbarian,30),
        sword:prepareTemplate(this.assets.sword,13),tree:prepareTemplate(this.assets.tree,38),rock:prepareTemplate(this.assets.rock,10),bush:prepareTemplate(this.assets.bush,13),
      };
      this.playerRoot.add(cloneTemplate(this.templates.knight));const sword=cloneTemplate(this.templates.sword);sword.position.set(5.5,11,1);sword.rotation.set(0,0,-.42);this.playerRoot.add(sword);
      this.houseTemplate=makeHouse();this.fenceTemplate=makeFence();this.dragonTemplate=makeDragon();this.markerTemplate=makeQuestMarker();
      this.ready=true;document.documentElement.classList.add('software-world-ready','gpu-world-ready');
    }catch(error){console.error('Production GPU assets failed to load',error);}
  }

  wantsFrame(time=performance.now()){return this.ready&&time-this.lastRender>=33;}

  worldPosition(entity,player,target){return target.set((entity.x-player.x)*WORLD_SCALE,entity.elevation||0,-(entity.y-player.y)*WORLD_SCALE);}

  syncTerrain(snapshot){
    if(snapshot.terrain.key===this.terrainKey)return;this.terrainKey=snapshot.terrain.key;removeChildren(this.terrainGroup);this.terrainGroup.add(buildTerrain(snapshot));this.shadowFrame=0;
  }

  syncBuildings(snapshot){
    if(this.buildingGroup.children.length!==snapshot.buildings.length){removeChildren(this.buildingGroup);snapshot.buildings.forEach(()=>{const group=new THREE.Group();group.add(this.houseTemplate.clone(true));for(let index=-1;index<=1;index++){const fence=this.fenceTemplate.clone(true);fence.position.set(index*15,0,24);group.add(fence);}this.buildingGroup.add(group);});}
    snapshot.buildings.forEach((building,index)=>{const group=this.buildingGroup.children[index];this.worldPosition(building,snapshot.player,group.position);group.rotation.y=-(building.rotationY||0);});
  }

  syncProps(snapshot){
    const props=snapshot.props.slice(0,28),key=props.map(prop=>`${prop.kind}:${Math.round(prop.x)}:${Math.round(prop.y)}`).join('|');
    if(key!==this.propsKey){this.propsKey=key;removeChildren(this.propGroup);for(const prop of props){const template=prop.kind==='rock'?this.templates.rock:prop.kind==='bush'?this.templates.bush:this.templates.tree;this.propGroup.add(cloneTemplate(template));}}
    props.forEach((prop,index)=>{const root=this.propGroup.children[index];this.worldPosition(prop,snapshot.player,root.position);root.rotation.y=prop.rotation||0;});
  }

  syncNpcs(snapshot,time){
    const npcs=snapshot.npcs.slice(0,8),key=npcs.map((npc,index)=>`${index}:${npc.color}:${npc.quest}`).join('|');
    if(key!==this.npcsKey){this.npcsKey=key;removeChildren(this.npcGroup);npcs.forEach((npc,index)=>{const root=new THREE.Group(),templates=[this.templates.mage,this.templates.rogue,this.templates.barbarian];root.add(cloneTemplate(templates[index%templates.length]));if(npc.quest){const marker=this.markerTemplate.clone(true);marker.scale.setScalar(.68);root.add(marker);}this.npcGroup.add(root);});}
    npcs.forEach((npc,index)=>{const root=this.npcGroup.children[index],dx=npc.x-snapshot.player.x,dy=npc.y-snapshot.player.y;root.visible=dy>-20&&!(Math.hypot(dx,dy)<55||(Math.abs(dx)<38&&Math.abs(dy)<120));this.worldPosition(npc,snapshot.player,root.position);root.rotation.y=-(npc.rotationY||0);root.position.y+=Math.sin(time*.002+index)*.12;const marker=root.children.find(child=>child.userData?.gem);if(marker){marker.rotation.y=time*.0025;marker.position.y=Math.sin(time*.004+index)*.8;}});
  }

  syncEnemies(snapshot,time){
    const enemies=snapshot.enemies.slice(0,4),key=String(enemies.length);
    if(key!==this.enemiesKey){this.enemiesKey=key;removeChildren(this.enemyGroup);enemies.forEach(()=>{const root=new THREE.Group(),dragon=this.dragonTemplate.clone(true),bar=makeHealthBar();bar.position.y=42;root.add(dragon,bar);this.enemyGroup.add(root);});}
    enemies.forEach((enemy,index)=>{const root=this.enemyGroup.children[index],bar=root.children[1];this.worldPosition(enemy,snapshot.player,root.position);root.rotation.y=-(enemy.rotationY||0);root.position.y=Math.sin(time*.003+index)*.8;bar.quaternion.copy(this.camera.quaternion);bar.userData.fill.scale.x=Math.max(.001,enemy.hp/Math.max(1,enemy.maxHp));bar.userData.fill.position.x=-8.5*(1-bar.userData.fill.scale.x);});
  }

  render(snapshot,time=performance.now()){
    if(!this.wantsFrame(time))return;this.lastRender=time;const started=performance.now();this.syncTerrain(snapshot);this.syncBuildings(snapshot);this.syncProps(snapshot);this.syncNpcs(snapshot,time);this.syncEnemies(snapshot,time);
    const playerScale=this.portrait?1.45:1;this.playerRoot.scale.setScalar(playerScale);this.playerRoot.position.set(0,snapshot.player.moving?Math.abs(Math.sin(time*.012))*.65:Math.sin(time*.002)*.12,0);this.playerRoot.rotation.y=-(snapshot.player.facing||0)*Math.PI/4+Math.PI;
    this.sun.target.position.set(0,0,-40);this.shadowFrame+=1;this.renderer.shadowMap.needsUpdate=this.shadowFrame%60===1;this.renderer.render(this.scene,this.camera);this.lastFrameMs=performance.now()-started;
  }
}

if(typeof window!=='undefined'){
  window.__promptRealmAssetUrls=LEGACY_ASSET_URLS;const canvas=document.querySelector('#software-game-view');if(canvas)window.__promptRealmSoftwareView=new GameplayView(canvas);
}
