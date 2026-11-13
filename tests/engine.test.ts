// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AudioEngine } from '../src/audio/AudioEngine';
import { metalDrift } from '../src/state/presets';
let sent:unknown[]=[];let supported='audio/webm;codecs=opus';
class FakeContext {
  static last:FakeContext;state='running';onstatechange?:()=>void;
  constructor(){FakeContext.last=this;}
  sampleRate=48000;currentTime=0;destination={};
  audioWorklet={addModule:vi.fn(async()=>{})};resume=vi.fn(async()=>{});suspend=vi.fn(async()=>{});close=vi.fn(async()=>{});
  createGain(){return{connect:()=>{},gain:{value:0,cancelScheduledValues:()=>{},setValueAtTime:()=>{},linearRampToValueAtTime:()=>{},setTargetAtTime:()=>{}}};}
  createMediaStreamDestination(){return{stream:{}};}
}
class FakeNode {static last:FakeNode;constructor(){FakeNode.last=this;}port={postMessage:(message:unknown)=>sent.push(message),onmessage:(_event:{data:unknown})=>{}};connect(){}onprocessorerror=()=>{};}
class FakeRecorder {
  static isTypeSupported(mime:string){return mime===supported;}
  mimeType:string;state='inactive';ondataavailable?:(event:{data:Blob})=>void;onstop?:()=>void;onerror?:()=>void;
  constructor(_stream:unknown,options:{mimeType:string}){this.mimeType=options.mimeType;}
  start(){this.state='recording';}
  stop(){this.ondataavailable?.({data:new Blob(['recording'],{type:this.mimeType})});this.state='inactive';this.onstop?.();}
}
beforeEach(()=>{sent=[];supported='audio/webm;codecs=opus';vi.useFakeTimers();vi.stubGlobal('isSecureContext',true);vi.stubGlobal('AudioContext',FakeContext);vi.stubGlobal('AudioWorkletNode',FakeNode);vi.stubGlobal('MediaRecorder',FakeRecorder);});
afterEach(()=>{vi.useRealTimers();vi.unstubAllGlobals();});
describe('transport, throttling and recording orchestration with mocked browser APIs',()=>{
  it('reflects a mobile audio interruption and resumes from a fresh play gesture',async()=>{const engine=new AudioEngine();const error=vi.fn();engine.onError=error;await engine.start(metalDrift());FakeContext.last.state='interrupted';FakeContext.last.onstatechange?.();expect(engine.running).toBe(false);expect(error).toHaveBeenCalledWith('Audio paused. Tap play to resume.');FakeContext.last.state='running';await engine.start(metalDrift());expect(engine.running).toBe(true);});
  it('starts, fades to stop and restarts a deterministic patch',async()=>{
    const engine=new AudioEngine();await engine.start(metalDrift());expect(engine.running).toBe(true);expect((sent[0] as {reset:boolean}).reset).toBe(true);
    const stopped=engine.stop();await vi.advanceTimersByTimeAsync(55);await stopped;expect(engine.running).toBe(false);await engine.start(metalDrift());expect(engine.running).toBe(true);
  });
  it('throttles sliders and resumes parameter updates after a routing edit',async()=>{
    const engine=new AudioEngine(),patch=metalDrift();await engine.start(patch);engine.sync(patch,false);engine.sync(patch,false);await vi.advanceTimersByTimeAsync(33);expect(sent).toHaveLength(2);
    engine.sync(patch,false);engine.sync(patch,true);engine.sync(patch,false);await vi.advanceTimersByTimeAsync(33);expect((sent[3] as {type:string}).type).toBe('parameters');
  });
  it.each([['audio/webm;codecs=opus','webm'],['audio/ogg;codecs=opus','ogg'],['audio/mp4','m4a']])('downloads the actual %s format with .%s extension',async(mime,extension)=>{
    supported=mime;const engine=new AudioEngine();await engine.startRecording(metalDrift());expect(engine.recording).toBe(true);const result=await engine.stopRecording();expect(result.extension).toBe(extension);expect(result.blob.type).toBe(mime);expect(result.blob.size).toBeGreaterThan(0);expect(engine.recording).toBe(false);
  });
  it('reports an unsupported recording codec',async()=>{supported='unavailable';await expect(new AudioEngine().startRecording(metalDrift())).rejects.toThrow('No supported recording codec');});
  it('correlates module replies and keeps action errors separate from transport failure',async()=>{const engine=new AudioEngine();await engine.start(metalDrift());const result=engine.moduleAction('loop','record');const request=sent.at(-1) as {requestId:number};FakeNode.last.port.onmessage({data:{type:'actionResult',requestId:request.requestId,result:{mode:'recording'}}});await expect(result).resolves.toEqual({mode:'recording'});const failed=engine.moduleAction('loop','export');const assertion=expect(failed).rejects.toThrow('No clip');FakeNode.last.port.onmessage({data:{type:'actionResult',requestId:(sent.at(-1) as {requestId:number}).requestId,error:'No clip'}});await assertion;expect(engine.running).toBe(true);});
  it('rejects pending loop requests when native audio is interrupted',async()=>{const engine=new AudioEngine();await engine.start(metalDrift());const pending=engine.moduleAction('loop','record');const assertion=expect(pending).rejects.toThrow('Audio paused');FakeContext.last.state='interrupted';FakeContext.last.onstatechange?.();await assertion;expect(engine.running).toBe(false);});
  it('times out an unanswered module action without hanging the UI',async()=>{const engine=new AudioEngine();await engine.start(metalDrift());const pending=engine.moduleAction('loop','record'),assertion=expect(pending).rejects.toThrow('did not answer');await vi.advanceTimersByTimeAsync(10001);await assertion;});

  it.each(['wav','aiff'] as const)('records %s from real PCM messages without requiring MediaRecorder',async format=>{
    vi.stubGlobal('MediaRecorder',undefined);const engine=new AudioEngine();await engine.startRecording(metalDrift(),format);const id=(sent.at(-1) as {id:number}).id;expect(engine.recording).toBe(true);
    FakeNode.last.port.onmessage({data:{type:'recordData',id,left:Float32Array.of(.1,.2),right:Float32Array.of(-.1,-.2),frames:2}});
    const pending=engine.stopRecording();expect((sent.at(-1) as {type:string}).type).toBe('recordStop');FakeNode.last.port.onmessage({data:{type:'recordEnd',id}});
    const result=await pending;expect(result.extension).toBe(format);expect(result.blob.size).toBe((format==='wav'?44:54)+12);expect(engine.recording).toBe(false);
  });
  it('delivers automatic PCM completion once and ignores stale end messages',async()=>{
    const engine=new AudioEngine(),ready=vi.fn();engine.onRecordingReady=ready;await engine.startRecording(metalDrift(),'wav');const id=(sent.at(-1) as {id:number}).id;
    FakeNode.last.port.onmessage({data:{type:'recordData',id,left:Float32Array.of(.2),right:Float32Array.of(.1),frames:1}});FakeNode.last.port.onmessage({data:{type:'recordEnd',id:id-1}});expect(engine.recording).toBe(true);expect(ready).not.toHaveBeenCalled();FakeNode.last.port.onmessage({data:{type:'recordEnd',id}});FakeNode.last.port.onmessage({data:{type:'recordEnd',id}});expect(ready).toHaveBeenCalledOnce();expect(engine.recording).toBe(false);
  });
  it('saves received PCM after a native interruption even if no final worklet reply arrives',async()=>{
    const engine=new AudioEngine(),ready=vi.fn();engine.onRecordingReady=ready;await engine.startRecording(metalDrift(),'aiff');const id=(sent.at(-1) as {id:number}).id;
    FakeNode.last.port.onmessage({data:{type:'recordData',id,left:Float32Array.of(.2,.3),right:Float32Array.of(.1,.4),frames:2}});FakeContext.last.state='interrupted';FakeContext.last.onstatechange?.();await vi.advanceTimersByTimeAsync(1600);expect(ready).toHaveBeenCalledOnce();expect(ready.mock.calls[0][0].extension).toBe('aiff');expect(engine.recording).toBe(false);
  });

  it('still stops playback if an empty PCM take cannot be exported',async()=>{
    const engine=new AudioEngine(),error=vi.fn();engine.onError=error;await engine.startRecording(metalDrift(),'wav');const id=(sent.at(-1) as {id:number}).id;const stopped=engine.stop();FakeNode.last.port.onmessage({data:{type:'recordEnd',id}});await vi.advanceTimersByTimeAsync(60);await stopped;expect(engine.running).toBe(false);expect(error).toHaveBeenCalledWith('No audio was recorded.');
  });

  it('loads FOUND assets before its patch and retains original PCM through RUN/STOP and rewiring',async()=>{
    const {foundQuiet}=await import('../src/state/presets');const engine=new AudioEngine(),p=foundQuiet();await engine.start(p);const messages=sent as {type:string;assets?:{left:Float32Array}[]}[];expect(messages[0].type).toBe('foundAssets');expect(messages[1].type).toBe('patch');const original=await engine.foundLibrary.get();expect(messages[0].assets![0].left).not.toBe(original!.left);expect(original!.left.length).toBe(288000);engine.sync(p,true);await vi.waitFor(()=>expect(messages.filter(m=>m.type==='patch')).toHaveLength(2));expect(messages.filter(m=>m.type==='foundAssets')).toHaveLength(1);const stopped=engine.stop();await vi.advanceTimersByTimeAsync(55);await stopped;await engine.start(p);expect(messages.filter(m=>m.type==='foundAssets')).toHaveLength(1);
  });
  it('preserves latest bpm, master and module control settings while FOUND prepares audio',async()=>{
    const {foundQuiet}=await import('../src/state/presets');
    const {builtinFound}=await import('../src/samples/FoundData');
    const engine=new AudioEngine(),patch=foundQuiet();
    await engine.start(patch);
    let resume!:(audio:ReturnType<typeof builtinFound>)=>void;
    vi.spyOn(engine.foundLibrary,'get').mockImplementation(()=>new Promise(resolve=>{resume=resolve;}));
    engine.sync(patch,true);
    patch.bpm=99;patch.master=.31;
    const found=patch.modules.find(m=>m.type==='FOUND')!;
    found.params.wander=.91;found.params.alter=.74;
    found.character='ROUGH';found.mode=undefined;found.wide=true;found.bypass=true;
    engine.sync(patch,false);
    resume(builtinFound('room'));
    await vi.waitFor(()=>expect(sent.filter(m=>(m as {type:string}).type==='patch')).toHaveLength(2));
    const latest=(sent.filter(m=>(m as {type:string}).type==='patch').at(-1) as {patch:typeof patch}).patch;
    const sentFound=latest.modules.find(m=>m.id===found.id)!;
    expect(latest.bpm).toBe(99);
    expect(latest.master).toBeCloseTo(.31);
    expect(sentFound.params.wander).toBeCloseTo(.91);
    expect(sentFound.params.alter).toBeCloseTo(.74);
    expect(sentFound.character).toBe('ROUGH');
    expect(sentFound.wide).toBe(true);
    expect(sentFound.bypass).toBe(true);
  });

  it('ignores a late FOUND preparation after a different patch has been selected',async()=>{
    const {foundQuiet}=await import('../src/state/presets');const {builtinFound}=await import('../src/samples/FoundData');const engine=new AudioEngine();await engine.start(metalDrift());let resolve!:(a:ReturnType<typeof builtinFound>)=>void;vi.spyOn(engine.foundLibrary,'get').mockImplementation(()=>new Promise(r=>resolve=r));engine.sync(foundQuiet(),true);engine.sync(metalDrift(),true);resolve(builtinFound('room'));await Promise.resolve();await Promise.resolve();await Promise.resolve();expect((sent.at(-1) as {patch:{name:string}}).patch.name).toBe('METAL DRIFT');
  });

});
