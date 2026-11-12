import {LOOP_SECONDS} from './LoopAudio';
import type {LoopAudio} from './LoopAudio';
export function encodeWav(clip:LoopAudio):Blob{
  const frames=clip.left.length;if(!frames||frames!==clip.right.length)throw new Error('Invalid stereo loop.');
  const bytes=new ArrayBuffer(44+frames*4),view=new DataView(bytes);const text=(p:number,s:string)=>{for(let i=0;i<s.length;i++)view.setUint8(p+i,s.charCodeAt(i));};
  text(0,'RIFF');view.setUint32(4,36+frames*4,true);text(8,'WAVE');text(12,'fmt ');view.setUint32(16,16,true);view.setUint16(20,1,true);view.setUint16(22,2,true);view.setUint32(24,clip.sampleRate,true);view.setUint32(28,clip.sampleRate*4,true);view.setUint16(32,4,true);view.setUint16(34,16,true);text(36,'data');view.setUint32(40,frames*4,true);
  for(let i=0;i<frames;i++)for(let c=0;c<2;c++){const n=c===0?clip.left[i]:clip.right[i];if(!Number.isFinite(n))throw new Error('Invalid audio sample.');view.setInt16(44+(i*2+c)*2,Math.round(Math.max(-1,Math.min(1,n))*(n<0?32768:32767)),true);}
  return new Blob([bytes],{type:'audio/wav'});
}
export function decodeWav(bytes:ArrayBuffer,targetRate:number):LoopAudio{
  if(bytes.byteLength<44||bytes.byteLength>32_000_000)throw new Error('Use a WAV file up to 16 seconds and 32 MB.');
  const view=new DataView(bytes),tag=(p:number)=>String.fromCharCode(view.getUint8(p),view.getUint8(p+1),view.getUint8(p+2),view.getUint8(p+3));
  if(tag(0)!=='RIFF'||tag(8)!=='WAVE')throw new Error('Use an uncompressed PCM16/24 or float32 WAV file.');
  let format=0,channels=0,rate=0,bits=0,alignment=0,data=-1,size=0;
  for(let p=12;p+8<=bytes.byteLength;){const name=tag(p),length=view.getUint32(p+4,true),end=p+8+length;if(end>bytes.byteLength)throw new Error('Truncated WAV chunk.');
    if(name==='fmt '){if(length<16)throw new Error('Invalid WAV format.');format=view.getUint16(p+8,true);channels=view.getUint16(p+10,true);rate=view.getUint32(p+12,true);alignment=view.getUint16(p+20,true);bits=view.getUint16(p+22,true);}
    else if(name==='data'){data=p+8;size=length;}
    p=end+(length%2);
  }
  if(!((format===1&&(bits===16||bits===24))||(format===3&&bits===32))||channels<1||channels>2||rate<8000||rate>192000||alignment!==channels*bits/8||data<0||size%alignment)throw new Error('Use mono/stereo PCM16/24 or float32 WAV audio.');
  const frames=size/alignment;if(frames<2||frames/rate>LOOP_SECONDS||!Number.isFinite(targetRate)||!Number.isInteger(targetRate)||targetRate<8000||targetRate>192000)throw new Error('WAV recordings must be between two frames and 16 seconds.');
  const read=(i:number,c:number)=>{const p=data+i*alignment+Math.min(c,channels-1)*bits/8;const n=format===1?(bits===16?view.getInt16(p,true)/32768:(view.getUint8(p)|(view.getUint8(p+1)<<8)|(view.getInt8(p+2)<<16))/8388608):view.getFloat32(p,true);if(!Number.isFinite(n))throw new Error('WAV contains invalid samples.');return Math.max(-1,Math.min(1,n));};
  const count=Math.max(2,Math.round(frames/rate*targetRate)),left=new Float32Array(count),right=new Float32Array(count);
  for(let i=0;i<count;i++){const p=Math.min(frames-1,i*rate/targetRate),index=Math.floor(p),next=Math.min(frames-1,index+1),f=p-index;left[i]=read(index,0)*(1-f)+read(next,0)*f;right[i]=read(index,1)*(1-f)+read(next,1)*f;}
  return{kind:'loopAudio',sampleRate:targetRate,left,right};
}
