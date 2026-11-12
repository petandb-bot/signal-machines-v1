import {DSPModule,clamp} from '../DSPModule';
import {sineAt} from '../SineTable';
export class Partial extends DSPModule {
  private readonly phases=new Float64Array(32);private readonly steps=new Float64Array(32);private readonly targetAmplitudes=new Float64Array(32);private readonly amplitudes=new Float64Array(32);
  private counter=0;private pitch=0;private normalizer=1;private targetNorm=1;private attack=0;private readonly slew=1-Math.exp(-1/(this.sampleRate*.012));
  constructor(...args:ConstructorParameters<typeof DSPModule>){super(...args);for(let i=0;i<32;i++)this.phases[i]=this.random.next();}
  process(){
    const mass=this.control(0,1),warp=this.control(1,2);this.pitch+=(clamp(this.inputL[0])-this.pitch)*this.slew;
    if(this.counter++%16===0){
      const base=(this.selectedMode==='110 Hz'?110:this.selectedMode==='440 Hz'?440:220)*Math.pow(2,this.pitch*(this.wide?8:2));let energy=0;
      for(let i=0;i<32;i++){const ratio=Math.pow(i+1,.65+warp*.7),frequency=base*ratio,active=clamp(1+mass*31-i,0,1),nyquist=clamp((this.sampleRate*.47-frequency)/(this.sampleRate*.04),0,1),amplitude=active*nyquist/Math.pow(i+1,1.6-mass*.9);this.targetAmplitudes[i]=amplitude;this.steps[i]=Math.min(this.sampleRate*.47,frequency)/this.sampleRate;energy+=amplitude*amplitude;}
      this.targetNorm=Math.sqrt(Math.max(1,energy));
    }
    let left=0,right=0;this.normalizer+=(this.targetNorm-this.normalizer)*this.slew;this.attack+=(1-this.attack)*this.slew;
    for(let i=0;i<32;i++){this.amplitudes[i]+=(this.targetAmplitudes[i]-this.amplitudes[i])*this.slew;this.phases[i]=(this.phases[i]+this.steps[i])%1;const signal=sineAt(this.phases[i])*this.amplitudes[i],pan=(i%5-2)*.085;left+=signal*(1-pan);right+=signal*(1+pan);}
    this.outputL[0]=left*.13*this.attack/this.normalizer;this.outputR[0]=right*.13*this.attack/this.normalizer;
    this.phase=this.phases[0];this.a=mass;this.b=warp;this.envelope+=((Math.abs(this.outputL[0])+Math.abs(this.outputR[0]))*2-this.envelope)*.002;this.outputL[1]=this.outputR[1]=Math.min(1,this.envelope);
  }
  override telemetry(){return{...super.telemetry(),bands:Array.from(this.amplitudes)};}
}
