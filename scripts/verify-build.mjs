import {readFileSync,readdirSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
import assert from 'node:assert/strict';
const files=readdirSync(new URL('../dist/assets/',import.meta.url));
const worklet=files.find(file=>/^processor-.*\.js$/.test(file));assert(worklet,'An independent AudioWorklet bundle must be emitted.');
let Processor;const messages=[];
runInNewContext(readFileSync(new URL(`../dist/assets/${worklet}`,import.meta.url),'utf8'),{
  sampleRate:48000,AudioWorkletProcessor:class{port={postMessage:message=>messages.push(message)};},
  registerProcessor:(name,constructor)=>{assert.equal(name,'signal-machines');Processor=constructor;}
},{timeout:5000});
const results=[];
for(const name of ['metal-drift','uneven-memory','empty-chamber','bad-contact','tape-garden','host-fever','unstable-circuit','breathing-circuit','forked-memory','loop-weather','clear-signal','wire-strings','sideband-garden','chance-garden','spectral-ghost','harmonic-weather','clockwork-garden','slow-weather','marble-room','binary-fever','bent-vowels','split-orbits','tritave-field','off-grid','colony-cracks','stored-rain','dissenting-bodies','outer-band']){
  const fixture=JSON.parse(readFileSync(new URL(`../presets/${name}.json`,import.meta.url),'utf8'));
  const before=messages.length,processor=new Processor();processor.port.onmessage({data:{type:'patch',patch:fixture,reset:true}});let peak=0,energy=0;
  for(let frame=0;frame<48000*3;){const length=Math.min(frame%3===0?257:128,48000*3-frame),left=new Float32Array(length),right=new Float32Array(length);assert(processor.process([],[ [left,right] ]));for(let i=0;i<length;i++){assert(Number.isFinite(left[i])&&Number.isFinite(right[i]));peak=Math.max(peak,Math.abs(left[i]),Math.abs(right[i]));energy+=left[i]**2+right[i]**2;}frame+=length;}
  assert(peak>0&&peak<=.63);assert(energy>0);assert(!messages.slice(before).some(message=>message.type==='error'||message.type==='telemetry'&&message.data.faults>0));
  results.push({preset:fixture.name,peak,rms:Math.sqrt(energy/(48000*3*2)),telemetryFrames:messages.length-before});
}
// Exercise the message bridge in the emitted bundle, including cross-realm audio buffers.
const fixture=JSON.parse(readFileSync(new URL('../presets/loop-weather.json',import.meta.url),'utf8'));
fixture.connections=fixture.connections.filter(e=>e.to.module!=='loop-1'||e.to.port!=='trigger');
const processor=new Processor();processor.port.onmessage({data:{type:'patch',patch:fixture,reset:true}});let requestId=100;
const tick=(frames=512)=>{const l=new Float32Array(frames),r=new Float32Array(frames);processor.process([],[ [l,r] ]);for(let i=0;i<frames;i++)assert(Number.isFinite(l[i])&&Number.isFinite(r[i])&&Math.abs(l[i])<=.63&&Math.abs(r[i])<=.63);};
const action=(action,payload)=>{const id=++requestId;processor.port.onmessage({data:{type:'moduleAction',requestId:id,id:'loop-1',action,payload}});for(let i=0;i<8&&!messages.some(m=>m.requestId===id);i++)tick();const reply=messages.find(m=>m.requestId===id);assert(reply,'Worklet action must reply');assert(!reply.error,reply.error);return reply.result;};
assert.equal(action('record').mode,'recording');for(let i=0;i<94;i++)tick();assert.equal(action('record').mode,'playing');
const take=action('export');assert(take.left.length>48000&&take.left.some(n=>n!==0));
assert.equal(action('dub').mode,'overdub');for(let i=0;i<94;i++)tick();assert.equal(action('dub').mode,'playing');const layered=action('export');assert(layered.left.some((n,i)=>n!==take.left[i]));
assert.equal(action('import',{kind:'loopAudio',sampleRate:48000,left:new Float32Array(take.left),right:new Float32Array(take.right)}).frames,take.left.length);
processor.port.onmessage({data:{type:'transportStop'}});processor.port.onmessage({data:{type:'patch',patch:fixture,reset:true,preserveLoops:true}});for(let i=0;i<8;i++)tick();assert.equal(action('export').left.length,take.left.length);
processor.port.onmessage({data:{type:'patch',patch:fixture,reset:true}});for(let i=0;i<8;i++)tick();const id=++requestId;processor.port.onmessage({data:{type:'moduleAction',requestId:id,id:'loop-1',action:'export'}});tick();assert(messages.find(m=>m.requestId===id)?.error,'Explicit recall must clear the take');
// Compare the production PCM capture with the exact protected stereo output.
const master=new Processor(),masterBefore=messages.length;
master.port.onmessage({data:{type:'patch',patch:JSON.parse(readFileSync(new URL('../presets/colony-cracks.json',import.meta.url),'utf8')),reset:true}});
master.port.onmessage({data:{type:'recordStart',id:501}});const expectedL=[],expectedR=[];
for(let i=0;i<40;i++){const n=i%2?511:193,l=new Float32Array(n),r=new Float32Array(n);master.process([],[ [l,r] ]);expectedL.push(...l);expectedR.push(...r);}
master.port.onmessage({data:{type:'recordStop'}});const masterMessages=messages.slice(masterBefore);let cursor=0;
for(const message of masterMessages.filter(m=>m.type==='recordData'&&m.id===501))for(let i=0;i<message.frames;i++,cursor++){assert.equal(message.left[i],expectedL[cursor]);assert.equal(message.right[i],expectedR[cursor]);}
assert.equal(cursor,expectedL.length);assert(expectedL.some(n=>n!==0));assert(masterMessages.some(m=>m.type==='recordEnd'&&m.id===501));
console.log(JSON.stringify({result:'PASS',test:'production worklet: twenty-eight presets, 3 s each / 48 kHz / stereo / variable blocks; LOOP record, overdub, import/export and restart/reset bridge; sample-identical master PCM capture',results},null,2));
