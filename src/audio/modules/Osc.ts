import {DSPModule,TAU} from '../DSPModule';
import {polyBlep,tunedHz} from '../ToneMath';
const MODES=['SINE','TRIANGLE','SAW','PULSE'];
export class Osc extends DSPModule {
  private triangle=-1;private readonly weights=new Float64Array([1,0,0,0]);
  private readonly modeSlew=1-Math.exp(-1/(this.sampleRate*.006));
  process(){
    const frequency=Math.min(this.sampleRate*(this.wide?.45:.18),tunedHz(this.parameters[0],this.inputL[0],this.wide)),step=frequency/this.sampleRate,t=this.phase;
    const sine=Math.sin(TAU*t),saw=2*t-1-polyBlep(t,step),pulse=(t<.5?1:-1)+polyBlep(t,step)-polyBlep((t+.5)%1,step);
    this.triangle=(this.triangle+4*step*pulse)*(1-step*.02);
    const selected=Math.max(0,MODES.indexOf(this.selectedMode??'SINE'));let signal=0;
    for(let i=0;i<4;i++){this.weights[i]+=((i===selected?1:0)-this.weights[i])*this.modeSlew;signal+=this.weights[i]*(i===0?sine:i===1?this.triangle:i===2?saw:pulse);}
    const level=this.control(1,1);this.phase=(t+step)%1;this.outputL[0]=this.outputR[0]=signal*.22*level;
    this.envelope+=(Math.abs(this.outputL[0])*3-this.envelope)*.002;this.a=this.parameters[0];this.b=selected/3;this.outputL[1]=this.outputR[1]=Math.min(1,this.envelope);
  }
}
