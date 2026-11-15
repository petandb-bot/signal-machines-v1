// Phase 1: unchanged production DSP, original user patch versus an independent patch.
import {build} from 'esbuild';import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';import {createHash} from 'node:crypto';import {fileURLToPath} from 'node:url';
const root=fileURLToPath(new URL('../',import.meta.url));
const bundle=await build({stdin:{contents:`export {DSPGraph} from './src/audio/DSPGraph';export {parsePatch} from './src/state/PatchStorage';export {builtinFound} from './src/samples/FoundData';`,loader:'ts',resolveDir:root},bundle:true,write:false,format:'esm',platform:'node'});
const {DSPGraph,parsePatch,builtinFound}=await import('data:text/javascript;base64,'+Buffer.from(bundle.outputFiles[0].text).toString('base64'));
const rate=24000,seconds=Number(process.argv[2]??300);if(![60,180,300].includes(seconds))throw Error('Use 60, 180 or 300 seconds');
const output=root+'public/listening/audio/sound-architecture/';mkdirSync(output,{recursive:true});const reports=[],rendered=[];
const asset=builtinFound('machine');
function memory(g){const seen=new Set(),buffers=new Set();function visit(v){if(!v||typeof v!=='object'||seen.has(v))return;seen.add(v);if(ArrayBuffer.isView(v)){buffers.add(v.buffer);return;}if(v instanceof Map)for(const x of v.values())visit(x);else for(const x of Object.values(v))visit(x);}visit(g);return [...buffers].reduce((n,b)=>n+b.byteLength,0);}
function wav(name,l,r,gain=1){const n=l.length,b=Buffer.alloc(44+n*4);b.write('RIFF');b.writeUInt32LE(36+n*4,4);b.write('WAVEfmt ',8);b.writeUInt32LE(16,16);b.writeUInt16LE(1,20);b.writeUInt16LE(2,22);b.writeUInt32LE(rate,24);b.writeUInt32LE(rate*4,28);b.writeUInt16LE(4,32);b.writeUInt16LE(16,34);b.write('data',36);b.writeUInt32LE(n*4,40);for(let i=0;i<n;i++)for(let c=0;c<2;c++){const x=(c?r[i]:l[i])*gain;if(!Number.isFinite(x)||Math.abs(x)>1)throw Error('Invalid export');b.writeInt16LE(Math.round(x*(x<0?32768:32767)),44+i*4+c*2);}writeFileSync(output+name,b);return{name,seconds:n/rate,gain,sha256:createHash('sha256').update(b).digest('hex')};}
for(const [label,path] of [['reference','tests/fixtures/still-almost-moving.reference.json'],['ii','presets/still-almost-moving-ii.json']]){
 const patch=parsePatch(readFileSync(root+path,'utf8')),g=new DSPGraph(rate);g.setFoundAssets([asset]);g.setPatch(patch);const l=new Float32Array(rate*seconds),r=new Float32Array(l.length),windows=[],events={cuts:[],nerve:[]},probes=[],before=memory(g),start=performance.now();
 let energy=0,peak=0,ll=0,rr=0,lr=0,side=0,last=0,maxStep=0,lowL=0,lowR=0,midL=0,midR=0,band=[0,0,0],winEnergy=0,winPeak=0,winBands=[0,0,0];
 const lp=1-Math.exp(-2*Math.PI*250/rate),mp=1-Math.exp(-2*Math.PI*2500/rate);
 // Production comparisons use the normal 128-frame quantum; triggers are observed at each module.process call instead.
 for(const [id,key] of [['cuts-1','cuts'],['nerve-1','nerve']]){const d=g.modules.get(id),process=d.process.bind(d);d.process=(sample,bpm)=>{process(sample,bpm);if(d.outputL[key==='cuts'?1:0])events[key].push(sample/rate);};}
 for(let at=0;at<l.length;at+=128){g.process(l.subarray(at,at+128),r.subarray(at,at+128));
  for(let i=at;i<Math.min(at+128,l.length);i++){
   const a=l[i],b=r[i];if(!Number.isFinite(a)||!Number.isFinite(b)||Math.max(Math.abs(a),Math.abs(b))>.630001)throw Error('Unsafe render');const e=(a*a+b*b)*.5;energy+=e;winEnergy+=e;peak=Math.max(peak,Math.abs(a),Math.abs(b));winPeak=Math.max(winPeak,Math.abs(a),Math.abs(b));ll+=a*a;rr+=b*b;lr+=a*b;side+=(a-b)**2*.25;maxStep=Math.max(maxStep,Math.abs(a-last));last=a;
   lowL+=(a-lowL)*lp;lowR+=(b-lowR)*lp;midL+=(a-midL)*mp;midR+=(b-midR)*mp;const en=[(lowL**2+lowR**2)*.5,((midL-lowL)**2+(midR-lowR)**2)*.5,((a-midL)**2+(b-midR)**2)*.5];for(let j=0;j<3;j++){band[j]+=en[j];winBands[j]+=en[j];}
   if((i+1)%(rate*5)===0){windows.push({endSeconds:(i+1)/rate,rms:Math.sqrt(winEnergy/(rate*5)),peak:winPeak,bands:winBands.map(x=>x/(rate*5))});winEnergy=0;winPeak=0;winBands=[0,0,0];}
  }
  if(at%(rate*5)<128)probes.push({seconds:at/rate,drone:g.modules.get('drone-1').b,partialWarp:g.modules.get('partial-1').b,partialMass:g.modules.get('partial-1').a,nerveFatigue:g.modules.get('nerve-1').b});
 }
 if(g.faults)throw Error('DSP fault');const elapsed=performance.now()-start,after=memory(g);if(after!==before)throw Error('Growing buffers');const rms=Math.sqrt(energy/l.length);
 const report={label,name:patch.name,moduleCount:patch.modules.length,cables:patch.connections.length,seconds,sampleRate:rate,rms,peak,maxStep,stereoCorrelation:lr/Math.sqrt(ll*rr),sideEnergyFraction:side/energy,bandEnergy:band.map(x=>x/l.length),windows,events,probes,cpuMs:elapsed,realtimePercent:elapsed/(seconds*10),typedBytes:before,bufferGrowth:after-before,faults:g.faults};reports.push(report);rendered.push({label,l,r,rms,peak});console.log(label,{rms,peak,cuts:events.cuts.length,nerve:events.nerve.length,cpuMs:elapsed});
}
const files=[];for(const x of rendered){for(const n of [60,180,300].filter(n=>n<=seconds))files.push(wav(x.label+'-'+n+'s-raw.wav',x.l.subarray(0,rate*n),x.r.subarray(0,rate*n)));}
const target=Math.min(...rendered.map(x=>x.rms));for(const x of rendered)files.push(wav(x.label+'-'+seconds+'s-matched.wav',x.l,x.r,target/x.rms));
writeFileSync(output+'report.json',JSON.stringify({limitations:'No human listening assessment. Offline server CPU is not iPhone performance. Band energies are complementary one-pole analysis bands, not a calibrated spectral or perceptual measure. RMS matching uses one fixed attenuation per full render, not compression.',referenceSha256:createHash('sha256').update(readFileSync(root+'tests/fixtures/still-almost-moving.reference.json')).digest('hex'),files,reports},null,2)+'\n');

writeFileSync(output+'still-almost-moving-ii.json',readFileSync(root+'presets/still-almost-moving-ii.json'));
