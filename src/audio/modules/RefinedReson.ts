import {Reson} from './Reson';
import {approach,refinementSlew} from './RefinementFilters';

/** Opt-in low-mid relief; no mutation to the resonant states or excitation. */
export class RefinedReson extends Reson {
  private readonly lowCoefficient=1-Math.exp(-2*Math.PI*90/this.sampleRate);
  private readonly midCoefficient=1-Math.exp(-2*Math.PI*480/this.sampleRate);
  private readonly mixSlew=refinementSlew(this.sampleRate);
  private lowL=0;private lowR=0;private midL=0;private midR=0;
  private focusMix=0;
  override process(sample:number){
    super.process(sample);
    const active=this.selectedMode==='FOCUS';
    if(!active&&this.focusMix===0)return;
    const l=this.outputL[0],r=this.outputR[0];
    this.lowL+=(l-this.lowL)*this.lowCoefficient;
    this.lowR+=(r-this.lowR)*this.lowCoefficient;
    this.midL+=(l-this.midL)*this.midCoefficient;
    this.midR+=(r-this.midR)*this.midCoefficient;
    // A gentle ~100-500 Hz reduction, not a wholesale tonal correction.
    const focusedL=l-.24*(this.midL-this.lowL)-.07*this.lowL;
    const focusedR=r-.24*(this.midR-this.lowR)-.07*this.lowR;
    this.focusMix=approach(this.focusMix,Number(active),this.mixSlew);
    this.outputL[0]=l*(1-this.focusMix)+focusedL*this.focusMix;
    this.outputR[0]=r*(1-this.focusMix)+focusedR*this.focusMix;
  }
}
