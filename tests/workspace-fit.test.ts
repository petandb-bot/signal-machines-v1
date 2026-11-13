// @vitest-environment happy-dom
import {afterEach,beforeEach,describe,expect,it,vi} from 'vitest';
import {Workspace} from '../src/ui/Workspace';
import {StateStore} from '../src/app/StateStore';
import splitJSON from '../presets/split-orbits.json';
import {parsePatch} from '../src/state/PatchStorage';
import {portPosition,DEFINITIONS} from '../src/graph/definitions';
import {createModule} from '../src/graph/PatchGraph';

let portrait=true,width=390,height=751,resize:()=>void,initialFrame:FrameRequestCallback;
beforeEach(()=>{
  localStorage.clear();document.body.replaceChildren();portrait=true;width=390;height=751;
  vi.spyOn(window,'matchMedia').mockImplementation(()=>({get matches(){return portrait;}} as MediaQueryList));
  vi.stubGlobal('ResizeObserver',class{constructor(callback:()=>void){resize=callback;}observe(){}disconnect(){}});
  HTMLElement.prototype.setPointerCapture=()=>{};
  HTMLElement.prototype.hasPointerCapture=()=>false;
  vi.stubGlobal('requestAnimationFrame',(callback:FrameRequestCallback)=>{initialFrame=callback;return 0;});
});
afterEach(()=>{vi.restoreAllMocks();vi.unstubAllGlobals();});
function workspace(){
  const store=new StateStore(),view=new Workspace(store);document.body.append(view.root);
  view.viewport.getBoundingClientRect=()=>new DOMRect(0,0,width,height);
  Object.defineProperties(view.viewport,{clientWidth:{get:()=>width},clientHeight:{get:()=>height}});
  initialFrame(0);resize();return{store,view};
}
function transform(view:Workspace){const value=view.world.style.transform,values=value.match(/[-+]?(?:\d*\.)?\d+(?:e[-+]?\d+)?/gi);if(values?.length!==3)throw Error(`Unexpected transform: ${value}`);return{x:Number(values[0]),y:Number(values[1]),zoom:Number(values[2])};}
function split(){return parsePatch(JSON.stringify(splitJSON));}
function useSplit(){const value=workspace();value.store.patch=split();value.view.render();value.view.fit();return value;}
function points(view:Workspace,store:StateStore){return store.patch.modules.map(m=>({...view.displayPosition(m)}));}
function drag(view:Workspace,id:string){
 const card=view.nodes.querySelector<HTMLElement>(`.module-card[data-module="${id}"]`)!;
 card.dispatchEvent(new PointerEvent('pointerdown',{bubbles:true,button:0,pointerId:1,pointerType:'touch',clientX:100,clientY:100}));
 view.viewport.dispatchEvent(new PointerEvent('pointermove',{pointerId:1,pointerType:'touch',clientX:132,clientY:124}));
 view.viewport.dispatchEvent(new PointerEvent('pointerup',{pointerId:1,pointerType:'touch',clientX:132,clientY:124}));
}
function expectCables(view:Workspace,store:StateStore){
 for(const e of store.patch.connections){
  const source=store.patch.modules.find(m=>m.id===e.from.module)!,target=store.patch.modules.find(m=>m.id===e.to.module)!;
  const a=portPosition(view.displayPosition(source),DEFINITIONS[source.type].outputs.find(p=>p.id===e.from.port)!);
  const b=portPosition(view.displayPosition(target),DEFINITIONS[target.type].inputs.find(p=>p.id===e.to.port)!);
  const path=view.svg.querySelector<SVGPathElement>(`[data-connection="${e.id}"] .cable-line`)!.getAttribute('d')!;
  expect(path.startsWith(`M ${a.x} ${a.y} `)).toBe(true);
  expect(path.endsWith(`${b.x} ${b.y}`)||path.endsWith(`H ${b.x}`)).toBe(true);
 }
}

