import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import assert from 'node:assert/strict';
import {api,metrics,wav,typedBytes} from './lib/phase5-audio.mjs';

const a=await api(),rate=24000,seconds=30,frames=rate*seconds;
const root='artifacts/pitch-field-study/';
mkdirSync(root,{recursive:true});
const names=['field','friction'],rows=[];
for(const name of names){
  const patch=a.parsePatch(readFileSync('docs/phase9/patches/common-ground-'+name+'.json','utf8'));
  const graph=new a.DSPGraph(rate);graph.setPatch(patch);
  const bytes=typedBytes(graph),left=new Float32Array(frames),right=new Float32Array(frames);
  for(let i=0;i<frames;i+=128){
    graph.process(left.subarray(i,i+128),right.subarray(i,i+128));
  }
  assert.equal(graph.faults,0,'Audio fault in '+name);
  assert.equal(bytes,typedBytes(graph),'DSP buffers grew during '+name);
  const m=metrics(left,right);
  assert(m.peak<=.630001,'Unexpected output above the original master ceiling');
  assert(m.rms>1e-5,'Silent study '+name);
  wav(root+name+'.wav',left,right,rate);
  rows.push({name,...m,moduleTypes:patch.modules.map(n=>n.type),quantizeModes:patch.modules.filter(n=>n.type==='QUANTIZE').map(n=>n.mode),faults:graph.faults,typedBufferBytes:bytes});
  console.log(name,'RMS',m.rms.toFixed(5),'peak',m.peak.toFixed(5));
}
const report={rate,seconds,
  notes:'RAW graph audio. Equal playback gain for both patches. Identical source modules, seeds, gates, routes and settings; only one QUANTIZE pitch-set mode differs. No mastering, gain matching or noise reduction. Metrics are not a musical-quality score.',
  rows};
writeFileSync(root+'metrics.json',JSON.stringify(report,null,2)+'\n');
writeFileSync(root+'index.html',`<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>SIGNAL MACHINES — shared field audition</title>
<style>body{background:#101713;color:#e0e9df;font:14px/1.6 system-ui;margin:2em auto;max-width:660px;padding:0 1em}h1{font-size:21px;font-weight:500}h2{font-size:15px;margin:0}section{padding:1em 0;border-top:1px solid #526352}audio{width:100%;margin:.8em 0}a{color:#a5d8da}small{color:#becbbb}</style>
<h1>COMMON GROUND — pitch-field listening</h1>
<p>Two 30-second RAW excerpts from the same SIGNAL MACHINES patch. Only the second voice's QUANTIZE mode changes. The underlying pulse, BRANCH memory, timbres and root modulation remain identical. Start at low volume.</p>
<section><h2>FIELD / FIELD</h2><p>Both independent voices use the same familiar interval field.</p><audio src="field.wav" controls preload="metadata"></audio><a href="field.wav" download>Save FIELD WAV</a></section>
<section><h2>FIELD / FRICTION</h2><p>The partner voice uses a clustered, less stable collection. Neither voice is arpeggiated by the field.</p><audio src="friction.wav" controls preload="metadata"></audio><a href="friction.wav" download>Save FRICTION WAV</a></section>
<p><small>Same output gain for both. This is an audition of pitch relationships, not an audio-quality enhancement. The sample-rate and brief excerpt cannot demonstrate all long-term variations.</small></p></html>`);
console.log('Created two FIELD A/B WAV previews and HTML audition page.');
