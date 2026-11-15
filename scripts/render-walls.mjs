import {mkdirSync,writeFileSync} from 'node:fs';import {api,metrics,wav,typedBytes} from './lib/phase5-audio.mjs';
const a=await api(),rate=24000,n=rate*14,root='public/listening/audio/phase5/';mkdirSync(root,{recursive:true});
const cases=[{id:'dry'}, {id:'orbit',type:'ORBIT',params:{rate:.28,depth:.65}},{id:'chamber-room',type:'CHAMBER',mode:'ROOM',params:{size:.5,density:.5}},{id:'chamber-weave',type:'CHAMBER',mode:'WEAVE',params:{size:.5,density:.5}},{id:'plate-default',type:'PLATE',params:{body:.5,decay:.5}},{id:'walls-static',type:'WALLS',params:{distance:.55,motion:0}},{id:'walls-moving',type:'WALLS',params:{distance:.55,motion:.8}}];
const classes={ORBIT:a.Orbit,CHAMBER:a.Chamber,PLATE:a.Plate,WALLS:a.Walls};const files=[],rows=[],irs=[],sources=new Map();
function save(name,l,r,gain=1){wav(root+name,l,r,rate,gain);files.push({name,gain,seconds:l.length/rate});}
for(const kind of ['chip','metal','pulse','cuts','drone','noise','stereo']){
 const l=new Float32Array(n),r=new Float32Array(n),events=[];let seed=713,low=0,slow=0;
 const state=a.createModule(kind==='chip'?'CHIP':kind==='metal'?'ALLOY':kind==='cuts'?'CUTS':'DRONE',0,0,71);if(kind==='chip')state.params={tune:.43,character:.3};if(kind==='drone'){state.params={spread:.18,color:.34};state.mode='110 Hz';}
 const source=kind==='chip'?new a.Chip(state,rate,31):kind==='metal'?new a.Alloy(state,rate,31):kind==='cuts'?new a.Cuts(state,rate,31):kind==='drone'?new a.DroneInstrument(state,rate,31):undefined;
 if(kind==='chip')source.inputConnected[1]=1;if(kind==='cuts')source.attach(a.builtinFound('machine'));
 for(let i=0;i<rate*10;i++){const t=i/rate,fire=i===0||i===rate*3||i===rate*6||i===rate*9;let x=0,y=0;
 if(kind==='pulse'){x=y=i%(rate*3)<rate*.002?.4:0;if(fire)events.push(t);}
 else if(kind==='noise'){seed=(Math.imul(seed,1664525)+1013904223)>>>0;low+=(seed/2147483648-1-low)*(1-Math.exp(-2*Math.PI*4000/rate));slow+=(low-slow)*(1-Math.exp(-2*Math.PI*120/rate));x=y=(low-slow)*.1;}
 else if(kind==='stereo'){x=.08*Math.sin(2*Math.PI*147*t)+.03*Math.sin(2*Math.PI*700*t);y=.07*Math.sin(2*Math.PI*196*t+.4)+.03*Math.sin(2*Math.PI*705*t);}
 else{if(kind==='chip')source.inputL[1]=fire?1:0;if(kind==='metal')source.inputL[0]=fire?1:0;source.smooth();source.process(i,71);x=source.outputL[0];y=source.outputR[0];if((kind==='chip'||kind==='metal')&&fire||kind==='cuts'&&source.outputL[1]>.5)events.push(t);}
 if(['drone','noise','stereo'].includes(kind)){const env=Math.max(0,Math.min(1,t/.01,(10-t)/.01));x*=env;y*=env;}l[i]=x;r[i]=y;
 }sources.set(kind,{l,r,events});save('spatial-input-'+kind+'.wav',l,r);
}
for(const c of cases)for(const [source,input]of sources){const state=c.type?a.createModule(c.type,0,0,71):undefined;if(state){state.params=c.params;state.mode=c.mode;}const m=c.type?new classes[c.type](state,rate,31):undefined,size=m?typedBytes(m):0,l=new Float32Array(n),r=new Float32Array(n),geometry=[];
 for(let i=0;i<n;i++){if(m){m.inputL[0]=input.l[i];m.inputR[0]=input.r[i];m.process(i,71);l[i]=m.outputL[0];r[i]=m.outputR[0];if(c.type==='WALLS'&&i%(rate*.25)===0)geometry.push({t:i/rate,times:Array.from(m.reflectionTimes)});}else{l[i]=input.l[i];r[i]=input.r[i];}}
 if(m&&typedBytes(m)!==size)throw Error('Buffer growth');const metric=metrics(l,r);let e=0,count=0;for(let at=0;at<n;at+=480){let energy=0;for(let j=at;j<Math.min(at+480,n);j++)energy+=(l[j]**2+r[j]**2)*.5;if(Math.sqrt(energy/480)>.0001){e+=energy;count+=480;}}
 const activeRms=count?Math.sqrt(e/count):0,gain=Math.min(activeRms?.03/activeRms:1,metric.peak?.8/metric.peak:1);save(`spatial-${source}-${c.id}-raw.wav`,l,r);save(`spatial-${source}-${c.id}-matched.wav`,l,r,gain);rows.push({source,case:c.id,...metric,activeRms,gain,geometry,typedBytes:size,events:input.events});
}
for(const distance of [0,.45,1]){const s=a.createModule('WALLS',0,0,71);s.params={distance,motion:0};const m=new a.Walls(s,rate,31),l=new Float32Array(rate),r=new Float32Array(rate);let last=0,first=null,directEnergy=0,wetEnergy=0;for(let i=0;i<rate;i++){m.inputL[0]=m.inputR[0]=i===0?.4:0;m.process();l[i]=m.outputL[0];r[i]=m.outputR[0];if(i===0)directEnergy=(l[i]**2+r[i]**2)*.5;else{wetEnergy+=(l[i]**2+r[i]**2)*.5;if(Math.max(Math.abs(l[i]),Math.abs(r[i]))>1e-12){first??=i/rate;last=i/rate;}}}
 save('walls-ir-distance'+distance+'.wav',l,r);irs.push({distance,firstReflection:first,lastNonzero:last,directEnergy,reflectedEnergy:wetEnergy,ratio:wetEnergy/directEnergy,geometry:Array.from(m.reflectionTimes),...metrics(l,r)});
}
const report={rate,cases,files,rows,irs,method:'Identical inputs across DRY/ORBIT/ROOM/WEAVE/PLATE/WALLS static/moving. PCM24 RAW and one constant active20ms RMS-matched gain toward .03, capped at .8 sample peak. Not LUFS or perceptual approval. FIR impulse extent measured before WAV quantization. Geometry is real weighted tap timing during crossfades; no claim of HRTF/binaural/physical room simulation. Human audition and iPhone hardware unverified.'};writeFileSync(root+'walls-report.json',JSON.stringify(report));writeFileSync('docs/phase5/walls-comparisons.json',JSON.stringify({...report,rows:rows.map(({geometry,...r})=>r)},null,2)+'\n');writeFileSync('docs/phase5/walls-geometry.json',JSON.stringify(rows.filter(r=>r.source==='pulse'&&r.geometry.length).map(r=>({case:r.case,geometry:r.geometry})),null,2)+'\n');console.log('Rendered '+files.length+' spatial comparison/source/IR WAVs.');
