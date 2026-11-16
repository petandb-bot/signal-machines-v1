// @vitest-environment happy-dom
import {afterEach,describe,expect,it,vi} from 'vitest';
import {decodeAiff,decodeLoopFile,isAiff} from '../src/audio/AudioFile';
import {resampleStereo} from '../src/audio/Resample';
import {decodeFound} from '../src/samples/FoundLibrary';
import {PcmRecording} from '../src/audio/PcmRecording';
import {decodeWav,encodeWav} from '../src/audio/Wav';
import {createModule} from '../src/graph/PatchGraph';
import {CleanOutput as Output} from '../src/audio/modules/CleanOutput';
afterEach(()=>{vi.restoreAllMocks();vi.unstubAllGlobals();});

describe('common audio imports and source quality',()=>{
  it('decodes stereo PCM24 AIFF exports in browsers without native AIFF support',async()=>{
    const writer=new PcmRecording(48000,'aiff');
    writer.append(Float32Array.of(-1,-.25,0,.25,1),
      Float32Array.of(1,.5,0,-.5,-1),5);
    const buffer=await writer.finish().blob.arrayBuffer();
    expect(isAiff(buffer)).toBe(true);
    const pcm=decodeAiff(buffer,16);
    expect(pcm.sampleRate).toBe(48000);
    expect(Array.from(pcm.left)).toEqual(expect.arrayContaining([0]));
    for(const [i,value] of [-1,-.25,0,.25,1].entries())
      expect(pcm.left[i]).toBeCloseTo(value,5);
    const file=new File([buffer],'test.aiff',{type:'audio/aiff'});
    const clip=await decodeLoopFile(file,48000);
    expect(clip.left[1]).toBeCloseTo(-.25,5);
    expect(clip.right[3]).toBeCloseTo(-.5,5);
  });

  it('imports AIFF into FOUND at 24 kHz without requiring audio metadata or browser codecs',async()=>{
    const samples=new Float32Array(48000).fill(.12);
    const recorder=new PcmRecording(48000,'aiff');
    recorder.append(samples,samples,48000);
    const file=new File([await recorder.finish().blob.arrayBuffer()],
      'recording.aiff',{type:'audio/aiff'});
    const result=await decodeFound(file,'local:pcm-aiff','recording.aiff');
    expect(result.sampleRate).toBe(24000);
    expect(result.left.length).toBe(24000);
    expect(result.left[12000]).toBeCloseTo(.12,3);
    expect(result.right[12000]).toBeCloseTo(.12,3);
  });

  it('rejects truncated, unsupported and over-limit AIFF before allocating audio',async()=>{
    const recorder=new PcmRecording(48000,'aiff');
    recorder.append(Float32Array.of(.1,.2),Float32Array.of(.1,.2),2);
    const bytes=await recorder.finish().blob.arrayBuffer();
    expect(()=>decodeAiff(bytes.slice(0,49))).toThrow();
    const long=bytes.slice(0),view=new DataView(long);
    view.setUint32(22,48000*70,false);
    expect(()=>decodeAiff(long,60)).toThrow('60 second');
    view.setUint32(22,2,false);view.setUint16(26,8,false);
    expect(()=>decodeAiff(long)).toThrow('PCM16/24/32');
  });

  it('normalizes only sinc overshoot, keeping valid square-wave imports below full scale',()=>{
    const frames=48000,input=Float32Array.from({length:frames},(_,i)=>i%24<12?.95:-.95);
    const result=resampleStereo({sampleRate:48000,left:input,right:input.slice()},44100);
    const peak=Math.max(...result.left.slice(0,2000));
    expect(result.left.every(v=>Number.isFinite(v)&&Math.abs(v)<=1)).toBe(true);
    expect(result.right.every(v=>Number.isFinite(v)&&Math.abs(v)<=1)).toBe(true);
    expect(peak).toBeLessThanOrEqual(1);
  });
  it('preserves same-rate WAV samples and uses low-pass resampling for rate conversion',async()=>{
    const input={kind:'loopAudio' as const,sampleRate:48000,
      left:Float32Array.from({length:2000},(_,i)=>i%2?-.9:.9),
      right:Float32Array.from({length:2000},(_,i)=>i%2?.9:-.9)};
    const bytes=await encodeWav(input).arrayBuffer();
    const original=decodeWav(bytes,48000),down=decodeWav(bytes,24000);
    expect(original.left[300]).toBeCloseTo(.9,4);
    expect(down.left.length).toBe(1000);
    const interior=down.left.slice(100,900);
    const rms=Math.sqrt(interior.reduce((s,x)=>s+x*x,0)/interior.length);
    expect(rms).toBeLessThan(.06);
    expect(down.left.every(Number.isFinite)).toBe(true);
    const pass=resampleStereo({sampleRate:48000,left:input.left,right:input.right},48000);
    expect(pass.left).toBe(input.left);
  });

  it('imports MP3 via browser decoding, with a duration check before allocation',async()=>{
    vi.spyOn(URL,'createObjectURL').mockReturnValue('blob:sample');
    vi.spyOn(URL,'revokeObjectURL').mockImplementation(()=>{});
    const original=document.createElement.bind(document);
    vi.spyOn(document,'createElement').mockImplementation(((tag:string)=>{
      const el=original(tag);
      if(tag==='audio'){
        Object.defineProperty(el,'duration',{get:()=>1});
        queueMicrotask(()=>el.dispatchEvent(new Event('loadedmetadata')));
      }
      return el;
    }) as typeof document.createElement);
    const decode=vi.fn(async()=>({
      duration:1,numberOfChannels:1,
      getChannelData:()=>new Float32Array(24000).fill(.07)
    }));
    class Offline{
      constructor(_channels:number,_frames:number,rate:number){expect(rate).toBe(24000);}
      decodeAudioData=decode;
    }
    vi.stubGlobal('OfflineAudioContext',Offline);
    const file=new File(['fake mp3'],'test.mp3',{type:'audio/mpeg'});
    const clip=await decodeLoopFile(file,24000);
    expect(decode).toHaveBeenCalledOnce();
    expect(clip.left.length).toBe(24000);
    expect(clip.right).toEqual(clip.left);
  });

  it('CLEAN output uses a consistent 5 Hz high-pass and preserves CLASSIC behavior',()=>{
    const measure=(rate:number,mode?:string)=>{
      const state=createModule('OUTPUT',0,0,17,'out');state.mode=mode;
      const output=new Output(state,rate,8);
      let energy=0;
      for(let i=0;i<rate*2;i++){
        const input=Math.sin(2*Math.PI*20*i/rate)*.1;
        output.inputL[0]=output.inputR[0]=input;output.process();
        if(i>=rate)energy+=output.outputL[0]**2;
      }
      return Math.sqrt(energy/rate);
    };
    const classic=measure(48000),clean48=measure(48000,'CLEAN'),
      clean44=measure(44100,'CLEAN');
    expect(clean48).toBeGreaterThan(classic*1.5);
    expect(Math.abs(clean48-clean44)/clean48).toBeLessThan(.015);
  });
});
