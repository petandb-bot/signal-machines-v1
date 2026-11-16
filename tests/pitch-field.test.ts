import {describe,expect,it} from 'vitest';
import {readFileSync} from 'node:fs';
import {Quantize} from '../src/audio/modules/Quantize';
import {FIELD_INTERVALS,nearestFieldNote,PitchFieldQuantize} from '../src/audio/modules/PitchFieldQuantize';
import {createModule} from '../src/graph/PatchGraph';
import {parsePatch} from '../src/state/PatchStorage';
import {DSPGraph} from '../src/audio/DSPGraph';
import {MODE_OPTIONS} from '../src/graph/definitions';

const RATE=48000;
function node(mode:string,pull=1){
  const s=createModule('QUANTIZE',0,0,491,'quantize');
  s.mode=mode;s.params.span=3/7;s.params.pull=pull;
  return s;
}
function unit(mode:string,pull=1){return new PitchFieldQuantize(node(mode,pull),RATE,321);}
function simulate(module:Quantize,frames:number,clock:boolean){
  const result:number[]=[];
  module.inputConnected[3]=clock?1:0;
  for(let i=0;i<frames;i++){
    module.inputL[0]=Math.sin(i*.0013)*.26;
    module.inputL[1]=Math.sin(i*.00021)*.11;
    module.inputL[2]=Math.cos(i*.0007)*.3;
    module.inputL[3]=clock&&i%131===0?1:0;
    module.smooth();module.process(i);
    result.push(module.outputL[0],module.outputL[1]);
  }
  return result;
}
describe('optional shared pitch-field QUANTIZE, not an arpeggiator',()=>{
  it.each(['12-TET','19-TET','13-TRIT'])('keeps every sample of original %s mode unchanged',mode=>{
    const classic=new Quantize(node(mode),RATE,321);
    const expanded=unit(mode);
    const original=simulate(classic,3500,true),newOutput=simulate(expanded,3500,true);
    expect(newOutput).toEqual(original);
    expect(expanded.outputR).toEqual(classic.outputR);
  });
  it('uses stable octave-repeating notes for positive and negative CV',()=>{
    for(const [name,notes] of Object.entries(FIELD_INTERVALS)){
      for(let octave=-3;octave<=2;octave++)for(const note of notes){
        const semitone=octave*12+note;
        expect(nearestFieldNote(semitone,0,name as 'FIELD'|'FRICTION')).toBe(semitone);
      }
    }
    expect(nearestFieldNote(4.2,0,'FIELD')).toBe(5);
    expect(nearestFieldNote(-4.2,0,'FIELD')).toBe(-5);
    expect(nearestFieldNote(4.2,0,'FRICTION')).toBe(4);
    expect(nearestFieldNote(4.2,1,'FIELD')).toBe(4);
  });
  it('never clips a full-pull snapped note into a pitch outside its field',()=>{
    for(const mode of ['FIELD','FRICTION'] as const){
      for(let root=-24;root<=24;root+=3){
        for(let pitch=-24;pitch<=24;pitch+=.4){
          const mapped=nearestFieldNote(pitch,root,mode,-24,24);
          expect(mapped).toBeGreaterThanOrEqual(-24);
          expect(mapped).toBeLessThanOrEqual(24);
          const relative=((mapped-root)%12+12)%12;
          expect(FIELD_INTERVALS[mode]).toContain(relative);
        }
      }
    }
    expect(nearestFieldNote(24,3,'FRICTION',-24,24)).toBe(22);
    const q=unit('FRICTION');
    q.inputL[0]=1;
    q.inputL[1]=3/24;
    q.process(0);
    expect(q.outputL[0]).toBeCloseTo(22/24,10);
  });

  it('holds the current audible note across classic/field family changes until the next CLOCK',()=>{
    const q=unit('12-TET');
    q.inputConnected[3]=1;
    q.inputL[0]=7/24;
    q.inputL[3]=1;q.process(0);
    const old=q.outputL[0];
    expect(old).toBeCloseTo(7/24,9);
    q.inputL[3]=0;q.process(1);
    q.selectedMode='FIELD';
    q.inputL[0]=4.2/24;
    q.process(2);
    expect(q.outputL[0]).toBe(old);
    expect(q.outputL[1]).toBe(0);
    q.inputL[3]=1;q.process(3);
    expect(q.outputL[0]).toBeCloseTo(5/24,9);
    q.inputL[3]=0;q.process(4);
    q.selectedMode='19-TET';q.process(5);
    expect(q.outputL[0]).toBeCloseTo(5/24,9);
    q.inputL[3]=1;q.process(6);
    expect(q.outputL[0]).not.toBeCloseTo(5/24,6);
  });

  it('supports a coherent shared root without requiring a central module or new controls',()=>{
    const a=unit('FIELD'),b=unit('FIELD');
    const cv=4.2/24,root=1/24;
    a.inputL[0]=b.inputL[0]=cv;
    a.inputL[1]=b.inputL[1]=root;
    a.process(0);b.process(0);
    expect(a.outputL[0]).toBeCloseTo(4/24,7);
    expect(b.outputL[0]).toBe(a.outputL[0]);
    b.inputL[1]=0;b.process(1);
    expect(b.outputL[0]).toBeCloseTo(5/24,7);
    expect(a.outputL[0]).not.toBe(b.outputL[0]);
  });
  it('holds only on incoming CLOCK edges; it never generates gates or a step count',()=>{
    const q=unit('FIELD');
    q.inputConnected[3]=1;
    q.inputL[0]=3.9/24;q.inputL[3]=1;
    q.process(0);
    const first=q.outputL[0];
    expect(first).toBeCloseTo(3/24,7);
    expect(q.outputL[1]).toBe(0);
    q.inputL[1]=1/24;q.inputL[3]=0;q.process(1);
    expect(q.outputL[0]).toBe(first);
    q.inputL[3]=1;q.process(2);
    expect(q.outputL[0]).toBeCloseTo(4/24,7);
    expect(q.outputL[1]).toBe(1);
    for(let t=3;t<1000;t++){q.inputL[3]=0;q.process(t);expect(q.outputL[1]).toBe(0);}
  });
  it('can leave all pitch deviations intact at PULL=0',()=>{
    for(const mode of ['FIELD','FRICTION']){
      const q=unit(mode,0);q.inputL[0]=3.2/24;q.process(0);
      expect(q.outputL[0]).toBeCloseTo(3.2/24,10);
      expect(q.outputL[1]).toBe(0);
    }
  });
  it('includes opt-in modes without changing the default or module count',()=>{
    expect(MODE_OPTIONS.QUANTIZE).toEqual(['12-TET','19-TET','13-TRIT','FIELD','FRICTION']);
    expect(createModule('QUANTIZE',0,0,22).mode).toBeUndefined();
  });
  it.each(['field','friction'])('validates the %s two-voice study patch and renders bounded sound',id=>{
    const patch=parsePatch(readFileSync('docs/phase9/patches/common-ground-'+id+'.json','utf8'));
    expect(patch.modules.filter(m=>m.type==='QUANTIZE')).toHaveLength(2);
    const rootEdges=patch.connections.filter(c=>c.from.module==='study-tide'&&c.from.port==='tide'&&c.to.port==='shift');
    expect(rootEdges).toHaveLength(2);
    const qModes=patch.modules.filter(m=>m.type==='QUANTIZE').map(m=>m.mode);
    expect(qModes).toContain('FIELD');
    const g=new DSPGraph(RATE);g.setPatch(patch);
    let energy=0,peak=0;
    const l=new Float32Array(128),r=new Float32Array(128);
    for(let i=0;i<2500;i++){
      g.process(l,r);
      for(let j=0;j<128;j++){
        expect(Number.isFinite(l[j])&&Number.isFinite(r[j])).toBe(true);
        energy+=l[j]*l[j]+r[j]*r[j];
        peak=Math.max(peak,Math.abs(l[j]),Math.abs(r[j]));
      }
    }
    expect(g.faults).toBe(0);
    expect(peak).toBeLessThanOrEqual(.630001);
    expect(energy).toBeGreaterThan(.0001);
  },20000);
});
