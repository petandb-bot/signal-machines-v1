import {describe,it,expect} from 'vitest';
import {BUILTINS,FOUND_RATE,builtinFound,validFoundRef} from '../src/samples/FoundData';
import {createModule} from '../src/graph/PatchGraph';
import {emptyPatch} from '../src/state/presets';
import {parsePatch} from '../src/state/PatchStorage';
import {Found} from '../src/audio/modules/Found';
import {Cuts} from '../src/audio/modules/Cuts';
import {DSPGraph} from '../src/audio/DSPGraph';

describe('six independent built-in synthetic sample materials',()=>{
 it('extends the original three slots without changing their names or order',()=>{
   expect(BUILTINS).toEqual(['room','rain','machine','wire','glass','tape']);
   for(const id of BUILTINS)expect(validFoundRef('builtin:'+id)).toBe(true);
   expect(validFoundRef('builtin:unknown')).toBe(false);
 });
 it.each(['wire','glass','tape'] as const)('%s is non-silent, deterministic, stereo, finite and sample-safe',kind=>{
   const a=builtinFound(kind),b=builtinFound(kind);
   expect(a.id).toBe('builtin:'+kind);expect(a.left.length).toBe(FOUND_RATE*12);
   expect(a.right.length).toBe(FOUND_RATE*12);
   expect(a.cuts?.length).toBeGreaterThan(0);
   let energy=0,diff=0,peak=0;
   for(let i=0;i<a.left.length;i+=7){
     const l=a.left[i],r=a.right[i];
     expect(Number.isFinite(l)&&Number.isFinite(r)).toBe(true);
     expect(l).toBe(b.left[i]);expect(r).toBe(b.right[i]);
     energy+=l*l+r*r;diff+=Math.abs(l-r);peak=Math.max(peak,Math.abs(l),Math.abs(r));
   }
   expect(energy).toBeGreaterThan(.005);
   expect(diff).toBeGreaterThan(.01);
   expect(peak).toBeLessThan(.65);
 },15000);
 it('accepts the new built-ins in both sample modules and keeps JSON reference-only',()=>{
   for(const type of ['FOUND','CUTS'] as const)for(const id of ['wire','glass','tape'] as const){
     const p=emptyPatch(),m=createModule(type,0,0,17,'sample');
     m.sample='builtin:'+id;p.modules=[m];
     expect(parsePatch(JSON.stringify(p)).modules[0].sample).toBe('builtin:'+id);
     const dsp=type==='FOUND'?new Found(m,FOUND_RATE,17):new Cuts(m,FOUND_RATE,17);
     dsp.attach(builtinFound(id));
     let energy=0;
     for(let i=0;i<FOUND_RATE;i++){dsp.process(i);energy+=dsp.outputL[0]*dsp.outputL[0]+dsp.outputR[0]*dsp.outputR[0];}
     expect(energy).toBeGreaterThan(.00001);
   }
 },20000);
 it('new built-in material survives a real DSP graph with protected output',()=>{
   const p=emptyPatch(),found=createModule('FOUND',0,0,101,'source'),out=createModule('OUTPUT',190,0,102,'out');
   found.sample='builtin:wire';p.modules=[found,out];p.connections=[{id:'c1',from:{module:'source',port:'audio'},to:{module:'out',port:'audio'}}];
   const g=new DSPGraph(FOUND_RATE);g.setFoundAssets([builtinFound('wire')]);g.setPatch(parsePatch(JSON.stringify(p)));
   let peak=0,energy=0;const l=new Float32Array(128),r=new Float32Array(128);
   for(let i=0;i<1000;i++){g.process(l,r);for(const n of l){if(!Number.isFinite(n))throw Error('non finite');peak=Math.max(peak,Math.abs(n));energy+=n*n;}}
   expect(g.faults).toBe(0);expect(peak).toBeLessThanOrEqual(.630001);expect(energy).toBeGreaterThan(.001);
 },15000);
});
