// Reproducible CPU/memory and output-structure observations, not a listening verdict.
import {build} from 'esbuild';import {writeFileSync,mkdirSync} from 'node:fs';import assert from 'node:assert/strict';import os from 'node:os';
const code=`export {Mirage} from './src/audio/modules/Mirage';export {Loss} from './src/audio/modules/Loss';export {Cuts} from './src/audio/modules/Cuts';export {Nerve} from './src/audio/modules/Nerve';export {createModule} from './src/graph/PatchGraph';export {builtinFound} from './src/samples/FoundData';export {DSPGraph} from './src/audio/DSPGraph';export {uncertainEcosystem} from './src/state/presets';`;
const b=await build({stdin:{contents:code,loader:'ts',resolveDir:process.cwd()},bundle:true,write:false,format:'esm',platform:'node'}),a=await import('data:text/javascript;base64,'+Buffer.from(b.outputFiles[0].text).toString('base64'));
const rate=48000,results=[],asset=a.builtinFound('machine');
function buffers(obj,seen=new Set(),storage=new Set()){if(!obj||typeof obj!=='object'||seen.has(obj))return storage;seen.add(obj);if(ArrayBuffer.isView(obj)){storage.add(obj.buffer);return storage;}if(obj instanceof Map)for(const x of obj.values())buffers(x,seen,storage);else for(const x of Object.values(obj))buffers(x,seen,storage);return storage;}
function bytes(obj){return [...buffers(obj)].reduce((n,b)=>n+b.byteLength,0);}
for(const type of ['MIRAGE','LOSS','CUTS','NERVE']){
 const m=new a[type[0]+type.slice(1).toLowerCase()](a.createModule(type,0,0,711),rate,71);if(type==='CUTS')m.attach(asset);
 let peak=0,energy=0,step=0,last=0,events=0,minInterval=Infinity,lastEvent=-1,tailEnergy=0;const before=bytes(m),start=performance.now();
 for(let i=0;i<rate*60;i++){
  const t=i/rate,active=t<40;
  if(type==='NERVE'){m.inputL[0]=active?.7+.3*Math.sin(t*1.3):0;m.inputL[1]=active&&i%6576===0?1:0;}
  else if(type!=='CUTS'){m.inputL[0]=active?.08*(Math.sin(t*2*Math.PI*173)+.3*Math.sin(t*2*Math.PI*731)):0;m.inputR[0]=m.inputL[0]*.7;m.inputL[1]=Math.sin(t*.17)*.5;m.inputL[2]=Math.cos(t*.23)*.5;}
  m.smooth();m.process(i,83);const x=m.outputL[0],r=m.outputR[0];assert(Number.isFinite(x)&&Number.isFinite(r));assert(Math.abs(x)<8&&Math.abs(r)<8);peak=Math.max(peak,Math.abs(x),Math.abs(r));energy+=(x*x+r*r)*.5;step=Math.max(step,Math.abs(x-last));last=x;
  const event=type==='NERVE'?x:type==='CUTS'?m.outputL[1]:0;if(event){events++;if(lastEvent>=0)minInterval=Math.min(minInterval,(i-lastEvent)/rate);lastEvent=i;}
  if(i>rate*59)tailEnergy+=x*x;
 }
 const cpuMs=performance.now()-start,after=bytes(m);assert.equal(before,after,'Persistent buffers must not grow');if(type==='MIRAGE'||type==='LOSS')assert(tailEnergy<1e-8,'Residual energy did not decay');
 results.push({type,seconds:60,cpuMs,realtimePercent:cpuMs/600,persistentTypedBytes:before,unchangedBytes:before===after,peak,rms:Math.sqrt(energy/(rate*60)),maxStep:step,events,minInterval:Number.isFinite(minInterval)?minInterval:null,finalSecondEnergy:tailEnergy});
}
const g=new a.DSPGraph(rate);g.setFoundAssets([asset]);g.setPatch(a.uncertainEcosystem());const left=new Float32Array(128),right=new Float32Array(128),start=performance.now(),memory=bytes(g);for(let i=0;i<Math.ceil(rate*30/128);i++)g.process(left,right);assert.equal(g.faults,0);const cpuMs=performance.now()-start;
const report={environment:{node:process.version,cpu:os.cpus()[0]?.model,platform:process.platform,outputRate:rate},limitations:'Offline wall time, not iPhone performance or a real-time deadline guarantee. Typed-array accounting excludes JS object, browser, decoder and transport overhead. No human listening assessment.',results,combined:{seconds:30,cpuMs,realtimePercent:cpuMs/300,persistentTypedBytes:memory,faults:g.faults},sampleBudget:{maxInstruments:2,sharedPcmBytesPer60SecondStereoAsset:24000*60*2*4,note:'Same PCM object shared inside each realm. Main thread and worklet each retain their own copy; transfer/decode/replacement has transient overhead.'}};
mkdirSync('docs/v018',{recursive:true});writeFileSync('docs/v018/performance.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report,null,2));
