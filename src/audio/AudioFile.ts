/**
 * Browser-local audio import utilities. All allocation and resampling happen outside
 * AudioWorklet. PCM AIFF is decoded here because browser codec support varies.
 */
import type {LoopAudio} from './LoopAudio';
import {LOOP_SECONDS} from './LoopAudio';
import {decodeWav} from './Wav';
import {resampleStereo} from './Resample';
import type {StereoPcm} from './Resample';

const MAX_FILE_BYTES=32_000_000;
// Generous deadline for iPhone Files/Box-backed media metadata, distinct from the file-copy timeout.
export const CLOUD_METADATA_TIMEOUT_MS=40_000;


function tag(view:DataView,at:number):string{
  return String.fromCharCode(view.getUint8(at),view.getUint8(at+1),view.getUint8(at+2),view.getUint8(at+3));
}
export function isAiff(bytes:ArrayBuffer):boolean{
  if(bytes.byteLength<12)return false;
  const v=new DataView(bytes);
  return tag(v,0)==='FORM'&&(tag(v,8)==='AIFF'||tag(v,8)==='AIFC');
}

/** Supports uncompressed AIFF and AIFF-C NONE/sowt/fl32, including our own PCM24 AIFF exports. */
export function decodeAiff(bytes:ArrayBuffer,maxSeconds=60):StereoPcm{
  if(!isAiff(bytes))throw Error('Use an uncompressed AIFF/AIFF-C audio file.');
  if(bytes.byteLength>MAX_FILE_BYTES)throw Error('Use an audio file smaller than 32 MB.');
  const v=new DataView(bytes),size=v.getUint32(4,false),formEnd=8+size;
  if(formEnd>bytes.byteLength||formEnd<12)throw Error('Truncated AIFF file.');
  const aifc=tag(v,8)==='AIFC';
  let channels=0,frames=0,bits=0,rate=0,compression='NONE',littleEndian=false;
  let data=-1,dataEnd=0;
  for(let p=12;p+8<=formEnd;){
    const name=tag(v,p),length=v.getUint32(p+4,false),start=p+8,end=start+length;
    if(end>formEnd)throw Error('Truncated AIFF chunk.');
    if(name==='COMM'){
      if(length<(aifc?22:18))throw Error('Invalid AIFF common chunk.');
      channels=v.getUint16(start,false);frames=v.getUint32(start+2,false);
      bits=v.getUint16(start+6,false);
      const encodedExponent=v.getUint16(start+8,false);
      const exponent=encodedExponent&0x7fff;
      const mantissa=v.getBigUint64(start+10,false);
      rate=Math.round(Number(mantissa)*Math.pow(2,exponent-16383-63));
      if(aifc)compression=tag(v,start+18);
      littleEndian=compression==='sowt';
    }else if(name==='SSND'){
      if(length<8)throw Error('Invalid AIFF sound chunk.');
      const offset=v.getUint32(start,false);
      data=start+8+offset;dataEnd=end;
      if(data>dataEnd)throw Error('Invalid AIFF sound offset.');
    }
    p=end+(length&1);
  }
  if(channels<1||channels>2||frames<2||![16,24,32].includes(bits)||
    !Number.isFinite(rate)||rate<8000||rate>192000||
    !['NONE','sowt','fl32','FL32'].includes(compression)||
    (compression==='fl32'||compression==='FL32')&&bits!==32){
    throw Error('AIFF import supports mono/stereo PCM16/24/32 or float32 only.');
  }
  if(frames/rate>maxSeconds)throw Error('Audio exceeds the '+maxSeconds+' second limit.');
  const alignment=channels*bits/8;
  if(data<0||data+frames*alignment>dataEnd)throw Error('Truncated AIFF audio data.');
  const left=new Float32Array(frames),right=new Float32Array(frames);
  const read=(at:number)=>{
    if(compression==='fl32'||compression==='FL32')return v.getFloat32(at,false);
    if(bits===16)return v.getInt16(at,littleEndian)/32768;
    if(bits===24){
      return (littleEndian
        ? (v.getUint8(at)|(v.getUint8(at+1)<<8)|(v.getInt8(at+2)<<16))
        : ((v.getInt8(at)<<16)|(v.getUint8(at+1)<<8)|v.getUint8(at+2)))/8388608;
    }
    return v.getInt32(at,littleEndian)/2147483648;
  };
  for(let i=0;i<frames;i++){
    const p=data+i*alignment,l=read(p),r=channels===2?read(p+bits/8):l;
    if(!Number.isFinite(l)||!Number.isFinite(r))throw Error('AIFF contains invalid samples.');
    left[i]=Math.max(-1,Math.min(1,l));right[i]=Math.max(-1,Math.min(1,r));
  }
  return{sampleRate:rate,left,right};
}

