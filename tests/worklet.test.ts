import { expect, it, vi } from 'vitest';
import {createModule} from '../src/graph/PatchGraph';
import { metalDrift } from '../src/state/presets';
it('registers the real processor, validates messages and renders variable block sizes',async()=>{
  const messages:unknown[]=[];let Constructor:new()=>{port:{onmessage:(event:{data:unknown})=>void};process:(input:Float32Array[][],output:Float32Array[][])=>boolean};
  vi.stubGlobal('sampleRate',48000);
  vi.stubGlobal('AudioWorkletProcessor',class{port={onmessage:()=>{},postMessage:(m:unknown)=>messages.push(m)};});
  vi.stubGlobal('registerProcessor',(name:string,ctor:typeof Constructor)=>{expect(name).toBe('signal-machines');Constructor=ctor;});
  await import('../src/audio/worklets/processor');const processor=new Constructor!();processor.port.onmessage({data:{type:'patch',patch:metalDrift(),reset:true}});
  let energy=0;
  for(let i=0;i<150;i++){const left=new Float32Array(i%2?192:511),right=new Float32Array(left.length);expect(processor.process([],[ [left,right] ])).toBe(true);for(const sample of left)energy+=sample*sample;}
  expect(energy).toBeGreaterThan(.01);expect(messages.some(m=>(m as {type:string}).type==='telemetry')).toBe(true);
  processor.port.onmessage({data:{type:'patch',patch:{version:99}}});expect(messages.some(m=>(m as {type:string}).type==='error')).toBe(true);
  const loop=createModule('LOOP',0,0,1,'loop'),output=createModule('OUTPUT',0,0,2,'output'),patch={...metalDrift(),modules:[loop,output],connections:[{id:'clip-out',from:{module:'loop',port:'audio'},to:{module:'output',port:'audio'}}]};
  processor.port.onmessage({data:{type:'patch',patch,reset:true}});
  processor.port.onmessage({data:{type:'moduleAction',requestId:17,id:'loop',action:'import',payload:{kind:'loopAudio',sampleRate:48000,left:Float32Array.from({length:4800},(_,i)=>Math.sin(i*.1)*.2),right:new Float32Array(4800)}}});
  for(let i=0;i<5;i++)processor.process([],[ [new Float32Array(512),new Float32Array(512)] ]);
  expect(messages.some(m=>(m as {type:string;requestId:number;error?:string}).type==='actionResult'&&(m as {requestId:number}).requestId===17&&!(m as {error?:string}).error)).toBe(true);
  processor.port.onmessage({data:{type:'moduleAction',requestId:18,id:'loop',action:'export'}});processor.process([],[ [new Float32Array(193),new Float32Array(193)] ]);
  const exported=messages.find(m=>(m as {requestId?:number}).requestId===18) as {result:{left:Float32Array}};expect(exported.result.left).toHaveLength(4800);expect(exported.result.left[20]).toBeCloseTo(Math.sin(2)*.2);
  processor.port.onmessage({data:{type:'patch',patch:metalDrift(),reset:true}});
  processor.port.onmessage({data:{type:'recordStart',id:77}});const recorded:number[]=[];
  for(const size of [17,8192,193,511]){const left=new Float32Array(size),right=new Float32Array(size);processor.process([],[ [left,right] ]);recorded.push(...left);}
  processor.port.onmessage({data:{type:'recordStop'}});
  const chunks=messages.filter(m=>(m as {type:string;id:number}).type==='recordData'&&(m as {id:number}).id===77) as Array<{left:Float32Array;frames:number}>;
  expect(chunks.reduce((n,c)=>n+c.frames,0)).toBe(recorded.length);let index=0;for(const chunk of chunks)for(let i=0;i<chunk.frames;i++,index++)expect(chunk.left[i]).toBe(recorded[index]);
  expect(messages.some(m=>(m as {type:string;id:number}).type==='recordEnd'&&(m as {id:number}).id===77)).toBe(true);vi.unstubAllGlobals();
});
