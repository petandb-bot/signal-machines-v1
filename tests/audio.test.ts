import { describe, expect, it } from 'vitest';
import { DSPGraph } from '../src/audio/DSPGraph';
import { Chamber } from '../src/audio/modules/Chamber';
import { createModule, connect, removeModule } from '../src/graph/PatchGraph';
import { metalDrift } from '../src/state/presets';
const SR=24000;
function render(graph:DSPGraph,seconds:number,block=127){
  let peak=0,energy=0,delta=0,previous=0;const length=Math.round(seconds*SR);const left=new Float32Array(block),right=new Float32Array(block);
  for(let n=0;n<length;n+=block){const count=Math.min(block,length-n);const l=count===block?left:left.subarray(0,count),r=count===block?right:right.subarray(0,count);graph.process(l,r);
    for(let i=0;i<count;i++){if(!Number.isFinite(l[i])||!Number.isFinite(r[i]))throw new Error('Nonfinite audio');peak=Math.max(peak,Math.abs(l[i]),Math.abs(r[i]));energy+=l[i]**2+r[i]**2;delta=Math.max(delta,Math.abs(l[i]-previous));previous=l[i];}
  }return{peak,rms:Math.sqrt(energy/(length*2)),delta};
}
function graph(){const g=new DSPGraph(SR);g.setPatch(metalDrift());return g;}
describe('real AudioWorklet DSP, rendered offline',()=>{
  it('produces finite stereo audio from the required METAL DRIFT patch',()=>{const g=graph();const stats=render(g,8);expect(stats.rms).toBeGreaterThan(.005);expect(stats.peak).toBeLessThanOrEqual(.63);expect(g.faults).toBe(0);const telemetry=g.telemetry();expect(telemetry.modules['pulse-1'].triggerSample).toBeGreaterThan(0);expect(telemetry.modules['chamber-1'].wave.some(x=>x!==0)).toBe(true);console.info('METAL DRIFT / 8 s / 24 kHz',stats);});
  it('is seeded and independent of render quantum length',()=>{
    const a=graph(),b=graph();const outA=new Float32Array(SR*2),outB=new Float32Array(SR*2),r=new Float32Array(257);
    for(let n=0;n<outA.length;n+=64)a.process(outA.subarray(n,n+64),new Float32Array(Math.min(64,outA.length-n)));
    for(let n=0;n<outB.length;n+=257)b.process(outB.subarray(n,n+257),r.subarray(0,Math.min(257,outB.length-n)));
    expect(outA).toEqual(outB);
  });
  it('routes FLOCK into the actual ALLOY tension macro',()=>{
    const modulated=graph();render(modulated,1);const withControl=modulated.telemetry().modules['alloy-1'].b;
    const patch=metalDrift();patch.connections=patch.connections.filter(e=>e.from.module!=='flock-1');const dry=new DSPGraph(SR);dry.setPatch(patch);render(dry,1);const withoutControl=dry.telemetry().modules['alloy-1'].b;
    expect(Math.abs(withControl-withoutControl)).toBeGreaterThan(.05);
  });
  it('stays silent until a trigger reaches ALLOY',()=>{const patch=metalDrift();patch.connections=patch.connections.filter(e=>e.from.module!=='pulse-1');const g=new DSPGraph(SR);g.setPatch(patch);expect(render(g,2).peak).toBe(0);});
  it('sums and clamps several controls consistently',()=>{
    const patch=metalDrift();connect(patch,{module:'flock-1',port:'controlB'},{module:'alloy-1',port:'tension'});const g=new DSPGraph(SR);g.setPatch(patch);render(g,4);const flock=g.modules.get('flock-1')!,alloy=g.modules.get('alloy-1')!;
    expect(alloy.inputL[3]).toBeCloseTo(Math.min(1,Math.max(-1,flock.a+flock.b)),10);expect(alloy.b).toBeGreaterThanOrEqual(0);expect(alloy.b).toBeLessThanOrEqual(1);
  });
  it('fades live cable changes and preserves surviving DSP instances',()=>{
    const patch=metalDrift();const g=new DSPGraph(SR);g.setPatch(patch);render(g,1);const old=g.modules.get('alloy-1');patch.connections=patch.connections.filter(e=>e.from.module!=='flock-1');g.setPatch(patch);render(g,.1);expect(g.modules.get('alloy-1')).toBe(old);
    removeModule(patch,'chamber-1');g.setPatch(patch);const stats=render(g,.2);expect(stats.delta).toBeLessThan(.15);expect(g.modules.has('chamber-1')).toBe(false);expect(render(g,.1).peak).toBeLessThan(1e-10);
  });
  it('retains the latest parameter edit during a routing transaction',()=>{
    const patch=metalDrift();const g=new DSPGraph(SR);g.setPatch(patch);render(g,.1);g.setPatch(structuredClone(patch));patch.modules.find(m=>m.type==='ALLOY')!.params.tension=.99;g.updateParameters(patch);render(g,.1);expect(g.modules.get('alloy-1')!.targets[1]).toBe(.99);
  });
  it.each(['SOFT','METAL','ROUGH'] as const)('protects the output at extreme settings in %s mode',mode=>{
    const patch=metalDrift();patch.master=1;patch.bpm=300;for(const m of patch.modules){for(const key of Object.keys(m.params))m.params[key]=1;m.character=mode;}
    const extra=createModule('OUTPUT',0,0,3);extra.params.level=1;patch.modules.push(extra);connect(patch,{module:'chamber-1',port:'audio'},{module:extra.id,port:'audio'});
    const g=new DSPGraph(SR);g.setPatch(patch);const stats=render(g,6,193);expect(stats.peak).toBeLessThanOrEqual(.630001);expect(stats.rms).toBeGreaterThan(0);expect(g.faults).toBe(0);
  });
  it('has a stable stereo CHAMBER tail with bounded feedback',()=>{
    const state=createModule('CHAMBER',0,0,1);state.params.size=1;state.params.density=1;const chamber=new Chamber(state,SR,1);let early=0,late=0,stereoDifference=0,peak=0;
    for(let i=0;i<SR*30;i++){chamber.inputL[0]=chamber.inputR[0]=i===0?1:0;chamber.process();const l=chamber.outputL[0],r=chamber.outputR[0];if(!Number.isFinite(l)||!Number.isFinite(r))throw new Error('Nonfinite chamber tail');peak=Math.max(peak,Math.abs(l),Math.abs(r));if(i<SR*5)early+=l*l+r*r;if(i>SR*25)late+=l*l+r*r;stereoDifference+=Math.abs(l-r);}
    expect(peak).toBeLessThan(1);expect(stereoDifference).toBeGreaterThan(.01);expect(late).toBeLessThan(early*.001);
  });
  it('sanitizes nonfinite DSP output and reports a fault',()=>{const g=graph();g.modules.get('alloy-1')!.process=()=>{g.modules.get('alloy-1')!.outputL[0]=Infinity;g.modules.get('alloy-1')!.outputR[0]=NaN;};expect(render(g,.01).peak).toBe(0);expect(g.faults).toBeGreaterThan(0);});
});
