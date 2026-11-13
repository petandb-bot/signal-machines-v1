import {VISUAL_WIDTH,VISUAL_HEIGHT,signalMotion} from '../visual/SignalMotion';
import { DEFINITIONS, NODE_HEIGHT, NODE_WIDTH, portPosition } from '../graph/definitions';
import { validateConnection } from '../graph/GraphValidator';
import { connect } from '../graph/PatchGraph';
import type { Connection, PortDefinition } from '../graph/types';
import { SIGNAL_COLORS } from '../graph/types';
import type { StateStore } from '../app/StateStore';
import { button, element } from './Controls';
const NS='http://www.w3.org/2000/svg';
// Keep manual zoom consistent with FIT even for very wide (or widely separated) patches.
const MIN_ZOOM=.005;
interface PortRef { module:string;port:string;direction:'in'|'out' }
interface Drag {kind:'pan'|'module'|'cable';pointer:number;startX:number;startY:number;originalX:number;originalY:number;id?:string;pendingCable?:string;startPort?:PortRef;existingArm?:boolean;moved:boolean}
interface Pinch {distance:number;zoom:number;worldX:number;worldY:number}
export class Workspace {
  readonly root=element('section','workspace');readonly viewport=element('div','viewport');readonly world=element('div','world');readonly nodes=element('div','nodes');
  readonly svg=document.createElementNS(NS,'svg');readonly zoomLabel=element('span','zoom-value','100%');
  private hint=element('div','patch-hint');private drag?:Drag;private armed?:PortRef;private pinch?:Pinch;
  private pointers=new Map<number,{x:number;y:number}>();private zoom=1;private panX=0;private panY=0;private cableEnd={x:0,y:0};
  private readonly portraitLayout=window.matchMedia('(max-width:600px) and (orientation:portrait)');
  onSelect:()=>void=()=>{};onError:(message:string)=>void=()=>{};onAdd:()=>void=()=>{};
  constructor(readonly store:StateStore){
    this.root.setAttribute('aria-label','Modular patch workspace');this.svg.classList.add('cables');this.svg.setAttribute('width','1');this.svg.setAttribute('height','1');
    this.world.append(this.svg,this.nodes);this.viewport.append(this.world);
    const nav=element('div','workspace-nav');nav.setAttribute('role','group');nav.setAttribute('aria-label','Workspace zoom controls');nav.append(button('−','Zoom out',()=>this.setZoom(this.zoom/1.2)),this.zoomLabel,button('+','Zoom in',()=>this.setZoom(this.zoom*1.2)),button('FIT','Fit patch to workspace',()=>this.fit(),'fit-button'));
    this.hint.setAttribute('role','status');this.hint.setAttribute('aria-live','polite');this.root.append(this.viewport,nav,this.hint);
    this.viewport.addEventListener('pointerdown',event=>this.pointerDown(event));this.viewport.addEventListener('pointermove',event=>this.pointerMove(event));this.viewport.addEventListener('pointerup',event=>this.pointerUp(event));
    this.viewport.addEventListener('pointercancel',()=>{this.persistMove();this.pointers.clear();this.pinch=undefined;this.cancelDrag();});
    this.viewport.addEventListener('wheel',event=>{event.preventDefault();const r=this.viewport.getBoundingClientRect();this.setZoom(this.zoom*Math.exp(-event.deltaY*.0015),event.clientX-r.left,event.clientY-r.top);},{passive:false});
    this.viewport.addEventListener('dblclick',event=>{if(!(event.target as Element).closest('.module-card,.cable-hit'))this.onAdd();});
    let previousWidth=0,previousHeight=0,previousPortrait=this.portraitLayout.matches;
    new ResizeObserver(()=>{
      const width=this.viewport.clientWidth,height=this.viewport.clientHeight,portrait=this.portraitLayout.matches;
      const firstMeasurement=previousWidth===0&&width>0&&height>0;
      const orientationChanged=previousWidth>0&&previousHeight>0&&portrait!==previousPortrait;
      const portraitWidthChanged=portrait&&previousWidth>0&&Math.abs(width-previousWidth)>8;
      // Safari's collapsing browser chrome changes height: keep the portrait top edge stable.
      // Width changes and the first measured layout must use actual rack bounds.
      if(previousWidth&&previousHeight&&!orientationChanged){this.panX+=(width-previousWidth)/2;if(!portrait)this.panY+=(height-previousHeight)/2;}
      previousWidth=width;previousHeight=height;previousPortrait=portrait;
      if(firstMeasurement||orientationChanged||portraitWidthChanged)this.fit();else this.transform();
    }).observe(this.viewport);
    this.render();requestAnimationFrame(()=>this.fit());
  }
  private point(event:{clientX:number;clientY:number}){const r=this.viewport.getBoundingClientRect();return{x:(event.clientX-r.left-this.panX)/this.zoom,y:(event.clientY-r.top-this.panY)/this.zoom};}
  private insets(){const style=getComputedStyle(this.root);return{left:parseFloat(style.paddingLeft)||0,right:parseFloat(style.paddingRight)||0,bottom:parseFloat(style.paddingBottom)||0};}
  center(){const r=this.viewport.getBoundingClientRect(),safe=this.insets();return{x:((r.width+safe.left-safe.right)/2-this.panX)/this.zoom-NODE_WIDTH/2,y:((r.height-safe.bottom)/2-this.panY)/this.zoom-NODE_HEIGHT/2};}
  vacantPosition(){
    const center=this.center(),modules=this.store.patch.modules;
    for(let ring=0;ring<8;ring++)for(let y=-ring;y<=ring;y++)for(let x=-ring;x<=ring;x++){
      if(ring&&Math.abs(x)!==ring&&Math.abs(y)!==ring)continue;
      const position={x:Math.round((center.x+x*(NODE_WIDTH+32))/8)*8,y:Math.round((center.y+y*(NODE_HEIGHT+24))/8)*8};
      if(modules.every(m=>Math.abs(m.x-position.x)>=NODE_WIDTH+16||Math.abs(m.y-position.y)>=NODE_HEIGHT+16))return position;
    }
    return center;
  }
  fit(){
    const modules=this.store.patch.modules,portrait=this.portraitLayout.matches,safe=this.insets();
    // A portrait rack should occupy a compact stage sized to its content, not the
    // entire tall phone screen. Floating editor/library panels still use the full main area.
    const before=this.viewport.getBoundingClientRect();
    if(!modules.length){
      if(portrait)this.root.style.setProperty('--portrait-stage-height','300px');
      const r=this.viewport.getBoundingClientRect();this.zoom=1;this.panX=r.width/2-150;this.panY=20;this.transform();return;
    }
    const minX=Math.min(...modules.map(m=>m.x))-22,minY=Math.min(...modules.map(m=>m.y))-20;
    const width=Math.max(...modules.map(m=>m.x+NODE_WIDTH))+22-minX,height=Math.max(...modules.map(m=>m.y+NODE_HEIGHT))+48+safe.bottom-minY;
    if(portrait){
      const availableWidth=Math.max(1,before.width-safe.left-safe.right-24);
      const widthFit=Math.min(1,availableWidth/width);
      const mainTop=this.root.parentElement?.getBoundingClientRect().top??0;
      const maxStage=Math.max(240,Math.min(560,window.innerHeight-mainTop-20));
      const stage=Math.min(maxStage,Math.max(270,Math.ceil(height*widthFit+94)));
      this.root.style.setProperty('--portrait-stage-height',`${stage}px`);
    }
    const r=this.viewport.getBoundingClientRect(),available=r.width-safe.left-safe.right;
    // FIT must honor both axes, while keeping the portrait zoom dock visible.
    const usableWidth=Math.max(1,available-(portrait?24:12));
    const usableHeight=Math.max(1,r.height-(portrait?84:12));
    this.zoom=Math.min(1,usableWidth/width,usableHeight/height);
    if(portrait){
      this.panX=safe.left+(available-width*this.zoom)/2-minX*this.zoom;
      this.panY=20-(minY+20)*this.zoom;
    }else{this.panX=safe.left+(available-width*this.zoom)/2-minX*this.zoom;this.panY=(r.height-height*this.zoom)/2-minY*this.zoom;}
    this.transform();
  }
  arrange(){
    // Compact a patch without changing its signal graph or sounds.
    const modules=this.store.patch.modules,columns=Math.max(2,Math.ceil(Math.sqrt(modules.length*1.8)));
    modules.forEach((module,index)=>{module.x=24+(index%columns)*176;module.y=24+Math.floor(index/columns)*168;});
    this.store.patch.layout=2;this.store.changed('layout');this.render();this.fit();
  }
  reveal(id:string,occlusion:number,bottomOcclusion=0){
    const module=this.store.patch.modules.find(m=>m.id===id);if(!module)return;
    const rect=this.viewport.getBoundingClientRect(),safe=this.insets(),right=rect.width-safe.right-occlusion-24,left=safe.left+24,top=18,bottom=rect.height-safe.bottom-bottomOcclusion-50;
    if(right-left<NODE_WIDTH*this.zoom)return;
    const x=module.x*this.zoom+this.panX,y=module.y*this.zoom+this.panY;
    if(x<left)this.panX+=left-x;else if(x+NODE_WIDTH*this.zoom>right)this.panX+=right-x-NODE_WIDTH*this.zoom;
    // If a bottom sheet occupies virtually the whole stage, do not send the chip
    // outside the viewport trying to satisfy an impossible visibility rectangle.
    if(bottom>=top+NODE_HEIGHT*this.zoom){
      if(y<top)this.panY+=top-y;else if(y+NODE_HEIGHT*this.zoom>bottom)this.panY+=bottom-y-NODE_HEIGHT*this.zoom;
    }
    this.transform();
  }
  private setZoom(value:number,x=this.viewport.clientWidth/2,y=this.viewport.clientHeight/2){value=Math.max(MIN_ZOOM,Math.min(2.5,value));const ratio=value/this.zoom;this.panX=x-(x-this.panX)*ratio;this.panY=y-(y-this.panY)*ratio;this.zoom=value;this.transform();}
  private transform(){this.world.style.transform=`translate(${this.panX}px,${this.panY}px) scale(${this.zoom})`;this.viewport.style.backgroundSize=`${24*this.zoom}px ${24*this.zoom}px`;this.viewport.style.backgroundPosition=`${this.panX}px ${this.panY}px`;this.zoomLabel.textContent=`${Math.round(this.zoom*100)}%`;}
  render(){
    if(this.armed&&!this.store.patch.modules.some(m=>m.id===this.armed!.module))this.armed=undefined;
    this.nodes.replaceChildren();
    this.store.patch.modules.forEach((module,index)=>{
      const definition=DEFINITIONS[module.type],card=element('article','module-card');card.dataset.module=module.id;card.style.left=`${module.x}px`;card.style.top=`${module.y}px`;card.style.setProperty('--module-color',definition.color);
      const head=element('div','module-header');head.append(element('span','chip-symbol',definition.symbol),element('h2','',module.type),element('span','module-led'));
      const canvas=element('canvas','module-visual');canvas.width=VISUAL_WIDTH;canvas.height=VISUAL_HEIGHT;canvas.dataset.visual=module.id;canvas.setAttribute('aria-label',`${module.type} live signal display`);card.append(head,canvas);
      for(const port of [...definition.inputs,...definition.outputs]){
        const jack=element('button',`port ${port.direction}`);jack.type='button';jack.dataset.module=module.id;jack.dataset.port=port.id;jack.dataset.direction=port.direction;jack.dataset.signal=port.signal;
        jack.style.top=`${portPosition({x:0,y:0},port).y-12}px`;jack.style.setProperty('--signal-color',SIGNAL_COLORS[port.signal]);
        jack.setAttribute('aria-label',`${module.type} ${port.label} ${port.direction==='in'?'input':'output'}`);jack.title=`${port.label} · ${port.signal.toUpperCase()} ${port.direction==='in'?'INPUT':'OUTPUT'}`;
        jack.append(element('span','jack'),element('span','port-label',port.label));
        jack.addEventListener('click',event=>{if(event.detail===0){event.stopPropagation();this.armPort({module:module.id,port:port.id,direction:port.direction});}});card.append(jack);
      }
      card.append(element('span','chip-index',String(index+1).padStart(2,'0')));card.tabIndex=0;card.setAttribute('aria-label',`Edit ${module.type} module ${index+1}`);
      card.addEventListener('keydown',event=>{if(event.key==='Enter'&&event.target===card)this.select(module.id);});this.nodes.append(card);
    });
    if(!this.store.patch.modules.length){const empty=element('div','empty-field');empty.append(button('+','Open module library',()=>this.onAdd()),element('p','','Add. Connect. Play.'));this.nodes.append(empty);}
    this.refreshSelection();this.highlightPorts();this.renderCables();
  }
  refreshSelection(){this.nodes.querySelectorAll<HTMLElement>('.module-card').forEach(card=>card.classList.toggle('selected',card.dataset.module===this.store.selectedModule));}
  private select(id:string|null){this.store.selectedModule=id;this.store.selectedCable=null;this.refreshSelection();this.renderCables();this.onSelect();}
  armPort(port:PortRef){
    if(this.armed){
      if(this.samePort(this.armed,port)){this.cancelDrag();return;}
      if(this.armed.direction!==port.direction){this.finishCable(port);return;}
    }
    this.armed=port;const origin=this.origin(port);this.cableEnd={x:origin.x+(port.direction==='out'?35:-35),y:origin.y};this.highlightPorts();this.renderCables();
  }
  private samePort(a:PortRef,b:PortRef){return a.module===b.module&&a.port===b.port&&a.direction===b.direction;}
  private ref(element:HTMLElement):PortRef{return{module:element.dataset.module!,port:element.dataset.port!,direction:element.dataset.direction as 'in'|'out'};}
  private findPort(ref:PortRef){return this.nodes.querySelector<HTMLElement>(`.port[data-module="${ref.module}"][data-port="${ref.port}"][data-direction="${ref.direction}"]`);}
  private origin(ref:PortRef){const module=this.store.patch.modules.find(m=>m.id===ref.module)!;const port=[...DEFINITIONS[module.type].inputs,...DEFINITIONS[module.type].outputs].find(p=>p.id===ref.port&&p.direction===ref.direction)!;return portPosition(module,port);}
  private draftEdge(target:PortRef):Connection{const first=this.armed!,a={module:first.module,port:first.port},b={module:target.module,port:target.port};return{id:'preview',from:first.direction==='out'?a:b,to:first.direction==='out'?b:a};}
  private finishCable(target:PortRef){
    const edge=this.draftEdge(target);
    try{connect(this.store.patch,edge.from,edge.to);this.armed=undefined;this.store.changed('routing');}catch(error){this.onError((error as Error).message);}
    this.highlightPorts();this.renderCables();
  }
  private pointerDown(event:PointerEvent){
    if(event.button!==0&&event.button!==1)return;
    const target=event.target as Element;if(target.closest('input'))return;
    this.pointers.set(event.pointerId,{x:event.clientX,y:event.clientY});this.viewport.setPointerCapture(event.pointerId);event.preventDefault();
    if(this.pointers.size>=2){this.persistMove();this.drag=undefined;this.armed=undefined;this.highlightPorts();this.beginPinch();return;}
    const jack=target.closest<HTMLElement>('.port'),card=target.closest<HTMLElement>('.module-card'),cable=target.closest<SVGElement>('.cable-hit');
    const base={pointer:event.pointerId,startX:event.clientX,startY:event.clientY,originalX:0,originalY:0,moved:false};
    if(jack){const ref=this.ref(jack),existingArm=!!this.armed;if(!this.armed)this.armed=ref;this.drag={...base,kind:'cable',startPort:ref,existingArm};this.cableEnd=this.point(event);this.highlightPorts();this.renderCables();}
    else if(cable){this.armed=undefined;this.highlightPorts();this.drag={...base,kind:'pan',originalX:this.panX,originalY:this.panY,pendingCable:cable.dataset.cable!};}
    else if(card){const module=this.store.patch.modules.find(m=>m.id===card.dataset.module)!;this.drag={...base,kind:'module',id:module.id,originalX:module.x,originalY:module.y};}
    else{this.drag={...base,kind:'pan',originalX:this.panX,originalY:this.panY};}
  }
  private beginPinch(){const [a,b]=this.pointers.values();const rect=this.viewport.getBoundingClientRect(),x=(a.x+b.x)/2-rect.left,y=(a.y+b.y)/2-rect.top;this.pinch={distance:Math.max(1,Math.hypot(a.x-b.x,a.y-b.y)),zoom:this.zoom,worldX:(x-this.panX)/this.zoom,worldY:(y-this.panY)/this.zoom};this.renderCables();}
  private pointerMove(event:PointerEvent){
    if(!this.pointers.has(event.pointerId))return;this.pointers.set(event.pointerId,{x:event.clientX,y:event.clientY});
    if(this.pinch&&this.pointers.size>=2){const [a,b]=this.pointers.values(),rect=this.viewport.getBoundingClientRect(),x=(a.x+b.x)/2-rect.left,y=(a.y+b.y)/2-rect.top;this.zoom=Math.max(MIN_ZOOM,Math.min(2.5,this.pinch.zoom*Math.hypot(a.x-b.x,a.y-b.y)/this.pinch.distance));this.panX=x-this.pinch.worldX*this.zoom;this.panY=y-this.pinch.worldY*this.zoom;this.transform();return;}
    const drag=this.drag;if(!drag||drag.pointer!==event.pointerId)return;
    const dx=event.clientX-drag.startX,dy=event.clientY-drag.startY;if(Math.hypot(dx,dy)>(event.pointerType==='touch'?9:4))drag.moved=true;if(!drag.moved)return;
    if(drag.kind==='pan'){this.panX=drag.originalX+dx;this.panY=drag.originalY+dy;this.transform();}
    else if(drag.kind==='module'){
      const module=this.store.patch.modules.find(m=>m.id===drag.id)!;module.x=Math.max(-20000,Math.min(20000,Math.round((drag.originalX+dx/this.zoom)/8)*8));module.y=Math.max(-20000,Math.min(20000,Math.round((drag.originalY+dy/this.zoom)/8)*8));
      const card=this.nodes.querySelector<HTMLElement>(`.module-card[data-module="${module.id}"]`)!;card.style.left=`${module.x}px`;card.style.top=`${module.y}px`;this.store.selectedModule=module.id;this.refreshSelection();this.renderCables();
    }else{this.cableEnd=this.point(event);this.renderCables();}
  }
  private pointerUp(event:PointerEvent){
    this.pointers.delete(event.pointerId);if(this.viewport.hasPointerCapture(event.pointerId))this.viewport.releasePointerCapture(event.pointerId);
    if(this.pinch){this.pinch=undefined;if(this.pointers.size>=2){this.beginPinch();return;}const next=this.pointers.entries().next().value;if(next){this.drag={kind:'pan',pointer:next[0],startX:next[1].x,startY:next[1].y,originalX:this.panX,originalY:this.panY,moved:true};}else this.drag=undefined;return;}
    const drag=this.drag;if(!drag||drag.pointer!==event.pointerId)return;
    if(drag.kind==='cable'){
      const target=document.elementFromPoint(event.clientX,event.clientY)?.closest<HTMLElement>('.port')??(!drag.moved&&drag.startPort?this.findPort(drag.startPort):null);
      if(target){const ref=this.ref(target);
        if(ref.direction!==this.armed?.direction)this.finishCable(ref);
        else if(drag.moved){this.onError('Choose a matching input and output.');this.armed=undefined;}
        else if(drag.existingArm&&this.armed&&this.samePort(ref,this.armed))this.armed=undefined;
        else this.armed=ref;
      }else if(drag.moved)this.armed=undefined;
      this.drag=undefined;this.highlightPorts();this.renderCables();
    }else if(drag.kind==='module'){
      if(drag.moved)this.store.changed('layout');else this.select(drag.id!);this.drag=undefined;
    }else{if(!drag.moved){this.armed=undefined;this.highlightPorts();if(drag.pendingCable){this.store.selectedCable=drag.pendingCable;this.store.selectedModule=null;this.refreshSelection();this.renderCables();this.onSelect();}else this.select(null);}this.drag=undefined;}
  }
  private persistMove(){if(this.drag?.kind==='module'&&this.drag.moved)this.store.changed('layout');}
  cancelDrag(){this.drag=undefined;this.armed=undefined;this.highlightPorts();this.renderCables();}
  private highlightPorts(){
    this.root.classList.toggle('is-patching',!!this.armed);
    this.nodes.querySelectorAll<HTMLElement>('.port').forEach(port=>{port.classList.remove('compatible','incompatible','armed');if(!this.armed)return;const ref=this.ref(port);if(this.samePort(ref,this.armed)){port.classList.add('armed');return;}const error=ref.direction===this.armed.direction?'direction':validateConnection(this.store.patch,this.draftEdge(ref));port.classList.add(error?'incompatible':'compatible');});
    if(this.armed){const module=this.store.patch.modules.find(m=>m.id===this.armed!.module)!;const ports=this.armed.direction==='out'?DEFINITIONS[module.type].outputs:DEFINITIONS[module.type].inputs;const port=ports.find(p=>p.id===this.armed!.port)!;this.hint.replaceChildren(element('span','',`${module.type} / ${port.label} → tap a ${port.signal} ${port.direction==='out'?'input':'output'}`),button('×','Cancel connection',()=>this.cancelDrag()));}else this.hint.replaceChildren();
  }
  private path(from:{x:number;y:number},to:{x:number;y:number}){const bend=Math.max(30,Math.abs(to.x-from.x)*.4);return`M ${from.x} ${from.y} C ${from.x+bend} ${from.y}, ${to.x-bend} ${to.y}, ${to.x} ${to.y}`;}
  renderCables(){
    this.svg.replaceChildren();
    for(const edge of this.store.patch.connections){
      const from=this.store.patch.modules.find(m=>m.id===edge.from.module)!,to=this.store.patch.modules.find(m=>m.id===edge.to.module)!;
      const out=DEFINITIONS[from.type].outputs.find(p=>p.id===edge.from.port)!,input=DEFINITIONS[to.type].inputs.find(p=>p.id===edge.to.port)!;
      const d=this.path(portPosition(from,out),portPosition(to,input)),group=document.createElementNS(NS,'g');group.dataset.source=from.id;group.dataset.port=out.id;group.dataset.signal=out.signal;group.classList.add('cable-group');
      const shadow=document.createElementNS(NS,'path');shadow.setAttribute('d',d);shadow.classList.add('cable-shadow');
      const line=document.createElementNS(NS,'path');line.setAttribute('d',d);line.setAttribute('stroke',SIGNAL_COLORS[out.signal]);line.classList.add('cable-line');if(this.store.selectedCable===edge.id)line.classList.add('selected');
      const hit=document.createElementNS(NS,'path');hit.setAttribute('d',d);hit.dataset.cable=edge.id;hit.classList.add('cable-hit');hit.setAttribute('aria-label',`Cable from ${from.type} ${out.label} to ${to.type} ${input.label}`);group.append(shadow,line,hit);this.svg.append(group);
    }
    if(this.armed){const origin=this.origin(this.armed),path=document.createElementNS(NS,'path');path.setAttribute('d',this.armed.direction==='out'?this.path(origin,this.cableEnd):this.path(this.cableEnd,origin));const module=this.store.patch.modules.find(m=>m.id===this.armed!.module)!;const port=[...DEFINITIONS[module.type].inputs,...DEFINITIONS[module.type].outputs].find(p=>p.id===this.armed!.port&&p.direction===this.armed!.direction) as PortDefinition;path.setAttribute('stroke',SIGNAL_COLORS[port.signal]);path.classList.add('cable-line','preview');this.svg.append(path);}
  }
  updateActivity(){
    this.nodes.querySelectorAll<HTMLElement>('.module-card').forEach(card=>{const t=this.store.telemetry?.modules[card.dataset.module!],module=this.store.patch.modules.find(m=>m.id===card.dataset.module);const activity=module?signalMotion(module.type,t).activity:0;card.style.setProperty('--activity',String(activity));});
    this.svg.querySelectorAll<SVGGElement>('.cable-group').forEach(group=>{const t=this.store.telemetry?.modules[group.dataset.source!];const activity=t?(group.dataset.signal==='control'?(group.dataset.port==='activity'?t.envelope:Math.abs(group.dataset.port==='controlB'||group.dataset.port==='fever'?t.b:t.a)):t.envelope):0;group.style.setProperty('--cable-activity',String(.25+Math.min(1,activity*4)*.65));});
  }
}
