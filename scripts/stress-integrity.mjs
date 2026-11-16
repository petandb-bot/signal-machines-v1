/**
 * Continuous deterministic DSP soak plus a six-hour-offset clock probe.
 * Runs in Node (not a real-time browser) and makes no subjective sound-quality claims.
 */
import assert from 'node:assert/strict';
import {mkdirSync,writeFileSync} from 'node:fs';
import {performance} from 'node:perf_hooks';
import {api,typedBytes,attachSamples} from './lib/phase5-audio.mjs';
const a=await api();
const suites=[
  {id:'pixel-dust',rate:44100,seconds:75},
  {id:'dissolving-metal',rate:48000,seconds:90},
  {id:'binary-fever',rate:44100,seconds:90},
  {id:'late-light',rate:48000,seconds:105},
];
const rows=[];
for(const cfg of suites){
  const preset=a.PRESETS.find(p=>p.id===cfg.id);
  assert(preset,cfg.id+' is missing');
  const patch=preset.create(),g=new a.DSPGraph(cfg.rate);
  attachSamples(a,g,patch);g.setPatch(patch);
  const memoryBytes=typedBytes(g);
  const chunk=128,left=new Float32Array(chunk),right=new Float32Array(chunk);
  const frames=cfg.rate*cfg.seconds;
  let peak=0,energy=0,framesRead=0,drivePeak=0,nearCeilingMax=0,nearCeilingFrames=0;
  let stepPeak=0,telemetryWindows=0,lastFaults=0,parameterChanges=0,routingRefreshes=0;
  const start=performance.now();
  for(let at=0;at<frames;at+=chunk){
    // Exercise the actual patch update and routing paths without adding sounds.
    if(at!==0&&at%(cfg.rate*30)<chunk){
      const m=patch.modules.find(m=>Object.keys(m.params).length);
      if(m){
        const param=Object.keys(m.params)[0];
        const current=m.params[param];
        const amount=(parameterChanges%2===0?.025:-.025);
        m.params[param]=Math.max(0,Math.min(1,current+amount));
        g.updateParameters(patch);parameterChanges++;
      }
    }
    if(at!==0&&at%(cfg.rate*40)<chunk){g.setPatch(structuredClone(patch));routingRefreshes++;}
    const size=Math.min(chunk,frames-at);
    const l=size===chunk?left:left.subarray(0,size);
    const r=size===chunk?right:right.subarray(0,size);
    g.process(l,r);
    for(let i=0;i<size;i++){
      if(!Number.isFinite(l[i])||!Number.isFinite(r[i]))throw Error(cfg.id+' produced nonfinite output');
      peak=Math.max(peak,Math.abs(l[i]),Math.abs(r[i]));
      energy+=l[i]*l[i]+r[i]*r[i];
    }
    framesRead+=size;
    if((at+size)%(cfg.rate*5)<chunk||at+size===frames){
      const t=g.telemetry();
      assert.equal(t.faults,0,cfg.id+' reported DSP faults');
      const d=t.integrity;
      assert(d,'Missing master integrity telemetry');
      drivePeak=Math.max(drivePeak,d.masterDrivePeak);
      nearCeilingMax=Math.max(nearCeilingMax,d.nearCeilingFraction);
      nearCeilingFrames+=Math.round(d.nearCeilingFraction*t.sample);
      stepPeak=Math.max(stepPeak,d.largestSampleStep);
      telemetryWindows++;lastFaults=t.faults;
    }
  }
  const elapsedMs=performance.now()-start;
  assert(peak<=.630001,cfg.id+' exceeded the established ceiling');
  assert(energy/framesRead>1e-13,cfg.id+' stayed completely silent');
  assert.equal(memoryBytes,typedBytes(g),cfg.id+' expanded typed buffers during continuous rendering');
  const stable=new Map(g.modules);
  // A huge sample counter is not the same thing as a six-hour real-time soak.
  g.sample=6*3600*cfg.rate;
  const probeFrames=cfg.rate*2;
  for(let at=0;at<probeFrames;at+=chunk){
    const size=Math.min(chunk,probeFrames-at);
    const l=size===chunk?left:left.subarray(0,size);
    const r=size===chunk?right:right.subarray(0,size);
    g.process(l,r);
    for(let i=0;i<size;i++)assert(Number.isFinite(l[i])&&Number.isFinite(r[i]),'Late-clock nonfinite audio');
  }
  assert.equal(g.faults,0,cfg.id+' late-clock fault');
  assert.equal(memoryBytes,typedBytes(g),cfg.id+' late-clock allocation growth');
  for(const [key,instance] of stable)assert.equal(g.modules.get(key),instance,cfg.id+' lost its running DSP state');
  rows.push({id:cfg.id,rate:cfg.rate,continuousSeconds:cfg.seconds,lateClockOffsetHours:6,
    lateClockProbeSeconds:2,realTimeHardwareTest:false,
    peak,rms:Math.sqrt(energy/(framesRead*2)),masterDrivePeak:drivePeak,
    maximumFiveSecondNearCeilingFraction:nearCeilingMax,
    maximumSampleStep:stepPeak,telemetryWindows,parameterChanges,routingRefreshes,
    typedBufferBytes:memoryBytes,bufferGrowth:typedBytes(g)-memoryBytes,
    faults:lastFaults,wallClockRenderMs:elapsedMs});
  console.log(cfg.id,JSON.stringify(rows.at(-1)));
}
mkdirSync('artifacts/integrity',{recursive:true});
const report={
  version:1,
  method:'Deterministic offline continuous DSPGraph rendering at 44.1/48kHz, repeated live parameter and routing edits, followed by simulated six-hour absolute sample clock offset and 2s render. Peak/near-ceiling counters are diagnostics, not audio changes. No physical iPhone or multi-hour uninterrupted hardware test was performed.',
  caution:'An irregular PCM sample step can be deliberate CHIP/FUZZ transience, not automatically a click. Master saturation is an existing artistic characteristic, not a defect.',
  rows
};
writeFileSync('artifacts/integrity/soak-report.json',JSON.stringify(report,null,2)+'\n');
console.log('Verified '+rows.length+' continuous DSP cases and late-clock probes; no samples or presets changed.');
