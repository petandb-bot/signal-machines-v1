import { DEFINITIONS } from '../graph/definitions';
import type { ModuleState, ModuleTelemetry } from '../graph/types';
export const clamp = (n: number, lo = -1, hi = 1) => Math.min(hi, Math.max(lo, n));
export const TAU = Math.PI * 2;
export class SeededRandom {
  private state: number;
  constructor(seed: number) { this.state = seed >>> 0 || 1; }
  next() { let x = this.state; x ^= x << 13; x ^= x >>> 17; x ^= x << 5; this.state = x >>> 0; return this.state / 4294967296; }
}
export abstract class DSPModule {
  readonly inputL: Float64Array; readonly inputR: Float64Array;readonly inputConnected:Uint8Array;
  readonly outputL: Float64Array; readonly outputR: Float64Array;
  readonly delayedL: Float64Array; readonly delayedR: Float64Array;
  readonly stagedL: Float64Array; readonly stagedR: Float64Array;
  readonly parameters: Float64Array; readonly targets: Float64Array;
  readonly wave = new Float32Array(64);
  waveIndex = 0; a = 0; b = 0; phase = 0; envelope = 0; levelL = 0; levelR = 0; triggerSample = -1;
  character: ModuleState['character'];selectedMode?:string;wide=false;
  readonly random: SeededRandom;
  private readonly smoothing: number;
  constructor(readonly state: ModuleState, readonly sampleRate: number, patchSeed: number) {
    const definition = DEFINITIONS[state.type];
    this.inputConnected=new Uint8Array(definition.inputs.length);this.inputL = new Float64Array(definition.inputs.length); this.inputR = new Float64Array(definition.inputs.length);
    this.outputL = new Float64Array(Math.max(1, definition.outputs.length)); this.outputR = new Float64Array(this.outputL.length);
    this.delayedL=this.outputL.slice();this.delayedR=this.outputR.slice();this.stagedL=this.outputL.slice();this.stagedR=this.outputR.slice();
    this.parameters = new Float64Array(definition.parameters.map(p => state.params[p.id])); this.targets = this.parameters.slice();
    this.character = state.character;this.selectedMode=state.mode;this.wide=!!state.wide; this.random = new SeededRandom(state.seed ^ patchSeed);
    this.smoothing = 1 - Math.exp(-1 / (sampleRate * .018));
  }
  update(state: ModuleState) {
    DEFINITIONS[state.type].parameters.forEach((p, i) => { this.targets[i] = state.params[p.id]; });
    this.character = state.character;this.selectedMode=state.mode;this.wide=!!state.wide;
  }
  smooth() { for (let i = 0; i < this.parameters.length; i++) this.parameters[i] += (this.targets[i] - this.parameters[i]) * this.smoothing; }
  control(parameter: number, port: number) { return clamp(this.parameters[parameter] + .5 * this.inputL[port], 0, 1); }
  command(_action:string,_payload?:unknown):unknown{throw new Error('This module does not support actions.');}
  abstract process(sample: number, bpm: number): void;
  capture() { this.wave[this.waveIndex] = this.state.type === 'PULSE' ? this.envelope : this.state.type === 'FLOCK' ? this.a : this.outputL[0]; this.waveIndex = (this.waveIndex + 1) % 64; }
  telemetry(): ModuleTelemetry {
    return { a:this.a, b:this.b, phase:this.phase, envelope:this.envelope, levelL:this.levelL, levelR:this.levelR, triggerSample:this.triggerSample, wave:Array.from({length:64}, (_,i)=>this.wave[(this.waveIndex+i)%64]) };
  }
}
