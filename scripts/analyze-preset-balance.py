"""Stereo-summed spectra and A-weighted RMS are proxies, never LUFS/listening."""
import os,json,wave,sys
os.environ.setdefault('MPLCONFIGDIR','/tmp/phase5-matplotlib')
import numpy as np
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
label=sys.argv[1] if len(sys.argv)>1 else 'v020';root='public/listening/audio/phase5/'
r=json.load(open(root+'balance-'+label+'.json'));rate=r['rate'];rows=[]
for entry in r['rows']:
 if entry['seconds']!=60:continue
 name=f"balance-{entry['id']}-60s-{label}-raw.wav"
 with wave.open(root+name,'rb')as f:b=np.frombuffer(f.readframes(f.getnframes()),np.uint8).reshape(-1,2,3).astype(np.int32)
 x=((b[:,:,0]|b[:,:,1]<<8|b[:,:,2]<<16)^(1<<23))-(1<<23);x=x/8388608.;size=4096;freq=np.fft.rfftfreq(size,1/rate);spectrum=np.zeros(len(freq))
 for at in range(0,len(x)-size,size*2):spectrum+=np.mean(np.abs(np.fft.rfft(x[at:at+size]*np.hanning(size)[:,None],axis=0))**2,axis=1)
 total=spectrum.sum();bands={name:float(spectrum[(freq>=lo)&(freq<hi)].sum()/max(total,1e-30))for name,lo,hi in [('sub40',0,40),('sub80',0,80),('low',80,500),('mid',500,3000),('high',3000,12001)]}
 f=np.fft.rfftfreq(len(x),1/rate);f2=f*f;ra=12200**2*f2*f2/((f2+20.6**2)*np.sqrt((f2+107.7**2)*(f2+737.9**2))*(f2+12200**2));weight=ra*10**(2/20)
 transformed=np.fft.rfft(x,axis=0);weighted=np.fft.irfft(transformed*weight[:,None],n=len(x),axis=0);aRms=float(np.sqrt(np.mean(weighted*weighted)))
 audible=np.fft.irfft(transformed*((f>=120)&(f<=8000))[:,None],n=len(x),axis=0);bandRms=float(np.sqrt(np.mean(audible*audible)))
 durations=[s['end']-s['start']for s in entry['audibleSpans']];gaps=[b['start']-a['end']for a,b in zip(entry['audibleSpans'],entry['audibleSpans'][1:])]
 rows.append({'id':entry['id'],'label':label,'spectralCentroidHz':float((spectrum*freq).sum()/max(total,1e-30)),'bandPowerFraction':bands,'aWeightedRms':aRms,'rms120to8000Hz':bandRms,'medianActiveSpanSeconds':float(np.median(durations))if durations else None,'medianGapSeconds':float(np.median(gaps))if gaps else None})
path='docs/phase5/baseline/spectra.json'if label=='v020'else'docs/phase5/candidate-spectra.json'
report={'label':label,'rate':rate,'method':'Mean stereo-channel power spectra, 4096 Hann window every8192frames; unlike Phase4 mono-sum spectrum, preserves side energy. A-weighted RMS uses the standard analogue A curve in a full-file FFT and is explicitly not LUFS or a perceived-loudness certification. 120–8000Hz band RMS is a spectral proxy, not a phone-speaker model. Sample peak only; true peak was not measured. Quiet/active spans use the same20ms1e−4 gate as raw metrics. PCM24 files introduce a quantization floor.' ,'rows':rows}
if label=='v020'and os.path.exists(path):
 old=json.load(open(path));assert old['rows']==rows,'Baseline analysis changed; preserve the original evidence'
else:json.dump(report,open(path,'w'),indent=2)
for x in rows:print(x['id'],'sub80',round(x['bandPowerFraction']['sub80'],3),'A-rms',round(x['aWeightedRms'],6),'span',x['medianActiveSpanSeconds'])
