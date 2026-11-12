import {DSPModule,clamp} from '../DSPModule';
import {gridStep} from '../ControlMath';
export class Quantize extends DSPModule {
  private gate=false;private value=0;private gridValue=0;private ready=false;
  process(sample:number){
    const span=.25+this.control(0,2)*1.75,input=clamp(this.inputL[0]*span+this.inputL[1]*.5),unit=gridStep(this.selectedMode),limit=Math.floor(2/unit+1e-9),bucket=clamp(Math.round(input*2/unit),-limit,limit),snapped=bucket*unit*.5,clock=this.inputL[3]>.5;
    this.outputL[1]=this.outputR[1]=0;
    if(!this.inputConnected[3]||(clock&&!this.gate)){
      this.value=input+(snapped-input)*this.parameters[1];if(this.ready&&Math.abs(snapped-this.gridValue)>1e-9){this.outputL[1]=this.outputR[1]=1;this.triggerSample=sample;this.envelope=1;}this.gridValue=snapped;this.ready=true;
    }
    this.gate=clock;this.outputL[0]=this.outputR[0]=this.value;this.a=input;this.b=this.value;this.phase=unit;this.envelope*=1-1/(this.sampleRate*.08);
  }
}
