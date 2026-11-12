import {describe, it, expect} from 'vitest';
import {DSPGraph} from '../src/audio/DSPGraph';
import {createModule, connect} from '../src/graph/PatchGraph';
import {parsePatch} from '../src/state/PatchStorage';
import {pixelDust, biasedOrbit, drawnMetal, twinSwings, emptyPatch} from '../src/state/presets';
import type {Patch} from '../src/graph/types';

const presets = [
  ['PIXEL DUST', pixelDust], ['BIASED ORBIT', biasedOrbit],
  ['DRAWN METAL', drawnMetal], ['TWIN SWINGS', twinSwings]
] as const;

function render(patch:Patch, rate:number, seconds:number, sizes=[193]) {
  const graph=new DSPGraph(rate);
  graph.setPatch(patch);
  const out=new Float32Array(rate*seconds);
  let frame=0, block=0, peak=0, energy=0;
  while(frame<out.length) {
    const count=Math.min(sizes[block++%sizes.length], out.length-frame);
    const left=new Float32Array(count), right=new Float32Array(count);
    graph.process(left,right);
    out.set(left,frame);
    for(let i=0;i<count;i++) {
      if(!Number.isFinite(left[i])||!Number.isFinite(right[i])) throw new Error('Invalid output');
      peak=Math.max(peak,Math.abs(left[i]),Math.abs(right[i]));
      energy+=left[i]**2+right[i]**2;
    }
    frame+=count;
  }
  expect(graph.faults).toBe(0);
  expect(peak).toBeLessThanOrEqual(.630001);
  return {out,peak,rms:Math.sqrt(energy/(out.length*2))};
}

describe('rough sound, gestures and swing circuits',()=>{
  it.each(presets)('%s imports and renders eight seconds of finite, nonzero stereo audio',(name,create)=>{
    const patch=create();
    expect(parsePatch(JSON.stringify(patch))).toEqual(patch);
    const result=render(patch,24000,8);
    expect(result.rms).toBeGreaterThan(.0001);
    console.info(name,{peak:result.peak,rms:result.rms});
  });

  it.each(presets)('%s stays sample-identical across block lengths at maximum macros',(_name,create)=>{
    const patch=create();
    for(const module of patch.modules) for(const key of Object.keys(module.params)) module.params[key]=1;
    const a=render(patch,8000,2,[128]).out;
    const b=render(patch,8000,2,[17,193,64]).out;
    for(let i=0;i<a.length;i++) if(a[i]!==b[i]) throw new Error(`Changed sample ${i}`);
  });

  it('combines all six roles with delayed parasitic modulation across sample rates',()=>{
    const patch=emptyPatch();for(const [i,type] of (['TOUCH','PENDULUM','CHIP','CLIP','FUZZ','CRUSH','PARASITE','OUTPUT'] as const).entries()){
      const m=createModule(type,i*144,0,i+71,type.toLowerCase());for(const key of Object.keys(m.params))m.params[key]=1;patch.modules.push(m);
    }
    const wire=(a:string,ap:string,b:string,bp:string)=>connect(patch,{module:a,port:ap},{module:b,port:bp});
    wire('touch','x','chip','pitch');wire('pendulum','aCross','chip','trigger');wire('chip','audio','clip','audio');wire('clip','audio','fuzz','audio');wire('fuzz','audio','crush','audio');wire('crush','audio','output','audio');wire('crush','audio','parasite','audio');wire('parasite','pressure','clip','drive');wire('parasite','fever','pendulum','coupling');
    for(const rate of [8000,44100,48000,96000])expect(render(patch,rate,2,[17,193,64]).rms).toBeGreaterThan(0);
  });
});
