import {DSPModule} from '../DSPModule';
import {CLOCK_RATIOS} from '../Dynamics';
export class Count extends DSPModule {
  private value=0;private gate=false;private reset=false;private audioGate=false;private oldAudio=-1;private dc=0;private readonly pole=Math.exp(-Math.PI*20/this.sampleRate);
  process(sample:number,bpm:number){
    const step=1+Math.min(14,Math.round(this.control(0,1)*14)),rate=this.parameters[1],clock=this.inputL[0]>.5,reset=this.inputL[2]>.5;
    this.outputL[0]=this.outputR[0]=this.outputL[1]=this.outputR[1]=0;
    if(reset&&!this.reset){this.value=0;this.phase=0;}this.reset=reset;
    const audio=this.inputL[3];let audioEdge=false;if(!this.audioGate&&audio>.01){this.audioGate=true;audioEdge=true;}else if(this.audioGate&&audio<-.01)this.audioGate=false;
    let fire=false;
    if(this.inputConnected[0])fire=clock&&!this.gate;else if(this.inputConnected[3])fire=audioEdge;else{const frequency=this.selectedMode==='AUDIO'?Math.min(this.sampleRate*.25,30*Math.pow(2,rate*8)):bpm/60*CLOCK_RATIOS[Math.min(6,Math.round(rate*6))];const next=this.phase+frequency/this.sampleRate;fire=next>=1;this.phase=next%1;}
    this.gate=clock;
    if(fire){const old=this.value;this.value=(this.value+step)&15;this.outputL[0]=this.outputR[0]=!(old&1)&&(this.value&1)?1:0;this.outputL[1]=this.outputR[1]=!(old&8)&&(this.value&8)?1:0;this.triggerSample=sample;this.envelope=1;}
    const cv=this.value/7.5-1;this.outputL[2]=this.outputR[2]=cv;this.dc=cv-this.oldAudio+this.pole*this.dc;this.oldAudio=cv;this.outputL[3]=this.outputR[3]=this.dc*.2;
    this.envelope*=1-1/(this.sampleRate*.07);this.a=this.value/15;this.b=step/15;
  }
  override capture(){this.wave[this.waveIndex]=this.outputL[3];this.waveIndex=(this.waveIndex+1)%64;}
}
