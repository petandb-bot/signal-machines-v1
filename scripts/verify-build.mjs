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
for(const name of ['metal-drift','uneven-memory','empty-chamber','bad-contact','tape-garden','host-fever','unstable-circuit','breathing-circuit','forked-memory','loop-weather','clear-signal','wire-strings','sideband-garden','chance-garden','spectral-ghost','harmonic-weather','clockwork-garden','slow-weather','marble-room','binary-fever','bent-vowels','split-orbits','tritave-field','off-grid','colony-cracks','stored-rain','dissenting-bodies','outer-band','pixel-dust','biased-orbit','drawn-metal','twin-swings']){
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
// New registered roles also execute in the emitted bundle without a new preset.
const pmPatch={version:1,layout:2,name:'PM LPG acceptance',seed:13,bpm:100,master:.5,modules:[
{id:'a',type:'OPERATOR',x:0,y:0,seed:1,character:'METAL',params:{tune:.5,depth:.3}},
{id:'b',type:'OPERATOR',x:144,y:0,seed:2,character:'METAL',params:{tune:.65,depth:.7}},
{id:'lpg',type:'LPG',x:288,y:0,seed:3,character:'METAL',params:{bite:.7,decay:.5}},
{id:'out',type:'OUTPUT',x:432,y:0,seed:4,character:'METAL',params:{level:.7}}],connections:[
{id:'pm',from:{module:'a',port:'audio'},to:{module:'b',port:'mod'}},
{id:'gate',from:{module:'b',port:'audio'},to:{module:'lpg',port:'audio'}},
{id:'out',from:{module:'lpg',port:'audio'},to:{module:'out',port:'audio'}}]};
const pm=new Processor(),pmBefore=messages.length;pm.port.onmessage({data:{type:'patch',patch:pmPatch,reset:true}});let pmEnergy=0;
for(let i=0;i<300;i++){const l=new Float32Array(193),r=new Float32Array(193);pm.process([],[ [l,r] ]);for(const v of [...l,...r]){assert(Number.isFinite(v)&&Math.abs(v)<=.63);pmEnergy+=v*v;}}
assert(pmEnergy>.01);assert(!messages.slice(pmBefore).some(m=>m.type==='error'||m.type==='telemetry'&&m.data.faults>0));
// Interaction modules are checked without changing any saved preset.
const interaction=structuredClone(pmPatch);interaction.name='Interaction acceptance';interaction.modules.push(
{id:'edge',type:'EDGE',x:0,y:144,seed:5,character:'METAL',params:{sense:.8,recovery:.2}},
{id:'mesh',type:'MESH',x:144,y:144,seed:6,character:'METAL',params:{transfer:.8,memory:.4}},
{id:'orbit',type:'ORBIT',x:288,y:144,seed:7,character:'METAL',params:{rate:.6,depth:1}});
interaction.connections=[
{id:'pm',from:{module:'a',port:'audio'},to:{module:'b',port:'mod'}},
{id:'ma',from:{module:'b',port:'audio'},to:{module:'mesh',port:'a'}},
{id:'mb',from:{module:'a',port:'audio'},to:{module:'mesh',port:'b'}},
{id:'detect',from:{module:'mesh',port:'audio'},to:{module:'edge',port:'audio'}},
{id:'strike',from:{module:'edge',port:'event'},to:{module:'lpg',port:'strike'}},
{id:'gate',from:{module:'mesh',port:'audio'},to:{module:'lpg',port:'audio'}},
{id:'move',from:{module:'lpg',port:'audio'},to:{module:'orbit',port:'audio'}},
{id:'cv',from:{module:'edge',port:'activity'},to:{module:'orbit',port:'position'}},
{id:'out',from:{module:'orbit',port:'audio'},to:{module:'out',port:'audio'}}];
const interacting=new Processor(),interactionBefore=messages.length;interacting.port.onmessage({data:{type:'patch',patch:interaction,reset:true}});let interactionEnergy=0;
for(let i=0;i<300;i++){const l=new Float32Array(193),r=new Float32Array(193);interacting.process([],[ [l,r] ]);for(const v of [...l,...r]){assert(Number.isFinite(v)&&Math.abs(v)<=.63);interactionEnergy+=v*v;}}
assert(interactionEnergy>.0001);assert(!messages.slice(interactionBefore).some(m=>m.type==='error'||m.type==='telemetry'&&m.data.faults>0));
console.log(JSON.stringify({result:'PASS',test:'production worklet: thirty-two presets, 3 s each / 48 kHz / stereo / variable blocks; LOOP record, overdub, import/export and restart/reset bridge; sample-identical master PCM capture',results},null,2));
