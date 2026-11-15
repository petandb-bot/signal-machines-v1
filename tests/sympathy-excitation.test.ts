import {beforeAll,describe,it,expect} from 'vitest';
import {readFileSync} from 'node:fs';
import {transformSync} from 'esbuild';
import {Sympathy} from '../src/audio/modules/Sympathy';
import {DSPModule} from '../src/audio/DSPModule';
import * as safety from '../src/audio/modules/MachineSafety';
import {createModule} from '../src/graph/PatchGraph';
let Previous:typeof Sympathy;
beforeAll(()=>{
 // Compile the immutable pre-change fixture; never include it in a production bundle.
 const source=readFileSync('tests/fixtures/sympathy-phase3-source.txt','utf8').replace(/^import .*;\n/gm,'').replace('export class Sympathy','class Sympathy');
 const js=transformSync(source,{loader:'ts',target:'es2022'}).code;
 Previous=new Function('DSPModule','finiteAudio','finiteUnit','machineControl',js+';return Sympathy;')(DSPModule,safety.finiteAudio,safety.finiteUnit,safety.machineControl);
});
function make(C=Sympathy,body=.42,couple=.55,rate=24000){const state=createModule('SYMPATHY',0,0,71);state.params={body,couple};return new C(state,rate,31);}
const energy=(m:Sympathy)=>m.energies[0]+m.energies[1]+m.energies[2];
describe('SYMPATHY incoming work and acoustic response',()=>{
 it.each([24000,44100,48000])('keeps the TRIG-only energy trajectories bit-identical at %i Hz',rate=>{
  for(const couple of [0,.55,1]){const old=make(Previous,.42,couple,rate),now=make(Sympathy,.42,couple,rate);
   for(let i=0;i<rate;i++){old.inputL[1]=now.inputL[1]=i%Math.round(rate*.231)===0?1:0;old.process(i);now.process(i);for(let b=0;b<3;b++)if(old.energies[b]!==now.energies[b])throw Error('TRIG energy changed');}
  }
 });
 it('improves pulse excitation in stored energy, independently of output pickup',()=>{
  const old=make(Previous),now=make();let eo=0,en=0;for(let i=0;i<1200;i++){old.inputL[0]=now.inputL[0]=i<48?.4:0;old.process(i);now.process(i);eo+=energy(old);en+=energy(now);}expect(en/eo).toBeGreaterThan(5);
 });
 it('preserves quiet/loud ratios through contact and work admission',()=>{
  const a=make(),b=make();let ea=0,eb=0;
  for(let i=0;i<7200;i++){const x=i<800?.2*(Math.sin(i*.82)+.4*Math.sin(i*.017)):0;a.inputL[0]=x;b.inputL[0]=x*.001;a.process(i);b.process(i);ea+=a.outputL[0]**2;eb+=b.outputL[0]**2;expect(b.outputR[0]).toBe(0);}
  expect(Math.sqrt(eb/ea)).toBeCloseTo(.001,10);
 });
 it.each([24000,44100,48000])('bounds forced energy and releases monotonically for 24s at %i Hz',rate=>{
  const m=make(Sympathy,1,1,rate);let previous=Infinity;
  for(let i=0;i<rate*25;i++){
   const active=i<rate,x=active?8*Math.sin(i*.733):0;m.inputL[0]=x;m.inputR[0]=-x;m.process(i);
   const e=energy(m);if(!Number.isFinite(e)||e>1.62*64+1e-8)throw Error('Incident-work bound exceeded');
   if(!active&&e>previous+1e-12)throw Error('Follower excited a silent body');previous=e;
  }
  expect(energy(m)).toBe(0);expect(m.outputL[0]).toBe(0);expect(m.outputR[0]).toBe(0);
 });
 it('has a finite attack under maximum discontinuous input and continuous macros',()=>{
  const m=make(Sympathy);let step=0,previous=0;
  for(let i=0;i<96000;i++){m.targets[0]=.5+.5*Math.sin(i*.0007);m.targets[1]=.5+.5*Math.cos(i*.0003);m.inputL[0]=i%17===0?NaN:i%19===0?Infinity:i%2?8:-8;m.inputR[0]=m.inputL[0];m.inputL[1]=i%701===0?1:0;m.inputL[2]=Math.sin(i*.0002);m.smooth();m.process(i);step=Math.max(step,Math.abs(m.outputL[0]-previous));previous=m.outputL[0];if(!Number.isFinite(previous)||Math.abs(previous)>8)throw Error('Unbounded output');}
  expect(step).toBeLessThan(.2);
 });
 it('retains input-dependent trajectories instead of replaying the same mallet',()=>{
  const render=(frequency:number)=>{const m=make(),out=[];for(let i=0;i<2400;i++){m.inputL[0]=i<480?.1*Math.sin(i*2*Math.PI*frequency/24000):0;m.process(i);if(i%8===0)out.push(m.outputL[0]);}const rms=Math.hypot(...out);return out.map(x=>x/rms);};
  const a=render(110),b=render(440);expect(Math.hypot(...a.map((x,i)=>x-b[i]))).toBeGreaterThan(.2);
 });
});
