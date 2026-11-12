import {DSPModule,TAU} from '../DSPModule';
import type {Gesture,ModuleState} from '../../graph/types';
export class Touch extends DSPModule {
  private path?:Gesture;private signature='';private cursor=0;private x=0;private y=0;private gate=false;private counter=0;private step=0;private pole=0;
  constructor(...args:ConstructorParameters<typeof DSPModule>){super(...args);this.path=this.state.gesture;this.signature=JSON.stringify(this.path??null);}
  override update(state:ModuleState){super.update(state);const signature=JSON.stringify(state.gesture??null);if(signature!==this.signature){this.signature=signature;this.path=state.gesture;this.cursor=0;this.phase=0;}}
  process(sample:number){
    const duration=this.path?.duration??4;if(this.counter++%16===0){this.step=.125*Math.pow(64,this.control(0,0))/(duration*this.sampleRate);this.pole=Math.exp(-1/(this.sampleRate*(.002+this.control(1,1)**2*2)));}
    const reset=this.inputL[2]>.5;if(reset&&!this.gate){this.phase=0;this.cursor=0;}this.gate=reset;
    let x=Math.sin(this.phase*TAU)*.8,y=Math.cos(this.phase*TAU)*.8;
    if(this.path){const time=this.phase*duration,p=this.path.points;if(this.cursor>=p.length-1||time<p[this.cursor].t)this.cursor=0;while(this.cursor<p.length-2&&p[this.cursor+1].t<time)this.cursor++;const a=p[this.cursor],b=p[this.cursor+1],f=Math.max(0,Math.min(1,(time-a.t)/(b.t-a.t)));x=a.x+(b.x-a.x)*f;y=a.y+(b.y-a.y)*f;}
    this.x=x+(this.x-x)*this.pole;this.y=y+(this.y-y)*this.pole;this.phase+=this.step;const loop=this.phase>=1-1e-10;if(loop){this.phase=Math.max(0,this.phase-1);this.cursor=0;this.triggerSample=sample;}
    this.outputL[0]=this.outputR[0]=this.x;this.outputL[1]=this.outputR[1]=this.y;this.outputL[2]=this.outputR[2]=loop?1:0;this.a=this.x;this.b=this.y;this.envelope=loop?1:this.envelope*(1-1/(this.sampleRate*.1));
  }
  override telemetry(){return{...super.telemetry(),particles:this.path?this.path.points.map(p=>({x:p.x,y:p.y,activity:0})):Array.from({length:32},(_,i)=>({x:Math.sin(i*TAU/31)*.8,y:Math.cos(i*TAU/31)*.8,activity:0}))};}
}
