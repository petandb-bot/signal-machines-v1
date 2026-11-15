import {Drone} from './Drone';import {LivingDrone} from './LivingDrone';import {CharacterBlend} from './CharacterBlend';
export class DroneInstrument extends Drone{
 private readonly living:LivingDrone;
 private readonly blend:CharacterBlend;
 private readonly classic=()=>super.process();
 constructor(...args:ConstructorParameters<typeof Drone>){super(...args);this.living=new LivingDrone(args[0],args[1],args[2]);this.blend=new CharacterBlend(this,this.living);}
 override process(){this.blend.process(0,0,this.classic);}
}
