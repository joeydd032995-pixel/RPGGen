import {
  DrawQueue,
  attachEquipment,
  buildHslPalette,
  clearSurface,
  createSurface,
  enqueueModel,
  loadGlbModel,
  packHsl,
  presentSurface,
  renderCommands,
} from './software-renderer/index.mjs';

const WIDTH=320,HEIGHT=200,WORLD_SCALE=.82,PLAYER_Z=112;

function emptyModel(){return{vertices:[],faces:[]};}

function addBox(model,{x=0,y=0,z=0,width,height,depth,hsl,label='rigid'}){
  const base=model.vertices.length,w=width/2,d=depth/2;
  model.vertices.push(
    {x:x-w,y,z:z-d,label},{x:x+w,y,z:z-d,label},{x:x+w,y:y+height,z:z-d,label},{x:x-w,y:y+height,z:z-d,label},
    {x:x-w,y,z:z+d,label},{x:x+w,y,z:z+d,label},{x:x+w,y:y+height,z:z+d,label},{x:x-w,y:y+height,z:z+d,label},
  );
  [[0,2,1],[0,3,2],[5,6,4],[6,7,4],[4,3,0],[4,7,3],[1,2,5],[2,6,5],[3,7,2],[2,7,6],[4,0,5],[5,0,1]].forEach((face,index)=>{
    model.faces.push({a:base+face[0],b:base+face[1],c:base+face[2],hsl:(hsl+(index%3-1)*2)&0xffff,mode:'flat',doubleSided:true});
  });
}

function rgbHsl(hex,lightnessOffset=0){
  const value=parseInt(String(hex||'#67834b').replace('#',''),16),r=((value>>16)&255)/255,g=((value>>8)&255)/255,b=(value&255)/255;
  const max=Math.max(r,g,b),min=Math.min(r,g,b),light=(max+min)/2,difference=max-min;
  let hue=0,saturation=0;
  if(difference){
    saturation=difference/(1-Math.abs(2*light-1));
    if(max===r)hue=((g-b)/difference)%6;
    else if(max===g)hue=(b-r)/difference+2;
    else hue=(r-g)/difference+4;
    hue=(hue*60+360)%360;
  }
  return packHsl(Math.round(hue/360*63),Math.round(saturation*7),Math.max(3,Math.min(124,Math.round(light*127)+lightnessOffset)));
}

function makeHumanoid(color='#78904e'){
  const model=emptyModel(),cloth=rgbHsl(color,-8),dark=rgbHsl(color,-25),skin=packHsl(6,4,76),metal=packHsl(38,1,64);
  addBox(model,{x:-5,y:0,width:8,height:28,depth:9,hsl:dark,label:'leftLeg'});
  addBox(model,{x:5,y:0,width:8,height:28,depth:9,hsl:dark,label:'rightLeg'});
  addBox(model,{y:27,width:24,height:31,depth:14,hsl:cloth,label:'torso'});
  addBox(model,{y:58,width:17,height:17,depth:17,hsl:skin,label:'head'});
  addBox(model,{x:-16,y:30,width:7,height:27,depth:8,hsl:metal,label:'leftArm'});
  addBox(model,{x:16,y:30,width:7,height:27,depth:8,hsl:metal,label:'rightArm'});
  return model;
}

function makeEnemy(){
  const model=emptyModel(),body=packHsl(2,6,39),dark=packHsl(1,5,25),bone=packHsl(8,2,77);
  addBox(model,{y:14,width:31,height:26,depth:18,hsl:body});
  addBox(model,{x:0,y:39,z:-2,width:20,height:18,depth:18,hsl:dark});
  addBox(model,{x:-11,y:0,width:7,height:18,depth:8,hsl:dark});
  addBox(model,{x:11,y:0,width:7,height:18,depth:8,hsl:dark});
  addBox(model,{x:-19,y:21,width:8,height:23,depth:8,hsl:body});
  addBox(model,{x:19,y:21,width:8,height:23,depth:8,hsl:body});
  addBox(model,{x:-7,y:55,z:-1,width:4,height:12,depth:4,hsl:bone});
  addBox(model,{x:7,y:55,z:-1,width:4,height:12,depth:4,hsl:bone});
  return model;
}

