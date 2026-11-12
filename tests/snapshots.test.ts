import {describe,it,expect} from 'vitest';
import {SnapshotStorage,parseSnapshotBank} from '../src/state/SnapshotStorage';
import {metalDrift,hostFever} from '../src/state/presets';
class MemoryStorage implements Storage {
  private values=new Map<string,string>();fail=false;
  get length(){return this.values.size;}clear(){this.values.clear();}key(index:number){return [...this.values.keys()][index]??null;}getItem(key:string){return this.values.get(key)??null;}removeItem(key:string){this.values.delete(key);}setItem(key:string,value:string){if(this.fail)throw new Error('Quota');this.values.set(key,value);}
}
describe('named patch snapshots',()=>{
  it('captures an independent patch and persists it across sessions',()=>{const disk=new MemoryStorage(),bank=new SnapshotStorage(disk),patch=metalDrift(),original=structuredClone(patch);bank.capture(patch,'Before damage');patch.modules[0].params.rate=1;patch.connections=[];const loaded=new SnapshotStorage(disk);expect(loaded.list()[0].patch).toEqual(original);expect(loaded.list()[0].name).toBe('Before damage');loaded.list()[0].patch.connections=[];expect(loaded.list()[0].patch.connections).toHaveLength(4);});
  it('recalls a circuit and goes back to the patch present before recall',()=>{const bank=new SnapshotStorage(new MemoryStorage()),saved=metalDrift(),current=hostFever(),id=bank.capture(saved,'A');expect(bank.canGoBack).toBe(false);expect(bank.recall(id,current)).toEqual(saved);expect(bank.canGoBack).toBe(true);expect(bank.goBack(saved)).toEqual(current);expect(bank.goBack(current)).toEqual(saved);});
  it('exports and imports delayed feedback snapshots, without duplicating a repeated import',()=>{const first=new SnapshotStorage(new MemoryStorage()),second=new SnapshotStorage(new MemoryStorage());first.capture(hostFever(),'Host');second.import(first.export());second.import(first.export());expect(second.list()).toEqual(first.list());expect(second.list()).toHaveLength(1);});
  it('preserves both versions when imported ids collide with a changed entry',()=>{const bank=new SnapshotStorage(new MemoryStorage());bank.capture(metalDrift(),'A');const text=JSON.parse(bank.export());text.snapshots[0].name='B';bank.import(JSON.stringify(text));expect(bank.list()).toHaveLength(2);expect(bank.list()[0].id).not.toBe(bank.list()[1].id);});
  it('validates the whole bank before changing existing snapshots',()=>{const bank=new SnapshotStorage(new MemoryStorage());bank.capture(metalDrift(),'Keep');const before=bank.export(),invalid=JSON.parse(before);invalid.snapshots[0].patch.modules[0].params.rate=9;expect(()=>bank.import(JSON.stringify(invalid))).toThrow();expect(bank.export()).toBe(before);});
  it.each(['{','null','{"kind":"other","version":1,"snapshots":[]}'])('rejects invalid snapshot banks: %s',text=>{expect(()=>parseSnapshotBank(text)).toThrow();});
  it('does not add a snapshot when browser storage fails',()=>{const disk=new MemoryStorage(),bank=new SnapshotStorage(disk);bank.capture(metalDrift(),'Existing');disk.fail=true;expect(()=>bank.capture(hostFever(),'Not saved')).toThrow('could not be stored');expect(bank.list()).toHaveLength(1);});
  it('enforces 20 slots without silently removing older snapshots',()=>{const bank=new SnapshotStorage(new MemoryStorage());for(let i=0;i<20;i++)bank.capture(metalDrift(),String(i));expect(()=>bank.capture(metalDrift(),'Extra')).toThrow('20 snapshots');expect(bank.list()[0].name).toBe('0');});
  it('deletes only the selected snapshot and persists the deletion',()=>{const disk=new MemoryStorage(),bank=new SnapshotStorage(disk),id=bank.capture(metalDrift(),'Delete');bank.capture(hostFever(),'Keep');bank.remove(id);expect(new SnapshotStorage(disk).list().map(s=>s.name)).toEqual(['Keep']);});
  it('reports a corrupt local bank without crashing application startup',()=>{const disk=new MemoryStorage();disk.setItem('signal-machines.snapshots.v1','{');const bank=new SnapshotStorage(disk);expect(bank.warning).toContain('could not be restored');expect(bank.list()).toHaveLength(0);});
  it('keeps application startup possible when the browser storage getter itself throws',()=>{
    const descriptor=Object.getOwnPropertyDescriptor(globalThis,'localStorage');
    try{Object.defineProperty(globalThis,'localStorage',{configurable:true,get(){throw new Error('Storage denied');}});const bank=new SnapshotStorage();expect(bank.warning).toContain('Storage denied');expect(bank.list()).toHaveLength(0);expect(()=>bank.capture(metalDrift(),'Blocked')).toThrow('Browser storage is unavailable');}
    finally{if(descriptor)Object.defineProperty(globalThis,'localStorage',descriptor);else Reflect.deleteProperty(globalThis,'localStorage');}
  });

});
