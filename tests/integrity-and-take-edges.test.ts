import {describe,expect,it} from 'vitest';
import {PcmRecording} from '../src/audio/PcmRecording';
import {decodeWav} from '../src/audio/Wav';
import {decodeAiff} from '../src/audio/AudioFile';
import {DSPGraph} from '../src/audio/DSPGraph';
import {createModule,connect} from '../src/graph/PatchGraph';
import {emptyPatch} from '../src/state/presets';

function makeTake(format:'wav'|'aiff',fadeMs?:number){
  const rate=48000,count=4800;
  const left=Float32Array.from({length:count},()=>.73);
  const right=Float32Array.from({length:count},()=>-.51);
  const recording=new PcmRecording(rate,format);
  for(const [a,b] of [[0,1],[1,37],[37,109],[109,3300],[3300,4800]]){
    recording.append(left.subarray(a,b),right.subarray(a,b),b-a);
  }
  return recording.finish(fadeMs===undefined?undefined:{edgeFadeMs:fadeMs});
}
describe('recording boundary repair without tonal polishing',()=>{
  it.each(['wav','aiff'] as const)('%s tapers only the file edges, across irregular interleaved chunks',async format=>{
    const raw=await makeTake(format).blob.arrayBuffer(),fixed=await makeTake(format,3).blob.arrayBuffer();
    expect(fixed.byteLength).toBe(raw.byteLength);
    const decode=(bytes:ArrayBuffer)=>{
      if(format==='wav')return decodeWav(bytes,48000);
      return decodeAiff(bytes);
    };
    const a=decode(raw),b=decode(fixed),n=a.left.length;
    expect(n).toBe(4800);
    expect(a.left[0]).toBeCloseTo(.73,5);
    expect(a.left[n-1]).toBeCloseTo(.73,5);
    expect(b.left[0]).toBe(0);expect(b.right[0]).toBe(0);
    expect(b.left[n-1]).toBe(0);expect(b.right[n-1]).toBe(0);
    for(const i of [145,300,1250,2400,4690]){
      if(i>n-145)continue;
      expect(b.left[i]).toBe(a.left[i]);
      expect(b.right[i]).toBe(a.right[i]);
    }
    expect(b.left[30]).toBeGreaterThan(0);
    expect(b.left[30]).toBeLessThan(a.left[30]);
    expect(b.left[n-31]).toBeGreaterThan(0);
    expect(b.left[n-31]).toBeLessThan(a.left[n-31]);
    expect(b.right[30]).toBeLessThan(0);
    // Only the actual beginning/end can change. Material 3ms away is PCM-identical.
    for(let i=145;i<n-145;i++){
      if(b.left[i]!==a.left[i]||b.right[i]!==a.right[i])throw Error('Interior PCM changed');
    }
  });
  it('preserves raw encoding by default and rejects invalid taper settings',async()=>{
    const a=await makeTake('wav').blob.arrayBuffer(),b=await makeTake('wav',0).blob.arrayBuffer();
    expect(new Uint8Array(b)).toEqual(new Uint8Array(a));
    for(const edgeFadeMs of [-1,Infinity,NaN,50]){
      const rec=new PcmRecording(48000,'wav');
      rec.append(Float32Array.of(.3,.4),Float32Array.of(.2,.1),2);
      expect(()=>rec.finish({edgeFadeMs})).toThrow('Invalid recording edge fade');
    }
  });
  it('short takes remain valid without overlapping edge buffers',async()=>{
    const rate=44100,frames=200,l=new Float32Array(frames).fill(.45),r=new Float32Array(frames).fill(-.22);
    const rec=new PcmRecording(rate,'wav');rec.append(l,r,frames);
    const decoded=decodeWav(await rec.finish({edgeFadeMs:3}).blob.arrayBuffer(),rate);
    expect(decoded.left[0]).toBe(0);expect(decoded.left[frames-1]).toBe(0);
    expect(decoded.left[100]).toBeGreaterThan(.4);
    expect(decoded.left.every(Number.isFinite)).toBe(true);
  });
});
function layeredPatch(n:number){
  const patch=emptyPatch();patch.master=1;
  const chip=createModule('CHIP',0,0,33,'chip');chip.params.tune=.62;chip.params.character=.27;
  patch.modules.push(chip);
  for(let i=0;i<n;i++){
    const id='output-'+i,output=createModule('OUTPUT',144*(i+1),0,34+i,id);
    output.params.level=1;patch.modules.push(output);
    connect(patch,{module:'chip',port:'audio'},{module:id,port:'audio'});
  }
  return patch;
}
describe('master summation diagnostics, never automatic de-characterization',()=>{
  it('exposes actual pre-saturation hotness while preserving the 0.63 master ceiling',()=>{
    const report=(n:number)=>{
      const graph=new DSPGraph(48000);graph.setPatch(layeredPatch(n));
      let largest=0,energy=0;
      const left=new Float32Array(128),right=new Float32Array(128);
      for(let block=0;block<480;block++){
        graph.process(left,right);
        for(let i=0;i<128;i++){
          expect(Number.isFinite(left[i])&&Number.isFinite(right[i])).toBe(true);
          largest=Math.max(largest,Math.abs(left[i]),Math.abs(right[i]));
          energy+=left[i]*left[i]+right[i]*right[i];
        }
      }
      expect(graph.faults).toBe(0);
      const result=graph.telemetry();
      expect(result.integrity).toBeDefined();
      expect(result.integrity!.masterDrivePeak).toBeGreaterThanOrEqual(result.peak);
      expect(result.integrity!.largestSampleStep).toBeGreaterThan(0);
      expect(result.integrity!.nearCeilingFraction).toBeGreaterThanOrEqual(0);
      expect(result.integrity!.nearCeilingFraction).toBeLessThanOrEqual(1);
      expect(largest).toBeLessThanOrEqual(.630001);
      expect(energy).toBeGreaterThan(.001);
      // The counters are interval-based, not lifetime-accumulated.
      expect(graph.telemetry().integrity!.masterDrivePeak).toBe(0);
      expect(graph.telemetry().integrity!.nearCeilingFraction).toBe(0);
      return result.integrity!;
    };
    const quiet=report(1),crowded=report(12);
    expect(crowded.masterDrivePeak).toBeGreaterThan(quiet.masterDrivePeak*5);
    expect(crowded.nearCeilingFraction).toBeGreaterThan(.05);
    expect(quiet.nearCeilingFraction).toBe(0);
  },18000);
  it('stays finite with a six-hour-offset sample clock, across variable audio block sizes',()=>{
    const g=new DSPGraph(44100);
    g.setPatch(layeredPatch(6));
    const largeSample=44100*60*60*6;
    g.sample=largeSample;
    let p=0;
    for(let i=0;i<3000;i++){
      const size=i%3===0?128:i%3===1?193:257,l=new Float32Array(size),r=new Float32Array(size);
      g.process(l,r);
      for(let j=0;j<size;j++){
        expect(Number.isFinite(l[j])&&Number.isFinite(r[j])).toBe(true);
        p=Math.max(p,Math.abs(l[j]),Math.abs(r[j]));
      }
    }
    expect(g.sample).toBeGreaterThan(largeSample);
    expect(g.faults).toBe(0);expect(p).toBeLessThanOrEqual(.630001);
  },18000);
});
