import {describe,it,expect} from 'vitest';
import {DSPGraph} from '../src/audio/DSPGraph';
import {Branch} from '../src/audio/modules/Branch';
import {Reson} from '../src/audio/modules/Reson';
import {Fracture} from '../src/audio/modules/Fracture';
import {createModule,connect} from '../src/graph/PatchGraph';
import {emptyChamber,unevenMemory,metalDrift} from '../src/state/presets';
import {parsePatch} from '../src/state/PatchStorage';
const SR=24000;
function render(g:DSPGraph,seconds:number){const l=new Float32Array(193),r=new Float32Array(193);let energy=0,peak=0;for(let n=0;n<SR*seconds;n+=193){g.process(l,r);for(let i=0;i<193;i++){if(!Number.isFinite(l[i])||!Number.isFinite(r[i]))throw new Error('Nonfinite output');energy+=l[i]*l[i]+r[i]*r[i];peak=Math.max(peak,Math.abs(l[i]),Math.abs(r[i]));}}return{peak,rms:Math.sqrt(energy/(Math.ceil(SR*seconds/193)*193*2))};}
describe('expanded modules and playable presets',()=>{
  it.each([['UNEVEN MEMORY',unevenMemory],['EMPTY CHAMBER',emptyChamber]] as const)('%s serializes and generates protected stereo audio',(_name,create)=>{const p=create();expect(parsePatch(JSON.stringify(p))).toEqual(p);const g=new DSPGraph(SR);g.setPatch(p);const result=render(g,8);expect(result.rms).toBeGreaterThan(.0001);expect(result.peak).toBeLessThanOrEqual(.630001);expect(g.faults).toBe(0);console.info(p.name,result);});
  it('BRANCH repeats a phrase before mutating, stays in scale and is seeded',()=>{
    const state=createModule('BRANCH',0,0,733);state.params.change=1;state.params.memory=0;
    const a=new Branch(state,SR,91),b=new Branch(state,SR,91),notes:number[]=[];let gates=0;
    for(let i=0;i<512;i++){
      a.inputL[0]=b.inputL[0]=1;a.process(i*2);b.process(i*2);notes.push(a.outputL[0]);gates+=a.outputL[1];expect(a.outputL).toEqual(b.outputL);
      expect([-12,-9,-7,-5,-2,0,3,5,7,10,12,15,17,19,22]).toContain(Math.round(a.outputL[0]*24));
      a.inputL[0]=b.inputL[0]=0;a.process(i*2+1);b.process(i*2+1);
    }
    expect(notes.slice(0,8)).toEqual(notes.slice(8,16));expect(gates).toBeGreaterThan(300);expect(gates).toBeLessThan(512);expect(new Set(notes).size).toBeGreaterThan(3);expect(notes.some((note,i)=>i>16&&note!==notes[i%8])).toBe(true);
  });
  it('BRANCH requires a rising clock and does not emit gates while held high',()=>{const branch=new Branch(createModule('BRANCH',0,0,4),SR,8);branch.inputL[0]=1;branch.process(0);branch.process(1);expect(branch.outputL[1]).toBe(0);expect(branch.telemetry().wave).toHaveLength(8);});
  it('RESON sounds from a trigger, has a decaying tail and responds to external excitation',()=>{
    const reson=new Reson(createModule('RESON',0,0,7),SR,1);let early=0,late=0,peak=0;
    for(let i=0;i<SR*12;i++){reson.inputL[0]=i===0?1:0;reson.process(i);const sample=reson.outputL[0];if(!Number.isFinite(sample))throw new Error('Nonfinite modal state');peak=Math.max(peak,Math.abs(sample));if(i<SR*2)early+=sample*sample;if(i>SR*10)late+=sample*sample;}
    expect(early).toBeGreaterThan(.01);expect(late).toBeLessThan(early*.001);expect(peak).toBeLessThan(1);
    const external=new Reson(createModule('RESON',0,0,7),SR,1);external.inputL[2]=external.inputR[2]=.6;external.process(0);expect(Math.abs(external.outputL[0])).toBeGreaterThan(0);
  });
  it('FRACTURE is transparent at BREAK zero',()=>{const state=createModule('FRACTURE',0,0,1);state.params.break=0;const f=new Fracture(state,SR,1);for(let i=0;i<SR;i++){f.inputL[0]=Math.sin(i*.03)*.2;f.inputR[0]=Math.cos(i*.03)*.1;f.process(i);expect(f.outputL[0]).toBe(f.inputL[0]);expect(f.outputR[0]).toBe(f.inputR[0]);}});
  it('FRACTURE captures real audio and HOLD freezes the fragment after the source ends',()=>{
    const state=createModule('FRACTURE',0,0,23);state.params.break=.8;state.params.hold=.2;const f=new Fracture(state,SR,51);let frozenEnergy=0,maxDelta=0,previous=0;
    for(let i=0;i<SR*4;i++){
      if(i===SR){state.params.hold=1;f.update(state);}
      f.smooth();f.inputL[0]=f.inputR[0]=i<SR?Math.sin(i*2*Math.PI*173/SR)*.2:0;f.process(i);
      const sample=f.outputL[0];if(!Number.isFinite(sample))throw new Error('Invalid fragment');if(i>SR*2)frozenEnergy+=sample*sample;
      if(i!==SR)maxDelta=Math.max(maxDelta,Math.abs(sample-previous));previous=sample;
    }
    expect(frozenEnergy).toBeGreaterThan(.1);expect(maxDelta).toBeLessThan(.03);expect(f.b).toBeGreaterThan(.7);
  });
  it('mixes all eight module types safely with multiple instances at extreme settings',()=>{
    const p=metalDrift();const branch=createModule('BRANCH',0,0,1),reson=createModule('RESON',0,0,2),fracture=createModule('FRACTURE',0,0,3);p.modules.push(branch,reson,fracture);
    connect(p,{module:'pulse-1',port:'trigger'},{module:branch.id,port:'clock'});connect(p,{module:branch.id,port:'pitch'},{module:reson.id,port:'pitch'});connect(p,{module:branch.id,port:'gate'},{module:reson.id,port:'trigger'});connect(p,{module:reson.id,port:'audio'},{module:fracture.id,port:'audio'});connect(p,{module:fracture.id,port:'audio'},{module:'chamber-1',port:'audio'});connect(p,{module:'flock-1',port:'controlB'},{module:fracture.id,port:'break'});
    for(const m of p.modules)for(const key of Object.keys(m.params))m.params[key]=1;p.master=1;p.bpm=300;const g=new DSPGraph(SR);g.setPatch(p);const result=render(g,10);expect(result.peak).toBeLessThanOrEqual(.630001);expect(result.rms).toBeGreaterThan(.001);expect(g.faults).toBe(0);
  });
  it('migrates old patch positions once while preserving their sounds and cables',()=>{const p=metalDrift();delete p.layout;p.modules[0].x=400;p.modules[0].y=240;const imported=parsePatch(JSON.stringify(p));expect(imported.layout).toBe(2);expect(imported.modules[0].x).toBe(200);expect(imported.modules[0].y).toBe(120);expect(imported.modules[0].params).toEqual(p.modules[0].params);expect(imported.connections).toEqual(p.connections);expect(parsePatch(JSON.stringify(imported))).toEqual(imported);});
});
