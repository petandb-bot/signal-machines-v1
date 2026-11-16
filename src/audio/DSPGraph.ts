import {Cuts} from './modules/Cuts';
import {PrintedLoop} from './modules/PrintedLoop';
import {Found} from './modules/Found';
import {validateFoundAudio,MAX_FOUND,validFoundRef} from '../samples/FoundData';
import type {FoundAudio} from '../samples/FoundData';
import type { EngineTelemetry, Patch } from '../graph/types';
import { DSPModule, clamp } from './DSPModule';
import { compilePatch } from './PatchCompiler';
import type { CompiledModule } from './PatchCompiler';
import { processModule } from './SignalRouter';
// Near the existing 0.63 ceiling: 95% of the tanh output is diagnostic only.
const NEAR_SATURATION_DRIVE=.63*Math.atanh(.95);
export class DSPGraph {
  private foundAssets=new Map<string,FoundAudio>();
  setFoundAssets(values:FoundAudio[],retain?:string[]){
    if(!Array.isArray(values)||values.length>MAX_FOUND||retain!==undefined&&(!Array.isArray(retain)||retain.length>MAX_FOUND||!retain.every(validFoundRef)))throw Error('Invalid FOUND assets.');
    const updates=values.map(validateFoundAudio),next=new Map<string,FoundAudio>();
    if(retain)for(const id of retain){const old=this.foundAssets.get(id);if(old)next.set(id,old);}
    for(const a of updates)next.set(a.id,a);if(next.size>MAX_FOUND)throw Error('Too many FOUND assets.');this.foundAssets=next;
    // Bind only at the subsequent muted patch commit, never in the asset message handler.
  }
  modules = new Map<string, DSPModule>();
  private ordered: CompiledModule[] = []; private outputs: DSPModule[] = [];
  private printLoop?:PrintedLoop;
  private printLeft?:Float32Array;private printRight?:Float32Array;
  private printWritten=0;private printFrames=0;private printComplete=false;
  private actions:Array<{id:string;action:string;payload:unknown;reply:(result:unknown,error?:string)=>void}>=[];private preserveLoops=false;
  private pending: Patch | null = null; private pendingReset = false; private fading = false; private fade = 0;
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
    if(reset&&this.printLoop?.isPrinting()){
      if(preserveLoops)this.finishPrintedMemory();else this.cancelPrint();
    }
    if(reset&&preserveLoops)for(const dsp of compiled.modules.values())if(dsp.state.type==='LOOP')dsp.command('restart');
    for(const dsp of compiled.modules.values())if(dsp instanceof Found||dsp instanceof Cuts)dsp.attach(this.foundAssets.get(dsp.reference));
    this.modules = compiled.modules; this.ordered = compiled.ordered; this.outputs = compiled.outputs;
    // A cable edit may preserve the instance; removing/resetting it must not
    // leave an old PRINT target writing outside the compiled patch.
    if(this.printLoop&&(![...compiled.modules.values()].includes(this.printLoop)||!this.printLoop.isPrinting()))
      this.cancelPrint();
    // Allocate at graph compilation (the existing muted patch boundary),
    // never when the user presses PRINT or on the per-sample audio path.
    if(!this.printLeft&&[...compiled.modules.values()].some(dsp=>dsp instanceof PrintedLoop)){
      const capacity=Math.ceil(this.sampleRate*12);
      this.printLeft=new Float32Array(capacity);
      this.printRight=new Float32Array(capacity);
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
  private cancelPrint(){
    if(this.printLoop?.isPrinting())this.printLoop.command('clear');
    this.printLoop=undefined;this.printWritten=this.printFrames=0;this.printComplete=false;
  }
  private finishPrintedMemory(){
    const target=this.printLoop,frames=this.printWritten;
    if(!target?.isPrinting()||frames<2||!this.printLeft||!this.printRight){
      this.cancelPrint();return;
    }
    // Once per printed bar, outside the per-sample loop. The original LOOP
    // import validates and copies the PCM into its own existing 16s storage.
    target.command('import',{kind:'loopAudio',sampleRate:this.sampleRate,
      left:this.printLeft.subarray(0,frames),right:this.printRight.subarray(0,frames)});
    this.printLoop=undefined;this.printWritten=this.printFrames=0;this.printComplete=false;
  }
  finishLoops(){
    if(this.printLoop)this.finishPrintedMemory();
    for(const dsp of this.modules.values())if(dsp.state.type==='LOOP')dsp.command('finish');
  }
  process(left: Float32Array, right: Float32Array) {
    if(this.printComplete)this.finishPrintedMemory();
    if(this.printLoop&&!this.printLoop.isPrinting())this.cancelPrint();
    if(!this.pending&&!this.fading&&this.actions.length){const actions=this.actions;this.actions=[];for(const request of actions){try{const dsp=this.modules.get(request.id);if(!dsp)throw new Error('Module no longer exists.');
      if(request.action==='print'){
        if(!(dsp instanceof PrintedLoop))throw new Error('PRINT requires a LOOP module.');
        if(this.printLoop?.isPrinting())throw new Error('Only one LOOP may PRINT at a time.');
        // One bar in 4/4 from the moment PRINT is pressed; BPM 20..300
        // yields 0.8..12 seconds, safely within the existing 16s memory.
        const frames=Math.min(this.printLeft?.length??0,Math.round(this.sampleRate*240/this.bpm));
        if(frames<2||!this.printLeft||!this.printRight)throw new Error('PRINT buffer is unavailable.');
        const status=dsp.command('print',{frames});
        this.printLoop=dsp;this.printWritten=0;this.printFrames=frames;this.printComplete=false;
        request.reply(status);
      }else request.reply(dsp.command(request.action,request.payload));}catch(error){request.reply(undefined,(error as Error).message);}}}
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
      this.masterDrivePeak=Math.max(this.masterDrivePeak,Math.abs(driveL),Math.abs(driveR));
      if(Math.abs(driveL)>=NEAR_SATURATION_DRIVE||Math.abs(driveR)>=NEAR_SATURATION_DRIVE)this.saturatedFrames++;
      l = .63 * Math.tanh(driveL / .63); r = .63 * Math.tanh(driveR / .63);
      left[frame] = Number.isFinite(l) ? l : 0; right[frame] = Number.isFinite(r) ? r : 0;
      this.largestStep=Math.max(this.largestStep,Math.abs(left[frame]-this.previousSampleL),Math.abs(right[frame]-this.previousSampleR));
      this.previousSampleL=left[frame];this.previousSampleR=right[frame];
      // PRINT records exactly the audible, post-master stereo mix.
      // The destination LOOP bypasses its old playback while recording.
      if(this.printLoop&&!this.printComplete&&this.printLoop.isCaptureReady()){
        const at=this.printWritten++;
        this.printLeft![at]=left[frame];this.printRight![at]=right[frame];
        this.printLoop.advancePrint(this.printWritten);
        if(this.printWritten>=this.printFrames)this.printComplete=true;
      }
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
