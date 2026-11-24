import {DSPModule,clamp} from '../DSPModule';

/**
 * True time reversal needs completed audio. Two bounded stereo banks alternate:
 * one records the current segment, the other plays the previous segment backwards.
 * No allocations occur in process(), and neither the live input nor the recorder is
 * touched by the playback reader.
 */
export class Reverse extends DSPModule {
  private static readonly MAX_SECONDS=2.5;
  private readonly capacity=Math.ceil(this.sampleRate*Reverse.MAX_SECONDS)+2;
  private readonly left=[new Float32Array(this.capacity),new Float32Array(this.capacity)];
  private readonly right=[new Float32Array(this.capacity),new Float32Array(this.capacity)];
  private writeBank=0;
  private readBank=1;
  private written=0;
  private windowFrames=0;
  private readFrames=0;
  private readCursor=0;
  private wet=0;
  private gate=false;
  private latched=false;
  private previousMode='REVERSE';
  private energy=0;
  private readonly wetSlew=1-Math.exp(-1/(this.sampleRate*.002));

  override command(action:string){
    if(action==='flip'){
      this.latched=!this.latched;
      return{reverse:this.latched};
    }
    if(action==='reset'){
      this.written=this.readFrames=this.windowFrames=0;
      this.writeBank=0;this.readBank=1;
      this.readCursor=0;
      this.gate=false;this.energy=0;
      this.latched=false;
      this.wet=0;
      // Do not clear large buffers on the audio callback; validity is tracked by readFrames.
      return{reverse:false};
    }
    throw Error('Unknown REVERSE action.');
  }

  private read(buffer:Float32Array,position:number,length:number){
    // Linear interpolation permits slower/faster reverse playback without a resampler.
    const p=(position%length+length)%length;
    const i=Math.floor(p),fraction=p-i;
    return buffer[i]*(1-fraction)+buffer[(i+1)%length]*fraction;
  }

  process(sample:number){
    const mode=this.selectedMode??'REVERSE';
    const flipped=this.inputL[1]>.5;
    if(mode==='FLIP'&&flipped&&!this.gate){
      this.latched=!this.latched;
      this.triggerSample=sample;
    }
    this.gate=flipped;
    if(mode!==this.previousMode&&mode==='FLIP')this.latched=false;
    this.previousMode=mode;
    const reverse=mode==='FLIP'?this.latched:mode==='GATE'?this.inputL[2]>.5:true;

    // Incoming SPAN CV is evaluated at the next segment boundary, not mid-slice.
    const window=this.control(0,3);
    if(!this.windowFrames)this.windowFrames=Math.max(16,Math.min(this.capacity-2,Math.round(this.sampleRate*(.05+2.4*window*window))));
    const inputL=Number.isFinite(this.inputL[0])?this.inputL[0]:0;
    const inputR=Number.isFinite(this.inputR[0])?this.inputR[0]:0;
    this.left[this.writeBank][this.written]=inputL;
    this.right[this.writeBank][this.written]=inputR;

    let reverseL=0,reverseR=0;
    let seam=0;
    if(this.readFrames>1){
      const fadeSamples=Math.max(1,Math.round(this.sampleRate*(.0006+.02*this.parameters[3]*this.parameters[3])));
      const envelope=clamp(Math.min(this.readCursor,this.readFrames-1-this.readCursor)/fadeSamples,0,1);
      reverseL=this.read(this.left[this.readBank],this.readCursor,this.readFrames)*envelope;
      reverseR=this.read(this.right[this.readBank],this.readCursor,this.readFrames)*envelope;
      const step=.25*Math.pow(16,this.parameters[1]); // 0.25–4x, midpoint = 1x.
      this.readCursor-=step;
      if(this.readCursor<0){
        this.readCursor=(this.readCursor%this.readFrames+this.readFrames)%this.readFrames;
      }
      this.phase=this.readCursor/this.readFrames;
    }
    const target=reverse&&this.readFrames>1?this.parameters[2]:0;
    this.wet+=(target-this.wet)*this.wetSlew;
    this.outputL[0]=inputL*(1-this.wet)+reverseL*this.wet;
    this.outputR[0]=inputR*(1-this.wet)+reverseR*this.wet;

    this.written++;
    if(this.written>=this.windowFrames){
      this.readBank=this.writeBank;
      this.readFrames=this.windowFrames;
      this.readCursor=this.readFrames-1;
      this.writeBank=1-this.writeBank;
      this.written=0;this.windowFrames=0;
      seam=reverse?1:0;
      if(seam)this.triggerSample=sample;
    }
    this.outputL[1]=this.outputR[1]=seam;
    this.energy+=(Math.abs(this.outputL[0])+Math.abs(this.outputR[0])-this.energy)*.002;
    this.outputL[2]=this.outputR[2]=clamp(this.energy*3,0,1);
    this.a=this.readFrames>1?this.readCursor/this.readFrames:0;
    this.b=this.wet;
    this.envelope=clamp(this.energy*3,0,1);
  }
}
