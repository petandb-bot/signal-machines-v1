import {Plate} from './Plate';
import {StereoWetFocus,approach,refinementSlew} from './RefinementFilters';

/** Low-frequency and extreme-high cleanup of the wet tail, without altering the tank. */
export class RefinedPlate extends Plate {
  private readonly filter=new StereoWetFocus(this.sampleRate,110,6400);
  private readonly mixSlew=refinementSlew(this.sampleRate);
  private focusMix=0;
  override process(){
    super.process();
    const active=this.selectedMode==='CLEAR';
    if(!active&&this.focusMix===0)return;
    const dryL=this.inputL[0]*.72,dryR=this.inputR[0]*.72;
    const rawL=this.outputL[0],rawR=this.outputR[0];
    this.filter.process(rawL-dryL,rawR-dryR);
    this.focusMix=approach(this.focusMix,Number(active),this.mixSlew);
    this.outputL[0]=rawL*(1-this.focusMix)+(dryL+this.filter.left)*this.focusMix;
    this.outputR[0]=rawR*(1-this.focusMix)+(dryR+this.filter.right)*this.focusMix;
  }
}
