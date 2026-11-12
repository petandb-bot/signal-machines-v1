import {describe,it,expect} from 'vitest';
import {DSPGraph} from '../src/audio/DSPGraph';
import {Vca} from '../src/audio/modules/Vca';import {Shape} from '../src/audio/modules/Shape';import {Switch} from '../src/audio/modules/Switch';import {Chorus} from '../src/audio/modules/Chorus';import {Cloud} from '../src/audio/modules/Cloud';
import {createModule} from '../src/graph/PatchGraph';
import {breathingCircuit,forkedMemory,loopWeather} from '../src/state/presets';
import {parsePatch} from '../src/state/PatchStorage';
const SR=24000;
describe('amplitude, envelopes, routing and new effects',()=>{
  it('VCA defaults to manual gain, closes with a zero envelope and blends its two inputs',()=>{
    const state=createModule('VCA',0,0,1);state.params.level=1;const v=new Vca(state,SR,1);v.inputL[0]=v.inputR[0]=.2;v.inputL[1]=v.inputR[1]=-.3;for(let i=0;i<SR*.1;i++)v.process();expect(v.outputL[0]).toBeCloseTo(.2,5);
    v.inputConnected[2]=1;v.inputL[2]=0;for(let i=0;i<SR*.1;i++)v.process();expect(Math.abs(v.outputL[0])).toBeLessThan(1e-8);
    v.inputL[2]=1;state.params.blend=1;v.update(state);for(let i=0;i<SR*.4;i++){v.smooth();v.process();}expect(v.outputL[0]).toBeCloseTo(-.3,4);
  });
  it('SHAPE emits a real attack/decay and complementary inverse, retriggering without a jump',()=>{
    const state=createModule('SHAPE',0,0,1);state.params.rise=.4;state.params.fall=.4;const s=new Shape(state,SR,1);s.process(0);expect(s.outputL[0]).toBe(0);expect(s.outputL[1]).toBe(1);let peak=0;
    for(let i=1;i<SR*2;i++){s.inputL[0]=i===1?1:0;s.process(i);peak=Math.max(peak,s.outputL[0]);if(Math.abs(s.outputL[0]+s.outputL[1]-1)>1e-10)throw new Error('Non-complementary envelope');}
    expect(peak).toBe(1);expect(s.outputL[0]).toBe(0);expect(s.triggerSample).toBe(1);
    s.inputL[0]=1;s.process(SR*2);const before=s.outputL[0];s.inputL[0]=0;s.process(SR*2+1);s.inputL[0]=1;s.process(SR*2+2);expect(s.outputL[0]).toBeGreaterThan(before);expect(s.outputL[0]-before).toBeLessThan(.01);
  });
  it('SWITCH responds to seeded events and explicit SELECT overrides with a smooth route change',()=>{
    const state=createModule('SWITCH',0,0,13);state.params.chance=1;state.params.fade=0;const s=new Switch(state,SR,1);s.inputL[0]=.2;s.inputL[1]=-.2;s.process(0);expect(s.outputL[0]).toBe(.2);s.inputL[2]=1;s.process(1);s.inputL[2]=0;for(let i=0;i<100;i++)s.process(i+2);expect(s.outputL[0]).toBeCloseTo(-.2,8);
    s.inputConnected[3]=1;s.inputL[3]=0;for(let i=0;i<100;i++)s.process(i+200);expect(s.outputL[0]).toBeCloseTo(.2,8);
  });
  it('CHORUS is transparent at zero depth and creates real stereo movement',()=>{
    const state=createModule('CHORUS',0,0,1);state.params.depth=0;const dry=new Chorus(state,SR,1);state.params.depth=1;const wet=new Chorus(state,SR,1);let difference=0,stereo=0;
    for(let i=0;i<SR;i++){const n=Math.sin(i*.08)*.2;dry.inputL[0]=dry.inputR[0]=wet.inputL[0]=wet.inputR[0]=n;dry.process();wet.process();if(dry.outputL[0]!==n)throw new Error('Unexpected dry processing');difference+=Math.abs(wet.outputL[0]-n);stereo+=Math.abs(wet.outputL[0]-wet.outputR[0]);}expect(difference).toBeGreaterThan(100);expect(stereo).toBeGreaterThan(10);
  });
  it('CLOUD overlaps actual past sound, is seeded and its buffer eventually clears with silent input',()=>{
    const state=createModule('CLOUD',0,0,21),a=new Cloud(state,SR,71),b=new Cloud(state,SR,71);let tail=0;
    for(let i=0;i<SR*5;i++){const n=i<SR*.5?Math.sin(i*.09)*.2:0;a.inputL[0]=a.inputR[0]=b.inputL[0]=b.inputR[0]=n;a.process();b.process();if(a.outputL[0]!==b.outputL[0])throw new Error('Seed mismatch');if(i>SR*.5&&i<SR*2)tail+=a.outputL[0]**2;}
    expect(tail).toBeGreaterThan(1);expect(a.outputL[0]).toBe(0);expect(a.outputR[0]).toBe(0);
  });
  it.each([['BREATHING CIRCUIT',breathingCircuit],['FORKED MEMORY',forkedMemory],['LOOP WEATHER',loopWeather]] as const)('%s imports, produces finite audio and uses its real new modules',(_name,create)=>{
    const p=create();expect(parsePatch(JSON.stringify(p))).toEqual(p);const g=new DSPGraph(SR);g.setPatch(p);const l=new Float32Array(193),r=new Float32Array(193);let energy=0,peak=0;
    for(let n=0;n<SR*8;n+=193){g.process(l,r);for(let i=0;i<l.length;i++){if(!Number.isFinite(l[i])||!Number.isFinite(r[i]))throw new Error('Invalid audio');peak=Math.max(peak,Math.abs(l[i]),Math.abs(r[i]));energy+=l[i]**2+r[i]**2;}}
    expect(energy).toBeGreaterThan(.01);expect(peak).toBeLessThanOrEqual(.630001);expect(g.faults).toBe(0);if(p.name==='LOOP WEATHER')expect(g.modules.get('loop-1')!.telemetry().loop?.mode).toBe('playing');console.info(p.name,{peak,rms:Math.sqrt(energy/(Math.ceil(SR*8/193)*193*2))});
  });
  it.each([breathingCircuit,forkedMemory,loopWeather])('new presets remain deterministic across render blocks at maximum macros: %s',create=>{
    const p=create();for(const m of p.modules)for(const key of Object.keys(m.params))m.params[key]=1;
    const render=(sizes:number[])=>{const g=new DSPGraph(8000);g.setPatch(p);const out=new Float32Array(8000*8*2);let frame=0,block=0;while(frame<8000*8){const count=Math.min(sizes[block++%sizes.length],8000*8-frame),l=new Float32Array(count),r=new Float32Array(count);g.process(l,r);for(let i=0;i<count;i++){if(!Number.isFinite(l[i])||!Number.isFinite(r[i]))throw new Error('Invalid extreme output');out[(frame+i)*2]=l[i];out[(frame+i)*2+1]=r[i];}frame+=count;}expect(g.faults).toBe(0);return out;};
    const a=render([128]),b=render([17,193,64]);for(let i=0;i<a.length;i++){if(a[i]!==b[i])throw new Error(`Render quantum changed sample ${i}`);if(Math.abs(a[i])>.630001)throw new Error('Master overshoot');}
  });
});