describe('portrait display coordinates and viewport',()=>{
 it.each([[390,743],[402,773],[320,467]])('contains every chip above the dock at %s×%s',(w,h)=>{
  const {view,store}=useSplit();width=w;height=h;resize();view.fit();const t=transform(view);
  for(const p of points(view,store)){expect(p.x*t.zoom+t.x).toBeGreaterThanOrEqual(12);expect((p.x+128)*t.zoom+t.x).toBeLessThanOrEqual(w-12);expect(p.y*t.zoom+t.y).toBeGreaterThanOrEqual(16);expect((p.y+132)*t.zoom+t.y).toBeLessThanOrEqual(h-84);}
 });
 it('refits an overview when height shrinks, but preserves manual zoom on later height changes',()=>{
  const {view}=useSplit();const before=transform(view).zoom;height=400;resize();expect(transform(view).zoom).toBeLessThan(before);
  view.root.querySelector<HTMLButtonElement>('[aria-label="Zoom in"]')!.click();const manual=transform(view);height=350;resize();expect(transform(view)).toEqual(manual);
 });
 it('folds SPLIT ORBITS into two columns/four rows with readable FIT and no saved changes',()=>{
  const {view,store}=useSplit(),before=structuredClone(store.patch),p=points(view,store),t=transform(view);
  expect(new Set(p.map(p=>p.x)).size).toBe(2);expect(new Set(p.map(p=>p.y)).size).toBe(4);
  expect(t.zoom).toBeGreaterThan(0);expect(t.zoom).toBeLessThanOrEqual(1);
  expect(Math.min(...p.map(p=>p.y))*t.zoom+t.y).toBe(20);expect(view.root.style.getPropertyValue('--portrait-stage-height')).toBe('');
  expectCables(view,store);view.fit();expect(store.patch).toEqual(before);
 });
 it('uses the same display coordinates for drag, cables, preview and editor reveal',()=>{
  const {view,store}=useSplit(),before=structuredClone(store.patch),module=store.patch.modules.find(m=>m.id==='output-1')!,old={...view.displayPosition(module)};
  drag(view,module.id);expect(view.displayPosition(module)).not.toEqual(old);expectCables(view,store);
  const source=store.patch.modules.find(m=>m.id==='pulse-1')!,port=DEFINITIONS.PULSE.outputs[0],origin=portPosition(view.displayPosition(source),port);
  view.armPort({module:source.id,port:port.id,direction:'out'});expect(view.svg.querySelector('.preview')!.getAttribute('d')!.startsWith(`M ${origin.x} ${origin.y} `)).toBe(true);view.cancelDrag();
  view.root.querySelector<HTMLElement>('.workspace-nav')!.getBoundingClientRect=()=>new DOMRect(90,300,200,48);
  view.reveal(module.id,0,350);const t=transform(view),p=view.displayPosition(module);expect(p.y*t.zoom+t.y+132*t.zoom).toBeLessThanOrEqual(292.001);
  expect(parsePatch(JSON.stringify(store.patch))).toEqual(before);
 });
 it('keeps local moves across FIT/height changes and restores original cards/cables in landscape',()=>{
  const {view,store}=useSplit(),before=structuredClone(store.patch);drag(view,'alloy-1');const local=points(view,store);view.fit();height-=60;resize();expect(points(view,store)).toEqual(local);
  portrait=false;width=844;height=340;resize();
  for(const m of store.patch.modules){expect(view.displayPosition(m)).toEqual(m);expect(view.nodes.querySelector<HTMLElement>(`[data-module="${m.id}"]`)!.style.left).toBe(`${m.x}px`);}
  expectCables(view,store);portrait=true;width=390;height=751;resize();expect(points(view,store)).toEqual(local);expectCables(view,store);expect(store.patch).toEqual(before);
 });
 it('does not rearrange while wiring, and places new chips without moving surviving chips',()=>{
  const {view,store}=useSplit(),before=points(view,store);
  view.armPort({module:'pulse-1',port:'trigger',direction:'out'});view.armPort({module:'alloy-1',port:'trigger',direction:'in'});view.render();expect(points(view,store)).toEqual(before);expectCables(view,store);
  store.patch.modules.push(createModule('OSC',9000,3000,9,'added'));view.render();expect(points(view,store).slice(0,8)).toEqual(before);expect(view.displayPosition(store.patch.modules[8])).not.toEqual({x:9000,y:3000});
  const saved=structuredClone(store.patch);view.arrange();expect(store.patch).toEqual(saved);
 });
 it('keeps small and widely separated source coordinates readable without changing them',()=>{
  const {view,store}=workspace();store.patch.modules=[createModule('OSC',-4000,-2000,1,'a'),createModule('OUTPUT',4000,2000,2,'b')];store.patch.connections=[];const before=structuredClone(store.patch);view.render();view.fit();
  expect(transform(view).zoom).toBe(1);expect(new Set(points(view,store).map(p=>p.y)).size).toBe(1);expect(store.patch).toEqual(before);
  const start=transform(view).zoom;view.root.querySelector<HTMLButtonElement>('[aria-label="Zoom out"]')!.click();expect(transform(view).zoom).toBeCloseTo(start/1.2,8);
  view.viewport.dispatchEvent(new PointerEvent('pointerdown',{button:0,pointerId:1,pointerType:'touch',clientX:100,clientY:100}));view.viewport.dispatchEvent(new PointerEvent('pointerdown',{button:0,pointerId:2,pointerType:'touch',clientX:200,clientY:100}));view.viewport.dispatchEvent(new PointerEvent('pointermove',{pointerId:2,pointerType:'touch',clientX:220,clientY:100}));expect(transform(view).zoom).toBeCloseTo(start,8);expect(store.patch).toEqual(before);
 });
 it('honors safe padding and retains readable scale for many rows on a small phone',()=>{
  const {view,store}=useSplit();view.root.style.paddingLeft='24px';view.root.style.paddingRight='12px';view.root.style.paddingBottom='34px';width=320;height=475;resize();
  const t=transform(view);expect(t.zoom).toBeLessThan(.875);for(const p of points(view,store)){expect(p.x*t.zoom+t.x).toBeGreaterThanOrEqual(24);expect((p.x+128)*t.zoom+t.x).toBeLessThanOrEqual(308);}
 });
 it.each([[844,340,108.57777778,9.64444444,.91111111],[1280,744,296,196,1]])('retains the original default FIT at %s×%s',(w,h,x,y,zoom)=>{
  portrait=false;width=w;height=h;const {view}=workspace(),t=transform(view);expect(t.x).toBeCloseTo(x,6);expect(t.y).toBeCloseTo(y,6);expect(t.zoom).toBeCloseTo(zoom,6);
 });
 it('persists a normal landscape drag while portrait dragging remains display-only',()=>{
  portrait=false;width=844;height=340;const {view,store}=workspace(),before=structuredClone(store.patch);drag(view,'alloy-1');expect(store.patch.modules.find(m=>m.id==='alloy-1')!.x).not.toBe(before.modules.find(m=>m.id==='alloy-1')!.x);
 });
 it('fits the selected chip above the editor dock even on a short 320px phone',()=>{
  const {view,store}=useSplit();store.patch.modules=store.patch.modules.slice(0,3);store.patch.connections=[];width=320;height=475;view.render();view.fit();
  view.root.querySelector<HTMLElement>('.workspace-nav')!.getBoundingClientRect=()=>new DOMRect(60,132.7,200,48);
  view.reveal(store.patch.modules[0].id,0,278.3);const t=transform(view),p=view.displayPosition(store.patch.modules[0]);expect(p.y*t.zoom+t.y+132*t.zoom).toBeLessThan(125);
 });
});
