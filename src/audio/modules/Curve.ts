import {DSPModule,clamp} from '../DSPModule';
import {defaultCurve} from '../../graph/MusicalData';
import type {CurveData,CurveLane,ModuleState} from '../../graph/types';
/** Two editable CV timelines: accurate by default, no implicit randomness. */
export class Curve extends DSPModule{
  private data:CurveData;
  private position=0;private direction=1;private ended=false;private resetHigh=false;
  constructor(...args:ConstructorParameters<typeof DSPModule>){super(...args);this.data=this.state.curve??defaultCurve();}
  override update(state:ModuleState){super.update(state);this.data=state.curve??defaultCurve();}
  private value(lane:CurveLane,t:number,steps:number){
    const points=lane.points;
    if(t<=0)return points[0].v;
    if(t>=1)return points[points.length-1].v;
    let i=0;while(i<points.length-2&&points[i+1].t<t)i++;
    const a=points[i],b=points[i+1],f=clamp((t-a.t)/(b.t-a.t),0,1);
    return clamp(a.v+(b.v-a.v)*f*(1-steps),-1,1);
  }
  process(sample:number,bpm:number){
    const reset=this.inputL[1]>.5;if(reset&&!this.resetHigh){this.position=0;this.direction=1;this.ended=false;}this.resetHigh=reset;
    const mode=this.selectedMode??'LOOP',beats=4*Math.pow(16,this.parameters[0]);
    const seconds=this.parameters[1]>=.5?beats*60/Math.max(20,bpm):Math.pow(32,this.parameters[0]);
    const speed=Math.pow(2,clamp(this.inputL[0],-1,1)*2);
    const t=clamp(this.position,0,1),stepAmount=this.parameters[2];
    const a=this.value(this.data.lanes[0],t,stepAmount),b=this.value(this.data.lanes[1],t,stepAmount);
    this.outputL[0]=this.outputR[0]=a;this.outputL[1]=this.outputR[1]=b;
    this.outputL[2]=this.outputR[2]=0;
    if(!this.ended){
      this.position+=this.direction*speed/(this.sampleRate*seconds);
      if(this.position>=1){
        if(mode==='PINGPONG'){this.position=2-this.position;this.direction=-1;}
        else if(mode==='ONESHOT'){this.position=1;this.ended=true;this.outputL[2]=this.outputR[2]=1;}
        else{this.position-=1;this.outputL[2]=this.outputR[2]=1;}
      }else if(this.position<=0&&this.direction<0){this.position=-this.position;this.direction=1;this.outputL[2]=this.outputR[2]=1;}
    }
    if(this.outputL[2])this.triggerSample=sample;
    this.phase=t;this.a=a;this.b=b;this.envelope=Math.max(Math.abs(a),Math.abs(b));
  }
  override capture(){this.wave[this.waveIndex]=this.a;this.waveIndex=(this.waveIndex+1)%64;}
}