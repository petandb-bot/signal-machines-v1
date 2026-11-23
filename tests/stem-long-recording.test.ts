import {describe,it,expect} from 'vitest';
import {unzipSync} from 'fflate';
import {StemRecording} from '../src/audio/StemRecording';
import {PcmRecording,recordingFrames,PCM_BYTES_LIMIT,STEM_BYTES_LIMIT,MAX_RECORD_SECONDS} from '../src/audio/PcmRecording';
import {crc32Parts,zipBlobs} from '../src/audio/ZipArchive';
import {MasterCapture} from '../src/audio/MasterCapture';
import {DSPGraph} from '../src/audio/DSPGraph';
import {createModule} from '../src/graph/PatchGraph';
import {emptyPatch} from '../src/state/presets';
import {decodeWav} from '../src/audio/Wav';

describe('synchronized stem recording and long master takes',()=>{
 it('makes 10-minute maximum and bounded per-output track budgets at 44.1, 48, 96k',()=>{
   for(const rate of [44100,48000,96000]){
     const master=recordingFrames(rate);
     expect(master).toBeGreaterThan(rate*180);
     expect(master).toBeLessThanOrEqual(rate*MAX_RECORD_SECONDS);
     expect(master*6).toBeLessThanOrEqual(PCM_BYTES_LIMIT);
     for(let count=2;count<=4;count++){
       const each=recordingFrames(rate,count,'stems');
       expect(each).toBeGreaterThan(0);
       expect(each).toBeLessThanOrEqual(rate*MAX_RECORD_SECONDS);
       expect(each*6*count).toBeLessThanOrEqual(STEM_BYTES_LIMIT);
     }
   }
 });
 it('exports two time-aligned stereo 24-bit WAVs in a readable ZIP without duplicate streams',async()=>{
   const stems=new StemRecording(48000,['lead-out','rhythm-out']);
   const l=Float32Array.of(.12,-.33,.25,.5,.08),r=Float32Array.of(-.1,.4,-.2,.03,0);
   stems.append('lead-out',l,r,5);
   stems.append('rhythm-out',r,l,3);
   expect(stems.end('lead-out')).toBe(false);
   expect(stems.end('rhythm-out')).toBe(true);
   const result=stems.finish();
   expect(result.extension).toBe('zip');
   const buffer=new Uint8Array(await result.blob.arrayBuffer());
   const files=unzipSync(buffer);
   expect(Object.keys(files).sort()).toEqual(['01_lead-out.wav','02_rhythm-out.wav','STEMS_README.txt']);
   const a=files['01_lead-out.wav'],b=files['02_rhythm-out.wav'];
   expect(new DataView(a.buffer,a.byteOffset).getUint16(22,true)).toBe(2);
   expect(new DataView(a.buffer,a.byteOffset).getUint16(34,true)).toBe(24);
   expect(a.length).toBe(b.length);
   expect(a.length).toBe(44+5*6);
   const left=decodeWav(a.slice().buffer,48000),right=decodeWav(b.slice().buffer,48000);
   expect(left.left).toHaveLength(5);expect(right.left).toHaveLength(5);
   expect(right.left[3]).toBe(0);expect(right.left[4]).toBe(0);
   expect(new TextDecoder().decode(files['STEMS_README.txt'])).toContain('before the final global master');
 });
 it('rejects more than four stem outputs and malformed names',()=>{
   expect(()=>new StemRecording(48000,['a'])).toThrow('2–4');
   expect(()=>new StemRecording(48000,['a','a'])).toThrow('2–4');
   expect(()=>new StemRecording(48000,['a','b','c','d','e'])).toThrow('2–4');
   expect(()=>new StemRecording(48000,['a/b','c'])).toThrow('2–4');
 });
 it('ZIP CRC32 and stored boundaries are correct even for embedded zero bytes',async()=>{
   expect(crc32Parts([new TextEncoder().encode('123456789')])).toBe(0xcbf43926);
   const data=new Uint8Array([0,0,1,0,255,128]),blob=zipBlobs([{name:'take.wav',blob:new Blob([data]),checksum:crc32Parts([data])}]);
   expect(unzipSync(new Uint8Array(await blob.arrayBuffer()))['take.wav']).toEqual(data);
 });
 it('recording capture limits and short packets remain bounded with two stems',()=>{
   let one:MasterCapture,two:MasterCapture;
   const counts=new Map<string,number>();
   const onFrame=(data:unknown)=>{
     const e=data as {type:string;id:number;trackId?:string;frames?:number;left?:Float32Array<ArrayBuffer>;right?:Float32Array<ArrayBuffer>};
     if(e.type==='recordData'){
       counts.set(e.trackId!, (counts.get(e.trackId!)??0)+e.frames!);
       (e.trackId==='a'?one:two).recycle(e.id,e.left!,e.right!);
     }
   };
   one=new MasterCapture(onFrame);two=new MasterCapture(onFrame);
   one.start(7,48000,{mode:'stems',tracks:2,trackId:'a'});
   two.start(7,48000,{mode:'stems',tracks:2,trackId:'b'});
   const x=new Float32Array(193);
   for(let i=0;i<61;i++){one.push(x,x);two.push(x,x);}
   one.stop();two.stop();
   expect(counts.get('a')).toBe(193*61);
   expect(counts.get('b')).toBe(193*61);
 });
 it('taps two OUTPUTs in one pass while normal stereo master output remains unchanged',()=>{
   const patch=emptyPatch();
   const a=createModule('OSC',0,0,11,'osc-a'),b=createModule('OSC',0,100,12,'osc-b');
   a.params.tune=.2;b.params.tune=.44;
   const outA=createModule('OUTPUT',200,0,13,'out-a'),outB=createModule('OUTPUT',200,100,14,'out-b');
   patch.modules=[a,b,outA,outB];
   patch.connections=[
     {id:'one',from:{module:'osc-a',port:'audio'},to:{module:'out-a',port:'audio'}},
     {id:'two',from:{module:'osc-b',port:'audio'},to:{module:'out-b',port:'audio'}},
   ];
   const normal=new DSPGraph(48000),stems=new DSPGraph(48000);
   normal.setPatch(patch);stems.setPatch(patch);
   stems.activateStemTaps(['out-a','out-b']);
   const ml=new Float32Array(128),mr=new Float32Array(128),sl=new Float32Array(128),sr=new Float32Array(128);
   for(let i=0;i<20;i++){
     normal.process(ml,mr);stems.process(sl,sr);
     expect(sl).toEqual(ml);expect(sr).toEqual(mr);
   }
   const taps=stems.getStemTaps();
   expect(taps).toHaveLength(2);
   expect(taps[0].left.some(x=>x!==0)).toBe(true);
   expect(taps[1].left.some(x=>x!==0)).toBe(true);
   const before=taps[0].left.slice();
   stems.deactivateStemTaps();stems.process(sl,sr);
   expect(stems.getStemTaps()).toHaveLength(0);
   expect(before.some(x=>x!==0)).toBe(true);
 });
 it('does not interrupt live DSP if a recorded OUTPUT is removed during a take',()=>{
   const patch=emptyPatch(),osc=createModule('OSC',0,0,11,'o'),a=createModule('OUTPUT',100,0,12,'a'),b=createModule('OUTPUT',200,0,13,'b');
   patch.modules=[osc,a,b];patch.connections=[{id:'one',from:{module:'o',port:'audio'},to:{module:'a',port:'audio'}}];
   const graph=new DSPGraph(44100);graph.setPatch(patch);
   graph.activateStemTaps(['a','b']);
   const copy={...patch,modules:[osc,a],connections:patch.connections};
   graph.setPatch(copy,true);
   const l=new Float32Array(128),r=new Float32Array(128);
   for(let i=0;i<20;i++)graph.process(l,r);
   expect(graph.getStemFault()).toContain('OUTPUT');
   expect(graph.faults).toBe(0);
 });
});
