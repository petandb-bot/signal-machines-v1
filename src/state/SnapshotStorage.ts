import type {Patch} from '../graph/types';
import {parsePatch} from './PatchStorage';
export interface Snapshot {id:string;name:string;createdAt:string;patch:Patch}
interface Bank {kind:'signal-machines.snapshots';version:1;snapshots:Snapshot[]}
const KEY='signal-machines.snapshots.v1';
const MAX=20;
export function parseSnapshotBank(text:string):Bank{
  if(text.length>4_000_000)throw new Error('Snapshot banks must be smaller than 4 MB.');
  let value:Bank;try{value=JSON.parse(text);}catch{throw new Error('Invalid snapshot JSON.');}
  if(!value||value.kind!=='signal-machines.snapshots'||value.version!==1||!Array.isArray(value.snapshots)||value.snapshots.length>MAX)throw new Error('Unsupported snapshot bank.');
  const ids=new Set<string>();
  const snapshots=value.snapshots.map(item=>{
    if(!item||typeof item.id!=='string'||!/^[a-zA-Z0-9_-]{1,80}$/.test(item.id)||ids.has(item.id)||typeof item.name!=='string'||!item.name.trim()||item.name.length>40||typeof item.createdAt!=='string'||item.createdAt.length>40||!Number.isFinite(Date.parse(item.createdAt)))throw new Error('Invalid snapshot entry.');
    if(!item.patch||typeof item.patch!=='object')throw new Error('Invalid snapshot patch.');
    ids.add(item.id);return{id:item.id,name:item.name,createdAt:item.createdAt,patch:parsePatch(JSON.stringify(item.patch))};
  });
  return{kind:'signal-machines.snapshots',version:1,snapshots};
}
export class SnapshotStorage {
  private entries:Snapshot[]=[];private previous?:Patch;warning='';
  private storage?:Storage;
  constructor(storage?:Storage){try{this.storage=storage??globalThis.localStorage;const raw=this.storage.getItem(KEY);if(raw)this.entries=parseSnapshotBank(raw).snapshots;}catch(error){this.warning=`Snapshots could not be restored: ${(error as Error).message}`;}}
  list(){return structuredClone(this.entries);}
  get canGoBack(){return !!this.previous;}
  private persist(entries:Snapshot[]){
    if(!this.storage)throw new Error('Browser storage is unavailable. Enable site storage to save snapshots.');
    try{this.storage.setItem(KEY,JSON.stringify({kind:'signal-machines.snapshots',version:1,snapshots:entries}));}
    catch{throw new Error('Snapshots could not be stored. Free browser storage or export your snapshots first.');}
    this.entries=entries;
  }
  capture(patch:Patch,name:string){
    if(this.entries.length>=MAX)throw new Error('20 snapshots are stored. Export or remove one before capturing another.');
    const snapshot:Snapshot={id:crypto.randomUUID(),name:name.replace(/\s+/g,' ').trim().slice(0,40)||`Snapshot ${String(this.entries.length+1).padStart(2,'0')}`,createdAt:new Date().toISOString(),patch:parsePatch(JSON.stringify(patch))};
    this.persist([...this.entries,snapshot]);return snapshot.id;
  }
  recall(id:string,current:Patch){const snapshot=this.entries.find(s=>s.id===id);if(!snapshot)throw new Error('Snapshot not found.');const next=structuredClone(snapshot.patch);this.previous=structuredClone(current);return next;}
  goBack(current:Patch){if(!this.previous)throw new Error('There is no recalled patch to go back from.');const next=this.previous;this.previous=structuredClone(current);return structuredClone(next);}
  remove(id:string){if(!this.entries.some(s=>s.id===id))throw new Error('Snapshot not found.');this.persist(this.entries.filter(s=>s.id!==id));}
  export(){return JSON.stringify({kind:'signal-machines.snapshots',version:1,snapshots:this.entries},null,2);}
  import(text:string){
    const incoming=parseSnapshotBank(text).snapshots,next=structuredClone(this.entries);
    for(const snapshot of incoming){const existing=next.find(s=>s.id===snapshot.id);if(existing&&JSON.stringify(existing)===JSON.stringify(snapshot))continue;if(existing)snapshot.id=crypto.randomUUID();next.push(snapshot);}
    if(next.length>MAX)throw new Error('Import would exceed the 20 snapshot limit. Your existing snapshots were kept.');
    this.persist(next);
  }
}
