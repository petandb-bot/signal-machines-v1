import {analyzeFound,builtinFound,BUILTINS,FOUND_BYTES,FOUND_RATE,FOUND_SECONDS,foundRef} from './FoundData';
import type {FoundAudio,Builtin} from './FoundData';
import {decodeAiff,isAiff,preflightAudioDuration} from '../audio/AudioFile';
import {resampleStereo} from '../audio/Resample';
import {encodeWav,decodeWav} from '../audio/Wav';
import type {LoopAudio} from '../audio/LoopAudio';
import {validateLoopAudio} from '../audio/LoopAudio';
interface RecordAudio{id:string;name:string;blob:Blob}
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
export async function decodeFound(blob:Blob,id:string,name:string):Promise<FoundAudio>{
  if(!blob.size||blob.size>FOUND_BYTES)throw Error('Use an audio file up to 32 MB and 60 seconds.');
  // AIFF PCM is decoded locally rather than depending on a browser-specific codec.
  if(isAiff(await blob.slice(0,12).arrayBuffer())){
    const source=decodeAiff(await blob.arrayBuffer(),FOUND_SECONDS);
    const audio=resampleStereo(source,FOUND_RATE);
    return analyzeFound(id,name,audio.left,audio.right);
  }
  // Check duration before allocating decoded PCM for compressed/native formats.
  await preflightAudioDuration(blob,FOUND_SECONDS);
  const Context=window.OfflineAudioContext;
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
    const task=(async()=>{if(!current())return undefined;let audio:FoundAudio|undefined;const kind=id.slice(8) as Builtin;if(id.startsWith('builtin:')&&BUILTINS.includes(kind))audio=builtinFound(kind);else{let stored=this.session.get(id);if(!stored)try{stored=await this.storage.get(id);}catch{this.warning='Sample storage is unavailable.';}if(stored)audio=await this.decodeOne(stored.blob,id,stored.name,current);}if(audio)this.cache.set(id,audio);return audio;})();this.pending.set(id,task);try{return await task;}finally{this.pending.delete(id);}}
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
    const pcm=decodeWav(await blob.arrayBuffer(),FOUND_RATE);
    const audio=analyzeFound(id,name,pcm.left,pcm.right);
    if(!current())throw Error('Patch changed before the loop could be copied.');
    let persisted=true;
    try{await this.storage.put({id,name,blob});}
    catch{
      persisted=false;
      if([...this.session.values()].reduce((n,r)=>n+r.blob.size,0)+blob.size>FOUND_BYTES*2)
        throw Error('Session sample memory is full; free browser storage before sending another loop.');
      this.session.set(id,{id,name,blob});
    }
    if(!current())throw Error('Patch changed while the loop snapshot was saved.');
    this.cache.set(id,audio);
    return{audio,persisted};
  }
  async import(file:File,current=()=>true){if(!file.size||file.size>FOUND_BYTES)throw Error('Use an audio file up to 32 MB and 60 seconds.');const id='local:'+crypto.randomUUID(),name=file.name.slice(0,160),audio=await this.decodeOne(file,id,name,current);if(!current())throw Error('Sample load superseded.');let persisted=true;
    try{await this.storage.put({id,name,blob:file});}catch{persisted=false;if([...this.session.values()].reduce((n,r)=>n+r.blob.size,0)+file.size>FOUND_BYTES*2)throw Error('Session sample memory is full; free browser storage before loading another file.');this.session.set(id,{id,name,blob:file});}
    this.cache.set(id,audio);return{audio,persisted};
  }
}
