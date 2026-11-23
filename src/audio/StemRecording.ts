import {PcmRecording,recordingFrames,MAX_STEM_OUTPUTS} from './PcmRecording';
import {crc32Parts,zipBlobs} from './ZipArchive';

/** Simultaneous PCM takes from OUTPUT modules, rather than re-rendering random sources. */
export class StemRecording{
  readonly ids:readonly string[];
  readonly maxFrames:number;
  private readonly recorders=new Map<string,PcmRecording>();
  private readonly ended=new Set<string>();
  constructor(readonly sampleRate:number,ids:readonly string[]){
    if(ids.length<2||ids.length>MAX_STEM_OUTPUTS||new Set(ids).size!==ids.length||
       !ids.every(id=>/^[a-zA-Z0-9_-]{1,80}$/.test(id)))throw Error('Stem recording needs 2–4 distinct OUTPUT modules.');
    this.ids=[...ids];this.maxFrames=recordingFrames(sampleRate,ids.length,'stems');
    for(const id of ids)this.recorders.set(id,new PcmRecording(sampleRate,'wav',this.maxFrames));
  }
  append(id:string,left:Float32Array,right:Float32Array,frames:number){
    const pcm=this.recorders.get(id);
    if(!pcm||this.ended.has(id))throw Error('Unknown or finished stem track.');
    pcm.append(left,right,frames);
  }
  end(id:string){
    if(!this.recorders.has(id))throw Error('Unknown stem track.');
    this.ended.add(id);
    return this.ended.size===this.ids.length;
  }
  forceEnd(){for(const id of this.ids)this.ended.add(id);}
  finish(){
    if(this.ended.size!==this.ids.length)throw Error('Stem capture is still running.');
    const longest=Math.max(...this.ids.map(id=>this.recorders.get(id)!.frames));
    if(longest<=0)throw Error('No stem audio was recorded.');
    const entries:Array<{name:string;blob:Blob;checksum:number}>=[];
    const silence=new Float32Array(8192);
    for(let index=0;index<this.ids.length;index++){
      const id=this.ids[index],pcm=this.recorders.get(id)!;
      // If an output stalls near the end, pad only its trailing silence.
      while(pcm.frames<longest){
        const missing=Math.min(silence.length,longest-pcm.frames);
        pcm.append(silence,silence,missing);
      }
      const audio=pcm.finish({edgeFadeMs:3,withChecksum:true});
      entries.push({name:`${String(index+1).padStart(2,'0')}_${id}.wav`,blob:audio.blob,checksum:audio.checksum!});
    }
    const seconds=(longest/this.sampleRate).toFixed(3);
    const guide=[
      'SIGNAL MACHINES — SYNCHRONIZED OUTPUT STEMS',
      'One recording pass. All files begin at sample zero and share the same duration.',
      `Sample rate: ${this.sampleRate} Hz | PCM: stereo signed 24-bit | duration: ${seconds} s`,
      'Each file is one OUTPUT module, including its upstream effects.',
      'Audio is captured before the final global master soft saturation.',
      'Stems include master volume and transport fade. The linear sum can differ from the saturated live master.',
      'Import all WAV tracks into your DAW starting at exactly 0:00 without time-stretching.',
      'Audio routed into multiple OUTPUT modules can occur in more than one stem.',
      'To isolate tracks, connect separate sound chains to separate OUTPUT modules.',
      'Locally imported sample files are not embedded in patch JSON; back them up separately.',
      'Tracks:',
      ...entries.map(e=>'  '+e.name),
      ''
    ].join('\n');
    const guideBytes=new TextEncoder().encode(guide);
    entries.push({name:'STEMS_README.txt',blob:new Blob([guideBytes],{type:'text/plain'}),checksum:crc32Parts([guideBytes])});
    const blob=zipBlobs(entries);
    this.recorders.clear();
    return{blob,extension:'zip',frames:longest};
  }
}
