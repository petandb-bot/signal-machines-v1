import type {Gesture,ModuleState} from '../graph/types';
import {button,element} from './Controls';
/** The drawing pad is separate from chip dragging. A cancelled gesture keeps the old path. */
export class TouchControls {
  readonly root=element('div','touch-controls');readonly pad=element('div','touch-pad');private svg=document.createElementNS('http://www.w3.org/2000/svg','svg');private line=document.createElementNS('http://www.w3.org/2000/svg','polyline');private points:Gesture['points']=[];private pointer?:number;private start=0;
  constructor(private readonly module:ModuleState,changed:()=>void){
    this.pad.setAttribute('aria-label','Draw TOUCH motion path');this.pad.setAttribute('role','application');this.pad.tabIndex=0;this.svg.setAttribute('viewBox','0 0 200 120');this.svg.setAttribute('aria-hidden','true');this.svg.append(this.line);this.pad.append(this.svg);this.root.append(element('p','touch-hint','Draw a path. It becomes X / Y movement.'),this.pad,button('Clear path','Restore TOUCH circle',()=>{this.pointer=undefined;this.points=[];delete module.gesture;this.draw();changed();}));
    this.pad.addEventListener('pointerdown',event=>{if(event.button!==0||this.pointer!==undefined)return;event.preventDefault();event.stopPropagation();this.pointer=event.pointerId;this.start=event.timeStamp;this.points=[];this.pad.setPointerCapture(event.pointerId);this.point(event);});
    this.pad.addEventListener('pointermove',event=>{if(this.pointer!==event.pointerId)return;event.preventDefault();event.stopPropagation();this.point(event);});
    this.pad.addEventListener('pointerup',event=>{if(this.pointer!==event.pointerId)return;event.preventDefault();event.stopPropagation();this.point(event);if(!this.points.length){this.pointer=undefined;return;}const last=this.points.at(-1)!;if(this.points.length===1)this.points.push({...last,t:.05});else if(last.t<.05)this.points[this.points.length-1]={...last,t:.05};module.gesture={duration:this.points.at(-1)!.t,points:this.points.map(p=>({...p}))};this.pointer=undefined;this.draw();changed();});
    const cancel=(event:PointerEvent)=>{if(event.pointerId!==this.pointer)return;this.pointer=undefined;this.points=[];this.draw();};this.pad.addEventListener('pointercancel',cancel);this.pad.addEventListener('lostpointercapture',cancel);this.draw();
  }
  private point(event:PointerEvent){const bounds=this.pad.getBoundingClientRect();if(!bounds.width||!bounds.height)return;const x=Math.max(-1,Math.min(1,(event.clientX-bounds.left)/bounds.width*2-1)),y=Math.max(-1,Math.min(1,1-(event.clientY-bounds.top)/bounds.height*2)),time=Math.min(12,Math.max(0,(event.timeStamp-this.start)/1000)),last=this.points.at(-1);if(last&&last.t>=12)return;
    if(this.points.length>=256)this.points=this.points.filter((_,i)=>i===0||i%2===1);
    this.points.push({x,y,t:last?Math.min(12,Math.max(last.t+.0001,time)):0});this.draw(this.points);
  }
  private draw(points=this.module.gesture?.points){const path=points??Array.from({length:33},(_,i)=>({x:Math.sin(i*Math.PI/16)*.8,y:Math.cos(i*Math.PI/16)*.8}));this.line.setAttribute('points',path.map(p=>`${100+p.x*90},${60-p.y*50}`).join(' '));}
}