function makeShadow(){
  const model=emptyModel(),segments=10;
  model.vertices.push({x:0,y:.4,z:0,label:'shadow'});
  for(let index=0;index<segments;index+=1){const angle=index/segments*Math.PI*2;model.vertices.push({x:Math.cos(angle)*15,y:.4,z:Math.sin(angle)*7,label:'shadow'});}
  for(let index=0;index<segments;index+=1)model.faces.push({a:0,b:1+index,c:1+(index+1)%segments,hsl:packHsl(0,0,8),mode:'flat',alpha:105,doubleSided:true,priority:1});
  return model;
}

function makeMarker(){
  const model=emptyModel(),gold=packHsl(8,6,73);
  model.vertices.push({x:0,y:23,z:0,label:'marker'},{x:-9,y:11,z:0,label:'marker'},{x:9,y:11,z:0,label:'marker'},{x:0,y:0,z:0,label:'marker'});
  model.faces.push({a:0,b:1,c:2,hsl:gold,mode:'flat',doubleSided:true,priority:10},{a:1,b:3,c:2,hsl:gold,mode:'flat',doubleSided:true,priority:10});
  return model;
}

function styleKnight(knight,sword){
  const colors={'hand.l':packHsl(6,4,73),'hand.r':packHsl(6,4,73),chest:packHsl(39,6,42),spine:packHsl(39,5,35),hips:packHsl(40,4,27),head:packHsl(37,1,67)};
  const styledKnight={...knight,faces:knight.faces.map(face=>{const label=knight.vertices[face.a].label;return{...face,hsl:colors[label]||packHsl(38,1,label.includes('leg')?42:58)};})};
  const styledSword={...sword,faces:sword.faces.map(face=>{const y=(sword.vertices[face.a].y+sword.vertices[face.b].y+sword.vertices[face.c].y)/3;return{...face,hsl:y>.2?packHsl(37,1,84):packHsl(7,5,43)};})};
  return attachEquipment(styledKnight,styledSword,{name:'sword_a',label:'hand.r',scale:.7,translate:{y:.22}});
}

function buildTerrain(snapshot){
  const model=emptyModel(),columns=snapshot.terrain.columns,rows=snapshot.terrain.rows,spacing=snapshot.terrain.spacing*WORLD_SCALE;
  for(let row=0;row<rows;row+=1)for(let column=0;column<columns;column+=1){
    const sample=snapshot.terrain.cells[row*columns+column];
    model.vertices.push({x:(column-(columns-1)/2)*spacing,y:sample.height,z:PLAYER_Z+(row-(rows-1)/2)*spacing,label:'terrain'});
  }
  for(let row=0;row<rows-1;row+=1)for(let column=0;column<columns-1;column+=1){
    const a=row*columns+column,b=a+1,c=a+columns,d=c+1,sample=snapshot.terrain.cells[a],base=rgbHsl(sample.color,(row+column)%4-2);
    model.faces.push({a,b:c,c:b,hsl:base,mode:'flat',doubleSided:true},{a:b,b:c,c:d,hsl:(base-3)&0xffff,mode:'flat',doubleSided:true});
  }
  return model;
}

export class GameplayView{
  constructor(canvas){
    this.canvas=canvas;this.context=canvas.getContext('2d',{alpha:false});this.surface=createSurface(WIDTH,HEIGHT);this.palette=buildHslPalette(.82);
    this.lastRender=0;this.terrainKey='';this.terrain=null;this.people=new Map();this.shadow=makeShadow();this.enemy=makeEnemy();this.marker=makeMarker();this.ready=false;this.assets={};
    this.loadAssets();
  }

