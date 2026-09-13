import type {Player,Role} from '../../contracts/src/index.ts';
export function overall(p:Player):number{return roleRating(p,p.role);}
function roleRating(p:Player,role:Role):number {
  if (role === 'GK') return Math.round((70*p.goalkeeping+15*p.passing+15*p.stamina)/100);
  if (role === 'DEF') return Math.round((60*p.tackling+20*p.pace+20*p.passing)/100);
  if (role === 'MID') return Math.round((60*p.passing+20*p.stamina+20*p.tackling)/100);
  return Math.round((60*p.shooting+20*p.pace+20*p.passing)/100);
}
export function naturalRole(p:Player,role:Role):boolean{return p.role===role||(p.secondaryRoles??[]).includes(role);}
export function effectiveRating(p:Player,role:Role=p.role):number {
 return Math.round(roleRating(p,role)*(.75+p.condition/400000)*(.90+p.morale/500)*(naturalRole(p,role)?1:.8)*100)/100;
}
