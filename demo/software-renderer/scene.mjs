import { DrawQueue, applyLabelPose, attachEquipment, enqueueModel, packHsl, prepareTexture128 } from '../../src/software-renderer/index.mjs';

function emptyModel(){return{vertices:[],faces:[]};}

function addBox(model,{x=0,y=0,z=0,width,height,depth,hsl,label='rigid',mode='flat'}){
  const base=model.vertices.length,w=width/2,d=depth/2;
  model.vertices.push(
    {x:x-w,y,z:z-d,label},{x:x+w,y,z:z-d,label},{x:x+w,y:y+height,z:z-d,label},{x:x-w,y:y+height,z:z-d,label},
    {x:x-w,y,z:z+d,label},{x:x+w,y,z:z+d,label},{x:x+w,y:y+height,z:z+d,label},{x:x-w,y:y+height,z:z+d,label},
  );
  const triangles=[[0,2,1],[0,3,2],[5,6,4],[6,7,4],[4,3,0],[4,7,3],[1,2,5],[2,6,5],[3,7,2],[2,7,6],[4,0,5],[5,0,1]];
  triangles.forEach((triangle,index)=>model.faces.push({a:base+triangle[0],b:base+triangle[1],c:base+triangle[2],hsl:packHsl((hsl.h+index%2)&63,hsl.s,hsl.l-index%3*3),mode,doubleSided:true}));
}

function addCanopy(model,{x,y,z,radius,hue=18}){
  const base=model.vertices.length;
  model.vertices.push({x,y:y+radius,z,label:'rigid'},{x,y:y-radius*.7,z,label:'rigid'});
  for(let i=0;i<7;i+=1){const angle=i/7*Math.PI*2;model.vertices.push({x:x+Math.cos(angle)*radius,y:y+(i%2?2:-3),z:z+Math.sin(angle)*radius,label:'rigid'});}
  for(let i=0;i<7;i+=1){const next=(i+1)%7;model.faces.push({a:base,b:base+2+i,c:base+2+next,hsl:packHsl(hue,6,56+i%3*5),mode:'gouraud',doubleSided:true});model.faces.push({a:base+1,b:base+2+next,c:base+2+i,hsl:packHsl(hue,6,38+i%2*4),mode:'flat',doubleSided:true});}
}

function makeTree(){const model=emptyModel();addBox(model,{y:0,width:10,height:62,depth:10,hsl:{h:6,s:5,l:45}});addCanopy(model,{x:0,y:70,z:0,radius:35});addCanopy(model,{x:-18,y:57,z:3,radius:24,hue:17});return model;}

function makeHumanoid(colors){
  const model=emptyModel();
  addBox(model,{x:-6,y:0,width:10,height:38,depth:11,hsl:colors.legs,label:'leftLeg'});
  addBox(model,{x:6,y:0,width:10,height:38,depth:11,hsl:colors.legs,label:'rightLeg'});
  addBox(model,{y:37,width:28,height:38,depth:15,hsl:colors.body,label:'torso'});
  addBox(model,{y:75,width:19,height:19,depth:18,hsl:colors.skin,label:'head',mode:'gouraud'});
  addBox(model,{x:-19,y:42,width:9,height:34,depth:10,hsl:colors.arms,label:'leftArm'});
  addBox(model,{x:19,y:42,width:9,height:34,depth:10,hsl:colors.arms,label:'rightArm'});
  return model;
}

function makeSword(){const model=emptyModel();addBox(model,{x:0,y:-2,width:4,height:42,depth:3,hsl:{h:37,s:1,l:88}});addBox(model,{x:0,y:-6,width:16,height:4,depth:5,hsl:{h:7,s:5,l:55}});addBox(model,{x:0,y:-17,width:5,height:12,depth:5,hsl:{h:5,s:5,l:35}});return model;}

function makeTerrain(){
  const model=emptyModel(),columns=13,rows=14,spacing=48;
  for(let row=0;row<rows;row+=1)for(let column=0;column<columns;column+=1){
    const x=(column-(columns-1)/2)*spacing,z=(row-3)*spacing;
    const height=Math.sin(column*1.7+row*.8)*4+Math.cos(row*1.4)*3;
    model.vertices.push({x,y:height,z,label:'terrain'});
  }
  for(let row=0;row<rows-1;row+=1)for(let column=0;column<columns-1;column+=1){
    const a=row*columns+column,b=a+1,c=a+columns,d=c+1;
    const path=Math.abs(column-(columns-1)/2)<1.3;
    const hsl=path?packHsl(8,3,63+(row+column)%5):packHsl(18+(row%2),6,48+(column*3+row)%11);
    model.faces.push({a,b:c,c:b,hsl,mode:'flat',doubleSided:true},{a:b,b:c,c:d,hsl:packHsl(path?8:18,path?3:6,(path?61:46)+(row+column)%9),mode:'flat',doubleSided:true});
  }
  return model;
}

function makeTexturedPatch(){
  return {vertices:[{x:-190,y:1,z:285,label:'ground'},{x:-70,y:1,z:285,label:'ground'},{x:-190,y:1,z:405,label:'ground'},{x:-70,y:1,z:405,label:'ground'}],faces:[
    {a:0,b:1,c:2,mode:'textured',texture:'ground',texturePlane:[0,1,2],doubleSided:true,priority:1},
    {a:1,b:3,c:2,mode:'textured',texture:'ground',texturePlane:[1,3,2],doubleSided:true,priority:1},
  ]};
}

