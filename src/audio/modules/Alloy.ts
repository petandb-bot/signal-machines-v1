import { DSPModule, TAU, clamp } from '../DSPModule';
import {sineAt} from '../SineTable';
interface Voice { carrier:number;mod:number;second:number;sub:number;amplitude:number;envelope:number;frequency:number;target:number;feedback:number;pan:number }
export class Alloy extends DSPModule {
  private readonly voices:Voice[]=Array.from({length:4},(_,i)=>({carrier:0,mod:0,second:0,sub:0,amplitude:0,envelope:0,frequency:110,target:110,feedback:0,pan:(i-1.5)*.13}));
  private readonly attack=1-Math.exp(-1/(this.sampleRate*.002));private readonly release=1-Math.exp(-1/(this.sampleRate*.006));
  private gate=false;private lastPitch=0;private readonly pitchSlew=1-Math.exp(-1/(this.sampleRate*.008));
  process(sample:number){
    const body=this.control(0,2),tension=this.control(1,3),pitch=clamp(this.inputL[1]),trigger=this.inputL[0]>.5,onset=trigger&&!this.gate;
    // A note event latches a new pitch without dragging older notes to it. Between
    // events CV movement transposes all sounding notes by the same interval.
    const transpose=onset?1:Math.pow(2,(pitch-this.lastPitch)*(this.wide?8:2));this.lastPitch=pitch;
    for(const v of this.voices)v.target=clamp(v.target*transpose,.01,this.sampleRate*.45);
    if(onset){let v=this.voices[0];for(let i=1;i<4;i++)if(this.voices[i].amplitude<v.amplitude)v=this.voices[i];v.target=Math.min(this.sampleRate*.45,110*Math.pow(2,pitch*(this.wide?8:2)));v.frequency=v.target;v.amplitude=1;this.triggerSample=sample;}this.gate=trigger;
    const soft=this.character==='SOFT',rough=this.character==='ROUGH',ratio=soft?2+tension*.08:rough?3.73+tension*.91:1.41421356+tension*tension*1.34,index=(soft?.12+tension*tension*3:rough?.5+tension*tension*12:.3+tension*tension*7)*(.6+body*.6),decay=Math.exp(-6.9/(this.sampleRate*(.24+body*body*9)));
    let left=0,right=0,env=0;
    for(const v of this.voices){if(v.amplitude<1e-6&&v.envelope<1e-6)continue;v.frequency+=(v.target-v.frequency)*this.pitchSlew;v.amplitude*=decay;v.envelope+=(v.amplitude-v.envelope)*(v.amplitude>v.envelope?this.attack:this.release);
      const frequency=v.frequency,band=Math.max(0,this.sampleRate*.43/frequency-1),safeIndex=Math.min(index,band/(ratio+1)),spectral=.2+.8*Math.sqrt(v.envelope);
      v.carrier=(v.carrier+frequency/this.sampleRate)%1;v.mod=(v.mod+Math.min(this.sampleRate*.45,frequency*ratio)/this.sampleRate)%1;v.second=(v.second+Math.min(this.sampleRate*.45,frequency*(rough?1.917:soft?1:1.003+tension*.2))/this.sampleRate)%1;v.sub=(v.sub+frequency*.5/this.sampleRate)%1;
      const modulation=sineAt((v.mod+v.feedback*(rough?.055:soft?0:.015)+1)%1);v.feedback+=(modulation-v.feedback)*.5;
      const phase=(v.carrier+(modulation*safeIndex*spectral+sineAt(v.second)*Math.min(tension*.5,band*.1))/TAU+8)%1;
      const signal=(sineAt(phase)*.86+sineAt(v.sub)*body*.14)*v.envelope*(soft?.19:rough?.17:.18);left+=signal*(1-v.pan);right+=signal*(1+v.pan);env=Math.max(env,v.envelope);
    }
    this.outputL[0]=left;this.outputR[0]=right;this.envelope=env;this.a=body;this.b=tension;this.phase=this.voices[0].carrier;
  }
}
