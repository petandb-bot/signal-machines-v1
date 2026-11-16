import {Loop} from './Loop';
import type {LoopStatus} from '../LoopAudio';

/**
 * Optional PRINT transport for the unchanged LOOP machine.
 * The LOOP source and all of its classic recording/overdub behavior are frozen.
 * Master PCM is held by DSPGraph until it can import once per captured bar.
 */
export class PrintedLoop extends Loop {
  private printing=false;
  private targetFrames=0;
  private capturedFrames=0;
  private suppressTriggerUntilLow=false;

  isPrinting(){return this.printing;}
  advancePrint(frames:number){
    if(this.printing){
      this.capturedFrames=frames;
      this.phase=this.targetFrames?frames/this.targetFrames:0;
    }
  }
  override command(action:string,payload?:unknown):unknown{
    if(action==='print'){
      if(this.printing)throw new Error('PRINT is already running.');
      if(super.telemetry().loop.mode==='recording')throw new Error('Finish input recording before PRINT.');
      const frames=(payload as {frames?:unknown}|undefined)?.frames;
      if(typeof frames!=='number'||!Number.isInteger(frames)||frames<2||frames>this.sampleRate*16)
        throw new Error('Invalid PRINT length.');
      super.command('clear');
      super.command('record');
      this.printing=true;
      this.targetFrames=frames;
      this.capturedFrames=0;
      return this.telemetry().loop;
    }
    if(this.printing){
      if(action==='import'||action==='clear'||action==='finish'||action==='restart'){
        const result=super.command(action,payload);
        this.printing=false;
        this.targetFrames=0;
        this.capturedFrames=0;
        this.suppressTriggerUntilLow=true;
        return result;
      }
      throw new Error('Use Clear to cancel PRINT before another LOOP action.');
    }
    return super.command(action,payload);
  }
  override process(){
    // The underlying LOOP is recording its dry input, which preserves its
    // monitor path but mutes its old loop. The master print replaces these
    // temporary input samples at the next render-quantum boundary.
    if(this.printing||this.suppressTriggerUntilLow){
      const trigger=this.inputL[1];
      if(this.suppressTriggerUntilLow&&trigger<=.5)this.suppressTriggerUntilLow=false;
      this.inputL[1]=0;
    }
    super.process();
    if(this.printing)this.phase=this.targetFrames?this.capturedFrames/this.targetFrames:0;
  }
  override telemetry(){
    const previous=super.telemetry();
    if(!this.printing)return previous;
    const loop:LoopStatus={mode:'printing',frames:this.capturedFrames,sampleRate:this.sampleRate,printTargetFrames:this.targetFrames};
    return {...previous,loop};
  }
}
