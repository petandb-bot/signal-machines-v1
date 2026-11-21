import {describe,it,expect} from 'vitest';
import {createModule} from '../src/graph/PatchGraph';
import {emptyPatch} from '../src/state/presets';
import {parsePatch} from '../src/state/PatchStorage';
import {Curve} from '../src/audio/modules/Curve';
import {Phrase} from '../src/audio/modules/Phrase';
import {Harmony} from '../src/audio/modules/Harmony';
import {DSPGraph} from '../src/audio/DSPGraph';
import {MODULE_GROUPS} from '../src/graph/catalog';
import {DEFINITIONS} from '../src/graph/definitions';
const sr=8000;
describe('authorable time, phrase and harmonic fields',()=>{
  it('registers 3 optional modules without affecting legacy mode defaults',()=>{
    for(const type of ['CURVE','PHRASE','HARMONY'] as const){
      expect(DEFINITIONS[type].type).toBe(type);
      expect(MODULE_GROUPS.some(g=>g.types.includes(type))).toBe(true);
      expect(createModule(type,0,0,1).mode).toBeUndefined();
    }
  });
  it('round trips all edits through v1 JSON, rejecting malformed or mismatched data',()=>{
    const patch=emptyPatch();
    const a=createModule('CURVE',0,0,1,'curve'),b=createModule('PHRASE',150,0,1,'phrase'),c=createModule('HARMONY',300,0,1,'harmony');
    a.curve!.lanes[0].points[1].v=.99;
    b.phrase!.steps[2].pitch=-5;c.harmony!.chords[0].quality='dim';
    patch.modules=[a,b,c];
    expect(parsePatch(JSON.stringify(patch)).modules).toEqual(patch.modules);
    const bad=structuredClone(patch);bad.modules[0].curve!.lanes[0].points[1].t=0;
    expect(()=>parsePatch(JSON.stringify(bad))).toThrow();
    const bad2=structuredClone(patch);bad2.modules[1].harmony=c.harmony;
    expect(()=>parsePatch(JSON.stringify(bad2))).toThrow();
  });
  it('CURVE wraps and plays lanes deterministically and resets on external trigger',()=>{
    const m=createModule('CURVE',0,0,1);m.params.duration=0;m.params.sync=0;const a=new Curve(m,sr,2),b=new Curve(m,sr,2);
    let wraps=0;for(let i=0;i<sr*3;i++){a.process(i,120);b.process(i,120);wraps+=a.outputL[2];
      expect(a.outputL[0]).toBe(b.outputL[0]);
      expect(Math.abs(a.outputL[0])).toBeLessThanOrEqual(1);
    }
    expect(wraps).toBeGreaterThan(0);
    a.inputL[1]=1;a.process(123,120);expect(a.phase).toBe(0);
  });
  it('PHRASE repeats exact notes, rests and gate durations at zero deviation',()=>{
    const m=createModule('PHRASE',0,0,1),p=new Phrase(m,sr,1);p.selectedMode='16';
    p.inputConnected[0]=1;
    const events:number[]=[];
    for(let i=0;i<16;i++){p.inputL[0]=1;p.process(i*2,120);if(p.outputL[1]>0)events.push(i);
      p.inputL[0]=0;p.process(i*2+1,120);
    }
    expect(events).not.toContain(6);expect(events).not.toContain(14);
    expect(events).toContain(0);expect(events).toContain(15);
    expect(p.outputL[0]).toBeCloseTo(-2/24,9);
  });
  it('HARMONY voices are finite, progress and change only on clock edges',()=>{
    const m=createModule('HARMONY',0,0,1),h=new Harmony(m,sr,9);h.selectedMode='8';h.inputConnected[0]=1;
    const first:number[][]=[];
    for(let i=0;i<8;i++){
      h.inputL[0]=1;h.process(i*500,120);first.push(Array.from(h.outputL.slice(0,4)));
      expect(h.outputL[4]).toBe(1);
      h.inputL[0]=0;h.process(i*500+1,120);expect(h.outputL[4]).toBe(0);
    }
    expect(new Set(first.map(x=>x.join(','))).size).toBeGreaterThan(2);
    for(const values of first)for(const v of values)expect(Math.abs(v)).toBeLessThanOrEqual(1);
  });
  it('compiles through the normal graph and keeps output bounded',()=>{
    const p=emptyPatch();
    p.modules=[createModule('PHRASE',0,0,1,'phrase'),createModule('ALLOY',140,0,2,'alloy'),createModule('OUTPUT',280,0,3,'out')];
    p.connections=[
      {id:'one',from:{module:'phrase',port:'pitch'},to:{module:'alloy',port:'pitch'}},
      {id:'two',from:{module:'phrase',port:'gate'},to:{module:'alloy',port:'trigger'}},
      {id:'three',from:{module:'alloy',port:'audio'},to:{module:'out',port:'audio'}},
    ];
    const valid=parsePatch(JSON.stringify(p)),g=new DSPGraph(sr);g.setPatch(valid);
    const l=new Float32Array(128),r=new Float32Array(128);
    let peak=0;
    for(let t=0;t<240;t++){g.process(l,r);for(const v of l){expect(Number.isFinite(v)).toBe(true);peak=Math.max(peak,Math.abs(v));}}
    expect(peak).toBeGreaterThan(0);expect(peak).toBeLessThanOrEqual(.630001);expect(g.faults).toBe(0);
  });
});
