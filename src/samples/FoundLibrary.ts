import {analyzeFound,builtinFound,BUILTINS,FOUND_BYTES,FOUND_RATE,FOUND_SECONDS,foundRef} from './FoundData';
import type {FoundAudio,Builtin} from './FoundData';
import {decodeAiff,isAiff,preflightAudioDuration} from '../audio/AudioFile';
import {resampleStereo} from '../audio/Resample';
import {encodeWav,decodeWav} from '../audio/Wav';
import type {LoopAudio} from '../audio/LoopAudio';
import {validateLoopAudio} from '../audio/LoopAudio';
interface RecordAudio{id:string;name:string;blob:Blob;origin?:'loop'}
export interface FoundStorage{get(id:string):Promise<RecordAudio|undefined>;put(record:RecordAudio):Promise<void>}
export class IndexedFoundStorage implements FoundStorage{
  private db?:Promise<IDBDatabase>;
  private open(){
    if(this.db)return this.db;
    const pending=new Promise<IDBDatabase>((resolve,reject)=>{
      if(typeof indexedDB==='undefined'){reject(Error('Sample storage is unavailable.'));return;}
      let failed=false;
      const request=indexedDB.open('signal-machines-found-v1',1);
      const fail=(error:Error|DOMException|null)=>{failed=true;reject(error??Error('Sample storage failed.'));};
      request.onupgradeneeded=()=>request.result.createObjectStore('audio',{keyPath:'id'});
      request.onerror=()=>fail(request.error);
      request.onblocked=()=>fail(Error('Sample storage is blocked. Close other tabs and retry.'));
      request.onsuccess=()=>{
        const db=request.result;
        // A blocked request may still succeed after its caller has fallen back to session storage.
        if(failed){db.close();return;}
        const forget=()=>{if(this.db===pending)this.db=undefined;};
        db.onversionchange=()=>{db.close();forget();};db.onclose=forget;
        resolve(db);
      };
    });
    this.db=pending;
    // Rejected/closed connections must not poison every later import in this tab.
    void pending.catch(()=>{if(this.db===pending)this.db=undefined;});
    return pending;
  }
  async get(id:string){const db=await this.open();return new Promise<RecordAudio|undefined>((resolve,reject)=>{const t=db.transaction('audio','readonly'),r=t.objectStore('audio').get(id);r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);t.onabort=()=>reject(t.error);});}
  async put(record:RecordAudio){const db=await this.open();return new Promise<void>((resolve,reject)=>{const t=db.transaction('audio','readwrite');t.objectStore('audio').put(record);t.oncomplete=()=>resolve();t.onabort=()=>reject(t.error??Error('Sample storage failed.'));t.onerror=()=>reject(t.error);});}
}
/** Exact same PCM16 WAV decoder for initial and restored LOOP copies. */
export async function decodeLoopFound(blob:Blob,id:string,name:string):Promise<FoundAudio>{
  if(!blob.size||blob.size>FOUND_BYTES)throw Error('Loop snapshot is too large.');
  const pcm=decodeWav(await blob.arrayBuffer(),FOUND_RATE);
  return analyzeFound(id,name,pcm.left,pcm.right);
}
/**
 * iOS document providers can expose a File before the cloud download is fully readable.
 * Read it once, while the picker still retains the selection, and detach every subsequent
 * operation (metadata, decode, IndexedDB) from the original cloud-backed File handle.
 */
