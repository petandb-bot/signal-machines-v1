import {Effect} from './Effect';
import {finiteAudio,machineControl} from './MachineSafety';

/** Three-band causal packet decoder. Missing data is never read from the input. */
export class Loss extends Effect {
  private readonly frames=Math.max(16,Math.round(this.sampleRate*.0035));
  private readonly history=new Float32Array(this.frames*6);
  private readonly low=new Float64Array(2);private readonly high=new Float64Array(2);
  private readonly decoded=new Float64Array(6);private readonly last=new Float64Array(6);
  private readonly repairState=new Float64Array(6);
  private readonly slope=new Float64Array(6);private readonly peak=new Float64Array(6);
  private readonly erased=new Uint8Array(3);private readonly blend=new Float64Array(3);
  private readonly lowPole=1-Math.exp(-Math.PI*2*420/this.sampleRate);
  private readonly highPole=1-Math.exp(-Math.PI*2*2600/this.sampleRate);
  private readonly follow=1-Math.exp(-1/(this.sampleRate*.001));
  private damage=.35;private recover=.6;private cursor=0;private lostAge=0;

  process(){
    const l=this.inputL[0]=finiteAudio(this.inputL[0]),r=this.inputR[0]=finiteAudio(this.inputR[0]);
    this.damage+=(machineControl(this,0,1,.35)-this.damage)*.003;
    this.recover+=(machineControl(this,1,2,.6)-this.recover)*.003;
    // A zero setting remains exactly transparent, including before macro settling.
    const transparent=machineControl(this,0,1,.35)===0;
    if(this.cursor===0){
      for(let b=0;b<3;b++)this.erased[b]=!transparent&&this.random.next()<this.damage*(this.erased[b]?.86:.7)?1:0;
      this.lostAge=this.erased[0]+this.erased[1]+this.erased[2];
    }
    let left=0,right=0;
    const decay=Math.exp(-1/(this.sampleRate*(.001+this.recover*.065))),memoryDecay=Math.exp(-1/(this.sampleRate*(.008+this.recover*.18)));
    for(let b=0;b<3;b++)this.blend[b]+=((transparent?0:this.erased[b])-this.blend[b])*this.follow;
    for(let c=0;c<2;c++){
      const x=c?r:l;this.low[c]+=(x-this.low[c])*this.lowPole;this.high[c]+=(x-this.high[c])*this.highPole;
      let y=0;
      for(let b=0;b<3;b++){
        const band=b===0?this.low[c]:b===1?this.high[c]-this.low[c]:x-this.high[c];
        const j=c*3+b,at=j*this.frames+this.cursor,remembered=this.history[at];
        if(!this.erased[b]||transparent){
          this.history[at]=band;this.peak[j]=Math.max(Math.abs(band),this.peak[j]*.999);
          this.slope[j]=(band-this.last[j])*.35;this.decoded[j]=band;
        }else{
          this.slope[j]*=.87;this.decoded[j]=(this.decoded[j]+this.slope[j])*decay;
        }
        // Recovery moves from a damped extrapolation to a last-good-frame echo.
        // Neither branch receives any samples from an erased band.
        const repair=this.recover*.82,limit=this.peak[j]*1.12;
        const estimate=Math.max(-limit,Math.min(limit,this.decoded[j]*(1-repair)+remembered*repair));
        this.repairState[j]+=(estimate-this.repairState[j])*this.follow;
        y+=band*(1-this.blend[b])+this.repairState[j]*this.blend[b];this.last[j]=band;
        if(this.erased[b])this.peak[j]*=memoryDecay;
      }
      if(c)right=y;else left=y;
    }
    this.finish(transparent?l:left,transparent?r:right);
    this.a=this.lostAge/3;this.b=this.recover;this.phase=this.cursor/this.frames;
    if(++this.cursor>=this.frames)this.cursor=0;
  }
  override telemetry(){return {...super.telemetry(),bands:Array.from(this.blend)};}
}
