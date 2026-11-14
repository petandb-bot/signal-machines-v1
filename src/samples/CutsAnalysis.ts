export interface CutEvent {start:number;end:number;kind:'attack'|'texture'|'tail';weight:number}

/** Main-thread analysis only. Local contrast keeps quiet gestures eligible. */
export function analyzeCuts(left:Float32Array,right:Float32Array,rate:number):CutEvent[]{
  const hop=Math.max(1,Math.round(rate*.01)),levels:number[]=[],candidates:CutEvent[]=[];
  for(let at=0;at<left.length;at+=hop){let power=0;const end=Math.min(left.length,at+hop);for(let i=at;i<end;i++)power+=(left[i]**2+right[i]**2)*.5;levels.push(Math.sqrt(power/(end-at)));}
  for(let i=0;i<levels.length;i++){
    const e=levels[i],previous=levels[Math.max(0,i-1)];if(e<1e-8)continue;
    let local=0;for(let j=Math.max(0,i-12);j<=Math.min(levels.length-1,i+12);j++)local=Math.max(local,levels[j]);
    const attack=e>previous*1.4&&e-previous>local*.08;
    const tail=!attack&&i%17===0&&e<local*.6;
    if(!attack&&!tail&&i%29!==0)continue;
    const start=Math.max(0,(i-(attack?1:0))*hop),duration=attack?.34:tail?.25:.18;
    const end=Math.min(left.length,start+Math.round(rate*duration));if(end-start<rate*.012)continue;
    candidates.push({start,end,kind:attack?'attack':tail?'tail':'texture',weight:Math.min(2,attack?(e-previous)/(local+1e-9)+.6:tail?.7:.45+e/(local+1e-9)*.3)});
  }
  // Bounded, stratified selection across time and classes; never rank by loudness.
  const result:CutEvent[]=[];
  for(const kind of ['attack','texture','tail'] as const){const group=candidates.filter(c=>c.kind===kind);const count=Math.min(21,group.length);for(let i=0;i<count;i++)result.push(group[Math.floor(i*group.length/count)]);}
  return result.sort((a,b)=>a.start-b.start);
}
