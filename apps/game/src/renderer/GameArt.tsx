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
