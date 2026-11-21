import {DSPModule,clamp} from '../DSPModule';
import {CLOCK_RATIOS} from '../Dynamics';
import {defaultPhrase} from '../../graph/MusicalData';
import type {ModuleState,PhraseData} from '../../graph/types';
/** Writeable pitch and note lengths. The score does not mutate. */
export class Phrase extends DSPModule{
  private data:PhraseData;
  private step=-1;private clockHigh=false;private resetHigh=false;
  private remaining=0;private period=1;private lastTick=-1;private until=0;private pitch=0;private velocity=0;
  constructor(...args:ConstructorParameters<typeof DSPModule>){super(...args);this.data=this.state.phrase??defaultPhrase();}
  override update(state:ModuleState){super.update(state);this.data=state.phrase??defaultPhrase();}
  process(sample:number,bpm:number){
    const clock=this.inputL[0]>.5,reset=this.inputL[2]>.5;
    if(reset&&!this.resetHigh){this.step=-1;this.remaining=0;this.until=0;this.lastTick=-1;}this.resetHigh=reset;
    this.outputL[1]=this.outputR[1]=0;
    const fire=this.inputConnected[0]?clock&&!this.clockHigh:this.remaining<=0;this.clockHigh=clock;
    if(fire){
      if(this.inputConnected[0]){if(this.lastTick>=0)this.period=Math.max(1,sample-this.lastTick);}
      else{const n=Math.min(6,Math.round(this.parameters[0]*6));this.period=this.sampleRate*60/Math.max(20,bpm)/CLOCK_RATIOS[n];this.remaining+=this.period;}
      this.lastTick=sample;this.step=(this.step+1)%(this.selectedMode==='8'?8:16);
      const note=this.data.steps[this.step],deviation=this.parameters[1];
      let pitch=note.pitch,rest=note.rest;
      if(deviation>0&&this.random.next()<deviation*.2){if(this.random.next()<.2)rest=true;else pitch+=this.random.next()<.5?-1:1;}
      this.pitch=clamp(pitch/24+clamp(this.inputL[1],-1,1)*.5);this.velocity=rest?0:note.velocity;
      this.until=rest?sample:sample+Math.max(1,Math.round(note.length*this.period));
      if(!rest){this.outputL[1]=this.outputR[1]=1;this.triggerSample=sample;this.envelope=1;}
      this.phase=this.step/(this.selectedMode==='8'?8:16);this.a=this.pitch;this.b=this.velocity;
    }
    if(!this.inputConnected[0])this.remaining--;
    this.outputL[0]=this.outputR[0]=this.pitch;this.outputL[2]=this.outputR[2]=sample<this.until?1:0;this.outputL[3]=this.outputR[3]=this.velocity;
    this.envelope*=1-1/(this.sampleRate*.12);
  }
  override capture(){this.wave[this.waveIndex]=this.outputL[2]?this.outputL[3]:0;this.waveIndex=(this.waveIndex+1)%64;}
}