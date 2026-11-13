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

describe('phone portrait initial view and FIT',()=>{
  it('starts with readable chips at the top and FIT restores that view without editing the patch',()=>{
    const {store,view}=workspace(),before=structuredClone(store.patch),start=transform(view);
    expect(start.zoom*128).toBeGreaterThanOrEqual(112);expect(start.zoom).toBeLessThanOrEqual(1);
    const first=store.patch.modules[0];expect(first.x*start.zoom+start.x).toBe(24);expect(first.y*start.zoom+start.y).toBe(20);
    const out=view.root.querySelector<HTMLButtonElement>('[aria-label="Zoom out"]')!;
    for(let i=0;i<4;i++)out.click();expect(transform(view).zoom).toBeLessThan(.875);
    view.root.querySelector<HTMLButtonElement>('.fit-button')!.click();expect(transform(view)).toEqual(start);expect(store.patch).toEqual(before);
  });
  it('does not enlarge a small patch above its normal chip size',()=>{
    const {store,view}=workspace();store.patch.modules=[createModule('OSC',-400,-200,1,'single')];store.patch.connections=[];view.fit();
    const t=transform(view);expect(t.zoom).toBe(1);expect(-200*t.zoom+t.y).toBe(20);expect(-400+t.x).toBeGreaterThan(24);
  });
  it('keeps the first row visible even when a lower row extends far to its left',()=>{
    const {store,view}=workspace();store.patch.modules=[createModule('OSC',4000,0,1,'top'),createModule('OUTPUT',-4000,400,2,'bottom')];store.patch.connections=[];view.fit();
    const t=transform(view);expect(t.zoom).toBe(.875);expect(4000*t.zoom+t.x).toBe(24);expect(t.y).toBe(20);
  });
  it('respects horizontal safe-area padding without changing module coordinates',()=>{
    const {view,store}=workspace();view.root.style.paddingLeft='44px';view.root.style.paddingRight='12px';view.root.style.paddingBottom='34px';const before=structuredClone(store.patch);view.fit();
    const t=transform(view);expect(store.patch.modules[0].x*t.zoom+t.x).toBe(68);expect(store.patch).toEqual(before);
  });
  it.each([[844,340,108.57777778,9.64444444,.91111111],[1280,744,296,196,1]])('preserves the captured legacy FIT at %s×%s',(w,h,x,y,zoom)=>{
    portrait=false;width=w;height=h;const {view}=workspace(),t=transform(view);
    expect(t.x).toBeCloseTo(x,6);expect(t.y).toBeCloseTo(y,6);expect(t.zoom).toBeCloseTo(zoom,6);
  });
  it('keeps the viewed top edge stable during portrait height changes and refits on rotation',()=>{
    const {view,store}=workspace(),start=transform(view);height-=70;resize();expect(transform(view)).toEqual(start);
    portrait=false;width=844;height=340;resize();expect(transform(view).zoom).toBeCloseTo(.91111111,6);
    portrait=true;width=390;height=751;resize();const back=transform(view);expect(back.zoom).toBe(.875);expect(store.patch.modules[0].y*back.zoom+back.y).toBe(20);
  });
});
