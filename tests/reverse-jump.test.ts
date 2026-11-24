import {describe,it,expect} from 'vitest';
import {Reverse} from '../src/audio/modules/Reverse';
import {Jump} from '../src/audio/modules/Jump';
import {createModule,connect} from '../src/graph/PatchGraph';
import {emptyPatch} from '../src/state/presets';
import {parsePatch} from '../src/state/PatchStorage';
import {DSPGraph} from '../src/audio/DSPGraph';
import {DEFINITIONS,MODE_OPTIONS} from '../src/graph/definitions';

const make=(type:'REVERSE'|'JUMP',seed=33)=>{
  const state=createModule(type,20,20,seed,type.toLowerCase());
  return {state,sampleRate:1000,patchSeed:71};
};

describe('REVERSE: bounded stereo memory and actual reversed audio',()=>{
 it('waits until a full slice exists, then reads the completed slice backwards',()=>{
   const {state,sampleRate,patchSeed}=make('REVERSE');
   state.params.span=0;state.params.speed=.5;state.params.mix=1;state.params.edge=0;
   const reverse=new Reverse(state,sampleRate,patchSeed);
   const output:Array<[number,number]>=[];
   for(let sample=0;sample<110;sample++){
     const v=sample<50?sample/50:-.4;
     reverse.inputL[0]=v;reverse.inputR[0]=-v;
     reverse.process(sample);
     output.push([reverse.outputL[0],reverse.outputR[0]]);
     expect(Number.isFinite(reverse.outputL[0])&&Number.isFinite(reverse.outputR[0])).toBe(true);
   }
   expect(output[20][0]).toBeCloseTo(.4,5); // Before the first 50 ms window, playback is dry.
   expect(output[65][0]).toBeGreaterThan(.5);
   expect(output[65][0]).toBeGreaterThan(output[75][0]+.1);
   expect(output[65][1]).toBeCloseTo(-output[65][0],5);
   expect(output[100][0]).toBeLessThan(0); // The second recorded slice is negative.
 });
 it('FLIP and GATE modes allow sudden reversible transitions while audio stays finite',()=>{
   const {state,sampleRate,patchSeed}=make('REVERSE');
   state.mode='FLIP';state.params.span=0;state.params.speed=.5;state.params.mix=1;
   const r=new Reverse(state,sampleRate,patchSeed);
   for(let i=0;i<70;i++){r.inputL[0]=.4;r.inputR[0]=-.4;r.process(i);}
   expect(r.outputL[0]).toBeCloseTo(.4,3);
   expect(r.command('flip')).toEqual({reverse:true});
   for(let i=70;i<85;i++){r.process(i);expect(Number.isFinite(r.outputL[0])).toBe(true);}
   expect(r.outputL[0]).toBeGreaterThan(.1);
   expect(r.command('flip')).toEqual({reverse:false});
   for(let i=85;i<105;i++)r.process(i);
   expect(r.outputL[0]).toBeCloseTo(.4,3);
   state.mode='GATE';r.update(state);
   r.inputL[2]=1;
   for(let i=105;i<120;i++)r.process(i);
   expect(r.outputL[0]).toBeGreaterThan(0);
   r.inputL[2]=0;
   for(let i=120;i<135;i++)r.process(i);
   expect(r.outputL[0]).toBeCloseTo(.4,3);
 });
 it('remains memory-bounded at 192kHz and does not clear large buffers in an audio callback',()=>{
   const {state}=make('REVERSE'),sampleRate=192000;
   const r=new Reverse(state,sampleRate,71);
   const fields=r as unknown as {left:Float32Array[];right:Float32Array[]};
   const bytes=fields.left.concat(fields.right).reduce((sum,a)=>sum+a.byteLength,0);
   expect(bytes).toBeLessThan(8_000_000);
   expect(r.command('reset')).toEqual({reverse:false});
   r.process(0);
   expect(r.outputL[0]).toBe(0);
 });
});

