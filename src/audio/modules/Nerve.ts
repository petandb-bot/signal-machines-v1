import {DSPModule} from '../DSPModule';
import {finiteAudio,finiteUnit} from './MachineSafety';

/** Deterministic excitable membrane: charge, adaptation and recovery, not chance. */
export class Nerve extends DSPModule {
  private charge=0;private fatigue=0;private refractory=0;private refractoryLength=1;
  private after=0;private high=false;private sense=.6;private tired=.55;
  process(sample:number){
    this.outputL.fill(0);this.outputR.fill(0);
    const trigger=finiteAudio(this.inputL[1])>0,rise=trigger&&!this.high;this.high=trigger;
    this.sense+=(finiteUnit(this.parameters[0],.6)-this.sense)*.003;
    this.tired+=(finiteUnit(this.parameters[1],.55)-this.tired)*.003;
    if(finiteAudio(this.inputL[2])>0){this.charge=this.fatigue=this.after=this.refractory=this.envelope=0;this.a=this.b=this.phase=0;this.triggerSample=-1;return;}
    const dt=1/this.sampleRate,stim=Math.max(0,Math.min(4,finiteAudio(this.inputL[0])));
    this.fatigue*=Math.exp(-dt/(.18+this.tired*this.tired*7.8));
    this.after*=Math.exp(-dt/.045);
    if(this.refractory>0){this.refractory--;this.charge*=Math.exp(-dt*18);}
    else{
      if(rise){this.charge+=(.25+this.sense*.8)*(1-this.fatigue*.55);this.after+=stim>.7?stim*.5:0;}
      this.charge+=dt*((stim*(2+this.sense*14)+this.after*5)*(1-this.fatigue*.72)-this.charge*3.2);
      this.charge=Math.max(0,Math.min(2,this.charge));
      const threshold=.72-this.sense*.56+this.fatigue*(.15+this.tired*.65);
      if(this.charge>=threshold){
        this.charge*=.12;this.fatigue=Math.min(1,this.fatigue+.035+this.tired*.27);
        this.refractoryLength=Math.max(1,Math.round(this.sampleRate*(.008+this.tired*this.tired*.19)));
        this.refractory=this.refractoryLength;this.outputL[0]=this.outputR[0]=1;
        this.triggerSample=sample;this.envelope=1;
      }
    }
    this.envelope*=Math.exp(-dt/.06);
    this.outputL[1]=this.outputR[1]=Math.min(1,this.charge/(.72-this.sense*.56+this.fatigue*(.15+this.tired*.65)));
    this.a=this.outputL[1];this.b=this.fatigue;this.phase=this.refractory/this.refractoryLength;
  }
}
