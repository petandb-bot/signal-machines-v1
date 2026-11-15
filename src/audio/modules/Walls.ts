import {DSPModule} from '../DSPModule';
import {finiteAudio,finiteUnit,machineControl} from './MachineSafety';
const BASE=[.0057,.0133,.0269,.0467],DEPTH=[.012,.026,.048,.085],WEIGHTS=[.37,.28,.21,.14];

/** Finite early reflections. Only the input is written; reflected audio never recirculates. */
export class Walls extends DSPModule {
  private readonly capacity=Math.ceil(this.sampleRate*.164)+4;
  private readonly left=new Float32Array(this.capacity);private readonly right=new Float32Array(this.capacity);private write=0;
  private readonly near=new Float64Array(8);private readonly stretch=new Float64Array(8);private readonly surface=new Float64Array(8);
  private readonly oldDelay=new Float64Array(8);private readonly delay=new Float64Array(8);
  private readonly oldGain=new Float64Array(8);private readonly gain=new Float64Array(8);
  private readonly oldBright=new Float64Array(8);private readonly bright=new Float64Array(8);
  private readonly oldCross=new Float64Array(8);private readonly cross=new Float64Array(8);
  private readonly progress=new Float64Array(8).fill(1);private readonly increments=new Float64Array(8);
  private readonly appliedDistance=new Float64Array(8);private readonly jitter=new Float64Array(8);
  readonly reflectionTimes=new Float64Array(8);readonly reflectionLevels=new Float64Array(8);
  private distance=finiteUnit(this.parameters[0],.45);private motion=finiteUnit(this.parameters[1],.2);
  private initialized=false;private counter=0;private distancePath=0;private remaining=0;
  private readonly slew=1-Math.exp(-1/(this.sampleRate*.04));private readonly meter=1-Math.exp(-1/(this.sampleRate*.018));
  private readonly spacing=this.sampleRate*.000035;
  constructor(...args:ConstructorParameters<typeof DSPModule>){super(...args);
    for(let i=0;i<8;i++){const k=i%4,side=i<4?-1:1;this.near[i]=BASE[k]+side*[.00065,-.00105,.00185,-.00255][k]+(this.random.next()-.5)*.001;this.stretch[i]=DEPTH[k]+(this.random.next()-.5)*.003;this.surface[i]=this.random.next()-.5;}
    this.remaining=Math.round(this.sampleRate*2.3);
  }
  process(){
    const targetMotion=machineControl(this,1,2,.2);
    this.distance+=(machineControl(this,0,1,.45)-this.distance)*this.slew;this.motion+=(targetMotion-this.motion)*this.slew;
    if(!this.initialized){for(let i=0;i<8;i++){this.configure(i,this.distance,0);this.copyCurrent(i);}this.initialized=true;}
    // Snapshot one idle path at a time. Distance CV never sweeps a live read head.
    if(this.counter++%128===0){const i=this.distancePath++%8;if(this.progress[i]>=1&&Math.abs(this.distance-this.appliedDistance[i])>.008)this.transition(i,this.distance,this.jitter[i],.1);}
    if(targetMotion>0){if(--this.remaining<=0){const i=Math.min(7,Math.floor(this.random.next()*8));if(this.progress[i]>=1){const change=this.motion*this.motion;this.transition(i,this.distance,(this.jitter[i]*.35+(this.random.next()*2-1)*change),.22+.38*(1-this.motion));}this.remaining=Math.round(this.sampleRate*(1.8+12*(1-this.motion)**2)*(.75+this.random.next()*.5));}}
    const l=finiteAudio(this.inputL[0]),r=finiteAudio(this.inputR[0]);this.left[this.write]=l;this.right[this.write]=r;
    let reflectedL=0,reflectedR=0,energy=0;
    for(let i=0;i<8;i++){
      const channel=i>=4,t=this.progress[i],mix=t>=1?1:t*t*(3-2*t);
      const current=this.reflection(channel,this.delay[i],this.bright[i],this.cross[i])*this.gain[i];
      const previous=t>=1?0:this.reflection(channel,this.oldDelay[i],this.oldBright[i],this.oldCross[i])*this.oldGain[i];
      const value=previous*(1-mix)+current*mix;if(channel)reflectedR+=value;else reflectedL+=value;
      this.reflectionTimes[i]=(this.oldDelay[i]*(1-mix)+this.delay[i]*mix)/this.sampleRate;
      this.reflectionLevels[i]+=(value*value-this.reflectionLevels[i])*this.meter;if(this.reflectionLevels[i]<1e-24)this.reflectionLevels[i]=0;energy+=this.reflectionLevels[i];
      if(t<1)this.progress[i]=Math.min(1,t+this.increments[i]);
    }
    this.write=this.write+1===this.capacity?0:this.write+1;
    const direct=1-this.distance*.2;this.outputL[0]=l*direct+reflectedL;this.outputR[0]=r*direct+reflectedR;
    this.envelope+=(Math.min(1,Math.sqrt(energy*.5)*8)-this.envelope)*this.meter;if(this.envelope<1e-14)this.envelope=0;
    this.outputL[1]=this.outputR[1]=this.envelope;this.a=this.distance;this.b=this.motion;this.phase=Math.min(1,Math.sqrt(energy)*12);
  }
  private configure(i:number,distance:number,jitter:number){
    const k=i%4,time=this.near[i]+this.stretch[i]*distance+jitter*(.0015+this.near[i]*.18);
    this.delay[i]=Math.max(this.sampleRate*.004,Math.min(this.sampleRate*.15,time*this.sampleRate));
    this.gain[i]=(.08+.34*distance)*WEIGHTS[k]*(1+jitter*.12);
    this.bright[i]=Math.max(.1,Math.min(.92,.86-k*.11-distance*.3+this.surface[i]*.1+jitter*.08));
    this.cross[i]=Math.max(.04,Math.min(.3,.08+distance*.16+(i%2?.025:-.025)+jitter*.025));
    this.appliedDistance[i]=distance;this.jitter[i]=jitter;
  }
  private copyCurrent(i:number){this.oldDelay[i]=this.delay[i];this.oldGain[i]=this.gain[i];this.oldBright[i]=this.bright[i];this.oldCross[i]=this.cross[i];}
  private transition(i:number,distance:number,jitter:number,seconds:number){this.copyCurrent(i);this.configure(i,distance,Math.max(-1,Math.min(1,jitter)));this.progress[i]=0;this.increments[i]=1/Math.max(1,Math.round(this.sampleRate*seconds));}
  private read(buffer:Float32Array,delay:number){let p=this.write-delay;if(p<0)p+=this.capacity;const i=Math.floor(p),f=p-i;return buffer[i]*(1-f)+buffer[i+1===this.capacity?0:i+1]*f;}
  private reflection(channel:boolean,delay:number,brightness:number,cross:number){
    const own=channel?this.right:this.left,other=channel?this.left:this.right;
    const center=this.read(own,delay)*(1-cross)+this.read(other,delay)*cross;
    const outer=(this.read(own,delay-this.spacing*2)+this.read(own,delay+this.spacing*2))*(1-cross)+(this.read(other,delay-this.spacing*2)+this.read(other,delay+this.spacing*2))*cross;
    const inner=(this.read(own,delay-this.spacing)+this.read(own,delay+this.spacing))*(1-cross)+(this.read(other,delay-this.spacing)+this.read(other,delay+this.spacing))*cross;
    return center*brightness+(outer+inner*4+center*6)*(1-brightness)/16;
  }
  override telemetry(){return{...super.telemetry(),curve:Array.from(this.reflectionTimes,t=>t/.15),bands:Array.from(this.reflectionLevels,e=>Math.sqrt(Math.max(0,e))),particles:Array.from(this.reflectionTimes,(t,i)=>({x:t/.15,y:(i%4)/3,activity:Math.min(1,Math.sqrt(this.reflectionLevels[i])*30)}))};}
}