describe('JUMP: intentional discontinuities and manual intervention',()=>{
 it('FLIP changes a held CV value sharply on a rising edge, not every clock sample',()=>{
   const {state,sampleRate,patchSeed}=make('JUMP');
   state.params.depth=.8;state.params.edge=0;state.params.chance=1;
   const jump=new Jump(state,sampleRate,patchSeed);
   jump.process(0);expect(jump.outputL[0]).toBeCloseTo(-.8);
   jump.inputL[1]=1;jump.process(1);expect(jump.outputL[0]).toBeCloseTo(.8);
   expect(jump.outputL[2]).toBe(1);
   jump.process(2);expect(jump.outputL[2]).toBe(0);
   jump.inputL[1]=0;jump.process(3);expect(jump.outputL[0]).toBeCloseTo(.8);
   jump.inputL[1]=1;jump.process(4);expect(jump.outputL[0]).toBeCloseTo(-.8);
   jump.inputL[2]=1;jump.inputL[1]=0;jump.process(5);expect(jump.outputL[0]).toBeCloseTo(-.8);
 });
 it('SAMPLE latches an incoming bipolar CV and RANDOM is deterministic for fixed seed',()=>{
   const {state,sampleRate,patchSeed}=make('JUMP');
   state.mode='SAMPLE';state.params.depth=.5;
   const r=new Jump(state,sampleRate,patchSeed);
   r.inputL[0]=.6;r.inputL[1]=1;r.process(5);
   expect(r.outputL[0]).toBeCloseTo(.3);
   r.inputL[0]=-.8;r.inputL[1]=0;r.process(6);
   expect(r.outputL[0]).toBeCloseTo(.3);
   state.mode='RANDOM';
   const a=new Jump(state,sampleRate,patchSeed),b=new Jump(state,sampleRate,patchSeed);
   for(let i=0;i<48;i++){
     const t=i%2;
     a.inputL[1]=t;b.inputL[1]=t;
     a.process(i);b.process(i);
     expect(a.outputL[0]).toBe(b.outputL[0]);
   }
 });
 it('manual JUMP NOW schedules the output event on the next audio frame',()=>{
   const {state,sampleRate,patchSeed}=make('JUMP');
   const j=new Jump(state,sampleRate,patchSeed);
   j.process(2);
   expect(j.command('jump')).toEqual({value:.85});
   j.process(3);
   expect(j.outputL[0]).toBe(.85);
   expect(j.outputL[2]).toBe(1);
   j.process(4);expect(j.outputL[2]).toBe(0);
 });
 it('CV edge smoothing is opt-in and does not create non-finite values',()=>{
   const {state,sampleRate,patchSeed}=make('JUMP');
   state.params.edge=.6;
   const j=new Jump(state,sampleRate,patchSeed);
   const before=j.outputL[0];
   j.inputL[1]=1;j.process(1);
   expect(j.outputL[0]).toBeLessThan(.85);
   for(let i=2;i<400;i++){j.process(i);expect(Number.isFinite(j.outputL[0])).toBe(true);}
   expect(before).toBe(0);
   expect(j.outputL[0]).toBeCloseTo(.85,2);
 });

 it('patch JSON recognizes both new modules, signal types and modes without affecting legacy patches',()=>{
   expect(MODE_OPTIONS.REVERSE).toContain('FLIP');
   expect(MODE_OPTIONS.JUMP).toContain('SAMPLE');
   expect(DEFINITIONS.REVERSE.inputs.find(p=>p.id==='flip')?.signal).toBe('trigger');
   expect(DEFINITIONS.JUMP.outputs.find(p=>p.id==='value')?.signal).toBe('control');
   const patch=emptyPatch();
   const osc=createModule('OSC',0,0,100,'osc'),rev=createModule('REVERSE',160,0,101,'rev'),
         pulse=createModule('PULSE',0,170,102,'pulse'),jump=createModule('JUMP',160,170,103,'jump'),
         filter=createModule('FILTER',320,0,104,'filter'),out=createModule('OUTPUT',500,0,105,'out');
   rev.mode='FLIP';jump.mode='RANDOM';jump.params.edge=0;
   patch.modules=[osc,rev,pulse,jump,filter,out];
   connect(patch,{module:'osc',port:'audio'},{module:'rev',port:'audio'});
   connect(patch,{module:'pulse',port:'trigger'},{module:'jump',port:'trigger'});
   connect(patch,{module:'pulse',port:'trigger'},{module:'rev',port:'flip'});
   connect(patch,{module:'jump',port:'value'},{module:'filter',port:'cutoff'});
   connect(patch,{module:'rev',port:'audio'},{module:'filter',port:'audio'});
   connect(patch,{module:'filter',port:'audio'},{module:'out',port:'audio'});
   expect(parsePatch(JSON.stringify(patch))).toEqual(patch);
   const graph=new DSPGraph(48000);
   graph.setPatch(patch);
   let max=0;
   const l=new Float32Array(128),r=new Float32Array(128);
   for(let i=0;i<900;i++){
     graph.process(l,r);
     for(let k=0;k<128;k++){
       expect(Number.isFinite(l[k])&&Number.isFinite(r[k])).toBe(true);
       max=Math.max(max,Math.abs(l[k]),Math.abs(r[k]));
     }
   }
   expect(graph.faults).toBe(0);
   expect(max).toBeGreaterThan(.01);
   expect(max).toBeLessThanOrEqual(.630001);
 });
});
