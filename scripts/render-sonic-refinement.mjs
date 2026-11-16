/**
 * Phase 7 audition material. No effects are added to saved patches.
 * A/B clips use identical seeds, event input and initial macro settings.
 * Artifacts are generated in CI, not committed to source control.
 */
import {build} from 'esbuild';
import {mkdirSync,writeFileSync} from 'node:fs';
import {join} from 'node:path';
import {fileURLToPath} from 'node:url';

const root=fileURLToPath(new URL('../',import.meta.url));
const bundle=await build({stdin:{contents:`export {Chip} from './src/audio/modules/Chip';export {RefinedChip} from './src/audio/modules/RefinedChip';export {Reson} from './src/audio/modules/Reson';export {RefinedReson} from './src/audio/modules/RefinedReson';export {Chamber} from './src/audio/modules/Chamber';export {RefinedChamber} from './src/audio/modules/RefinedChamber';export {Plate} from './src/audio/modules/Plate';export {RefinedPlate} from './src/audio/modules/RefinedPlate';export {createModule} from './src/graph/PatchGraph';export {encodeWav} from './src/audio/Wav';`,loader:'ts',resolveDir:root},bundle:true,platform:'node',format:'esm',write:false});
const {Chip,RefinedChip,Reson,RefinedReson,Chamber,RefinedChamber,Plate,RefinedPlate,createModule,encodeWav}=
  await import('data:text/javascript;base64,'+Buffer.from(bundle.outputFiles[0].text).toString('base64'));
const rate=48000,frames=rate*5,directory=join(root,'artifacts/sonic-refinement'),audio=join(directory,'audio');
mkdirSync(audio,{recursive:true});
const cases=[
  {id:'chip',type:'CHIP',Old:Chip,New:RefinedChip,classic:'PULSE',clean:'PULSE CLEAN',params:{tune:.85,character:.29}},
  {id:'reson',type:'RESON',Old:Reson,New:RefinedReson,classic:undefined,clean:'FOCUS',params:{material:.22,decay:.75}},
  {id:'chamber',type:'CHAMBER',Old:Chamber,New:RefinedChamber,classic:'ROOM',clean:'CLEAR ROOM',params:{size:.62,density:.63}},
  {id:'plate',type:'PLATE',Old:Plate,New:RefinedPlate,classic:undefined,clean:'CLEAR',params:{body:.5,decay:.5}},
];
function input(kind,i){
  const t=i/rate;
  const begins=[.1,1.3,2.65,3.9];
  let left=0,right=0;
  if(kind==='chip'){
    const trigger=begins.some(s=>i===Math.round(s*rate));
    return{left:0,right:0,trigger};
  }
  if(kind==='reson'){
    const trigger=begins.some(s=>i===Math.round(s*rate));
    const env=Math.max(0,Math.min(1,(t-.15)/.07,(4.4-t)/.15));
    const x=.055*Math.sin(2*Math.PI*110*t)*env;
    return{left:x,right:x*.95,trigger};
  }
  for(const start of begins){
    const u=t-start;
    if(u<0||u>.4)continue;
    const env=Math.min(1,u/.004)*Math.exp(-u/.07);
    left+=.12*env*(Math.sin(2*Math.PI*147*u)+.5*Math.sin(2*Math.PI*1237*u)+.23*Math.sin(2*Math.PI*6200*u));
    right+=.12*env*(Math.sin(2*Math.PI*151*u+.2)+.5*Math.sin(2*Math.PI*1217*u)+.23*Math.sin(2*Math.PI*6140*u));
  }
  return{left,right,trigger:false};
}
function render(entry,mode){
  const state=createModule(entry.type,0,0,71);
  state.params=entry.params;state.mode=mode;
  if(entry.type==='CHIP')state.wide=true;
  const module=new entry.New(state,rate,29);
  if(entry.type==='CHIP')module.inputConnected[1]=1;
  const l=new Float32Array(frames),r=new Float32Array(frames);
  for(let i=0;i<frames;i++){
    const v=input(entry.id,i);
    if(entry.id==='chip')module.inputL[1]=v.trigger?1:0;
    else if(entry.id==='reson'){
      module.inputL[0]=v.trigger?1:0;module.inputL[2]=v.left;module.inputR[2]=v.right;
    }else{module.inputL[0]=v.left;module.inputR[0]=v.right;}
    module.smooth();module.process(i,114);
    l[i]=module.outputL[0];r[i]=module.outputR[0];
  }
  return{l,r};
}
function stats({l,r}){
  let e=0,p=0,d=0,lastL=0,lastR=0;
  for(let i=0;i<l.length;i++){
    const x=l[i],y=r[i];
    if(!Number.isFinite(x)||!Number.isFinite(y))throw Error('Nonfinite render');
    e+=x*x+y*y;p=Math.max(p,Math.abs(x),Math.abs(y));
    d+=(x-lastL)**2+(y-lastR)**2;lastL=x;lastR=y;
  }
  return{peak:p,rms:Math.sqrt(e/(l.length*2)),stepRms:Math.sqrt(d/(l.length*2))};
}
async function save(path,clip,gain){
  const left=Float32Array.from(clip.l,x=>x*gain),right=Float32Array.from(clip.r,x=>x*gain);
  if(Math.max(stats({l:left,r:right}).peak,0)>1)throw Error('Audio exceeds 0 dBFS: '+path);
  const wav=encodeWav({kind:'loopAudio',sampleRate:rate,left,right});
  writeFileSync(join(audio,path),Buffer.from(await wav.arrayBuffer()));
}
const rows=[];
for(const c of cases){
  const original=render({...c,New:c.Old},c.classic);
  const refined=render(c,c.clean);
  const a=stats(original),b=stats(refined);
  const common=Math.min(2,.85/Math.max(a.peak,b.peak,1e-9));
  const matched=Math.min(common*a.rms/Math.max(b.rms,1e-9),.85/Math.max(b.peak,1e-9));
  await save(c.id+'-classic.wav',original,common);
  await save(c.id+'-refined.wav',refined,common);
  await save(c.id+'-refined-rms-matched.wav',refined,matched);
  rows.push({id:c.id,mode:c.clean,classic:a,refined:b,commonGain:common,rmsMatchGain:matched,
    note:'RAW pair uses identical gain; the third comparison has only RMS matching (not LUFS).'});
}
writeFileSync(join(directory,'metrics.json'),JSON.stringify({sampleRate:rate,seconds:frames/rate,
  method:'Identical deterministic source/events and preset macros. No invented subjective listening conclusions.',
  notes:'Original 7-bit quantization and original DSP remain available. Physical iPhone Safari not tested.',rows},null,2));
