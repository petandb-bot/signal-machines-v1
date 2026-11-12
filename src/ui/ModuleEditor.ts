import {TouchControls} from './TouchControls';
import {LoopControls} from './LoopControls';
import type {LoopStatus} from '../audio/LoopAudio';
import {VISUAL_WIDTH,VISUAL_HEIGHT} from '../visual/SignalMotion';
import type { StateStore } from '../app/StateStore';
import { DEFINITIONS,MODE_OPTIONS,WIDE_TYPES,BYPASS_TYPES } from '../graph/definitions';
import type { ModuleState, PortDefinition } from '../graph/types';
import { SIGNAL_COLORS } from '../graph/types';
import { button, element, parameterControl, refreshParameters } from './Controls';
export class ModuleEditor {
  readonly root=element('aside','editor');
  onParameter:(module:ModuleState,id:string,value:number)=>void=()=>{};onDelete:()=>void=()=>{};onClose:()=>void=()=>{};
  private loopControls?:LoopControls;
  onAction:(module:ModuleState,action:string)=>void=()=>{};onImport:(module:ModuleState,file:File)=>void=()=>{};
  onPort:(module:ModuleState,port:PortDefinition)=>void=()=>{};
  constructor(readonly store:StateStore){this.root.setAttribute('aria-label','Module editor');}
  render(){
    this.root.replaceChildren();this.loopControls=undefined;const module=this.store.patch.modules.find(m=>m.id===this.store.selectedModule);
    const heading=element('div','editor-top');heading.append(element('h2','',module?.type??'CABLE'),button('×','Close editor',()=>this.onClose()));this.root.append(heading);
    if(!module){
      const cable=this.store.patch.connections.find(e=>e.id===this.store.selectedCable);
      if(cable){const from=this.store.patch.modules.find(m=>m.id===cable.from.module)!,to=this.store.patch.modules.find(m=>m.id===cable.to.module)!;const output=DEFINITIONS[from.type].outputs.find(p=>p.id===cable.from.port)!,input=DEFINITIONS[to.type].inputs.find(p=>p.id===cable.to.port)!;this.root.append(element('p','connection-detail',`${from.type} ${String(this.store.patch.modules.indexOf(from)+1).padStart(2,'0')} / ${output.label} → ${to.type} ${String(this.store.patch.modules.indexOf(to)+1).padStart(2,'0')} / ${input.label}`),button('Disconnect','Delete selected cable',()=>this.onDelete(),'delete-button'));}return;
    }
    const definition=DEFINITIONS[module.type];this.root.style.setProperty('--module-color',definition.color);
    const visual=element('div','editor-visual'),canvas=element('canvas');canvas.width=VISUAL_WIDTH;canvas.height=VISUAL_HEIGHT;canvas.dataset.visual=module.id;canvas.setAttribute('aria-label',`Expanded ${module.type} signal display`);visual.append(canvas);
    this.root.append(element('p','editor-subtitle',definition.subtitle),visual);
    const controls=element('div','editor-controls');definition.parameters.forEach((_,i)=>controls.append(parameterControl(module,i,(id,value)=>this.onParameter(module,id,value),true)));this.root.append(controls);
    if(module.type==='LOOP'){this.loopControls=new LoopControls(module.id,action=>this.onAction(module,action),file=>this.onImport(module,file));this.loopControls.update(this.store.telemetry?.modules[module.id]?.loop);this.root.append(this.loopControls.root);}
    if(module.type==='ALLOY'){
      const modes=element('div','mode-options');for(const mode of ['SOFT','METAL','ROUGH'] as const){const option=button(mode,`${mode} character`,()=>{module.character=mode;this.store.changed('parameters');modes.querySelectorAll('button').forEach(b=>{b.classList.toggle('active',b===option);b.setAttribute('aria-pressed',String(b===option));});});option.classList.toggle('active',module.character===mode);option.setAttribute('aria-pressed',String(module.character===mode));modes.append(option);}this.root.append(modes);
    }
    const choices=MODE_OPTIONS[module.type];
    if(choices){const modes=element('div','mode-options');modes.setAttribute('aria-label',`${module.type} mode`);for(const mode of choices){const option=button(mode,`${module.type} ${mode} mode`,()=>{module.mode=mode;this.store.changed('parameters');this.refresh(module);modes.querySelectorAll('button').forEach(b=>{b.classList.toggle('active',b===option);b.setAttribute('aria-pressed',String(b===option));});});option.classList.toggle('active',(module.mode??choices[0])===mode);option.setAttribute('aria-pressed',String((module.mode??choices[0])===mode));modes.append(option);}this.root.append(modes);}
    if(WIDE_TYPES.includes(module.type)){const ranges=element('div','mode-options');for(const wide of [false,true]){const option=button(wide?'WIDE':'STANDARD',`${module.type} ${wide?'WIDE':'STANDARD'} frequency range`,()=>{if(wide)module.wide=true;else delete module.wide;this.store.changed('parameters');this.refresh(module);ranges.querySelectorAll('button').forEach(b=>{b.setAttribute('aria-pressed',String(b===option));b.classList.toggle('active',b===option);});});option.classList.toggle('active',!!module.wide===wide);option.setAttribute('aria-pressed',String(!!module.wide===wide));ranges.append(option);}this.root.append(ranges);}
    if(module.type==='TOUCH')this.root.append(new TouchControls(module,()=>this.store.changed('parameters')).root);
    if(BYPASS_TYPES.includes(module.type)){const toggle=button(module.bypass?'Bypassed':'Effect on',`${module.type} bypass`,()=>{if(module.bypass)delete module.bypass;else module.bypass=true;this.store.changed('parameters');toggle.textContent=module.bypass?'Bypassed':'Effect on';toggle.setAttribute('aria-pressed',String(!!module.bypass));},'bypass-button');toggle.setAttribute('aria-pressed',String(!!module.bypass));this.root.append(toggle);}
    if(module.type==='PENDULUM')this.root.append(button('Kick','Kick the pendulums',()=>this.onAction(module,'kick'),'impulse-button'));
    if(module.type==='BOUNCE')this.root.append(button('Kick','Kick the marble',()=>this.onAction(module,'kick'),'impulse-button'));
    const ports=element('div','editor-ports');
    for(const direction of ['in','out'] as const){const column=element('div','port-column');column.append(element('span','eyebrow',direction==='in'?'INPUT':'OUTPUT'));for(const port of direction==='in'?definition.inputs:definition.outputs){const jack=button('',`${module.type} ${port.label} ${direction==='in'?'input':'output'} — tap to connect`,()=>this.onPort(module,port),'editor-port');jack.style.setProperty('--signal-color',SIGNAL_COLORS[port.signal]);jack.append(element('span','port-dot'),element('span','',port.label));column.append(jack);}ports.append(column);}this.root.append(ports);
    const edges=this.store.patch.connections.filter(e=>e.from.module===module.id||e.to.module===module.id);
    if(edges.length){
      const connections=element('div','editor-connections');connections.append(element('span','eyebrow','CONNECTIONS'));
      for(const edge of edges){
        const isSource=edge.from.module===module.id,from=this.store.patch.modules.find(m=>m.id===edge.from.module)!,to=this.store.patch.modules.find(m=>m.id===edge.to.module)!,other=isSource?to:from;
        const output=DEFINITIONS[from.type].outputs.find(p=>p.id===edge.from.port)!,input=DEFINITIONS[to.type].inputs.find(p=>p.id===edge.to.port)!;
        const row=element('div','connection-row');row.dataset.connection=edge.id;
        const label=element('div','connection-label');label.append(element('span','',`${isSource?'→':'←'} ${other.type} ${String(this.store.patch.modules.indexOf(other)+1).padStart(2,'0')}`),element('span','connection-port',`${output.label} → ${input.label}`));
        const unplug=button('Unplug',`Disconnect ${from.type} ${output.label} from ${to.type} ${input.label}`,()=>{this.store.patch.connections=this.store.patch.connections.filter(e=>e.id!==edge.id);this.store.changed('routing');},'unplug-button');
        row.append(label,unplug);connections.append(row);
      }
      this.root.append(connections);
    }
    this.root.append(button('Remove module','Delete selected module and its cables',()=>this.onDelete(),'delete-button'));
  }
  updateTelemetry(){const controls=this.loopControls;if(controls)controls.update(this.store.telemetry?.modules[controls.id]?.loop);}
  setLoopBusy(id:string,busy:boolean){if(this.loopControls?.id===id)this.loopControls.setBusy(busy);}
  setLoopStatus(id:string,status:LoopStatus){if(this.loopControls?.id===id)this.loopControls.update(status);}
  refresh(module:ModuleState){refreshParameters(this.root,module);}
}
