import {FoundLibrary} from '../samples/FoundLibrary';
import {foundRef} from '../samples/FoundData';
import type {FoundAudio} from '../samples/FoundData';
import {PcmRecording} from './PcmRecording';
import type {RecordingFormat} from './PcmRecording';
import processorURL from './worklets/processor.ts?worker&url';
import type { EngineTelemetry, Patch } from '../graph/types';
type RecordedAudio={blob:Blob;extension:string};
export class AudioEngine {
  readonly foundLibrary=new FoundLibrary();private foundGeneration=0;private transportGeneration=0;private desiredFoundRefs:string[]=[];private sentFound=new Map<string,FoundAudio>();
  async foundAudio(patch:Patch){const ids=[...new Set(patch.modules.filter(m=>m.type==='FOUND').map(m=>foundRef(m.sample)))];const assets:FoundAudio[]=[];for(const id of ids){if(!this.desiredFoundRefs.includes(id))continue;try{const audio=await this.foundLibrary.get(id,()=>this.desiredFoundRefs.includes(id));if(audio)assets.push(audio);else if(this.desiredFoundRefs.includes(id))this.onError('FOUND sample missing on this browser. Load the original file again.');}catch{if(this.desiredFoundRefs.includes(id))this.onError('FOUND sample could not be restored. Load the original file again.');}}this.foundLibrary.retain(this.desiredFoundRefs);return assets;}
  private sendFound(assets:FoundAudio[]){if(!this.node)return;const same=assets.length===this.sentFound.size&&assets.every(a=>this.sentFound.get(a.id)===a);if(same)return;const transfer:ArrayBuffer[]=[],copies=assets.filter(a=>this.sentFound.get(a.id)!==a).map(a=>{const left=a.left.slice(),right=a.right.slice();transfer.push(left.buffer,right.buffer);return{...a,left,right};});this.node.port.postMessage({type:'foundAssets',assets:copies,retain:assets.map(a=>a.id)},transfer);this.sentFound=new Map(assets.map(a=>[a.id,a]));this.foundLibrary.retain(assets.map(a=>a.id));}

