import {DSPModule,clamp} from '../DSPModule';

/**
 * An intentional discontinuity generator. Unlike CURVE/SLEW, it holds its
 * control value until a trigger arrives, then steps instantly (EDGE=0) or
 * with a short user-requested transition.
 */
export class Jump extends DSPModule {
  private gate=false;
  private resetGate=false;
  private target=0;
  private current=0;
  private high=false;
  private event=false;
  private previousMode='FLIP';
  private lastSample=0;

  constructor(...args:ConstructorParameters<typeof DSPModule>){
    super(...args);
    this.target=this.current=-this.parameters[0];
  }

  private jump(sample:number){
    if(this.random.next()>this.parameters[2])return;
    const depth=this.parameters[0],mode=this.selectedMode??'FLIP';
    if(mode==='SAMPLE')this.target=clamp(this.inputL[0])*depth;
    else if(mode==='RANDOM')this.target=(this.random.next()<.5?-1:1)*(.45+this.random.next()*.55)*depth;
    else{this.high=!this.high;this.target=this.high?depth:-depth;}
    this.event=true;
    this.triggerSample=sample;
    this.envelope=1;
  }

  override command(action:string){
    if(action==='jump'){this.jump(this.lastSample);return{value:this.target};}
    if(action==='reset'){
      this.high=false;
      this.target=this.current=-this.parameters[0];
      this.envelope=0;this.event=false;
      return{value:this.target};
    }
    throw Error('Unknown JUMP action.');
  }

  process(sample:number){
    this.lastSample=sample;
    const mode=this.selectedMode??'FLIP';
    if(mode!==this.previousMode){this.high=false;this.previousMode=mode;}
    const reset=this.inputL[2]>.5;
    if(reset&&!this.resetGate){this.high=false;this.target=this.current=-this.parameters[0];}
    this.resetGate=reset;
    const gate=this.inputL[1]>.5;
    if(gate&&!this.gate)this.jump(sample);
    this.gate=gate;
    // Exactly zero EDGE is a true control-rate step; a small EDGE removes
    // zipper clicks downstream without removing the structural discontinuity.
    const edge=this.parameters[1];
    if(edge<.001)this.current=this.target;
    else{
      const seconds=.0002*Math.pow(1000,edge);
      this.current+=(this.target-this.current)*(1-Math.exp(-1/(this.sampleRate*seconds)));
    }
    this.outputL[0]=this.outputR[0]=clamp(this.current);
    this.outputL[1]=this.outputR[1]=clamp(-this.current);
    this.outputL[2]=this.outputR[2]=this.event?1:0;
    this.event=false;
    this.envelope*=1-1/(this.sampleRate*.15);
    this.a=this.current;this.b=this.target;
    this.phase=(this.current+1)*.5;
  }
}
