import {
  DrawQueue,
  applyLabelPose,
  attachEquipment,
  buildHslPalette,
  clearSurface,
  createSurface,
  drawBar,
  enqueueModel,
  loadGlbModel,
  packHsl,
  presentSurface,
  projectViewPoint,
  renderCommands,
  transformToView,
} from './software-renderer/index.mjs';

const WORLD_SCALE=.68,PLAYER_Z=138;
const LIGHTING={ambient:72,intensity:55,direction:{x:-.48,y:.82,z:-.3}};
const LEGACY_ASSET_URLS={hero:new URL('../assets/character.png',import.meta.url).href,isoTiles:new URL('../assets/iso-tiles.png',import.meta.url).href};

function emptyModel(){return{vertices:[],faces:[]};}

function addBox(model,{x=0,y=0,z=0,width,height,depth,hsl,label='rigid'}){
  const base=model.vertices.length,w=width/2,d=depth/2;
  model.vertices.push(
    {x:x-w,y,z:z-d,label},{x:x+w,y,z:z-d,label},{x:x+w,y:y+height,z:z-d,label},{x:x-w,y:y+height,z:z-d,label},
    {x:x-w,y,z:z+d,label},{x:x+w,y,z:z+d,label},{x:x+w,y:y+height,z:z+d,label},{x:x-w,y:y+height,z:z+d,label},
  );
  [[0,2,1],[0,3,2],[5,6,4],[6,7,4],[4,3,0],[4,7,3],[1,2,5],[2,6,5],[3,7,2],[2,7,6],[4,0,5],[5,0,1]].forEach((face,index)=>model.faces.push({a:base+face[0],b:base+face[1],c:base+face[2],hsl:(hsl+(index%3-1)*2)&0xffff,mode:'flat',doubleSided:true}));
}

function rgbHsl(hex,offset=0){
  const value=parseInt(String(hex||'#637d43').replace('#',''),16),r=((value>>16)&255)/255,g=((value>>8)&255)/255,b=(value&255)/255,max=Math.max(r,g,b),min=Math.min(r,g,b),l=(max+min)/2,d=max-min;
  let h=0,s=0;
  if(d){s=d/(1-Math.abs(2*l-1));if(max===r)h=((g-b)/d)%6;else if(max===g)h=(b-r)/d+2;else h=(r-g)/d+4;h=(h*60+360)%360;}
  return packHsl(Math.round(h/360*63),Math.round(s*7),Math.max(3,Math.min(124,Math.round(l*127)+offset)));
}

function makeVillager(color='#7d8951',variant=0){
  const model=emptyModel(),cloth=rgbHsl(color,-8),clothDark=rgbHsl(color,-24),skin=packHsl(6,4,76),leather=packHsl(5,5,34),hair=packHsl((variant*5+3)%12,5,25+variant%3*5);
  addBox(model,{x:-4.5,y:0,width:7,height:24,depth:8,hsl:clothDark,label:'leftLeg'});
  addBox(model,{x:4.5,y:0,width:7,height:24,depth:8,hsl:clothDark,label:'rightLeg'});
  addBox(model,{x:-4.5,y:0,z:-1,width:8,height:5,depth:12,hsl:leather,label:'leftLeg'});
  addBox(model,{x:4.5,y:0,z:-1,width:8,height:5,depth:12,hsl:leather,label:'rightLeg'});
  addBox(model,{y:23,width:22,height:28,depth:13,hsl:cloth,label:'torso'});
  addBox(model,{y:51,width:15,height:16,depth:15,hsl:skin,label:'head'});
  addBox(model,{y:63,z:1,width:16,height:5,depth:16,hsl:hair,label:'head'});
  addBox(model,{x:-14.5,y:27,width:6,height:24,depth:7,hsl:skin,label:'leftArm'});
  addBox(model,{x:14.5,y:27,width:6,height:24,depth:7,hsl:skin,label:'rightArm'});
  if(variant%2)addBox(model,{y:35,z:8,width:18,height:16,depth:4,hsl:leather,label:'torso'});
  return model;
}

