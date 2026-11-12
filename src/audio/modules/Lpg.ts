import {DSPModule,clamp,TAU} from '../DSPModule';
/** Coupled opto-like gain and two-pole low pass, with a slower closing response. */
export class Lpg extends DSPModule {
  private excitation=0;private opening=0;private gate=false;private readonly low=new Float64Array(4);private counter=0;private coefficient=0;private release=.99;
  process(sample:number){
    const bite=this.parameters[0],decay=this.parameters[1],strike=this.inputL[2]>.5;if(strike&&!this.gate){this.excitation=1;this.triggerSample=sample;}this.gate=strike;
    if(this.counter++%16===0)this.release=Math.exp(-1/(this.sampleRate*(.012*Math.pow(250,decay))));
    const manual=this.inputConnected[1]?clamp(this.inputL[1],0,1):this.inputConnected[2]?0:1,target=Math.max(manual,this.excitation);this.excitation*=this.release;
    this.opening+=(target-this.opening)*Math.min(1,1/(this.sampleRate*(target>this.opening?.002:.015+decay*decay*.15)));
    const cutoff=Math.min(this.sampleRate*.4,35+(600+bite*bite*15500)*Math.pow(this.opening,1.7));this.coefficient=1-Math.exp(-TAU*cutoff/this.sampleRate);const gain=Math.pow(this.opening,1.35);
    for(let c=0;c<2;c++){const i=c*2,x=Math.tanh(c?this.inputR[0]:this.inputL[0]);this.low[i]+=(x-this.low[i])*this.coefficient;this.low[i+1]+=(this.low[i]-this.low[i+1])*this.coefficient;const y=this.low[i+1]*gain;if(c)this.outputR[0]=y;else this.outputL[0]=y;}
    this.outputL[1]=this.outputR[1]=this.opening;this.a=this.opening;this.b=bite;this.envelope=this.opening;
  }
}
