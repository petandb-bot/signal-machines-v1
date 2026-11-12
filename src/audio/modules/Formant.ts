import {DSPModule,clamp} from '../DSPModule';
import {polyBlep,tunedHz} from '../ToneMath';
import {VOWELS,VOWEL_WIDTHS} from '../ControlMath';
export class Formant extends DSPModule {
  private readonly g=new Float64Array(3);private readonly k=new Float64Array(3);private readonly a1=new Float64Array(3);private readonly ic1=new Float64Array(6);private readonly ic2=new Float64Array(6);private readonly noise=new Float64Array(2);private readonly levels=new Float64Array(3);private counter=0;private pitch=0;
  process(){
    const vowel=this.control(1,1),breath=this.inputConnected[2]?clamp(this.inputL[2],0,1):.16;this.pitch+=(clamp(this.inputL[0])-this.pitch)*Math.min(1,1/(this.sampleRate*.015));
    if(this.counter++%16===0){const p=vowel*4,index=Math.min(3,Math.floor(p)),f=p-index;for(let i=0;i<3;i++){const frequency=Math.min(this.sampleRate*.42,VOWELS[index][i]*(1-f)+VOWELS[index+1][i]*f),width=VOWEL_WIDTHS[index][i]*(1-f)+VOWEL_WIDTHS[index+1][i]*f;this.g[i]=Math.tan(Math.PI*frequency/this.sampleRate);this.k[i]=width/frequency;this.a1[i]=1/(1+this.g[i]*(this.g[i]+this.k[i]));}}
    const frequency=Math.min(this.sampleRate*(this.wide?.45:.12),tunedHz(this.parameters[0],this.pitch,this.wide)),step=frequency/this.sampleRate,saw=2*this.phase-1-polyBlep(this.phase,step);this.phase=(this.phase+step)%1;
    for(let c=0;c<2;c++){
      this.noise[c]+=(this.random.next()*2-1-this.noise[c])*.35;
      const source=this.inputConnected[3]?(c===0?this.inputL[3]:this.inputR[3]):this.selectedMode==='WHISPER'?this.noise[c]*.14*(.75+breath*.25):saw*.15*(1-breath*.7)+this.noise[c]*.13*breath;let output=0;
      for(let i=0;i<3;i++){const index=c*3+i,g=this.g[i],v3=Math.tanh(source)-this.ic2[index],band=this.a1[i]*this.ic1[index]+g*this.a1[i]*v3,low=this.ic2[index]+g*band;this.ic1[index]=clamp(2*band-this.ic1[index],-8,8);this.ic2[index]=clamp(2*low-this.ic2[index],-8,8);const signal=band*this.k[i];output+=signal*(i===0?1:i===1?.7:.4);this.levels[i]+=(Math.abs(signal)-this.levels[i])*.002;}
      const signal=.65*Math.tanh(output*4/.65);if(c===0)this.outputL[0]=signal;else this.outputR[0]=signal;
    }
    this.a=vowel;this.b=breath;this.envelope+=((Math.abs(this.outputL[0])+Math.abs(this.outputR[0]))*2-this.envelope)*.002;this.outputL[1]=this.outputR[1]=Math.min(1,this.envelope);
  }
  override telemetry(){return{...super.telemetry(),bands:Array.from(this.levels)};}
}