function makeDragon(){
  const model=emptyModel(),scale=packHsl(17,7,43),dark=packHsl(18,7,27),horn=packHsl(8,2,82),wing=packHsl(16,6,35);
  addBox(model,{y:18,z:0,width:34,height:25,depth:54,hsl:scale});
  addBox(model,{y:27,z:-38,width:25,height:19,depth:25,hsl:scale});
  addBox(model,{x:-11,y:0,z:6,width:8,height:23,depth:11,hsl:dark});addBox(model,{x:11,y:0,z:6,width:8,height:23,depth:11,hsl:dark});
  addBox(model,{x:-12,y:2,z:-24,width:7,height:20,depth:10,hsl:dark});addBox(model,{x:12,y:2,z:-24,width:7,height:20,depth:10,hsl:dark});
  addBox(model,{y:23,z:39,width:16,height:13,depth:34,hsl:dark});addBox(model,{y:21,z:62,width:9,height:9,depth:25,hsl:dark});
  const base=model.vertices.length;
  model.vertices.push(
    {x:-13,y:39,z:-5,label:'wing.l'},{x:-66,y:70,z:8,label:'wing.l'},{x:-48,y:31,z:36,label:'wing.l'},{x:-16,y:31,z:29,label:'wing.l'},
    {x:13,y:39,z:-5,label:'wing.r'},{x:66,y:70,z:8,label:'wing.r'},{x:48,y:31,z:36,label:'wing.r'},{x:16,y:31,z:29,label:'wing.r'},
  );
  model.faces.push({a:base,b:base+1,c:base+2,hsl:wing,mode:'flat',doubleSided:true},{a:base,b:base+2,c:base+3,hsl:wing-3,mode:'flat',doubleSided:true},{a:base+4,b:base+6,c:base+5,hsl:wing,mode:'flat',doubleSided:true},{a:base+4,b:base+7,c:base+6,hsl:wing-3,mode:'flat',doubleSided:true});
  addBox(model,{x:-7,y:43,z:-43,width:4,height:15,depth:4,hsl:horn});addBox(model,{x:7,y:43,z:-43,width:4,height:15,depth:4,hsl:horn});
  return model;
}

function makeShadow(){
  const model=emptyModel(),segments=10;model.vertices.push({x:0,y:.35,z:0,label:'shadow'});
  for(let i=0;i<segments;i++){const a=i/segments*Math.PI*2;model.vertices.push({x:Math.cos(a)*14,y:.35,z:Math.sin(a)*6,label:'shadow'});}
  for(let i=0;i<segments;i++)model.faces.push({a:0,b:i+1,c:(i+1)%segments+1,hsl:packHsl(0,0,7),mode:'flat',alpha:95,doubleSided:true,priority:1});
  return model;
}

function makeMarker(){
  const model=emptyModel(),gold=packHsl(8,6,78);model.vertices.push({x:0,y:22,z:0,label:'marker'},{x:-8,y:11,z:0,label:'marker'},{x:8,y:11,z:0,label:'marker'},{x:0,y:0,z:0,label:'marker'});
  model.faces.push({a:0,b:1,c:2,hsl:gold,mode:'flat',doubleSided:true,priority:10},{a:1,b:3,c:2,hsl:gold,mode:'flat',doubleSided:true,priority:10});return model;
}

function makeHut(){
  const model=emptyModel(),plaster=packHsl(8,3,70),timber=packHsl(5,6,31),roof=packHsl(3,6,38),door=packHsl(5,5,24);
  addBox(model,{y:0,width:48,height:32,depth:42,hsl:plaster});addBox(model,{y:0,z:-21.5,width:13,height:23,depth:3,hsl:door});
  addBox(model,{x:-20,y:0,z:-22,width:4,height:34,depth:3,hsl:timber});addBox(model,{x:20,y:0,z:-22,width:4,height:34,depth:3,hsl:timber});addBox(model,{y:29,z:-22,width:44,height:4,depth:3,hsl:timber});
  const base=model.vertices.length,w=29,d=25,h=32,ridge=51;
  model.vertices.push({x:-w,y:h,z:-d,label:'roof'},{x:w,y:h,z:-d,label:'roof'},{x:-w,y:h,z:d,label:'roof'},{x:w,y:h,z:d,label:'roof'},{x:0,y:ridge,z:-d,label:'roof'},{x:0,y:ridge,z:d,label:'roof'});
  [[0,4,2],[4,5,2],[1,3,4],[4,3,5],[0,1,4],[2,5,3]].forEach((f,i)=>model.faces.push({a:base+f[0],b:base+f[1],c:base+f[2],hsl:roof-(i%2)*3,mode:'flat',doubleSided:true}));
  return model;
}

function makeFence(){const model=emptyModel(),wood=packHsl(5,5,38);addBox(model,{x:-12,y:0,width:4,height:15,depth:4,hsl:wood});addBox(model,{x:12,y:0,width:4,height:15,depth:4,hsl:wood});addBox(model,{y:6,width:28,height:4,depth:3,hsl:wood});return model;}

