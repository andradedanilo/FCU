import type { CSSProperties } from 'react';
import { brand } from '../../../../packages/contracts/src/index.ts';
import s from './App.module.css';
export function ClubBadge({color,short}:{color:string;short:string}) {
  return <span className={s.badge} style={{'--club-color':color} as CSSProperties} aria-hidden="true"><i/><b>{short}</b><em>XI</em></span>;
}
export function Shirt({color}:{color:string}) {
  return <svg viewBox="0 0 160 160" className={s.shirt} aria-hidden="true" shapeRendering="crispEdges">
    <path fill="#070f26" d="M48 10H112V18H128V26H144V42H152V74H120V146H40V74H8V42H16V26H32V18H48Z"/>
    <path fill={color} d="M48 18H112V26H128V34H136V66H112V138H48V66H24V34H32V26H48Z"/>
    <path fill="#ffedbe" d="M56 18H104V26H96V34H64V26H56ZM24 58H48V66H24ZM112 58H136V66H112Z"/>
    <path fill="#ffffff" opacity=".15" d="M52 36H66V132H52ZM92 36H106V132H92Z"/>
    <path fill="#ffedbe" d="M88 42H102V60H96V66H94V60H88Z"/>
    <text x="80" y="101" textAnchor="middle" fontSize="20" fontWeight="900" fontFamily="monospace" fill="#fff7de">{brand.short}</text>
  </svg>;
}
export function StadiumArt() {
  return <svg className={s.stadiumArt} viewBox="0 0 960 400" preserveAspectRatio="xMidYMax slice" aria-hidden="true" shapeRendering="crispEdges">
    <path fill="#403b70" d="M0 180H30V120H80V165H120V110H160V170H220V130H270V175H340V140H400V175H520V120H580V170H640V135H720V160H780V115H830V175H900V130H960V400H0Z"/>
    <path fill="#161f42" d="M0 230L160 160H800L960 230V400H0Z"/>
    <path fill="#637296" d="M55 230L175 177H785L905 230V246H55Z"/>
    <path fill="#d9ad77" d="M87 226H873V234H87Z"/><path fill="#274164" d="M96 244H864V267H96Z"/>
    {Array.from({length:48},(_,i)=><g key={i} fill={['#dba060','#839acd','#b25057','#e5cc8b'][i%4]}><path d={`M${102+i*16} 242h6v6h-6zM${108+i*16} 258h6v6h-6z`}/></g>)}
    <path fill="#163f46" d="M130 280H830L960 400H0Z"/><path fill="#26614e" d="M195 290H765L895 400H65Z"/>
    <path fill="none" stroke="#8eae78" strokeWidth="3" d="M204 300H756L860 388H100ZM480 300V388M435 338H525V360H435Z"/>
    {[90,850].map(x=><g key={x}><path fill="#a4bad3" d={`M${x} 90h8v174h-8zM${x-23} 83h56v26h-56z`}/><path fill="#fff0b9" d={`M${x-18} 88h11v15h-11zM${x-2} 88h11v15h-11zM${x+14} 88h11v15h-11z`}/></g>)}
  </svg>;
}
