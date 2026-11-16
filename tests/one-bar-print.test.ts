import {describe,expect,it} from 'vitest';
import {createModule,connect,removeModule} from '../src/graph/PatchGraph';
import {emptyPatch} from '../src/state/presets';
import {DSPGraph} from '../src/audio/DSPGraph';
import {Loop} from '../src/audio/modules/Loop';
import type {LoopAudio} from '../src/audio/LoopAudio';

function makePatch(bpm=120,routeLoop=false){
 const p=emptyPatch();p.name='One-bar print test';p.master=.7;p.bpm=bpm;
 const chip=createModule('CHIP',0,0,11,'chip');chip.params.tune=.59;chip.params.character=.31;
 const out=createModule('OUTPUT',120,0,12,'out');
 const loop=createModule('LOOP',240,0,13,'loop');
 p.modules=[chip,out,loop];
 connect(p,{module:'chip',port:'audio'},{module:'out',port:'audio'});
 if(routeLoop)connect(p,{module:'loop',port:'audio'},{module:'out',port:'audio'});
 return p;
}
function print(g:DSPGraph,loop='loop'){
 let state:unknown,error:unknown;
 g.requestAction(loop,'print',undefined,(v,e)=>{state=v;error=e;});
 g.process(new Float32Array(128),new Float32Array(128));
 if(error)throw Error(String(error));
 return state as {mode:string;frames:number;printTargetFrames:number};
}
function exportLoop(g:DSPGraph){return g.modules.get('loop')!.command('export') as LoopAudio;}
describe('ONE BAR PRINT — post-master capture into existing LOOP memory',()=>{
 it.each([8000,44100,48000])('captures a 4/4 bar exactly, including the final master audio at %i Hz',rate=>{
  const p=makePatch(120),g=new DSPGraph(rate),reference=new DSPGraph(rate);
  g.setPatch(p);reference.setPatch(p);
  const bars=Math.round(rate*240/p.bpm);
  const start=print(g);expect(start.mode).toBe('printing');expect(start.printTargetFrames).toBe(bars);
  // The PRINT action starts on the first rendered quantum. Compare that quantum
  // with a separately seeded reference graph, then compare exported PCM directly.
  const firstL=new Float32Array(128),firstR=new Float32Array(128);
  // After one quantum, replay from the exported input by running reference with
  // its first 128 frames and matching the subsequent sequence separately.
  reference.process(firstL,firstR);
  const recordedExpectedL=new Float32Array(bars),recordedExpectedR=new Float32Array(bars);
  recordedExpectedL.set(firstL);recordedExpectedR.set(firstR);
  let offset=128;
  while(offset<bars){
   const size=Math.min(128,bars-offset),l=new Float32Array(size),r=new Float32Array(size),
         rl=new Float32Array(size),rr=new Float32Array(size);
   g.process(l,r);reference.process(rl,rr);
   recordedExpectedL.set(rl,offset);recordedExpectedR.set(rr,offset);offset+=size;
  }
  // Commit the finished capture at the next render quantum, not mid-sample.
  g.process(new Float32Array(1),new Float32Array(1));
  const loop=g.modules.get('loop') as Loop;
  expect(loop.telemetry().loop).toEqual({mode:'playing',frames:bars,sampleRate:rate});
  const stored=exportLoop(g);
  expect(stored.left).toEqual(recordedExpectedL);
  expect(stored.right).toEqual(recordedExpectedR);
  expect(g.faults).toBe(0);
 },30000);
 it('does not re-record the destination LOOP old playback; it monitors only new dry input during PRINT',()=>{
  const rate=8000,p=makePatch(300,true),baseline=new DSPGraph(rate),g=new DSPGraph(rate);
  g.setPatch(p);baseline.setPatch(p);
  const previous={kind:'loopAudio' as const,sampleRate:rate,left:new Float32Array(rate).fill(.7),right:new Float32Array(rate).fill(-.5)};
  g.modules.get('loop')!.command('import',previous);
  const state=print(g);expect(state.mode).toBe('printing');
  // The LOOP channel is routed to OUTPUT but its prior memory must be muted.
  const first=new Float32Array(128),firstR=new Float32Array(128);
  baseline.process(first,firstR);
  let offset=128;const target=Math.round(rate*240/300);
  const expected=new Float32Array(target);expected.set(first);
  while(offset<target){
   const n=Math.min(128,target-offset),l=new Float32Array(n),r=new Float32Array(n),reference=new Float32Array(n),refR=new Float32Array(n);
   g.process(l,r);baseline.process(reference,refR);expected.set(reference,offset);offset+=n;
  }
  g.process(new Float32Array(1),new Float32Array(1));
  const recorded=exportLoop(g);
  expect(recorded.left).toEqual(expected);
  expect(g.faults).toBe(0);
 },15000);
 it('allows cancel and avoids dangling targets when the LOOP is removed',()=>{
  const rate=8000,p=makePatch(40),g=new DSPGraph(rate);g.setPatch(p);
  expect(print(g).mode).toBe('printing');
  g.modules.get('loop')!.command('clear');
  g.process(new Float32Array(128),new Float32Array(128));
  expect(g.modules.get('loop')!.telemetry().loop?.mode).toBe('empty');
  expect(print(g).mode).toBe('printing');
  removeModule(p,'loop');g.setPatch(p);
  for(let i=0;i<5;i++)g.process(new Float32Array(128),new Float32Array(128));
  expect(g.modules.has('loop')).toBe(false);
  expect(g.faults).toBe(0);
 },12000);
 it('finishes a partial PRINT cleanly on transportStop while retaining material for restart',()=>{
  const rate=8000,p=makePatch(20),g=new DSPGraph(rate);g.setPatch(p);
  print(g);
  for(let i=0;i<24;i++)g.process(new Float32Array(128),new Float32Array(128));
  g.finishLoops();
  const before=g.modules.get('loop')!.telemetry().loop;
  expect(before?.mode).toBe('playing');expect(before!.frames).toBeGreaterThan(3000);
  g.setPatch(p,true,true);
  for(let i=0;i<8;i++)g.process(new Float32Array(128),new Float32Array(128));
  expect(g.modules.get('loop')!.telemetry().loop?.frames).toBe(before!.frames);
 },12000);
 it('rejects invalid print lengths and simultaneous PRINT requests without overwriting the first',()=>{
  const rate=8000,p=makePatch(120);p.modules.push(createModule('LOOP',300,0,25,'loop2'));
  const g=new DSPGraph(rate);g.setPatch(p);
  const loop=g.modules.get('loop') as Loop;
  for(const frames of [-1,0,NaN,rate*17,1.5]){
   expect(()=>loop.command('print',{frames})).toThrow('Invalid PRINT length');
  }
  expect(print(g).mode).toBe('printing');
  let error='';g.requestAction('loop2','print',undefined,(_,e)=>error=e??'');
  g.process(new Float32Array(128),new Float32Array(128));
  expect(error).toContain('one LOOP');
  expect(loop.telemetry().loop?.mode).toBe('printing');
 },12000);
});
