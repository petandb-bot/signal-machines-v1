import {recordingFrames} from './PcmRecording';
const BLOCK=8192;
type Pair={left:Float32Array<ArrayBuffer>;right:Float32Array<ArrayBuffer>};
/** Transferable blocks are recycled; a stalled UI ends the take without blocking audio. */
export class MasterCapture {
  private pool:Pair[]=[];private current?:Pair;private used=0;private frames=0;private id=0;private limit=0;active=false;
  constructor(private readonly send:(data:unknown,transfer?:Transferable[])=>void){}
  start(id:number,rate:number){
    if(this.active)throw new Error('A recording is already active.');
    this.id=id;this.limit=recordingFrames(rate);this.frames=this.used=0;this.pool=Array.from({length:8},()=>({left:new Float32Array(BLOCK),right:new Float32Array(BLOCK)}));this.current=this.pool.pop();this.active=true;
  }
  recycle(id:number,left:Float32Array<ArrayBuffer>,right:Float32Array<ArrayBuffer>){if(this.active&&id===this.id&&left?.length===BLOCK&&right?.length===BLOCK&&this.pool.length<8)this.pool.push({left,right});}
  private flush(){const pair=this.current;if(pair&&this.used){this.send({type:'recordData',id:this.id,...pair,frames:this.used},[pair.left.buffer,pair.right.buffer]);this.current=undefined;this.used=0;}}
  stop(reason?:string){if(!this.active)return;this.flush();this.active=false;this.pool=[];this.current=undefined;this.send({type:'recordEnd',id:this.id,reason});}
  push(left:Float32Array,right:Float32Array){
    for(let i=0;this.active&&i<left.length;i++){
      if(!this.current)this.current=this.pool.pop();
      if(!this.current){this.stop('Recording ended because the page could not keep up. The captured audio was saved.');break;}
      this.current.left[this.used]=left[i];this.current.right[this.used]=right[i];this.used++;this.frames++;
      if(this.used===BLOCK)this.flush();
      if(this.frames>=this.limit)this.stop('Recording reached its 3 minute / 48 MB limit and was saved.');
    }
  }
}
