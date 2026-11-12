import {describe,it,expect} from 'vitest';
import {PcmRecording,recordingFrames} from '../src/audio/PcmRecording';
import {MasterCapture} from '../src/audio/MasterCapture';
import {decodeWav} from '../src/audio/Wav';
describe('lossless master file encoding and bounded capture',()=>{
  it.each([44100,48000,96000])('writes real stereo PCM24 WAV at %s Hz, reusable by LOOP',async rate=>{
    const recording=new PcmRecording(rate,'wav'),left=Float32Array.of(-1,-.123456,0,.234567,1),right=Float32Array.of(1,.5,-.5,0,-1);
    recording.append(left,right,3);recording.append(left.subarray(3),right.subarray(3),2);
    const result=recording.finish(),bytes=await result.blob.arrayBuffer(),v=new DataView(bytes);
    expect(result.extension).toBe('wav');expect(result.blob.type).toBe('audio/wav');expect(v.getUint16(34,true)).toBe(24);expect(v.getUint32(24,true)).toBe(rate);expect(v.getUint32(40,true)).toBe(30);
    const decoded=decodeWav(bytes,rate);for(let i=0;i<5;i++){expect(decoded.left[i]).toBeCloseTo(left[i],6);expect(decoded.right[i]).toBeCloseTo(right[i],6);}
  });
  it.each([44100,48000,96000])('writes big-endian AIFF PCM24 and a valid extended %s Hz sample rate',async rate=>{
    const recording=new PcmRecording(rate,'aiff');recording.append(Float32Array.of(-1,0,1),Float32Array.of(.5,-.5,0),3);
    const result=recording.finish(),bytes=await result.blob.arrayBuffer(),v=new DataView(bytes),tag=(p:number)=>new TextDecoder().decode(bytes.slice(p,p+4));
    expect(tag(0)).toBe('FORM');expect(tag(8)).toBe('AIFF');expect(tag(12)).toBe('COMM');expect(tag(38)).toBe('SSND');expect(v.getUint32(4)).toBe(bytes.byteLength-8);expect(v.getUint32(22)).toBe(3);expect(v.getUint16(26)).toBe(24);
    const exponent=v.getUint16(28)-16383,rateRead=Number(v.getBigUint64(30))*Math.pow(2,exponent-63);expect(rateRead).toBe(rate);
    expect(Array.from(new Uint8Array(bytes,54,6))).toEqual([128,0,0,64,0,0]);expect(result.blob.type).toBe('audio/aiff');expect(result.extension).toBe('aiff');
  });
  it('rejects empty, invalid or oversize material without accepting a corrupt chunk',()=>{
    const recording=new PcmRecording(48000,'wav');expect(()=>recording.finish()).toThrow('No audio');expect(()=>recording.append(Float32Array.of(NaN),Float32Array.of(0),1)).toThrow('sample');expect(recording.frames).toBe(0);expect(()=>recording.append(new Float32Array(1),new Float32Array(1),2)).toThrow('block');expect(()=>new PcmRecording(0,'wav')).toThrow('rate');expect(recordingFrames(48000)).toBeLessThanOrEqual(48000*180);expect(recordingFrames(192000)*6).toBeLessThanOrEqual(48*1024*1024);
  });
  it('captures exact variable-block samples and flushes the partial last block before end',()=>{
    const events:Array<{type:string;left?:Float32Array;right?:Float32Array;frames?:number}>=[],capture=new MasterCapture(data=>events.push(data as typeof events[number]));capture.start(1,48000);
    const left=Float32Array.from({length:9000},(_,i)=>Math.sin(i*.1)*.2),right=left.map(n=>-n);
    for(let p=0;p<9000;p+=193)capture.push(left.subarray(p,p+193),right.subarray(p,p+193));capture.stop();
    const data=events.filter(e=>e.type==='recordData');expect(data.map(e=>e.frames)).toEqual([8192,808]);expect(events.at(-1)!.type).toBe('recordEnd');let p=0;for(const block of data)for(let i=0;i<block.frames!;i++,p++){expect(block.left![i]).toBe(left[p]);expect(block.right![i]).toBe(right[p]);}
  });
  it('recycles transferred blocks and stops with saved data when the consumer stalls',()=>{
    let capture:MasterCapture,blocks=0;capture=new MasterCapture((data,transfer)=>{const event=structuredClone(data,{transfer}) as {type:string;id:number;left:Float32Array<ArrayBuffer>;right:Float32Array<ArrayBuffer>};if(event.type==='recordData'){blocks++;capture.recycle(event.id,event.left,event.right);}});capture.start(7,48000);
    for(let i=0;i<30;i++)capture.push(new Float32Array(8192),new Float32Array(8192));expect(capture.active).toBe(true);expect(blocks).toBe(30);capture.stop();
    const events:unknown[]=[],stalled=new MasterCapture(data=>events.push(data));stalled.start(8,48000);for(let i=0;i<10;i++)stalled.push(new Float32Array(8192),new Float32Array(8192));expect(stalled.active).toBe(false);expect((events.at(-1) as {reason:string}).reason).toContain('keep up');expect(events.filter(e=>(e as {type:string}).type==='recordData')).toHaveLength(8);
  });
  it('finishes automatically at its duration limit',()=>{
    let capture:MasterCapture,last='';capture=new MasterCapture(data=>{const event=data as {type:string;id:number;left:Float32Array<ArrayBuffer>;right:Float32Array<ArrayBuffer>;reason:string};if(event.type==='recordData')capture.recycle(event.id,event.left,event.right);else last=event.reason;});capture.start(3,8000);const zero=new Float32Array(8192);for(let i=0;i<180;i++)capture.push(zero,zero);expect(capture.active).toBe(false);expect(last).toContain('limit');
  });
});
