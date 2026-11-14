import {DSPModule} from '../DSPModule';
import {finiteAudio,finiteUnit} from './MachineSafety';
import {foundRef} from '../../samples/FoundData';
import type {FoundAudio} from '../../samples/FoundData';

/** Finite one-shot events with explicit rests. No FOUND region selector/readers. */
export class Cuts extends DSPModule {
  private audio?:FoundAudio;reference=foundRef(this.state.sample);
  private readonly positions=new Float64Array(3);private readonly steps=new Float64Array(3);
  private readonly ages=new Float64Array(3);private readonly lengths=new Float64Array(3);
  private readonly history=new Int16Array(8).fill(-1);private historyAt=0;
  private next=Math.round(this.sampleRate*.08);private cooldown=0;private high=false;
  private sparse=.58;private change=.35;private selected=0;private displayed=0;
  override update(state:typeof this.state){super.update(state);this.reference=foundRef(state.sample);}
  attach(audio?:FoundAudio){if(this.audio===audio)return;this.audio=audio;this.lengths.fill(0);this.history.fill(-1);this.next=Math.round(this.sampleRate*.08);this.a=this.b=this.phase=0;}
  process(sample:number){
    this.sparse+=(finiteUnit(this.parameters[0],.58)-this.sparse)*.003;
    this.change+=(finiteUnit(this.parameters[1],.35)-this.change)*.003;
    const trig=finiteAudio(this.inputL[0])>0,rise=trig&&!this.high;this.high=trig;
    this.outputL.fill(0);this.outputR.fill(0);this.cooldown=Math.max(0,this.cooldown-1);
    const audio=this.audio,events=audio?.cuts;if(!audio||!events?.length){this.envelope=0;return;}
    this.next--;
    if(!this.cooldown&&(rise||(!this.inputConnected[0]&&this.next<=0))){
      let voice=-1;for(let i=0;i<3;i++)if(this.ages[i]>=this.lengths[i]){voice=i;break;}
      if(voice>=0){
        let chosen=0,best=-Infinity;
        const desired=Math.floor(this.random.next()*3),kind=desired===0?'attack':desired===1?'texture':'tail';
        for(let attempt=0;attempt<12;attempt++){
          const i=Math.floor(this.random.next()*events.length),event=events[i];
          const recent=this.history.includes(i),score=event.weight*.2+(event.kind===kind?this.change*.6:0)+this.random.next()*(.2+this.change)- (recent?1.4:0);
          if(score>best){best=score;chosen=i;}
        }
        const event=events[chosen],speed=(1-this.change*.25)+(this.random.next()-.5)*this.change*.8;
        const reverse=this.random.next()<this.change*.24;
        const available=event.end-event.start,duration=Math.min(available/audio.sampleRate/speed,.56-this.change*.22);
        this.positions[voice]=reverse?event.end-2:event.start;this.steps[voice]=audio.sampleRate/this.sampleRate*speed*(reverse?-1:1);
        this.lengths[voice]=Math.max(16,Math.floor(duration*this.sampleRate));this.ages[voice]=0;
        this.history[this.historyAt++%this.history.length]=chosen;this.selected=chosen;this.displayed=voice;
        this.a=event.start/audio.left.length;this.b=event.end/audio.left.length;
        this.outputL[1]=this.outputR[1]=1;this.triggerSample=sample;
        this.cooldown=Math.round(this.sampleRate*(.025+this.sparse*this.sparse*.3));
      }
      this.next=Math.round(this.sampleRate*(.13+this.sparse*this.sparse*4.8)*(.72+this.random.next()*.6));
    }
    let l=0,r=0,activity=0;
    for(let v=0;v<3;v++){
      const length=this.lengths[v],age=this.ages[v];if(age>=length)continue;
      const at=this.positions[v],i=Math.floor(at),f=at-i;
      // Raised-cosine edges, with a longer release, retain short attacks without clicks.
      const attack=Math.min(1,age/(this.sampleRate*.004)),release=Math.min(1,(length-1-age)/(this.sampleRate*.018));
      const env=(.5-.5*Math.cos(Math.PI*attack))*(.5-.5*Math.cos(Math.PI*release));
      if(i>=0&&i<audio.left.length-1){l+=finiteAudio(audio.left[i]+(audio.left[i+1]-audio.left[i])*f)*env;r+=finiteAudio(audio.right[i]+(audio.right[i+1]-audio.right[i])*f)*env;}
      activity=Math.max(activity,env);this.positions[v]+=this.steps[v];this.ages[v]++;
      if(v===this.displayed)this.phase=Math.max(0,Math.min(1,at/audio.left.length));
    }
    this.outputL[0]=l*.78;this.outputR[0]=r*.78;
    this.envelope+=(activity-this.envelope)*.01;
  }
  override telemetry(){return {...super.telemetry(),curve:this.audio?.peaks,bands:[this.selected,this.next/this.sampleRate,this.envelope]};}
}
