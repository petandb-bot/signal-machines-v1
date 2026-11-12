import {PcmRecording} from './PcmRecording';
import type {RecordingFormat} from './PcmRecording';
import processorURL from './worklets/processor.ts?worker&url';
import type { EngineTelemetry, Patch } from '../graph/types';
export class AudioEngine {
  private pcm?:PcmRecording;private recordId=0;private stoppingPcm?:{resolve:(result:{blob:Blob;extension:string})=>void;reject:(error:Error)=>void;timer:ReturnType<typeof setTimeout>};
  onRecordingReady:(result:{blob:Blob;extension:string})=>void=()=>{};
  private actionSequence=0;private requests=new Map<number,{resolve:(value:unknown)=>void;reject:(error:Error)=>void;timer:ReturnType<typeof setTimeout>}>();
  private context?: AudioContext; private node?: AudioWorkletNode; private gain?: GainNode;
  private recorder?: MediaRecorder; private chunks: Blob[] = []; private recordTap?: MediaStreamAudioDestinationNode;
  private parameterTimer?: ReturnType<typeof setTimeout>; private pendingParameters?: Patch;
  running = false; recording = false;
  onTelemetry: (data: EngineTelemetry) => void = () => {};
  onError: (message: string) => void = () => {};
  get sampleRate() { return this.context?.sampleRate ?? 0; }
  async start(patch: Patch) {
    if (!window.isSecureContext) throw new Error('AudioWorklet requires HTTPS or localhost.');
    if (!this.context || this.context.state === 'closed') {
      if (!window.AudioContext || !window.AudioWorkletNode) throw new Error('This browser does not support AudioWorklet. Please use a current Chrome or Safari.');
      const context = new AudioContext({latencyHint:'interactive'});
      this.context = context;
      context.onstatechange = () => {
        const state = String(context.state);
        if (this.running && (state === 'suspended' || state === 'interrupted' || state === 'closed')) {
          if(this.recording)void this.stopRecording().then(result=>this.onRecordingReady(result)).catch(error=>this.onError(error.message));
          this.running = false;this.rejectRequests('Audio paused before the module answered.');
          this.gain?.gain.cancelScheduledValues(context.currentTime);
          this.gain?.gain.setValueAtTime(0,context.currentTime);
          this.onError('Audio paused. Tap play to resume.');
        }
      };
      try {
        await Promise.all([context.resume(),context.audioWorklet.addModule(processorURL)]);
        this.node = new AudioWorkletNode(context, 'signal-machines', {numberOfInputs:0,numberOfOutputs:1,outputChannelCount:[2]});
        this.node.port.onmessage = event => { if(event.data.type==='recordData'){this.acceptRecording(event.data);return;}if(event.data.type==='recordEnd'){if(event.data.id===this.recordId)this.finishPcm(event.data.reason);return;} if(event.data.type==='actionResult'){const request=this.requests.get(event.data.requestId);if(request){clearTimeout(request.timer);this.requests.delete(event.data.requestId);if(event.data.error)request.reject(new Error(event.data.error));else request.resolve(event.data.result);}return;}if (event.data.type === 'telemetry') this.onTelemetry(event.data.data); else if (event.data.type === 'error') { void this.stop(); this.onError(event.data.error); } };
        this.node.onprocessorerror = () => { this.rejectRequests('The audio processor stopped.');void this.stop(); this.onError('The audio processor stopped. Reload the page to restart the engine.'); };
        this.gain = context.createGain(); this.gain.gain.value = 0;
        this.node.connect(this.gain); this.gain.connect(context.destination);
        this.recordTap = context.createMediaStreamDestination(); this.gain.connect(this.recordTap);
      } catch (error) { await context.close(); this.context = undefined; throw error; }
    }
    clearTimeout(this.parameterTimer); this.parameterTimer = undefined; this.pendingParameters = undefined;
    await this.context.resume();
    this.node!.port.postMessage({type:'patch',patch,reset:true,preserveLoops:true});
    this.gain!.gain.cancelScheduledValues(this.context.currentTime); this.gain!.gain.setValueAtTime(0,this.context.currentTime); this.gain!.gain.linearRampToValueAtTime(1,this.context.currentTime + .025);
    this.running = true;
  }
  async stop() {
    if(this.recording){try{const result=await this.stopRecording();this.onRecordingReady(result);}catch(error){this.onError((error as Error).message);}}
    if (!this.context || !this.gain) return;
    this.running = false;this.rejectRequests('Playback stopped before the module answered.');this.node?.port.postMessage({type:'transportStop'});
    const context = this.context;
    this.gain.gain.cancelScheduledValues(context.currentTime); this.gain.gain.setTargetAtTime(0,context.currentTime,.006);
    await new Promise(resolve=>setTimeout(resolve,50));
    if (!this.running) await context.suspend();
  }
  sync(patch: Patch, routing: boolean, reset = false) {
    if (!this.node) return;
    if (routing) { clearTimeout(this.parameterTimer); this.parameterTimer = undefined; this.pendingParameters = undefined; this.node.port.postMessage({type:'patch',patch,reset}); }
    else {
      this.pendingParameters = patch;
      if (!this.parameterTimer) this.parameterTimer = setTimeout(()=>{ this.node!.port.postMessage({type:'parameters',patch:this.pendingParameters}); this.parameterTimer = undefined; },32);
    }
  }
  private rejectRequests(message:string){for(const request of this.requests.values()){clearTimeout(request.timer);request.reject(new Error(message));}this.requests.clear();}
  moduleAction(id:string,action:string,payload?:unknown):Promise<unknown>{
    if(!this.node||!this.running)return Promise.reject(new Error('Start playback before using loop actions.'));
    const requestId=++this.actionSequence;return new Promise((resolve,reject)=>{const timer=setTimeout(()=>{this.requests.delete(requestId);reject(new Error('The audio engine did not answer. Try starting playback again.'));},10000);this.requests.set(requestId,{resolve,reject,timer});try{this.node!.port.postMessage({type:'moduleAction',requestId,id,action,payload});}catch(error){clearTimeout(timer);this.requests.delete(requestId);reject(error instanceof Error?error:new Error(String(error)));}});
  }
  async startRecording(patch: Patch,format:RecordingFormat='browser'): Promise<void> {
    if(this.recording||this.stoppingPcm)throw new Error('A recording is already active.');
    if(format!=='browser'){if(!this.running)await this.start(patch);this.pcm=new PcmRecording(this.sampleRate,format);this.recording=true;this.node!.port.postMessage({type:'recordStart',id:++this.recordId});return;}
    if (typeof MediaRecorder === 'undefined') throw new Error('Recording is not supported in this browser.');
    if (!this.running) await this.start(patch);
    const mime = ['audio/webm;codecs=opus','audio/ogg;codecs=opus','audio/mp4'].find(type=>MediaRecorder.isTypeSupported(type));
    if (!mime) throw new Error('No supported recording codec was found.');
    this.chunks = []; this.recorder = new MediaRecorder(this.recordTap!.stream,{mimeType:mime});
    this.recorder.ondataavailable = event => { if (event.data.size) this.chunks.push(event.data); };
    this.recorder.onerror = () => { this.recording = false; this.onError('The browser could not record the master output.'); };
    this.recorder.start(1000); this.recording = true;
  }
  stopRecording(): Promise<{blob:Blob;extension:string}> {
    if(this.pcm){if(this.stoppingPcm)return Promise.reject(new Error('Recording is already finishing.'));this.recording=false;return new Promise((resolve,reject)=>{const timer=setTimeout(()=>this.finishPcm('Audio paused; the received recording blocks were saved.'),1500);this.stoppingPcm={resolve,reject,timer};this.node!.port.postMessage({type:'recordStop'});});}
    return new Promise((resolve,reject)=>{
      if (!this.recorder || this.recorder.state === 'inactive') { reject(new Error('There is no active recording.')); return; }
      const recorder = this.recorder;
      recorder.onstop = () => { const mime = recorder.mimeType; resolve({blob:new Blob(this.chunks,{type:mime}),extension:mime.includes('mp4')?'m4a':mime.includes('ogg')?'ogg':'webm'}); this.chunks = []; };
      recorder.stop(); this.recording = false;
    });
  }
  private acceptRecording(data:{id:number;left:Float32Array<ArrayBuffer>;right:Float32Array<ArrayBuffer>;frames:number}){
    if(data.id!==this.recordId||!this.pcm)return;
    try{this.pcm.append(data.left,data.right,data.frames);}catch(error){this.node?.port.postMessage({type:'recordStop'});this.onError((error as Error).message);}
    this.node?.port.postMessage({type:'recordRecycle',id:data.id,left:data.left,right:data.right},[data.left.buffer,data.right.buffer]);
  }
  private finishPcm(reason?:string){
    const pcm=this.pcm;if(!pcm)return;this.pcm=undefined;this.recording=false;
    const pending=this.stoppingPcm;this.stoppingPcm=undefined;if(pending)clearTimeout(pending.timer);
    try{const result=pcm.finish();if(pending)pending.resolve(result);else this.onRecordingReady(result);}catch(error){if(pending)pending.reject(error as Error);else this.onError((error as Error).message);}
    if(reason)this.onError(reason);
  }

}
