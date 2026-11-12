import {DSPModule,clamp,TAU} from '../DSPModule';
export class Sideways extends DSPModule {
  private x=0;private y=0;private vx=0;private vy=0;
  process(){
    const force=this.control(0,2)*2-1,inertia=this.control(1,3),w=TAU*(.12+18*Math.pow(1-inertia,3)),a=this.inputL[0],b=this.inputL[1],tx=clamp(a+force*(b-a)*.7),ty=clamp(b+force*(a-b)*.7);
    const ax=w*w*(tx-this.x+force*(this.y-this.x)*.15)-1.7*w*this.vx,ay=w*w*(ty-this.y+force*(this.x-this.y)*.15)-1.7*w*this.vy;
    this.vx=clamp(this.vx+ax/this.sampleRate,-100,100);this.vy=clamp(this.vy+ay/this.sampleRate,-100,100);this.x=clamp(this.x+this.vx/this.sampleRate);this.y=clamp(this.y+this.vy/this.sampleRate);
    this.outputL[0]=this.outputR[0]=this.x;this.outputL[1]=this.outputR[1]=this.y;this.outputL[2]=this.outputR[2]=clamp(this.x-this.y);this.a=this.x;this.b=this.y;this.phase=(force+1)*.5;this.envelope=Math.min(1,(Math.abs(this.vx)+Math.abs(this.vy))*.2);
  }
}
