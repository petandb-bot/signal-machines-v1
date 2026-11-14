import {SIGNAL_INKS} from '../visual/Palette';
import type {LoopStatus} from '../audio/LoopAudio';
export type SignalType = 'audio' | 'control' | 'trigger';
export type ModuleType = 'MIRAGE' | 'LEVEL' | 'FOUND' | 'SMEAR' | 'FRICTION' | 'PULSE' | 'BRANCH' | 'FLOCK' | 'ALLOY' | 'RESON' | 'FRACTURE' | 'VENOM' | 'CAUSTIC' | 'SNAP' | 'TAPE' | 'DRONE' | 'SIEVE' | 'PARASITE' | 'VCA' | 'SHAPE' | 'SWITCH' | 'LOOP' | 'CHORUS' | 'CLOUD' | 'OSC' | 'NOISE' | 'FILTER' | 'RING' | 'COMB' | 'SHIFT' | 'CHANCE' | 'PRISM' | 'PARTIAL' | 'WEFT' | 'TIDE' | 'BOUNCE' | 'FERAL' | 'COUNT' | 'MAP' | 'QUANTIZE' | 'SLEW' | 'FORMANT' | 'LOGIC' | 'DUCK' | 'SWARM' | 'UNSPENT' | 'SIDEWAYS' | 'QUORUM' | 'FAULT LINE' | 'CLIP' | 'FUZZ' | 'CRUSH' | 'CHIP' | 'TOUCH' | 'PENDULUM' | 'LPG' | 'OPERATOR' | 'EDGE' | 'MESH' | 'ORBIT' | 'CHAMBER' | 'OUTPUT';
export interface PortDefinition {
  id: string; label: string; signal: SignalType; direction: 'in' | 'out';
  position: number; parameter?: string; delayed?: boolean;
}
export interface ParameterDefinition { id: string; label: string; default: number; description: string }
export interface ModuleDefinition {
  type: ModuleType; subtitle: string; description: string; color: string; symbol: string;
  inputs: PortDefinition[]; outputs: PortDefinition[]; parameters: ParameterDefinition[];
}
export interface Gesture {duration:number;points:Array<{x:number;y:number;t:number}>}
export interface ModuleState {
  id: string; type: ModuleType; x: number; y: number;
  seed: number; params: Record<string, number>; character: 'SOFT' | 'METAL' | 'ROUGH'; mode?:string; wide?:boolean; bypass?:boolean;gesture?:Gesture;sample?:string;
}
export interface Connection { id: string; from: { module: string; port: string }; to: { module: string; port: string } }
export interface Patch {
  version: 1; layout?: 2; name: string; bpm: number; master: number; seed: number;
  modules: ModuleState[]; connections: Connection[];
}
export interface ModuleTelemetry {
  a: number; b: number; phase: number; envelope: number; levelL: number; levelR: number;
  triggerSample: number; wave: number[];particles?:Array<{x:number;y:number;activity:number}>;bands?:number[];curve?:number[];velocity?:{x:number;y:number};loop?:LoopStatus;
}
export interface EngineTelemetry {
  modules: Record<string, ModuleTelemetry>; peak: number; rms: number; sample: number; faults: number;
}
export const SIGNAL_COLORS: Record<SignalType, string> = SIGNAL_INKS;
