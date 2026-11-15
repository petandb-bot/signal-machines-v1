import {DSPModule} from '../DSPModule';
export class CharacterBlend{
 private mix:number;
 constructor(private readonly owner:DSPModule,private readonly voice:DSPModule){this.mix=owner.selectedMode?.startsWith('LIVING ')?1:0;}
 process(sample:number,bpm:number,classic:()=>void){
  const o=this.owner,v=this.voice,living=o.selectedMode?.startsWith('LIVING ')??false;
  this.mix=Math.max(0,Math.min(1,this.mix+(living?1:-1)/(o.sampleRate*.03)));
  // Guard the transition's legacy side too; steady CLASSIC stays untouched.
  if(this.mix>0){for(let i=0;i<o.inputL.length;i++){if(!Number.isFinite(o.inputL[i]))o.inputL[i]=0;if(!Number.isFinite(o.inputR[i]))o.inputR[i]=0;}for(let i=0;i<o.parameters.length;i++)if(!Number.isFinite(o.parameters[i]))o.parameters[i]=.5;}
  let l=0,r=0,activity=0;
  if(this.mix<1){const mode=o.selectedMode;o.selectedMode=mode?.replace('LIVING ','');classic();o.selectedMode=mode;l=o.outputL[0];r=o.outputR[0];activity=o.outputL[1];}
  if(this.mix>0){v.inputL.set(o.inputL);v.inputR.set(o.inputR);v.inputConnected.set(o.inputConnected);v.parameters.set(o.parameters);v.selectedMode=o.selectedMode;v.wide=o.wide;v.process(sample,bpm);o.outputL[0]=l*(1-this.mix)+v.outputL[0]*this.mix;o.outputR[0]=r*(1-this.mix)+v.outputR[0]*this.mix;o.outputL[1]=o.outputR[1]=activity*(1-this.mix)+v.outputL[1]*this.mix;o.a=v.a;o.b=v.b;o.phase=v.phase;o.envelope=v.envelope;}
 }
}
