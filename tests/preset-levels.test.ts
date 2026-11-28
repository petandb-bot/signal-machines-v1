import {describe,it,expect} from 'vitest';
import {readFileSync} from 'node:fs';
import {PRESETS} from '../src/state/presets';
import {parsePatch} from '../src/state/PatchStorage';
import {PRESET_GAINS} from '../src/state/presetLevels';
import {DSPGraph} from '../src/audio/DSPGraph';
import {builtinFound} from '../src/samples/FoundData';
import type {Patch} from '../src/graph/types';

function measure(p:Patch){
  const g=new DSPGraph(24000);
  const refs=[...new Set(p.modules.filter(m=>m.type==='FOUND'||m.type==='CUTS').map(m=>m.sample??'builtin:room'))];
  g.setFoundAssets(refs.map(ref=>builtinFound(ref.slice(8) as 'room'|'rain'|'machine')));
  g.setPatch(p);
  const l=new Float32Array(128),r=new Float32Array(128);
  let sum=0,peak=0,n=0;
  for(let at=0;at<24000*8;at+=128){
    g.process(l,r);
    for(let i=0;i<128;i++){
      if(!Number.isFinite(l[i])||!Number.isFinite(r[i]))throw Error('Nonfinite');
      if(at>=24000){sum+=l[i]**2+r[i]**2;n+=2;peak=Math.max(peak,Math.abs(l[i]),Math.abs(r[i]));}
    }
  }
  expect(g.faults).toBe(0);
  return {rms:Math.sqrt(sum/n),peak};
}
describe('curated fixed output gain calibration',()=>{
  it.each(PRESETS.map(p=>[p.id,p] as const))('%s keeps the sound graph and raises audible level safely',(id,preset)=>{
    const raw=parsePatch(readFileSync('presets/curated/'+id+'.json','utf8')),calibrated=preset.create();
    expect(calibrated.master).toBe(raw.master);
    expect(calibrated.seed).toBe(raw.seed);
    for(const m of raw.modules)if(m.type!=='OUTPUT'&&m.type!=='LEVEL')expect(calibrated.modules.find(n=>n.id===m.id)).toEqual(m);
    expect(calibrated.modules.filter(m=>m.id.startsWith('preset-gain-')).every(m=>m.type==='LEVEL'&&m.params.comp===0)).toBe(true);
    const a=measure(raw),b=measure(calibrated);
    expect(a.rms).toBeGreaterThan(0);
    expect(b.rms).toBeGreaterThan(a.rms*1.12);
    expect(b.rms).toBeLessThanOrEqual(a.rms*PRESET_GAINS[id]*1.05);
    expect(b.peak).toBeLessThan(.55);
  },20000);
});
