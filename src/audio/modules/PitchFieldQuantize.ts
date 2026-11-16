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
export function nearestFieldNote(pitch:number,root:number,mode:FieldMode):number{
  if(!Number.isFinite(pitch)||!Number.isFinite(root))return 0;
  const intervals=FIELD_INTERVALS[mode];
  const octave=Math.floor((pitch-root)/12);
  let nearest=0,distance=Infinity;
  // Consider adjacent octaves so that negative pitches and octave
  // boundaries resolve symmetrically without a special-case root.
  for(let o=octave-1;o<=octave+1;o++){
    const offset=root+12*o;
    for(let i=0;i<intervals.length;i++){
      const note=offset+intervals[i],delta=Math.abs(pitch-note);
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
  private fieldClock=false;
  private fieldReady=false;

  override process(sample:number){
    const mode=this.selectedMode;
    if(mode!=='FIELD'&&mode!=='FRICTION'){
      super.process(sample);
      return;
    }
    // The legacy grid mode source remains byte-for-byte unchanged.
    const span=.25+this.control(0,2)*1.75;
    const input=clamp(this.inputL[0]*span);
    // An external common reference acts as the tonic for any number of
    // independent QUANTIZE instances. Unconnected SHIFT means C (zero).
    const root=Math.round(clamp(this.inputL[1])*24);
    const snapped=clamp(nearestFieldNote(input*24,root,mode)/24);
    const clock=this.inputL[3]>.5;
    this.outputL[1]=this.outputR[1]=0;
    if(!this.inputConnected[3]||(clock&&!this.fieldClock)){
      this.fieldValue=input+(snapped-input)*this.parameters[1];
      if(this.fieldReady&&Math.abs(snapped-this.fieldGridValue)>1e-9){
        this.outputL[1]=this.outputR[1]=1;
        this.envelope=1;
        this.triggerSample=sample;
      }
      this.fieldGridValue=snapped;
      this.fieldReady=true;
    }
    this.fieldClock=clock;
    this.outputL[0]=this.outputR[0]=this.fieldValue;
    this.a=input;this.b=this.fieldValue;this.phase=(root+24)/48;
    this.envelope*=1-1/(this.sampleRate*.08);
  }
}
