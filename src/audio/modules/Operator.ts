import {DSPModule,clamp,TAU} from '../DSPModule';
import {tunedHz} from '../ToneMath';import {sineAt} from '../SineTable';
/** Two interpolated PM substeps; no graph feedback edges are introduced. */
export class Operator extends DSPModule {
  private pitch=0;private feedback=0;private oldMod=0;private readonly slew=1-Math.exp(-1/(this.sampleRate*.008));
  process(){
    this.pitch+=(clamp(this.inputL[0])-this.pitch)*this.slew;const frequency=Math.min(this.sampleRate*.43,tunedHz(this.parameters[0],this.pitch,this.wide)),depth=this.parameters[1],index=Math.min(depth*depth*8,Math.max(0,this.sampleRate*.43/frequency-1)),external=!!this.inputConnected[1],mod=external?Math.tanh((this.inputL[1]+this.inputR[1])*2):this.feedback*.5;let output=0;
    for(let i=0;i<2;i++){const m=this.oldMod+(mod-this.oldMod)*(i+1)*.5;this.phase=(this.phase+frequency/(this.sampleRate*2))%1;output+=sineAt((this.phase+m*index/TAU+4)%1)*.5;}
    this.oldMod=mod;this.feedback+=(output-this.feedback)*.5;this.outputL[0]=this.outputR[0]=output*.18;this.envelope+=(Math.abs(output)*.5-this.envelope)*.002;this.outputL[1]=this.outputR[1]=this.envelope;this.a=depth;this.b=mod;
  }
}
