import { DSPModule, TAU, clamp } from '../DSPModule';
interface Voice { carrier: number; mod: number; second: number; amplitude: number; envelope: number; frequency: number; feedback: number; pan: number }
export class Alloy extends DSPModule {
  private readonly voices: Voice[] = Array.from({length:4}, (_,i) => ({carrier:0,mod:0,second:0,amplitude:0,envelope:0,frequency:110,feedback:0,pan:(i-1.5)*.13}));
  private gate = false;
  process(sample: number) {
    const body = this.control(0,2), tension = this.control(1,3);
    const trigger = this.inputL[0] > .5;
    if (trigger && !this.gate) {
      let voice = this.voices[0]; for (let i = 1; i < 4; i++) if (this.voices[i].amplitude < voice.amplitude) voice = this.voices[i];
      voice.frequency = Math.min(this.sampleRate*.45,110 * Math.pow(2, clamp(this.inputL[1]) * (this.wide?8:2)));
      voice.amplitude = 1; // Oscillator phase and envelope stay continuous when a voice is stolen.
      this.triggerSample = sample;
    }
    this.gate = trigger;
    const rough = this.character === 'ROUGH', soft = this.character === 'SOFT';
    const ratio = soft ? 1.5 + tension * .27 : rough ? 3.731 + tension * .62 : 2.4142 + tension * tension * .43;
    const index = (.18 + tension * tension * (rough ? 13 : soft ? 4 : 9)) * (.48 + body * .72);
    const decay = 1 - 6.9 / (this.sampleRate * (.24 + body * body * 9));
    let left = 0, right = 0, envelope = 0;
    for (let i = 0; i < 4; i++) {
      const v = this.voices[i]; if (v.amplitude < .000001 && v.envelope < .000001) continue;
      v.amplitude *= decay;
      v.envelope += (v.amplitude - v.envelope) * (v.amplitude > v.envelope ? .025 : .005);
      v.carrier = (v.carrier + v.frequency / this.sampleRate) % 1;
      v.mod = (v.mod + v.frequency * ratio / this.sampleRate) % 1;
      v.second = (v.second + v.frequency * (rough ? 1.917 : 1.003 + tension * .39) / this.sampleRate) % 1;
      const modulation = Math.sin(TAU * v.mod + Math.tanh(v.feedback) * (rough ? .33 : .12));
      v.feedback = modulation;
      const spectral = Math.pow(v.envelope, .3 + tension * .8);
      const signal = (Math.sin(TAU * v.carrier + modulation * index * spectral + Math.sin(TAU * v.second) * tension * .6) * .83 + Math.sin(TAU * v.carrier * .5) * body * .17) * v.envelope * .2;
      left += signal * (1 - v.pan); right += signal * (1 + v.pan); envelope = Math.max(envelope, v.envelope);
    }
    this.envelope = envelope; this.a = body; this.b = tension; this.phase = this.voices[0].carrier;
    this.outputL[0] = left; this.outputR[0] = right;
  }
}
