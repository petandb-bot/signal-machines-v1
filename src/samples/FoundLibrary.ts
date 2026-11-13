import {analyzeFound,builtinFound,BUILTINS,FOUND_BYTES,FOUND_RATE,FOUND_SECONDS,foundRef} from './FoundData';
import type {FoundAudio,Builtin} from './FoundData';
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
  // Ask the media decoder for duration before allocating decoded PCM, including compressed files.
  await new Promise<void>((resolve,reject)=>{const el=document.createElement('audio'),url=URL.createObjectURL(blob);let done=false;const finish=(error?:Error)=>{if(done)return;done=true;clearTimeout(timer);el.onloadedmetadata=el.onerror=null;el.removeAttribute('src');el.load();URL.revokeObjectURL(url);error?reject(error):resolve();};const timer=setTimeout(()=>finish(Error('Could not read audio duration.')),15000);el.preload='metadata';el.onloadedmetadata=()=>finish(Number.isFinite(el.duration)&&el.duration>=.01&&el.duration<=FOUND_SECONDS?undefined:Error('Use audio between 0.01 and 60 seconds.'));el.onerror=()=>finish(Error('This audio format could not be read. Try WAV.'));el.src=url;});
  const Context=window.OfflineAudioContext;if(!Context)throw Error('Audio file decoding is unavailable in this browser.');
  const context=new Context(2,1,FOUND_RATE),decoded=await context.decodeAudioData(await blob.arrayBuffer());
  if(decoded.duration>FOUND_SECONDS||decoded.duration<.01||decoded.numberOfChannels<1||decoded.numberOfChannels>2)throw Error('Use mono/stereo audio up to 60 seconds.');
  return analyzeFound(id,name,decoded.getChannelData(0).slice(),decoded.getChannelData(decoded.numberOfChannels===1?0:1).slice());
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
  async import(file:File,current=()=>true){if(!file.size||file.size>FOUND_BYTES)throw Error('Use an audio file up to 32 MB and 60 seconds.');const id='local:'+crypto.randomUUID(),name=file.name.slice(0,160),audio=await this.decodeOne(file,id,name,current);if(!current())throw Error('Sample load superseded.');let persisted=true;
    try{await this.storage.put({id,name,blob:file});}catch{persisted=false;if([...this.session.values()].reduce((n,r)=>n+r.blob.size,0)+file.size>FOUND_BYTES*2)throw Error('Session sample memory is full; free browser storage before loading another file.');this.session.set(id,{id,name,blob:file});}
    this.cache.set(id,audio);return{audio,persisted};
  }
}
