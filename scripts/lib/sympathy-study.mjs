// Offline-only historical builds. Never imported by the app or AudioWorklet.
import {build} from 'esbuild';
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
export const previous=readFileSync('tests/fixtures/sympathy-phase3-source.txt','utf8');
export const current=readFileSync('src/audio/modules/Sympathy.ts','utf8');
export async function studyApi(source=current){
 const bundle=await build({stdin:{contents:`export {Sympathy} from './src/audio/modules/Sympathy';export {Chip} from './src/audio/modules/Chip';export {Alloy} from './src/audio/modules/Alloy';export {Cuts} from './src/audio/modules/Cuts';export {createModule} from './src/graph/PatchGraph';export {builtinFound} from './src/samples/FoundData';export {DSPGraph} from './src/audio/DSPGraph';export {parsePatch} from './src/state/PatchStorage';`,loader:'ts',resolveDir:process.cwd()},bundle:true,write:false,format:'esm',platform:'node',plugins:[{name:'historical-sympathy',setup(b){b.onLoad({filter:/[/\\]Sympathy\.ts$/},()=>({contents:source,loader:'ts',resolveDir:resolve('src/audio/modules')}));}}]});
 return import('data:text/javascript;base64,'+Buffer.from(bundle.outputFiles[0].text).toString('base64'));
}
export function make(api,body=.42,couple=.55,rate=24000){const state=api.createModule('SYMPATHY',0,0,71);state.params={body,couple};return new api.Sympathy(state,rate,31);}
export function typedBytes(obj){const seen=new Set(),buffers=new Set();function visit(v){if(!v||typeof v!=='object'||seen.has(v))return;seen.add(v);if(ArrayBuffer.isView(v)){buffers.add(v.buffer);return;}for(const x of Object.values(v))visit(x);}visit(obj);return [...buffers].reduce((s,b)=>s+b.byteLength,0);}
