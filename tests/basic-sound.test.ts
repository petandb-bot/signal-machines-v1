import {describe,it,expect} from 'vitest';
import {Osc} from '../src/audio/modules/Osc';import {Noise} from '../src/audio/modules/Noise';import {Filter} from '../src/audio/modules/Filter';import {Ring} from '../src/audio/modules/Ring';import {Comb} from '../src/audio/modules/Comb';import {Shift} from '../src/audio/modules/Shift';import {Drone} from '../src/audio/modules/Drone';
import {DSPGraph} from '../src/audio/DSPGraph';import {createModule} from '../src/graph/PatchGraph';import {parsePatch} from '../src/state/PatchStorage';import {emptyPatch} from '../src/state/presets';import {shiftedHz} from '../src/audio/ToneMath';
const SR=24000,TAU=Math.PI*2;
function amplitude(samples:Float64Array,frequency:number,rate=SR){let a=0,b=0;for(let i=0;i<samples.length;i++){const p=TAU*frequency*i/rate;a+=samples[i]*Math.cos(p);b+=samples[i]*Math.sin(p);}return 2*Math.hypot(a,b)/samples.length;}
describe('basic sources and frequency-domain effects',()=>{
  it.each(['SINE','TRIANGLE','SAW','PULSE'])('OSC %s sounds without triggers and follows pitch CV',mode=>{
    const state=createModule('OSC',0,0,1);state.mode=mode;const o=new Osc(state,SR,1);o.inputL[0]=.5;const samples=new Float64Array(SR);for(let i=0;i<SR*2;i++){o.process();if(i>=SR)samples[i-SR]=o.outputL[0];expect(Number.isFinite(o.outputL[0])).toBe(true);}expect(amplitude(samples,440)).toBeGreaterThan(.05);expect(Math.abs(samples.reduce((a,b)=>a+b,0)/SR)).toBeLessThan(.003);
  });
  it('OSC suppresses naive saw aliasing and produces an uncoloured sine',()=>{
    const state=createModule('OSC',0,0,1);state.mode='SAW';state.params.tune=1;const o=new Osc(state,SR,1);o.inputL[0]=1;const processed=new Float64Array(SR),naive=new Float64Array(SR);
    for(let i=0;i<SR*2;i++){o.process();if(i>=SR){processed[i-SR]=o.outputL[0];naive[i-SR]=(2*((i*3520/SR)%1)-1)*.22*.7;}}
    expect(amplitude(processed,9920)).toBeLessThan(amplitude(naive,9920)*.5);
    const sineState=createModule('OSC',0,0,2),sine=new Osc(sineState,SR,1),signal=new Float64Array(SR);for(let i=0;i<SR;i++){sine.process();signal[i]=sine.outputL[0];}expect(amplitude(signal,220)).toBeCloseTo(.154,4);expect(amplitude(signal,440)).toBeLessThan(1e-10);
  });
  it('NOISE is seeded, stereo, and becomes progressively darker in PINK and BROWN',()=>{
    const differences:number[]=[];
    for(const mode of ['WHITE','PINK','BROWN']){const state=createModule('NOISE',0,0,55);state.mode=mode;const a=new Noise(state,SR,12),b=new Noise(state,SR,12);let change=0,energy=0,stereo=0,last=0;
      for(let i=0;i<SR*2;i++){a.process();b.process();if(a.outputL[0]!==b.outputL[0])throw new Error('Noise seed mismatch');if(i>SR){change+=(a.outputL[0]-last)**2;energy+=a.outputL[0]**2;stereo+=Math.abs(a.outputL[0]-a.outputR[0]);}last=a.outputL[0];}expect(energy).toBeGreaterThan(.1);expect(stereo).toBeGreaterThan(1);differences.push(change/energy);}
    expect(differences[1]).toBeLessThan(differences[0]*.6);expect(differences[2]).toBeLessThan(differences[1]*.1);
  });
  it.each(['LOW','BAND','HIGH'])('FILTER %s has the expected measured frequency response',mode=>{
    const gains=[100,600,4000].map(frequency=>{const state=createModule('FILTER',0,0,1);state.mode=mode;state.params.cutoff=Math.log(600/20)/Math.log(1000);state.params.resonance=0;const f=new Filter(state,SR,1),samples=new Float64Array(SR/2);for(let i=0;i<SR;i++){f.inputL[0]=f.inputR[0]=.02*Math.sin(TAU*frequency*i/SR);f.process();if(i>=SR/2)samples[i-SR/2]=f.outputL[0];}return amplitude(samples,frequency);});
    if(mode==='LOW')expect(gains[0]).toBeGreaterThan(gains[2]*15);else if(mode==='HIGH')expect(gains[2]).toBeGreaterThan(gains[0]*15);else{expect(gains[1]).toBeGreaterThan(gains[0]*2);expect(gains[1]).toBeGreaterThan(gains[2]*2);}
  });
  it('RING actually multiplies two external signals and retains independent stereo',()=>{
    const state=createModule('RING',0,0,1);state.params.mix=1;const r=new Ring(state,SR,1);r.inputConnected[1]=1;const signal=new Float64Array(SR);
    for(let i=0;i<SR;i++){const a=.2*Math.cos(TAU*650*i/SR),b=.2*Math.cos(TAU*150*i/SR);r.inputL[0]=a;r.inputR[0]=-a;r.inputL[1]=r.inputR[1]=b;r.process();signal[i]=r.outputL[0];if(Math.abs(r.outputL[0]+r.outputR[0])>1e-12)throw new Error('Stereo multiplication failed');}
    expect(amplitude(signal,500)).toBeCloseTo(.08,5);expect(amplitude(signal,800)).toBeCloseTo(.08,5);expect(amplitude(signal,650)).toBeLessThan(1e-10);
  });
  it('RING uses its carrier only with B unpatched and MIX zero is transparent',()=>{
    const state=createModule('RING',0,0,1);state.params.mix=0;const dry=new Ring(state,SR,1);dry.inputL[0]=.123;dry.process();expect(dry.outputL[0]).toBe(.123);
    state.params.mix=1;state.params.rate=Math.log(200/.5)/Math.log(10000);const ring=new Ring(state,SR,1),signal=new Float64Array(SR);for(let i=0;i<SR;i++){ring.inputL[0]=.2*Math.cos(TAU*650*i/SR);ring.process();signal[i]=ring.outputL[0];}expect(amplitude(signal,450)).toBeCloseTo(.1,4);expect(amplitude(signal,850)).toBeCloseTo(.1,4);
  });
  it('COMB rings from an actual input impulse, tunes its resonance and PLUCK excites silence',()=>{
    const state=createModule('COMB',0,0,7);state.params.decay=.8;const c=new Comb(state,SR,1),signal=new Float64Array(SR);let early=0,late=0;
    for(let i=0;i<SR*2;i++){c.inputL[0]=c.inputR[0]=i===0?.5:0;c.process(i);if(i<SR/2)early+=c.outputL[0]**2;if(i>=SR){signal[i-SR]=c.outputL[0];late+=c.outputL[0]**2;}}
    expect(early).toBeGreaterThan(late);expect(late).toBeGreaterThan(1e-7);expect(amplitude(signal,220)).toBeGreaterThan(amplitude(signal,237)*20);
    const pluck=new Comb(state,SR,1);pluck.inputL[3]=1;let energy=0;for(let i=0;i<SR;i++){pluck.process(i);pluck.inputL[3]=0;energy+=pluck.outputL[0]**2;}expect(energy).toBeGreaterThan(.01);expect(pluck.triggerSample).toBe(0);
  });
  it.each([.3,.7])('SHIFT %s moves two tones by the same Hz and rejects the image sideband',shift=>{
    const state=createModule('SHIFT',0,0,1);state.params.shift=shift;state.params.mix=1;const shifter=new Shift(state,SR,1),signal=new Float64Array(SR),delta=shiftedHz(shift);
    for(let i=0;i<SR*2;i++){shifter.inputL[0]=.1*Math.cos(TAU*1000*i/SR)+.1*Math.cos(TAU*2300*i/SR);shifter.inputR[0]=0;shifter.process();if(i>=SR)signal[i-SR]=shifter.outputL[0];}
    for(const tone of [1000,2300]){expect(amplitude(signal,tone+delta)).toBeGreaterThan(.095);expect(amplitude(signal,tone-delta)).toBeLessThan(.002);expect(amplitude(signal,tone)).toBeLessThan(.001);}expect(shifter.outputR[0]).toBe(0);
  });
  it('SHIFT MIX zero is sample-transparent and no effect creates a signal from silence',()=>{
    const state=createModule('SHIFT',0,0,1);state.params.mix=0;const dry=new Shift(state,SR,1);dry.inputL[0]=.123;dry.process();expect(dry.outputL[0]).toBe(.123);
    for(const instance of [new Filter(createModule('FILTER',0,0,1),SR,1),new Ring(createModule('RING',0,0,1),SR,1),new Comb(createModule('COMB',0,0,1),SR,1),new Shift(createModule('SHIFT',0,0,1),SR,1)]){for(let i=0;i<1000;i++)instance.process(i);expect(instance.outputL[0]).toBe(0);}
  });
  it('DRONE octave modes raise the measured fundamental while legacy patches retain 55 Hz',()=>{
    for(const [mode,frequency] of [[undefined,55],['110 Hz',110],['220 Hz',220]] as const){const state=createModule('DRONE',0,0,7);state.params.spread=0;state.params.color=0;state.mode=mode;const d=new Drone(state,SR,1),signal=new Float64Array(SR);for(let i=0;i<SR*2;i++){d.process();if(i>=SR)signal[i-SR]=d.outputL[0];}expect(amplitude(signal,frequency)).toBeGreaterThan(.005);expect(amplitude(signal,frequency*1.5)).toBeLessThan(.001);}
  });
  it('validates modes, preserves them in JSON and keeps live mode changes across a queued rewire',()=>{
    const patch=emptyPatch(),module=createModule('OSC',0,0,1,'osc');module.mode='PULSE';patch.modules=[module];expect(parsePatch(JSON.stringify(patch))).toEqual(patch);const g=new DSPGraph(SR);g.setPatch(patch);g.process(new Float32Array(512),new Float32Array(512));g.setPatch(structuredClone(patch));module.mode='TRIANGLE';g.updateParameters(patch);for(let i=0;i<8;i++)g.process(new Float32Array(128),new Float32Array(128));expect(g.modules.get('osc')!.selectedMode).toBe('TRIANGLE');module.mode='INVALID';expect(()=>parsePatch(JSON.stringify(patch))).toThrow('mode');
    const old=emptyPatch();old.modules=[createModule('DRONE',0,0,2)];expect(parsePatch(JSON.stringify(old))).toEqual(old);
  });
});
