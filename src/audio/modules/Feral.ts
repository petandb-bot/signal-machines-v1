import {DSPModule,clamp,TAU} from '../DSPModule';
import {tunedHz} from '../ToneMath';
import {sineAt} from '../SineTable';
/** An original driven Duffing resonator: damped filtering opens into nonlinear oscillation. */
export class Feral extends DSPModule {
  private readonly positions=new Float64Array(2);private readonly velocities=new Float64Array(2);private readonly old=new Float64Array(2);private readonly dc=new Float64Array(2);private gate=false;
  private readonly pole=Math.exp(-TAU*15/this.sampleRate);
  process(sample:number){
    const chaos=this.control(1,2),frequency=Math.min(this.sampleRate*.08,tunedHz(this.parameters[0],this.inputL[1])),h=TAU*frequency/(this.sampleRate*4),damping=.55-.35*chaos,force=Math.max(0,(chaos-.4)/.6)*.33;
    const kick=this.inputL[3]>.5;if(kick&&!this.gate){this.velocities[0]+=.7;this.velocities[1]+=.6;this.triggerSample=sample;}this.gate=kick;
    for(let sub=0;sub<4;sub++){
      const phaseStep=frequency*1.2/(this.sampleRate*4),forcing=sineAt(this.phase)*force;this.phase=(this.phase+phaseStep*.5)%1;const middleForce=sineAt(this.phase)*force;
      for(let c=0;c<2;c++){
        const x=this.positions[c],v=this.velocities[c],input=Math.tanh(c===0?this.inputL[0]:this.inputR[0])*.7,a=input+forcing-damping*v+(2*chaos-1)*x-chaos*x*x*x,mx=x+v*h*.5,mv=v+a*h*.5;
        this.positions[c]=clamp(x+mv*h,-4,4);this.velocities[c]=clamp(v+(input+middleForce-damping*mv+(2*chaos-1)*mx-chaos*mx*mx*mx)*h,-6,6);
      }
      this.phase=(this.phase+phaseStep*.5)%1;
    }
    for(let c=0;c<2;c++){const x=this.positions[c],dc=x-this.old[c]+this.pole*this.dc[c];this.old[c]=x;this.dc[c]=dc;const signal=.5*Math.tanh(dc*.65);if(c===0)this.outputL[0]=signal;else this.outputR[0]=signal;}
    this.a=this.parameters[0];this.b=chaos;this.envelope+=((Math.abs(this.outputL[0])+Math.abs(this.outputR[0]))*2-this.envelope)*.002;this.outputL[1]=this.outputR[1]=Math.min(1,this.envelope);
  }
}
