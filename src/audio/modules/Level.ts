import {DSPModule,clamp} from '../DSPModule';
/** Stereo-linked, soft-knee downward compression. No makeup gain or noise floor lift. */
export class Level extends DSPModule{
  private gain=1;private amount=this.parameters[1];private detector=0;private reduction=1;
  private readonly slew=1-Math.exp(-1/(this.sampleRate*.008));private readonly attack=1-Math.exp(-1/(this.sampleRate*.005));private readonly release=1-Math.exp(-1/(this.sampleRate*.18));private readonly gainRelease=1-Math.exp(-1/(this.sampleRate*.04));
  process(){
    this.gain+=(Math.pow(10,(-12+36*this.parameters[0])/20)-this.gain)*this.slew;this.amount+=(this.parameters[1]-this.amount)*this.slew;
    const l=Number.isFinite(this.inputL[0])?clamp(this.inputL[0],-1e6,1e6)*this.gain:0,r=Number.isFinite(this.inputR[0])?clamp(this.inputR[0],-1e6,1e6)*this.gain:0,peak=Math.max(Math.abs(l),Math.abs(r));
    this.detector+=(peak-this.detector)*(peak>this.detector?this.attack:this.release);
    const over=20*Math.log10(Math.max(1e-12,this.detector)/.2),ratio=1+this.amount*3,knee=over<=-3?0:over>=3?over:(over+3)**2/12,target=Math.pow(10,-knee*(1-1/ratio)/20);
    this.reduction+=(target-this.reduction)*(target<this.reduction?this.attack:this.gainRelease);
    // The same numeric ceiling already used for module signals by DSPGraph; no extra limiter stage.
    const safety=Math.min(1,8/Math.max(1e-12,Math.abs(l*this.reduction),Math.abs(r*this.reduction)));this.outputL[0]=l*this.reduction*safety;this.outputR[0]=r*this.reduction*safety;
    this.envelope+=((Math.abs(this.outputL[0])+Math.abs(this.outputR[0]))*2-this.envelope)*this.attack;
    this.outputL[1]=this.outputR[1]=clamp(this.envelope,0,1);this.a=clamp(this.detector*2,0,1);this.b=clamp(1-this.reduction,0,1);this.phase=this.parameters[0];
  }
}
