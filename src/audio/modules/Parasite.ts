import {DSPModule,TAU,clamp} from '../DSPModule';
export class Parasite extends DSPModule {
  private pressure=0;private walk=0;private destination=0;private untilChange=0;
  process(){
    const feed=this.control(0,1),memory=this.parameters[1];
    const energy=(Math.abs(this.inputL[0])+Math.abs(this.inputR[0]))*.5;
    const target=1-Math.exp(-energy*feed*65);
    this.pressure+=(target-this.pressure)/(this.sampleRate*(target > this.pressure ? .006 : .06+memory*memory*3));
    if(--this.untilChange<=0){this.destination=(this.random.next()*2-1)*this.pressure;this.untilChange=this.sampleRate*(.3+memory*5)*(.7+this.random.next()*.6);}
    this.walk+=(this.destination-this.walk)/(this.sampleRate*(.08+memory*memory*3));
    this.phase=(this.phase+(.012+this.pressure*.18)/this.sampleRate)%1;
    const fever=clamp((Math.sin(TAU*this.phase)*.45+this.walk*.55)*this.pressure);
    this.outputL[0]=this.outputR[0]=clamp(this.pressure,0,1);this.outputL[1]=this.outputR[1]=fever;
    this.a=this.pressure;this.b=fever;this.envelope=this.pressure;
  }
}
