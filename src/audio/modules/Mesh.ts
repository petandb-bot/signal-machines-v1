import {DSPModule,clamp,TAU} from '../DSPModule';
const CROSSOVERS=[180,700,2200,6500];
/** Complementary differences of four one-poles form five broad bands. No resynthesis. */
export class Mesh extends DSPModule {
  private readonly coefficients=Float64Array.from(CROSSOVERS,f=>1-Math.exp(-TAU*Math.min(f,this.sampleRate*.43)/this.sampleRate));
  private readonly aFilters=new Float64Array(8);private readonly bFilters=new Float64Array(8);private readonly aBands=new Float64Array(10);private readonly bBands=new Float64Array(10);private readonly aEnergy=new Float64Array(5);private readonly bEnergy=new Float64Array(5);private readonly gains=new Float64Array([1,1,1,1,1]);
  private counter=0;private release=.99;private compensation=1;private readonly attack=1-Math.exp(-1/(this.sampleRate*.008));private readonly gainSlew=1-Math.exp(-1/(this.sampleRate*.006));
  process(){
    const transfer=this.parameters[0];if(this.counter++%16===0)this.release=1-Math.exp(-1/(this.sampleRate*(.02*Math.pow(100,this.parameters[1]))));
    for(let c=0;c<2;c++){
      const a=c?this.inputR[0]:this.inputL[0],b=c?this.inputR[1]:this.inputL[1];let previousA=0,previousB=0;
      for(let i=0;i<4;i++){const j=c*4+i;this.aFilters[j]+=(a-this.aFilters[j])*this.coefficients[i];this.bFilters[j]+=(b-this.bFilters[j])*this.coefficients[i];this.aBands[c*5+i]=this.aFilters[j]-previousA;this.bBands[c*5+i]=this.bFilters[j]-previousB;previousA=this.aFilters[j];previousB=this.bFilters[j];}
      this.aBands[c*5+4]=a-previousA;this.bBands[c*5+4]=b-previousB;
    }
    let sumB=0;for(let i=0;i<5;i++){const a=(Math.abs(this.aBands[i])+Math.abs(this.aBands[i+5]))*.5,b=(Math.abs(this.bBands[i])+Math.abs(this.bBands[i+5]))*.5;this.aEnergy[i]+=(a-this.aEnergy[i])*this.attack;this.bEnergy[i]+=(b-this.bEnergy[i])*(b>this.bEnergy[i]?this.attack:this.release);sumB+=this.bEnergy[i];}
    const strength=this.inputConnected[1]?clamp(sumB*12,0,1):0,mean=sumB/5;let left=0,right=0,dryEnergy=0,wetEnergy=0;
    for(let i=0;i<5;i++){const target=1+transfer*strength*clamp((this.bEnergy[i]/(mean+.00001)-1)*.5,-.6,.6);this.gains[i]+=(target-this.gains[i])*this.gainSlew;left+=this.aBands[i]*this.gains[i];right+=this.aBands[i+5]*this.gains[i];dryEnergy+=this.aEnergy[i]**2;wetEnergy+=(this.aEnergy[i]*this.gains[i])**2;}
    const compensation=clamp(Math.sqrt(wetEnergy/Math.max(1e-12,dryEnergy)),1,1.6);this.compensation+=(compensation-this.compensation)*this.gainSlew;
    const dry=transfer===0||!this.inputConnected[1];this.outputL[0]=dry?this.inputL[0]:left/this.compensation;this.outputR[0]=dry?this.inputR[0]:right/this.compensation;this.envelope+=((Math.abs(this.outputL[0])+Math.abs(this.outputR[0]))*2-this.envelope)*.002;this.outputL[1]=this.outputR[1]=clamp(this.envelope,0,1);this.a=transfer;this.b=strength;this.phase=this.parameters[1];
  }
  override telemetry(){return{...super.telemetry(),bands:[...this.aEnergy.map((v,i)=>v*(this.parameters[0]===0||!this.inputConnected[1]?1:this.gains[i]/this.compensation)),...this.bEnergy]};}
}
