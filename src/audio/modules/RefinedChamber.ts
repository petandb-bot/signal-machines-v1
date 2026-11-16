import {Chamber} from './Chamber';
import {StereoWetFocus,approach,refinementSlew} from './RefinementFilters';

/** The dry signal remains bit-identical. Filtering affects only the wet tail. */
export class RefinedChamber extends Chamber {
  private readonly filter=new StereoWetFocus(this.sampleRate,130,6400);
  private readonly mixSlew=refinementSlew(this.sampleRate);
  private focusMix=0;
  override process(){
    const selected=this.selectedMode;
    const active=selected==='CLEAR ROOM'||selected==='CLEAR WEAVE';
    if(active)this.selectedMode=selected==='CLEAR WEAVE'?'WEAVE':'ROOM';
    super.process();
    if(active)this.selectedMode=selected;
    if(!active&&this.focusMix===0)return;
    const wet=.26+this.control(1,2)*.48,dryFactor=1-wet*.45;
    const dryL=this.inputL[0]*dryFactor,dryR=this.inputR[0]*dryFactor;
    const rawL=this.outputL[0],rawR=this.outputR[0];
    this.filter.process(rawL-dryL,rawR-dryR);
    this.focusMix=approach(this.focusMix,Number(active),this.mixSlew);
    this.outputL[0]=rawL*(1-this.focusMix)+(dryL+this.filter.left)*this.focusMix;
    this.outputR[0]=rawR*(1-this.focusMix)+(dryR+this.filter.right)*this.focusMix;
  }
}