  private pcm?:PcmRecording;private recordId=0;private stoppingPcm?:{resolve:(result:{blob:Blob;extension:string})=>void;reject:(error:Error)=>void;timer:ReturnType<typeof setTimeout>};
  onRecordingReady:(result:{blob:Blob;extension:string})=>void=()=>{};
  private actionSequence=0;private requests=new Map<number,{resolve:(value:unknown)=>void;reject:(error:Error)=>void;timer:ReturnType<typeof setTimeout>}>();
  private context?: AudioContext; private node?: AudioWorkletNode; private gain?: GainNode;
  private browserTake?:{recorder:MediaRecorder;done:Promise<RecordedAudio>;stopRequested:boolean};
  private recordTap?: MediaStreamAudioDestinationNode;
  private parameterTimer?: ReturnType<typeof setTimeout>; private pendingParameters?: Patch;
  running = false; recording = false;
  onTelemetry: (data: EngineTelemetry) => void = () => {};
  onError: (message: string) => void = () => {};
  get sampleRate() { return this.context?.sampleRate ?? 0; }
  async start(patch: Patch) {
    this.transportGeneration++;
    const generation=++this.foundGeneration;this.desiredFoundRefs=patch.modules.filter(m=>m.type==='FOUND').map(m=>foundRef(m.sample));this.foundLibrary.retain(this.desiredFoundRefs);
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
        this.sentFound.clear();this.node = new AudioWorkletNode(context, 'signal-machines', {numberOfInputs:0,numberOfOutputs:1,outputChannelCount:[2]});
        this.node.port.onmessage = event => { if(event.data.type==='recordData'){this.acceptRecording(event.data);return;}if(event.data.type==='recordEnd'){if(event.data.id===this.recordId)this.finishPcm(event.data.reason);return;} if(event.data.type==='actionResult'){const request=this.requests.get(event.data.requestId);if(request){clearTimeout(request.timer);this.requests.delete(event.data.requestId);if(event.data.error)request.reject(new Error(event.data.error));else request.resolve(event.data.result);}return;}if (event.data.type === 'telemetry') this.onTelemetry(event.data.data); else if (event.data.type === 'error') { void this.stop(); this.onError(event.data.error); } };
        this.node.onprocessorerror = () => { this.rejectRequests('The audio processor stopped.');void this.stop(); this.onError('The audio processor stopped. Reload the page to restart the engine.'); };
        this.gain = context.createGain(); this.gain.gain.value = 0;
        this.node.connect(this.gain); this.gain.connect(context.destination);
        this.recordTap = context.createMediaStreamDestination(); this.gain.connect(this.recordTap);
      } catch (error) { await context.close(); this.context = undefined; throw error; }
    }
    clearTimeout(this.parameterTimer); this.parameterTimer = undefined; this.pendingParameters = undefined;
    await this.context.resume();
    if(generation!==this.foundGeneration)throw Error('Patch changed while loading samples. Tap RUN again.');const assets=patch.modules.some(m=>m.type==='FOUND')?await this.foundAudio(patch):[];if(generation!==this.foundGeneration)throw Error('Patch changed while loading samples. Tap RUN again.');
    // A phone can suspend audio while a local sample is being decoded.
    if(this.context.state!=='running')await this.context.resume();
    if(generation!==this.foundGeneration)throw Error('Patch changed while loading samples. Tap RUN again.');this.sendFound(assets);
    this.node!.port.postMessage({type:'patch',patch,reset:true,preserveLoops:true});
    this.gain!.gain.cancelScheduledValues(this.context.currentTime); this.gain!.gain.setValueAtTime(0,this.context.currentTime); this.gain!.gain.linearRampToValueAtTime(1,this.context.currentTime + .025);
    this.running = true;
  }
  async stop() {
    const generation=++this.transportGeneration;this.foundGeneration++;this.running=false;
    clearTimeout(this.parameterTimer);this.parameterTimer=undefined;this.pendingParameters=undefined;
    this.rejectRequests('Playback stopped before the module answered.');
    if(this.recording){try{const result=await this.stopRecording();this.onRecordingReady(result);}catch(error){this.onError((error as Error).message);}}
    if(generation!==this.transportGeneration)return;
    if (!this.context || !this.gain) return;
    this.node?.port.postMessage({type:'transportStop'});
    const context = this.context;
    this.gain.gain.cancelScheduledValues(context.currentTime); this.gain.gain.setTargetAtTime(0,context.currentTime,.006);
    await new Promise(resolve=>setTimeout(resolve,50));
    if (generation===this.transportGeneration&&!this.running) await context.suspend();
  }
  sync(patch: Patch, routing: boolean, reset = false) {
    const generation=routing?++this.foundGeneration:this.foundGeneration;if(routing){this.desiredFoundRefs=patch.modules.filter(m=>m.type==='FOUND').map(m=>foundRef(m.sample));this.foundLibrary.retain(this.desiredFoundRefs);}
    if (!this.node) return;
    if(routing&&patch.modules.some(m=>m.type==='FOUND')){clearTimeout(this.parameterTimer);this.parameterTimer=undefined;this.pendingParameters=undefined;const copy=structuredClone(patch);void this.foundAudio(copy).then(assets=>{if(generation!==this.foundGeneration)return;copy.bpm=patch.bpm;copy.master=patch.master;for(const m of copy.modules){const latest=patch.modules.find(n=>n.id===m.id);if(latest){m.params={...latest.params};m.character=latest.character;m.mode=latest.mode;m.wide=latest.wide;m.bypass=latest.bypass;m.gesture=latest.gesture?structuredClone(latest.gesture):undefined;}}this.sendFound(assets);this.node!.port.postMessage({type:'patch',patch:copy,reset});}).catch(error=>this.onError(error.message));return;}
    if(routing)this.sendFound([]);
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
    if(this.recording||this.stoppingPcm||this.browserTake)throw new Error('A recording is already active or finishing.');
    if(format!=='browser'){if(!this.running)await this.start(patch);if(this.recording||this.stoppingPcm||this.browserTake)throw new Error('A recording is already active or finishing.');this.pcm=new PcmRecording(this.sampleRate,format);this.recording=true;this.node!.port.postMessage({type:'recordStart',id:++this.recordId});return;}
    if (typeof MediaRecorder === 'undefined') throw new Error('Recording is not supported in this browser.');
    const mime = ['audio/webm;codecs=opus','audio/ogg;codecs=opus','audio/mp4'].find(type=>MediaRecorder.isTypeSupported(type));
    if (!mime) throw new Error('No supported recording codec was found.');
    if (!this.running) await this.start(patch);
    if(this.recording||this.stoppingPcm||this.browserTake)throw new Error('A recording is already active or finishing.');
    const recorder=new MediaRecorder(this.recordTap!.stream,{mimeType:mime}),chunks:Blob[]=[];
    let resolve!:(result:RecordedAudio)=>void,reject!:(error:Error)=>void;
    const done=new Promise<RecordedAudio>((yes,no)=>{resolve=yes;reject=no;});
    const take={recorder,done,stopRequested:false};this.browserTake=take;
    recorder.ondataavailable=event=>{if(event.data.size)chunks.push(event.data);};
    recorder.onstop=()=>{
      const mime=recorder.mimeType,blob=new Blob(chunks,{type:mime});chunks.length=0;
      if(this.browserTake===take){this.browserTake=undefined;this.recording=false;}
      if(blob.size)resolve({blob,extension:mime.includes('mp4')?'m4a':mime.includes('ogg')?'ogg':'webm'});
      else reject(new Error('No audio was recorded.'));
      // Native recorder errors also end with dataavailable/stop; preserve that partial take.
      if(!take.stopRequested)void done.then(result=>this.onRecordingReady(result),error=>this.onError(error.message));
    };
    recorder.onerror=()=>{this.recording=false;this.onError('The browser could not record the master output.');};
    try{recorder.start(1000);this.recording=true;}catch(error){this.browserTake=undefined;throw error;}
  }
  stopRecording(): Promise<{blob:Blob;extension:string}> {
    if(this.pcm){if(this.stoppingPcm)return Promise.reject(new Error('Recording is already finishing.'));this.recording=false;return new Promise((resolve,reject)=>{const timer=setTimeout(()=>this.finishPcm('Audio paused; the received recording blocks were saved.'),1500);this.stoppingPcm={resolve,reject,timer};this.node!.port.postMessage({type:'recordStop'});});}
    const take=this.browserTake;
    if(!take)return Promise.reject(new Error('There is no active recording.'));
    if(!take.stopRequested){
      take.stopRequested=true;
      try{if(take.recorder.state!=='inactive')take.recorder.stop();}
      catch(error){take.stopRequested=false;return Promise.reject(error);}
      this.recording=false;
    }
    return take.done;
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
