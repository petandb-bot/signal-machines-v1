// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
vi.mock('p5',()=>({default:class{}})); // Pixel rendering needs a real browser; DOM interactions are tested here.
import {readFileSync} from 'node:fs';
import {version} from '../package.json';
import { AppController } from '../src/app/AppController';
import { connect } from '../src/graph/PatchGraph';
vi.stubGlobal('ResizeObserver',class{observe(){}disconnect(){}});
vi.stubGlobal('requestAnimationFrame',(callback:FrameRequestCallback)=>{callback(0);return 0;});
HTMLElement.prototype.setPointerCapture=()=>{};HTMLElement.prototype.hasPointerCapture=()=>false;
let app:AppController;
afterEach(()=>vi.restoreAllMocks());
beforeEach(()=>{localStorage.clear();document.body.innerHTML='<div id="app"></div>';app=new AppController(document.querySelector('#app')!);});
describe('DOM patch interactions (not browser/audio integration)',()=>{
  it('links the source archive generated from the current package version',()=>{
    const link=document.querySelector<HTMLAnchorElement>('.source-download')!;
    expect(link.download).toBe(`signal-machines-v${version}.zip`);
    expect(link.getAttribute('href')).toBe(`./downloads/${link.download}`);
  });
  it('adds and deletes independent instances using the actual library and editor',()=>{
    document.querySelector<HTMLButtonElement>('[aria-label="Add a module"]')!.click();
    expect(document.querySelector('#app')!.classList.contains('library-visible')).toBe(true);
    document.querySelector<HTMLButtonElement>('[aria-label="Add ALLOY module"]')!.click();expect(app.store.patch.modules.filter(m=>m.type==='ALLOY')).toHaveLength(2);
    document.querySelector<HTMLElement>(`.module-card[data-module="${app.store.selectedModule}"]`)!.dispatchEvent(new KeyboardEvent('keydown',{key:'Enter',bubbles:true}));
    expect(document.querySelector('#app')!.classList.contains('editor-visible')).toBe(true);
    document.querySelector<HTMLButtonElement>('[aria-label="Delete selected module and its cables"]')!.click();document.querySelector<HTMLButtonElement>('[aria-label="Confirm module removal"]')!.click();expect(app.store.patch.modules.filter(m=>m.type==='ALLOY')).toHaveLength(1);
  });
  it('updates the DSP parameter model through a real editor slider',()=>{
    const card=document.querySelector<HTMLElement>('[data-module="alloy-1"].module-card')!;card.dispatchEvent(new KeyboardEvent('keydown',{key:'Enter',bubbles:true}));
    const range=document.querySelector<HTMLInputElement>('.editor input[data-parameter="tension"]')!;range.value='.87';range.dispatchEvent(new Event('input',{bubbles:true}));expect(app.store.patch.modules.find(m=>m.id==='alloy-1')!.params.tension).toBe(.87);
  });
  it('moves a module with pointer gestures',()=>{
    const card=document.querySelector<HTMLElement>('[data-module="pulse-1"].module-card')!;const module=app.store.patch.modules[0],x=module.x;
    card.dispatchEvent(new PointerEvent('pointerdown',{bubbles:true,button:0,clientX:50,clientY:50,pointerId:1}));
    app.workspace.viewport.dispatchEvent(new PointerEvent('pointermove',{bubbles:true,clientX:80,clientY:70,pointerId:1}));
    app.workspace.viewport.dispatchEvent(new PointerEvent('pointerup',{bubbles:true,clientX:80,clientY:70,pointerId:1}));expect(module.x).toBeGreaterThan(x);
  });
  it('connects matching ports by dragging and rejects an incompatible cable',()=>{
    const output=document.querySelector<HTMLElement>('.port.out[data-module="flock-1"][data-port="controlB"]')!;
    const target=document.querySelector<HTMLElement>('.port.in[data-module="alloy-1"][data-port="body"]')!;
    vi.spyOn(document,'elementFromPoint').mockReturnValue(target);
    output.dispatchEvent(new PointerEvent('pointerdown',{bubbles:true,button:0,clientX:5,clientY:5,pointerId:2}));
    expect(target.classList.contains('compatible')).toBe(true);
    app.workspace.viewport.dispatchEvent(new PointerEvent('pointerup',{bubbles:true,clientX:50,clientY:50,pointerId:2}));expect(app.store.patch.connections).toHaveLength(5);
    const incompatible=document.querySelector<HTMLElement>('.port.in[data-module="output-1"]')!;vi.mocked(document.elementFromPoint).mockReturnValue(incompatible);
    document.querySelector<HTMLElement>('.port.out[data-module="pulse-1"]')!.dispatchEvent(new PointerEvent('pointerdown',{bubbles:true,button:0,pointerId:3}));
    app.workspace.viewport.dispatchEvent(new PointerEvent('pointerup',{bubbles:true,pointerId:3}));expect(app.store.patch.connections).toHaveLength(5);expect(document.querySelector('.toast')!.textContent).toContain('TRIGGER');vi.restoreAllMocks();
  });
  it('selects and deletes a cable without deleting its modules',()=>{
    document.querySelector('.cable-hit')!.dispatchEvent(new PointerEvent('pointerdown',{bubbles:true,button:0,pointerId:55}));
    app.workspace.viewport.dispatchEvent(new PointerEvent('pointerup',{bubbles:true,pointerId:55}));
    document.querySelector<HTMLButtonElement>('[aria-label="Delete selected cable"]')!.click();expect(app.store.patch.connections).toHaveLength(3);expect(app.store.patch.modules).toHaveLength(5);
  });
  it('starts an empty patch and restores the playable preset',()=>{
    document.querySelector<HTMLButtonElement>('[aria-label="Create an empty patch"]')!.click();expect(app.store.patch.modules).toHaveLength(0);
    const preset=document.querySelector<HTMLSelectElement>('[aria-label="Preset"]')!;preset.value='0';preset.dispatchEvent(new Event('change'));expect(app.store.patch.modules).toHaveLength(5);expect(app.store.patch.connections).toHaveLength(4);
  });
  it('keeps a tapped output armed until a compatible input is tapped',()=>{
    const out=document.querySelector<HTMLButtonElement>('.port.out[data-module="flock-1"][data-port="controlB"]')!,input=document.querySelector<HTMLButtonElement>('.port.in[data-module="alloy-1"][data-port="body"]')!;
    const hit=vi.spyOn(document,'elementFromPoint').mockReturnValue(out);
    out.dispatchEvent(new PointerEvent('pointerdown',{bubbles:true,button:0,pointerType:'touch',pointerId:9}));app.workspace.viewport.dispatchEvent(new PointerEvent('pointerup',{bubbles:true,pointerType:'touch',pointerId:9}));
    expect(app.workspace.root.classList.contains('is-patching')).toBe(true);hit.mockReturnValue(input);
    input.dispatchEvent(new PointerEvent('pointerdown',{bubbles:true,button:0,pointerType:'touch',pointerId:10}));app.workspace.viewport.dispatchEvent(new PointerEvent('pointerup',{bubbles:true,pointerType:'touch',pointerId:10}));
    expect(app.store.patch.connections).toHaveLength(5);expect(app.workspace.root.classList.contains('is-patching')).toBe(false);
  });
  it('connects using large editor jacks across two separate chip taps',()=>{
    function tap(id:string,pointerId:number){const card=document.querySelector<HTMLElement>(`.module-card[data-module="${id}"]`)!;card.dispatchEvent(new PointerEvent('pointerdown',{bubbles:true,button:0,pointerType:'touch',pointerId}));app.workspace.viewport.dispatchEvent(new PointerEvent('pointerup',{bubbles:true,pointerType:'touch',pointerId}));}
    tap('flock-1',21);document.querySelector<HTMLButtonElement>('.editor [aria-label="FLOCK CTRL B output — tap to connect"]')!.click();expect(app.workspace.root.classList.contains('is-patching')).toBe(true);
    tap('alloy-1',22);expect(app.workspace.root.classList.contains('is-patching')).toBe(true);document.querySelector<HTMLButtonElement>('.editor [aria-label="ALLOY BODY input — tap to connect"]')!.click();
    expect(app.store.patch.connections).toHaveLength(5);expect(app.workspace.root.classList.contains('is-patching')).toBe(false);
  });
  it('pinches and pans with two pointers without moving a chip or opening its editor',()=>{
    app.workspace.viewport.getBoundingClientRect=()=>new DOMRect(0,0,844,340);app.workspace.fit();const before=app.workspace.world.style.transform,x=app.store.patch.modules[0].x;
    const chip=document.querySelector<HTMLElement>('.module-card')!;
    chip.dispatchEvent(new PointerEvent('pointerdown',{bubbles:true,button:0,pointerType:'touch',pointerId:31,clientX:100,clientY:100}));
    app.workspace.viewport.dispatchEvent(new PointerEvent('pointerdown',{bubbles:true,button:0,pointerType:'touch',pointerId:32,clientX:200,clientY:100}));
    app.workspace.viewport.dispatchEvent(new PointerEvent('pointermove',{bubbles:true,pointerType:'touch',pointerId:32,clientX:300,clientY:120}));
    expect(app.workspace.world.style.transform).not.toBe(before);expect(Number(app.workspace.zoomLabel.textContent!.replace('%',''))).toBeGreaterThan(120);
    app.workspace.viewport.dispatchEvent(new PointerEvent('pointerup',{bubbles:true,pointerType:'touch',pointerId:32,clientX:300,clientY:120}));app.workspace.viewport.dispatchEvent(new PointerEvent('pointerup',{bubbles:true,pointerType:'touch',pointerId:31,clientX:100,clientY:100}));
    expect(app.store.patch.modules[0].x).toBe(x);expect(document.querySelector('#app')!.classList.contains('editor-visible')).toBe(false);
    document.querySelector('.cable-hit')!.dispatchEvent(new PointerEvent('pointerdown',{bubbles:true,button:0,pointerType:'touch',pointerId:41,clientX:100,clientY:100}));
    app.workspace.viewport.dispatchEvent(new PointerEvent('pointerdown',{bubbles:true,button:0,pointerType:'touch',pointerId:42,clientX:200,clientY:100}));
    app.workspace.viewport.dispatchEvent(new PointerEvent('pointermove',{bubbles:true,pointerType:'touch',pointerId:42,clientX:250,clientY:100}));
    app.workspace.viewport.dispatchEvent(new PointerEvent('pointerup',{bubbles:true,pointerType:'touch',pointerId:42}));app.workspace.viewport.dispatchEvent(new PointerEvent('pointerup',{bubbles:true,pointerType:'touch',pointerId:41}));
    expect(document.querySelector('#app')!.classList.contains('editor-visible')).toBe(false);

  });
  it('exposes sixty-one grouped module choices, thirty-seven presets and no large title',()=>{
    expect(document.querySelectorAll('.library-module')).toHaveLength(61);expect(document.querySelector('.brand-name')).toBeNull();expect(document.querySelectorAll('.preset-select option')).toHaveLength(38);
    const preset=document.querySelector<HTMLSelectElement>('.preset-select')!;preset.value='1';preset.dispatchEvent(new Event('change'));expect(app.store.patch.modules.some(m=>m.type==='BRANCH')).toBe(true);expect(app.store.patch.modules.some(m=>m.type==='FRACTURE')).toBe(true);
    preset.value='2';preset.dispatchEvent(new Event('change'));expect(app.store.patch.modules.some(m=>m.type==='RESON')).toBe(true);
    preset.value='3';preset.dispatchEvent(new Event('change'));expect(app.store.patch.modules.some(m=>m.type==='VENOM')).toBe(true);expect(app.store.patch.modules.some(m=>m.type==='CAUSTIC')).toBe(true);expect(app.store.patch.modules.some(m=>m.type==='SNAP')).toBe(true);
  });
  it('arranges chips without changing parameters, audio routes or seeds',()=>{
    const before=structuredClone(app.store.patch);document.querySelector<HTMLButtonElement>('[aria-label="Arrange modules compactly"]')!.click();expect(app.store.patch.connections).toEqual(before.connections);expect(app.store.patch.modules.map(m=>m.params)).toEqual(before.modules.map(m=>m.params));expect(app.store.patch.modules.map(m=>m.seed)).toEqual(before.modules.map(m=>m.seed));
    const pairs=app.store.patch.modules.map(m=>`${m.x},${m.y}`);expect(new Set(pairs).size).toBe(pairs.length);
  });

  it('offers a named touch disconnect button and removes only the chosen cable',()=>{
    document.querySelector('.cable-hit')!.dispatchEvent(new PointerEvent('pointerdown',{bubbles:true,button:0,pointerType:'touch',pointerId:65}));
    app.workspace.viewport.dispatchEvent(new PointerEvent('pointerup',{bubbles:true,pointerType:'touch',pointerId:65}));
    const disconnect=document.querySelector<HTMLButtonElement>('[aria-label="Delete selected cable"]')!;expect(disconnect.textContent).toBe('Disconnect');disconnect.click();expect(app.store.patch.connections).toHaveLength(3);expect(app.store.patch.modules).toHaveLength(5);
  });
  it('labels both endpoints so parallel control cables can be unplugged individually',()=>{
    connect(app.store.patch,{module:'flock-1',port:'controlB'},{module:'alloy-1',port:'body'});connect(app.store.patch,{module:'flock-1',port:'controlB'},{module:'alloy-1',port:'tension'});app.store.changed('routing');
    document.querySelector<HTMLElement>('.module-card[data-module="flock-1"]')!.dispatchEvent(new KeyboardEvent('keydown',{key:'Enter',bubbles:true}));
    const unplug=document.querySelector<HTMLButtonElement>('.editor [aria-label="Disconnect FLOCK CTRL B from ALLOY BODY"]')!;expect(unplug.textContent).toBe('Unplug');expect(unplug.parentElement!.textContent).toContain('CTRL B → BODY');unplug.click();
    expect(app.store.patch.connections).toHaveLength(5);expect(app.store.patch.connections.some(e=>e.from.port==='controlB'&&e.to.port==='body')).toBe(false);expect(app.store.patch.connections.some(e=>e.from.port==='controlB'&&e.to.port==='tension')).toBe(true);
  });

  it('captures a named snapshot, recalls its cables and settings, then goes Back',()=>{
    const original=structuredClone(app.store.patch);document.querySelector<HTMLButtonElement>('[aria-label="Open snapshots"]')!.click();expect(document.querySelector('#app')!.classList.contains('snapshots-visible')).toBe(true);
    document.querySelector<HTMLInputElement>('[aria-label="Snapshot name"]')!.value='Before damage';document.querySelector<HTMLButtonElement>('[aria-label="Capture snapshot"]')!.click();
    app.store.patch.modules[0].params.rate=.99;app.store.patch.connections=[];app.store.changed('routing');const damaged=structuredClone(app.store.patch);
    document.querySelector<HTMLButtonElement>('[aria-label="Recall snapshot Before damage"]')!.click();expect(app.store.patch).toEqual(original);
    document.querySelector<HTMLButtonElement>('[aria-label="Open snapshots"]')!.click();const back=document.querySelector<HTMLButtonElement>('[aria-label="Return to patch before recall"]')!;expect(back.disabled).toBe(false);back.click();expect(app.store.patch).toEqual(damaged);
  });
  it('persists snapshots across an app reload and exposes new drone/parasite presets',()=>{
    app.snapshots.storage.capture(app.store.patch,'Persistent');const storage=app.snapshots.storage.export();document.body.innerHTML='<div id="app"></div>';const reloaded=new AppController(document.querySelector('#app')!);expect(reloaded.snapshots.storage.export()).toBe(storage);
    const preset=document.querySelector<HTMLSelectElement>('.preset-select')!;preset.value='5';preset.dispatchEvent(new Event('change'));expect(reloaded.store.patch.modules.some(m=>m.type==='DRONE')).toBe(true);expect(reloaded.store.patch.modules.some(m=>m.type==='PARASITE')).toBe(true);
  });

  it('enlarges chip displays without moving the chip body or jack anchors',()=>{
    const card=document.querySelector<HTMLElement>('.module-card[data-module="alloy-1"]')!,canvas=card.querySelector('canvas')!,port=card.querySelector<HTMLElement>('.port[data-port="tension"]')!;
    const position={left:card.style.left,top:card.style.top,pin:port.style.top};expect(canvas.width).toBe(104);expect(canvas.height).toBe(80);
    app.store.telemetry={modules:{'alloy-1':{a:1,b:.9,phase:.3,envelope:1,levelL:.1,levelR:.1,triggerSample:50,wave:Array(64).fill(.2)}},peak:.2,rms:.1,sample:5000,faults:0};app.workspace.updateActivity();
    expect(Number(card.style.getPropertyValue('--activity'))).toBe(1);expect({left:card.style.left,top:card.style.top,pin:port.style.top}).toEqual(position);
  });
  it('keeps lively/quiet as a device preference without modifying the sound patch or snapshots',()=>{
    const before=structuredClone(app.store.patch),toggle=document.querySelector<HTMLButtonElement>('[aria-label="Toggle visual motion"]')!;expect(document.querySelector<HTMLElement>('#app')!.dataset.visuals).toBe('lively');toggle.click();expect(toggle.textContent).toBe('Visuals: quiet');expect(document.querySelector<HTMLElement>('#app')!.dataset.visuals).toBe('quiet');expect(app.store.patch).toEqual(before);
    document.body.innerHTML='<div id="app"></div>';new AppController(document.querySelector('#app')!);expect(document.querySelector<HTMLElement>('#app')!.dataset.visuals).toBe('quiet');
  });

  it('wires loop recording controls to the audio engine and reflects live state without rebuilding sliders',async()=>{
    document.querySelector<HTMLButtonElement>('[aria-label="Add LOOP module"]')!.click();const id=app.store.selectedModule!;document.querySelector<HTMLElement>(`.module-card[data-module="${id}"]`)!.dispatchEvent(new KeyboardEvent('keydown',{key:'Enter',bubbles:true}));
    vi.spyOn(app.audio,'start').mockImplementation(async()=>{app.audio.running=true;});
    const action=vi.spyOn(app.audio,'moduleAction').mockResolvedValueOnce({mode:'recording',frames:0,sampleRate:24000}).mockResolvedValueOnce({mode:'playing',frames:24000,sampleRate:24000}).mockResolvedValueOnce({mode:'overdub',frames:24000,sampleRate:24000});
    const range=document.querySelector('.editor input[data-parameter="speed"]');document.querySelector<HTMLButtonElement>('[aria-label="Record or finish loop"]')!.click();
    await vi.waitFor(()=>expect(document.querySelector('[aria-label="Record or finish loop"]')!.textContent).toBe('Finish'));expect(action).toHaveBeenCalledWith(id,'record',undefined);expect(document.querySelector('.editor input[data-parameter="speed"]')).toBe(range);
    document.querySelector<HTMLButtonElement>('[aria-label="Record or finish loop"]')!.click();await vi.waitFor(()=>expect(document.querySelector('[aria-label="Export loop WAV"]')!.hasAttribute('disabled')).toBe(false));
    document.querySelector<HTMLButtonElement>('[aria-label="Toggle loop overdub"]')!.click();await vi.waitFor(()=>expect(document.querySelector('.loop-status')!.textContent).toContain('Overdub'));
  });
  it('stops at four LOOP instances without changing existing modules',()=>{for(let i=0;i<5;i++)document.querySelector<HTMLButtonElement>('[aria-label="Add LOOP module"]')!.click();expect(app.store.patch.modules.filter(m=>m.type==='LOOP')).toHaveLength(4);expect(document.querySelector('.toast')!.textContent).toContain('at most 4');});
  it('selects waveform, noise, filter and drone modes and retains them through snapshot recall and reload',async()=>{
    for(const [type,mode] of [['OSC','PULSE'],['NOISE','BROWN'],['FILTER','HIGH'],['DRONE','220 Hz'],['CHANCE','LOW'],['PRISM','HOLD'],['PARTIAL','440 Hz'],['CHAMBER','WEAVE'],['WEFT','8'],['COUNT','AUDIO'],['QUANTIZE','19-TET'],['SLEW','GLIDE'],['FORMANT','WHISPER'],['LOGIC','XOR'],['CHIP','NOISE']]){
      document.querySelector<HTMLButtonElement>(`[aria-label="Add ${type} module"]`)!.click();const id=app.store.selectedModule!;document.querySelector<HTMLElement>(`.module-card[data-module="${id}"]`)!.dispatchEvent(new KeyboardEvent('keydown',{key:'Enter',bubbles:true}));
      const slider=document.querySelector('.editor input'),choice=document.querySelector<HTMLButtonElement>(`[aria-label="${type} ${mode} mode"]`)!;choice.click();expect(app.store.patch.modules.find(m=>m.id===id)!.mode).toBe(mode);expect(choice.getAttribute('aria-pressed')).toBe('true');expect(document.querySelector('.editor input')).toBe(slider);
    }
    document.querySelector<HTMLButtonElement>('[aria-label="Add OSC module"]')!.click();const wideId=app.store.selectedModule!;document.querySelector<HTMLElement>(`.module-card[data-module="${wideId}"]`)!.dispatchEvent(new KeyboardEvent('keydown',{key:'Enter',bubbles:true}));document.querySelector<HTMLButtonElement>('[aria-label="OSC WIDE frequency range"]')!.click();expect(app.store.patch.modules.find(m=>m.id===wideId)!.wide).toBe(true);
    const original=structuredClone(app.store.patch),id=app.snapshots.storage.capture(original,'Mode bank');app.store.replace(app.snapshots.storage.recall(id,original));expect(app.store.patch).toEqual(original);
    await vi.waitFor(()=>expect(JSON.parse(localStorage.getItem('signal-machines.patch.v1')??'null')).toEqual(original));
    document.body.innerHTML='<div id="app"></div>';const restored=new AppController(document.querySelector('#app')!);expect(restored.store.patch).toEqual(original);expect(restored.snapshots.storage.list()[0].patch).toEqual(original);
  });
  it('loads the source, spectral and dynamics circuits from the actual preset selector',()=>{
    const selector=document.querySelector<HTMLSelectElement>('.preset-select')!;
    for(const [index,name,type] of [['10','CLEAR SIGNAL','FILTER'],['11','WIRE STRINGS','COMB'],['12','SIDEBAND GARDEN','SHIFT'],['13','CHANCE GARDEN','CHANCE'],['14','SPECTRAL GHOST','PRISM'],['15','HARMONIC WEATHER','PARTIAL'],['16','CLOCKWORK GARDEN','WEFT'],['17','SLOW WEATHER','TIDE'],['18','MARBLE ROOM','BOUNCE'],['19','BINARY FEVER','COUNT'],['20','BENT VOWELS','FORMANT'],['21','SPLIT ORBITS','LOGIC'],['22','TRITAVE FIELD','QUANTIZE'],['23','OFF GRID','SLEW'],['24','COLONY CRACKS','FAULT LINE'],['25','STORED RAIN','UNSPENT'],['26','DISSENTING BODIES','QUORUM'],['27','OUTER BAND','OSC'],['28','PIXEL DUST','CHIP'],['29','BIASED ORBIT','FUZZ'],['30','DRAWN METAL','TOUCH'],['31','TWIN SWINGS','PENDULUM']]){selector.value=index;selector.dispatchEvent(new Event('change'));expect(app.store.patch.name).toBe(name);expect(app.store.patch.modules.some(m=>m.type===type)).toBe(true);}
  });
  it('kicks the marble through the actual editor and module-action bridge',async()=>{
    document.querySelector<HTMLButtonElement>('[aria-label="Add BOUNCE module"]')!.click();const id=app.store.selectedModule!;document.querySelector<HTMLElement>(`.module-card[data-module="${id}"]`)!.dispatchEvent(new KeyboardEvent('keydown',{key:'Enter',bubbles:true}));
    vi.spyOn(app.audio,'start').mockImplementation(async()=>{app.audio.running=true;});const action=vi.spyOn(app.audio,'moduleAction').mockResolvedValue(undefined);
    document.querySelector<HTMLButtonElement>('[aria-label="Kick the marble"]')!.click();await vi.waitFor(()=>expect(action).toHaveBeenCalledWith(id,'kick',undefined));await vi.waitFor(()=>expect(document.querySelector('.run-button')!.textContent).toBe('■'));
  });
  it('updates COUNT rate units on a mode change while retaining the same slider element',()=>{
    document.querySelector<HTMLButtonElement>('[aria-label="Add COUNT module"]')!.click();const id=app.store.selectedModule!;document.querySelector<HTMLElement>(`.module-card[data-module="${id}"]`)!.dispatchEvent(new KeyboardEvent('keydown',{key:'Enter',bubbles:true}));const slider=document.querySelector<HTMLInputElement>('.editor input[data-parameter="rate"]')!;
    document.querySelector<HTMLButtonElement>('[aria-label="COUNT AUDIO mode"]')!.click();expect(slider.parentElement!.querySelector('output')!.textContent).toContain('Hz');expect(document.querySelector('.editor input[data-parameter="rate"]')).toBe(slider);
    document.querySelector<HTMLButtonElement>('[aria-label="COUNT CLOCK mode"]')!.click();expect(slider.parentElement!.querySelector('output')!.textContent).toBe('× 2');
  });

  it('uses the selected lossless record format and downloads the completed take',async()=>{
    const format=document.querySelector<HTMLSelectElement>('[aria-label="Recording format"]')!;expect(format.value).toBe('wav');format.value='aiff';
    const start=vi.spyOn(app.audio,'startRecording').mockImplementation(async()=>{app.audio.recording=true;});
    const stop=vi.spyOn(app.audio,'stopRecording').mockImplementation(async()=>{app.audio.recording=false;return{blob:new Blob(['FORM']),extension:'aiff'};});
    vi.spyOn(URL,'createObjectURL').mockReturnValue('blob:test');const click=vi.spyOn(HTMLAnchorElement.prototype,'click').mockImplementation(()=>{});
    document.querySelector<HTMLButtonElement>('[aria-label="Record master output"]')!.click();await vi.waitFor(()=>expect(format.disabled).toBe(true));expect(start).toHaveBeenCalledWith(app.store.patch,'aiff');
    document.querySelector<HTMLButtonElement>('[aria-label="Stop recording and download"]')!.click();await vi.waitFor(()=>expect(click).toHaveBeenCalled());expect(stop).toHaveBeenCalledOnce();expect((click.mock.contexts[0] as unknown as HTMLAnchorElement).download).toMatch(/\.aiff$/);expect(format.disabled).toBe(false);
  });

  it('groups every library choice exactly once without adding search or favourites',()=>{
    const sections=[...document.querySelectorAll('.library-section')];expect(sections.map(s=>s.querySelector('h3')!.textContent)).toEqual(['Sources','Clocks & patterns','Motion & control','Tone & damage','Space & memory','Routing & output']);const choices=[...document.querySelectorAll('.library-module')].map(b=>b.getAttribute('aria-label'));expect(new Set(choices).size).toBe(61);expect(document.querySelector('.library input')).toBeNull();expect(sections[3].querySelector('[aria-label="Add FUZZ module"]')).not.toBeNull();
  });
  it('captures a TOUCH path, preserves it with bypass in a snapshot, cancels incomplete strokes and clears explicitly',()=>{
    document.querySelector<HTMLButtonElement>('[aria-label="Add FUZZ module"]')!.click();const fuzz=app.store.selectedModule!;document.querySelector<HTMLElement>(`.module-card[data-module="${fuzz}"]`)!.dispatchEvent(new KeyboardEvent('keydown',{key:'Enter',bubbles:true}));document.querySelector<HTMLButtonElement>('[aria-label="FUZZ bypass"]')!.click();expect(app.store.patch.modules.find(m=>m.id===fuzz)!.bypass).toBe(true);
    document.querySelector<HTMLButtonElement>('[aria-label="Add TOUCH module"]')!.click();const id=app.store.selectedModule!;document.querySelector<HTMLElement>(`.module-card[data-module="${id}"]`)!.dispatchEvent(new KeyboardEvent('keydown',{key:'Enter',bubbles:true}));const pad=document.querySelector<HTMLElement>('[aria-label="Draw TOUCH motion path"]')!;pad.getBoundingClientRect=()=>new DOMRect(0,0,200,120);
    const draw=(type:string,x:number,y:number,t:number)=>{const e=new PointerEvent(type,{bubbles:true,button:0,pointerType:'touch',pointerId:89,clientX:x,clientY:y});Object.defineProperty(e,'timeStamp',{value:t});pad.dispatchEvent(e);};
    draw('pointerdown',20,20,0);draw('pointermove',150,90,500);draw('pointerup',180,100,1000);const touch=app.store.patch.modules.find(m=>m.id===id)!;expect(touch.gesture!.duration).toBe(1);expect(touch.gesture!.points).toHaveLength(3);const gesture=structuredClone(touch.gesture);draw('pointerdown',100,40,2000);draw('pointermove',120,50,2200);draw('pointercancel',120,50,2300);expect(touch.gesture).toEqual(gesture);
    const saved=structuredClone(app.store.patch),snap=app.snapshots.storage.capture(saved,'Drawing and fuzz');document.querySelector<HTMLButtonElement>('[aria-label="Restore TOUCH circle"]')!.click();expect(touch.gesture).toBeUndefined();app.store.replace(app.snapshots.storage.recall(snap,app.store.patch));expect(app.store.patch).toEqual(saved);
  });
  it('sends the pendulum Kick button through the existing module-action bridge',async()=>{
    document.querySelector<HTMLButtonElement>('[aria-label="Add PENDULUM module"]')!.click();const id=app.store.selectedModule!;document.querySelector<HTMLElement>(`.module-card[data-module="${id}"]`)!.dispatchEvent(new KeyboardEvent('keydown',{key:'Enter',bubbles:true}));vi.spyOn(app.audio,'start').mockImplementation(async()=>{app.audio.running=true;});const action=vi.spyOn(app.audio,'moduleAction').mockResolvedValue(undefined);document.querySelector<HTMLButtonElement>('[aria-label="Kick the pendulums"]')!.click();await vi.waitFor(()=>expect(action).toHaveBeenCalledWith(id,'kick',undefined));
  });

  it.each([390,320])('portrait FIT contains every SPLIT ORBITS chip on a %spx screen',width=>{
    // Simulate portrait regardless of the unit test host's CSS media implementation.
    Object.defineProperty(app.workspace,'portraitLayout',{configurable:true,value:{matches:true}});
    const height=700;
    app.workspace.viewport.getBoundingClientRect=()=>new DOMRect(0,0,width,height);
    const preset=document.querySelector<HTMLSelectElement>('.preset-select')!;
    preset.value='21';preset.dispatchEvent(new Event('change'));
    const original=structuredClone(app.store.patch);
    app.workspace.fit();
    const transform=app.workspace.world.style.transform;
    const parts=transform.match(/-?[0-9]+(?:[.][0-9]+)?/g)?.map(Number);
    expect(parts).toHaveLength(3);
    const [panX,panY,zoom]=parts!;
    const modules=app.store.patch.modules;
    expect(zoom).toBeGreaterThan(0);
    expect(zoom).toBeLessThan(.875); // No minimum zoom that clips wide patches.
    for(const module of modules){
      expect(module.x*zoom+panX).toBeGreaterThanOrEqual(4);
      expect((module.x+128)*zoom+panX).toBeLessThanOrEqual(width-4);
      expect(module.y*zoom+panY).toBeGreaterThanOrEqual(12);
      expect((module.y+132)*zoom+panY).toBeLessThanOrEqual(height-56);
    }
    expect(app.store.patch).toEqual(original); // Only the viewport moves; patch JSON is untouched.
  });

  it.each([[390,844],[844,390],[320,568],[1280,800]])('exposes header deletion and preserves cancellation at a %s×%s viewport',(width,height)=>{
    Object.defineProperty(window,'innerWidth',{value:width,configurable:true});Object.defineProperty(window,'innerHeight',{value:height,configurable:true});const style=document.createElement('style');style.textContent=readFileSync('src/styles/main.css','utf8');document.head.append(style);
    document.querySelector<HTMLElement>('.module-card[data-module="alloy-1"]')!.dispatchEvent(new KeyboardEvent('keydown',{key:'Enter',bubbles:true}));const before=structuredClone(app.store.patch),selected=app.store.selectedModule;const sync=vi.spyOn(app.audio,'sync');
    const trash=document.querySelector<HTMLButtonElement>('[aria-label="Delete selected module and its cables"]')!;expect(trash.closest('.editor-top')).not.toBeNull();expect(getComputedStyle(trash).minWidth).toBe('44px');expect(getComputedStyle(trash).minHeight).toBe('44px');for(const primary of document.querySelectorAll<HTMLElement>('.topbar>button,.editor-actions>button')){expect(getComputedStyle(primary).minWidth).toBe('44px');expect(getComputedStyle(primary).minHeight).toBe('44px');}expect(getComputedStyle(document.querySelector('.editor input[type=range]')!).height).toBe('44px');expect(getComputedStyle(document.querySelector('.module-card')!).width).toBe('128px');expect(getComputedStyle(document.querySelector('.module-card')!).height).toBe('132px');expect(getComputedStyle(trash.closest('.editor-top')!).position).toBe('sticky');app.editor.root.scrollTop=2000;trash.click();expect(document.querySelector('.module-delete-confirm')!.textContent).toContain('ALLOY');expect(document.querySelector('[aria-label="Cancel module removal"]')).toBe(document.activeElement);
    document.querySelector<HTMLButtonElement>('[aria-label="Cancel module removal"]')!.click();expect(app.store.patch).toEqual(before);expect(app.store.selectedModule).toBe(selected);expect(sync).not.toHaveBeenCalled();expect(document.activeElement).toBe(trash);
    trash.click();document.querySelector<HTMLButtonElement>('[aria-label="Confirm module removal"]')!.click();expect(app.store.patch.modules.some(m=>m.id==='alloy-1')).toBe(false);expect(app.store.patch.connections.every(e=>e.from.module!=='alloy-1'&&e.to.module!=='alloy-1')).toBe(true);expect(app.store.patch.modules).toHaveLength(before.modules.length-1);style.remove();
  });
  it('Escape cancels removal without closing the editor or changing the patch',()=>{
    document.querySelector<HTMLElement>('.module-card[data-module="alloy-1"]')!.dispatchEvent(new KeyboardEvent('keydown',{key:'Enter',bubbles:true}));const before=structuredClone(app.store.patch);document.querySelector<HTMLButtonElement>('[aria-label="Delete selected module and its cables"]')!.click();document.activeElement!.dispatchEvent(new KeyboardEvent('keydown',{key:'Escape',bubbles:true}));expect(document.querySelector('.module-delete-confirm')).toBeNull();expect(document.querySelector('#app')!.classList.contains('editor-visible')).toBe(true);expect(app.store.patch).toEqual(before);
  });
  it.each(['Delete','Backspace'])('keeps direct %s deletion on a focused chip',key=>{const chip=document.querySelector<HTMLElement>('.module-card[data-module="alloy-1"]')!;chip.dispatchEvent(new KeyboardEvent('keydown',{key:'Enter',bubbles:true}));chip.focus();chip.dispatchEvent(new KeyboardEvent('keydown',{key,bubbles:true}));expect(app.store.patch.modules.some(m=>m.id==='alloy-1')).toBe(false);});
  it('does not remove a newly selected module through a stale confirmation',()=>{document.querySelector<HTMLElement>('.module-card[data-module="alloy-1"]')!.dispatchEvent(new KeyboardEvent('keydown',{key:'Enter',bubbles:true}));document.querySelector<HTMLButtonElement>('[aria-label="Delete selected module and its cables"]')!.click();const stale=document.querySelector<HTMLButtonElement>('[aria-label="Confirm module removal"]')!;document.querySelector<HTMLElement>('.module-card[data-module="flock-1"]')!.dispatchEvent(new KeyboardEvent('keydown',{key:'Enter',bubbles:true}));stale.click();expect(app.store.patch.modules.some(m=>m.id==='alloy-1')).toBe(true);expect(app.store.patch.modules.some(m=>m.id==='flock-1')).toBe(true);});

  it.each([['SMEAR','smear'],['FRICTION','pressure']])('edits and snapshots the two-slider %s module',async(type,parameter)=>{
    document.querySelector<HTMLButtonElement>(`[aria-label="Add ${type} module"]`)!.click();const id=app.store.selectedModule!;
    document.querySelector<HTMLElement>(`.module-card[data-module="${id}"]`)!.dispatchEvent(new KeyboardEvent('keydown',{key:'Enter',bubbles:true}));
    expect(document.querySelectorAll('.editor-controls input[type=range]')).toHaveLength(2);
    const slider=document.querySelector<HTMLInputElement>(`.editor input[data-parameter="${parameter}"]`)!;slider.value='.73';slider.dispatchEvent(new Event('input',{bubbles:true}));
    const saved=structuredClone(app.store.patch),snapshot=app.snapshots.storage.capture(saved,'New sound');
    document.querySelector<HTMLButtonElement>('[aria-label="Delete selected module and its cables"]')!.click();document.querySelector<HTMLButtonElement>('[aria-label="Confirm module removal"]')!.click();
    app.store.replace(app.snapshots.storage.recall(snapshot,app.store.patch));expect(app.store.patch).toEqual(saved);
    await vi.waitFor(()=>expect(JSON.parse(localStorage.getItem('signal-machines.patch.v1')??'null')).toEqual(saved));
  });
  it('opens both new sound studies from the browser preset selector',()=>{
    const selector=document.querySelector<HTMLSelectElement>('.preset-select')!;
    for(const [index,name,type] of [['32','DISSOLVING METAL','SMEAR'],['33','SLIDING GLASS','FRICTION']]){selector.value=index;selector.dispatchEvent(new Event('change'));expect(app.store.patch.name).toBe(name);expect(app.store.patch.modules.some(m=>m.type===type)).toBe(true);}
  });

  it('loads FOUND samples without starting audio, retains references in snapshots and caps two instances',async()=>{
    const start=vi.spyOn(app.audio,'start');document.querySelector<HTMLButtonElement>('[aria-label="Add FOUND module"]')!.click();const id=app.store.selectedModule!;document.querySelector<HTMLElement>(`.module-card[data-module="${id}"]`)!.dispatchEvent(new KeyboardEvent('keydown',{key:'Enter',bubbles:true}));expect(document.querySelectorAll('.editor-controls input[type=range]')).toHaveLength(2);await vi.waitFor(()=>expect(document.querySelector('.found-preview path')!.getAttribute('d')!.length).toBeGreaterThan(20));const source=document.querySelector<HTMLSelectElement>('[aria-label="FOUND source"]')!;source.value='builtin:rain';source.dispatchEvent(new Event('change'));expect(app.store.patch.modules.find(m=>m.id===id)!.sample).toBe('builtin:rain');expect(start).not.toHaveBeenCalled();const p=structuredClone(app.store.patch),snapshot=app.snapshots.storage.capture(p,'Found rain');app.store.replace(app.snapshots.storage.recall(snapshot,app.store.patch));expect(app.store.patch).toEqual(p);for(let i=0;i<2;i++)document.querySelector<HTMLButtonElement>('[aria-label="Add FOUND module"]')!.click();expect(app.store.patch.modules.filter(m=>m.type==='FOUND')).toHaveLength(2);expect(document.querySelector('.toast')!.textContent).toContain('at most 2 FOUND');
  });

  it('loads a local FOUND file through its file input without starting RUN',async()=>{
    const {builtinFound}=await import('../src/samples/FoundData');const audio={...builtinFound('machine'),id:'local:ui-test',name:'field.m4a'};const start=vi.spyOn(app.audio,'start');vi.spyOn(app.audio.foundLibrary,'import').mockResolvedValue({audio,persisted:false});document.querySelector<HTMLButtonElement>('[aria-label="Add FOUND module"]')!.click();const id=app.store.selectedModule!;document.querySelector<HTMLElement>(`.module-card[data-module="${id}"]`)!.dispatchEvent(new KeyboardEvent('keydown',{key:'Enter',bubbles:true}));const file=document.querySelector<HTMLInputElement>('[aria-label="FOUND audio file"]')!;Object.defineProperty(file,'files',{value:[new File(['sample'],'field.m4a')],configurable:true});file.dispatchEvent(new Event('change'));await vi.waitFor(()=>expect(app.store.patch.modules.find(m=>m.id===id)!.sample).toBe('local:ui-test'));expect(start).not.toHaveBeenCalled();expect(JSON.stringify(app.store.patch)).not.toContain('Float32Array');expect(document.querySelector('.toast')!.textContent).toContain('session');
  });
  it('shows LEVEL zero-dB reference and all three new demos',()=>{document.querySelector<HTMLButtonElement>('[aria-label="Add LEVEL module"]')!.click();const id=app.store.selectedModule!;document.querySelector<HTMLElement>(`.module-card[data-module="${id}"]`)!.dispatchEvent(new KeyboardEvent('keydown',{key:'Enter',bubbles:true}));expect(document.querySelectorAll('.editor-controls input[type=range]')).toHaveLength(2);expect(document.querySelector('.editor .gain-zero')!.textContent).toBe('0 dB');expect(document.querySelector('.editor output')!.textContent).toBe('0.0 dB');const boost=document.querySelector<HTMLInputElement>('.editor input[data-parameter=boost]')!;boost.value='.333';boost.dispatchEvent(new Event('input'));expect(app.store.patch.modules.find(m=>m.id===id)!.params.boost).toBe(1/3);const select=document.querySelector<HTMLSelectElement>('.preset-select')!;for(const [index,name] of [['34','FOUND / QUIET'],['35','FOUND / STRANGE'],['36','LEVEL / RECOVERY']]){select.value=index;select.dispatchEvent(new Event('change'));expect(app.store.patch.name).toBe(name);}});

});
