// Original short diatonic phrases. No sampled music or sounds from other games.
const melody = [64, 67, 71, 72, 71, 67, 64, 62, 60, 64, 67, 69, 67, 64, 62, 59,
  57, 60, 64, 67, 64, 60, 57, 59, 60, 64, 67, 71, 69, 67, 64, 62];
export function createGameAudio() {
  let context: AudioContext | null = null;
  let timer: ReturnType<typeof setTimeout> | null = null;
  let music = false;
  let effects = true;
  let step = 0;
  const live = new Set<OscillatorNode>();
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
  function stopNotes() {
    if (timer) clearTimeout(timer);
    timer = null;
    for (const note of live) { try { note.stop(); } catch { /* A completed note already stopped. */ } }
  }
  function visibility() { stopNotes(); if (!document.hidden && music) loop(); }
  document.addEventListener('visibilitychange', visibility);
  return {
    music(value: boolean) { music = value; stopNotes(); if (music) loop(); },
    effects(value: boolean) { effects = value; },
    click() { if (effects) tone(72, 0.055, 0.025, 'triangle'); },
    highlight(kind:'goal'|'save'|'shot') { if (effects) (kind==='goal'?[60,64,67,72]:kind==='save'?[67,72,79]:[64,60,55]).forEach((note,i)=>tone(note,.22,.035,kind==='shot'?'triangle':'square',i*.11)); },
    dispose() { music = false; stopNotes(); document.removeEventListener('visibilitychange', visibility); void context?.close(); }
  };
}
