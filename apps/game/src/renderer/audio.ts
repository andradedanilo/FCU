import type {HighlightKind} from '../../../../packages/presentation/src/highlights.ts';
// Original short diatonic phrases. No sampled music or sounds from other games.
const melody = [64, 67, 71, 72, 71, 67, 64, 62, 60, 64, 67, 69, 67, 64, 62, 59,
  57, 60, 64, 67, 64, 60, 57, 59, 60, 64, 67, 71, 69, 67, 64, 62];
export function createGameAudio() {
  let context: AudioContext | null = null;
  let timer: ReturnType<typeof setTimeout> | null = null;
  let ambientTimer:ReturnType<typeof setInterval>|null=null;
  let matchActive=false;
  let music = false;
  let effects = true;
  let step = 0;
  const live = new Set<AudioScheduledSourceNode>();
  function ready() {
    context ??= new AudioContext();
    if (context.state === 'suspended') void context.resume().catch(() => undefined);
    return context;
  }
  function tone(note: number, length: number, volume: number, type: OscillatorType, delay = 0) {
    if (document.hidden) return;
    const c = ready(); const at = c.currentTime + delay;
    const oscillator = c.createOscillator(); const gain = c.createGain();
    oscillator.type = type; oscillator.frequency.value = 440 * 2 ** ((note - 69) / 12);
    gain.gain.setValueAtTime(0, at); gain.gain.linearRampToValueAtTime(volume, at + 0.006);
    gain.gain.setValueAtTime(volume, at + length * 0.6); gain.gain.linearRampToValueAtTime(0, at + length);
    oscillator.connect(gain); gain.connect(c.destination); oscillator.start(at); oscillator.stop(at + length + 0.01);
    live.add(oscillator); oscillator.onended = () => { live.delete(oscillator); oscillator.disconnect(); gain.disconnect(); };
  }
  function loop() {
    if (!music || document.hidden) return;
    tone(melody[step % melody.length]!, 0.17, 0.022, 'square');
    if (step % 2 === 0) tone([40, 36, 33, 36][Math.floor(step / 8) % 4]!, 0.24, 0.055, 'triangle');
    step++; timer = setTimeout(loop, 225);
  }
  function noise(length:number,volume:number,frequency:number,rise=.04){
    if(document.hidden)return;
    const c=ready(),at=c.currentTime,buffer=c.createBuffer(1,Math.ceil(c.sampleRate*length),c.sampleRate);
    const samples=buffer.getChannelData(0);
    // Audio-only noise never draws from or influences the match random stream.
    for(let i=0;i<samples.length;i++)samples[i]=Math.random()*2-1;
    const source=c.createBufferSource(),filter=c.createBiquadFilter(),gain=c.createGain();
    source.buffer=buffer;filter.type='bandpass';filter.frequency.value=frequency;filter.Q.value=.65;
    gain.gain.setValueAtTime(0,at);gain.gain.linearRampToValueAtTime(volume,at+rise);gain.gain.exponentialRampToValueAtTime(.001,at+length);
    source.connect(filter);filter.connect(gain);gain.connect(c.destination);source.start();source.stop(at+length);
    live.add(source);source.onended=()=>{live.delete(source);source.disconnect();filter.disconnect();gain.disconnect();};
  }
  function crowd(volume:number,length:number){
    noise(length,volume,650,.25);noise(length,volume*.45,1600,.3);
    // Low, distant vowel-like voices under the crowd wash.
    tone(45,length*.65,volume*.035,'triangle');tone(50,length*.7,volume*.025,'triangle',.06);
  }
  function ambient(){
    if(ambientTimer)clearInterval(ambientTimer);ambientTimer=null;
    if(!matchActive||!effects||document.hidden)return;
    crowd(.018,2.7);ambientTimer=setInterval(()=>crowd(.018,2.7),2500);
  }
  function stopNotes() {
    if (timer) clearTimeout(timer);
    timer = null;
    for (const note of live) { try { note.stop(); } catch { /* A completed note already stopped. */ } }
  }
  function visibility() { stopNotes();ambient(); if (!document.hidden && music) loop(); }
  document.addEventListener('visibilitychange', visibility);
  return {
    music(value: boolean) { music = value; stopNotes(); if (music) loop(); },
    effects(value: boolean) { effects = value;if(!value){stopNotes();if(music)loop();}ambient(); },
    match(value:boolean){matchActive=value;ambient();},
    click() { if (effects) tone(72, 0.055, 0.025, 'triangle'); },
    highlight(kind:HighlightKind|'anticipation'|'kick'|'whistle') {
      if(!effects||document.hidden)return;
      if(kind==='kick'){noise(.1,.24,180);tone(35,.08,.09,'sine');}
      else if(['whistle','foul','yellow','red','halftime','lineup'].includes(kind)){tone(101,.18,.025,'sine');tone(103,.28,.018,'sine',.2);}
      else crowd(kind==='goal'||kind==='penaltyGoal'||kind==='win'?.28:kind==='save'?.2:kind==='shot'||kind==='penaltyMiss'?.11:.065,kind==='goal'||kind==='win'?1.8:1.1);
    },
    dispose() { music = false;matchActive=false;ambient(); stopNotes(); document.removeEventListener('visibilitychange', visibility); void context?.close(); }
  };
}
