import {execFileSync} from 'node:child_process';
import {resolve} from 'node:path';
import {z} from 'zod';
// Discover both runners' registered cases without executing test bodies.
export function checkTestBudget(){
 if(process.env.FCU_TEST_DISCOVERY==='1')return;
 const env:NodeJS.ProcessEnv={...process.env,FCU_TEST_DISCOVERY:'1'};delete env.NO_COLOR;
 const discover=(script:string,args:string[])=>JSON.parse(execFileSync(process.execPath,[script,...args],{encoding:'utf8',env,timeout:15000,windowsHide:true}));
 const units=z.array(z.object({name:z.string(),file:z.string()})).parse(discover('node_modules/vitest/vitest.mjs',['list','--json']));
 const desktop=z.object({suites:z.array(z.unknown()),errors:z.array(z.unknown())}).parse(discover('node_modules/@playwright/test/cli.js',['test','--list','--reporter=json']));
 if(desktop.errors.length)throw Error('Electron test discovery failed.');
 const files=new Set(units.map(t=>resolve(t.file)));let journeys=0;
 const suiteSchema=z.object({specs:z.array(z.object({file:z.string(),tests:z.array(z.unknown())})).default([]),suites:z.array(z.unknown()).default([])});
 function count(raw:unknown){const suite=suiteSchema.parse(raw);for(const spec of suite.specs){files.add(resolve('tests',spec.file));journeys+=spec.tests.length;}suite.suites.forEach(count);}
 desktop.suites.forEach(count);const total=units.length+journeys;
 if(!units.length||!journeys||total>65||files.size>12||journeys>3)throw Error(`v0.4 test budget exceeded or discovery empty: ${total} cases / ${files.size} files / ${journeys} Electron journeys.`);
 console.log(`Test budget: ${total}/65 registered cases, ${files.size}/12 files, ${journeys}/3 Electron journeys.`);
}
