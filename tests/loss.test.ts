import {describe,it,expect} from 'vitest';
import {Loss} from '../src/audio/modules/Loss';
import {createModule} from '../src/graph/PatchGraph';
const make=(damage=.35,recover=.6,rate=48000,seed=7)=>{const s=createModule('LOSS',0,0,seed);s.params={damage,recover};return new Loss(s,rate,91);};
function render(d:number,r:number,rate=48000,amp=.1,seed=7){const m=make(d,r,rate,seed),wave=new Float32Array(rate),bands=[];let peak=0,energy=0;for(let i=0;i<rate;i++){m.inputL[0]=amp*(Math.sin(i*.03)+Math.sin(i*.27)*.4);m.inputR[0]=m.inputL[0]*.5;m.process();wave[i]=m.outputL[0];if(i%997===0)bands.push(m.a);peak=Math.max(peak,Math.abs(m.outputL[0]));energy+=m.outputL[0]**2;if(Math.abs(m.outputR[0]-m.outputL[0]*.5)>1e-8)throw Error('stereo mask mismatch');}return {wave,peak,energy,bands};}
describe('LOSS selective packet erasure',()=>{
  it('DAMAGE=0 is exact stereo, RECOVER does not act as a wet mix',()=>{
    for(const recover of [0,.5,1]){const m=make(0,recover);for(let i=0;i<4000;i++){m.inputL[0]=Math.sin(i*.21)*.3;m.inputR[0]=Math.cos(i*.17)*.2;m.process();expect(m.outputL[0]).toBe(m.inputL[0]);expect(m.outputR[0]).toBe(m.inputR[0]);}}
    expect(render(.8,0).wave).not.toEqual(render(.8,1).wave);
  });
  it.each([44100,48000])('handles every macro corner, quiet input, silence and seed at %i',rate=>{
    for(const d of [0,.5,1])for(const r of [0,.5,1]){const a=render(d,r,rate);expect(a.peak).toBeLessThan(.5);expect(a.energy).toBeGreaterThan(.1);}
    const quiet=render(.7,.6,rate,.00001);expect(quiet.energy).toBeGreaterThan(1e-8);expect(quiet.wave).not.toEqual(render(0,.6,rate,.00001).wave);
    expect(render(.8,.6,rate,.1,7).wave).toEqual(render(.8,.6,rate,.1,7).wave);expect(render(.8,.6,rate,.1,7).wave).not.toEqual(render(.8,.6,rate,.1,8).wave);
    const m=make(1,1,rate);for(let i=0;i<rate;i++)m.process();expect(m.outputL[0]).toBe(0);
  });
  it('shares erasures across stereo and recovers from invalid wires and moving CV',()=>{
    const m=make();let last=0,step=0;for(let i=0;i<96000;i++){m.inputL[0]=i===3?NaN:i===4?Infinity:.1*Math.sin(i*.025);m.inputR[0]=m.inputL[0]*.5;m.inputL[1]=Math.sin(i*.0001);m.inputL[2]=Math.cos(i*.0002);m.process();if(!Number.isFinite(m.outputL[0]))throw Error('poisoned decoder');step=Math.max(step,Math.abs(m.outputL[0]-last));last=m.outputL[0];}expect(step).toBeLessThan(.12);expect(m.telemetry().bands).toHaveLength(3);
  });
});
