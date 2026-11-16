import type {LoopStatus} from '../audio/LoopAudio';
import {element,button} from './Controls';
export class LoopControls {
  readonly root=element('div','loop-controls');private status=element('p','loop-status','Empty · 16 sec max');private current?:LoopStatus;private busy=false;private signature='';
  private buttons=new Map<string,HTMLButtonElement>();
  constructor(readonly id:string,action:(action:string)=>void,importFile:(file:File)=>void){
    const grid=element('div','loop-actions');
    for(const [key,label,title] of [['record','Record','Record or finish loop'],['dub','Dub','Toggle loop overdub'],['play','Play','Play or pause loop'],['clear','Clear','Clear loop audio'],['export','WAV ↓','Export loop WAV'],['send-found','→ FOUND','Create a FOUND sampler from this loop'],['send-cuts','→ CUTS','Create a CUTS instrument from this loop']] as const){const b=button(label,title,()=>action(key));b.dataset.loopAction=key;grid.append(b);this.buttons.set(key,b);}
    const input=element('input');input.type='file';input.accept='audio/*,.wav,.aif,.aiff,.aifc,.mp3,.m4a,.aac,.ogg,.flac';input.hidden=true;input.addEventListener('change',()=>{const file=input.files?.[0];if(file)importFile(file);input.value='';});const load=button('LOAD ↑','Import loop audio (WAV, AIFF, MP3 and browser-supported formats)',()=>input.click());grid.append(load);this.buttons.set('import',load);
    this.root.append(this.status,grid,element('p','loop-note','Record replaces the take; Dub layers onto it. → FOUND / → CUTS creates a new, independently playable sample module without cables. Reconnect it as you wish. The source LOOP stays intact. Audio is stored locally when supported; patch JSON does not contain sample audio. WAV / AIFF / MP3 / M4A imports: 16 s / 32 MB max.'),input);this.update();
  }
  setBusy(busy:boolean){this.busy=busy;this.signature='';this.update(this.current);}
  update(status?:LoopStatus){
    this.current=status;const frames=status?.frames??0,mode=status?.mode??'empty',seconds=frames/(status?.sampleRate??48000),signature=`${mode}:${seconds.toFixed(1)}:${this.busy}`;if(signature===this.signature)return;this.signature=signature;
    this.status.textContent=`${mode==='overdub'?'Overdub':mode.charAt(0).toUpperCase()+mode.slice(1)} · ${seconds.toFixed(1)} / 16 sec`;
    for(const [action,b] of this.buttons){b.disabled=this.busy||(!['record','import'].includes(action)&&frames<2)||(mode==='recording'&&['dub','play','export','send-found','send-cuts'].includes(action));b.classList.toggle('active',action==='record'&&mode==='recording'||action==='dub'&&mode==='overdub');}
    this.buttons.get('record')!.textContent=mode==='recording'?'Finish':'Record';this.buttons.get('play')!.textContent=mode==='playing'||mode==='overdub'?'Pause':'Play';
  }
}
