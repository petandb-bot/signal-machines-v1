"""Offline spectral evidence; requires NumPy, never imported by the application."""
import json,wave
from pathlib import Path
import numpy as np
root=Path('public/listening/audio/living-character');rows=[]
for path in sorted(root.glob('*-raw.wav')):
 with wave.open(str(path)) as w:rate=w.getframerate();audio=np.frombuffer(w.readframes(w.getnframes()),dtype='<i2').reshape(-1,2).astype(float)/32768
 n=8192;hann=np.hanning(n);indices=np.linspace(rate,min(len(audio)-n,rate*119),24).astype(int);previous=None;frames=[]
 for start in indices:
  mono=audio[start:start+n].mean(axis=1);power=np.abs(np.fft.rfft(mono*hann))**2;freq=np.fft.rfftfreq(n,1/rate);total=float(power.sum());unit=power/max(total,1e-30)
  frames.append({'seconds':float(start/rate),'centroidHz':float((freq*power).sum()/max(total,1e-30)),'upperBandEnergyFraction':float(power[freq>rate*.42].sum()/max(total,1e-30)),'spectralFlux':None if previous is None else float(np.abs(unit-previous).sum()),'monoRms':float(np.sqrt(np.mean(mono**2)))})
  previous=unit
 l=audio[:,0];r=audio[:,1];rows.append({'file':path.name,'rate':rate,'correlation':float(np.dot(l,r)/np.sqrt(np.dot(l,l)*np.dot(r,r))),'frames':frames})
Path('docs/dsp-character/spectrum.json').write_text(json.dumps({'method':'8192-sample Hann FFT; 24 windows; normalized-power L1 flux. Upper-band energy is NOT an alias measurement. PCM16 exports limit the floor; apparent zero is not proof of no aliasing. Human listening unverified.','rows':rows},indent=2)+'\n')
