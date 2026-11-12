import type {Patch} from '../graph/types';
import {SnapshotStorage} from '../state/SnapshotStorage';
import {download} from '../state/PatchStorage';
import {button,element} from './Controls';
export class SnapshotPanel {
  readonly root=element('aside','snapshots floating-panel');readonly storage=new SnapshotStorage();
  onRecall:(patch:Patch)=>void=()=>{};onClose:()=>void=()=>{};onNotice:(message:string,error?:boolean)=>void=()=>{};
  constructor(private current:()=>Patch){this.root.setAttribute('aria-label','Snapshots');this.render();}
  render(){
    this.root.replaceChildren();const top=element('div','panel-top');top.append(element('span','','Snapshots'),button('×','Close snapshots',()=>this.onClose()));
    const info=element('p','snapshot-note','Save chips, cables and settings. Sound restarts on recall. LOOP audio and PRISM spectra are not included; export loop WAVs or record the master to keep sound. Stored in this browser; export a backup to keep it elsewhere.');
    const capture=element('div','snapshot-capture'),name=element('input');name.type='text';name.maxLength=40;name.placeholder=`Snapshot ${String(this.storage.list().length+1).padStart(2,'0')}`;name.setAttribute('aria-label','Snapshot name');
    const save=()=>this.act(()=>{this.storage.capture(this.current(),name.value);this.render();this.onNotice('Snapshot captured');});
    name.addEventListener('keydown',event=>{if(event.key==='Enter')save();});capture.append(name,button('Capture','Capture snapshot',save));
    const list=element('div','snapshot-list');
    for(const snapshot of this.storage.list().reverse()){
      const row=element('div','snapshot-row');row.dataset.snapshot=snapshot.id;const label=element('div','snapshot-label');label.append(element('strong','',snapshot.name),element('span','',`${snapshot.patch.modules.length} chips · ${snapshot.patch.connections.length} cables`));
      row.append(label,button('Recall',`Recall snapshot ${snapshot.name}`,()=>this.act(()=>this.onRecall(this.storage.recall(snapshot.id,this.current())))),button('×',`Delete snapshot ${snapshot.name}`,()=>this.act(()=>{this.storage.remove(snapshot.id);this.render();})));list.append(row);
    }
    if(!list.childElementCount)list.append(element('p','snapshot-note','Capture a circuit before taking it somewhere strange.'));
    const actions=element('div','snapshot-actions');const back=button('Back','Return to patch before recall',()=>this.act(()=>this.onRecall(this.storage.goBack(this.current()))));back.disabled=!this.storage.canGoBack;
    const input=element('input');input.type='file';input.accept='.json,application/json';input.hidden=true;input.addEventListener('change',async()=>{try{const file=input.files?.[0];if(!file)return;if(file.size>4_000_000)throw new Error('Snapshot banks must be smaller than 4 MB.');this.storage.import(await file.text());this.render();this.onNotice('Snapshots imported');}catch(error){this.onNotice((error as Error).message,true);}finally{input.value='';}});
    actions.append(back,button('Export','Export snapshots',()=>this.act(()=>download(new Blob([this.storage.export()],{type:'application/json'}),'signal-machines-snapshots.json'))),button('Import','Import snapshots',()=>input.click()));
    this.root.append(top,info,capture,list,actions,input);
  }
  private act(action:()=>void){try{action();}catch(error){this.onNotice((error as Error).message,true);}}
}
