import {DSPModule} from '../DSPModule';
import {CLOCK_RATIOS,euclideanHit} from '../Dynamics';
export class Weft extends DSPModule {
  private remaining=0;private tick=0;private gate=false;private reset=false;private period=this.sampleRate*.5;private lastTick=-1;private decay=0;private held=0;private destination=0;
  private release=Math.exp(-6.9/(this.period*.85));
  private readonly slew=1-Math.exp(-1/(this.sampleRate*.025));
  process(sample:number,bpm:number){
    this.outputL[0]=this.outputR[0]=this.outputL[1]=this.outputR[1]=0;
    const rate=this.control(0,1),fill=this.control(1,2),length=this.selectedMode==='8'?8:this.selectedMode==='12'?12:16,hits=Math.round(fill*length),clock=this.inputL[0]>.5,reset=this.inputL[3]>.5;
    if(reset&&!this.reset){this.tick=0;this.remaining=0;this.lastTick=-1;}this.reset=reset;
    const fire=this.inputConnected[0]?clock&&!this.gate:this.remaining<=0;this.gate=clock;
    if(fire){
      if(this.inputConnected[0]){if(this.lastTick>=0)this.period=Math.max(this.sampleRate*.005,sample-this.lastTick);}else{this.period=this.sampleRate*60/bpm/CLOCK_RATIOS[Math.min(6,Math.round(rate*6))];this.remaining+=this.period;}
      this.lastTick=sample;this.release=Math.exp(-6.9/Math.max(1,this.period*.85));const step=this.tick%length,a=euclideanHit(step,hits,length),b=this.tick%3===0&&euclideanHit(Math.floor(this.tick/3)%length,hits,length);
      if(a){this.outputL[0]=this.outputR[0]=1;this.decay=1;this.triggerSample=sample;}if(b){this.outputL[1]=this.outputR[1]=1;this.destination=this.random.next()*2-1;this.triggerSample=sample;}
      this.phase=step/length;for(let i=0;i<length;i++)this.wave[i]=euclideanHit(i,hits,length)?1:0;this.tick++;
    }
    if(!this.inputConnected[0])this.remaining--;this.decay*=this.release;this.envelope+=(this.decay-this.envelope)*Math.min(1,1/(this.sampleRate*.001));
    this.held+=(this.destination-this.held)*this.slew;this.outputL[2]=this.outputR[2]=this.envelope;this.outputL[3]=this.outputR[3]=this.held;this.a=fill;this.b=this.held;
  }
  override capture(){}
  override telemetry(){const t=super.telemetry();t.wave=Array.from(this.wave.subarray(0,this.selectedMode==='8'?8:this.selectedMode==='12'?12:16));return t;}
}
