import p5 from 'p5';
import type {StateStore} from '../app/StateStore';
import {drawModule} from './ModuleVisuals';
import {VISUAL_WIDTH as W,VISUAL_HEIGHT as H} from './SignalMotion';
export class PixelRenderer {
  private buffers=new Map<string,p5.Graphics>();
  constructor(store:StateStore,root:HTMLElement,onFrame:()=>void){
    let rate=24;
    const reduced=window.matchMedia('(prefers-reduced-motion: reduce)');
    new p5(p=>{
      p.setup=()=>{p.noCanvas();p.frameRate(24);p.pixelDensity(1);};
      p.draw=()=>{
        const lively=root.dataset.visuals!=='quiet'&&!reduced.matches;
        const targetRate=lively?24:12;if(rate!==targetRate){p.frameRate(targetRate);rate=targetRate;}root.classList.toggle('motion-reduced',!lively);
        const alive=new Set(store.patch.modules.map(m=>m.id));
        for(const [id,buffer] of this.buffers)if(!alive.has(id)){buffer.remove();this.buffers.delete(id);}
        const targets=new Map<string,HTMLCanvasElement[]>();
        root.querySelectorAll<HTMLCanvasElement>('canvas[data-visual]').forEach(canvas=>{const id=canvas.dataset.visual!;const list=targets.get(id);if(list)list.push(canvas);else targets.set(id,[canvas]);});
        for(const module of store.patch.modules){
          let buffer=this.buffers.get(module.id);
          if(!buffer){buffer=p.createGraphics(W,H);buffer.pixelDensity(1);buffer.noSmooth();this.buffers.set(module.id,buffer);}
          drawModule(buffer,module.type,store.telemetry?.modules[module.id],lively);
          for(const canvas of targets.get(module.id)??[]){const ctx=canvas.getContext('2d');if(ctx){ctx.imageSmoothingEnabled=false;ctx.clearRect(0,0,canvas.width,canvas.height);ctx.drawImage((buffer as unknown as {canvas:HTMLCanvasElement}).canvas,0,0,canvas.width,canvas.height);}}
        }
        onFrame();
      };
    });
  }
}
