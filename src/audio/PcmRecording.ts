export type RecordingFormat='browser'|'wav'|'aiff';
export const PCM_BYTES_LIMIT=48*1024*1024;
export const recordingFrames=(rate:number)=>Math.min(Math.floor(rate*180),Math.floor(PCM_BYTES_LIMIT/6));
/** Interleaved signed PCM24; chunks avoid copying a whole performance at finish. */
export class PcmRecording {
  private chunks:Uint8Array<ArrayBuffer>[]=[];frames=0;
  constructor(readonly sampleRate:number,readonly format:'wav'|'aiff'){if(!Number.isInteger(sampleRate)||sampleRate<8000||sampleRate>192000)throw new Error('Invalid recording sample rate.');}
  append(left:Float32Array,right:Float32Array,frames:number){
    if(!Number.isInteger(frames)||frames<0||frames>left.length||frames>right.length||this.frames+frames>recordingFrames(this.sampleRate))throw new Error('Invalid recording block.');
    const bytes=new Uint8Array(frames*6);let p=0;
    for(let i=0;i<frames;i++)for(let c=0;c<2;c++){
      const value=c?right[i]:left[i];if(!Number.isFinite(value))throw new Error('Invalid recorded sample.');
      const n=Math.round(Math.max(-1,Math.min(1,value))*(value<0?8388608:8388607));
      if(this.format==='wav'){bytes[p++]=n;bytes[p++]=n>>8;bytes[p++]=n>>16;}
      else{bytes[p++]=n>>16;bytes[p++]=n>>8;bytes[p++]=n;}
    }
    this.chunks.push(bytes);this.frames+=frames;
  }
  finish(){
    if(!this.frames)throw new Error('No audio was recorded.');
    const data=this.frames*6,header=new ArrayBuffer(this.format==='wav'?44:54),v=new DataView(header);
    const tag=(p:number,s:string)=>{for(let i=0;i<s.length;i++)v.setUint8(p+i,s.charCodeAt(i));};
    if(this.format==='wav'){
      tag(0,'RIFF');v.setUint32(4,36+data,true);tag(8,'WAVE');tag(12,'fmt ');v.setUint32(16,16,true);v.setUint16(20,1,true);v.setUint16(22,2,true);v.setUint32(24,this.sampleRate,true);v.setUint32(28,this.sampleRate*6,true);v.setUint16(32,6,true);v.setUint16(34,24,true);tag(36,'data');v.setUint32(40,data,true);
    }else{
      tag(0,'FORM');v.setUint32(4,46+data);tag(8,'AIFF');tag(12,'COMM');v.setUint32(16,18);v.setUint16(20,2);v.setUint32(22,this.frames);v.setUint16(26,24);
      const exponent=Math.floor(Math.log2(this.sampleRate));v.setUint16(28,16383+exponent);v.setBigUint64(30,BigInt(this.sampleRate)*2n**BigInt(63-exponent));
      tag(38,'SSND');v.setUint32(42,data+8);v.setUint32(46,0);v.setUint32(50,0);
    }
    const blob=new Blob([header,...this.chunks],{type:this.format==='wav'?'audio/wav':'audio/aiff'});this.chunks=[];
    return{blob,extension:this.format};
  }
}
