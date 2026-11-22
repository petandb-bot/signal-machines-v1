import {describe,it,expect} from 'vitest';
import {createModule} from '../src/graph/PatchGraph';
import {emptyPatch} from '../src/state/presets';
import {parsePatch} from '../src/state/PatchStorage';
import {compilePatch} from '../src/audio/PatchCompiler';
import {DSPGraph} from '../src/audio/DSPGraph';
import {Found} from '../src/audio/modules/Found';
import {Cuts} from '../src/audio/modules/Cuts';
import {builtinFound,MAX_FOUND,MAX_CUTS,MAX_SAMPLE_ASSETS,FOUND_RATE,sampleModuleLimitError} from '../src/samples/FoundData';

const makePatch=()=>{
 const patch=emptyPatch();
 const sources=[
   createModule('FOUND',0,0,101,'found-a'),
   createModule('CUTS',160,0,102,'cuts-a'),
   createModule('FOUND',0,140,103,'found-b'),
   createModule('CUTS',160,140,104,'cuts-b'),
 ];
 const refs=['builtin:room','builtin:machine','builtin:tape','builtin:glass'];
 sources.forEach((state,i)=>state.sample=refs[i]);
 const out=createModule('OUTPUT',340,90,105,'out');
 patch.modules=[...sources,out];
 patch.connections=sources.map((source,i)=>({id:'sample-cable-'+i,from:{module:source.id,port:'audio'},to:{module:'out',port:'audio'}}));
 return patch;
};

describe('two FOUND and two CUTS capacity',()=>{
 it('accepts 2+2 in either order, rejects a third of either type in JSON and compiler',()=>{
   expect([MAX_FOUND,MAX_CUTS,MAX_SAMPLE_ASSETS]).toEqual([2,2,4]);
   const patch=makePatch();
   expect(sampleModuleLimitError(patch.modules)).toBeNull();
   expect(parsePatch(JSON.stringify(patch))).toEqual(patch);
   expect(compilePatch(patch,FOUND_RATE).modules.size).toBe(5);
   const thirdFound=createModule('FOUND',0,0,99,'found-c');
   patch.modules.push(thirdFound);
   expect(sampleModuleLimitError(patch.modules)).toContain('2 FOUND');
   expect(()=>parsePatch(JSON.stringify(patch))).toThrow('at most 2 FOUND');
   expect(()=>compilePatch(patch,FOUND_RATE)).toThrow('at most 2 FOUND');
   patch.modules.pop();
   const thirdCuts=createModule('CUTS',0,0,98,'cuts-c');
   patch.modules.push(thirdCuts);
   expect(sampleModuleLimitError(patch.modules)).toContain('2 CUTS');
   expect(()=>parsePatch(JSON.stringify(patch))).toThrow('at most 2 CUTS');
   expect(()=>compilePatch(patch,FOUND_RATE)).toThrow('at most 2 CUTS');
 });
 it('plays four independent sample sources safely across reset and retains only selected assets',()=>{
   const patch=parsePatch(JSON.stringify(makePatch()));
   const assets=['room','machine','tape','glass'].map(name=>builtinFound(name as 'room'|'machine'|'tape'|'glass'));
   const graph=new DSPGraph(FOUND_RATE);
   graph.setFoundAssets(assets);
   graph.setPatch(patch);
   const measure=()=>{
     let energy=0,peak=0;const l=new Float32Array(128),r=new Float32Array(128);
     for(let i=0;i<600;i++){
       graph.process(l,r);
       for(let j=0;j<l.length;j++){
         expect(Number.isFinite(l[j])&&Number.isFinite(r[j])).toBe(true);
         energy+=l[j]*l[j]+r[j]*r[j];peak=Math.max(peak,Math.abs(l[j]),Math.abs(r[j]));
       }
     }
     return{peak,energy};
   };
   const first=measure();
   expect(first.peak).toBeGreaterThan(0);
   expect(first.peak).toBeLessThanOrEqual(.630001);
   expect(first.energy).toBeGreaterThan(.001);
   expect(graph.modules.get('found-a')).toBeInstanceOf(Found);
   expect(graph.modules.get('cuts-a')).toBeInstanceOf(Cuts);
   expect(graph.modules.get('found-b')).toBeInstanceOf(Found);
   expect(graph.modules.get('cuts-b')).toBeInstanceOf(Cuts);
   graph.setPatch(patch,true);
   expect(measure().energy).toBeGreaterThan(.001);
   expect(graph.faults).toBe(0);
   const extra=builtinFound('wire');
   expect(()=>graph.setFoundAssets([...assets,extra])).toThrow('Invalid FOUND assets');
   // A rejected fifth asset must not disturb four existing readers.
   graph.setFoundAssets([],[...assets.map(a=>a.id)]);
   graph.setPatch(patch);
   expect(measure().energy).toBeGreaterThan(.001);
 });
 it('shares a single PCM asset when all four readers select the same sample',()=>{
   const patch=makePatch();
   for(const module of patch.modules)if(module.type==='FOUND'||module.type==='CUTS')module.sample='builtin:room';
   const graph=new DSPGraph(FOUND_RATE),room=builtinFound('room');
   graph.setFoundAssets([room],[room.id,room.id,room.id,room.id]);
   graph.setPatch(parsePatch(JSON.stringify(patch)));
   let sum=0;const l=new Float32Array(128),r=new Float32Array(128);
   for(let i=0;i<240;i++){graph.process(l,r);for(const x of l)sum+=Math.abs(x);}
   expect(sum).toBeGreaterThan(.00001);
   expect(graph.faults).toBe(0);
 });
 it('keeps pre-existing 1+1 and 2+0 patches compatible',()=>{
   const patch=makePatch();
   patch.modules=patch.modules.filter(m=>m.type!=='CUTS');
   patch.connections=patch.connections.filter(e=>e.from.module==='found-a'||e.from.module==='found-b');
   expect(parsePatch(JSON.stringify(patch)).modules).toHaveLength(3);
   const old=makePatch();
   old.modules=old.modules.filter(m=>m.id==='found-a'||m.id==='cuts-a'||m.type==='OUTPUT');
   old.connections=old.connections.filter(e=>e.from.module==='found-a'||e.from.module==='cuts-a');
   expect(parsePatch(JSON.stringify(old))).toEqual(old);
 });
 it('limits raw PCM memory to a predictable bound per four maximum-duration distinct assets',()=>{
   const perAsset=FOUND_RATE*60*2*Float32Array.BYTES_PER_ELEMENT;
   expect(perAsset).toBe(11_520_000);
   expect(perAsset*MAX_SAMPLE_ASSETS).toBe(46_080_000);
   // Worklet transfer duplicates the PCM once; other decode/analysis allocations are extra.
   expect(perAsset*MAX_SAMPLE_ASSETS*2).toBe(92_160_000);
 });
});
