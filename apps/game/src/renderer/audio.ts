import type {HighlightKind} from '../../../../packages/presentation/src/highlights.ts';
import {audioAssets} from './audioAssets.ts';

export function createGameAudio() {
  let ambience:HTMLAudioElement|null=null;
  let musicClip:HTMLAudioElement|null=null;
  let matchActive=false,suspended=false,music=false,effects=true;
  const clips=new Set<HTMLAudioElement>();
  const hidden=()=>document.hidden||suspended;
  function sample(name:keyof typeof audioAssets,volume:number){
    if(hidden()||!effects)return;
    const clip=new Audio(audioAssets[name].url);clip.volume=volume;clip.playbackRate=1;clips.add(clip);
    const release=()=>{clip.pause();clips.delete(clip);};
    clip.onended=release;clip.onerror=release;void clip.play().catch(release);
    return clip;
  }
  function ambient(){
    if(ambience){ambience.pause();clips.delete(ambience);ambience=null;}
    if(!matchActive||!effects||hidden())return;
    ambience=sample('crowd',.13)??null;if(ambience)ambience.loop=true;
  }
  function syncMusic(){
    if(musicClip){musicClip.pause();musicClip=null;}
    if(!music||hidden())return;
    const clip=new Audio(audioAssets.music.url);musicClip=clip;
    clip.volume=1;clip.playbackRate=1;clip.loop=true;
    const release=()=>{clip.pause();if(musicClip===clip)musicClip=null;};
    clip.onerror=release;void clip.play().catch(release);
  }
  function stopEffects(){for(const clip of clips)clip.pause();clips.clear();ambience=null;}
  function visibility(){stopEffects();ambient();syncMusic();}
  document.addEventListener('visibilitychange',visibility);
  return {
    suspend(value:boolean){suspended=value;visibility();},
    music(value:boolean){music=value;syncMusic();},
    effects(value:boolean){effects=value;if(!value)stopEffects();ambient();},
    match(value:boolean){matchActive=value;ambient();},
    click(){sample('click',1);},
    highlight(kind:HighlightKind|'anticipation'|'kick'|'whistle'|'tackle'){
      if(!effects||hidden())return;
      if(kind==='kick')sample('kick',.7);
      else if(kind==='tackle')sample('tackle',.65);
      else if(['offside','disallowedOffside','disallowedFoul','corner','whistle','foul','yellow','red','halftime','lineup'].includes(kind))sample('whistle',.22);
      else if(kind!=='anticipation'&&kind!=='injury'&&kind!=='coach')sample(kind==='save'||kind==='post'||kind==='shot'||kind==='penaltyMiss'?'groan':'cheer',.6);
    },
    dispose(){music=false;matchActive=false;stopEffects();syncMusic();document.removeEventListener('visibilitychange',visibility);}
  };
}
