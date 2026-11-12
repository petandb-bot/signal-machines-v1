import {describe,it,expect} from 'vitest';
import {createModule} from '../src/graph/PatchGraph';
import {Clip} from '../src/audio/modules/Clip';import {Fuzz} from '../src/audio/modules/Fuzz';import {Crush,crushBits,crushRate} from '../src/audio/modules/Crush';import {Chip} from '../src/audio/modules/Chip';
const SR=8000;
describe('distinct clipping, fuzz, quantization and stepped voices',()=>{
  it.each([['CLIP',Clip],['FUZZ',Fuzz]] as const)('%s drive zero is dry and an empty input stays silent',(type,Class)=>{
    const s=createModule(type,0,0,1);s.params.drive=0;const dry=new Class(s,SR,1);
    for(let i=0;i<1000;i++){dry.inputL[0]=Math.sin(i*.1)*.2;dry.inputR[0]=-.17;dry.process();expect(dry.outputL[0]).toBe(dry.inputL[0]);expect(dry.outputR[0]).toBe(-.17);}
    s.params.drive=1;const silent=new Class(s,SR,1);for(let i=0;i<SR;i++)silent.process();expect(silent.outputL[0]).toBe(0);expect(silent.outputR[0]).toBe(0);
  });
  it('CLIP hardness changes the transfer shape and drive creates actual harmonics',()=>{
    const data=[0,1].map(hardness=>{const s=createModule('CLIP',0,0,1);s.params.drive=.5;s.params.hardness=hardness;const m=new Clip(s,SR,1);let fundamental=0,third=0;for(let i=0;i<SR;i++){m.inputL[0]=m.inputR[0]=.2*Math.sin(2*Math.PI*100*i/SR);m.process();fundamental+=m.outputL[0]*Math.sin(2*Math.PI*100*i/SR);third+=m.outputL[0]*Math.sin(2*Math.PI*300*i/SR);}return{fundamental,third:Math.abs(third),curve:m.telemetry().curve};});expect(data[0].third).toBeGreaterThan(1);expect(data[1].third).toBeGreaterThan(data[0].third);expect(data[0].curve).not.toEqual(data[1].curve);
  });
  it('FUZZ bias gates quiet material while a central bias leaves it open',()=>{
    const gates=[.5,1].map(bias=>{const s=createModule('FUZZ',0,0,1);s.params.bias=bias;s.params.drive=1;const m=new Fuzz(s,SR,1);let energy=0;for(let i=0;i<SR;i++){m.inputL[0]=m.inputR[0]=.008*Math.sin(i*.1);m.process();if(i>SR/2)energy+=m.outputL[0]**2;}return{gate:m.b,energy};});expect(gates[0].gate).toBeGreaterThan(.99);expect(gates[1].gate).toBeLessThan(.01);expect(gates[0].energy).toBeGreaterThan(gates[1].energy*100);
  });
  it('CRUSH implements signed bit steps and slow audio sample-and-hold',()=>{
    const s=createModule('CRUSH',0,0,1);s.params.bits=6/22;s.params.rate=0;const m=new Crush(s,SR,1);expect(crushBits(s.params.bits)).toBe(8);expect(crushRate(0,SR)).toBe(20);
    m.inputL[0]=.13;m.inputR[0]=-.17;m.process();const held=m.outputL[0];expect(held*128).toBe(Math.round(held*128));m.inputL[0]=-.2;for(let i=0;i<399;i++){m.process();expect(m.outputL[0]).toBe(held);}for(let i=0;i<3;i++)m.process();expect(m.outputL[0]).toBeLessThan(0);
    s.params.bits=s.params.rate=1;const full=new Crush(s,SR,1);for(const value of [-.32,0,.1234567,.8]){full.inputL[0]=value;full.process();expect(full.outputL[0]).toBe(value);}
  });
  it.each([['CLIP',Clip],['FUZZ',Fuzz],['CRUSH',Crush]] as const)('%s bypass starts dry, crossfades back and retains its choice through parameter updates',(type,Class)=>{
    const s=createModule(type,0,0,1);s.bypass=true;const m=new Class(s,SR,1);m.inputL[0]=.12345;m.inputR[0]=-.04;for(let i=0;i<500;i++)m.process();expect(m.outputL[0]).toBe(.12345);s.bypass=false;m.update(s);let difference=0;for(let i=0;i<1000;i++){m.process();difference+=Math.abs(m.outputL[0]-.12345);}expect(difference).toBeGreaterThan(.01);s.bypass=true;m.update(s);for(let i=0;i<SR/2;i++)m.process();expect(m.outputL[0]).toBeCloseTo(.12345,8);
  });
  it.each(['PULSE','TRIANGLE','NOISE'])('CHIP %s is seeded, audible and follows trigger articulation',mode=>{
    const s=createModule('CHIP',0,0,1);s.mode=mode;const a=new Chip(s,SR,2),b=new Chip(s,SR,2);let energy=0;for(let i=0;i<SR;i++){a.process(i);b.process(i);if(a.outputL[0]!==b.outputL[0])throw new Error('Seed mismatch');energy+=a.outputL[0]**2;}expect(energy).toBeGreaterThan(1);
    const notes=new Chip(s,SR,2);notes.inputConnected[1]=1;for(let i=0;i<1000;i++)notes.process(i);expect(Math.abs(notes.outputL[0])).toBe(0);notes.inputL[1]=1;notes.process(1000);let noteEnergy=0;notes.inputL[1]=0;for(let i=0;i<SR*4;i++){notes.process(i+1001);if(i<SR/4)noteEnergy+=notes.outputL[0]**2;}expect(noteEnergy).toBeGreaterThan(.01);expect(Math.abs(notes.outputL[0])).toBeLessThan(1e-5);
  });
  it('CHIP pulse pitch follows the rounded timer frequency',()=>{
    const s=createModule('CHIP',0,0,1);s.params.character=.1;const m=new Chip(s,48000,1),frequency=111860/Math.round(111860/220);let sine=0,cosine=0;for(let i=0;i<48000;i++){m.process(i);sine+=m.outputL[0]*Math.sin(2*Math.PI*frequency*i/48000);cosine+=m.outputL[0]*Math.cos(2*Math.PI*frequency*i/48000);}expect(Math.hypot(sine,cosine)*2/48000).toBeGreaterThan(.03);
  });
  it('all four processors stay finite at extremes and multiple sample rates',()=>{
    for(const rate of [8000,44100,48000,96000])for(const [type,Class] of [['CLIP',Clip],['FUZZ',Fuzz],['CRUSH',Crush],['CHIP',Chip]] as const){const s=createModule(type,0,0,7);for(const key of Object.keys(s.params))s.params[key]=1;if(type==='CHIP')s.wide=true;const m=new Class(s,rate,3);for(let i=0;i<rate/4;i++){m.inputL.fill(1);m.inputR.fill(-1);m.process(i);for(const n of [...m.outputL,...m.outputR])if(!Number.isFinite(n)||Math.abs(n)>8)throw new Error(type);}}
  });
});
