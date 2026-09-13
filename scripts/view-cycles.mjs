import {_electron} from '@playwright/test';
import {mkdtemp} from 'node:fs/promises';import {tmpdir} from 'node:os';import {join} from 'node:path';
// Fixed v0.8 inspection workload: ten entry/exit cycles with the same saved Dream club.
const started=performance.now(),profile=await mkdtemp(join(tmpdir(),'fcu-view-cycles-'));
const app=await _electron.launch({args:['.'],env:{...process.env,FCU_USER_DATA:profile}});
try{
 const page=await app.firstWindow();page.setDefaultTimeout(8000);await page.context().setOffline(true);
 const click=name=>page.getByRole('button',{name,exact:true}).click();
 await click('FCU Dream Club');await click('Begin Dream Club');await page.getByRole('button',{name:'Play next fixture',exact:true}).waitFor();await click('Title screen');
 const reports=[];
 for(let cycle=1;cycle<=10;cycle++){
  await click('FCU Dream Club');await click('Load');await page.getByRole('button',{name:/^Dream FC \//}).first().click();await click('Play next fixture');
  await page.getByText('Art preview',{exact:true}).click();await click('Preview goal');
  await page.locator('img').evaluateAll(images=>Promise.all(images.map(img=>img.decode())));
  await click('Skip highlight');await click('Play');await click('Title screen');await page.getByRole('button',{name:'Start a career',exact:true}).waitFor();
  const metrics=await app.evaluate(({app})=>app.getAppMetrics().map(p=>({type:p.type,workingSetKB:p.memory.workingSetSize,privateKB:p.memory.privateBytes??null})));
  reports.push({cycle,processes:metrics,domNodes:await page.locator('*').count(),workingSetMB:Math.round(metrics.reduce((n,p)=>n+p.workingSetKB,0)/1024)});
 }
 await new Promise(resolve=>setTimeout(resolve,1000));const settled=await app.evaluate(({app})=>app.getAppMetrics().map(p=>({type:p.type,workingSetKB:p.memory.workingSetSize,privateKB:p.memory.privateBytes??null})));
 console.log(JSON.stringify({settled,workload:'ten Dream match views, seed 2026, same checkpoint, goal-art load and live-play exit',reports,seconds:(performance.now()-started)/1000}));
}finally{await app.close();}