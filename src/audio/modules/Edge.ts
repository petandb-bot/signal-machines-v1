import {DSPModule,clamp} from '../DSPModule';
/** Stereo energy onset detector, with independent re-arming and refractory time. */
export class Edge extends DSPModule {
  private fast=0;private slow=0;private armed=true;private wait=0;private counter=0;private recovery=0;
  private readonly attack=1-Math.exp(-1/(this.sampleRate*.006));private readonly history=1-Math.exp(-1/(this.sampleRate*.15));
  process(sample:number){
    const energy=(this.inputL[0]**2+this.inputR[0]**2)*.5;this.fast+=(energy-this.fast)*this.attack;this.slow+=(energy-this.slow)*this.history;
    const short=Math.sqrt(Math.max(0,this.fast)),long=Math.sqrt(Math.max(0,this.slow)),sense=this.parameters[0],threshold=.002+.06*(1-sense)**2+long*(.15+1.2*(1-sense)),rise=short-long;
    if(this.counter++%32===0)this.recovery=Math.round(this.sampleRate*.02*Math.pow(100,this.parameters[1]));
    if(this.wait>0)this.wait--;if(rise<threshold*.35)this.armed=true;
    const event=this.armed&&this.wait===0&&short>.002&&rise>threshold;
    if(event){this.armed=false;this.wait=this.recovery;this.triggerSample=sample;}
    this.outputL[0]=this.outputR[0]=event?1:0;this.outputL[1]=this.outputR[1]=clamp(short*4,0,1);this.envelope=this.outputL[1];this.a=clamp(rise/Math.max(.002,threshold),0,1);this.b=clamp(long*4,0,1);this.phase=1-this.wait/Math.max(1,this.recovery);
  }
  override capture(){this.wave[this.waveIndex]=this.outputL[1];this.waveIndex=(this.waveIndex+1)%64;}
}
