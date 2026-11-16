/** Allocation-only sample rate conversion, never called inside AudioWorklet. */
export interface StereoPcm {sampleRate:number;left:Float32Array;right:Float32Array}

/** Windowed-sinc conversion with a low-pass cutoff for downsampling. No DSP callback allocation. */
export function resampleStereo(input:StereoPcm,targetRate:number):StereoPcm{
  const {left,right,sampleRate}=input;
  if(!Number.isInteger(targetRate)||targetRate<8000||targetRate>192000||
    !Number.isInteger(sampleRate)||sampleRate<8000||sampleRate>192000||
    left.length!==right.length||left.length<2)throw Error('Invalid sample rate or stereo audio.');
  if(sampleRate===targetRate)return input;
  const count=Math.max(2,Math.round(left.length*targetRate/sampleRate));
  const outL=new Float32Array(count),outR=new Float32Array(count);
  const cutoff=Math.min(1,targetRate/sampleRate)*(targetRate<sampleRate?.96:1);
  const radius=Math.min(64,Math.max(16,Math.ceil(10/cutoff)));
  const width=radius*2,phases=512,kernels=new Float64Array(width*phases);
  for(let phase=0;phase<phases;phase++){
    let sum=0;const fraction=phase/phases,offset=phase*width;
    for(let t=0;t<width;t++){
      const x=t-radius+1-fraction,argument=Math.PI*cutoff*x;
      const sinc=Math.abs(argument)<1e-12?1:Math.sin(argument)/argument;
      const window=Math.abs(x)<radius?.5+.5*Math.cos(Math.PI*x/radius):0;
      const weight=cutoff*sinc*window;kernels[offset+t]=weight;sum+=weight;
    }
    for(let t=0;t<width;t++)kernels[offset+t]/=sum;
  }
  for(let i=0;i<count;i++){
    const p=i*sampleRate/targetRate,anchor=Math.floor(p);
    const phase=Math.min(phases-1,Math.round((p-anchor)*(phases-1)));
    const offset=phase*width;let l=0,r=0;
    for(let t=0;t<width;t++){
      const index=Math.max(0,Math.min(left.length-1,anchor+t-radius+1));
      const weight=kernels[offset+t];l+=left[index]*weight;r+=right[index]*weight;
    }
    outL[i]=l;outR[i]=r;
  }
  // Sinc interpolation may overshoot near discontinuities. Preserve stereo
  // balance and transient shape rather than hard clipping invalid loop samples.
  let peak=0;
  for(let i=0;i<count;i++)peak=Math.max(peak,Math.abs(outL[i]),Math.abs(outR[i]));
  if(!Number.isFinite(peak))throw Error('Resampled audio contains invalid samples.');
  if(peak>1){
    const gain=1/peak;
    for(let i=0;i<count;i++){outL[i]*=gain;outR[i]*=gain;}
  }
  return{sampleRate:targetRate,left:outL,right:outR};
}

