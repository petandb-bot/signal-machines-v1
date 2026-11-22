import {button,element} from './Controls';
import {BUILTINS} from '../samples/FoundData';
import type {FoundAudio} from '../samples/FoundData';
export class FoundControls{
  readonly root=element('div','found-controls');readonly select=element('select','record-format');private path=document.createElementNS('http://www.w3.org/2000/svg','path');private status=element('p','loop-status');private load:HTMLButtonElement;
  constructor(readonly id:string,reference:string,onChoose:(ref:string)=>void,onFile:(file:File)=>void|Promise<void>,type='FOUND'){
    const label=element('label','record-format-label','SOURCE');this.select.setAttribute('aria-label',type+' source');
    for(const name of BUILTINS){const o=element('option','',name.toUpperCase()+' · synthetic');o.value='builtin:'+name;this.select.append(o);}
    if(reference.startsWith('local:')){const o=element('option','','Local file');o.value=reference;this.select.append(o);}this.select.value=reference;this.select.addEventListener('change',()=>onChoose(this.select.value));label.append(this.select);
    const file=element('input');file.type='file';file.accept='audio/*,.wav,.aif,.aiff,.aifc,.mp3,.m4a,.aac,.ogg,.flac';file.hidden=true;file.setAttribute('aria-label',type+' audio file');file.addEventListener('change',()=>{
      const chosen=file.files?.[0];
      if(!chosen)return;
      // Safari/Files cloud providers may invalidate the File when the picker resets.
      // Keep it selected until the controller has copied, decoded and stored the bytes.
      void Promise.resolve().then(()=>onFile(chosen))
        .catch(()=>{}) // The controller reports the visible import error.
        .finally(()=>{file.value='';});
    });this.load=button('LOAD FILE','Load '+type+' audio file',()=>file.click(),'impulse-button');this.status.setAttribute('role','status');this.status.textContent='Loading sample…';
    const preview=document.createElementNS('http://www.w3.org/2000/svg','svg');preview.setAttribute('viewBox','0 0 208 32');preview.classList.add('found-preview');preview.setAttribute('role','img');preview.setAttribute('aria-label','Loaded sample waveform');preview.append(this.path);
    this.root.append(label,this.load,file,this.status,preview,element('p','loop-note','WAV / PCM AIFF / MP3 / M4A and browser-supported audio · 60 s / 32 MB max. Two FOUND/CUTS per patch. Files stay on this device; JSON does not carry audio. Box/iCloud: if import fails, save a copy in Files → On My iPhone and select that copy.'));
  }
  update(audio?:FoundAudio,message?:string){if(audio)this.path.setAttribute('d',audio.peaks.map((peak,i)=>`M${i*2+1} ${16-peak*15}v${peak*30}`).join(' '));this.status.textContent=message??(audio?`${audio.name} · ${(audio.left.length/audio.sampleRate).toFixed(1)} s`:'Sample missing — load the original file again.');}
  busy(value:boolean){this.select.disabled=this.load.disabled=value;}
}
