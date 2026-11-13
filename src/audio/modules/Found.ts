import {DSPModule,clamp} from '../DSPModule';
import {foundRef} from '../../samples/FoundData';
import type {FoundAudio} from '../../samples/FoundData';
import type {ModuleState} from '../../graph/types';
/** Two preallocated readers; feature/history selection happens only at region boundaries. */
export class Found extends DSPModule{
  reference=foundRef(this.state.sample);private audio?:FoundAudio;private oldAudio?:FoundAudio;
  private position=0;private start=0;private end=1;private speed=1;private oldPosition=0;private oldSpeed=1;
  private fading=0;private fadeLength=1;private readonly fadeFrames=Math.max(16,Math.round(this.sampleRate*.035));private dwell=0;private gate=false;private requested=false;private region=-1;private chosenAlter=0;private move=0;private readonly recent=new Int32Array(4).fill(-1);private history=0;private event=false;private readonly meter=1-Math.exp(-1/(this.sampleRate*.015));
  override update(state:ModuleState){super.update(state);this.reference=foundRef(state.sample);}
  attach(audio?:FoundAudio){if(this.audio===audio)return;this.oldAudio=this.audio;this.oldPosition=this.position;this.oldSpeed=this.speed;this.audio=audio;this.region=0;this.chosenAlter=0;this.start=0;this.end=audio?.left.length??1;this.position=0;this.speed=1;this.fadeLength=this.audio?Math.max(1,Math.min(this.fadeFrames,Math.floor((this.end-this.start)*this.sampleRate/this.audio.sampleRate/Math.max(1,Math.abs(this.speed))/4))):1;this.fading=this.fadeLength;this.dwell=0;this.recent.fill(-1);this.requested=false;}
  private read(buffer:Float32Array,pos:number){const i=Math.min(buffer.length-1,Math.max(0,Math.floor(pos))),f=pos-Math.floor(pos);return buffer[i]*(1-f)+buffer[Math.min(buffer.length-1,i+1)]*f;}
  private jump(force:boolean,retime=false){const a=this.audio;if(!a)return;const oldStart=this.start,oldEnd=this.end,w=this.parameters[0],alter=this.parameters[1];let selected=0;
    if(w>.001||force){let best=-Infinity;const target=(this.move+1)*.5;for(let i=0;i<a.regions.length;i++){const r=a.regions[i],distance=Math.abs(r.start/a.left.length-target),recent=this.recent.includes(i),score=(.25+r.change*.5+(1-r.energy)*.15)*(1.1-distance*.8)*(recent?.12:1)*(.75+this.random.next()*.5);if(score>best){best=score;selected=i;}}}
    if(retime)selected=Math.max(0,this.region);
    this.oldAudio=a;this.oldPosition=this.position;this.oldSpeed=this.speed;
    const duration=a.left.length/a.sampleRate,minimum=Math.min(.35,duration/4),explore=force?Math.max(w,.55):w,base=minimum+(duration-minimum)*(1-explore)**2,seconds=Math.min(duration,Math.max(minimum,base*(1-alter*alter*.85)));
    const start=w<.001&&!force?0:a.regions[selected].start,maxStart=Math.max(0,a.left.length-Math.round(seconds*a.sampleRate));this.start=Math.min(start,maxStart);this.end=Math.min(a.left.length,this.start+Math.max(2,Math.round(seconds*a.sampleRate)));
    this.speed=alter<.001?1:Math.pow(2,(this.random.next()-.5)*alter*1.5)*(this.random.next()<alter*alter*.32?-1:1);
    this.position=retime?clamp(this.oldPosition,this.start,this.end-1):this.speed<0?this.end-1:this.start;
    this.event=this.region>=0&&(this.start!==oldStart||this.end!==oldEnd);this.region=selected;this.recent[this.history++%4]=selected;this.fadeLength=this.audio?Math.max(1,Math.min(this.fadeFrames,Math.floor((this.end-this.start)*this.sampleRate/this.audio.sampleRate/Math.max(1,Math.abs(this.speed))/4))):1;this.fading=this.fadeLength;this.dwell=this.sampleRate*(.45+(1-w)**2*8);this.chosenAlter=alter;
  }
  process(sample:number){
    const trig=this.inputL[0]>.5;if(trig&&!this.gate)this.requested=true;this.gate=trig;this.move+=(clamp(this.inputL[1])-this.move)*.002;this.event=false;
    const a=this.audio;
    if(a){
      const boundary=this.speed>=0?this.position>=this.end-this.fadeLength*Math.abs(this.speed)*a.sampleRate/this.sampleRate:this.position<this.start+this.fadeLength*Math.abs(this.speed)*a.sampleRate/this.sampleRate;
      if(this.fading<=0&&(this.requested||(this.parameters[0]>.001&&this.dwell<=0)||this.region<0||Math.abs(this.parameters[1]-this.chosenAlter)>.12||boundary)){
        const retime=!this.requested&&this.region>=0&&Math.abs(this.parameters[1]-this.chosenAlter)>.12;
        if(boundary&&this.dwell>0&&!this.requested&&!retime){this.oldAudio=a;this.oldPosition=this.position;this.oldSpeed=this.speed;this.position=this.speed>=0?this.start:this.end-1;this.fadeLength=this.audio?Math.max(1,Math.min(this.fadeFrames,Math.floor((this.end-this.start)*this.sampleRate/this.audio.sampleRate/Math.max(1,Math.abs(this.speed))/4))):1;this.fading=this.fadeLength;}
        else this.jump(this.requested,retime);this.requested=false;
      }
      const t=this.fading>0?.5-.5*Math.cos(Math.PI*(1-this.fading/this.fadeLength)):1;
      const old=this.oldAudio;
      this.outputL[0]=this.read(a.left,this.position)*t+(old?this.read(old.left,this.oldPosition)*(1-t):0);this.outputR[0]=this.read(a.right,this.position)*t+(old?this.read(old.right,this.oldPosition)*(1-t):0);
      if(this.fading>0){this.fading--;if(old)this.oldPosition=clamp(this.oldPosition+this.oldSpeed*old.sampleRate/this.sampleRate,0,old.left.length-1);if(this.fading===0)this.oldAudio=undefined;}
      this.position+=this.speed*a.sampleRate/this.sampleRate;this.position=clamp(this.position,this.start,this.end-Number.EPSILON);this.dwell--;this.a=this.start/a.left.length;this.b=this.end/a.left.length;this.phase=this.position/a.left.length;
    }else{this.outputL[0]=this.outputR[0]=0;this.a=this.b=this.phase=0;this.oldAudio=undefined;}
    this.envelope+=((Math.abs(this.outputL[0])+Math.abs(this.outputR[0]))*2-this.envelope)*this.meter;this.outputL[1]=this.outputR[1]=this.event?1:0;this.outputL[2]=this.outputR[2]=clamp(this.envelope,0,1);if(this.event)this.triggerSample=sample;
  }
  override telemetry(){return{...super.telemetry(),curve:this.audio?.peaks??[]};}
}
