// Offline, reproducible listening material. No recordings, codecs or UI state are involved.
import {build} from 'esbuild';
import {readFileSync,readdirSync,existsSync,mkdirSync,writeFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {join,relative} from 'node:path';
import {createHash} from 'node:crypto';
const root=fileURLToPath(new URL('../',import.meta.url)),directory=join(root,'public/listening/audio');
const hash=createHash('sha256');
function fingerprint(path){for(const entry of readdirSync(path,{withFileTypes:true}).sort((a,b)=>a.name.localeCompare(b.name))){const file=join(path,entry.name);if(entry.isDirectory())fingerprint(file);else if(entry.name.endsWith('.ts'))hash.update(relative(root,file)).update(readFileSync(file));}}
for(const name of ['src/audio','src/graph','src/state','src/visual'])fingerprint(join(root,name));
hash.update(readFileSync(fileURLToPath(import.meta.url)));hash.update(readFileSync(join(root,'package-lock.json')));const source=hash.digest('hex');
const manifestPath=join(directory,'manifest.json');
if(existsSync(manifestPath)){const old=JSON.parse(readFileSync(manifestPath,'utf8'));if(old.source===source&&old.files.every(f=>existsSync(join(directory,f.name)))){console.log('Listening WAVs are current.');process.exit(0);}}
const bundled=await build({stdin:{contents:`export {Smear} from './src/audio/modules/Smear';export {Friction} from './src/audio/modules/Friction';export {DSPGraph} from './src/audio/DSPGraph';export {createModule} from './src/graph/PatchGraph';export {dissolvingMetal,slidingGlass} from './src/state/presets';export {encodeWav} from './src/audio/Wav';`,resolveDir:root,loader:'ts'},bundle:true,write:false,platform:'node',format:'esm'});
const {Smear,Friction,DSPGraph,createModule,dissolvingMetal,slidingGlass,encodeWav}=await import('data:text/javascript;base64,'+Buffer.from(bundled.outputFiles[0].text).toString('base64'));
const rate=24000,gain=1.5,files=[];
const edge=(i,length)=>Math.max(0,Math.min(1,i/(rate*.01),(length-1-i)/(rate*.02)));
mkdirSync(directory,{recursive:true});
async function save(name,left,right,cues){let peak=0,energy=0;for(let i=0;i<left.length;i++){left[i]*=gain*edge(i,left.length);right[i]*=gain*edge(i,left.length);for(const x of [left[i],right[i]]){if(!Number.isFinite(x)||Math.abs(x)>.98)throw Error(name+' would clip');peak=Math.max(peak,Math.abs(x));energy+=x*x;}}const wav=encodeWav({kind:'loopAudio',sampleRate:rate,left,right});writeFileSync(join(directory,name),Buffer.from(await wav.arrayBuffer()));files.push({name,seconds:left.length/rate,peak,rms:Math.sqrt(energy/(left.length*2)),cues});}
function input(kind){const left=new Float32Array(rate*4),right=new Float32Array(left.length);let seed=15;for(let i=0;i<left.length;i++){const t=i/rate;let l=0,r=0;
 if(kind==='metal'){for(const start of [.15,1.3])if(t>=start){const u=t-start,env=Math.min(1,u/.002)*Math.exp(-u/.07);l+=.14*env*(Math.sin(2*Math.PI*220*u)+.5*Math.sin(2*Math.PI*607*u)+.3*Math.sin(2*Math.PI*1327*u));r+=.14*env*(Math.sin(2*Math.PI*220*u)+.5*Math.sin(2*Math.PI*607*u+.1)+.3*Math.sin(2*Math.PI*1327*u));}}
 else if(kind==='sustain'){const env=Math.max(0,Math.min(1,(t-.1)/.08,(2.35-t)/.15));l=.07*env*(Math.sin(2*Math.PI*110*t)+.45*Math.sin(2*Math.PI*330*t)+.3*Math.sin(2*Math.PI*880*t)+.2*Math.sin(2*Math.PI*3520*t));r=.07*env*(Math.sin(2*Math.PI*110*t)+.45*Math.sin(2*Math.PI*331*t)+.3*Math.sin(2*Math.PI*881*t)+.2*Math.sin(2*Math.PI*3521*t));}
 else{seed=(Math.imul(seed,1664525)+1013904223)>>>0;const n=seed/4294967296*2-1;for(const [start,duration] of [[.2,.025],[.63,.07],[1.07,.035],[1.79,.1]])if(t>start&&t<start+duration){const env=Math.sin((t-start)/duration*Math.PI)**2;l=n*.1*env;r=(n*.7+Math.sin(t*41000)*.3)*.1*env;}}
 left[i]=l;right[i]=r;}return{left,right};}
for(const kind of ['metal','sustain','noise']){const original=input(kind),length=rate*4,gap=Math.round(rate*.3),left=new Float32Array((length+gap)*4),right=new Float32Array(left.length),cues=[];for(const [index,[amount,memory]] of [[0,.6],[.25,.2],[.6,.55],[1,1]].entries()){const state=createModule('SMEAR',0,0,1);state.params.smear=amount;state.params.memory=memory;const m=new Smear(state,rate,7),offset=index*(length+gap);cues.push({at:offset/rate,label:`SMEAR ${amount} / MEMORY ${memory}`});for(let i=0;i<length;i++){m.inputL[0]=original.left[i];m.inputR[0]=original.right[i];m.process();left[offset+i]=m.outputL[0]*edge(i,length);right[offset+i]=m.outputR[0]*edge(i,length);}}await save(`smear-${kind}.wav`,left,right,cues);}
{
 const settings=[[.15,.35],[.55,.35],[.95,.35],[.55,.08],[.55,.4],[.55,.9],[.55,.4]],length=rate*3,gap=Math.round(rate*.3),left=new Float32Array((length+gap)*settings.length),right=new Float32Array(left.length),cues=[];
 for(const [index,[pressure,speed]] of settings.entries()){const state=createModule('FRICTION',0,0,10);state.params.pressure=pressure;state.params.speed=speed;const m=new Friction(state,rate,7),offset=index*(length+gap);cues.push({at:offset/rate,label:index===6?'CV: pressure, speed and pitch move':`PRESSURE ${pressure} / SPEED ${speed}`});for(let i=0;i<length;i++){if(index===6){m.inputL[0]=Math.sin(i/rate*1.7)*.25;m.inputL[1]=Math.sin(i/rate*2.3)*.7;m.inputL[2]=Math.cos(i/rate*1.3)*.6;}m.process(i);left[offset+i]=m.outputL[0]*edge(i,length);right[offset+i]=m.outputR[0]*edge(i,length);}}
 await save('friction-contact.wav',left,right,cues);
}
for(const [name,create] of [['dissolving-metal',dissolvingMetal],['sliding-glass',slidingGlass]]){const graph=new DSPGraph(rate);graph.setPatch(create());const left=new Float32Array(rate*8),right=new Float32Array(left.length);for(let i=0;i<left.length;i+=128)graph.process(left.subarray(i,Math.min(i+128,left.length)),right.subarray(i,Math.min(i+128,right.length)));if(graph.faults)throw Error('Demo graph fault');await save(name+'.wav',left,right,[{at:0,label:create().name}]);}
writeFileSync(manifestPath,JSON.stringify({source,sampleRate:rate,bits:16,gain,normalization:'One common gain; no per-segment normalization; 10ms in / 20ms out clip-boundary fades',listening:'Not human-auditioned in the development environment',files},null,2)+'\n');
console.log(`Rendered ${files.length} listening WAVs / ${rate} Hz stereo PCM16 / fixed ${gain}× gain.`);
