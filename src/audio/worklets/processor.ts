import {MasterCapture} from '../MasterCapture';
import { DSPGraph } from '../DSPGraph';
import { parsePatch } from '../../state/PatchStorage';
declare const sampleRate: number;
declare class AudioWorkletProcessor { readonly port: MessagePort; constructor(); }
declare function registerProcessor(name: string, processor: typeof AudioWorkletProcessor): void;
class SignalMachinesProcessor extends AudioWorkletProcessor {
  private readonly graph = new DSPGraph(sampleRate);
  private readonly capture=new MasterCapture((data,transfer)=>this.port.postMessage(data,transfer??[]));
  private sinceTelemetry = 0;
  private failed = false;
  constructor() {
    super();
    this.port.onmessage = event => {
      try {
        const message = event.data;
        if(message.type==='foundAssets')this.graph.setFoundAssets(message.assets,message.retain);
        else if(message.type==='recordStart')this.capture.start(message.id,sampleRate);
        else if(message.type==='recordStop')this.capture.stop();
        else if(message.type==='recordRecycle')this.capture.recycle(message.id,message.left,message.right);
        else if (message.type === 'patch') { this.graph.setPatch(parsePatch(JSON.stringify(message.patch)), !!message.reset,!!message.preserveLoops); this.failed = false; }
        else if(message.type==='moduleAction'){this.graph.requestAction(message.id,message.action,message.payload,(result,error)=>this.port.postMessage({type:'actionResult',requestId:message.requestId,result,error}));}
        else if(message.type==='transportStop')this.graph.finishLoops();
        else if (message.type === 'parameters') this.graph.updateParameters(parsePatch(JSON.stringify(message.patch)));
      } catch (error) { this.port.postMessage({type:'error',error:error instanceof Error ? error.message : 'Invalid DSP message.'}); }
    };
  }
  process(_inputs: Float32Array[][], outputs: Float32Array[][]) {
    const out = outputs[0]; if (!out?.length) return true;
    if (this.failed) { for (const channel of out) channel.fill(0); return true; }
    try {
      this.graph.process(out[0], out[1] ?? out[0]);this.capture.push(out[0],out[1]??out[0]); this.sinceTelemetry += out[0].length;
      if (this.sinceTelemetry >= sampleRate / 20) { this.sinceTelemetry %= sampleRate / 20; this.port.postMessage({type:'telemetry',data:this.graph.telemetry()}); }
    } catch (error) {
      for (const channel of out) channel.fill(0); this.failed = true;this.capture.stop('The audio processor stopped. The captured audio was saved.');
      this.port.postMessage({type:'error',error:error instanceof Error ? error.message : 'DSP processing failed.'});
    }
    return true;
  }
}
registerProcessor('signal-machines', SignalMachinesProcessor);
