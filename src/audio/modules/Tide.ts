import {DSPModule} from '../DSPModule';
import {stepLorenz,CHAOS_RATES} from '../Dynamics';
export class Tide extends DSPModule {
  private readonly stateVector=new Float64Array(9);private readonly initial=new Float64Array(9);private readonly values=new Float64Array(3);private counter=0;private reset=false;
  private readonly slew=1-Math.exp(-1/(this.sampleRate*.035));
  constructor(...args:ConstructorParameters<typeof DSPModule>){super(...args);for(let i=0;i<3;i++){this.stateVector[i*3]=.5+this.random.next();this.stateVector[i*3+1]=-.8+this.random.next();this.stateVector[i*3+2]=20+this.random.next()*4;}this.initial.set(this.stateVector);}
  process(sample:number){
    const flow=this.control(0,0),range=this.control(1,1),reset=this.inputL[2]>.5;
    if(reset&&!this.reset){this.stateVector.set(this.initial);this.counter=0;this.triggerSample=sample;}this.reset=reset;
    if(this.counter++%128===0){const rate=Math.pow(10,flow*2-1)*128/this.sampleRate;for(let i=0;i<3;i++)stepLorenz(this.stateVector,i*3,CHAOS_RATES[i]*rate);}
    for(let i=0;i<3;i++){const target=Math.tanh(this.stateVector[i*3]/18)*range;this.values[i]+=(target-this.values[i])*this.slew;this.outputL[i]=this.outputR[i]=this.values[i];}
    this.a=this.values[0];this.b=this.values[1];this.phase=(this.values[2]+1)*.5;this.envelope=Math.max(Math.abs(this.a),Math.abs(this.b),Math.abs(this.values[2]));
  }
}
