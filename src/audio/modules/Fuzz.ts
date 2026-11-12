import {Effect} from './Effect';
export class Fuzz extends Effect {
  private readonly attack=1-Math.exp(-1/(this.sampleRate*.002));private readonly release=1-Math.exp(-1/(this.sampleRate*.025));
  private detector=0;private gate=0;private readonly old=new Float64Array(2);private readonly dc=new Float64Array(2);private readonly pole=Math.exp(-Math.PI/this.sampleRate);
  process(){
    const drive=this.control(0,1),bias=this.control(1,2),level=Math.max(Math.abs(this.inputL[0]),Math.abs(this.inputR[0]));this.detector+=(level-this.detector)*(level>this.detector?this.attack:this.release);
    const open=this.detector>.0005+Math.abs(bias-.5)**2*.15;this.gate+=((open?1:0)-this.gate)*Math.min(1,1/(this.sampleRate*(open?.002:.025)));
    const gain=1+drive*drive*100,offset=(bias-.5)*2,octave=Math.max(0,(bias-.6)/.4);let left=0,right=0;
    for(let c=0;c<2;c++){
      const x=c?this.inputR[0]:this.inputL[0],clipped=Math.tanh(x*gain+offset)-Math.tanh(offset),rectified=clipped*(1-octave)+Math.abs(clipped)*octave;
      const dc=rectified-this.old[c]+this.pole*this.dc[c];this.old[c]=rectified;this.dc[c]=dc;
      const wet=x*(1-drive)+dc*.25*this.gate*drive;if(c)right=wet;else left=wet;
    }
    this.finish(left,right);this.a=drive;this.b=this.gate;this.phase=bias;
  }
}
