import {Partial} from './Partial';import {LivingPartial} from './LivingPartial';import {CharacterBlend} from './CharacterBlend';
export class PartialInstrument extends Partial{
 private readonly living:LivingPartial;private readonly blend:CharacterBlend;private readonly classic=()=>super.process();
 constructor(...args:ConstructorParameters<typeof Partial>){super(...args);this.living=new LivingPartial(args[0],args[1],args[2]);this.blend=new CharacterBlend(this,this.living);}
 override process(){this.blend.process(0,0,this.classic);}
 override telemetry(){const t=super.telemetry();if(this.selectedMode?.startsWith('LIVING '))t.bands=this.living.telemetry().bands;return t;}
}