/** Compressed formats are decoded by the browser; no extra codec download is required. */
export async function preflightAudioDuration(blob:Blob,maxSeconds:number,options:{allowUnknown?:boolean;timeoutMs?:number}={}):Promise<void>{
  await new Promise<void>((resolve,reject)=>{
    const el=document.createElement('audio'),url=URL.createObjectURL(blob);
    let done=false;
    const finish=(error?:Error)=>{
      if(done)return;done=true;clearTimeout(timer);
      el.onloadedmetadata=el.onerror=null;el.removeAttribute('src');el.load();
      URL.revokeObjectURL(url);error?reject(error):resolve();
    };
    const timer=setTimeout(()=>finish(options.allowUnknown?undefined:Error('Could not read audio duration.')),options.timeoutMs??CLOUD_METADATA_TIMEOUT_MS);
    el.preload='metadata';
    el.onloadedmetadata=()=>finish(!Number.isFinite(el.duration)&&options.allowUnknown
      ?undefined:Number.isFinite(el.duration)&&el.duration>=.01&&el.duration<=maxSeconds
      ?undefined:Error('Use audio between 0.01 and '+maxSeconds+' seconds.'));
    el.onerror=()=>finish(options.allowUnknown?undefined:Error('This browser cannot read the audio format. Try WAV or uncompressed AIFF.'));
    el.src=url;
  });
}
export async function decodeLoopFile(file:Blob,targetRate:number):Promise<LoopAudio>{
  if(!file.size||file.size>MAX_FILE_BYTES)throw Error('Use an audio file smaller than 32 MB.');
  if(!Number.isInteger(targetRate)||targetRate<8000||targetRate>192000)throw Error('Invalid recording sample rate.');
  const header=await file.slice(0,12).arrayBuffer();
  if(isAiff(header)){
    const aiff=decodeAiff(await file.arrayBuffer(),LOOP_SECONDS);
    return{kind:'loopAudio',...resampleStereo(aiff,targetRate)};
  }
  if(header.byteLength>=12&&tag(new DataView(header),0)==='RIFF'&&tag(new DataView(header),8)==='WAVE'){
    return decodeWav(await file.arrayBuffer(),targetRate);
  }
  // Small compressed clips may decode even when iOS fails the separate metadata probe.
  const small=file.size<=4_000_000;
  await preflightAudioDuration(file,LOOP_SECONDS,{allowUnknown:small,timeoutMs:small?8000:CLOUD_METADATA_TIMEOUT_MS});
  if(typeof OfflineAudioContext==='undefined')throw Error('Audio decoding is unavailable in this browser.');
  const ctx=new OfflineAudioContext(2,1,targetRate);
  let audio:AudioBuffer;
  try{audio=await ctx.decodeAudioData(await file.arrayBuffer());}
  catch{throw Error('This browser cannot decode this audio file. Try WAV or uncompressed AIFF.');}
  if(audio.duration>LOOP_SECONDS||audio.duration<.01||audio.numberOfChannels<1||audio.numberOfChannels>2)
    throw Error('Use mono/stereo audio up to 16 seconds.');
  return{kind:'loopAudio',sampleRate:targetRate,left:audio.getChannelData(0).slice(),
    right:audio.getChannelData(audio.numberOfChannels===1?0:1).slice()};
}
