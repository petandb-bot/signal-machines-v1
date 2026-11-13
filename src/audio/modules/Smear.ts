import {DSPModule,clamp,TAU} from '../DSPModule';

const CROSSOVERS=[320,1600,5200];
// Fixed, unequal histories: moving MEMORY never moves a read head or shifts pitch.
const TIMES=[.0191,.0317,.0473,.0113,.0239,.0371,.0053,.0179,.0293,.0029,.0077,.0137];

/** Four complementary bands lose their attack togetherness, without slicing/replaying grains. */
export class Smear extends DSPModule {
  private readonly filters=new Float64Array(6);
  private readonly coefficients=Float64Array.from(CROSSOVERS,f=>1-Math.exp(-TAU*Math.min(f,this.sampleRate*.4)/this.sampleRate));
  private readonly buffers=Array.from({length:24},(_,i)=>new Float32Array(Math.max(2,Math.round(TIMES[i%12]*this.sampleRate))));
  private readonly heads=new Uint32Array(24);
  private readonly levels=new Float64Array(8);
  private readonly magnitudes=new Float64Array(8);
  private readonly dryWave=new Float32Array(64);
  private amount=this.parameters[0];private memory=this.parameters[1];
  private readonly slew=1-Math.exp(-1/(this.sampleRate*.012));
  private readonly meter=1-Math.exp(-1/(this.sampleRate*.02));
  process(){
    this.amount+=(this.control(0,1)-this.amount)*this.slew;
    this.memory+=(this.control(1,2)-this.memory)*this.slew;
    const g0=.08+.73*this.memory,g1=.12+.66*this.memory,g2=.16+.59*this.memory;
    const direct=-g0*g1*g2,normalization=1/Math.sqrt(1-direct*direct);
    this.magnitudes.fill(0);
    for(let c=0;c<2;c++){
      const dry=c?this.inputR[0]:this.inputL[0],input=clamp(dry,-4,4);let previous=0,wet=0;
      for(let band=0;band<4;band++){
        let component=input-previous;
        if(band<3){const j=c*3+band;this.filters[j]+=(input-this.filters[j])*this.coefficients[band];component=this.filters[j]-previous;previous=this.filters[j];}
        let signal=component;
        for(let stage=0;stage<3;stage++){
          const j=c*12+band*3+stage,buffer=this.buffers[j],head=this.heads[j],g=stage===0?g0:stage===1?g1:g2;
          const output=buffer[head]-g*signal,next=signal+g*output;
          buffer[head]=Math.abs(next)<1e-20?0:next;this.heads[j]=head+1===buffer.length?0:head+1;signal=output;
        }
        // Remove just the allpass chain's instantaneous term. The rest is dispersed history.
        const dissolved=(signal-direct*component)*normalization;wet+=dissolved;
        this.magnitudes[band]+=Math.abs(component)*.5;this.magnitudes[band+4]+=Math.abs(dissolved)*.5;
      }
      const result=this.amount===0?dry:dry*(1-this.amount)+1.2*Math.tanh(wet*.85/1.2)*this.amount;
      if(c===0)this.outputL[0]=result;else this.outputR[0]=result;
    }
    for(let i=0;i<8;i++)this.levels[i]+=(this.magnitudes[i]-this.levels[i])*this.meter;
    this.envelope+=((Math.abs(this.outputL[0])+Math.abs(this.outputR[0]))*2-this.envelope)*this.meter;
    this.outputL[1]=this.outputR[1]=clamp(this.envelope,0,1);
    this.a=this.amount;this.b=this.memory;this.phase=clamp((this.levels[4]+this.levels[5]+this.levels[6]+this.levels[7])*6,0,1);
  }
  override capture(){const index=this.waveIndex;super.capture();this.dryWave[index]=this.inputL[0];}
  override telemetry(){return{...super.telemetry(),bands:Array.from(this.levels),curve:Array.from({length:64},(_,i)=>this.dryWave[(this.waveIndex+i)%64])};}
}
