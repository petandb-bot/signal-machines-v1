// Reproducible Phase3 / Phase3.1 evidence; no subjective listening claims.
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {studyApi,previous,current,make,typedBytes} from './lib/sympathy-study.mjs';
const before=await studyApi(previous),after=await studyApi(),rate=24000,n=rate*8;
const output='public/listening/audio/sympathy-phase31/';mkdirSync(output,{recursive:true});
const files=[],rows=[],ablations=[],demos=[],sources=new Map();
function wav(name,l,r,gain=1){
 // IEEE float WAV retains quiet raw responses that PCM16 would quantize to zero.
 const b=Buffer.alloc(44+l.length*8);b.write('RIFF');b.writeUInt32LE(b.length-8,4);b.write('WAVEfmt ',8);b.writeUInt32LE(16,16);b.writeUInt16LE(3,20);b.writeUInt16LE(2,22);b.writeUInt32LE(rate,24);b.writeUInt32LE(rate*8,28);b.writeUInt16LE(8,32);b.writeUInt16LE(32,34);b.write('data',36);b.writeUInt32LE(l.length*8,40);
 for(let i=0;i<l.length;i++){if(!Number.isFinite(l[i])||!Number.isFinite(r[i])||Math.max(Math.abs(l[i]),Math.abs(r[i]))*gain>1.00001)throw Error('Bad WAV');b.writeFloatLE(l[i]*gain,44+i*8);b.writeFloatLE(r[i]*gain,48+i*8);}writeFileSync(output+name,b);files.push({name,gain,seconds:l.length/rate});
}
function metrics(l,r){let power=0,ll=0,rr=0,lr=0,dcL=0,dcR=0,peak=0,step=0;for(let i=0;i<l.length;i++){const x=l[i],y=r[i];if(!Number.isFinite(x)||!Number.isFinite(y))throw Error('Nonfinite');power+=(x*x+y*y)*.5;ll+=x*x;rr+=y*y;lr+=x*y;dcL+=x;dcR+=y;peak=Math.max(peak,Math.abs(x),Math.abs(y));if(i)step=Math.max(step,Math.abs(x-l[i-1]),Math.abs(y-r[i-1]));}return{rms:Math.sqrt(power/l.length),peak,dc:[dcL/l.length,dcR/l.length],correlation:ll&&rr?lr/Math.sqrt(ll*rr):null,maxStep:step};}
function window(l,r,start,end){let power=0,peak=0;const lo=Math.min(l.length,Math.max(0,Math.round(start*rate))),hi=Math.min(l.length,Math.round(end*rate));for(let i=lo;i<hi;i++){power+=(l[i]**2+r[i]**2)*.5;peak=Math.max(peak,Math.abs(l[i]),Math.abs(r[i]));}return{rms:hi>lo?Math.sqrt(power/(hi-lo)):0,peak};}
function savePair(prefix,result){const m=metrics(result.l,result.r),gain=Math.min(m.rms?.025/m.rms:1,m.peak?.8/m.peak:1);wav(prefix+'-raw.wav',result.l,result.r);wav(prefix+'-matched.wav',result.l,result.r,gain);return{...m,matchedGain:gain,matchedRms:m.rms*gain};}
for(const label of ['pulse','chip','metal','sine','noise','cuts','quiet']){
 const l=new Float32Array(n),r=new Float32Array(n),events=[];let seed=713,low=0,slow=0;
 const src=label==='chip'?new after.Chip(after.createModule('CHIP',0,0,71),rate,31):label==='metal'?new after.Alloy(after.createModule('ALLOY',0,0,71),rate,31):['cuts','quiet'].includes(label)?new after.Cuts(after.createModule('CUTS',0,0,71),rate,31):undefined;
 if(label==='chip'){src.parameters[0]=src.targets[0]=.25;src.inputConnected[1]=1;}if(label==='cuts'||label==='quiet')src.attach(after.builtinFound('machine'));
 for(let i=0;i<n;i++){const t=i/rate;let x=0,y=0;
  if(label==='pulse')x=y=i<rate*.002?.4:0;
  else if(label==='sine')x=y=t<2?.1*Math.sin(t*2*Math.PI*110)*Math.max(0,Math.min(1,t/.01,(2-t)/.01)):0;
  else if(label==='noise'){seed=(Math.imul(seed,1664525)+1013904223)>>>0;low+=(seed/2147483648-1-low)*(1-Math.exp(-2*Math.PI*1500/rate));slow+=(low-slow)*(1-Math.exp(-2*Math.PI*80/rate));x=y=t<2?(low-slow)*.12:0;}
  else{if(label==='metal')src.inputL[0]=i===0?1:0;if(label==='chip')src.inputL[1]=i===0||i===rate*2||i===rate*4?1:0;src.smooth();src.process(i,71);x=src.outputL[0];y=src.outputR[0];if(label==='quiet'){x*=.001;y*=.001;}if((label==='cuts'||label==='quiet')&&src.outputL[1]>.5)events.push(t);}
  if((['pulse','metal','sine','noise'].includes(label)&&i===0)||(label==='chip'&&(i===0||i===rate*2||i===rate*4)))events.push(t);
  l[i]=x;r[i]=y;
 }
 let stop=0;for(let i=0;i<n;i++)if(l[i]||r[i])stop=i/rate;
 const input={l,r,events,stop,metrics:metrics(l,r)};sources.set(label,input);wav('input-'+label+'.wav',l,r);
}
function render(api,input,body,couple,observe=false){
 const m=make(api,body,couple,rate),size=typedBytes(m),l=new Float32Array(n),r=new Float32Array(n),timeline=[],maxEnergy=[0,0,0];
 for(let i=0;i<n;i++){m.inputL[0]=input.l[i];m.inputR[0]=input.r[i];m.smooth();m.process(i,71);l[i]=m.outputL[0];r[i]=m.outputR[0];for(let b=0;b<3;b++)maxEnergy[b]=Math.max(maxEnergy[b],m.energies[b]);if(observe&&i%240===0)timeline.push({t:i/rate,energy:Array.from(m.energies)});}
 if(typedBytes(m)!==size)throw Error('Buffer growth');
 return{l,r,energyMax:maxEnergy,timeline,typedBytes:size};
}
for(const [label,input] of sources)for(const body of [0,.42,1])for(const couple of [0,.55,1])for(const [version,api] of [['before',before],['after',after]]){
 const result=render(api,input,body,couple,body===.42&&couple===.55),m=savePair(`${label}-b${body}-c${couple}-${version}`,result);
 rows.push({input:label,body,couple,version,...m,inputRms:input.metrics.rms,outputInputRmsRatio:input.metrics.rms?m.rms/input.metrics.rms:null,inputStop:input.stop,events:input.events.map(t=>({t,inputFirst50ms:window(input.l,input.r,t,t+.05),first50ms:window(result.l,result.r,t,t+.05),ms100to300:window(result.l,result.r,t+.1,t+.3),first300ms:window(result.l,result.r,t,t+.3)})),release:[0,.05,.1,.3,.6,1,2,4].map(t=>({secondsAfterInput:t,...window(result.l,result.r,input.stop+t,input.stop+t+.05)})),energyMax:result.energyMax,timeline:result.timeline,typedBytes:result.typedBytes});
}
// Causal ablations: isolate input mechanics from pickup redistribution.
const oldWeights='this.p[offset]*.86+this.p[offset+1]*(channel?.25:.43)+this.p[offset+2]*(channel?.43:.25)',newWeights='this.p[offset]*.78+this.p[offset+1]*(channel?.40:.48)+this.p[offset+2]*(channel?.48:.40)';
if(!current.includes(newWeights)||!previous.includes(oldWeights))throw Error('Pickup ablation source changed');
for(const [variant,source] of [['excitation-only',current.replace(newWeights,oldWeights)],['pickup-only',previous.replace(oldWeights,newWeights)]]){const api=await studyApi(source);for(const [input,signal] of sources){const r=render(api,signal,.42,.55);ablations.push({variant,input,...metrics(r.l,r.r),energyMax:r.energyMax,first50ms:window(r.l,r.r,signal.events[0],signal.events[0]+.05)});}}
for(const slug of ['small-resonance','exchanging-bodies','living-material'])for(const [version,api] of [['before',before],['after',after]]){
 const patch=api.parsePatch(readFileSync('presets/'+slug+'.json','utf8')),g=new api.DSPGraph(rate);if(patch.modules.some(m=>m.type==='CUTS'))g.setFoundAssets([api.builtinFound('machine')]);g.setPatch(patch);const l=new Float32Array(rate*16),r=new Float32Array(l.length),timeline=[];let sym;
 for(let i=0;i<l.length;i+=128){g.process(l.subarray(i,i+128),r.subarray(i,i+128));sym=[...g.modules.values()].find(m=>m instanceof api.Sympathy);if(i%3072===0&&sym)timeline.push({t:i/rate,energy:Array.from(sym.energies)});}if(g.faults)throw Error('Demo faults');demos.push({slug,version,...savePair(`${slug}-${version}`,{l,r}),timeline});
}
const report={rate,seconds:8,format:'IEEE float32 stereo WAV; no dither',baseline:'PR15 dbde9d89; fixture byte-identical',matching:'One constant gain per file targets .025 RMS, capped at .8 peak. No gain cap: quiet raw files remain float32; gain is recorded. Level matching is a listening aid, not processing in the instrument.',limitations:'No human audition or physical iPhone Safari. Event windows can overlap; measured source events are used, including actual CUTS EVENT output. Energy coordinates are normalized, not joules. Synthetic room/machine samples. No perceptual conclusion from RMS alone.',sources:[...sources].map(([name,s])=>({name,...s.metrics,events:s.events,stop:s.stop})),files,rows,ablations,demos};
writeFileSync(output+'report.json',JSON.stringify(report));writeFileSync('docs/sympathy-phase31/comparison.json',JSON.stringify({...report,files:undefined,rows:rows.map(({timeline,...r})=>r)},null,2)+'\n');
console.log(`Rendered ${files.length} WAVs; ${rows.length} source/settings/version comparisons.`);
for(const row of rows.filter(r=>r.body===.42&&r.couple===.55))console.log(row.input,row.version,'rms',row.rms,'50ms',row.events[0]?.first50ms.rms,'peak',row.peak);
