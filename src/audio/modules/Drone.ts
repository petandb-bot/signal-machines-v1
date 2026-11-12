import {DSPModule,TAU,clamp} from '../DSPModule';
import {sineAt} from '../SineTable';
const RATIOS=[1,1.002,1.5,2,2.5,3];
export class Drone extends DSPModule {
  private readonly phases=new Float64Array(6);
  private readonly drift=new Float64Array(6);private readonly wanderTargets=new Float64Array(6);private wander=0;private pitch=0;private attack=0;
  constructor(...args:ConstructorParameters<typeof DSPModule>){super(...args);for(let i=0;i<6;i++)this.phases[i]=this.random.next();}
  process(){
    if(this.wander--<=0){this.wander=Math.round(this.sampleRate*2);for(let i=0;i<6;i++)this.wanderTargets[i]=(this.random.next()*2-1)*.001;}
    const spread=this.control(0,1),color=this.control(1,2);
    this.pitch+=(clamp(this.inputL[0])-this.pitch)*.0005;this.attack+=(1-this.attack)/(this.sampleRate*.12);
    this.phase=(this.phase+.027/this.sampleRate)%1;
    const range=this.selectedMode==='220 Hz'?4:this.selectedMode==='110 Hz'?2:1;const fundamental=55*range*Math.pow(2,this.pitch*(this.wide?8:2));let left=0,right=0;
    for(let i=0;i<6;i++){
      this.drift[i]+=(this.wanderTargets[i]-this.drift[i])/(this.sampleRate*12);const drift=(sineAt((this.phase+i*1.37/TAU)%1)*.002+this.drift[i])*spread*spread;
      const ratio=1+(RATIOS[i]-1)*spread*spread;
      const frequency=Math.min(this.sampleRate*(this.wide?.45:.12),fundamental*ratio*(1+drift+(i-2.5)*spread*spread*.0018));
      this.phases[i]=(this.phases[i]+frequency/this.sampleRate)%1;
      const p=this.phases[i],voice=(sineAt(p)+sineAt((2*p)%1)*color*.5*clamp((this.sampleRate*.47-frequency*2)/(this.sampleRate*.04),0,1)+sineAt((4*p)%1)*color*color*.24*clamp((this.sampleRate*.47-frequency*4)/(this.sampleRate*.04),0,1))/(1+color*.3);
      const pan=(i-2.5)*.1;
      left+=voice*(1-pan)*.034;right+=voice*(1+pan)*.034;
    }
    this.outputL[0]=left*this.attack;this.outputR[0]=right*this.attack;
    this.envelope+=((Math.abs(left)+Math.abs(right))*2-this.envelope)*.001;
    this.a=spread;this.b=color;this.outputL[1]=this.outputR[1]=Math.min(1,this.envelope);
  }
}
