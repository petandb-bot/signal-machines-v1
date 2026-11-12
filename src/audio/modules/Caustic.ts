import {DSPModule} from '../DSPModule';
const PI=Math.PI,TAU=PI*2;
export const fold=(x:number)=>{const t=((x+PI/2)%TAU+TAU)%TAU;return t<PI?-1+2*t/PI:3-2*t/PI;};
const primitive=(x:number)=>{const t=((x+PI/2)%TAU+TAU)%TAU;return t<PI?-t+t*t/PI:3*t-t*t/PI-2*PI;};
export const averagedFold=(x:number,old:number)=>Math.abs(x-old)<1e-5?fold((x+old)*.5):(primitive(x)-primitive(old))/(x-old);
/** First-order antiderivative averaging softens fold crossings without oversampling. */
export class Caustic extends DSPModule {
  private supply=1;private energy=0;private burn=this.parameters[0];private starve=this.parameters[1];private oldFoldL=0;private oldFoldR=0;private oldBias=0;private dcL=0;private dcR=0;private previousL=0;private previousR=0;
  process(){
    const slew=1-Math.exp(-1/(this.sampleRate*.004));this.burn+=(this.control(0,1)-this.burn)*slew;this.starve+=(this.control(1,2)-this.starve)*slew;const burn=this.burn,starve=this.starve,l=this.inputL[0],r=this.inputR[0];this.energy+=((Math.abs(l)+Math.abs(r))*.5-this.energy)*.002;
    const target=1/(1+this.energy*starve*24);this.supply+=(target-this.supply)/(this.sampleRate*(target<this.supply?.002:.01+starve*.16));const drive=1+burn*10+burn*burn*38,bias=starve*this.energy*5,reference=averagedFold(bias,this.oldBias),x=l*drive+bias,y=r*drive-bias;
    const wetL=(averagedFold(x,this.oldFoldL)-reference)*.24*this.supply,wetR=(averagedFold(y,this.oldFoldR)+reference)*.24*this.supply;this.oldFoldL=x;this.oldFoldR=y;this.oldBias=bias;this.dcL=wetL-this.previousL+.997*this.dcL;this.previousL=wetL;this.dcR=wetR-this.previousR+.997*this.dcR;this.previousR=wetR;
    const mix=Math.sqrt(Math.max(0,burn));this.outputL[0]=l*(1-mix)+this.dcL*mix;this.outputR[0]=r*(1-mix)+this.dcR*mix;this.a=burn;this.b=this.supply;this.envelope=Math.min(1,this.energy*4);this.outputL[1]=this.outputR[1]=this.envelope;
  }
}