export async function snapshotPickedAudio(file:File,current=()=>true):Promise<Blob>{
  if(!file.size)throw Error('The selected file is empty or not downloaded. In Files, copy it from Box to On My iPhone and select the copy.');
  if(file.size>FOUND_BYTES)throw Error('Use an audio file up to 32 MB and 60 seconds.');
  for(let attempt=0;attempt<3;attempt++){
    if(!current())throw Error('Sample load superseded.');
    let timer:ReturnType<typeof setTimeout>|undefined;
    try{
      const bytes=await Promise.race<ArrayBuffer>([
        file.arrayBuffer(),
        new Promise<ArrayBuffer>((_,reject)=>{
          timer=setTimeout(()=>reject(Error('Cloud file read timed out. Download the file in Box, then copy it to On My iPhone and retry.')),45000);
        }),
      ]);
      if(!current())throw Error('Sample load superseded.');
      if(bytes.byteLength!==file.size)throw Error('The file provider returned an incomplete copy.');
      return new Blob([bytes],{type:file.type||'application/octet-stream'});
    }catch(error){
      if(!current())throw Error('Sample load superseded.');
      if(error instanceof Error&&/timed out/.test(error.message))throw error;
      if(attempt===2)throw Error('Could not read the file from Box/Files. Copy it to On My iPhone and retry. ('+(error instanceof Error?error.name:'read error')+')');
      await new Promise(resolve=>setTimeout(resolve,300*(attempt+1)));
    }finally{if(timer!==undefined)clearTimeout(timer);}
  }
  throw Error('Could not read the selected file.');
}
export async function decodeFound(blob:Blob,id:string,name:string):Promise<FoundAudio>{
  if(!blob.size||blob.size>FOUND_BYTES)throw Error('Use an audio file up to 32 MB and 60 seconds.');
  const header=await blob.slice(0,12).arrayBuffer();
  // WAV and PCM AIFF bypass Safari's sometimes unreliable media-element metadata probe.
  if(isAiff(header)){
    const source=decodeAiff(await blob.arrayBuffer(),FOUND_SECONDS);
    const audio=resampleStereo(source,FOUND_RATE);
    return analyzeFound(id,name,audio.left,audio.right);
  }
  const view=new DataView(header);
  if(header.byteLength>=12&&
    String.fromCharCode(view.getUint8(0),view.getUint8(1),view.getUint8(2),view.getUint8(3))==='RIFF'&&
    String.fromCharCode(view.getUint8(8),view.getUint8(9),view.getUint8(10),view.getUint8(11))==='WAVE'){
    const pcm=decodeWav(await blob.arrayBuffer(),FOUND_RATE,FOUND_SECONDS);
    return analyzeFound(id,name,pcm.left,pcm.right);
  }
  // Native codecs need a duration guard. A small local copy may be decoded even if
  // iOS fails to supply media metadata; duration is validated again after decoding.
  const small=blob.size<=4_000_000;
  await preflightAudioDuration(blob,FOUND_SECONDS,{allowUnknown:small,timeoutMs:small?8000:15000});
  const Context=window.OfflineAudioContext||
    (window as Window & {webkitOfflineAudioContext?:typeof OfflineAudioContext}).webkitOfflineAudioContext;
  if(!Context)throw Error('Audio file decoding is unavailable in this browser.');
  const context=new Context(2,1,FOUND_RATE);
  let decoded:AudioBuffer;
  try{decoded=await context.decodeAudioData(await blob.arrayBuffer());}
  catch{throw Error('This browser cannot decode the audio format. Try WAV or uncompressed AIFF.');}
  if(decoded.duration>FOUND_SECONDS||decoded.duration<.01||decoded.numberOfChannels<1||decoded.numberOfChannels>2)
    throw Error('Use mono/stereo audio up to 60 seconds.');
  return analyzeFound(id,name,decoded.getChannelData(0).slice(),
    decoded.getChannelData(decoded.numberOfChannels===1?0:1).slice());
}
/** Keep only currently selected PCM in memory; originals live in IDB, with a bounded session fallback. */
export class FoundLibrary{
  private cache=new Map<string,FoundAudio>();private pending=new Map<string,Promise<FoundAudio|undefined>>();private session=new Map<string,RecordAudio>();
  warning='';private decoding:Promise<unknown>=Promise.resolve();
  private decodeOne(blob:Blob,id:string,name:string,current=()=>true){const task=this.decoding.then(()=>{if(!current())throw Error('Sample load superseded.');return this.decode(blob,id,name);});this.decoding=task.then(()=>undefined,()=>undefined);return task;}
  constructor(private storage:FoundStorage=new IndexedFoundStorage(),private decode=decodeFound){}
  async get(reference?:string,current=()=>true):Promise<FoundAudio|undefined>{const id=foundRef(reference);const cached=this.cache.get(id);if(cached)return cached;const pending=this.pending.get(id);if(pending)return pending;
    const task=(async()=>{if(!current())return undefined;let audio:FoundAudio|undefined;const kind=id.slice(8) as Builtin;if(id.startsWith('builtin:')&&BUILTINS.includes(kind))audio=builtinFound(kind);else{let stored=this.session.get(id);if(!stored)try{stored=await this.storage.get(id);}catch{this.warning='Sample storage is unavailable.';}if(stored)audio=stored.origin==='loop'?await decodeLoopFound(stored.blob,id,stored.name):await this.decodeOne(stored.blob,id,stored.name,current);}if(audio)this.cache.set(id,audio);return audio;})();this.pending.set(id,task);try{return await task;}finally{this.pending.delete(id);}}
  sessionOnly(id:string){return this.session.has(id);}
  retain(ids:string[]){for(const id of this.cache.keys())if(!ids.includes(id))this.cache.delete(id);}
  /**
   * Snapshot a LOOP's existing PCM into a reusable FOUND/CUTS asset.
   * The WAV bytes are also the persistence source: a page reload will produce
   * the same PCM16-quantized material (no browser audio codec required).
   * Does not modify the original LOOP buffer or current routing.
   */
  async importLoop(clip:LoopAudio,current=()=>true){
    validateLoopAudio(clip,clip.sampleRate);
    if(!current())throw Error('Patch changed before the loop could be copied.');
    const blob=encodeWav(clip);
    if(blob.size>FOUND_BYTES)throw Error('Loop snapshot is too large.');
    const id='local:'+crypto.randomUUID();
    const name='Loop capture '+new Date().toISOString().slice(0,19).replace('T',' ')+'.wav';
    // Decode from the same stored PCM16 container that future sessions will use.
    const audio=await decodeLoopFound(blob,id,name);
    if(!current())throw Error('Patch changed before the loop could be copied.');
    let persisted=true;
    try{await this.storage.put({id,name,blob,origin:'loop'});}
    catch{
      persisted=false;
      if([...this.session.values()].reduce((n,r)=>n+r.blob.size,0)+blob.size>FOUND_BYTES*2)
        throw Error('Session sample memory is full; free browser storage before sending another loop.');
      this.session.set(id,{id,name,blob,origin:'loop'});
    }
    if(!current())throw Error('Patch changed while the loop snapshot was saved.');
    this.cache.set(id,audio);
    return{audio,persisted};
  }
  async import(file:File,current=()=>true,onStage:(message:string)=>void=()=>{}){
    if(file.size>FOUND_BYTES)throw Error('Use an audio file up to 32 MB and 60 seconds.');
    const id='local:'+crypto.randomUUID(),name=typeof file.name==='string'?file.name.slice(0,160):'sample';
    onStage('Reading selected audio from Files / Box…');
    const blob=await snapshotPickedAudio(file,current);
    if(!current())throw Error('Sample load superseded.');
    onStage('Decoding and analyzing audio…');
    const audio=await this.decodeOne(blob,id,name,current);
    if(!current())throw Error('Sample load superseded.');
    onStage('Saving the sample on this device…');
    let persisted=true;
    // Persist the detached Blob, never the cloud-backed File provider handle.
    try{await this.storage.put({id,name,blob});}
    catch{
      persisted=false;
      if([...this.session.values()].reduce((n,r)=>n+r.blob.size,0)+blob.size>FOUND_BYTES*2)
        throw Error('Session sample memory is full; free browser storage before loading another file.');
      this.session.set(id,{id,name,blob});
    }
    if(!current())throw Error('Sample load superseded.');
    this.cache.set(id,audio);return{audio,persisted};
  }
}