  async loadAssets(){
    try{
      const [knight,sword,tree,rock,bush]=await Promise.all([
        loadGlbModel(new URL('../assets/models/kaykit-adventurers/knight-classic.glb',import.meta.url)),
        loadGlbModel(new URL('../assets/models/kaykit-fantasy-weapons/sword-a.glb',import.meta.url)),
        loadGlbModel(new URL('../assets/models/kenney-nature/tree_oak.glb',import.meta.url)),
        loadGlbModel(new URL('../assets/models/kenney-nature/rock_largeC.glb',import.meta.url)),
        loadGlbModel(new URL('../assets/models/kenney-nature/plant_bushDetailed.glb',import.meta.url)),
      ]);
      this.assets={knight:styleKnight(knight,sword),tree,rock,bush};this.ready=true;
      document.documentElement.classList.add('software-world-ready');
    }catch(error){console.error('Low-poly gameplay assets failed to load',error);}
  }

  wantsFrame(time=performance.now()){return this.ready&&time-this.lastRender>=66;}

  render(snapshot,time=performance.now()){
    if(!this.wantsFrame(time))return;
    this.lastRender=time;
    const terrainKey=snapshot.terrain.key;
    if(terrainKey!==this.terrainKey){this.terrainKey=terrainKey;this.terrain=buildTerrain(snapshot);}
    clearSurface(this.surface,0x17202a);
    const queue=new DrawQueue(),camera={x:0,y:112,z:-138,yaw:0,pitch:-.38,focalLength:238,centerX:WIDTH/2,centerY:72,near:12,far:900};
    const lighting={ambient:30,intensity:91,direction:{x:-.42,y:.84,z:-.33}},options={camera,palette:this.palette,lighting};
    enqueueModel(queue,this.terrain,{...options,transform:{
      x:(snapshot.terrain.originX-snapshot.player.x)*WORLD_SCALE,
      z:(snapshot.terrain.originY-snapshot.player.y)*WORLD_SCALE,
    }});

    const place=(model,entity,scale=1)=>{
      const x=(entity.x-snapshot.player.x)*WORLD_SCALE,z=PLAYER_Z+(entity.y-snapshot.player.y)*WORLD_SCALE;
      if(Math.abs(x)>210||z<-20||z>330)return;
      enqueueModel(queue,this.shadow,{...options,transform:{x,y:.2,z,scale:scale*.9}});
      enqueueModel(queue,model,{...options,transform:{x,y:1+(entity.elevation||0),z,scale,rotationY:entity.rotationY||0}});
    };

    for(const prop of snapshot.props.slice(0,8)){
      const x=(prop.x-snapshot.player.x)*WORLD_SCALE,z=PLAYER_Z+(prop.y-snapshot.player.y)*WORLD_SCALE;
      if(Math.abs(x)>210||z<-20||z>335)continue;
      const model=prop.kind==='rock'?this.assets.rock:prop.kind==='bush'?this.assets.bush:this.assets.tree;
      const scale=prop.kind==='tree'?30:prop.kind==='rock'?18:24;
      enqueueModel(queue,model,{...options,transform:{x,y:0,z,scale,rotationY:prop.rotation}});
    }

    for(const npc of snapshot.npcs.slice(0,7)){
      let model=this.people.get(npc.color);
      if(!model){model=makeHumanoid(npc.color);this.people.set(npc.color,model);}
      place(model,npc,1);
      if(npc.quest)place(this.marker,{...npc,elevation:78},.65);
    }
    for(const enemy of snapshot.enemies.slice(0,5))place(this.enemy,enemy,.9);
    place(this.assets.knight,{...snapshot.player,rotationY:(snapshot.player.facing||0)*Math.PI/4+Math.PI},34);
    renderCommands(this.surface,queue,this.palette);
    presentSurface(this.context,this.surface);
  }
}

if(typeof window!=='undefined'){
  const canvas=document.querySelector('#software-game-view');
  if(canvas)window.__promptRealmSoftwareView=new GameplayView(canvas);
}
