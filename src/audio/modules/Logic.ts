import {DSPModule} from '../DSPModule';
import {LOGIC_RATIOS} from '../ControlMath';
/** A/B become short gate windows; the logical result emits one-sample rising events. */
export class Logic extends DSPModule {
  private readonly delayedA=new Uint8Array(Math.ceil(this.sampleRate*.5)+1);private readonly delayedB=new Uint8Array(this.delayedA.length);private cursor=0;private elapsed=0;private gateA=false;private gateB=false;private lastA=-1;private lastB=-1;private hasClock=false;private periodA=this.sampleRate*.5;private periodB=this.sampleRate*.5;private nextB=0;private untilA=-1;private untilB=-1;private wasLogic=false;private hadExternalB=false;
  process(sample:number,bpm:number){
    const ratio=LOGIC_RATIOS[Math.min(6,Math.round(this.control(0,2)*6))],shift=(this.control(1,3)-.5)*this.sampleRate,a=this.inputL[0]>.5,b=this.inputL[1]>.5,eventA=a&&!this.gateA;
    if(eventA){if(this.lastA>=0)this.periodA=Math.max(1,this.elapsed-this.lastA);else this.periodA=this.sampleRate*60/bpm;this.lastA=this.elapsed;if(!this.hasClock){this.hasClock=true;this.nextB=this.elapsed;}}
    if(this.hadExternalB&&!this.inputConnected[1])this.nextB=this.elapsed;this.hadExternalB=!!this.inputConnected[1];
    let eventB=b&&!this.gateB;
    if(!this.inputConnected[1]&&this.hasClock){this.periodB=this.periodA/ratio;eventB=this.elapsed+1e-8>=this.nextB;if(eventB)this.nextB+=Math.max(1,this.periodB);}
    this.gateA=a;this.gateB=b;
    if(eventA)this.delayedA[(this.cursor+Math.round(Math.max(0,-shift)))%this.delayedA.length]=1;
    if(eventB)this.delayedB[(this.cursor+Math.round(Math.max(0,shift)))%this.delayedB.length]=1;
    const readyA=this.delayedA[this.cursor]!==0,readyB=this.delayedB[this.cursor]!==0;this.delayedA[this.cursor]=this.delayedB[this.cursor]=0;
    const window=Math.max(1,Math.round(this.sampleRate*.006));if(readyA)this.untilA=this.elapsed+window;if(readyB){this.untilB=this.elapsed+window;if(this.inputConnected[1]&&this.lastB>=0)this.periodB=Math.max(1,this.elapsed-this.lastB);this.lastB=this.elapsed;this.phase=0;}else if(this.lastB>=0)this.phase=(this.phase+1/Math.max(1,this.periodB))%1;
    const activeA=this.elapsed<this.untilA,activeB=this.elapsed<this.untilB,logical=this.selectedMode==='AND'?activeA&&activeB:this.selectedMode==='XOR'?activeA!==activeB:activeA||activeB,event=logical&&!this.wasLogic;this.wasLogic=logical;
    this.outputL[0]=this.outputR[0]=event?1:0;this.outputL[1]=this.outputR[1]=readyA?1:0;this.outputL[2]=this.outputR[2]=readyB?1:0;this.outputL[3]=this.outputR[3]=this.phase;
    if(event){this.envelope=1;this.triggerSample=sample;}else this.envelope*=1-1/(this.sampleRate*.08);this.a=activeA?1:0;this.b=activeB?1:0;this.elapsed++;this.cursor=(this.cursor+1)%this.delayedA.length;
  }
  override capture(){this.wave[this.waveIndex]=this.a?1:this.b?-.7:0;this.waveIndex=(this.waveIndex+1)%64;}
}
