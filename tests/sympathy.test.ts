import {describe,it,expect} from 'vitest';
import {Sympathy} from '../src/audio/modules/Sympathy';
import {createModule,connect} from '../src/graph/PatchGraph';
import {parsePatch} from '../src/state/PatchStorage';
import {emptyPatch} from '../src/state/presets';
import {DSPGraph} from '../src/audio/DSPGraph';
const make=(body=.42,couple=.55,rate=48000,seed=71)=>{const s=createModule('SYMPATHY',0,0,seed);s.params={body,couple};return new Sympathy(s,rate,31);};
const total=(m:Sympathy)=>m.energies[0]+m.energies[1]+m.energies[2];
describe('SYMPATHY passive coupled bodies',()=>{
 it.each([24000,44100,48000])('transfers stored energy only when coupled, at %i Hz',rate=>{
  const isolated=make(.1,0,rate),coupled=make(.1,.55,rate);let transferred=0,previous=Infinity;
  for(let i=0;i<rate*3;i++){for(const m of [isolated,coupled]){m.inputL[1]=i===0?1:0;m.process(i);}if(isolated.energies[1]!==0||isolated.energies[2]!==0)throw Error('Uncoupled body was excited');transferred=Math.max(transferred,coupled.energies[1]+coupled.energies[2]);const energy=total(coupled);if(energy>previous+1e-13)throw Error('Unforced energy grew');previous=energy;}
  expect(transferred).toBeGreaterThan(.001);expect(total(coupled)).toBeLessThan(1e-12);
 });
 it('starts silent, supports audio alone and retains stereo channel independence',()=>{const m=make();for(let i=0;i<10000;i++){m.process(i);if(m.outputL[0]!==0||m.outputR[0]!==0)throw Error('Noise at rest');}let energy=0;for(let i=0;i<48000;i++){m.inputL[0]=.001*Math.sin(i*Math.PI*2*110/48000);m.process(i);energy+=m.outputL[0]**2;if(m.outputR[0]!==0)throw Error('Stereo crossfeed');}expect(energy).toBeGreaterThan(1e-6);});
 it.each([24000,44100,48000])('remains finite at every macro corner with both drivers and invalid values at %i Hz',rate=>{for(const body of [0,.5,1])for(const couple of [0,.5,1]){const m=make(body,couple,rate);for(let i=0;i<rate*.1;i++){m.inputL[0]=i===3?NaN:i===4?Infinity:8*Math.sin(i*.7);m.inputR[0]=-m.inputL[0];m.inputL[1]=i%2;m.inputL[2]=i%131===0?Infinity:Math.sin(i*.001)*8;m.inputL[3]=i%127===0?NaN:Math.cos(i*.002);m.process(i);for(const value of m.outputL)if(!Number.isFinite(value)||Math.abs(value)>8)throw Error('Invalid output');if(!Number.isFinite(total(m)))throw Error('Invalid state');}}});
 it('smooths material/pitch/coupling changes without resetting energy or clicking',()=>{const m=make(.5,.5);let previous=0,maxStep=0;for(let i=0;i<96000;i++){m.inputL[0]=.1*Math.sin(i*.014);m.inputL[2]=i<48000?-1:1;m.inputL[3]=Math.sin(i*.0001);m.targets[0]=i<24000?0:1;m.smooth();m.process(i);maxStep=Math.max(maxStep,Math.abs(m.outputL[0]-previous));previous=m.outputL[0];}expect(maxStep).toBeLessThan(.02);});
 it('rejects DC after settling and releases the longest material without freezing',()=>{const m=make(1,1,24000);let end=0;for(let i=0;i<24000*24;i++){m.inputL[1]=i===0?1:0;m.process(i);if(i>24000*23)end+=m.outputL[0]**2;}expect(end).toBeLessThan(1e-20);expect(m.outputL[0]).toBe(0);expect(m.outputL[1]).toBe(0);const dc=make();for(let i=0;i<48000*3;i++){dc.inputL[0]=.2;dc.process(i);}expect(Math.abs(dc.outputL[0])).toBeLessThan(1e-5);});
 it('is seed-reproducible and responds to COUPLE through sound, not a gain multiplier',()=>{const render=(c:number)=>{const m=make(.35,c,24000),out=[];for(let i=0;i<24000;i++){m.inputL[1]=i===0?1:0;m.process(i);if(i%23===0)out.push(m.outputL[0]);}return out;};expect(render(.55)).toEqual(render(.55));expect(render(0)).not.toEqual(render(.55));expect(render(.55)).not.toEqual(render(1));});
 it('persists independent instances and keeps audio cycle rules',()=>{const p=emptyPatch();p.modules.push(createModule('SYMPATHY',0,0,71,'a'),createModule('SYMPATHY',160,0,72,'b'),createModule('OUTPUT',320,0,73,'out'));connect(p,{module:'a',port:'audio'},{module:'b',port:'audio'});connect(p,{module:'b',port:'audio'},{module:'out',port:'audio'});expect(parsePatch(JSON.stringify(p))).toEqual(p);expect(()=>connect(p,{module:'b',port:'audio'},{module:'a',port:'audio'})).toThrow();const g=new DSPGraph(48000);g.setPatch(p);expect(g.modules.get('a')).not.toBe(g.modules.get('b'));});
});
