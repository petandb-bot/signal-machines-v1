import {PALETTE,DISPLAY_INKS as INK} from './Palette';
import {DEFINITIONS} from '../graph/definitions';
import type p5 from 'p5';
import type {ModuleTelemetry,ModuleType} from '../graph/types';
import {signalMotion,VISUAL_WIDTH as W,VISUAL_HEIGHT as H} from './SignalMotion';
const point=(g:p5.Graphics,x:number,y:number,size=1)=>g.rect(Math.round(x),Math.round(y),size,size);
const clamp=(n:number,lo:number,hi:number)=>Math.min(hi,Math.max(lo,n));
const sample=(t:ModuleTelemetry,i:number)=>t.wave.length?(t.wave[((i%t.wave.length)+t.wave.length)%t.wave.length]||0):0;
function wave(g:p5.Graphics,t:ModuleTelemetry,center:number,gain:number,height:number,step=1){
  for(let x=5;x<W-5;x+=step){const i=Math.floor((x-5)/(W-10)*64);point(g,x,center-clamp(sample(t,i)*gain,-height,height));}
}
export function drawModule(g:p5.Graphics,type:ModuleType,t?:ModuleTelemetry,lively=true){
  g.background(INK.background);g.noStroke();g.fill(INK.grid);
  for(let x=5;x<W;x+=8)for(let y=5;y<H;y+=8)point(g,x,y);
  if(!t){g.fill(DEFINITIONS[type].color);for(let x=6;x<W-6;x+=4)point(g,x,H/2);return;}
  const color=DEFINITIONS[type].color,motion=signalMotion(type,t,lively);
  // A signal-driven perimeter grows with activity. It never moves the interactive chip/jacks.
  g.fill(INK.frame);
  for(let x=4;x<4+Math.round((W-8)*motion.activity);x+=4){point(g,x,2);point(g,W-5-x,H-3);}
  g.push();g.translate(motion.dx,motion.dy);g.fill(color);
  if(type==='LEVEL'){
    for(let row=0;row<16;row++){g.fill(row/16<clamp(t.a,0,1)?INK.green:INK.grid);g.rect(15,66-row*3,22,2);g.fill(row/16<clamp(t.envelope,0,1)?color:INK.grid);g.rect(65,66-row*3,22,2);}
    g.fill(PALETTE.amber);g.rect(44,12,9,Math.round(clamp(t.b,0,1)*50));g.fill(color);wave(g,t,75,15,3,2);
  }else if(type==='FOUND'){
    const peaks=t.curve??[];g.fill(INK.cyan);for(let x=5;x<99;x++){const h=Math.min(27,(peaks[Math.floor((x-5)/94*104)]??0)*100);point(g,x,39-h);point(g,x,39+h);}
    g.fill(color);const left=5+clamp(t.a,0,1)*94,right=5+clamp(t.b,0,1)*94;for(let y=8;y<70;y+=4){point(g,left,y);point(g,right,y);}g.rect(5+clamp(t.phase,0,1)*94,9,1,61);wave(g,t,75,18,3,2);
  }else if(type==='SMEAR'){
    const dry=t.curve??t.wave,bands=t.bands??[];
    g.fill(INK.blue);for(let x=6;x<98;x+=2){const i=Math.floor((x-6)/92*64);point(g,x,20-clamp((dry[i]??0)*95,-13,13));}
    g.fill(color);wave(g,t,57,100,16,2);
    for(let i=0;i<4;i++){const x=16+i*23,raw=clamp((bands[i]??Math.abs(sample(t,i*12)))*25,0,1),held=clamp((bands[i+4]??Math.abs(sample(t,i*12+9)))*25,0,1);g.fill(INK.blue);point(g,x,32-raw*6,3);g.fill(color);point(g,x+clamp(t.a,0,1)*7,40+held*6,3);}
    g.fill(color);g.rect(8,75,Math.round(clamp(t.phase,0,1)*87),2);
  }else if(type==='FRICTION'){
    const stretch=clamp(t.a,-1,1),pressure=clamp(t.velocity?.y??t.envelope,0,1),x=37+stretch*22,y=33+(1-pressure)*9;
    g.fill(INK.amber);g.rect(9,20,86,8);for(let i=0;i<8;i++){g.fill(color);point(g,10+(i*12+clamp(t.phase,0,1)*12)%82,21,2);}
    g.fill(color);g.rect(x,y,28,10);
    g.fill(t.b>.5?color:PALETTE.cyan);for(let i=0;i<6;i++)point(g,x+2+i*4,29+(t.b>.5?0:clamp(t.envelope,0,1)*3),2);
    g.fill(INK.amber);for(let i=0;i<16;i++)point(g,10+i*(x+14-10)/16,53+(i%2?3:-3));
    for(let i=0;i<3;i++){g.fill(color);g.rect(12+i*30,67-Math.min(10,(t.bands?.[i]??t.envelope)*80),18,2);}
    g.fill(color);wave(g,t,75,18,3,2);
  }else if(type==='PULSE'){
    for(let i=0;i<16;i++){
      const x=7+i*6,d=(i/16-t.phase+1)%1,hot=d<.075;
      g.fill(hot?PALETTE.amber:INK.green);point(g,x,39,hot?3:2);
      if(hot){const reach=5+Math.round(t.envelope*23);for(let y=39-reach;y<39+reach;y+=4)point(g,x,y,2);}
    }
    g.fill(color);const size=Math.round(t.envelope*27);if(size>2){for(let i=-size;i<=size;i+=4){point(g,52+i,39-size);point(g,52+i,39+size);point(g,52-size,39+i);point(g,52+size,39+i);}}
  }else if(type==='FLOCK'){
    const positions=[{x:52+t.a*37,y:39+t.b*28},{x:52+t.b*34,y:39-t.a*25},{x:52+(t.a+t.b)*18,y:39+(t.a-t.b)*12},{x:52+(t.a-t.b)*23,y:39-(t.a+t.b)*15}];
    g.fill(INK.cyan);
    for(let i=0;i<positions.length;i++){const a=positions[i],b=positions[(i+1)%positions.length];for(let j=0;j<12;j++)point(g,a.x+(b.x-a.x)*j/12,a.y+(b.y-a.y)*j/12);}
    g.fill(color);positions.forEach((p,i)=>{point(g,p.x,p.y,i===0?4:3);if(lively){point(g,p.x-4*t.a,p.y-4*t.b);point(g,p.x-8*t.a,p.y-8*t.b);}});
  }else if(type==='BRANCH'){
    for(let i=0;i<Math.min(8,t.wave.length);i++){
      const x=8+i*12,y=42-t.wave[i]*28,active=Math.round(t.phase*8)===i;
      g.fill(active?PALETTE.cyanSoft:INK.cyan);point(g,x,y,active?4:2);
      g.fill(INK.cyan);for(let j=Math.round(y)+5;j<70;j+=4)point(g,x,j);
      if(active){g.fill(color);const reach=3+Math.round(t.envelope*12);point(g,x-reach,y,2);point(g,x+reach,y,2);}
    }
  }else if(type==='EDGE'){
    g.fill(INK.amber);for(let x=7;x<98;x+=3)point(g,x,48-clamp(t.b,0,1)*30);g.fill(color);wave(g,t,63,42,43,2);const height=clamp(t.a,0,1)*37;g.rect(78,62-height,6,height);point(g,9+clamp(t.phase,0,1)*84,73,3);
  }else if(type==='MESH'){
    const bands=t.bands??Array.from({length:10},(_,i)=>Math.abs(sample(t,i*6)));for(let i=0;i<5;i++){const a=Math.min(28,(bands[i]??0)*180),b=Math.min(28,(bands[i+5]??0)*180),x=12+i*18;g.fill(color);g.rect(x,34-a,6,a);g.fill(PALETTE.cyanBright);g.rect(x+7,70-b,6,b);if(t.b>.05){g.fill(color);for(let y=38;y<43+t.a*15;y+=4)point(g,x+4,y,2);}}wave(g,t,76,10,3,2);
  }else if(type==='ORBIT'){
    g.fill(INK.purple);for(let i=0;i<48;i++){const angle=i*Math.PI*2/48;point(g,52+Math.cos(angle)*40,39+Math.sin(angle)*20);}g.fill(color);const x=52+clamp(t.a,-1,1)*40;point(g,x-2,36,5);if(t.b>.5){point(g,x-5,31,2);point(g,x+4,31,2);}wave(g,t,73,16,4,2);
  }else if(type==='LPG'){
    const opening=clamp(t.a,0,1),gap=3+opening*29;g.fill(INK.green);for(let x=8;x<97;x+=3){point(g,x,38-gap);point(g,x,42+gap);}g.fill(color);wave(g,t,40,120,Math.max(2,gap-2),2);g.rect(9,74,Math.round(opening*84),3);
  }else if(type==='OPERATOR'){
    g.fill(INK.blue);for(let i=0;i<48;i++)point(g,7+i*90/47,39-Math.sin(i*Math.PI*2/47)*24,1);g.fill(color);wave(g,t,39,160,29);point(g,7+clamp(t.phase,0,1)*87,73,3);g.rect(8,7,Math.round(clamp(t.a,0,1)*86),2);
  }else if(type==='CLIP'){
    const curve=t.curve??Array.from({length:64},(_,i)=>Math.max(-1,Math.min(1,(i/63*2-1)*(1+t.a*6))));g.fill(INK.amber);for(let i=0;i<64;i++)point(g,7+i*90/63,39-clamp(curve[i],-1,1)*29,2);g.fill(color);wave(g,t,40,110,27);g.rect(8,74,Math.round(clamp(t.b,0,1)*87),2);
  }else if(type==='FUZZ'){
    for(let i=0;i<64;i++){const x=7+i*90/63,v=clamp(sample(t,i)*120,-28,28);g.fill(i%3===0?color:INK.amber);point(g,x,39+v,2);if(lively&&t.b>.1)point(g,x,39-v*.5+(i%3-1)*t.a*5);}g.fill(color);g.rect(8,74,Math.round(clamp(t.b,0,1)*87),3);
  }else if(type==='CRUSH'){
    g.fill(INK.blue);for(let y=12;y<70;y+=Math.max(4,Math.round((1-t.a)*16)))for(let x=7;x<98;x+=5)point(g,x,y);g.fill(color);wave(g,t,39,150,28,Math.max(1,Math.round((1-t.b)*6)));point(g,7+clamp(t.phase,0,1)*87,74,3);
  }else if(type==='CHIP'){
    wave(g,t,39,150,28,2);g.fill(color);for(let i=0;i<4;i++){const hot=i===Math.min(3,Math.floor(t.a*4));g.rect(12+i*23,72,14,hot?4:1);}point(g,7+clamp(t.phase,0,1)*87,8,3);
  }else if(type==='TOUCH'){
    const path=t.particles??Array.from({length:32},(_,i)=>({x:Math.sin(i*.203)*.8,y:Math.cos(i*.203)*.8}));g.fill(INK.cyan);for(let i=0;i<path.length-1;i++){const a=path[i],b=path[i+1],steps=Math.min(12,Math.max(1,Math.ceil(Math.hypot(b.x-a.x,b.y-a.y)*12)));for(let j=0;j<=steps;j++)point(g,52+clamp(a.x+(b.x-a.x)*j/steps,-1,1)*42,39-clamp(a.y+(b.y-a.y)*j/steps,-1,1)*28,2);}g.fill(color);point(g,50+clamp(t.a,-1,1)*42,37-clamp(t.b,-1,1)*28,5);point(g,7+clamp(t.phase,0,1)*87,74,2);
  }else if(type==='PENDULUM'){
    const bodies=t.particles??[{x:Math.sin(t.a*Math.PI),y:Math.cos(t.a*Math.PI),activity:1},{x:Math.sin(t.b*Math.PI),y:Math.cos(t.b*Math.PI),activity:1}];for(let i=0;i<2;i++){const p=bodies[i],anchor=31+i*40,x=anchor+clamp(p.x,-1,1)*24,y=35+clamp(p.y,-1,1)*25;g.fill(INK.amber);for(let j=0;j<16;j++)point(g,anchor+(x-anchor)*j/16,35+(y-35)*j/16);g.fill(color);point(g,anchor-2,33,4);point(g,x-2,y-2,5);if(lively&&p.activity>.2)point(g,x-5*p.x,y-3,2);}g.fill(color);g.rect(8,74,Math.round(clamp(t.envelope,0,1)*87),2);
  }else if(type==='SWARM'){
    const bodies=t.particles??Array.from({length:4},(_,i)=>({x:Math.sin(i*2+t.a*3)*.7,y:Math.cos(i*2+t.b*3)*.7,activity:t.envelope}));
    for(let i=0;i<bodies.length;i++){const a=bodies[i],b=bodies[(i+1)%bodies.length],x=52+clamp(a.x,-1,1)*39,y=39+clamp(a.y,-1,1)*28;g.fill(INK.amber);if(t.b>.4)for(let j=0;j<12;j++)point(g,x+(b.x-a.x)*39*j/12,y+(b.y-a.y)*28*j/12);g.fill(color);point(g,x-2,y-2,3+Math.round(clamp(a.activity,0,1)*4));if(lively&&a.activity>.1){point(g,x-5,y);point(g,x+5,y);}}
    wave(g,t,74,12,4,2);
  }else if(type==='UNSPENT'){
    g.fill(INK.green);for(let x=12;x<94;x+=3)point(g,x,69);for(let y=10;y<70;y+=3){point(g,12,y);point(g,93,y);}g.fill(color);const n=Math.round(clamp(t.a,0,1)*64);for(let i=0;i<n;i++)point(g,19+(i%8)*9,61-Math.floor(i/8)*6,3);if(t.envelope>.05)point(g,86,8+(1-t.envelope)*35,4);point(g,17+clamp(t.phase,0,1)*70,74,2);
  }else if(type==='SIDEWAYS'){
    const a=clamp(t.a,-1,1),b=clamp(t.b,-1,1);for(let x=7;x<98;x+=2){const bend=Math.sin((x-7)/90*Math.PI);g.fill(color);point(g,x,23+a*20*bend,2);g.fill(PALETTE.cyanBright);point(g,x,57+b*20*bend,2);}g.fill(color);point(g,50,21+a*20,4);point(g,50,55+b*20,4);wave(g,t,74,12,4,2);
  }else if(type==='QUORUM'){
    const values=t.particles??[{x:t.a,y:0,activity:1},{x:t.b,y:0,activity:1},{x:-t.a,y:0,activity:1}];for(let i=0;i<3;i++){const x=52+clamp(values[i]?.x??0,-1,1)*39,y=13+i*16;g.fill(t.b>.5?color:INK.purple);point(g,x,y,4);for(let j=0;j<7;j++)point(g,x+(52-x)*j/7,y+(68-y)*j/7);}g.fill(color);point(g,52+clamp(t.a,-1,1)*35,68,6);g.rect(9,77,Math.round(clamp(t.phase,0,1)*85),2);
  }else if(type==='FAULT LINE'){
    const crack=clamp(Math.max(t.b,t.a),0,1);wave(g,t,40,105,27);g.fill(INK.background);for(let i=0;i<8;i++){const x=47+Math.sin(i*2.4+t.phase)*crack*14;g.rect(Math.round(x),9+i*8,2+Math.round(crack*5),8);}g.fill(color);for(let i=0;i<8;i++)point(g,46+Math.sin(i*2.4+t.phase)*crack*14,9+i*8,2);g.rect(8,74,Math.round(clamp(t.a,0,1)*87),3);
  }else if(type==='QUANTIZE'){
    const unit=Math.max(.02,t.phase);g.fill(INK.green);for(let x=7;x<98;x++){const input=(x-52)/43,quantized=Math.round(input*2/unit)*unit*.5;point(g,x,39-clamp(quantized,-1,1)*28);}g.fill(color);point(g,52+clamp(t.a,-1,1)*43,39-clamp(t.b,-1,1)*28,4);wave(g,t,73,12,4,2);
  }else if(type==='SLEW'){
    wave(g,t,39,26,28);g.fill(INK.green);for(let x=7;x<98;x+=4)point(g,x,39-clamp(t.b,-1,1)*26);g.fill(color);point(g,95,39-clamp(t.a,-1,1)*26,3);
  }else if(type==='FORMANT'){
    for(let i=0;i<3;i++){const height=Math.min(48,(t.bands?.[i]??Math.abs(sample(t,i*17)))*1400);g.fill(i===0?color:INK.red);for(let x=-11;x<=11;x+=2)point(g,20+i*31+x,65-height*Math.exp(-x*x/55),2);}g.fill(color);wave(g,t,74,13,4,2);
  }else if(type==='LOGIC'){
    for(let lane=0;lane<2;lane++){const hot=lane===0?t.a>.5:t.b>.5;g.fill(hot?color:INK.blue);g.rect(9,15+lane*26,15,10);for(let x=30;x<96;x+=4)point(g,x,20+lane*26,hot?2:1);}g.fill(color);point(g,9+clamp(t.phase,0,1)*85,72,3);if(t.envelope>.05)g.rect(87,27,5,Math.round(t.envelope*18));
  }else if(type==='DUCK'){
    const gain=clamp(t.a,0,1);g.fill(INK.purple);for(let x=7;x<98;x+=3)point(g,x,16+Math.sin((x-7)/90*Math.PI)*(1-gain)*43,2);g.fill(color);wave(g,t,42,90,24);g.rect(8,73,Math.round(gain*88),3);
  }else if(type==='WEFT'){
    const n=Math.max(1,t.wave.length);for(let i=0;i<n;i++){const x=6+i*92/n,hot=i===Math.round(t.phase*n);g.fill(sample(t,i)>.5?color:INK.cyan);g.rect(x,22,Math.max(2,Math.floor(80/n)),hot?11:5);}g.fill(color);for(let x=6;x<98;x+=3)point(g,x,54-Math.exp(-(x-6)/24)*clamp(t.envelope,0,1)*28,2);point(g,52+clamp(t.b,-1,1)*42,71,3);
  }else if(type==='TIDE'){
    const values=[t.a,t.b,(t.phase-.5)*2];for(let i=0;i<3;i++){g.fill(INK.green);for(let x=6;x<98;x+=4)point(g,x,17+i*23);g.fill(color);const x=52+clamp(values[i],-1,1)*42;point(g,x,15+i*23,4);if(lively){point(g,x-values[i]*8,15+i*23,2);point(g,x-values[i]*16,15+i*23);}}
  }else if(type==='BOUNCE'){
    g.fill(INK.amber);for(let x=7;x<98;x+=3){point(g,x,9);point(g,x,69);}for(let y=9;y<70;y+=3){point(g,7,y);point(g,97,y);}g.fill(color);const x=52+clamp(t.a,-1,1)*40,y=39+clamp(t.b,-1,1)*26;point(g,x-2,y-2,5);if(t.velocity)for(let i=1;i<9;i++)point(g,clamp(x+t.velocity.x*i,8,96),clamp(y+t.velocity.y*i,10,68));
  }else if(type==='COUNT'){
    const word=Math.round(clamp(t.a,0,1)*15);for(let i=0;i<4;i++){g.fill(word&(1<<i)?color:INK.green);g.rect(10+i*23,13,15,24);g.fill(color);for(let j=0;j<i+1;j++)point(g,11+i*23+j*3,43,2);}g.fill(color);wave(g,t,62,65,12);
  }else if(type==='MAP'){
    const curve=t.curve??t.wave;g.fill(INK.purple);for(let i=0;i<64;i++)point(g,7+i*90/63,39-clamp(curve[i%Math.max(1,curve.length)]??0,-1,1)*28);g.fill(color);point(g,52+clamp(t.a,-1,1)*43,39-clamp(t.b,-1,1)*28,4);wave(g,t,73,14,4,2);
  }else if(type==='FERAL'){
    for(let i=0;i<64;i++){g.fill(i%4===0?color:INK.amber);point(g,52+clamp(sample(t,i)*130,-43,43),39+clamp(sample(t,i+13)*130,-28,28),2);}g.fill(color);g.rect(8,72,Math.round(clamp(t.b,0,1)*88),3);
  }else if(type==='CHANCE'){
    for(let i=0;i<8;i++){const x=8+i*12,pitch=sample(t,i),active=Math.round(t.phase*8)===i;g.fill(active?color:INK.amber);point(g,x,42-clamp(pitch,-1,1)*27,active?4:2);g.fill(color);if(i/8<clamp(t.a,0,1))point(g,x,67,2);if(active)g.rect(x,8,3,8+Math.round(t.envelope*14));}
  }else if(type==='PARTIAL'||type==='PRISM'){
    const bands=t.bands??t.wave;for(let i=0;i<16;i++){const amplitude=Math.abs(bands[Math.min(bands.length-1,type==='PARTIAL'?i*2:i)]??0),height=Math.min(52,Math.round(amplitude*(type==='PARTIAL'?45:950)));g.fill(color);g.rect(6+i*6,64-height,3,height);if(lively&&height>6)point(g,7+i*6,58-height,2);}g.fill(type==='PRISM'&&t.b>.5?PALETTE.redSoft:color);wave(g,t,72,14,5,2);
  }else if(type==='VCA'){
    const blend=clamp(t.b,0,1),level=clamp(t.a,0,1);g.fill(INK.green);g.rect(7,68-Math.round((1-blend)*level*50),17,Math.round((1-blend)*level*50));g.rect(80,68-Math.round(blend*level*50),17,Math.round(blend*level*50));g.fill(color);wave(g,t,40,100,27);
  }else if(type==='SHAPE'){
    for(let x=6;x<W-6;x++){const i=Math.floor((x-6)/(W-12)*64);point(g,x,67-clamp(sample(t,i),0,1)*53,2);}g.fill(INK.cyan);g.rect(6,8,Math.round(clamp(t.a,0,1)*90),3);g.fill(color);point(g,14+(t.b===1?clamp(t.a,0,1):1-clamp(t.a,0,1))*76,73,3);
  }else if(type==='SWITCH'){
    const blend=clamp(t.a,0,1);for(let x=8;x<96;x+=3){g.fill(blend<.5?color:INK.cyan);point(g,x,20+(x>40?(x-40)*.35:0),2);g.fill(blend>=.5?color:INK.cyan);point(g,x,60-(x>40?(x-40)*.35:0),2);}g.fill(color);wave(g,t,40,70,18);
  }else if(type==='LOOP'){
    const recording=t.loop?.mode==='recording',progress=recording?t.loop!.frames/(t.loop!.sampleRate*16):t.phase;g.fill(recording?PALETTE.red:color);for(let i=0;i<24;i++)point(g,6+i*4,i/24<progress?10:14,2);wave(g,t,43,100,25);g.rect(6+Math.round(clamp(progress,0,1)*90),20,2,50);
  }else if(type==='CHORUS'){
    for(let voice=0;voice<(lively?3:1);voice++){g.fill(voice===0?color:INK.blue);for(let x=6;x<W-6;x+=voice?2:1){const i=Math.floor((x-6)/(W-12)*64)+voice*13;point(g,x,39+Math.sin(t.phase*6.283+voice*2.1)*t.a*9-clamp(sample(t,i)*80,-23,23));}}
  }else if(type==='CLOUD'){
    for(let i=0;i<64;i++){const x=6+i*90/64,y=39-clamp(sample(t,i)*100,-26,26);g.fill(i%4===0?color:INK.amber);point(g,x,y,2);if(lively)point(g,x,39+(y-39)*.5+t.b*8);}g.fill(color);point(g,6+clamp(t.phase,0,1)*90,72,3);
  }else if(type==='OSC'){
    wave(g,t,39,150,29);g.fill(INK.green);for(let i=0;i<4;i++)g.rect(12+i*23,70,14,i===Math.round(t.b*3)?4:1);g.fill(color);point(g,6+clamp(t.phase,0,1)*90,9,3);
  }else if(type==='NOISE'){
    for(let i=0;i<64;i++){g.fill(i%3===0?color:INK.green);point(g,6+i*90/64,39+clamp(sample(t,i)*190,-29,29),2);if(lively)point(g,6+i*90/64,39-clamp(sample(t,i+21)*110,-25,25));}g.fill(color);g.rect(9,8,Math.round(clamp(t.b,0,1)*85),3);
  }else if(type==='FILTER'){
    const cutoff=10+clamp(t.a,0,1)*82,resonance=clamp(t.b,0,1);for(let x=6;x<98;x++){const d=(x-cutoff)/10,mode=Math.round(t.phase*2),height=(mode===0?1/(1+Math.exp(d)):mode===2?1/(1+Math.exp(-d)):Math.exp(-d*d*.5))*32+Math.exp(-d*d*3)*resonance*17;point(g,x,65-height,2);}g.fill(INK.cyan);wave(g,t,73,15,5,2);
  }else if(type==='RING'){
    for(let i=0;i<64;i++){const x=52+clamp(sample(t,i)*170,-44,44),y=39+clamp(sample(t,i+11)*170,-29,29);point(g,x,y,2);}g.fill(INK.amber);for(let i=0;i<20;i++){const angle=i*.31416+t.phase*6.283;point(g,52+Math.cos(angle)*28,39+Math.sin(angle)*28,2);}
  }else if(type==='COMB'){
    for(let i=0;i<12;i++){const x=7+i*8,height=8+Math.abs(sample(t,i*5))*150+clamp(t.b,0,1)*12;g.fill(i%3===0?color:INK.amber);g.rect(x,66-Math.min(53,height),2,Math.min(53,height));}g.fill(color);wave(g,t,39,100,25);
  }else if(type==='SHIFT'){
    const offset=(clamp(t.a,0,1)-.5)*24;for(let x=6;x<98;x++){const i=Math.floor((x-6)*64/92);point(g,x,39-clamp(sample(t,i)*110,-26,26),2);if(lively){g.fill(INK.red);point(g,clamp(x+offset,5,98),39+clamp(sample(t,i+7)*65,-23,23));g.fill(color);}}g.rect(52,7,Math.round(offset)||1,3);
  }else if(type==='OUTPUT'){
    for(let channel=0;channel<2;channel++){
      const level=clamp(Math.sqrt(channel===0?t.levelL:t.levelR)*1.8,0,1);
      for(let row=0;row<16;row++){g.fill(row/16<level?(row>13?PALETTE.amber:color):INK.grid);g.rect(13+channel*44,66-row*3,28,2);}
    }
    g.fill(INK.green);wave(g,t,73,10,5,2);
  }else if(type==='PARASITE'){
    const pressure=clamp(t.a,0,1);
    for(let x=5;x<W-5;x++){
      const y=39+Math.sin(x*.095+t.phase*6.283)*pressure*22+Math.sin(x*.24+t.b*3)*t.b*10;
      g.fill(color);point(g,x,y,pressure>.65?2:1);
      if(lively&&x%3===0){g.fill(INK.red);point(g,x,39-(y-39)*.65);}
    }
    g.fill(PALETTE.cyan);point(g,50+t.b*40,70,3);g.fill(color);for(let i=0;i<Math.round(pressure*22);i++)point(g,5+i*4,8,2);
  }else if(type==='SIEVE'){
    for(let i=0;i<6;i++){
      const d=(i-t.a*5)/(.28+t.b*2.4),weight=Math.exp(-d*d*.5),height=Math.round(weight*(5+motion.activity*52));
      for(let y=66;y>66-height;y-=4){g.fill(y<25?PALETTE.cyanSoft:color);g.rect(7+i*16,y,8,2);}
    }
    g.fill(INK.cyan);wave(g,t,73,15,5,2);
  }else if(type==='SNAP'){
    const open=t.a>.5,rail=24;
    for(let x=5;x<W-5;x+=3){if(x<40||x>62||open)point(g,x,rail,2);}
    point(g,40,open?rail:rail-10,3);point(g,60,open?rail:rail+10,3);
    wave(g,t,55,65,17);
    if(!open&&lively){const scatter=Math.round((1-t.a)*9);for(let i=0;i<scatter;i++)point(g,43+i*2,30+clamp(sample(t,i)*100,-20,20));}
  }else if(type==='TAPE'){
    const phase=t.phase*6.283;
    for(let spool=0;spool<2;spool++)for(let i=0;i<18;i++){
      const angle=i*6.283/18+phase*(spool?-1:1),radius=11+(i%3===0?4:0);
      g.fill(i%3===0?color:INK.amber);point(g,29+spool*46+Math.cos(angle)*radius,24+Math.sin(angle)*radius,2);
    }
    g.fill(color);wave(g,t,58,70,15);g.fill(INK.amber);for(let x=6;x<W-6;x+=2)point(g,x,70-clamp(sample(t,Math.floor(x*.7)+13)*32,-7,7));
  }else if(type==='FRACTURE'){
    for(let x=5;x<W-5;x++){
      const block=Math.floor((x-5)/24);if((x-5)%24<3)continue;
      const i=Math.floor((x-5)/(W-10)*64),y=39-clamp(sample(t,i)*70,-27,27);point(g,x,y,block===Math.floor(t.a*4)?2:1);
    }
    g.fill(INK.red);for(let x=5;x<W-5;x+=4)point(g,x,70);g.fill(color);g.rect(5+Math.round(t.a*90),8,2,62);
  }else if(type==='VENOM'||type==='CAUSTIC'||type==='DRONE'){
    if(type==='VENOM'){
      for(let i=0;i<64;i++){const x=7+i*90/64,y=39+clamp(sample(t,i)*100,-29,29);point(g,x,y,motion.activity>.65?2:1);if(lively){g.fill(INK.green);point(g,52+clamp(sample(t,i+17)*180,-45,45),y);g.fill(color);}}
    }else{
      const gain=type==='CAUSTIC'?110:190;
      for(let i=0;i<64;i++){const x=52+clamp(sample(t,i)*gain,-44,44),y=39+clamp(sample(t,i+13)*gain,-29,29);point(g,x,y,motion.activity>.6?2:1);}
      g.fill(type==='DRONE'?INK.green:INK.amber);wave(g,t,39,70,29,2);
    }
  }else{
    const gain=type==='ALLOY'?105:type==='RESON'?90:100;wave(g,t,39,gain,29);
    if(lively){g.fill(INK.amber);for(let x=6;x<W-6;x+=2){const i=Math.floor((x-5)/(W-10)*64);point(g,x,39+clamp(sample(t,i+17)*gain*.65,-24,24));}}
    if(type==='RESON'){g.fill(color);const radius=Math.round(motion.activity*18);for(let i=0;i<16;i++)point(g,52+Math.cos(i*.3927)*radius,39+Math.sin(i*.3927)*radius,2);}
  }
  g.pop();
}
