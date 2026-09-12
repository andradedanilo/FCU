// Mulberry32: saved uint32 state; each draw advances by 0x6d2b79f5.
export function draw(state: number): [number, number] {
  const next = (state + 0x6d2b79f5) >>> 0;
  let t = Math.imul(next ^ (next >>> 15), next | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return [next, ((t ^ (t >>> 14)) >>> 0)];
}
export function stream(seed: number, key: string): number {
  let hash = (2166136261 ^ seed) >>> 0;
  for (let i = 0; i < key.length; i++) hash = Math.imul(hash ^ key.charCodeAt(i), 16777619) >>> 0;
  return hash;
}
