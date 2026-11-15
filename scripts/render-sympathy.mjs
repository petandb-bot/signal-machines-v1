// Independent source renders and actual coupled-body telemetry, never human audition.
import {build} from 'esbuild';import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';import os from 'node:os';
const names=['Sympathy','Reson','Chamber','Chip','Alloy','Cuts'],b=await build({stdin:{contents:names.map(n=>`export {${n}} from './src/audio/modules/${n}';`).join('')+`export {createModule} from './src/graph/PatchGraph';export {builtinFound} from './src/samples/FoundData';export {DSPGraph} from './src/audio/DSPGraph';export {parsePatch} from './src/state/PatchStorage';export {encodeWav} from './src/audio/Wav';`,loader:'ts',resolveDir:process.cwd()},bundle:true,write:false,format:'esm',platform:'node'}),a=await import('data:text/javascript;base64,'+Buffer.from(b.outputFiles[0].text).toString('base64'));
const rate=24000,seconds=8,n=rate*seconds,out='public/listening/audio/sympathy/';mkdirSync(out,{recursive:true});const files=[],measurements=[],exchanges=[],sources=new Map();
function bytes(obj,seen=new Set(),buffers=new Set()){if(!obj||typeof obj!=='object'||seen.has(obj))return buffers;seen.add(obj);if(ArrayBuffer.isView(obj)){buffers.add(obj.buffer);return buffers;}if(obj instanceof Map)for(const v of obj.values())bytes(v,seen,buffers);else for(const v of Object.values(obj))bytes(v,seen,buffers);return buffers;}
async function save(name,l,r,gain=1){const left=l.slice(),right=r.slice();for(let i=0;i<l.length;i++){if(!Number.isFinite(l[i])||!Number.isFinite(r[i])||Math.max(Math.abs(l[i]),Math.abs(r[i]))*gain>1.00001)throw Error('bad WAV');left[i]*=gain;right[i]*=gain;}writeFileSync(out+name,Buffer.from(await a.encodeWav({kind:'loopAudio',sampleRate:rate,left,right}).arrayBuffer()));files.push({name,seconds:l.length/rate,gain});}
for(const label of ['pulse','chip','metal','sine','noise','cuts']){
 const l=new Float32Array(n),r=new Float32Array(n);let seed=713,low=0,slow=0;
 const src=label==='chip'?new a.Chip(a.createModule('CHIP',0,0,71),rate,31):label==='metal'?new a.Alloy(a.createModule('ALLOY',0,0,71),rate,31):label==='cuts'?new a.Cuts(a.createModule('CUTS',0,0,71),rate,31):undefined;
 if(label==='chip'){src.parameters[0]=src.targets[0]=.25;src.inputConnected[1]=1;}if(label==='cuts')src.attach(a.builtinFound('machine'));
 for(let i=0;i<n;i++){const t=i/rate;let x=0,y=0;
  if(label==='pulse')x=y=i<rate*.002?.4:0;
  else if(label==='sine')x=y=t<2?.1*Math.sin(t*2*Math.PI*110)*Math.max(0,Math.min(1,t/.01,(2-t)/.01)):0;
  else if(label==='noise'){seed=(Math.imul(seed,1664525)+1013904223)>>>0;low+=(seed/2147483648-1-low)*(1-Math.exp(-2*Math.PI*1500/rate));slow+=(low-slow)*(1-Math.exp(-2*Math.PI*80/rate));x=y=t<2?(low-slow)*.12:0;}
  else{if(label==='metal')src.inputL[0]=i===0?1:0;if(label==='chip')src.inputL[1]=i===0||i===rate*2||i===rate*4?1:0;src.smooth();src.process(i,71);x=src.outputL[0];y=src.outputR[0];}
  l[i]=x;r[i]=y;
 }sources.set(label,{l,r});await save('input-'+label+'.wav',l,r);
}
function render(m,input,trig=false,observe=false){const l=new Float32Array(n),r=new Float32Array(n),timeline=[];let peak=0,power=0,ll=0,rr=0,lr=0,last=0,maxStep=0,tail=0;const before=[...bytes(m)].reduce((s,b)=>s+b.byteLength,0),start=performance.now();
 for(let i=0;i<n;i++){m.inputL[0]=input.l[i];m.inputR[0]=input.r[i];if(m instanceof a.Sympathy)m.inputL[1]=trig&&i===0?1:0;m.smooth();m.process(i,71);const x=m.outputL[0],y=m.outputR[0];if(!Number.isFinite(x)||!Number.isFinite(y))throw Error('nonfinite');l[i]=x;r[i]=y;peak=Math.max(peak,Math.abs(x),Math.abs(y));power+=(x*x+y*y)*.5;ll+=x*x;rr+=y*y;lr+=x*y;maxStep=Math.max(maxStep,Math.abs(x-last));last=x;if(i>rate*7)tail+=x*x;
  if(observe&&m instanceof a.Sympathy&&(i<rate*.25?i%48===0:i%480===0))timeline.push({seconds:i/rate,energy:Array.from(m.energies),flow:Array.from(m.flow)});
 }
 const after=[...bytes(m)].reduce((s,b)=>s+b.byteLength,0);if(before!==after)throw Error('growing buffers');return{l,r,metrics:{peak,rms:Math.sqrt(power/n),maxStep,stereoCorrelation:ll&&rr?lr/Math.sqrt(ll*rr):null,lastSecondEnergy:tail,cpuMs:performance.now()-start,typedBytes:before,bufferGrowth:after-before,timeline}};
}
for(const [label,input] of sources){
 for(const body of [0,.42,1])for(const couple of [0,.55,1]){const state=a.createModule('SYMPATHY',0,0,71);state.params={body,couple};const m=new a.Sympathy(state,rate,31),r=render(m,input,false,label==='pulse'&&body===.42),name=`${label}-body${body}-couple${couple}`;const gain=Math.min(64,r.metrics.peak? .8/r.metrics.peak:1,r.metrics.rms?.025/r.metrics.rms:1);await save(name+'-raw.wav',r.l,r.r);await save(name+'-matched.wav',r.l,r.r,gain);measurements.push({input:label,body,couple,gain,frequencies:Array.from(m.frequencies),...r.metrics});}
 for(const type of ['RESON','CHAMBER']){const m=type==='RESON'?new a.Reson(a.createModule(type,0,0,71),rate,31):new a.Chamber(a.createModule(type,0,0,71),rate,31);
 // RESON's audio excitation is input2; preserve identical external stereo material.
 const source=type==='RESON'?{l:new Float32Array(n),r:new Float32Array(n)}:input;
 let r;if(type==='RESON'){const process=m.process.bind(m);let at=0;m.process=(sample,bpm)=>{m.inputL[2]=input.l[at];m.inputR[2]=input.r[at++];process(sample,bpm);};r=render(m,source);}else r=render(m,source);
 const gain=Math.min(64,r.metrics.peak?.8/r.metrics.peak:1,r.metrics.rms?.025/r.metrics.rms:1);await save(`${label}-${type.toLowerCase()}-matched.wav`,r.l,r.r,gain);measurements.push({input:label,comparison:type,gain,...r.metrics});}
}
for(const couple of [0,.55,1]){const state=a.createModule('SYMPATHY',0,0,71);state.params={body:.1,couple};const r=render(new a.Sympathy(state,rate,31),{l:new Float32Array(n),r:new Float32Array(n)},true,true);await save(`strike-couple${couple}.wav`,r.l,r.r,2);exchanges.push({couple,...r.metrics});}
for(const slug of ['small-resonance','exchanging-bodies','living-material']){const patch=a.parsePatch(readFileSync('presets/'+slug+'.json','utf8')),g=new a.DSPGraph(rate);if(patch.modules.some(m=>m.type==='CUTS'))g.setFoundAssets([a.builtinFound('machine')]);g.setPatch(patch);const l=new Float32Array(rate*16),r=new Float32Array(l.length);for(let i=0;i<l.length;i+=128)g.process(l.subarray(i,i+128),r.subarray(i,i+128));if(g.faults)throw Error('demo faults');await save(slug+'.wav',l,r);}
writeFileSync(out+'report.json',JSON.stringify({sampleRate:rate,seconds,host:{node:process.version,cpu:os.cpus()[0]?.model},limitations:'No human listening or physical iPhone assessment. One constant matched gain targets .025 RMS, capped at64x/.8 peak; raw outputs and actual gains are retained. CPU includes observation/analysis and is not a device real-time benchmark. Body energies use normalized coordinates, not physical joules. Resonance peaks require the accompanying FFT analysis; listed frequencies are uncoupled coefficients.',files,measurements,exchanges},null,2)+'\n');console.log('Rendered '+files.length+' SYMPATHY comparison/demo WAVs.');
