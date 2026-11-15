import {mkdirSync,writeFileSync} from 'node:fs';import {api,metrics,wav,typedBytes} from './lib/phase4-audio.mjs';
const a=await api(),rate=24000,n=rate*16,dir='public/listening/audio/phase4/';mkdirSync(dir,{recursive:true});
const cases=[{id:'chamber-room',type:'CHAMBER',mode:'ROOM',params:{size:.5,density:.5}},{id:'chamber-weave',type:'CHAMBER',mode:'WEAVE',params:{size:.5,density:.5}},...[[0,.5,'plate-low'],[.5,.5,'plate-default'],[1,.5,'plate-high'],[.5,1,'plate-long']].map(([body,decay,id])=>({id,type:'PLATE',params:{body,decay}}))],sources=new Map(),rows=[],files=[],impulses=[];
function save(name,l,r,gain=1){wav(dir+name,l,r,rate,gain);files.push({name,gain,seconds:l.length/rate});}
for(const kind of ['electronic','metal','noise','chip','cuts','sustained']){
 const l=new Float32Array(n),r=new Float32Array(n);let seed=713,low=0,slow=0;
 const source=kind==='metal'?new a.Alloy(a.createModule('ALLOY',0,0,71),rate,31):kind==='chip'?new a.Chip(a.createModule('CHIP',0,0,71),rate,31):kind==='cuts'?new a.Cuts(a.createModule('CUTS',0,0,71),rate,31):undefined;
 if(kind==='chip'){source.inputConnected[1]=1;source.parameters[0]=source.targets[0]=.38;source.parameters[1]=source.targets[1]=.26;}if(kind==='cuts')source.attach(a.builtinFound('machine'));
 for(let i=0;i<rate*2;i++){const t=i/rate;let x=0,y=0;if(kind==='electronic')x=y=t<.08?.15*Math.sin(2*Math.PI*330*t)*Math.sin(Math.PI*t/.08)**2:0;
 else if(kind==='noise'){seed=(Math.imul(seed,1664525)+1013904223)>>>0;low+=(seed/2147483648-1-low)*.45;slow+=(low-slow)*.015;x=y=t<.15?(low-slow)*.15*Math.sin(Math.PI*t/.15)**2:0;}
 else if(kind==='sustained')x=y=.1*(Math.sin(2*Math.PI*110*t)+.3*Math.sin(2*Math.PI*331*t))*Math.min(1,t/.01,(2-t)/.01);
 else{if(kind==='metal')source.inputL[0]=i===0?1:0;if(kind==='chip')source.inputL[1]=i===0?1:0;source.smooth();source.process(i,71);x=source.outputL[0];y=source.outputR[0];}l[i]=x;r[i]=y;
 }sources.set(kind,{l,r});save('input-'+kind+'.wav',l,r);
}
function make(c){const state=a.createModule(c.type,0,0,71);state.params=c.params;state.mode=c.mode;return c.type==='PLATE'?new a.Plate(state,rate,31):new a.Chamber(state,rate,31);}
for(const c of cases){
 const m=make(c),length=rate*24,l=new Float32Array(length),r=new Float32Array(length),dry=c.type==='PLATE'?.72:1-(.26+c.params.density*.48)*.45;
 for(let i=0;i<length;i++){const x=i===0?.4:0;m.inputL[0]=m.inputR[0]=x;m.process();l[i]=m.outputL[0]-dry*x;r[i]=m.outputR[0]-dry*x;}save('ir-'+c.id+'-wet.wav',l,r);impulses.push({id:c.id,wetOnly:true,...metrics(l,r),typedBytes:typedBytes(m)});
 for(const [source,input]of sources){const m=make(c),l=new Float32Array(n),r=new Float32Array(n),size=typedBytes(m);for(let i=0;i<n;i++){m.inputL[0]=input.l[i];m.inputR[0]=input.r[i];m.process();l[i]=m.outputL[0];r[i]=m.outputR[0];}if(typedBytes(m)!==size)throw Error('Buffer growth');const metric=metrics(l,r),gain=Math.min(metric.rms?.035/metric.rms:1,metric.peak?.8/metric.peak:1);save(`${source}-${c.id}-raw.wav`,l,r);save(`${source}-${c.id}-matched.wav`,l,r,gain);rows.push({source,case:c.id,...metric,matchedGain:gain,matchedRms:metric.rms*gain,typedBytes:size});}
}
const report={rate,seconds:16,cases,files,impulses,rows,limitations:'No human listening or physical iPhone. PCM24 WAV, no dither. Matching uses one constant gain toward .035 RMS, capped at .8 peak. IR files subtract the known dry coefficient, retaining the complete wet response. Chamber settings .5/.5 in ROOM/WEAVE; PLATE .5/.5 default. No uniform delay-time or RT60 matching: topology/density and measured decay are compared explicitly.'};writeFileSync(dir+'plate-report.json',JSON.stringify(report));writeFileSync('docs/phase4/plate-comparison.json',JSON.stringify(report,null,2)+'\n');console.log('Rendered '+files.length+' plate/source/comparison WAVs.');
