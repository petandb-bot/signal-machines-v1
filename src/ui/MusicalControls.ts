import {button,element} from './Controls';
import {defaultCurve,defaultPhrase,defaultHarmony,CHORD_QUALITIES,ROOT_NAMES} from '../graph/MusicalData';
import type {ModuleState} from '../graph/types';

/** Editing stays outside the DSP thread. Changes are saved as typed v1 patch fields. */
export class MusicalControls{
  readonly root=element('section','musical-controls');
  constructor(private readonly module:ModuleState,private readonly changed:()=>void){
    this.root.setAttribute('aria-label',module.type+' score editor');
    if(module.type==='CURVE')this.curves();
    if(module.type==='PHRASE')this.phrase();
    if(module.type==='HARMONY')this.harmony();
  }
  private heading(title:string,help:string){
    this.root.append(element('h3','musical-heading',title),element('p','touch-hint',help));
  }
  private curves(){
    const data=this.module.curve??=defaultCurve();
    this.heading('AUTOMATION','Select A/B. Drag points to edit, or tap the background to add a point. Endpoints keep their timing.');
    let lane=0,active=-1;
    const modes=element('div','mode-options');
    const tabs=[0,1].map(i=>{
      const b=button(i===0?'LANE A':'LANE B','Edit lane '+(i+1),()=>{lane=i;tabs.forEach((t,j)=>t.classList.toggle('active',i===j));render();});
      b.classList.toggle('active',i===0);modes.append(b);return b;
    });
    this.root.append(modes);
    const wrap=element('div','curve-pad');
    const svg=document.createElementNS('http://www.w3.org/2000/svg','svg');svg.setAttribute('viewBox','0 0 320 160');
    svg.setAttribute('aria-label','Editable automation curve');svg.setAttribute('role','application');svg.style.touchAction='none';
    wrap.append(svg);this.root.append(wrap);
    const make=(tag:string,attrs:Record<string,string>)=>{
      const n=document.createElementNS('http://www.w3.org/2000/svg',tag);
      for(const [key,value] of Object.entries(attrs))n.setAttribute(key,value);
      return n;
    };
    const xy=(event:PointerEvent)=>{
      const rect=svg.getBoundingClientRect();
      return{x:Math.min(1,Math.max(0,(event.clientX-rect.left)/Math.max(1,rect.width))),
        y:Math.min(1,Math.max(0,1-(event.clientY-rect.top)/Math.max(1,rect.height)))*2-1};
    };
    const render=()=>{
      svg.replaceChildren();
      for(let k=0;k<=4;k++){
        const x=10+k*75,y=10+k*35;
        svg.append(make('line',{x1:String(x),x2:String(x),y1:'10',y2:'150',stroke:'#35554e','stroke-width':'1'}));
        svg.append(make('line',{x1:'10',x2:'310',y1:String(y),y2:String(y),stroke:'#35554e','stroke-width':'1'}));
      }
      const pts=data.lanes[lane].points;
      svg.append(make('polyline',{points:pts.map(p=>`${10+p.t*300},${80-p.v*70}`).join(' '),
        fill:'none',stroke:'#9ddedc','stroke-width':'2.5'}));
      pts.forEach((p,i)=>{
        const circle=make('circle',{cx:String(10+p.t*300),cy:String(80-p.v*70),r:'5',fill:'#f3e8be',stroke:'#111e1a','stroke-width':'1','data-point':String(i)});
        svg.append(circle);
      });
      count.textContent=pts.length+' points';
    };
    svg.addEventListener('pointerdown',event=>{
      if(event.button!==0)return;event.preventDefault();
      const target=event.target as SVGElement,hit=target.getAttribute('data-point');
      const points=data.lanes[lane].points;
      if(hit!==null)active=Number(hit);
      else{
        const p=xy(event);if(points.length>=64)return;
        const index=points.findIndex(item=>item.t>p.x);
        if(index<1)return;
        const before=points[index-1],after=points[index];if(p.x<=before.t+.001||p.x>=after.t-.001)return;
        points.splice(index,0,{t:p.x,v:p.y});active=index;
      }
      svg.setPointerCapture(event.pointerId);render();
    });
    svg.addEventListener('pointermove',event=>{
      if(active<0)return;const p=xy(event),points=data.lanes[lane].points;
      const min=active===0?0:points[active-1].t+.001;
      const max=active===points.length-1?1:points[active+1].t-.001;
      points[active]={t:active===0?0:active===points.length-1?1:Math.max(min,Math.min(max,p.x)),v:p.y};
      render();
    });
    const finish=()=>{if(active<0)return;active=-1;this.changed();};
    svg.addEventListener('pointerup',finish);svg.addEventListener('pointercancel',finish);
    const actions=element('div','musical-actions'),count=element('span','musical-count');
    actions.append(button('REMOVE POINT','Remove nearest middle point',()=>{
      const pts=data.lanes[lane].points;if(pts.length<=2)return;
      pts.splice(Math.min(pts.length-2,Math.ceil(pts.length/2)),1);render();this.changed();
    }),button('RESET LANE','Restore original points',()=>{
      data.lanes[lane]=defaultCurve().lanes[lane];render();this.changed();
    }),count);
    this.root.append(actions);render();
  }
  private phrase(){
    const score=this.module.phrase??=defaultPhrase();
    this.heading('MELODY','16 editable note steps. PITCH is semitones relative to the voice. REST silences the step; LENGTH is its duration.');
    const grid=element('div','musical-score');
    const hdr=element('div','musical-score-row musical-score-header');
    for(const x of ['STEP','PITCH','LENGTH','VEL','REST'])hdr.append(element('span','',x));grid.append(hdr);
    score.steps.forEach((step,i)=>{
      const row=element('div','musical-score-row');
      row.append(element('span','',String(i+1).padStart(2,'0')));
      const pitch=element('input');pitch.type='number';pitch.min='-24';pitch.max='24';pitch.step='1';pitch.value=String(step.pitch);pitch.setAttribute('aria-label',`Step ${i+1} pitch`);
      pitch.addEventListener('change',()=>{step.pitch=Math.max(-24,Math.min(24,Math.round(Number(pitch.value)||0)));pitch.value=String(step.pitch);this.changed();});
      const length=element('select');length.setAttribute('aria-label',`Step ${i+1} length`);
      for(const n of [.25,.5,.75,1]){const option=element('option','',Math.round(n*100)+'%');option.value=String(n);length.append(option);}
      length.value=String([.25,.5,.75,1].reduce((a,b)=>Math.abs(b-step.length)<Math.abs(a-step.length)?b:a));
      length.addEventListener('change',()=>{step.length=Number(length.value);this.changed();});
      const velocity=element('select');velocity.setAttribute('aria-label',`Step ${i+1} velocity`);
      for(const n of [.25,.5,.75,1]){const option=element('option','',Math.round(n*100)+'%');option.value=String(n);velocity.append(option);}
      velocity.value=String([.25,.5,.75,1].reduce((a,b)=>Math.abs(b-step.velocity)<Math.abs(a-step.velocity)?b:a));
      velocity.addEventListener('change',()=>{step.velocity=Number(velocity.value);this.changed();});
      const rest=element('input');rest.type='checkbox';rest.checked=step.rest;rest.setAttribute('aria-label',`Step ${i+1} rest`);
      rest.addEventListener('change',()=>{step.rest=rest.checked;this.changed();});
      row.append(pitch,length,velocity,rest);grid.append(row);
    });
    this.root.append(grid);
    this.root.append(button('RESET PHRASE','Restore example melody',()=>{this.module.phrase=defaultPhrase();this.changed();this.root.replaceChildren();this.phrase();},'musical-reset'));
  }
  private harmony(){
    const score=this.module.harmony??=defaultHarmony();
    this.heading('HARMONIC MEMORY','Eight chord slots. Root is semitones relative to the voice; each of four output CVs follows its nearest reachable position.');
    const grid=element('div','musical-score');
    const hdr=element('div','musical-score-row musical-score-header');for(const x of ['SLOT','ROOT','QUALITY',''])hdr.append(element('span','',x));grid.append(hdr);
    score.chords.forEach((chord,i)=>{
      const row=element('div','musical-score-row');
      row.append(element('span','',String(i+1).padStart(2,'0')));
      const root=element('input');root.type='number';root.min='-12';root.max='12';root.step='1';root.value=String(chord.root);root.setAttribute('aria-label',`Chord ${i+1} root`);
      root.addEventListener('change',()=>{chord.root=Math.max(-12,Math.min(12,Math.round(Number(root.value)||0)));root.value=String(chord.root);this.changed();});
      const quality=element('select');quality.setAttribute('aria-label',`Chord ${i+1} quality`);
      for(const name of CHORD_QUALITIES){const option=element('option','',name.toUpperCase());option.value=name;quality.append(option);}quality.value=chord.quality;
      quality.addEventListener('change',()=>{chord.quality=quality.value as typeof chord.quality;this.changed();});
      const label=element('span','musical-count',ROOT_NAMES[((chord.root%12)+12)%12]);
      root.addEventListener('change',()=>label.textContent=ROOT_NAMES[((chord.root%12)+12)%12]);
      row.append(root,quality,label);grid.append(row);
    });
    this.root.append(grid);
    this.root.append(button('RESET CHORDS','Restore example progression',()=>{this.module.harmony=defaultHarmony();this.changed();this.root.replaceChildren();this.harmony();},'musical-reset'));
  }
}