function buildTerrain(snapshot){
  const model=emptyModel(),{columns,rows,cells}=snapshot.terrain,spacing=snapshot.terrain.spacing*WORLD_SCALE;
  for(let row=0;row<rows;row++)for(let column=0;column<columns;column++){const sample=cells[row*columns+column];model.vertices.push({x:(column-(columns-1)/2)*spacing,y:sample.height,z:PLAYER_Z+(row-(rows-1)/2)*spacing,label:'terrain'});}
  for(let row=0;row<rows-1;row++)for(let column=0;column<columns-1;column++){
    const a=row*columns+column,b=a+1,c=a+columns,d=c+1,sample=cells[a],base=rgbHsl(sample.path?'#9b8255':sample.color,(row*3+column)%5-2);
    if((row+column)&1)model.faces.push({a,b:c,c:b,hsl:base,mode:'flat',doubleSided:true},{a:b,b:c,c:d,hsl:base-2,mode:'flat',doubleSided:true});
    else model.faces.push({a,b:d,c:b,hsl:base,mode:'flat',doubleSided:true},{a,b:c,c:d,hsl:base-2,mode:'flat',doubleSided:true});
  }
  return model;
}

function preparePlayer(knight,sword){
  const equipped=attachEquipment(knight,sword,{name:'sword_a',label:'hand.r',scale:.7,translate:{y:.22}});
  const idle=applyLabelPose(equipped,{
    'upperarm.r':{label:'upperarm.r',labels:['upperarm.r','lowerarm.r','hand.r'],rotateX:.18},
    'upperarm.l':{label:'upperarm.l',labels:['upperarm.l','lowerarm.l','hand.l'],rotateX:-.16},
  });
  const walk=[];
  for(let i=0;i<4;i++){const phase=i/4*Math.PI*2,swing=Math.sin(phase)*.45;walk.push(applyLabelPose(equipped,{
    'upperarm.r':{label:'upperarm.r',labels:['upperarm.r','lowerarm.r','hand.r'],rotateX:swing},
    'upperarm.l':{label:'upperarm.l',labels:['upperarm.l','lowerarm.l','hand.l'],rotateX:-swing},
    'upperleg.r':{label:'upperleg.r',labels:['upperleg.r','lowerleg.r','foot.r','toes.r'],rotateX:-swing*.65},
    'upperleg.l':{label:'upperleg.l',labels:['upperleg.l','lowerleg.l','foot.l','toes.l'],rotateX:swing*.65},
  }));}
  return{idle,walk};
}

function prepareNpc(model){
  return applyLabelPose(model,{
    'upperarm.r':{label:'upperarm.r',labels:['upperarm.r','lowerarm.r','hand.r'],rotateX:.14},
    'upperarm.l':{label:'upperarm.l',labels:['upperarm.l','lowerarm.l','hand.l'],rotateX:-.14},
  });
}

export class GameplayView{
  constructor(canvas){
    this.canvas=canvas;this.context=canvas.getContext('2d',{alpha:false});this.palette=buildHslPalette(.88);this.lastRender=0;this.terrainKey='';this.terrain=null;this.people=new Map();
    this.shadow=makeShadow();this.dragon=makeDragon();this.marker=makeMarker();this.hut=makeHut();this.fence=makeFence();this.ready=false;this.assets={};this.playerModels=null;this.npcModels=[];
    this.resize();this.resizeObserver=new ResizeObserver(()=>this.resize());this.resizeObserver.observe(canvas);this.loadAssets();
  }

  resize(){
    const rect=this.canvas.getBoundingClientRect(),portrait=rect.height>rect.width*1.2,width=portrait?256:384,height=portrait?384:240;
    if(this.canvas.width===width&&this.canvas.height===height)return;
    this.canvas.width=width;this.canvas.height=height;this.surface=createSurface(width,height);this.terrainKey='';
  }

  async loadAssets(){
    try{
      const [knight,sword,mage,rogue,barbarian,tree,rock,bush]=await Promise.all([
        loadGlbModel(new URL('../assets/models/kaykit-adventurers/knight-classic.glb',import.meta.url)),loadGlbModel(new URL('../assets/models/kaykit-fantasy-weapons/sword-a.glb',import.meta.url)),
        loadGlbModel(new URL('../assets/models/kaykit-adventurers/mage-classic.glb',import.meta.url)),loadGlbModel(new URL('../assets/models/kaykit-adventurers/rogue-classic.glb',import.meta.url)),loadGlbModel(new URL('../assets/models/kaykit-adventurers/barbarian-classic.glb',import.meta.url)),
        loadGlbModel(new URL('../assets/models/kenney-nature/tree_oak.glb',import.meta.url)),loadGlbModel(new URL('../assets/models/kenney-nature/rock_largeC.glb',import.meta.url)),loadGlbModel(new URL('../assets/models/kenney-nature/plant_bushDetailed.glb',import.meta.url)),
      ]);
      this.playerModels=preparePlayer(knight,sword);this.npcModels=[prepareNpc(mage),prepareNpc(rogue),prepareNpc(barbarian)];this.assets={tree,rock,bush};this.ready=true;document.documentElement.classList.add('software-world-ready');
    }catch(error){console.error('Production low-poly assets failed to load',error);}
  }

