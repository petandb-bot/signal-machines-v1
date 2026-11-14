// Actual offline DSP output. No copyrighted recordings or private user samples.
import {build} from 'esbuild';
import {readFileSync,writeFileSync,mkdirSync,existsSync,readdirSync} from 'node:fs';
import {join} from 'node:path';import {fileURLToPath} from 'node:url';import {createHash} from 'node:crypto';
const root=fileURLToPath(new URL('../',import.meta.url)),out=join(root,'public/listening/audio'),hash=createHash('sha256');
function scan(dir){for(const e of readdirSync(dir,{withFileTypes:true}).sort((a,b)=>a.name.localeCompare(b.name))){const p=join(dir,e.name);if(e.isDirectory())scan(p);else if(e.name.endsWith('.ts'))hash.update(p.slice(root.length)).update(readFileSync(p));}}
for(const dir of ['src/audio','src/graph','src/state','src/samples','src/visual'])scan(join(root,dir));hash.update(readFileSync(fileURLToPath(import.meta.url)));const source=hash.digest('hex'),meta=join(out,'four-machines.json');
if(existsSync(meta)){const m=JSON.parse(readFileSync(meta));if(m.source===source&&m.files.every(f=>existsSync(join(out,f.name)))){console.log('Four-machine WAVs are current.');process.exit(0);}}
const classes=['Mirage','Loss','Tape','Chamber','Crush','FaultLine','Cuts','Found','Fracture','Nerve','Chance','Unspent'];
const contents=classes.map(c=>`export {${c}} from './src/audio/modules/${c}';`).join('\n')+`export {createModule} from './src/graph/PatchGraph';export {encodeWav} from './src/audio/Wav';export {analyzeFound,builtinFound} from './src/samples/FoundData';export {DSPGraph} from './src/audio/DSPGraph';export {PRESETS} from './src/state/presets';`;
const result=await build({stdin:{contents,loader:'ts',resolveDir:root},bundle:true,write:false,format:'esm',platform:'node'}),api=await import('data:text/javascript;base64,'+Buffer.from(result.outputFiles[0].text).toString('base64'));
const rate=24000,n=rate*8,files=[],left=new Float32Array(n),right=new Float32Array(n);let rng=531,low=0;
for(let i=0;i<n;i++){const t=i/rate;rng=(Math.imul(rng,1664525)+1013904223)>>>0;const noise=rng/2147483648-1;low+=(noise-low)*.01;let x=0;
 if(t<1.2)x=.2*Math.exp(-t*17)*(Math.sin(t*2*Math.PI*731)+.4*Math.sin(t*2*Math.PI*1777));
 else if(t<2.8)x=.055*(Math.sin(t*2*Math.PI*173)+.4*Math.sin(t*2*Math.PI*519)+.2*Math.sin(t*2*Math.PI*1211))*Math.min(1,(t-1.2)*30,(2.8-t)*30);
 else if(t<4.2)x=noise*.11*Math.exp(-((t-2.8)%.27)*42);
 else if(t<5.8)x=low*.025+.003*Math.sin(t*2*Math.PI*59);
 left[i]=x;right[i]=x*.72+(t>=4.2&&t<5.8?low*.006:0);
}
async function save(name,l,r,info={}){let peak=0,energy=0,maxStep=0,silent=0;for(let i=0;i<l.length;i++){for(const x of [l[i],r[i]]){if(!Number.isFinite(x)||Math.abs(x)>8)throw Error('Invalid output '+name);peak=Math.max(peak,Math.abs(x));energy+=x*x;}if(i)maxStep=Math.max(maxStep,Math.abs(l[i]-l[i-1]),Math.abs(r[i]-r[i-1]));if(Math.max(Math.abs(l[i]),Math.abs(r[i]))<1e-6)silent++;}
 const rms=Math.sqrt(energy/(l.length*2)),gain=info.type==='demo'?Math.min(1,peak>.9?.9/peak:1):Math.min(4,peak>.9?.9/peak:Infinity,rms>1e-9?.025/rms:1);const a=l.slice(),b=r.slice();for(let i=0;i<a.length;i++){const fade=Math.min(1,i/(rate*.005),(a.length-1-i)/(rate*.01));a[i]*=gain*fade;b[i]*=gain*fade;}
 writeFileSync(join(out,name),Buffer.from(await api.encodeWav({kind:'loopAudio',sampleRate:rate,left:a,right:b}).arrayBuffer()));files.push({name,seconds:l.length/rate,peak,rms:Math.sqrt(energy/(l.length*2)),maxStep,silentFraction:silent/l.length,gain,...info});
}
mkdirSync(out,{recursive:true});await save('four-dry.wav',left,right,{input:'metal 0–1.2s; harmonic 1.2–2.8s; irregular noise 2.8–4.2s; quiet room 4.2–5.8s; silence 5.8–8s'});
for(const [type,Class] of [['MIRAGE','Mirage'],['LOSS','Loss'],['TAPE','Tape'],['CHAMBER','Chamber'],['CRUSH','Crush'],['FAULT LINE','FaultLine']]){
 const variants=['MIRAGE','LOSS'].includes(type)?['default','low','high','motion']:['comparison'];
 for(const variant of variants){const state=api.createModule(type,0,0,71);if(variant==='low'||variant==='high')for(const key of Object.keys(state.params))state.params[key]=variant==='low'?.12:.88;
 const m=new api[Class](state,rate,31),l=new Float32Array(n),r=new Float32Array(n);const start=performance.now();
 for(let i=0;i<n;i++){m.inputL[0]=left[i];m.inputR[0]=right[i];if(variant==='motion'){m.inputL[1]=Math.sin(i/rate*.91)*.8;m.inputL[2]=Math.cos(i/rate*.63)*.8;}m.smooth();m.process(i,83);l[i]=m.outputL[0];r[i]=m.outputR[0];}
 await save(type.toLowerCase().replaceAll(' ','-')+'-'+variant+'.wav',l,r,{type,variant,macros:state.params,cpuMs:performance.now()-start});
 }
}
// The identical composite recording is analysed separately for CUTS and FOUND.
const sample=api.analyzeFound('local:comparison','Five input families',left.slice(),right.slice());
for(const [type,Class] of [['CUTS','Cuts'],['FOUND','Found'],['FRACTURE','Fracture'],['NERVE','Nerve'],['CHANCE','Chance'],['UNSPENT','Unspent']]){
 const variants=['CUTS','NERVE'].includes(type)?['default','low','high','motion']:['comparison'];
 for(const variant of variants){const state=api.createModule(type,0,0,71);if(variant==='low'||variant==='high')for(const key of Object.keys(state.params))state.params[key]=variant==='low'?.12:.88;
 const m=new api[Class](state,rate,31);if(type==='CUTS'||type==='FOUND')m.attach(sample);
 const l=new Float32Array(n),r=new Float32Array(n),events=[],start=performance.now();let env=0,ring=0,phase=0;
 for(let i=0;i<n;i++){
  env+=(Math.abs(left[i])-env)*.008;
  const gate=i%Math.round(rate*.137)===0&&i<rate*5.8?1:0;
  if(type==='NERVE'){m.inputL[0]=env*18;m.inputL[1]=gate;if(variant==='motion'){m.targets[0]=.5+.45*Math.sin(i/rate*.8);m.targets[1]=.5+.4*Math.cos(i/rate*.6);}}
  else if(type==='CHANCE'||type==='UNSPENT')m.inputL[0]=gate;
  else if(type==='FRACTURE'){m.inputL[0]=left[i];m.inputR[0]=right[i];}
  else if(type==='CUTS'&&variant==='motion'){m.targets[0]=.5+.45*Math.sin(i/rate*.8);m.targets[1]=.5+.45*Math.cos(i/rate*.6);}
  m.smooth();m.process(i,83);
  const event=type==='CUTS'?m.outputL[1]:['NERVE','CHANCE','UNSPENT'].includes(type)?m.outputL[0]:m.triggerSample===i?1:0;
  if(event)events.push(i/rate);
  if(['NERVE','CHANCE','UNSPENT'].includes(type)){if(event)ring=1;ring*=Math.exp(-1/(rate*.045));phase+=Math.PI*2*731/rate;l[i]=r[i]=Math.sin(phase)*ring*.13;}
  else{l[i]=m.outputL[0];r[i]=m.outputR[0];}
 }
 const intervals=events.slice(1).map((t,i)=>t-events[i]);
 await save(type.toLowerCase()+'-'+variant+'.wav',l,r,{type,variant,macros:state.params,cpuMs:performance.now()-start,events,intervals,adapter:['NERVE','CHANCE','UNSPENT'].includes(type)?'Identical 137 ms TRIG; NERVE also gets rectified 10 ms-ish input energy. Triggers sonified with identical 731 Hz / 45 ms decays. See event times for raw behavior.':undefined});
 }
}
for(const [slug,name] of [['mirage-afterimages','MIRAGE / AFTERIMAGES'],['loss-uncertain','LOSS / UNCERTAIN'],['cuts-small-hours','CUTS / SMALL HOURS'],['nerve-recovery','NERVE / RECOVERY'],['uncertain-ecosystem','UNCERTAIN ECOSYSTEM']]){
 const p=api.PRESETS.find(p=>p.name===name).create(),g=new api.DSPGraph(rate),refs=[...new Set(p.modules.filter(m=>m.type==='FOUND'||m.type==='CUTS').map(m=>m.sample??'builtin:room'))];
 if(refs.length)g.setFoundAssets(refs.map(ref=>api.builtinFound(ref.slice(8))));g.setPatch(p);const l=new Float32Array(rate*12),r=new Float32Array(l.length),start=performance.now();
 for(let i=0;i<l.length;i+=128)g.process(l.subarray(i,i+128),r.subarray(i,i+128));if(g.faults)throw Error('Demo graph fault');await save(slug+'.wav',l,r,{type:'demo',name,cpuMs:performance.now()-start});
}
writeFileSync(meta,JSON.stringify({source,sampleRate:rate,listening:'Not human-auditioned. Compare at matched listening level; numbers do not establish musical quality.',normalization:'Comparison files use one constant gain toward 0.025 RMS, capped at 4x and 0.9 peak. Pre-gain metrics and gain are retained. No dynamic compression. Demos use unit gain.',files},null,2)+'\n');console.log('Rendered '+files.length+' four-machine comparison WAVs.');
