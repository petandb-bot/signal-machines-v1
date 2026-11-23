import {Cuts} from './modules/Cuts';
import {Found} from './modules/Found';
import {validateFoundAudio,MAX_SAMPLE_ASSETS,validFoundRef} from '../samples/FoundData';
import type {FoundAudio} from '../samples/FoundData';
import type { EngineTelemetry, Patch } from '../graph/types';
import { DSPModule, clamp } from './DSPModule';
import {MAX_STEM_OUTPUTS} from './PcmRecording';
import { compilePatch } from './PatchCompiler';
import type { CompiledModule } from './PatchCompiler';
import { processModule } from './SignalRouter';
// Near the existing 0.63 ceiling: 95% of the tanh output is diagnostic only.
const NEAR_SATURATION_DRIVE=.63*Math.atanh(.95);
export class DSPGraph {
  private foundAssets=new Map<string,FoundAudio>();
  setFoundAssets(values:FoundAudio[],retain?:string[]){
    if(!Array.isArray(values)||values.length>MAX_SAMPLE_ASSETS||retain!==undefined&&(!Array.isArray(retain)||retain.length>MAX_SAMPLE_ASSETS||!retain.every(validFoundRef)))throw Error('Invalid FOUND assets.');
    const updates=values.map(validateFoundAudio),next=new Map<string,FoundAudio>();
    if(retain)for(const id of retain){const old=this.foundAssets.get(id);if(old)next.set(id,old);}
    for(const a of updates)next.set(a.id,a);if(next.size>MAX_SAMPLE_ASSETS)throw Error('Too many FOUND assets.');this.foundAssets=next;
    // Bind only at the subsequent muted patch commit, never in the asset message handler.
  }
  modules = new Map<string, DSPModule>();
  private ordered: CompiledModule[] = []; private outputs: DSPModule[] = [];
  private actions:Array<{id:string;action:string;payload:unknown;reply:(result:unknown,error?:string)=>void}>=[];private preserveLoops=false;
  private pending: Patch | null = null; private pendingReset = false; private fading = false; private fade = 0;
  private stemTaps:Array<{id:string;source?:DSPModule;left:Float32Array;right:Float32Array}>=[];
  private stemFault:string|null=null;
  /** One simultaneous output tap per OUTPUT module; the main DSP graph runs just once. */
  activateStemTaps(ids:readonly string[],frames=128){
    if(ids.length<2||ids.length>MAX_STEM_OUTPUTS||new Set(ids).size!==ids.length)throw Error('Stem recording requires 2–4 OUTPUT modules.');
    const outputMap=new Map(this.outputs.map(dsp=>[dsp.state.id,dsp]));
    if(ids.some(id=>!outputMap.has(id)))throw Error('OUTPUT routing changed before stem recording started. Try again.');
    this.stemTaps=ids.map(id=>({id,source:outputMap.get(id),left:new Float32Array(Math.max(frames,128)),right:new Float32Array(Math.max(frames,128))}));
    this.stemFault=null;
  }
  deactivateStemTaps(){this.stemTaps=[];this.stemFault=null;}
  getStemTaps(){return this.stemTaps;}
  getStemFault(){return this.stemFault;}

