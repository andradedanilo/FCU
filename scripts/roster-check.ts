import {fictionalCandidate} from '../packages/roster-pipeline/src/fictional.ts';
import {candidate} from '../packages/roster-pipeline/src/review.ts';

const input=fictionalCandidate(true);
const result=candidate(input.roster,input.audit);
if(!result.ok){console.error(result.issues);process.exitCode=1;}
else console.log(JSON.stringify({mode:'Synthetic fixture audit only; not a live provider fetch or release approval',competitions:result.roster.competitions.length,teams:result.roster.teams.length,players:result.roster.players.length,contentHash:result.contentHash},null,2));
