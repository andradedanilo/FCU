import type {HighlightFrame} from '../../../../packages/presentation/src/highlights.ts';

// Original illustrative cast; event captions carry the actual club/player identity.
export const highlightArt:Record<HighlightFrame,string>={
  prepare:new URL('./assets/highlights/prepare.png',import.meta.url).href,
  goal:new URL('./assets/highlights/goal.png',import.meta.url).href,
  save:new URL('./assets/highlights/save.png',import.meta.url).href,
  shot:new URL('./assets/highlights/miss.png',import.meta.url).href,
};