  private bpm = 76; private master = .65; private targetMaster = .65;
  private peak = 0; private energy = 0; private measured = 0;
  private masterDrivePeak=0;private saturatedFrames=0;private largestStep=0;
  private previousSampleL=0;private previousSampleR=0;
  sample = 0; faults = 0;
  constructor(readonly sampleRate: number) {}
  setPatch(patch: Patch, reset = false, preserveLoops = false) {
    if(reset&&!preserveLoops){const actions=this.actions;this.actions=[];for(const request of actions)request.reply(undefined,'Patch was replaced before the module action completed.');}
    if (this.modules.size === 0) { this.commit(patch, reset, preserveLoops); this.fade = 0; this.fading = false; this.pending = null; }
    else { this.pending = patch;if(reset){this.preserveLoops=this.pendingReset?this.preserveLoops&&preserveLoops:preserveLoops;this.pendingReset=true;} this.fading = true; }
  }
  private commit(patch: Patch, reset = false,preserveLoops=false) {
    const existing=reset?(preserveLoops?new Map([...this.modules].filter(([,dsp])=>dsp.state.type==='LOOP'||dsp.state.type==='PRISM'||dsp.state.type==='TIDE'||dsp.state.type==='BOUNCE'||dsp.state.type==='PENDULUM')):undefined):this.modules;
    const compiled = compilePatch(patch, this.sampleRate,existing);
    if(reset&&preserveLoops)for(const dsp of compiled.modules.values())if(dsp.state.type==='LOOP')dsp.command('restart');
    for(const dsp of compiled.modules.values())if(dsp instanceof Found||dsp instanceof Cuts)dsp.attach(this.foundAssets.get(dsp.reference));
    this.modules = compiled.modules; this.ordered = compiled.ordered; this.outputs = compiled.outputs;
    if(this.stemTaps.length){
      const byId=new Map(this.outputs.map(dsp=>[dsp.state.id,dsp]));
      for(const tap of this.stemTaps){
        tap.source=byId.get(tap.id);
        if(!tap.source)this.stemFault='A recorded OUTPUT was removed or changed. The partial stem take was saved.';
      }
    }
    this.bpm = patch.bpm; this.targetMaster = patch.master;
    if (reset) { this.sample = 0; this.faults = 0; }
  }
  updateParameters(patch: Patch) {
    this.bpm = patch.bpm; this.targetMaster = patch.master;
    for (const state of patch.modules) this.modules.get(state.id)?.update(state);
    // A newer slider change must also survive a queued routing transaction.
    if (this.pending) for (const state of patch.modules) { const pendingState = this.pending.modules.find(m => m.id === state.id); if (pendingState) { pendingState.params = {...state.params}; pendingState.character = state.character;pendingState.mode=state.mode;pendingState.wide=state.wide;pendingState.bypass=state.bypass;pendingState.gesture=state.gesture; } }
    if (this.pending) { this.pending.bpm = patch.bpm; this.pending.master = patch.master; }
  }
  requestAction(id:string,action:string,payload:unknown,reply:(result:unknown,error?:string)=>void){this.actions.push({id,action,payload,reply});}
  finishLoops(){for(const dsp of this.modules.values())if(dsp.state.type==='LOOP')dsp.command('finish');}
  process(left: Float32Array, right: Float32Array) {
    for(const tap of this.stemTaps)if(tap.left.length!==left.length){
      tap.left=new Float32Array(left.length);tap.right=new Float32Array(right.length);
    }
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
      const driveL=l*this.master*this.fade,driveR=r*this.master*this.fade;
      // Per-OUTPUT taps use the same clock, master level and startup fade, pre soft ceiling.
      const gain=this.master*this.fade;
      for(let t=0;t<this.stemTaps.length;t++){
        const tap=this.stemTaps[t],source=tap.source;
        tap.left[frame]=source?clamp(source.outputL[0]*gain,-1,1):0;
        tap.right[frame]=source?clamp(source.outputR[0]*gain,-1,1):0;
      }
      this.masterDrivePeak=Math.max(this.masterDrivePeak,Math.abs(driveL),Math.abs(driveR));
      if(Math.abs(driveL)>=NEAR_SATURATION_DRIVE||Math.abs(driveR)>=NEAR_SATURATION_DRIVE)this.saturatedFrames++;
      l = .63 * Math.tanh(driveL / .63); r = .63 * Math.tanh(driveR / .63);
      left[frame] = Number.isFinite(l) ? l : 0; right[frame] = Number.isFinite(r) ? r : 0;
      this.largestStep=Math.max(this.largestStep,Math.abs(left[frame]-this.previousSampleL),Math.abs(right[frame]-this.previousSampleR));
      this.previousSampleL=left[frame];this.previousSampleR=right[frame];
      this.peak = Math.max(this.peak, Math.abs(left[frame]), Math.abs(right[frame]));
      this.energy += (left[frame] ** 2 + right[frame] ** 2) * .5; this.measured++; this.sample++;
    }
    // Two-stage held controls ensure a full intervening quantum before feedback is read.
    for(let i=0;i<this.ordered.length;i++){const dsp=this.ordered[i].dsp;dsp.delayedL.set(dsp.stagedL);dsp.delayedR.set(dsp.stagedR);dsp.stagedL.set(dsp.outputL);dsp.stagedR.set(dsp.outputR);}
    // All graph compilation/allocation occurs at a render-quantum boundary while muted.
    if (this.fading && this.fade === 0 && this.pending) { this.commit(this.pending,this.pendingReset,this.preserveLoops); this.pending = null; this.pendingReset = false;this.preserveLoops=false; this.fading = false; }
  }
  telemetry(): EngineTelemetry {
    const telemetry: EngineTelemetry = {modules:Object.fromEntries(Array.from(this.modules, ([id,dsp])=>[id,dsp.telemetry()])),peak:this.peak,rms:Math.sqrt(this.energy / Math.max(1,this.measured)),sample:this.sample,faults:this.faults,
      integrity:{masterDrivePeak:this.masterDrivePeak,nearCeilingFraction:this.saturatedFrames/Math.max(1,this.measured),largestSampleStep:this.largestStep}};
    this.peak = this.energy = this.measured = this.masterDrivePeak = this.saturatedFrames = this.largestStep = 0; return telemetry;
  }
}
