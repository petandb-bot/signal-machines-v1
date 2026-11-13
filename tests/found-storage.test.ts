// @vitest-environment happy-dom
import {describe,it,expect,vi,afterEach} from 'vitest';
import {indexedDB} from 'fake-indexeddb';
import {FoundLibrary,IndexedFoundStorage,decodeFound} from '../src/samples/FoundLibrary';
import {builtinFound} from '../src/samples/FoundData';
afterEach(()=>vi.unstubAllGlobals());
const decode=vi.fn(async(_blob:Blob,id:string,name:string)=>({...builtinFound('room'),id,name}));
describe('FOUND local assets, independent of LOOP',()=>{
 it('retries storage after a transient open failure instead of caching the rejection',async()=>{
   const open=vi.fn().mockImplementationOnce(()=>{
     const request={} as IDBOpenDBRequest;
     Object.defineProperty(request,'error',{value:new DOMException('temporarily unavailable')});
     queueMicrotask(()=>request.onerror?.(new Event('error')));return request;
   }).mockImplementation((name:string,version:number)=>indexedDB.open(name,version));
   vi.stubGlobal('indexedDB',{open});const store=new IndexedFoundStorage();
   await expect(store.get('local:retry')).rejects.toThrow('temporarily unavailable');
   await store.put({id:'local:retry',name:'retry.wav',blob:new Blob(['recovered'])});
   expect((await store.get('local:retry'))?.name).toBe('retry.wav');expect(open).toHaveBeenCalledTimes(2);
 });
 it('closes a late successful connection after a blocked request has already failed',async()=>{
   const request={} as IDBOpenDBRequest,close=vi.fn();
   Object.defineProperty(request,'result',{value:{close}});
   vi.stubGlobal('indexedDB',{open:()=>{queueMicrotask(()=>request.onblocked?.(new Event('blocked') as IDBVersionChangeEvent));return request;}});
   await expect(new IndexedFoundStorage().get('local:blocked')).rejects.toThrow('Close other tabs');
   request.onsuccess?.(new Event('success'));expect(close).toHaveBeenCalledOnce();
 });
 it('persists original audio in IndexedDB and restores it in a new library',async()=>{vi.stubGlobal('indexedDB',indexedDB);const store=new IndexedFoundStorage(),a=new FoundLibrary(store,decode),file=new File(['sound'],'field.mp3');const loaded=await a.import(file);expect(loaded.persisted).toBe(true);const b=new FoundLibrary(new IndexedFoundStorage(),decode),restored=await b.get(loaded.audio.id);expect(restored?.name).toBe('field.mp3');expect(decode).toHaveBeenCalled();});
 it('keeps an import usable in-session when persistence fails and reports a missing reference',async()=>{const a=new FoundLibrary({put:async()=>{throw Error('quota');},get:async()=>undefined},decode),r=await a.import(new File(['sound'],'local.m4a'));expect(r.persisted).toBe(false);expect(a.sessionOnly(r.audio.id)).toBe(true);a.retain([]);expect((await a.get(r.audio.id))?.id).toBe(r.audio.id);expect(await a.get('local:lost')).toBeUndefined();});
 it('rejects size/decoder failures transactionally without losing an existing sample',async()=>{const a=new FoundLibrary({put:async()=>{},get:async()=>undefined},decode);const room=await a.get();await expect(a.import({size:33_000_000} as File)).rejects.toThrow('32 MB');expect(await a.get()).toBe(room);const bad=new FoundLibrary(undefined,async()=>{throw Error('unsupported');});await expect(bad.import(new File(['bad'],'bad.wav'))).rejects.toThrow('unsupported');});
 it('preflights duration before decoding, rejects long files, and decodes at bounded rate without RUN',async()=>{vi.spyOn(URL,'createObjectURL').mockReturnValue('blob:audio');vi.spyOn(URL,'revokeObjectURL').mockImplementation(()=>{});const native=document.createElement.bind(document);let seconds=61;vi.spyOn(document,'createElement').mockImplementation(((tag:string)=>{const el=native(tag);if(tag==='audio'){Object.defineProperty(el,'duration',{get:()=>seconds});queueMicrotask(()=>el.dispatchEvent(new Event('loadedmetadata')));}return el;}) as typeof document.createElement);
 const decoder=vi.fn(async()=>({duration:1,numberOfChannels:1,getChannelData:()=>new Float32Array(24000).fill(.02)}));class Offline{constructor(channels:number,_length:number,rate:number){expect(channels).toBe(2);expect(rate).toBe(24000);}decodeAudioData=decoder;}vi.stubGlobal('OfflineAudioContext',Offline);const file=new File(['valid-ish'],'sound.wav');await expect(decodeFound(file,'local:a','sound')).rejects.toThrow('60 seconds');expect(decoder).not.toHaveBeenCalled();seconds=1;const a=await decodeFound(file,'local:a','sound');expect(a.left).toHaveLength(24000);expect(a.right).not.toBe(a.left);expect(a.left).toEqual(a.right);vi.restoreAllMocks();});
});
