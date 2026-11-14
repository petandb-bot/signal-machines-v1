import {button,element} from './Controls';
import type {FoundAudio} from '../samples/FoundData';
export class FoundControls{
  readonly root=element('div','found-controls');readonly select=element('select','record-format');private path=document.createElementNS('http://www.w3.org/2000/svg','path');private status=element('p','loop-status');private load:HTMLButtonElement;
  constructor(readonly id:string,reference:string,onChoose:(ref:string)=>void,onFile:(file:File)=>void,type='FOUND'){
    const label=element('label','record-format-label','SOURCE');this.select.setAttribute('aria-label',type+' source');
    for(const name of ['room','rain','machine']){const o=element('option','',name.toUpperCase()+' · synthetic');o.value='builtin:'+name;this.select.append(o);}
    if(reference.startsWith('local:')){const o=element('option','','Local file');o.value=reference;this.select.append(o);}this.select.value=reference;this.select.addEventListener('change',()=>onChoose(this.select.value));label.append(this.select);
    const file=element('input');file.type='file';file.accept='audio/*,.wav,.mp3,.m4a';file.hidden=true;file.setAttribute('aria-label',type+' audio file');file.addEventListener('change',()=>{const f=file.files?.[0];if(f)onFile(f);file.value='';});this.load=button('LOAD FILE','Load '+type+' audio file',()=>file.click(),'impulse-button');this.status.setAttribute('role','status');this.status.textContent='Loading sample…';
    const preview=document.createElementNS('http://www.w3.org/2000/svg','svg');preview.setAttribute('viewBox','0 0 208 32');preview.classList.add('found-preview');preview.setAttribute('role','img');preview.setAttribute('aria-label','Loaded sample waveform');preview.append(this.path);
    this.root.append(label,this.load,file,this.status,preview,element('p','loop-note','Up to 60 s / 32 MB · 2 FOUND/CUTS per patch. Local audio stays in this browser; JSON does not carry the sound. Built-ins are original synthetic environments.'));
  }
  update(audio?:FoundAudio,message?:string){if(audio)this.path.setAttribute('d',audio.peaks.map((peak,i)=>`M${i*2+1} ${16-peak*15}v${peak*30}`).join(' '));this.status.textContent=message??(audio?`${audio.name} · ${(audio.left.length/audio.sampleRate).toFixed(1)} s`:'Sample missing — load the original file again.');}
  busy(value:boolean){this.select.disabled=this.load.disabled=value;}
}
