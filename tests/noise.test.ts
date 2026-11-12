import {describe,it,expect} from 'vitest';
import {Venom} from '../src/audio/modules/Venom';
import {Snap} from '../src/audio/modules/Snap';
import {Caustic} from '../src/audio/modules/Caustic';
import {DSPGraph} from '../src/audio/DSPGraph';
import {createModule} from '../src/graph/PatchGraph';
import {badContact} from '../src/state/presets';
import {parsePatch} from '../src/state/PatchStorage';
const SR=24000;
describe('noise, corrosion and interrupted signals',()=>{
  it('VENOM is silent at zero dose and generates actual seeded stereo noise otherwise',()=>{
    const state=createModule('VENOM',0,0,171);state.params.dose=0;const silent=new Venom(state,SR,44);
    for(let i=0;i<1000;i++){silent.process(i);if(silent.outputL[0]!==0||silent.outputR[0]!==0)throw new Error('Zero dose must be silent.');}
    state.params.dose=.9;const a=new Venom(state,SR,44),b=new Venom(state,SR,44),c=new Venom(state,SR,45);let energy=0,difference=0,stereo=0;
    for(let i=0;i<SR;i++){a.process(i);b.process(i);c.process(i);if(a.outputL[0]!==b.outputL[0])throw new Error('Seed mismatch');energy+=a.outputL[0]**2;difference+=Math.abs(a.outputL[0]-c.outputL[0]);stereo+=Math.abs(a.outputL[0]-a.outputR[0]);}
    expect(energy).toBeGreaterThan(1);expect(difference).toBeGreaterThan(1);expect(stereo).toBeGreaterThan(1);
  });
  it('VENOM reacts to triggers and its dose control input',()=>{
    const state=createModule('VENOM',0,0,53);const burst=new Venom(state,SR,1),base=new Venom(state,SR,1);let burstEnergy=0,baseEnergy=0;
    for(let i=0;i<SR*.15;i++){burst.inputL[0]=i===0?1:0;burst.process(i);base.process(i);burstEnergy+=burst.outputL[0]**2;baseEnergy+=base.outputL[0]**2;}
    expect(burstEnergy).toBeGreaterThan(baseEnergy*2);expect(burst.triggerSample).toBe(0);
    base.inputL[1]=-1;base.process(SR);expect(base.a).toBeCloseTo(state.params.dose-.5);
  });
  it('SNAP passes through at zero FAULT, but a trigger explicitly breaks and recovers the contact',()=>{
    const state=createModule('SNAP',0,0,22);state.params.fault=0;state.params.recover=.8;const snap=new Snap(state,SR,91);snap.inputL[0]=.2;snap.inputR[0]=-.1;
    snap.process(0);expect(snap.outputL[0]).toBe(.2);expect(snap.outputR[0]).toBe(-.1);
    snap.inputL[2]=1;
    for(let i=1;i<SR*.05;i++)snap.process(i);
    expect(Math.abs(snap.outputL[0])).toBeLessThan(.001);expect(snap.a).toBeLessThan(.001);expect(snap.triggerSample).toBe(1);
    for(let i=0;i<SR*2;i++)snap.process(i+SR);
    expect(snap.a).toBeGreaterThan(.999);expect(snap.outputL[0]).toBeCloseTo(.2,8);expect(snap.triggerSample).toBe(1);
  });
  it('SNAP creates seeded dropouts without a full-scale discontinuity',()=>{
    const state=createModule('SNAP',0,0,31);state.params.fault=1;state.params.recover=.2;const a=new Snap(state,SR,5),b=new Snap(state,SR,5);let closed=0,open=0,maxDelta=0,previous=.2;
    for(let i=0;i<SR*4;i++){a.inputL[0]=b.inputL[0]=.2;a.process(i);b.process(i);if(a.outputL[0]!==b.outputL[0])throw new Error('Seed mismatch');if(a.a<.1)closed++;if(a.a>.9)open++;maxDelta=Math.max(maxDelta,Math.abs(a.outputL[0]-previous));previous=a.outputL[0];}
    expect(closed).toBeGreaterThan(SR);expect(open).toBeGreaterThan(SR*.5);expect(maxDelta).toBeLessThan(.04);
  });
  it('SNAP does not generate an independent noise source from silent input',()=>{const state=createModule('SNAP',0,0,3);state.params.fault=1;const snap=new Snap(state,SR,9);for(let i=0;i<SR;i++){snap.inputL[2]=i%1000===0?1:0;snap.process(i);if(snap.outputL[0]!==0||snap.outputR[0]!==0)throw new Error('Unexpected sound without input');}});
  it('CAUSTIC is transparent at BURN zero and develops different harmonics when driven',()=>{
    const state=createModule('CAUSTIC',0,0,5);state.params.burn=0;const clean=new Caustic(state,SR,1);state.params.burn=.9;const burnt=new Caustic(state,SR,1);let difference=0;
    for(let i=0;i<SR;i++){const input=Math.sin(i*2*Math.PI*173/SR)*.2;clean.inputL[0]=clean.inputR[0]=burnt.inputL[0]=burnt.inputR[0]=input;clean.process();burnt.process();if(clean.outputL[0]!==input)throw new Error('Unexpected dry processing');difference+=Math.abs(input-burnt.outputL[0]);}
    expect(difference).toBeGreaterThan(500);expect(burnt.b).toBeLessThan(1);
  });
  it('CAUSTIC remains finite at extreme drive and settles after its source stops',()=>{
    const state=createModule('CAUSTIC',0,0,91);state.params.burn=state.params.starve=1;const caustic=new Caustic(state,SR,1);let peak=0;
    for(let i=0;i<SR*3;i++){caustic.inputL[0]=i<SR?Math.sin(i*.1)*4:0;caustic.inputR[0]=i<SR?Math.cos(i*.07)*4:0;caustic.process();if(!Number.isFinite(caustic.outputL[0])||!Number.isFinite(caustic.outputR[0]))throw new Error('Invalid folded output');peak=Math.max(peak,Math.abs(caustic.outputL[0]),Math.abs(caustic.outputR[0]));}
    expect(peak).toBeLessThan(1);expect(Math.abs(caustic.outputL[0])).toBeLessThan(1e-8);expect(Math.abs(caustic.outputR[0])).toBeLessThan(1e-8);
  });
  it('BAD CONTACT serializes and renders bounded, nonzero audio including modulation',()=>{
    const patch=badContact();expect(parsePatch(JSON.stringify(patch))).toEqual(patch);const graph=new DSPGraph(SR);graph.setPatch(patch);const left=new Float32Array(257),right=new Float32Array(257);let energy=0,peak=0;
    for(let i=0;i<SR*8;i+=257){graph.process(left,right);for(let j=0;j<257;j++){if(!Number.isFinite(left[j])||!Number.isFinite(right[j]))throw new Error('Invalid master output');energy+=left[j]**2+right[j]**2;peak=Math.max(peak,Math.abs(left[j]),Math.abs(right[j]));}}
    expect(energy).toBeGreaterThan(1);expect(peak).toBeLessThanOrEqual(.630001);expect(graph.faults).toBe(0);expect(graph.modules.get('snap-1')!.targets[0]).toBe(.58);console.info('BAD CONTACT / 8 s / 24 kHz',{peak,rms:Math.sqrt(energy/(Math.ceil(SR*8/257)*257*2))});
  });
  it('the expanded graph stays deterministic with variable render quantum lengths',()=>{
    const patch=badContact(),a=new DSPGraph(SR),b=new DSPGraph(SR);a.setPatch(patch);b.setPatch(patch);const one=new Float32Array(SR*2),two=new Float32Array(SR*2),r1=new Float32Array(31),r2=new Float32Array(193);
    for(let i=0;i<one.length;i+=31)a.process(one.subarray(i,i+31),r1.subarray(0,Math.min(31,one.length-i)));
    for(let i=0;i<two.length;i+=193)b.process(two.subarray(i,i+193),r2.subarray(0,Math.min(193,two.length-i)));
    expect(one).toEqual(two);
  });
  it('contains the master output when all hazardous macros and modulation are at maximum',()=>{
    const patch=badContact();patch.master=1;patch.bpm=300;for(const module of patch.modules)for(const key of Object.keys(module.params))module.params[key]=1;
    const graph=new DSPGraph(SR);graph.setPatch(patch);const left=new Float32Array(193),right=new Float32Array(193);let peak=0;
    for(let i=0;i<SR*10;i+=193){graph.process(left,right);for(let j=0;j<193;j++){if(!Number.isFinite(left[j])||!Number.isFinite(right[j]))throw new Error('Nonfinite extreme output');peak=Math.max(peak,Math.abs(left[j]),Math.abs(right[j]));}}
    expect(peak).toBeGreaterThan(0);expect(peak).toBeLessThanOrEqual(.630001);expect(graph.faults).toBe(0);
  });

});