function groundTexture(){
  const texels=new Uint32Array(128*128);
  for(let y=0;y<128;y+=1)for(let x=0;x<128;x+=1){const noise=((x*73+y*151+(x*y)%47)&31);texels[y*128+x]=(65+noise<<16)|(74+noise<<8)|(35+(noise>>1));}
  return prepareTexture128(texels);
}

const TERRAIN=makeTerrain(),TREE=makeTree(),GROUND_PATCH=makeTexturedPatch(),GROUND_TEXTURE=groundTexture();
const PEOPLE=[
  makeHumanoid({body:{h:38,s:5,l:57},legs:{h:4,s:6,l:37},arms:{h:5,s:4,l:68},skin:{h:6,s:4,l:75}}),
  makeHumanoid({body:{h:58,s:3,l:25},legs:{h:41,s:5,l:35},arms:{h:58,s:3,l:28},skin:{h:5,s:4,l:72}}),
  makeHumanoid({body:{h:12,s:6,l:48},legs:{h:2,s:5,l:32},arms:{h:12,s:5,l:50},skin:{h:7,s:4,l:70}}),
];
PEOPLE[0]=attachEquipment(PEOPLE[0],makeSword(),{name:'iron_sword',label:'rightArm',translate:{x:19,y:43,z:0},rotateZ:-.18});

export function prepareKayKitKnight(knight,sword){
  const colors={
    'hand.l':packHsl(6,4,73),'hand.r':packHsl(6,4,73),
    chest:packHsl(39,6,42),spine:packHsl(39,5,35),hips:packHsl(40,4,27),
    head:packHsl(37,1,66),
  };
  const styledKnight={...knight,faces:knight.faces.map(face=>{
    const label=knight.vertices[face.a].label;
    return{...face,hsl:colors[label]||packHsl(38,1,label.includes('leg')?42:58)};
  })};
  const styledSword={...sword,faces:sword.faces.map(face=>{
    const y=(sword.vertices[face.a].y+sword.vertices[face.b].y+sword.vertices[face.c].y)/3;
    return{...face,hsl:y>.2?packHsl(37,1,82):packHsl(7,5,43)};
  })};
  const equipped=attachEquipment(styledKnight,styledSword,{name:'sword_a',label:'hand.r',scale:.7,translate:{y:.22}});
  return applyLabelPose(equipped,{'upperarm.r':{label:'upperarm.r',rotateX:.35},'upperarm.l':{label:'upperarm.l',rotateX:-.45}});
}

export function buildDemoScene(frame=0,palette,assets={}){
  const queue=new DrawQueue();
  const camera={x:0,y:108,z:-150,yaw:-.04,pitch:-.36,focalLength:238,centerX:160,centerY:76,near:12,far:1499};
  const lighting={ambient:30,intensity:88,direction:{x:-.45,y:.82,z:-.35}};
  const options={camera,palette,lighting,textures:{ground:GROUND_TEXTURE}};
  enqueueModel(queue,TERRAIN,{...options});
  enqueueModel(queue,GROUND_PATCH,{...options});
  const tree=assets.tree||TREE,treeScale=assets.tree?58:1;
  [[-150,0,100,0.2],[148,0,145,-.3],[-190,0,310,.1],[195,0,340,.4]].forEach(([x,y,z,rotationY])=>enqueueModel(queue,tree,{...options,transform:{x,y,z,rotationY,scale:treeScale}}));
  if(assets.rock)for(const [x,z,size] of [[-112,70,28],[112,92,22],[-92,245,18],[130,275,30]])enqueueModel(queue,assets.rock,{...options,transform:{x,y:1,z,scale:size,rotationY:x*.01}});
  if(assets.bush)for(const [x,z] of [[-122,175],[118,220],[-165,270]])enqueueModel(queue,assets.bush,{...options,transform:{x,y:0,z,scale:38,rotationY:z*.01}});
  if(assets.log)enqueueModel(queue,assets.log,{...options,transform:{x:92,y:2,z:310,scale:42,rotationY:.7}});
  const phase=frame/120*Math.PI*2;
  const poses=[
    {leftArm:{label:'leftArm',rotateX:-.65+Math.sin(phase)*.2,pivot:{x:-19,y:74,z:0}},rightArm:{label:'rightArm',rotateX:.35,pivot:{x:19,y:74,z:0}}},
    {rightArm:{label:'rightArm',rotateX:-1.1,pivot:{x:19,y:74,z:0}},leftLeg:{label:'leftLeg',rotateX:.18,pivot:{x:-6,y:38,z:0}}},
    {leftArm:{label:'leftArm',rotateZ:-.45,pivot:{x:-19,y:74,z:0}},rightArm:{label:'rightArm',rotateZ:.45,pivot:{x:19,y:74,z:0}}},
  ];
  const placements=[[-62,4,88,.1],[54,3,145,-.18],[6,5,220,.05]];
  PEOPLE.forEach((person,index)=>{
    if(index===0&&assets.knight){
      enqueueModel(queue,assets.knight,{...options,transform:{x:placements[index][0],y:placements[index][1],z:placements[index][2],rotationY:placements[index][3],scale:34}});
      return;
    }
    enqueueModel(queue,applyLabelPose(person,poses[index]),{...options,transform:{x:placements[index][0],y:placements[index][1],z:placements[index][2],rotationY:placements[index][3]}});
  });
  return queue;
}
