import {readFileSync} from 'node:fs';
import {describe,it,expect} from 'vitest';
import {parsePatch} from '../src/state/PatchStorage';
import {DSPGraph} from '../src/audio/DSPGraph';
import {builtinFound} from '../src/samples/FoundData';
const load=(name:string)=>parsePatch(readFileSync(new URL(name,import.meta.url),'utf8'));
const reference=load('./fixtures/still-almost-moving.reference.json'),revised=load('../presets/still-almost-moving-ii.json');
describe('Phase 1 sound architecture',()=>{
 it('keeps the supplied reference separate and uses only existing, compatible patch data',()=>{expect(reference.name).toBe('STILL, ALMOST MOVING');expect(reference.modules).toHaveLength(16);expect(reference.connections).toHaveLength(23);expect(revised.name).toBe('STILL, ALMOST MOVING II');expect(revised.version).toBe(reference.version);expect(revised.seed).toBe(reference.seed);expect(revised.modules.filter(m=>m.sample).map(m=>m.sample)).toEqual(['builtin:machine']);expect(parsePatch(JSON.stringify(revised))).toEqual(revised);});
 for(const rate of [44100,48000])for(const [label,p] of [['reference',reference],['revised',revised]] as const)it(`${label} renders and survives a routing refresh at ${rate} Hz`,()=>{
  const run=()=>{const g=new DSPGraph(rate);g.setFoundAssets([builtinFound('machine')]);g.setPatch(structuredClone(p));let energy=0,peak=0;const trace:number[]=[];for(let i=0;i<rate*2;i+=128){const l=new Float32Array(128),r=new Float32Array(128);g.process(l,r);for(let j=0;j<128;j++){if(!Number.isFinite(l[j])||!Number.isFinite(r[j]))throw Error('nonfinite');energy+=l[j]**2+r[j]**2;peak=Math.max(peak,Math.abs(l[j]),Math.abs(r[j]));}trace.push(l[50]);}g.setPatch(structuredClone(p));for(let i=0;i<30;i++)g.process(new Float32Array(128),new Float32Array(128));expect(g.faults).toBe(0);expect(energy).toBeGreaterThan(.01);expect(peak).toBeLessThanOrEqual(.630001);return trace;};expect(run()).toEqual(run());
 },15000);
});
