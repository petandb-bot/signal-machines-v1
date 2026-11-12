import {DSPModule,TAU,clamp} from '../DSPModule';
export class Bounce extends DSPModule {
  private readonly drag=Math.exp(-.045/this.sampleRate);
  private x=0;private y=0;private vx=.8;private vy=.5;private gate=false;
  constructor(...args:ConstructorParameters<typeof DSPModule>){super(...args);this.x=this.random.next()-.5;this.y=this.random.next()-.5;this.vy=(this.random.next()-.5)*1.4;}
  private kick(){const angle=this.random.next()*TAU;this.vx=clamp(this.vx+Math.cos(angle)*1.7,-4,4);this.vy=clamp(this.vy+Math.sin(angle)*1.7,-4,4);}
  override command(action:string){if(action!=='kick')throw new Error('Unknown marble action.');this.kick();}
  process(sample:number){
    const tilt=this.parameters[0],elastic=this.control(1,3),kick=this.inputL[0]>.5;if(kick&&!this.gate)this.kick();this.gate=kick;
    this.phase=(this.phase+.027/this.sampleRate)%1;
    const tx=this.inputConnected[1]?this.inputL[1]:Math.sin(TAU*this.phase),ty=this.inputConnected[2]?this.inputL[2]:Math.cos(TAU*this.phase*.73+.8),drag=this.drag,gravity=tilt*3.75;
    this.vx=clamp((this.vx+tx*gravity/this.sampleRate)*drag,-4,4);this.vy=clamp((this.vy+ty*gravity/this.sampleRate)*drag,-4,4);this.x+=this.vx/this.sampleRate;this.y+=this.vy/this.sampleRate;
    let impact=false;const restitution=.2+elastic*.78;
    if(Math.abs(this.x)>1){const sign=Math.sign(this.x);if(Math.abs(this.vx)>.04){this.x=2*sign-this.x;this.vx=-sign*Math.abs(this.vx)*restitution;impact=true;}else{this.x=sign;this.vx=0;}}
    if(Math.abs(this.y)>1){const sign=Math.sign(this.y);if(Math.abs(this.vy)>.04){this.y=2*sign-this.y;this.vy=-sign*Math.abs(this.vy)*restitution;impact=true;}else{this.y=sign;this.vy=0;}}
    this.x=clamp(this.x);this.y=clamp(this.y);this.outputL[0]=this.outputR[0]=this.x;this.outputL[1]=this.outputR[1]=this.y;this.outputL[2]=this.outputR[2]=Math.min(1,Math.hypot(this.vx,this.vy)/4);this.outputL[3]=this.outputR[3]=impact?1:0;
    if(impact){this.envelope=1;this.triggerSample=sample;}else this.envelope*=1-1/(this.sampleRate*.12);this.a=this.x;this.b=this.y;
  }
  override telemetry(){return{...super.telemetry(),velocity:{x:this.vx,y:this.vy}};}
}
