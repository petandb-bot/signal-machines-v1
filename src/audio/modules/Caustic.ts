import { DSPModule } from '../DSPModule';

/** Asymmetric wavefolding and envelope-dependent supply starvation. No external feedback loop. */
export class Caustic extends DSPModule {
  private supply=1;private energy=0;
  private dcL=0;private dcR=0;private previousL=0;private previousR=0;
  process(){
    const burn=this.control(0,1),starve=this.control(1,2);
    const l=this.inputL[0],r=this.inputR[0];
    this.energy+=((Math.abs(l)+Math.abs(r))*.5-this.energy)*.002;
    const target=1/(1+this.energy*starve*24);
    this.supply+=(target-this.supply)/(this.sampleRate*(target < this.supply ? .002 : .01+starve*.16));
    const drive=1+burn*burn*48,bias=starve*this.energy*5;
    const reference=Math.asin(Math.sin(bias))*2/Math.PI;
    const foldedL=(Math.asin(Math.sin(l*drive+bias))*2/Math.PI-reference)*.24;
    const foldedR=(Math.asin(Math.sin(r*drive-bias))*2/Math.PI+reference)*.24;
    const wetL=foldedL*this.supply,wetR=foldedR*this.supply;
    this.dcL=wetL-this.previousL+.997*this.dcL;this.previousL=wetL;
    this.dcR=wetR-this.previousR+.997*this.dcR;this.previousR=wetR;
    this.outputL[0]=l*(1-burn)+this.dcL*burn;
    this.outputR[0]=r*(1-burn)+this.dcR*burn;
    this.a=burn;this.b=this.supply;this.envelope=Math.min(1,this.energy*4);
    this.outputL[1]=this.outputR[1]=this.envelope;
  }
}
