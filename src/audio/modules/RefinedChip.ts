import {Chip} from './Chip';
import {clamp} from '../DSPModule';
import {polyBlep} from '../ToneMath';
import {approach,refinementSlew} from './RefinementFilters';

/**
 * Timer-step and 7-bit quantization deliberately remain. PolyBLEP attenuates
 * the *unwanted* pulse-edge aliasing; CLEAN triangle replaces the 32-step
 * staircase with a continuous triangle. Original Chip.ts is never modified.
 */
export class RefinedChip extends Chip {
  private readonly edgeSlew=1-Math.exp(-1/(this.sampleRate*.008));
  private readonly mixSlew=refinementSlew(this.sampleRate);
  private readonly dcPole=Math.exp(-Math.PI/this.sampleRate);
  private readonly releaseScale=1/this.sampleRate;
  private refinedDuty=.5;private refinedMix=0;
  private refinedOld=0;private refinedDc=0;
  private refinedGate=false;private refinedAmplitude=0;

  override process(sample:number){
    const requestedMode=this.selectedMode;
    const pulseClean=requestedMode==='PULSE CLEAN';
    const triangleClean=requestedMode==='TRIANGLE CLEAN';
    const active=pulseClean||triangleClean;
    const phaseBefore=this.phase;
    // Keep all original oscillator, trigger, noise and telemetry states running.
    if(active)this.selectedMode=pulseClean?'PULSE':'TRIANGLE';
    super.process(sample);
    if(active)this.selectedMode=requestedMode;

    const character=this.control(1,2),trigger=this.inputL[1]>.5;
    if(trigger&&!this.refinedGate)this.refinedAmplitude=1;
    this.refinedGate=trigger;
    if(this.inputConnected[1]){
      this.refinedAmplitude*=Math.exp(-this.releaseScale/(.05+character*character*1.5));
    }else this.refinedAmplitude=1;

    if(!active&&this.refinedMix===0)return;
    const step=(this.phase-phaseBefore+1)%1;
    const targetDuty=[.125,.25,.5,.75][Math.min(3,Math.floor(character*4))];
    this.refinedDuty+=(targetDuty-this.refinedDuty)*this.edgeSlew;
    let signal:number;
    if(pulseClean||!triangleClean&&this.refinedMix>0){
      const t=phaseBefore,d=this.refinedDuty;
      const bandlimited=(t<d?1:-1)+2*polyBlep(t,step)-2*polyBlep((t-d+1)%1,step);
      signal=clamp(bandlimited);
    }else{
      signal=1-4*Math.abs(phaseBefore-.5);
    }
    // Retain the deliberately coarse 7-bit characteristic.
    signal=Math.round(signal*127)/127;
    this.refinedDc=signal-this.refinedOld+this.dcPole*this.refinedDc;
    this.refinedOld=signal;
    this.refinedMix=approach(this.refinedMix,Number(active),this.mixSlew);
    const raw=this.outputL[0],refined=this.refinedDc*.15*this.refinedAmplitude;
    this.outputL[0]=this.outputR[0]=raw*(1-this.refinedMix)+refined*this.refinedMix;
    this.envelope+=(Math.abs(this.outputL[0])*3-this.envelope)*.002;
    this.outputL[1]=this.outputR[1]=Math.min(1,this.envelope);
  }
}
