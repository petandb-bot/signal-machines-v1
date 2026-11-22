// @vitest-environment happy-dom
import {afterEach,describe,expect,it,vi} from 'vitest';
import {decodeFound,FoundLibrary,snapshotPickedAudio} from '../src/samples/FoundLibrary';
import {preflightAudioDuration} from '../src/audio/AudioFile';
import {decodeLoopFile} from '../src/audio/AudioFile';
import {encodeWav} from '../src/audio/Wav';
import type {FoundAudio} from '../src/samples/FoundData';

afterEach(()=>{vi.restoreAllMocks();vi.unstubAllGlobals();});

describe('Files / Box sample import resilience',()=>{
 it('snapshots cloud-backed bytes once and stores a detached Blob, not the provider File',async()=>{
   const original=new File(['remote audio bytes'],'field.m4a',{type:'audio/mp4'});
   const arrayBuffer=vi.fn().mockResolvedValueOnce(new TextEncoder().encode('remote audio bytes').buffer);
   Object.defineProperty(original,'arrayBuffer',{value:arrayBuffer});
   let saved:Blob|undefined;
   const store={
     get:async()=>undefined,
     put:async (record:{blob:Blob})=>{saved=record.blob;},
   };
   const decoder=vi.fn(async(blob:Blob,id:string,name:string)=>({
     id,name,sampleRate:24000,left:new Float32Array(240),right:new Float32Array(240),
     regions:[{start:0,energy:0,change:0}],peaks:Array(104).fill(0),
     ...{read:await blob.text()},
   } as FoundAudio));
   const stages:string[]=[];
   const library=new FoundLibrary(store,decoder);
   const {audio,persisted}=await library.import(original,()=>true,stage=>stages.push(stage));
   expect(persisted).toBe(true);
   expect(audio.name).toBe('field.m4a');
   expect(saved).toBeInstanceOf(Blob);
   expect(saved).not.toBe(original);
   expect(await saved!.text()).toBe('remote audio bytes');
   expect(decoder).toHaveBeenCalledWith(saved,expect.any(String),'field.m4a');
   expect(arrayBuffer).toHaveBeenCalledTimes(1);
   expect(stages).toEqual([
     'Reading selected audio from Files / Box…',
     'Decoding and analyzing audio…',
     'Saving the sample on this device…',
   ]);
 });
 it('retries a transient cloud File read without repeating the decode',async()=>{
   const file=new File(['payload'],'remote.wav');
   const read=vi.fn().mockRejectedValueOnce(new DOMException('File temporarily unavailable','NotReadableError'))
     .mockResolvedValueOnce(new TextEncoder().encode('payload').buffer);
   Object.defineProperty(file,'arrayBuffer',{value:read});
   const blob=await snapshotPickedAudio(file);
   expect(await blob.text()).toBe('payload');
   expect(read).toHaveBeenCalledTimes(2);
 });
 it('provides a useful local-copy workaround if the provider cannot read the file',async()=>{
   const file=new File(['payload'],'bad.wav');
   Object.defineProperty(file,'arrayBuffer',{value:vi.fn().mockRejectedValue(new DOMException('Unavailable','NotReadableError'))});
   await expect(snapshotPickedAudio(file)).rejects.toThrow('On My iPhone');
 });
 it('does not decode after the active module changes',async()=>{
   const file=new File(['payload'],'canceled.wav');
   let active=false;
   const store={get:async()=>undefined,put:vi.fn()};
   const decode=vi.fn();
   const library=new FoundLibrary(store,decode);
   await expect(library.import(file,()=>active)).rejects.toThrow('superseded');
   expect(decode).not.toHaveBeenCalled();
 });
 it('LOOP can decode a detached cloud file after its original File handle is invalidated',async()=>{
   const rate=24000,wave=Float32Array.from({length:rate},(_,i)=>Math.sin(i*2*Math.PI*211/rate)*.1);
   const wav=encodeWav({kind:'loopAudio',sampleRate:rate,left:wave,right:wave.slice()});
   const bytes=await wav.arrayBuffer();
   const file=new File([bytes],'loop.wav',{type:'audio/wav'});
   const provider=vi.fn().mockResolvedValueOnce(bytes).mockRejectedValue(new DOMException('unmounted','NotReadableError'));
   Object.defineProperty(file,'arrayBuffer',{value:provider});
   const detached=await snapshotPickedAudio(file);
   const decoded=await decodeLoopFile(detached,rate);
   expect(decoded.left).toHaveLength(rate);
   expect(decoded.left[100]).toBeCloseTo(wave[100],3);
   expect(provider).toHaveBeenCalledOnce();
 });
 it('allows a 20-second PCM WAV in FOUND but preserves the 16-second LOOP cap',async()=>{
   const rate=24000,frames=20*rate,wave=Float32Array.from({length:frames},(_,i)=>Math.sin(i*2*Math.PI*130/rate)*.08);
   const blob=encodeWav({kind:'loopAudio',sampleRate:rate,left:wave,right:wave.slice()});
   const found=await decodeFound(blob,'local:long','long.wav');
   expect(found.left).toHaveLength(frames);
   expect(found.right).toHaveLength(frames);
   await expect(decodeLoopFile(new File([blob],'long.wav'),24000)).rejects.toThrow('16 seconds');
 },15000);
 it('falls back from unavailable native duration metadata without treating a known over-limit duration as valid',async()=>{
   vi.spyOn(URL,'createObjectURL').mockReturnValue('blob:metadata');
   vi.spyOn(URL,'revokeObjectURL').mockImplementation(()=>{});
   const original=document.createElement.bind(document);
   let available=false;
   vi.spyOn(document,'createElement').mockImplementation(((tag:string)=>{
     const el=original(tag);
     if(tag==='audio'){
       Object.defineProperty(el,'duration',{get:()=>available?90:NaN});
       queueMicrotask(()=>el.dispatchEvent(new Event('loadedmetadata')));
     }
     return el;
   }) as typeof document.createElement);
   await expect(preflightAudioDuration(new Blob(['bytes']),60,{allowUnknown:true})).resolves.toBeUndefined();
   available=true;
   await expect(preflightAudioDuration(new Blob(['bytes']),60,{allowUnknown:true})).rejects.toThrow('60 seconds');
 });
});
