// @vitest-environment happy-dom
import {afterEach,beforeEach,describe,expect,it,vi} from 'vitest';
vi.mock('p5',()=>({default:class{}}));
import {AppController} from '../src/app/AppController';
import {MODULE_GROUPS} from '../src/graph/catalog';
import {DEFINITIONS} from '../src/graph/definitions';
import {metalDrift} from '../src/state/presets';

vi.stubGlobal('ResizeObserver',class{observe(){}disconnect(){}});
vi.stubGlobal('requestAnimationFrame',(callback:FrameRequestCallback)=>{callback(0);return 0;});
HTMLElement.prototype.setPointerCapture=()=>{};
HTMLElement.prototype.hasPointerCapture=()=>false;

let app:AppController;
beforeEach(()=>{
  localStorage.clear();
  localStorage.setItem('signal-machines.patch.v1',JSON.stringify(metalDrift()));
  document.body.innerHTML='<div id="app"></div>';
  app=new AppController(document.querySelector('#app')!);
});
afterEach(()=>vi.restoreAllMocks());

describe('read-only English help for all modules',()=>{
  const open=()=>{
    document.querySelector<HTMLButtonElement>('[aria-label="Patch menu"]')!.click();
    document.querySelector<HTMLButtonElement>('[aria-label="Browse English descriptions of all modules"]')!.click();
  };
  it('opens from the existing menu, not from a new toolbar control, and leaves the patch untouched',()=>{
    const saved=structuredClone(app.store.patch);
    const toolbar=document.querySelector('.topbar')!.childElementCount;
    open();
    expect(document.querySelector('#app')!.classList.contains('help-visible')).toBe(true);
    expect(document.querySelector('.module-help')).not.toBeNull();
    expect(document.querySelector('.module-help .module-help-count')!.textContent).toBe('73 / 73');
    expect(document.querySelector('.topbar')!.childElementCount).toBe(toolbar);
    expect(app.store.patch).toEqual(saved);
    expect(document.querySelector('#app')!.classList.contains('menu-visible')).toBe(false);
    document.querySelector<HTMLButtonElement>('[aria-label="Close module help"]')!.click();
    expect(document.querySelector('#app')!.classList.contains('help-visible')).toBe(false);
    expect(app.store.patch).toEqual(saved);
  });
  it('covers every module definition exactly once, in the existing library categories',()=>{
    open();
    const types=MODULE_GROUPS.flatMap(g=>g.types);
    expect(types).toHaveLength(73);
    expect(new Set(types).size).toBe(71);
    expect(document.querySelectorAll('.module-help-item')).toHaveLength(73);
    expect(document.querySelectorAll('.module-help-group')).toHaveLength(MODULE_GROUPS.length);
    for(const type of types){
      const item=document.querySelector<HTMLDetailsElement>(`.module-help-item[data-module="${type}"]`)!;
      expect(item).not.toBeNull();
      expect(item.querySelector('.module-help-description')!.textContent).toBe(DEFINITIONS[type].description);
      expect(item.querySelectorAll('.module-help-parameter')).toHaveLength(DEFINITIONS[type].parameters.length);
      expect(item.querySelectorAll('.module-help-ports')).toHaveLength(2);
    }
  });
  it('searches across names, English descriptions, control labels and groups',()=>{
    open();
    const search=document.querySelector<HTMLInputElement>('[aria-label="Search module help"]')!;
    search.value='BRANCH';
    search.dispatchEvent(new Event('input',{bubbles:true}));
    expect(document.querySelector<HTMLDetailsElement>('[data-module="BRANCH"]')!.hidden).toBe(false);
    expect(document.querySelector<HTMLDetailsElement>('[data-module="PLATE"]')!.hidden).toBe(true);
    expect(document.querySelectorAll('.module-help-group:not([hidden])').length).toBeGreaterThan(0);
    search.value='does-not-exist-here';
    search.dispatchEvent(new Event('input',{bubbles:true}));
    expect(document.querySelectorAll('.module-help-item:not([hidden])')).toHaveLength(0);
    expect(document.querySelector('.module-help-empty')!.hasAttribute('hidden')).toBe(false);
    search.value='';
    search.dispatchEvent(new Event('input',{bubbles:true}));
    expect(document.querySelectorAll('.module-help-item:not([hidden])')).toHaveLength(73);
  });
  it('shows the nuanced timing/pitch foundation without changing its generators',()=>{
    const old=structuredClone(app.store.patch);
    open();
    for(const name of ['PULSE','BRANCH','QUANTIZE','LOGIC']){
      const item=document.querySelector<HTMLDetailsElement>(`.module-help-item[data-module="${name}"]`)!;
      item.open=true;
      expect(item.textContent).toContain('CONTROLS');
      expect(item.textContent).toContain('INPUTS');
      expect(item.textContent).toContain('OUTPUTS');
    }
    expect(document.querySelector('.module-help-intro')!.textContent).toContain('not a fixed musical outcome');
    expect(app.store.patch).toEqual(old);
  });
  it('does not trigger transport or patch deletion shortcuts while browsing summary entries',()=>{
    open();
    const selected=app.store.patch.modules[0];
    app.store.selectedModule=selected.id;
    const before=structuredClone(app.store.patch);
    const summary=document.querySelector<HTMLElement>('[data-module="PULSE"] summary')!;
    const space=new KeyboardEvent('keydown',{key:' ',code:'Space',bubbles:true,cancelable:true});
    summary.dispatchEvent(space);
    expect(space.defaultPrevented).toBe(false);
    const deletion=new KeyboardEvent('keydown',{key:'Delete',bubbles:true,cancelable:true});
    summary.dispatchEvent(deletion);
    expect(deletion.defaultPrevented).toBe(false);
    expect(app.store.patch).toEqual(before);
    expect(app.audio.running).toBe(false);
  });
  it('closes with Escape even when the help search has keyboard focus',()=>{
    open();
    const search=document.querySelector<HTMLInputElement>('.module-help-search')!;
    search.focus();
    search.dispatchEvent(new KeyboardEvent('keydown',{key:'Escape',bubbles:true}));
    expect(document.querySelector('#app')!.classList.contains('help-visible')).toBe(false);
  });
});
