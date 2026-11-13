import {MAX_FOUND,foundRef} from '../samples/FoundData';
import {installPalette} from '../visual/Palette';
import type {RecordingFormat} from '../audio/PcmRecording';
import {MODULE_GROUPS} from '../graph/catalog';
import {MAX_LOOPS} from '../audio/LoopAudio';
import type {LoopAudio,LoopStatus} from '../audio/LoopAudio';
import {encodeWav,decodeWav} from '../audio/Wav';
import { StateStore } from './StateStore';
import { AudioEngine } from '../audio/AudioEngine';
import { DEFINITIONS } from '../graph/definitions';
import { createModule, removeModule } from '../graph/PatchGraph';
import type { ModuleState, ModuleType } from '../graph/types';
import { download, downloadPatch, parsePatch } from '../state/PatchStorage';
import { emptyPatch, PRESETS } from '../state/presets';
import {readVisualMode,saveVisualMode} from '../visual/SignalMotion';
import { PixelRenderer } from '../visual/PixelRenderer';
import { Workspace } from '../ui/Workspace';
import { ModuleEditor } from '../ui/ModuleEditor';
import { SnapshotPanel } from '../ui/SnapshotPanel';
import { button, element } from '../ui/Controls';
export class AppController {
  readonly store=new StateStore();readonly audio=new AudioEngine();readonly workspace=new Workspace(this.store);readonly editor=new ModuleEditor(this.store);readonly snapshots=new SnapshotPanel(()=>this.store.patch);
  private foundImports=new Map<string,number>();private foundPending=new Set<string>();
  private runButton=button('▶','Run audio engine',()=>void this.toggleRun(),'run-button');
  private recButton=button('●','Record master output',()=>void this.toggleRecording(),'record-button');
  private addButton=button('+','Add a module',()=>this.togglePanel('library'),'add-button');
  private menuButton=button('···','Patch menu',()=>this.togglePanel('menu'),'menu-button');
  private tempo=element('input','tempo-input');private volume=element('input','master-range');private preset=element('select','preset-select');
  private recordingFormat=element('select','record-format');
  private meter=element('span','master-meter');private status=element('span','engine-status','Stopped');
  private toast=element('div','toast');private toastTimer?:ReturnType<typeof setTimeout>;private loadInput=element('input');private busy=false;private saveWarningShown=false;
  private library=element('aside','library floating-panel');private menu=element('aside','patch-menu floating-panel');
  constructor(readonly root:HTMLElement){
    this.build();
    this.store.onChange=type=>{
      if(type!=='layout')this.audio.sync(this.store.patch,type==='routing'||type==='replace',type==='replace');
      if(type==='routing'||type==='replace'){this.workspace.render();this.editor.render();if(!this.store.selectedModule&&!this.store.selectedCable)this.root.classList.remove('editor-visible');}
      if(type==='replace'){this.workspace.cancelDrag();this.closePanels();this.refreshProject();requestAnimationFrame(()=>this.workspace.fit());}
    };
    this.store.onStorageError=message=>{if(!this.saveWarningShown){this.notify(message,true);this.saveWarningShown=true;}};
    this.editor.onFoundInspect=module=>{if(this.foundPending.has(module.id)){this.editor.setFoundStatus(module.id,undefined,'Loading and analyzing…',true);return;}const reference=foundRef(module.sample);void this.audio.foundLibrary.get(reference,()=>this.store.patch.modules.some(m=>m.type==='FOUND'&&foundRef(m.sample)===reference)).then(audio=>{if(this.store.patch.modules.includes(module)&&foundRef(module.sample)===reference)this.editor.setFoundStatus(module.id,audio,this.audio.foundLibrary.sessionOnly(reference)?audio?.name+' · session only':undefined);}).catch(error=>{if(this.store.patch.modules.includes(module)&&foundRef(module.sample)===reference)this.editor.setFoundStatus(module.id,undefined,error.message);}).finally(()=>this.audio.foundLibrary.retain(this.store.patch.modules.filter(m=>m.type==='FOUND').map(m=>foundRef(m.sample))));};
    this.editor.onFoundChoose=(module,ref)=>{module.sample=ref;this.store.changed('routing');};
    this.editor.onFoundFile=(module,file)=>void this.importFound(module,file);
    this.editor.onParameter=(module,id,value)=>this.parameter(module,id,value);
    this.workspace.onSelect=()=>{this.closePanels();this.editor.render();const selected=!!(this.store.selectedModule||this.store.selectedCable);this.root.classList.toggle('editor-visible',selected);if(this.store.selectedModule)requestAnimationFrame(()=>{const editor=this.editor.root.getBoundingClientRect(),field=this.workspace.viewport.getBoundingClientRect();this.workspace.reveal(this.store.selectedModule!,editor.width>field.width*.65?0:editor.width,editor.width>field.width*.65?editor.height:0);});};
    this.workspace.onError=message=>this.notify(message,true);this.workspace.onAdd=()=>this.togglePanel('library');
    this.snapshots.onRecall=patch=>{this.store.replace(patch);this.notify('Snapshot recalled. Sound restarted.');};this.snapshots.onClose=()=>this.closePanels();this.snapshots.onNotice=(message,error)=>this.notify(message,error);
    this.editor.onAction=(module,action)=>void this.performModuleAction(module,action);this.editor.onImport=(module,file)=>void this.performModuleAction(module,'import',file);
    this.editor.onDelete=()=>this.deleteSelection();this.editor.onClose=()=>this.root.classList.remove('editor-visible');
    this.editor.onPort=(module,port)=>{this.root.classList.remove('editor-visible');this.workspace.armPort({module:module.id,port:port.id,direction:port.direction});};
    this.audio.onTelemetry=data=>{this.store.telemetry=data;this.editor.updateTelemetry();if(data.faults>0&&this.audio.running){void this.audio.stop().then(()=>this.refreshTransport());this.notify('An invalid audio signal was stopped. Reload the patch before restarting.',true);}};
    this.audio.onRecordingReady=result=>{download(result.blob,`signal-machines-${Date.now()}.${result.extension}`);this.refreshTransport();this.notify('Recording downloaded');};
    this.audio.onError=message=>{this.refreshTransport();this.notify(message,true);};
    this.editor.render();this.refreshProject();
    new PixelRenderer(this.store,this.root,()=>{this.workspace.updateActivity();this.meter.style.setProperty('--level',`${Math.min(100,(this.store.telemetry?.peak??0)*158)}%`);});
    document.addEventListener('keydown',event=>{
      if(event.key==='Escape'&&this.root.classList.contains('editor-visible')&&this.editor.cancelDelete()){event.preventDefault();return;}
      if((event.target as Element).closest('input,textarea,select,button,a,[contenteditable]'))return;
      if(event.code==='Space'){event.preventDefault();void this.toggleRun();}
      else if(event.key==='Delete'||event.key==='Backspace'){event.preventDefault();this.deleteSelection();}
      else if(event.key==='Escape'){this.workspace.cancelDrag();this.closePanels();}
      else if(event.key.toLowerCase()==='f')this.workspace.fit();
    });
    if(this.store.initialWarning||this.snapshots.storage.warning)this.notify(this.store.initialWarning||this.snapshots.storage.warning,true);
  }
  private build(){
    installPalette(document.documentElement);this.root.classList.add('instrument');this.root.dataset.visuals=readVisualMode();const header=element('header','topbar');header.setAttribute('aria-label','Transport and patch tools');
    const tempoLabel=element('label','tempo-control');this.tempo.type='number';this.tempo.inputMode='numeric';this.tempo.min='20';this.tempo.max='300';this.tempo.step='1';this.tempo.setAttribute('aria-label','Tempo in BPM');this.tempo.addEventListener('change',()=>{this.store.patch.bpm=Math.min(300,Math.max(20,Number(this.tempo.value)||76));this.tempo.value=String(this.store.patch.bpm);this.store.changed('parameters');});tempoLabel.append(this.tempo,element('span','','bpm'));
    const master=element('label','master-control');this.volume.type='range';this.volume.min='0';this.volume.max='1';this.volume.step='.001';this.volume.setAttribute('aria-label','Master volume');this.volume.addEventListener('input',()=>{this.store.patch.master=Number(this.volume.value);this.store.changed('parameters');});master.append(element('span','','vol'),this.volume,this.meter);
    this.preset.setAttribute('aria-label','Preset');const custom=element('option','','Patch');custom.value='custom';this.preset.append(custom);
    PRESETS.forEach((preset,index)=>{const option=element('option','',preset.name.toLowerCase());option.value=String(index);option.title=preset.description;this.preset.append(option);});this.preset.addEventListener('change',()=>{const preset=PRESETS[Number(this.preset.value)];if(this.preset.value!=='custom'&&preset)this.store.replace(preset.create());});
    header.append(this.runButton,tempoLabel,master,this.preset,this.recButton,this.addButton,this.menuButton);
    this.library.setAttribute('aria-label','Module library');const libraryTop=element('div','panel-top');libraryTop.append(element('span','','Add a module'),button('×','Close module library',()=>this.closePanels()));this.library.append(libraryTop);
    for(const group of MODULE_GROUPS){const section=element('section','library-section'),title=element('h3','library-heading',group.name),grid=element('div','module-grid');section.setAttribute('aria-label',group.name);
      for(const type of group.types){const definition=DEFINITIONS[type],add=button('',`Add ${type} module`,()=>this.addModule(type),'library-module');add.style.setProperty('--module-color',definition.color);add.append(element('span','library-icon',definition.symbol),element('strong','',type),element('span','library-subtitle',definition.subtitle));grid.append(add);}section.append(title,grid);this.library.append(section);}
    this.menu.setAttribute('aria-label','Patch menu');const menuTop=element('div','panel-top');menuTop.append(element('span','','Patch'),button('×','Close patch menu',()=>this.closePanels()));
    this.menu.append(menuTop,button('Snapshots','Open snapshots',()=>{this.closePanels();this.snapshots.render();this.root.classList.add('snapshots-visible');}),button('Save JSON','Export patch as JSON',()=>{try{downloadPatch(this.store.patch);this.closePanels();this.notify('Patch saved');}catch(error){this.notify((error as Error).message,true);}}),button('Load JSON','Import a JSON patch',()=>{this.closePanels();this.loadInput.click();}),button('New patch','Create an empty patch',()=>this.store.replace(emptyPatch())),button('Arrange chips','Arrange modules compactly',()=>{this.closePanels();this.workspace.arrange();}),button('How to play','Show touch and patching instructions',()=>{this.closePanels();this.notify('Tap a chip to edit. Drag to move. Tap an output, then an input to connect; the editor has larger jacks. Pinch to zoom, drag the background to pan. To remove a wire: tap the cable → Disconnect, or use Unplug in a chip’s Connections.',false,10000);}));
    const visuals=button(`Visuals: ${this.root.dataset.visuals}`,'Toggle visual motion',()=>{const mode=this.root.dataset.visuals==='quiet'?'lively':'quiet';this.root.dataset.visuals=mode;saveVisualMode(mode);visuals.textContent=`Visuals: ${mode}`;visuals.setAttribute('aria-pressed',String(mode==='lively'));});visuals.setAttribute('aria-pressed',String(this.root.dataset.visuals==='lively'));this.menu.append(visuals);
    this.recordingFormat.setAttribute('aria-label','Recording format');for(const [value,label] of [['wav','WAV · 24-bit'],['aiff','AIFF · 24-bit'],['browser','Browser · compressed']]){const option=element('option','',label);option.value=value;this.recordingFormat.append(option);}const recordLabel=element('label','record-format-label','Record format');recordLabel.append(this.recordingFormat,element('span','record-format-note','WAV / AIFF: up to 3 min / 48 MB'));this.menu.append(recordLabel);
    const source=element('a','source-download','Source + guide ↗');source.href='./downloads/signal-machines-v0.16.0.zip';source.download='signal-machines-v0.16.0.zip';source.setAttribute('aria-label','Download project source, tests and guide');this.menu.append(source,this.status);
    const main=element('main','main-layout');main.append(this.workspace.root,this.library,this.editor.root,this.menu,this.snapshots.root);
    this.loadInput.type='file';this.loadInput.accept='.json,application/json';this.loadInput.hidden=true;this.loadInput.addEventListener('change',()=>void this.loadPatch());this.toast.setAttribute('role','status');this.toast.setAttribute('aria-live','polite');this.root.append(header,main,this.loadInput,this.toast);
  }
  private togglePanel(panel:'library'|'menu'){const className=panel==='library'?'library-visible':'menu-visible',open=!this.root.classList.contains(className);this.closePanels();if(open)this.root.classList.add(className);this.addButton.setAttribute('aria-expanded',String(open&&panel==='library'));this.menuButton.setAttribute('aria-expanded',String(open&&panel==='menu'));}
  private closePanels(){this.root.classList.remove('library-visible','menu-visible','editor-visible','snapshots-visible');this.addButton.setAttribute('aria-expanded','false');this.menuButton.setAttribute('aria-expanded','false');}
  private refreshProject(){this.tempo.value=String(this.store.patch.bpm);this.volume.value=String(this.store.patch.master);const index=PRESETS.findIndex(p=>p.name===this.store.patch.name);this.preset.value=index===-1?'custom':String(index);}
  private parameter(module:ModuleState,id:string,value:number){module.params[id]=value;this.store.changed('parameters');this.editor.refresh(module);}
  private addModule(type:ModuleType){
    if(this.store.patch.modules.length>=48){this.notify('This patch has reached the 48 module limit.',true);return;}
    if(type==='FOUND'&&this.store.patch.modules.filter(m=>m.type==='FOUND').length>=MAX_FOUND){this.notify('A patch can contain at most 2 FOUND modules.',true);return;}
    if(type==='LOOP'&&this.store.patch.modules.filter(m=>m.type==='LOOP').length>=MAX_LOOPS){this.notify('A patch can contain at most 4 LOOP modules.',true);return;}
    const position=this.workspace.vacantPosition(),module=createModule(type,position.x,position.y,(this.store.patch.seed+this.store.patch.modules.length*7919+1)>>>0);
    this.store.patch.modules.push(module);this.store.selectedModule=module.id;this.store.selectedCable=null;this.closePanels();this.store.changed('routing');this.workspace.reveal(module.id,0);this.notify(`${type} added`);
  }
  private async importFound(module:ModuleState,file:File){
    const sequence=(this.foundImports.get(module.id)??0)+1;this.foundImports.set(module.id,sequence);this.foundPending.add(module.id);const reference=foundRef(module.sample);this.editor.setFoundStatus(module.id,undefined,'Loading and analyzing…',true);
    try{const {audio,persisted}=await this.audio.foundLibrary.import(file,()=>this.foundImports.get(module.id)===sequence&&this.store.patch.modules.includes(module)&&foundRef(module.sample)===reference);if(this.foundImports.get(module.id)===sequence&&this.store.patch.modules.includes(module)&&foundRef(module.sample)===reference){module.sample=audio.id;this.store.changed('routing');this.editor.setFoundStatus(module.id,audio,persisted?undefined:audio.name+' · session only; browser storage failed.');if(!persisted)this.notify('Sample is usable this session, but browser storage failed.',true);}}
    catch(error){if(this.foundImports.get(module.id)===sequence&&this.store.patch.modules.includes(module)&&foundRef(module.sample)===reference){this.editor.setFoundStatus(module.id,undefined,(error as Error).message);this.notify((error as Error).message,true);}}
    finally{if(this.foundImports.get(module.id)===sequence)this.foundPending.delete(module.id);this.audio.foundLibrary.retain(this.store.patch.modules.filter(m=>m.type==='FOUND').map(m=>foundRef(m.sample)));}
  }
  private deleteSelection(){
    if(this.store.selectedCable){this.store.patch.connections=this.store.patch.connections.filter(e=>e.id!==this.store.selectedCable);this.store.selectedCable=null;this.store.changed('routing');this.notify('Cable removed');}
    else if(this.store.selectedModule){removeModule(this.store.patch,this.store.selectedModule);this.store.selectedModule=null;this.store.changed('routing');this.notify('Module removed');}
  }
  private async performModuleAction(module:ModuleState,action:string,file?:File){
    if(this.busy)return;this.busy=true;this.editor.setLoopBusy(module.id,true);
    try{
      if(!this.audio.running)await this.audio.start(this.store.patch);
      let payload:LoopAudio|undefined;
      if(action==='import'){if(!file)throw new Error('Choose a WAV file.');if(file.size>32_000_000)throw new Error('Use a WAV file smaller than 32 MB.');payload=decodeWav(await file.arrayBuffer(),this.audio.sampleRate);}
      const result=await this.audio.moduleAction(module.id,action,payload);
      if(action==='export'){download(encodeWav(result as LoopAudio),`signal-machines-loop-${Date.now()}.wav`);this.notify('Loop WAV exported');}
      else if(module.type==='LOOP')this.editor.setLoopStatus(module.id,result as LoopStatus);
    }catch(error){this.notify((error as Error).message,true);}finally{this.busy=false;this.editor.setLoopBusy(module.id,false);this.refreshTransport();}
  }
  private async toggleRun(){
    if(this.busy)return;this.busy=true;this.runButton.disabled=true;
    try{if(this.audio.running){try{if(this.audio.recording)await this.finishRecording();}finally{await this.audio.stop();}}else await this.audio.start(this.store.patch);}
    catch(error){this.notify(`Audio could not start: ${(error as Error).message}`,true);}finally{this.busy=false;this.runButton.disabled=false;this.refreshTransport();}
  }
  private refreshTransport(){
    this.runButton.textContent=this.audio.running?'■':'▶';this.runButton.setAttribute('aria-label',this.audio.running?'Stop audio engine':'Run audio engine');this.runButton.classList.toggle('running',this.audio.running);
    this.status.textContent=this.audio.running?'Playing':'Stopped';this.root.classList.toggle('is-running',this.audio.running);this.recButton.classList.toggle('recording',this.audio.recording);this.recordingFormat.disabled=this.audio.recording;this.recButton.setAttribute('aria-label',this.audio.recording?'Stop recording and download':'Record master output');if(!this.audio.running)this.store.telemetry=undefined;
  }
  private async toggleRecording(){
    if(this.busy)return;this.busy=true;this.recButton.disabled=true;try{if(this.audio.recording)await this.finishRecording();else{await this.audio.startRecording(this.store.patch,this.recordingFormat.value as RecordingFormat);this.notify('Recording master output');}}catch(error){this.notify((error as Error).message,true);}finally{this.busy=false;this.recButton.disabled=false;this.refreshTransport();}
  }
  private async finishRecording(){const result=await this.audio.stopRecording();download(result.blob,`signal-machines-${Date.now()}.${result.extension}`);this.notify('Recording downloaded');}
  private async loadPatch(){const file=this.loadInput.files?.[0];if(!file)return;try{if(file.size>1_000_000)throw new Error('Patch files must be smaller than 1 MB.');this.store.replace(parsePatch(await file.text()));this.notify('Patch loaded');}catch(error){this.notify(`Import failed: ${(error as Error).message}`,true);}finally{this.loadInput.value='';}}
  private notify(message:string,error=false,duration=3000){this.toast.textContent=message;this.toast.classList.toggle('error',error);this.toast.classList.add('visible');clearTimeout(this.toastTimer);this.toastTimer=setTimeout(()=>this.toast.classList.remove('visible'),error?8000:duration);}
}
