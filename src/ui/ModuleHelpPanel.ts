import {MODULE_GROUPS} from '../graph/catalog';
import {DEFINITIONS,MODE_OPTIONS} from '../graph/definitions';
import type {ModuleType,PortDefinition} from '../graph/types';
import {button,element} from './Controls';

/** Read-only module reference. Nothing here changes a patch or an audio parameter. */
export class ModuleHelpPanel {
  readonly root=element('aside','module-help floating-panel');
  onClose:()=>void=()=>{};
  private readonly search=element('input','module-help-search');
  private readonly count=element('span','module-help-count');
  private readonly empty=element('p','module-help-empty','No matching modules.');
  private readonly rows:{type:ModuleType;group:string;node:HTMLDetailsElement;searchable:string}[]=[];
  private readonly groups:{node:HTMLElement;items:HTMLDetailsElement[]}[]=[];

  constructor(){
    this.root.setAttribute('aria-label','Module help');
    this.root.setAttribute('role','region');
    const top=element('div','panel-top');
    top.append(element('span','','Module help'),
      button('×','Close module help',()=>this.onClose()));
    const introduction=element('p','module-help-intro',
      '68 small machines. Each has a role, not a fixed musical outcome. A clock or a pitch relationship can support irregular, unstable sound.');
    const signals=element('p','module-help-signals',
      'AUDIO = sound · CLOCK / TRIG = events · PITCH / CTRL = changes to another module');
    this.search.type='search';
    this.search.placeholder='Search name, sound, control…';
    this.search.autocomplete='off';
    this.search.setAttribute('aria-label','Search module help');
    this.search.addEventListener('input',()=>this.filter());
    const find=element('div','module-help-find');
    find.append(this.search,this.count);

    const collection=element('div','module-help-collection');
    for(const group of MODULE_GROUPS){
      const section=element('section','module-help-group');
      const title=element('h3','module-help-heading',group.name);
      const items:HTMLDetailsElement[]=[];
      section.append(title);
      for(const type of group.types){
        const def=DEFINITIONS[type];
        const item=document.createElement('details');
        item.className='module-help-item';
        item.dataset.module=type;
        const summary=element('summary','module-help-summary');
        const heading=element('span','module-help-item-heading');
        heading.append(element('strong','',type),element('span','',def.subtitle));
        summary.append(heading,element('span','module-help-description',def.description));
        item.append(summary);
        const detail=element('div','module-help-detail');
        const modes=MODE_OPTIONS[type];
        if(modes?.length){
          detail.append(element('span','module-help-small-heading','MODES'),
            element('p','module-help-modes',modes.join(' · ')));
        }
        const controls=element('div','module-help-controls');
        controls.append(element('span','module-help-small-heading','CONTROLS'));
        for(const p of def.parameters){
          const line=element('p','module-help-parameter');
          line.append(element('strong','',p.label+' — '),document.createTextNode(p.description));
          controls.append(line);
        }
        detail.append(controls);
        detail.append(this.ports('INPUTS',def.inputs),this.ports('OUTPUTS',def.outputs));
        item.append(detail);
        items.push(item);
        this.rows.push({
          type,group:group.name,node:item,
          searchable:[type,group.name,def.subtitle,def.description,
            ...def.parameters.flatMap(p=>[p.label,p.description]),
            ...def.inputs.map(p=>p.label),...def.outputs.map(p=>p.label),
            ...(modes??[])].join(' ').toLocaleLowerCase('en')
        });
      }
      this.groups.push({node:section,items});
      section.append(...items);collection.append(section);
    }
    this.empty.hidden=true;
    collection.append(this.empty);
    this.root.append(top,introduction,signals,find,collection);
    this.filter();
  }

  /** May be called when the menu opens the panel; helps touch and keyboard users. */
  focusSearch(){
    this.search.focus();
  }

  private ports(label:string,ports:readonly PortDefinition[]){
    const section=element('div','module-help-ports');
    section.append(element('span','module-help-small-heading',label));
    section.append(element('p','',ports.length
      ?ports.map(p=>p.label+' ('+p.signal.toUpperCase()+')').join(' · ')
      :'None'));
    return section;
  }

  private filter(){
    const query=this.search.value.trim().toLocaleLowerCase('en');
    let found=0;
    for(const row of this.rows){
      const match=!query||row.searchable.includes(query);
      row.node.hidden=!match;
      if(match)found++;
    }
    for(const group of this.groups)group.node.hidden=!group.items.some(item=>!item.hidden);
    this.empty.hidden=found!==0;
    this.count.textContent=`${found} / ${this.rows.length}`;
  }
}
