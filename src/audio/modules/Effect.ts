import {DSPModule} from '../DSPModule';
/** A short crossfade keeps the dry/wet comparison continuous; processing keeps running. */
export abstract class Effect extends DSPModule {
  private mix=this.state.bypass?0:1;
  protected finish(left:number,right:number){
    this.mix+=((this.bypassed?0:1)-this.mix)*Math.min(1,1/(this.sampleRate*.005));
    this.outputL[0]=this.inputL[0]*(1-this.mix)+left*this.mix;
    this.outputR[0]=this.inputR[0]*(1-this.mix)+right*this.mix;
    this.envelope+=((Math.abs(this.outputL[0])+Math.abs(this.outputR[0]))*2-this.envelope)*.002;
    this.outputL[1]=this.outputR[1]=Math.min(1,this.envelope);
  }
}
