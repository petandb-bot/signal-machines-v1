// Offline comparisons only; no local user audio is read or embedded.
import {build} from 'esbuild';
import {readFileSync,readdirSync,existsSync,mkdirSync,writeFileSync} from 'node:fs';
import {join} from 'node:path';import {fileURLToPath} from 'node:url';import {createHash} from 'node:crypto';
const root=fileURLToPath(new URL('../',import.meta.url)),out=join(root,'public/listening/audio'),hash=createHash('sha256');
function scan(dir){for(const e of readdirSync(dir,{withFileTypes:true}).sort((a,b)=>a.name.localeCompare(b.name))){const p=join(dir,e.name);if(e.isDirectory())scan(p);else if(e.name.endsWith('.ts'))hash.update(p.slice(root.length)).update(readFileSync(p));}}
for(const dir of ['src/audio','src/graph','src/state','src/samples','src/visual'])scan(join(root,dir));hash.update(readFileSync(fileURLToPath(import.meta.url)));const source=hash.digest('hex'),meta=join(out,'found-level.json');if(existsSync(meta)){const m=JSON.parse(readFileSync(meta,'utf8'));if(m.source===source&&m.files.every(f=>existsSync(join(out,f.name)))){console.log('FOUND/LEVEL WAVs are current.');process.exit(0);}}
const result=await build({stdin:{contents:`export {Found} from './src/audio/modules/Found';export {Level} from './src/audio/modules/Level';export {builtinFound} from './src/samples/FoundData';export {createModule} from './src/graph/PatchGraph';export {DSPGraph} from './src/audio/DSPGraph';export {foundQuiet,foundStrange,levelRecovery} from './src/state/presets';export {encodeWav} from './src/audio/Wav';`,loader:'ts',resolveDir:root},bundle:true,write:false,format:'esm',platform:'node'});
const {Found,Level,builtinFound,createModule,DSPGraph,foundQuiet,foundStrange,levelRecovery,encodeWav}=await import('data:text/javascript;base64,'+Buffer.from(result.outputFiles[0].text).toString('base64'));
const rate=24000,files=[];mkdirSync(out,{recursive:true});const assets=[builtinFound('room'),builtinFound('machine')];
async function save(name,left,right,cues){let peak=0;for(let i=0;i<left.length;i++){const edge=Math.min(1,i/(rate*.01),(left.length-1-i)/(rate*.02));left[i]*=edge;right[i]*=edge;for(const v of [left[i],right[i]]){if(!Number.isFinite(v)||Math.abs(v)>.98)throw Error('Invalid listening material');peak=Math.max(peak,Math.abs(v));}}writeFileSync(join(out,name),Buffer.from(await encodeWav({kind:'loopAudio',sampleRate:rate,left,right}).arrayBuffer()));files.push({name,seconds:left.length/rate,peak,cues});}
for(const [name,create] of [['found-quiet',foundQuiet],['found-strange',foundStrange],['level-recovery',levelRecovery]]){const g=new DSPGraph(rate);g.setFoundAssets(assets);g.setPatch(create());const l=new Float32Array(rate*8),r=new Float32Array(l.length);for(let i=0;i<l.length;i+=128)g.process(l.subarray(i,i+128),r.subarray(i,i+128));if(g.faults)throw Error('Graph fault');await save(name+'.wav',l,r,[{at:0,label:create().name}]);}
{
 const n=rate*5,gap=rate*.3,l=new Float32Array((n+gap)*3),r=new Float32Array(l.length),cues=[];
 for(const [j,[wander,alter]] of [[0,0],[.5,.3],[1,.85]].entries()){const s=createModule('FOUND',0,0,20);s.params={wander,alter};const f=new Found(s,rate,7);f.attach(assets[1]);const offset=j*(n+gap);cues.push({at:offset/rate,wander,alter});for(let i=0;i<n;i++){f.process(i);const fade=Math.min(1,i/(rate*.01),(n-1-i)/(rate*.02));l[offset+i]=f.outputL[0]*fade;r[offset+i]=f.outputR[0]*fade;}}
 await save('found-exploration.wav',l,r,cues);
}
{
 const n=rate*3,gap=rate*.3,l=new Float32Array((n+gap)*3),r=new Float32Array(l.length),cues=[];
 for(const [j,[boost,comp]] of [[1/3,0],[5/6,0],[5/6,.8]].entries()){const s=createModule('LEVEL',0,0,1);s.params={boost,comp};const m=new Level(s,rate,7),offset=j*(n+gap);cues.push({at:offset/rate,boostDb:-12+36*boost,comp});for(let i=0;i<n;i++){const t=i/rate,burst=t%.8,amp=.004+(burst<.2?.08*Math.sin(burst/.2*Math.PI)**2:0);m.inputL[0]=amp*Math.sin(t*2*Math.PI*330);m.inputR[0]=m.inputL[0]*.6;m.process();const fade=Math.min(1,i/(rate*.01),(n-1-i)/(rate*.02));l[offset+i]=m.outputL[0]*fade;r[offset+i]=m.outputR[0]*fade;}}
 await save('level-comparison.wav',l,r,cues);
}
writeFileSync(meta,JSON.stringify({source,sampleRate:rate,bits:16,gain:1,normalization:'No normalization; common unit gain; clip-edge fades only',listening:'Not human-auditioned',files},null,2)+'\n');console.log('Rendered five FOUND/LEVEL WAVs.');
