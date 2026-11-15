// @vitest-environment happy-dom
import {describe,it,expect,beforeEach,vi} from 'vitest';import {readFileSync} from 'node:fs';import {createHash} from 'node:crypto';
import {PRESETS,LEGACY_PRESETS,metalDrift} from '../src/state/presets';import {DEFAULT_PRESET_ID} from '../src/state/curatedPresets';import {StateStore} from '../src/app/StateStore';import {parsePatch} from '../src/state/PatchStorage';import {DSPGraph} from '../src/audio/DSPGraph';import {builtinFound} from '../src/samples/FoundData';
beforeEach(()=>localStorage.clear());
describe('twenty musical environments and preserved archives',()=>{
 it('has twenty stable identities, independent patch objects and matching standalone JSON',()=>{
  expect(PRESETS).toHaveLength(20);expect(new Set(PRESETS.map(p=>p.id)).size).toBe(20);expect(LEGACY_PRESETS).toHaveLength(42);
  for(const preset of PRESETS){const p=preset.create();expect(p).toEqual(parsePatch(readFileSync('presets/curated/'+preset.id+'.json','utf8')));expect(p.name).toBe(preset.name);p.modules[0].params={};expect(preset.create().modules[0].params).not.toEqual({});}
 });
 it('protects every legacy DSP source and JSON fixture byte for byte',()=>{const baseline=JSON.parse(readFileSync('docs/phase4/legacy-v019.json','utf8'));for(const [path,hash]of Object.entries(baseline.hashes))expect(createHash('sha256').update(readFileSync(path)).digest('hex'),path).toBe(hash);});
 it('uses a representative startup patch and gives saved user patches absolute priority',()=>{expect(new StateStore().patch.name).toBe(PRESETS.find(p=>p.id===DEFAULT_PRESET_ID)!.name);const saved=metalDrift();saved.name='My old circuit';saved.modules[0].params.rate=.13;localStorage.setItem('signal-machines.patch.v1',JSON.stringify(saved));expect(new StateStore().patch).toEqual(saved);});
 it('falls back safely when storage fails without clearing stored data',()=>{const original=localStorage;vi.stubGlobal('localStorage',{getItem:()=>{throw Error('blocked');}});const store=new StateStore();expect(store.patch.name).toBe('PIXEL DUST');expect(store.initialWarning).toContain('blocked');vi.stubGlobal('localStorage',original);});
 it('includes one plate environment and dry circuits rather than putting reverb everywhere',()=>{expect(PRESETS.filter(p=>p.create().modules.some(m=>m.type==='PLATE'))).toHaveLength(1);expect(PRESETS.find(p=>p.id==='pixel-dust')!.create().modules).toHaveLength(5);const living=PRESETS.find(p=>p.id==='still-almost-moving-ii')!.create();expect(living.modules.filter(m=>m.mode?.startsWith('LIVING'))).toHaveLength(2);});
 it.each(PRESETS.map(p=>[p.id,p] as const))('%s produces protected stereo at 48kHz and survives JSON recall',(_,preset)=>{const p=parsePatch(JSON.stringify(preset.create())),g=new DSPGraph(48000);const refs=[...new Set(p.modules.filter(m=>m.type==='FOUND'||m.type==='CUTS').map(m=>m.sample??'builtin:room'))];g.setFoundAssets(refs.map(r=>builtinFound(r.slice(8) as 'room'|'rain'|'machine')));g.setPatch(p);let energy=0;
  for(let at=0;at<48000*3;at+=128){const l=new Float32Array(128),r=new Float32Array(128);g.process(l,r);for(let i=0;i<128;i++){if(!Number.isFinite(l[i])||!Number.isFinite(r[i])||Math.max(Math.abs(l[i]),Math.abs(r[i]))>.630001)throw Error('Invalid curated graph');energy+=l[i]*l[i]+r[i]*r[i];}}
  expect(energy).toBeGreaterThan(1e-8);expect(g.faults).toBe(0);
 },15000);
});
