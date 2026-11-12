import {DSPModule,clamp,TAU} from '../DSPModule';
export class Pendulum extends DSPModule {
  private readonly angles=new Float64Array(2);private readonly velocities=new Float64Array(2);private readonly initial=new Float64Array(2);private counter=0;private kickGate=false;private resetGate=false;
  constructor(...args:ConstructorParameters<typeof DSPModule>){super(...args);this.angles[0]=.7+this.random.next()*.4;this.angles[1]=-.7-this.random.next()*.4;this.initial.set(this.angles);}
  override command(action:string){if(action==='kick'){this.velocities[0]+=.5+this.random.next();this.velocities[1]-=.5+this.random.next();return;}if(action==='reset'){this.angles.set(this.initial);this.velocities.fill(0);this.phase=0;return;}throw new Error('Unknown pendulum action.');}
  process(sample:number){
    const kick=this.inputL[2]>.5,reset=this.inputL[3]>.5;if(reset&&!this.resetGate)this.command('reset');if(kick&&!this.kickGate)this.command('kick');this.kickGate=kick;this.resetGate=reset;this.outputL[2]=this.outputR[2]=this.outputL[3]=this.outputR[3]=0;
    if(this.counter++%16===0){
      const dt=16/this.sampleRate,energy=this.control(0,0),coupling=this.control(1,1)*2,drive=energy*energy*2,g=2+energy*8,damping=.15+(1-energy)*.5;this.phase=(this.phase+dt*(.12+energy*.35))%1;
      const a=this.angles[0],b=this.angles[1],v=this.velocities[0],w=this.velocities[1];
      const aa=-g*Math.sin(a)-damping*v+coupling*Math.sin(b-a)+drive*Math.sin(this.phase*TAU),ab=-g*.73*Math.sin(b)-damping*w+coupling*Math.sin(a-b)+drive*Math.sin(this.phase*TAU+1.3);
      this.velocities[0]=clamp(v+aa*dt,-5,5);this.velocities[1]=clamp(w+ab*dt,-5,5);
      for(let i=0;i<2;i++){const old=this.angles[i];this.angles[i]=clamp(old+this.velocities[i]*dt,-Math.PI*.95,Math.PI*.95);if(Math.abs(this.angles[i])>=Math.PI*.95)this.velocities[i]*=-.6;if(old*this.angles[i]<0&&Math.abs(this.velocities[i])>.03){this.outputL[i+2]=this.outputR[i+2]=1;this.triggerSample=sample;this.envelope=1;}}
    }
    this.a=this.angles[0]/Math.PI;this.b=this.angles[1]/Math.PI;this.outputL[0]=this.outputR[0]=this.a;this.outputL[1]=this.outputR[1]=this.b;this.envelope*=1-1/(this.sampleRate*.1);
  }
  override telemetry(){return{...super.telemetry(),particles:Array.from(this.angles,(a,i)=>({x:Math.sin(a),y:Math.cos(a),activity:Math.min(1,Math.abs(this.velocities[i])/3)}))};}
}
