import {writeFileSync} from 'node:fs';import os from 'node:os';
import {studyApi,previous,make,typedBytes} from './lib/sympathy-study.mjs';
const rows=[],rates=[];
for(const [version,source] of [['before',previous],['after',undefined]]){
 const api=await studyApi(source);
 for(const rate of [24000,44100,48000])for(const body of [0,.42,1])for(const couple of [0,.55,1]){
  const m=make(api,body,couple,rate);let previous=Infinity,peak=0,violations=0;
  for(let i=0;i<rate*24;i++){m.inputL[0]=m.inputR[0]=i<rate*.002?.4:0;m.inputL[1]=i===0?1:0;m.process(i,71);const e=m.energies.reduce((a,b)=>a+b,0);if(i>=rate*.002&&e>previous+1e-13)violations++;previous=e;peak=Math.max(peak,Math.abs(m.outputL[0]),Math.abs(m.outputR[0]));if(!Number.isFinite(e))throw Error('Nonfinite release');}
  if(violations||previous>1e-20)throw Error('Passive release failed');rates.push({version,rate,body,couple,peak,unforcedEnergyIncreases:violations,finalEnergy:previous});
 }
 const rate=48000,seconds=60,voices=Array.from({length:8},()=>make(api,.42,.55,rate)),before=voices.map(typedBytes),blocks=[];let peak=0,energy=0;
 // Warm JIT before measuring; reset voices so the histories match exactly.
 const warm=make(api);for(let i=0;i<24000;i++){warm.inputL[0]=.1*Math.sin(i*.03);warm.process(i,71);}
 for(let at=0;at<rate*seconds;at+=128){const start=performance.now();for(let j=0;j<128;j++){const i=at+j,t=i/rate;for(let k=0;k<voices.length;k++){const m=voices[k];m.inputL[0]=.3*Math.sin(t*2*Math.PI*(110+k*7));m.inputR[0]=m.inputL[0]*.7;m.inputL[1]=i%601===0?1:0;m.inputL[2]=Math.sin(t*.11)*.2;m.inputL[3]=Math.sin(t*.2)*.6;m.targets[0]=.5+.5*Math.sin(t*.07);m.smooth();m.process(i,71);const x=m.outputL[0],y=m.outputR[0];if(!Number.isFinite(x)||!Number.isFinite(y)||Math.max(Math.abs(x),Math.abs(y))>8)throw Error('Stress failure');peak=Math.max(peak,Math.abs(x),Math.abs(y));energy=Math.max(energy,m.energies.reduce((a,b)=>a+b,0));}}blocks.push(performance.now()-start);}
 if(JSON.stringify(before)!==JSON.stringify(voices.map(typedBytes)))throw Error('Buffer growth');blocks.sort((a,b)=>a-b);rows.push({version,rate,seconds,voices:8,blockFrames:128,deadlineMs:128/rate*1000,meanBlockMs:blocks.reduce((a,b)=>a+b,0)/blocks.length,p95BlockMs:blocks[Math.floor(blocks.length*.95)],p99BlockMs:blocks[Math.floor(blocks.length*.99)],maxBlockMs:blocks.at(-1),peak,maxEnergy:energy,typedBytesPerVoice:before[0],bufferGrowth:0});console.log(rows.at(-1));
}
writeFileSync('docs/sympathy-phase31/performance.json',JSON.stringify({host:{node:process.version,cpu:os.cpus()[0]?.model},limitations:'Sequential offline before/after timing includes input synthesis and observation. Shared server scheduling and GC affect maxima; no physical iPhone or AudioWorklet realtime guarantee. Typed arrays only, not JS heap/browser memory.',rows,rates},null,2)+'\n');
