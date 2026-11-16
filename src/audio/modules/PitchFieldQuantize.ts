import {clamp} from '../DSPModule';
import {Quantize} from './Quantize';

/**
 * Two opt-in pitch collections. They provide a shared harmonic reference,
 * not a sequence or a chord progression. Original grid modes are untouched.
 */
export const FIELD_INTERVALS={
  FIELD:[0,2,3,5,7,9,10],
  FRICTION:[0,1,4,6,7,10],
} as const;

type FieldMode=keyof typeof FIELD_INTERVALS;

/** Pitch and root are expressed in 12-TET semitones, 0 = C. */
export function nearestFieldNote(pitch:number,root:number,mode:FieldMode,min=-Infinity,max=Infinity):number{
  if(!Number.isFinite(pitch)||!Number.isFinite(root))return 0;
  const intervals=FIELD_INTERVALS[mode];
  const octave=Math.floor((pitch-root)/12);
  let nearest=0,distance=Infinity;
  // Consider adjacent octaves so that negative pitches and octave
  // boundaries resolve symmetrically without a special-case root.
  for(let o=octave-1;o<=octave+1;o++){
    const offset=root+12*o;
    for(let i=0;i<intervals.length;i++){
      const note=offset+intervals[i];
      if(note<min||note>max)continue;
      const delta=Math.abs(pitch-note);
      if(delta<distance-1e-10||(Math.abs(delta-distance)<1e-10&&note<nearest)){
        nearest=note;distance=delta;
      }
    }
  }
  return nearest;
}

/**
 * A Schwarzonator-style *principle*, not a port: different voices can
 * take their pitch CV through the same field and shared SHIFT CV.
 * CLOCK holds the note until the next event; this module never invents
 * event timing, arpeggios or gates.
 */
export class PitchFieldQuantize extends Quantize {
  private fieldValue=0;
  private fieldGridValue=0;
  private fieldReady=false;
  private gateWasHigh=false;
  private lastFamily:'GRID'|'FIELD'|undefined;
  private lastVisiblePitch=0;
  private holdAcrossModeChange=false;

  override process(sample:number){
    const mode=this.selectedMode;
    const field=mode==='FIELD'||mode==='FRICTION';
    const family=field?'FIELD':'GRID';
    const clock=this.inputL[3]>.5;
    const rising=clock&&!this.gateWasHigh;
    const hasClock=!!this.inputConnected[3];
    if(this.lastFamily!==undefined&&family!==this.lastFamily){
      // A mode change cannot act as a new CLOCK edge. Keep the audible note
      // until the next real edge, just as classic-to-classic mode switches do.
      this.holdAcrossModeChange=hasClock&&!rising;
    }

    if(!field){
      // Sample-identical to the original path, including mode-to-mode changes
      // within 12-TET / 19-TET / 13-TRIT.
      super.process(sample);
    }else{
      // Run the legacy clock/held-note internals in parallel. Its signal is
      // never exposed in field mode; this keeps its private clock state current
      // for a return to a classic mode without altering Quantize.ts.
      const beforeEnvelope=this.envelope,beforeTrigger=this.triggerSample;
      super.process(sample);
      this.envelope=beforeEnvelope;this.triggerSample=beforeTrigger;
      const span=.25+this.control(0,2)*1.75;
      const input=clamp(this.inputL[0]*span);
      // Shared SHIFT is a tonic only in the optional field modes.
      const root=Math.round(clamp(this.inputL[1])*24);
      // Select an ACTUAL member of the field within CV [-1,1], rather
      // than choosing an out-of-range note and clipping to a false pitch.
      const snapped=nearestFieldNote(input*24,root,mode,-24,24)/24;
      this.outputL[1]=this.outputR[1]=0;
      if(!hasClock||rising){
        this.fieldValue=input+(snapped-input)*this.parameters[1];
        if(this.fieldReady&&Math.abs(snapped-this.fieldGridValue)>1e-9){
          this.outputL[1]=this.outputR[1]=1;
          this.envelope=1;
          this.triggerSample=sample;
        }
        this.fieldGridValue=snapped;
        this.fieldReady=true;
      }
      this.outputL[0]=this.outputR[0]=this.fieldValue;
      this.a=input;this.b=this.fieldValue;this.phase=(root+24)/48;
      this.envelope*=1-1/(this.sampleRate*.08);
    }

    if(!hasClock)this.holdAcrossModeChange=false;
    if(this.holdAcrossModeChange){
      if(rising)this.holdAcrossModeChange=false;
      else{
        this.outputL[0]=this.outputR[0]=this.lastVisiblePitch;
        this.outputL[1]=this.outputR[1]=0;
      }
    }
    this.gateWasHigh=clock;
    this.lastFamily=family;
    this.lastVisiblePitch=this.outputL[0];
  }
}
