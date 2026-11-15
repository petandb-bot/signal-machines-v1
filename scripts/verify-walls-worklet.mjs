import {readFileSync,readdirSync} from 'node:fs';import {runInNewContext} from 'node:vm';import assert from 'node:assert/strict';import {api} from './lib/phase5-audio.mjs';
const a=await api(),file=readdirSync('dist/assets').find(f=>/^processor-.*\.js$/.test(f)),code=readFileSync('dist/assets/'+file,'utf8');
for(const rate of [44100,48000]){let Processor;const messages=[];runInNewContext(code,{sampleRate:rate,AudioWorkletProcessor:class{port={postMessage:m=>messages.push(m)};},registerProcessor:(_,C)=>Processor=C},{timeout:5000});
 for(const id of ['near-object','distant-material']){const p=a.parsePatch(readFileSync('presets/studies/'+id+'.json','utf8')),processor=new Processor(),before=messages.length;if(p.modules.some(m=>m.type==='CUTS'))processor.port.onmessage({data:{type:'foundAssets',assets:[a.builtinFound('machine')]}});processor.port.onmessage({data:{type:'patch',patch:p,reset:true}});let energy=0;
 for(let at=0;at<rate*3;at+=128){const l=new Float32Array(128),r=new Float32Array(128);assert(processor.process([],[ [l,r] ]));for(let i=0;i<128;i++){assert(Number.isFinite(l[i])&&Number.isFinite(r[i])&&Math.max(Math.abs(l[i]),Math.abs(r[i]))<=.630001);energy+=l[i]**2+r[i]**2;}}
 assert(energy>0);const events=messages.slice(before);assert(!events.some(m=>m.type==='error'||m.type==='telemetry'&&m.data.faults>0));assert(events.some(m=>m.type==='telemetry'&&m.data.modules['walls-1']?.curve?.length===8&&m.data.modules['walls-1'].bands.some(x=>x>0)));console.log('Emitted WALLS / '+id+' passed at '+rate+'Hz.');
 }
}
