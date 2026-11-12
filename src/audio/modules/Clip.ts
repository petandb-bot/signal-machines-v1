import {clamp} from '../DSPModule';
import {Effect} from './Effect';
export class Clip extends Effect {
  private shape(x:number,drive:number,hard:number){const v=x*(1+drive*drive*32),soft=Math.atan(v)*2/Math.PI;return x*(1-drive)+(soft*(1-hard)+clamp(v)*hard)*drive*.3/Math.sqrt(1+drive*.5);}
  process(){const drive=this.control(0,1),hard=this.control(1,2);this.finish(this.shape(this.inputL[0],drive,hard),this.shape(this.inputR[0],drive,hard));this.a=drive;this.b=hard;}
  override telemetry(){const drive=this.control(0,1),hard=this.control(1,2);return{...super.telemetry(),curve:Array.from({length:64},(_,i)=>this.shape((i/63*2-1)*.4,drive,hard)*2.5)};}
}
