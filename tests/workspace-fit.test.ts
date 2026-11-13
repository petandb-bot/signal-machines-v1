// @vitest-environment happy-dom
import {afterEach,beforeEach,describe,expect,it,vi} from 'vitest';
import {Workspace} from '../src/ui/Workspace';
import {StateStore} from '../src/app/StateStore';
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
function expectEveryChipVisible(store:StateStore,view:Workspace,leftInset=12,rightInset=12){
  const t=transform(view);
  for(const module of store.patch.modules){
    expect(module.x*t.zoom+t.x).toBeGreaterThanOrEqual(leftInset-1);
    expect((module.x+128)*t.zoom+t.x).toBeLessThanOrEqual(width-rightInset+1);
    expect(module.y*t.zoom+t.y).toBeGreaterThanOrEqual(15);
    expect((module.y+132)*t.zoom+t.y).toBeLessThanOrEqual(height-50);
  }
}

describe('phone portrait initial view and FIT',()=>{
  it('shows the entire default rack at the top and FIT restores the overview without editing the patch',()=>{
    const {store,view}=workspace(),before=structuredClone(store.patch),start=transform(view);
    expect(start.zoom).toBeGreaterThan(0);
    expect(start.zoom).toBeLessThan(.875); // Do not force a wide desktop rack into 88% zoom.
    expectEveryChipVisible(store,view);
    const first=store.patch.modules[0];expect(first.y*start.zoom+start.y).toBe(20);
    view.root.querySelector<HTMLButtonElement>('[aria-label="Zoom in"]')!.click();
    expect(transform(view).zoom).toBeGreaterThan(start.zoom);
    view.root.querySelector<HTMLButtonElement>('.fit-button')!.click();
    expect(transform(view)).toEqual(start);
    expect(store.patch).toEqual(before);
  });
  it('does not enlarge a small patch above its normal chip size',()=>{
    const {store,view}=workspace();store.patch.modules=[createModule('OSC',-400,-200,1,'single')];store.patch.connections=[];view.fit();
    const t=transform(view);expect(t.zoom).toBe(1);expect(-200*t.zoom+t.y).toBe(20);expect(-400+t.x).toBeGreaterThan(24);
  });
  it('includes a distant lower module rather than silently cropping it',()=>{
    const {store,view}=workspace();store.patch.modules=[createModule('OSC',4000,0,1,'top'),createModule('OUTPUT',-4000,400,2,'bottom')];store.patch.connections=[];view.fit();
    const t=transform(view);expect(t.zoom).toBeLessThan(.1);expectEveryChipVisible(store,view);
    expect(t.y).toBe(20);
    view.root.querySelector<HTMLButtonElement>('[aria-label="Zoom out"]')!.click();
    expect(transform(view).zoom).toBeLessThan(t.zoom); // Manual zoom-out must not jump to 25%.
    view.fit();
    view.viewport.dispatchEvent(new PointerEvent('pointerdown',{button:0,pointerId:1,pointerType:'touch',clientX:100,clientY:100}));
    view.viewport.dispatchEvent(new PointerEvent('pointerdown',{button:0,pointerId:2,pointerType:'touch',clientX:200,clientY:100}));
    view.viewport.dispatchEvent(new PointerEvent('pointermove',{pointerId:2,pointerType:'touch',clientX:300,clientY:100}));
    expect(transform(view).zoom).toBeGreaterThan(t.zoom);
    expect(transform(view).zoom).toBeLessThan(.25); // Pinch must not snap to the old minimum.
  });
  it('respects horizontal safe-area padding without changing module coordinates',()=>{
    const {view,store}=workspace();view.root.style.paddingLeft='44px';view.root.style.paddingRight='12px';view.root.style.paddingBottom='34px';const before=structuredClone(store.patch);view.fit();
    expectEveryChipVisible(store,view,44,12);expect(store.patch).toEqual(before);
  });
  it.each([[844,340,108.57777778,9.64444444,.91111111],[1280,744,296,196,1]])('preserves the captured legacy FIT at %s×%s',(w,h,x,y,zoom)=>{
    portrait=false;width=w;height=h;const {view}=workspace(),t=transform(view);
    expect(t.x).toBeCloseTo(x,6);expect(t.y).toBeCloseTo(y,6);expect(t.zoom).toBeCloseTo(zoom,6);
  });
  it('keeps the top edge stable during portrait height changes and refits on rotation',()=>{
    const {view,store}=workspace(),start=transform(view);height-=70;resize();expect(transform(view)).toEqual(start);
    portrait=false;width=844;height=340;resize();expect(transform(view).zoom).toBeCloseTo(.91111111,6);
    portrait=true;width=390;height=751;resize();const back=transform(view);
    expect(back).toEqual(start);
    expectEveryChipVisible(store,view);
    expect(store.patch.modules[0].y*back.zoom+back.y).toBe(20);
  });
  it('re-fits when the portrait width changes but not for browser-chrome height shifts',()=>{
    const {view,store}=workspace(),start=transform(view);
    width=320;resize();
    const narrower=transform(view);expect(narrower.zoom).toBeLessThan(start.zoom);
    expectEveryChipVisible(store,view);
    height-=60;resize();expect(transform(view)).toEqual(narrower);
  });
});
