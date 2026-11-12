import {DSPModule,clamp} from '../DSPModule';
import {tunedHz} from '../ToneMath';
const ARP=[0,7,12,7],DUTY=[.125,.25,.5,.75];
/** Original stepped voice and LFSR noise, rather than emulation of a game console. */
export class Chip extends DSPModule {
  private lfsr=(this.state.seed&32767)||1;private gate=false;private amplitude=0;private elapsed=0;private old=0;private dc=0;private readonly pole=Math.exp(-Math.PI/this.sampleRate);private readonly weights=new Float64Array([1,0,0]);
  process(sample:number){
    const character=this.control(1,2),trigger=this.inputL[1]>.5;
    if(trigger&&!this.gate){this.amplitude=1;this.triggerSample=sample;}this.gate=trigger;
    if(this.inputConnected[1])this.amplitude*=Math.exp(-1/(this.sampleRate*(.05+character*character*1.5)));else this.amplitude=1;
    const arpeggio=character>.6&&this.selectedMode!=='NOISE'?ARP[Math.floor(this.elapsed/(this.sampleRate*(.012+(1-character)*.05)))%4]:0;
    const requested=tunedHz(this.parameters[0],this.inputL[0],this.wide)*Math.pow(2,arpeggio/12),period=clamp(Math.round(111860/Math.max(.001,requested)),1,65535),frequency=Math.min(this.sampleRate*.45,111860/period),step=frequency/this.sampleRate;
    const t=this.phase;this.phase=(this.phase+step)%1;if(t+step>=1){const tap=character>.5?6:1,bit=(this.lfsr^(this.lfsr>>tap))&1;this.lfsr=(this.lfsr>>1)|(bit<<14);}
    const duty=DUTY[Math.min(3,Math.floor(character*4))],pulse=t<duty?1:-1,triangle=1-4*Math.abs(Math.floor(t*32)/32-.5),noise=this.lfsr&1?1:-1,mode=this.selectedMode==='TRIANGLE'?1:this.selectedMode==='NOISE'?2:0;let signal=0;
    for(let i=0;i<3;i++){this.weights[i]+=((mode===i?1:0)-this.weights[i])*Math.min(1,1/(this.sampleRate*.006));signal+=this.weights[i]*(i===0?pulse:i===1?triangle:noise);}
    signal=Math.round(signal*127)/127;this.dc=signal-this.old+this.pole*this.dc;this.old=signal;
    this.outputL[0]=this.outputR[0]=this.dc*.15*this.amplitude;this.envelope+=(Math.abs(this.outputL[0])*3-this.envelope)*.002;this.outputL[1]=this.outputR[1]=Math.min(1,this.envelope);this.a=character;this.b=mode/2;this.elapsed++;
  }
}
