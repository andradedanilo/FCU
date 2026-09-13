import {selectionPlayers} from '../packages/simulation/src/discipline.ts';
// Fixed seed 2026: one complete country league season through the command boundary.
import {createCareer,applyCommand,autoPick,validateCareer} from '../packages/simulation/src/engine.ts';import {nextFixtureDate} from '../packages/simulation/src/calendar.ts';import {seasonEnd,nextManagedFixture} from '../packages/simulation/src/competition.ts';
let s=createCareer('00000000-0000-4000-8000-000000000002',2026,'club-01' as import('../packages/contracts/src/index.ts').ClubId,'countries');type Action<T>=T extends import('../packages/contracts/src/index.ts').Command?Omit<T,'careerId'|'commandId'|'expectedRevision'>:never;
// Keep the competition workload independent of the separately checked dismissal flow.
s.board.assisted=true;
function act(a:Action<import('../packages/contracts/src/index.ts').Command>){const r=applyCommand(s,{...a,careerId:s.careerId,expectedRevision:s.revision,commandId:crypto.randomUUID()});if(!r.ok)throw Error(`${a.type} ${s.date} ${r.error}`);s=r.value;}
while(nextManagedFixture(s)){while(s.date!==nextFixtureDate(s))act({type:'AdvanceCalendar',target:'event'});act({type:'SelectLineup',lineup:autoPick(selectionPlayers(s),s.clubId,s.tactics.formation,s.date)});act({type:'StartMatch'});while(s.match!.phase!=='finished'){if(s.match!.pendingDismissal||s.match!.pendingInjuries.length)act({type:'AcknowledgeMatch'});act({type:'AdvanceMatch',minutes:90});}}
while(s.date<seasonEnd(s.season))act({type:'AdvanceCalendar',target:'event'});validateCareer(s);process.stdout.write(JSON.stringify(s));