const safe=(s)=>String(s).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;');
writeFileSync(join(directory,'index.html'),`<!DOCTYPE html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>SIGNAL MACHINES — Sonic refinement A/B</title><style>body{background:#111;color:#eee;font:15px system-ui;margin:2em auto;max-width:730px;padding:0 1em}section{border-top:1px solid #555;padding:1em 0}audio{width:100%;margin:.4em 0}small{color:#bbb}h1{font-weight:500}</style>
<h1>SIGNAL MACHINES — sonic refinement A/B</h1>
<p>48 kHz, five seconds per take. Same source, same seed and controls, independent render. Compare the RAW pair first; the third file matches integrated RMS, not perceived loudness.</p>
${rows.map(r=>`<section><h2>${safe(r.id.toUpperCase())} · ${safe(r.mode)}</h2><label>CLASSIC (shared gain)</label><audio controls src="audio/${r.id}-classic.wav"></audio><label>REFINED (same gain)</label><audio controls src="audio/${r.id}-refined.wav"></audio><label>REFINED (RMS matched)</label><audio controls src="audio/${r.id}-refined-rms-matched.wav"></audio><small>Classic RMS ${r.classic.rms.toFixed(5)}, refined RMS ${r.refined.rms.toFixed(5)}. No aesthetic superiority inferred from these numbers.</small></section>`).join('')}
<p><small>Listening artifacts are a review aid; a technical pass does not prove sonic preference.</small></p></html>`);
console.log('Rendered '+rows.length+' A/B cases at 48 kHz; '+rows.length*3+' WAVs. Metrics: '+JSON.stringify(rows.map(r=>({id:r.id,ratio:r.refined.rms/r.classic.rms}))));
