// @vitest-environment happy-dom
import {afterEach,describe,expect,it,vi} from 'vitest';
import {FoundLibrary} from '../src/samples/FoundLibrary';
import type {FoundAudio} from '../src/samples/FoundData';
import type {LoopAudio} from '../src/audio/LoopAudio';
import {LoopControls} from '../src/ui/LoopControls';

const CLIP_RATE=48000;
const sample=(seconds=.28):LoopAudio=>{
  const frames=Math.round(CLIP_RATE*seconds);
  return{kind:'loopAudio',sampleRate:CLIP_RATE,
    left:Float32Array.from({length:frames},(_,i)=>Math.sin(i/CLIP_RATE*2*Math.PI*217)*.43),
    right:Float32Array.from({length:frames},(_,i)=>Math.sin(i/CLIP_RATE*2*Math.PI*219+.7)*.38)};
};
afterEach(()=>vi.restoreAllMocks());
describe('LOOP to independent FOUND/CUTS sampling, with unchanged original sound',()=>{
  it('copies PCM without touching the LOOP, restores the exact stored PCM16 sample after cache eviction',async()=>{
    const db=new Map<string,{id:string;name:string;blob:Blob}>();
    const storage={get:async(id:string)=>db.get(id),put:async(r:{id:string;name:string;blob:Blob})=>{db.set(r.id,r);}};
    // Ordinary imports use this browser-specific decoder; LOOP copies must not.
    const decode=vi.fn(async(_blob:Blob,_id:string,_name:string):Promise<FoundAudio>=>{
      throw Error('Browser decoder unexpectedly used for a LOOP snapshot.');
    });
    const source=sample(),initial=source.left.slice(),initialRight=source.right.slice();
    const library=new FoundLibrary(storage,decode);
    const result=await library.importLoop(source);
    expect(result.persisted).toBe(true);
    expect(result.audio.id).toMatch(/^local:/);
    expect(result.audio.sampleRate).toBe(24000);
    expect(result.audio.left.length).toBe(Math.round(source.left.length/2));
    expect(source.left).toEqual(initial);expect(source.right).toEqual(initialRight);
    expect(db.get(result.audio.id)?.blob.type).toBe('audio/wav');
    const cached=await library.get(result.audio.id);
    expect(cached).toBe(result.audio);
    library.retain([]);
    const restored=await library.get(result.audio.id);
    expect(restored?.left).toEqual(result.audio.left);
    expect(restored?.right).toEqual(result.audio.right);
    expect(restored?.name).toBe(result.audio.name);
    expect(decode).not.toHaveBeenCalled();
  });

  it('falls back to bounded in-session audio when browser persistence fails',async()=>{
    const lib=new FoundLibrary({get:async()=>undefined,put:async()=>{throw Error('quota');}});
    const result=await lib.importLoop(sample(.12));
    expect(result.persisted).toBe(false);
    expect(lib.sessionOnly(result.audio.id)).toBe(true);
    expect(result.audio.left.length).toBe(2880);
  });

  it('rejects invalid audio and canceled transfer without persisting a partial asset',async()=>{
    const put=vi.fn(async()=>{});
    const lib=new FoundLibrary({get:async()=>undefined,put});
    await expect(lib.importLoop({...sample(),left:new Float32Array([Number.NaN]),right:new Float32Array([0])}))
      .rejects.toThrow('Invalid loop audio');
    await expect(lib.importLoop(sample(),()=>false)).rejects.toThrow('Patch changed');
    expect(put).not.toHaveBeenCalled();
  });

  it('shows transfer buttons only for an existing non-recording LOOP take',()=>{
    const calls:string[]=[];
    const controls=new LoopControls('loop',action=>calls.push(action),()=>{});
    document.body.append(controls.root);
    const toFound=controls.root.querySelector<HTMLButtonElement>('[data-loop-action="send-found"]')!;
    const toCuts=controls.root.querySelector<HTMLButtonElement>('[data-loop-action="send-cuts"]')!;
    expect(toFound.disabled).toBe(true);expect(toCuts.disabled).toBe(true);
    controls.update({mode:'playing',frames:48000,sampleRate:48000});
    expect(toFound.disabled).toBe(false);expect(toCuts.disabled).toBe(false);
    toFound.click();toCuts.click();
    expect(calls).toEqual(['send-found','send-cuts']);
    controls.update({mode:'recording',frames:48000,sampleRate:48000});
    expect(toFound.disabled).toBe(true);expect(toCuts.disabled).toBe(true);
    controls.root.remove();
  });
});
