import { DSPModule, TAU, clamp } from '../DSPModule';
const WOOD=[1,2.03,3.87,5.41,7.93,10.37];
const METAL=[1,2.756,5.404,8.933,13.37,17.91];
export class Reson extends DSPModule {
  private readonly y1=new Float64Array(6); private readonly y2=new Float64Array(6);
  private readonly coefficients=new Float64Array(6); private readonly radii=new Float64Array(6); private readonly gains=new Float64Array(6);
  private gate=false;private excitation=0;private counter=0;private energy=0;private previous=0;private dc=0;
  process(sample:number) {
    const material=this.parameters[0],decay=this.parameters[1],pitch=clamp(this.inputL[1]);
    if(this.counter++%16===0){
      const fundamental=110*Math.pow(2,pitch*(this.wide?8:2));
      for(let i=0;i<6;i++){
        const ratio=WOOD[i]+(METAL[i]-WOOD[i])*material;
        const frequency=Math.min(this.sampleRate*.43,fundamental*ratio);
        const seconds=(.11+decay*decay*7)/(1+i*(.11+(1-material)*.2));
        const r=Math.exp(-6.9/(seconds*this.sampleRate));
        this.radii[i]=r*r;this.coefficients[i]=2*r*Math.cos(TAU*frequency/this.sampleRate);
        this.gains[i]=Math.sin(TAU*frequency/this.sampleRate)*(.1+material*.025)/(1+i*.42);
      }
    }
    const trigger=this.inputL[0]>.5;
    if(trigger&&!this.gate){this.excitation=1;this.triggerSample=sample;}this.gate=trigger;
    const noise=(this.random.next()*2-1)*this.excitation;
    this.excitation*=1-1/(this.sampleRate*.0017);
    const external=(this.inputL[2]+this.inputR[2])*.5;
    const input=Math.tanh(noise+external*.4);let left=0,right=0;
    for(let i=0;i<6;i++){
      // Bounded modal states also protect against repeated excitation at maximum decay.
      let y=this.coefficients[i]*this.y1[i]-this.radii[i]*this.y2[i]+input*this.gains[i];
      if(!Number.isFinite(y))y=0;
      if(Math.abs(y)>3)y=3*Math.tanh(y/3);
      this.y2[i]=this.y1[i];this.y1[i]=y;
      left+=y*(i%2?.8:1);right+=y*(i%2?1:.8);
    }
    const mono=(left+right)*.5;this.dc=mono-this.previous+.997*this.dc;this.previous=mono;
    const removed=mono-this.dc;
    this.outputL[0]=Math.tanh((left-removed)*.48);this.outputR[0]=Math.tanh((right-removed)*.48);
    this.energy+=(Math.abs(this.dc)-this.energy)*.002;
    this.envelope=Math.min(1,this.energy*2);this.a=material;this.b=decay;
    this.outputL[1]=this.outputR[1]=this.envelope;
  }
}
