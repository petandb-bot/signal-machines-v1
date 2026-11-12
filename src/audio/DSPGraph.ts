import type { EngineTelemetry, Patch } from '../graph/types';
import { DSPModule, clamp } from './DSPModule';
import { compilePatch } from './PatchCompiler';
import type { CompiledModule } from './PatchCompiler';
import { processModule } from './SignalRouter';
export class DSPGraph {
  modules = new Map<string, DSPModule>();
  private ordered: CompiledModule[] = []; private outputs: DSPModule[] = [];
  private actions:Array<{id:string;action:string;payload:unknown;reply:(result:unknown,error?:string)=>void}>=[];private preserveLoops=false;
  private pending: Patch | null = null; private pendingReset = false; private fading = false; private fade = 0;
  private bpm = 76; private master = .65; private targetMaster = .65;
  private peak = 0; private energy = 0; private measured = 0;
  sample = 0; faults = 0;
  constructor(readonly sampleRate: number) {}
  setPatch(patch: Patch, reset = false, preserveLoops = false) {
    if(reset&&!preserveLoops){const actions=this.actions;this.actions=[];for(const request of actions)request.reply(undefined,'Patch was replaced before the module action completed.');}
    if (this.modules.size === 0) { this.commit(patch, reset, preserveLoops); this.fade = 0; this.fading = false; this.pending = null; }
    else { this.pending = patch;if(reset){this.preserveLoops=this.pendingReset?this.preserveLoops&&preserveLoops:preserveLoops;this.pendingReset=true;} this.fading = true; }
  }
  private commit(patch: Patch, reset = false,preserveLoops=false) {
    const existing=reset?(preserveLoops?new Map([...this.modules].filter(([,dsp])=>dsp.state.type==='LOOP'||dsp.state.type==='PRISM'||dsp.state.type==='TIDE'||dsp.state.type==='BOUNCE')):undefined):this.modules;
    const compiled = compilePatch(patch, this.sampleRate,existing);
    if(reset&&preserveLoops)for(const dsp of compiled.modules.values())if(dsp.state.type==='LOOP')dsp.command('restart');
    this.modules = compiled.modules; this.ordered = compiled.ordered; this.outputs = compiled.outputs;
    this.bpm = patch.bpm; this.targetMaster = patch.master;
    if (reset) { this.sample = 0; this.faults = 0; }
  }
  updateParameters(patch: Patch) {
    this.bpm = patch.bpm; this.targetMaster = patch.master;
    for (const state of patch.modules) this.modules.get(state.id)?.update(state);
    // A newer slider change must also survive a queued routing transaction.
    if (this.pending) for (const state of patch.modules) { const pendingState = this.pending.modules.find(m => m.id === state.id); if (pendingState) { pendingState.params = {...state.params}; pendingState.character = state.character;pendingState.mode=state.mode;pendingState.wide=state.wide; } }
    if (this.pending) { this.pending.bpm = patch.bpm; this.pending.master = patch.master; }
  }
  requestAction(id:string,action:string,payload:unknown,reply:(result:unknown,error?:string)=>void){this.actions.push({id,action,payload,reply});}
  finishLoops(){for(const dsp of this.modules.values())if(dsp.state.type==='LOOP')dsp.command('finish');}
  process(left: Float32Array, right: Float32Array) {
    if(!this.pending&&!this.fading&&this.actions.length){const actions=this.actions;this.actions=[];for(const request of actions){try{const dsp=this.modules.get(request.id);if(!dsp)throw new Error('Module no longer exists.');request.reply(dsp.command(request.action,request.payload));}catch(error){request.reply(undefined,(error as Error).message);}}}
    for (let frame = 0; frame < left.length; frame++) {
      if (this.fading) { this.fade = Math.max(0, this.fade - 1 / (this.sampleRate * .008)); }
      else this.fade = Math.min(1, this.fade + 1 / (this.sampleRate * .014));
      for (let i = 0; i < this.ordered.length; i++) {
        const module = this.ordered[i]; processModule(module, this.sample, this.bpm);
        for (let p = 0; p < module.dsp.outputL.length; p++) {
          let l = module.dsp.outputL[p], r = module.dsp.outputR[p];
          if (!Number.isFinite(l) || !Number.isFinite(r)) { l = r = 0; this.faults++; }
          module.dsp.outputL[p] = clamp(l, -8, 8); module.dsp.outputR[p] = clamp(r, -8, 8);
        }
        if (this.sample % 32 === 0) module.dsp.capture();
      }
      let l = 0, r = 0;
      for (let i = 0; i < this.outputs.length; i++) { l += this.outputs[i].outputL[0]; r += this.outputs[i].outputR[0]; }
      this.master += (this.targetMaster - this.master) * .001;
      // Smooth saturation with 4 dB of peak headroom, including summed OUTPUT instances.
      l = .63 * Math.tanh(l * this.master * this.fade / .63); r = .63 * Math.tanh(r * this.master * this.fade / .63);
      left[frame] = Number.isFinite(l) ? l : 0; right[frame] = Number.isFinite(r) ? r : 0;
      this.peak = Math.max(this.peak, Math.abs(left[frame]), Math.abs(right[frame]));
      this.energy += (left[frame] ** 2 + right[frame] ** 2) * .5; this.measured++; this.sample++;
    }
    // Two-stage held controls ensure a full intervening quantum before feedback is read.
    for(let i=0;i<this.ordered.length;i++){const dsp=this.ordered[i].dsp;dsp.delayedL.set(dsp.stagedL);dsp.delayedR.set(dsp.stagedR);dsp.stagedL.set(dsp.outputL);dsp.stagedR.set(dsp.outputR);}
    // All graph compilation/allocation occurs at a render-quantum boundary while muted.
    if (this.fading && this.fade === 0 && this.pending) { this.commit(this.pending,this.pendingReset,this.preserveLoops); this.pending = null; this.pendingReset = false;this.preserveLoops=false; this.fading = false; }
  }
  telemetry(): EngineTelemetry {
    const telemetry: EngineTelemetry = {modules:Object.fromEntries(Array.from(this.modules, ([id,dsp])=>[id,dsp.telemetry()])),peak:this.peak,rms:Math.sqrt(this.energy / Math.max(1,this.measured)),sample:this.sample,faults:this.faults};
    this.peak = this.energy = this.measured = 0; return telemetry;
  }
}
