import {describe,it,expect} from 'vitest';
import {Mirage} from '../src/audio/modules/Mirage';
import {createModule} from '../src/graph/PatchGraph';
import {parsePatch} from '../src/state/PatchStorage';
import {emptyPatch} from '../src/state/presets';
const make=(distance=.42,mutate=.48,rate=48000,seed=7)=>{const s=createModule('MIRAGE',0,0,seed);s.params={distance,mutate};return new Mirage(s,rate,91);};
describe('MIRAGE independent packet echoes',()=>{
  it.each([44100,48000])('changes returning generations and decays at %i Hz',rate=>{
    const m=make(.3,.8,rate);let early=0,late=0,last=0,step=0;
    for(let i=0;i<rate*12;i++){m.inputL[0]=i<rate*.02?.2*Math.sin(i*.23):0;m.inputR[0]=m.inputL[0]*.6;m.process();if(i>rate*.2&&i<rate*3)early+=m.outputL[0]**2;if(i>rate*11)late+=m.outputL[0]**2;step=Math.max(step,Math.abs(m.outputL[0]-last));last=m.outputL[0];}
    expect(early).toBeGreaterThan(.001);expect(late).toBeLessThan(early*.0001);expect(step).toBeLessThan(.15);expect(m.telemetry().bands).toHaveLength(3);
  });
  it('keeps stereo isolation, silence and finite state at all macro corners',()=>{
    for(const d of [0,.5,1])for(const u of [0,.5,1])for(const rate of [44100,48000]){const m=make(d,u,rate);for(let i=0;i<rate*1.4;i++){m.inputL[0]=i<100?.5*Math.sin(i*.1):0;m.process();if(!Number.isFinite(m.outputL[0])||Math.abs(m.outputL[0])>2)throw Error('bad echo');if(m.outputR[0]!==0)throw Error('stereo leak');}}
    const silent=make();for(let i=0;i<10000;i++)silent.process();expect(silent.outputL[0]).toBe(0);
  });
  it('accepts continuous CV and invalid input without poisoning later echoes',()=>{
    const m=make();let last=0,step=0;for(let i=0;i<96000;i++){m.inputL[0]=i===1?NaN:i===2?Infinity:.1*Math.sin(i*.03);m.inputR[0]=-m.inputL[0];m.inputL[1]=Math.sin(i*.0001);m.inputL[2]=Math.cos(i*.0002);m.process();expect(Number.isFinite(m.outputL[0])).toBe(true);step=Math.max(step,Math.abs(m.outputL[0]-last));last=m.outputL[0];}expect(step).toBeLessThan(.16);
  });
  it('macros have distinct output effects and instances have independent memory',()=>{
    const render=(d:number,u:number)=>{const m=make(d,u,8000),out=[];for(let i=0;i<16000;i++){m.inputL[0]=i<100?.2*Math.sin(i*.2):0;m.process();out.push(m.outputL[0]);}return out;};
    expect(render(.2,0)).not.toEqual(render(.7,0));expect(render(.2,0)).not.toEqual(render(.2,1));expect(render(.2,1)).toEqual(render(.2,1));
    const p=emptyPatch();p.modules.push(createModule('MIRAGE',0,0,7));expect(parsePatch(JSON.stringify(p))).toEqual(p);
  });
});