  wantsFrame(time=performance.now()){return this.ready&&time-this.lastRender>=66;}

  camera(){
    const portrait=this.surface.height>this.surface.width;
    return{x:0,y:portrait?160:145,z:-210,yaw:0,pitch:portrait?-.58:-.52,focalLength:this.surface.width*(portrait?1.15:.95),centerX:this.surface.width/2,centerY:this.surface.height*.68,near:12,far:1000};
  }

  render(snapshot,time=performance.now()){
    if(!this.wantsFrame(time))return;this.lastRender=time;const frameStart=performance.now();
    if(snapshot.terrain.key!==this.terrainKey){this.terrainKey=snapshot.terrain.key;this.terrain=buildTerrain(snapshot);}
    clearSurface(this.surface,snapshot.sky||0x202b32);
    const queue=new DrawQueue(),camera=this.camera(),options={camera,palette:this.palette,lighting:LIGHTING},enemyIndicators=[];
    enqueueModel(queue,this.terrain,{...options,transform:{x:(snapshot.terrain.originX-snapshot.player.x)*WORLD_SCALE,z:(snapshot.terrain.originY-snapshot.player.y)*WORLD_SCALE}});

    const coordinates=(entity)=>({x:(entity.x-snapshot.player.x)*WORLD_SCALE,z:PLAYER_Z+(entity.y-snapshot.player.y)*WORLD_SCALE});
    const visible=({x,z})=>Math.abs(x)<260&&z>-35&&z<390;
    const place=(model,entity,scale=1,shadowScale=1)=>{const point=coordinates(entity);if(!visible(point))return null;if(shadowScale)enqueueModel(queue,this.shadow,{...options,transform:{...point,y:.15,scale:shadowScale}});enqueueModel(queue,model,{...options,transform:{...point,y:entity.elevation||1,scale,rotationY:entity.rotationY||0}});return point;};

    for(const building of snapshot.buildings){place(this.hut,building,1.15,0);for(let i=-1;i<=1;i++)place(this.fence,{x:building.x+i*29,y:building.y+38,rotationY:building.rotationY},1.05,0);}
    for(const prop of snapshot.props.slice(0,18)){const point=coordinates(prop);if(!visible(point))continue;const model=prop.kind==='rock'?this.assets.rock:prop.kind==='bush'?this.assets.bush:this.assets.tree,scale=prop.kind==='tree'?22:prop.kind==='rock'?10:14;enqueueModel(queue,model,{...options,transform:{...point,y:0,scale,rotationY:prop.rotation}});}

    snapshot.npcs.slice(0,8).forEach((npc,index)=>{let model,scale,shadowScale;if(index<this.npcModels.length){model=this.npcModels[index];scale=17;shadowScale=.9;}else{const key=npc.color+'|'+index%4;model=this.people.get(key);if(!model){model=makeVillager(npc.color,index%4);this.people.set(key,model);}scale=.54;shadowScale=.72;}place(model,npc,scale,shadowScale);if(npc.quest)place(this.marker,{...npc,elevation:46},.5,0);});
    snapshot.enemies.slice(0,4).forEach(enemy=>{const point=place(this.dragon,enemy,.62,1.65);if(point)enemyIndicators.push({...point,hp:enemy.hp,maxHp:enemy.maxHp});});
    const playerModel=snapshot.player.moving?this.playerModels.walk[Math.floor(time/110)%this.playerModels.walk.length]:this.playerModels.idle;
    place(playerModel,{...snapshot.player,rotationY:(snapshot.player.facing||0)*Math.PI/4+Math.PI},19,1);
    renderCommands(this.surface,queue,this.palette);

    for(const enemy of enemyIndicators){const view=transformToView({x:enemy.x,y:68,z:enemy.z},camera);if(view.z<=camera.near)continue;const screen=projectViewPoint(view,camera);drawBar(this.surface,Math.round(screen.x-14),Math.round(screen.y),28,enemy.hp,enemy.maxHp,{track:0x241916,fill:0xd94b3d,border:0xe7d8ad});}
    presentSurface(this.context,this.surface);this.lastFrameMs=performance.now()-frameStart;
  }
}

if(typeof window!=='undefined'){window.__promptRealmAssetUrls=LEGACY_ASSET_URLS;const canvas=document.querySelector('#software-game-view');if(canvas)window.__promptRealmSoftwareView=new GameplayView(canvas);}
