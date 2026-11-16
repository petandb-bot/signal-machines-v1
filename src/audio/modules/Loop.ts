import {DSPModule,clamp} from '../DSPModule';
import {LOOP_SECONDS,validateLoopAudio} from '../LoopAudio';
import type {LoopStatus,LoopAudio} from '../LoopAudio';
export class Loop extends DSPModule {
  private readonly left=new Float32Array(Math.ceil(this.sampleRate*LOOP_SECONDS));private readonly right=new Float32Array(this.left.length);
  private mode:LoopStatus['mode']='empty';private length=0;private write=0;private read=0;private trigger=false;
  private lastL=0;private lastR=0;private fromL=0;private fromR=0;private transition=0;
  private fade(){this.fromL=this.lastL;this.fromR=this.lastR;this.transition=1;}
  override command(action:string,payload?:unknown):unknown{
    switch(action){
      case'record':this.toggleRecord();break;
      case'dub':if(!this.length)throw new Error('Record or import a loop first.');this.fade();this.mode=this.mode==='overdub'?'playing':'overdub';break;
      case'play':if(!this.length)throw new Error('Record or import a loop first.');this.fade();this.mode=this.mode==='paused'?'playing':'paused';break;
      case'clear':this.fade();this.length=this.write=this.read=0;this.mode='empty';break;
      case'finish':if(this.mode==='recording'){this.fade();this.finish();}else if(this.mode==='overdub')this.mode='playing';break;
      case'restart':this.fade();if(this.mode==='recording')this.finish();this.read=0;this.mode=this.length?'playing':'empty';break;
      case'export':if(this.mode==='recording')this.finish();if(!this.length)throw new Error('There is no loop to export.');return{kind:'loopAudio',sampleRate:this.sampleRate,left:this.left.slice(0,this.length),right:this.right.slice(0,this.length)} satisfies LoopAudio;
      case'import':{const clip=validateLoopAudio(payload,this.sampleRate);this.fade();this.left.set(clip.left);this.right.set(clip.right);this.length=clip.left.length;this.read=0;this.mode='playing';break;}
      default:throw new Error('Unknown loop action.');
    }
    return this.status();
  }
  private toggleRecord(){this.fade();if(this.mode==='recording')this.finish();else{this.write=0;this.length=0;this.mode='recording';}}
  private finish(){this.length=this.write;this.read=0;this.mode=this.length>1?'playing':'empty';if(this.mode==='empty')this.length=0;}
  private status():LoopStatus{return{mode:this.mode,frames:this.mode==='recording'?this.write:this.length,sampleRate:this.sampleRate};}
  process(){
    const speed=(this.control(0,2)-.5)*4,mix=this.parameters[1],trigger=this.inputL[1]>.5;
    if(trigger&&!this.trigger)this.toggleRecord();this.trigger=trigger;
    const l=this.inputL[0],r=this.inputR[0];let wetL=0,wetR=0;
    if(this.mode==='recording'){this.left[this.write]=clamp(l);this.right[this.write]=clamp(r);if(++this.write>=this.left.length){this.fade();this.finish();}}
    else if(this.length>1&&this.mode!=='paused'){
      const index=Math.floor(this.read),f=this.read-index,next=(index+1)%this.length;
      const edge=Math.max(0,Math.min(1,this.read/Math.min(96,this.length*.15),(this.length-1-this.read)/Math.min(96,this.length*.15)));
      wetL=(this.left[index]*(1-f)+this.left[next]*f)*edge;wetR=(this.right[index]*(1-f)+this.right[next]*f)*edge;
      if(this.mode==='overdub'){this.left[index]=Math.tanh(this.left[index]*.985+l*.5);this.right[index]=Math.tanh(this.right[index]*.985+r*.5);}
      this.read=(this.read+speed+this.length)%this.length;
    }
    let outL=this.mode==='recording'?l:l*(1-mix)+wetL*mix,outR=this.mode==='recording'?r:r*(1-mix)+wetR*mix;
    if(this.transition>0){outL=outL*(1-this.transition)+this.fromL*this.transition;outR=outR*(1-this.transition)+this.fromR*this.transition;this.transition=Math.max(0,this.transition-1/(this.sampleRate*.008));}
    this.lastL=this.outputL[0]=outL;this.lastR=this.outputR[0]=outR;this.phase=this.length?this.read/this.length:0;this.a=this.phase;this.b=this.mode==='recording'?1:this.mode==='overdub'?.5:0;
    this.envelope+=((Math.abs(outL)+Math.abs(outR))*2-this.envelope)*.002;this.outputL[1]=this.outputR[1]=Math.min(1,this.envelope);
  }
  override telemetry(){return{...super.telemetry(),loop:this.status()};}
}
