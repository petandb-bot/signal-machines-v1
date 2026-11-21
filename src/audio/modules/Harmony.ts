import {DSPModule,clamp} from '../DSPModule';
import {CLOCK_RATIOS} from '../Dynamics';
import {CHORD_INTERVALS,defaultHarmony} from '../../graph/MusicalData';
import type {HarmonyData,ModuleState} from '../../graph/types';
/** Four CV voices with ordered voice leading and opt-in suspensions. */
export class Harmony extends DSPModule{
  private data:HarmonyData;private target=new Float64Array(4);private current=new Float64Array(4);private previous=new Float64Array(4);
  private step=-1;private clockHigh=false;private resetHigh=false;private remaining=0;private period=1;private lastTick=-1;private ready=false;
  private heldVoice=-1;private holdUntil=0;private readonly slew=1-Math.exp(-1/(this.sampleRate*.014));
  constructor(...args:ConstructorParameters<typeof DSPModule>){super(...args);this.data=this.state.harmony??defaultHarmony();}
  override update(state:ModuleState){super.update(state);this.data=state.harmony??defaultHarmony();}
  private chooseVoices(root:number,intervals:readonly number[]){
    for(let i=0;i<4;i++){
      const raw=root+intervals[i];let best=clamp(raw,-24,24),cost=Infinity;
      for(let oct=-2;oct<=2;oct++){
        const candidate=raw+oct*12;
        if(candidate < -24||candidate >24||(i&&candidate<=this.target[i-1]))continue;
        const anchor=this.ready?this.previous[i]:raw;
        const distance=Math.abs(candidate-anchor)+Math.abs(candidate-raw)*.07;
        if(distance<cost){cost=distance;best=candidate;}
      }
      this.target[i]=best;
    }
  }
  process(sample:number,bpm:number){
    const clock=this.inputL[0]>.5,reset=this.inputL[2]>.5;
    if(reset&&!this.resetHigh){this.step=-1;this.remaining=0;this.lastTick=-1;this.heldVoice=-1;}
    this.resetHigh=reset;this.outputL[4]=this.outputR[4]=0;
    const fire=this.inputConnected[0]?clock&&!this.clockHigh:this.remaining<=0;this.clockHigh=clock;
    if(fire){
      if(this.inputConnected[0]){if(this.lastTick>=0)this.period=Math.max(1,sample-this.lastTick);}
      else{const n=Math.min(6,Math.round(this.parameters[0]*6));this.period=this.sampleRate*60/Math.max(20,bpm)/CLOCK_RATIOS[n];this.remaining+=this.period;}
      this.lastTick=sample;this.step=(this.step+1)%(this.selectedMode==='4'?4:8);
      const chord=this.data.chords[this.step],intervals=CHORD_INTERVALS[chord.quality];this.previous.set(this.target);this.chooseVoices(chord.root,intervals);
      if(!this.ready){this.current.set(this.target);this.previous.set(this.target);this.ready=true;}
      this.heldVoice=-1;
      if(this.parameters[1]>0&&this.random.next()<this.parameters[1]*.6){this.heldVoice=1+Math.floor(this.random.next()*3);this.holdUntil=sample+Math.round(this.period*.33);}
      this.outputL[4]=this.outputR[4]=1;this.triggerSample=sample;this.envelope=1;this.phase=this.step/(this.selectedMode==='4'?4:8);
    }
    if(!this.inputConnected[0])this.remaining--;
    const shift=clamp(this.inputL[1],-1,1)*12;
    for(let i=0;i<4;i++){
      const target=i===this.heldVoice&&sample<this.holdUntil?this.previous[i]:this.target[i];
      this.current[i]+=(target-this.current[i])*this.slew;
      this.outputL[i]=this.outputR[i]=clamp((this.current[i]+shift)/24,-1,1);
    }
    this.envelope*=1-1/(this.sampleRate*.18);this.a=this.current[0]/24;this.b=this.current[3]/24;
  }
  override capture(){this.wave[this.waveIndex]=this.outputL[0];this.waveIndex=(this.waveIndex+1)%64;}
}