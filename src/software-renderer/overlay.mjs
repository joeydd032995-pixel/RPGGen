import { writePixel } from './surface.mjs';

export function fillRect(surface,x,y,width,height,color,alpha=255){
  const startX=Math.max(0,Math.trunc(x)),startY=Math.max(0,Math.trunc(y));
  const endX=Math.min(surface.width,Math.trunc(x+width)),endY=Math.min(surface.height,Math.trunc(y+height));
  for(let py=startY;py<endY;py+=1)for(let px=startX;px<endX;px+=1)writePixel(surface,px,py,color,alpha);
}

export function strokeRect(surface,x,y,width,height,color){
  fillRect(surface,x,y,width,1,color);fillRect(surface,x,y+height-1,width,1,color);
  fillRect(surface,x,y,1,height,color);fillRect(surface,x+width-1,y,1,height,color);
}

export function fillCircle(surface,cx,cy,radius,color,alpha=255){
  const r2=radius*radius;
  for(let y=-radius;y<=radius;y+=1)for(let x=-radius;x<=radius;x+=1)if(x*x+y*y<=r2)writePixel(surface,cx+x,cy+y,color,alpha);
}

export function drawBar(surface,x,y,width,value,maximum,colors={track:0x171b20,fill:0x4dd36f,border:0xd9c78d}){
  fillRect(surface,x,y,width,5,colors.track,220);strokeRect(surface,x,y,width,5,colors.border);
  fillRect(surface,x+1,y+1,Math.round((width-2)*Math.max(0,Math.min(1,value/maximum))),3,colors.fill);
}

export function drawDemoOverlay(surface,frame=0){
  fillRect(surface,7,7,88,22,0x10161d,210);strokeRect(surface,7,7,88,22,0xb69a56);
  drawBar(surface,13,13,75,82,100);
  drawBar(surface,13,21,75,44+(frame%20),100,{track:0x171b20,fill:0x56a6d8,border:0x778899});
  fillCircle(surface,285,35,27,0x0b1015,225);fillCircle(surface,285,35,23,0x536f3b,255);
  fillRect(surface,282,11,6,48,0xc9b36d,160);fillRect(surface,261,32,48,5,0xc9b36d,160);
  fillCircle(surface,291,27,2,0xe6c44f);fillCircle(surface,275,42,2,0xd9574f);fillCircle(surface,298,45,2,0xf2eee0);
  drawBar(surface,89,65,28,73,100);drawBar(surface,178,78,28,42,100);
}
