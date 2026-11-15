import os,json,wave
os.environ.setdefault('MPLCONFIGDIR','/tmp/phase4-matplotlib')
import numpy as np
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
r=json.load(open('public/listening/audio/phase4/preset-report.json'));rate=r['rate'];rows=[]
fig,axes=plt.subplots(2,1,figsize=(13,8),layout='constrained')
for entry in r['rows'][:10]:
 with wave.open('public/listening/audio/phase4/preset-'+entry['id']+'-raw.wav','rb')as f:b=np.frombuffer(f.readframes(f.getnframes()),np.uint8).reshape(-1,2,3).astype(np.int32)
 x=((b[:,:,0]|b[:,:,1]<<8|b[:,:,2]<<16)^(1<<23))-(1<<23);x=x/8388608.;mono=x.mean(axis=1);size=4096;freq=np.fft.rfftfreq(size,1/rate);spectra=[]
 for at in range(0,len(mono)-size,size*2):spectra.append(np.abs(np.fft.rfft(mono[at:at+size]*np.hanning(size)))**2)
 spectrum=np.mean(spectra,axis=0);total=spectrum.sum();centroid=float((spectrum*freq).sum()/max(total,1e-30));bands={name:float(spectrum[(freq>=lo)&(freq<hi)].sum()/max(total,1e-30))for name,lo,hi in [('sub',0,80),('low',80,500),('mid',500,3000),('high',3000,12001)]}
 perWindow=[float((s*freq).sum()/max(s.sum(),1e-30))for s in spectra];rows.append({'id':entry['id'],'spectralCentroidHz':centroid,'centroidStdHz':float(np.std(perWindow)),'bandPowerFraction':bands})
 axes[0].plot([t['seconds']for t in entry['timeline']],[20*np.log10(max(t['rms'],1e-8))for t in entry['timeline']],label=entry['name'])
 axes[1].semilogx(freq[1:],10*np.log10(np.maximum(spectrum[1:]/max(total,1e-30),1e-14)),label=entry['name'])
axes[0].set(xlabel='Seconds',ylabel='Raw stereo RMS / dBFS',title='Ten different raw dynamic environments',ylim=(-100,-15));axes[0].legend(fontsize=7,ncol=3)
axes[1].set(xlabel='Hz',ylabel='Relative band-bin power / dB',title='Welch-style spectral profiles (not loudness normalization)',xlim=(30,12000),ylim=(-100,-5))
for ax in axes:ax.grid(alpha=.2)
fig.savefig('docs/phase4/preset-profiles.png',dpi=130)
json.dump({'rate':rate,'method':'4096-point Hann-windowed power spectra, non-overlapping sampled windows at 8192-frame spacing. Bands normalized to each own total spectral power; no judgement of musical identity from centroid alone. Raw output PCM24.','rows':rows},open('docs/phase4/preset-spectra.json','w'),indent=2)
print('Analyzed ten60s renders; see plots and metrics. Human audition unverified.')
