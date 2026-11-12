import {describe,it,expect} from 'vitest';
import {createModule} from '../src/graph/PatchGraph';
import {Osc} from '../src/audio/modules/Osc';import {Output} from '../src/audio/modules/Output';
import {DSPGraph} from '../src/audio/DSPGraph';import {emptyPatch} from '../src/state/presets';import {parsePatch} from '../src/state/PatchStorage';import {WIDE_TYPES} from '../src/graph/definitions';import {tunedHz} from '../src/audio/ToneMath';
describe('explicit broad frequency ranges with legacy defaults',()=>{
  it.each([6,12000])('WIDE OSC produces a measured %s Hz tone',frequency=>{
    const state=createModule('OSC',0,0,1);state.wide=true;state.params.tune=Math.log(frequency/.05)/Math.log(480000);const o=new Osc(state,48000,1);let sin=0,cos=0;
    for(let i=0;i<48000;i++){o.process();sin+=o.outputL[0]*Math.sin(2*Math.PI*frequency*i/48000);cos+=o.outputL[0]*Math.cos(2*Math.PI*frequency*i/48000);}
    expect(Math.hypot(sin,cos)*2/48000).toBeCloseTo(.154,5);
  });
  it('opens nominal tune from .05 Hz to 24 kHz, while standard tuning remains 55–880 Hz',()=>{expect(tunedHz(0,0,true)).toBe(.05);expect(tunedHz(1,0,true)).toBe(24000);expect(tunedHz(0)).toBe(55);expect(tunedHz(1)).toBe(880);expect(tunedHz(.5,1,true)/tunedHz(.5,0,true)).toBe(256);});
  it('WIDE OUTPUT retains six-hertz motion instead of applying the standard bass rolloff',()=>{
    const levels=[false,true].map(wide=>{const s=createModule('OUTPUT',0,0,1);s.wide=wide;const out=new Output(s,48000,1);let energy=0;for(let i=0;i<96000;i++){out.inputL[0]=out.inputR[0]=.1*Math.sin(2*Math.PI*6*i/48000);out.process();if(i>=48000)energy+=out.outputL[0]**2;}return energy;});expect(levels[1]).toBeGreaterThan(levels[0]*20);
  });
  it('preserves validated range choices, queued updates and standard legacy JSON',()=>{const p=emptyPatch(),osc=createModule('OSC',0,0,1,'osc');p.modules=[osc];expect(parsePatch(JSON.stringify(p))).toEqual(p);osc.wide=true;expect(parsePatch(JSON.stringify(p))).toEqual(p);const g=new DSPGraph(48000);g.setPatch(p);g.process(new Float32Array(512),new Float32Array(512));g.setPatch(structuredClone(p));osc.wide=false;g.updateParameters(p);for(let i=0;i<8;i++)g.process(new Float32Array(128),new Float32Array(128));expect(g.modules.get('osc')!.wide).toBe(false);osc.wide='invalid' as unknown as boolean;expect(()=>parsePatch(JSON.stringify(p))).toThrow('range');p.modules=[{...createModule('NOISE',0,0,2),wide:true}];expect(()=>parsePatch(JSON.stringify(p))).toThrow('range');});
  it('keeps every wide source finite at extreme pitch/tune values and several sample rates',()=>{
    for(const rate of [8000,44100,48000,96000])for(const type of WIDE_TYPES){const p=emptyPatch(),s=createModule(type,0,0,1,type.toLowerCase());s.wide=true;for(const key of Object.keys(s.params))s.params[key]=1;p.modules=[s];const g=new DSPGraph(rate);g.setPatch(p);const dsp=g.modules.get(s.id)!;dsp.inputL.fill(1);dsp.inputR.fill(1);for(let i=0;i<rate/4;i++){dsp.process(i,120);for(const n of dsp.outputL)if(!Number.isFinite(n))throw new Error(`${type} at ${rate}`);}}
  });
});
