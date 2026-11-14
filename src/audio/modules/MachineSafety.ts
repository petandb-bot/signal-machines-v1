import {clamp, DSPModule} from '../DSPModule';

/** Boundary guards for new machines: never let an invalid wire poison memory. */
export const finiteAudio = (value:number) => Number.isFinite(value) ? clamp(value,-8,8) : 0;
export const finiteUnit = (value:number, fallback=0) => Number.isFinite(value) ? clamp(value,0,1) : fallback;
export function machineControl(module:DSPModule, parameter:number, port:number, fallback:number) {
  return finiteUnit(finiteUnit(module.parameters[parameter],fallback) + finiteAudio(module.inputL[port])*.5);
}
