import { test, expect, _electron as electron, type ElectronApplication, type Page } from '@playwright/test';
import { mkdtemp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { canonical } from '../packages/contracts/src/index.ts';
test('offline career, lineup, commentary clock, highlight recovery and full exhibition season',async()=>{
  const data=await mkdtemp(join(tmpdir(),'fcu-e2e-'));
  let app!:ElectronApplication;
  let page!:Page;
  const errors:string[]=[];
  async function launch(){app=await electron.launch({args:['.'],timeout:15000,env:{...process.env,FCU_USER_DATA:data}});page=await app.firstWindow();page.on('pageerror',e=>errors.push(e.message));await page.context().setOffline(true);await page.clock.install({time:new Date(0)});await page.clock.pauseAt(new Date(1000));}
  const click=async(name:string)=>page.getByRole('button',{name,exact:true}).click();
  const save=async()=>{await click('Save');await expect(page.getByRole('status')).toHaveText('Saved to disk.');};
  const entries=()=>page.evaluate(()=>window.fcu.list());
  const latest=async()=>{const list=await entries();if(!list.ok)throw new Error(list.error);const entry=list.value[0]!;const result=await page.evaluate(e=>window.fcu.load(e.careerId,e.commitId),entry);if(!result.ok)throw new Error(result.error);return result.value;};
  async function playUntil(from:number,to:number){
    await click(from===45?'Continue':'Play');
    // Advance the presentation clock only; every minute still goes through the real worker.
    for(let minute=from+1;minute<=to;minute++){
      if(minute>from+1)await page.clock.fastForward(6001);
      await expect(page.getByTestId('minute')).toHaveAttribute('data-tick',String(minute));
      if(minute!==90)await expect(page.getByRole('button',{name:minute===to&&to===45?'Continue':'Pause',exact:true})).toBeEnabled();
    }
  }
  await launch();
  try {
    await page.getByRole('button',{name:'Start a career'}).click();await page.getByRole('button',{name:'Begin career'}).click();await page.getByRole('button',{name:'Squad',exact:true}).click();
    await expect(page.getByRole('checkbox')).toHaveCount(22);const selected=page.getByRole('checkbox').filter({visible:true});
    const first=await selected.evaluateAll(nodes=>nodes.findIndex(n=>(n as HTMLInputElement).checked));await selected.nth(first).uncheck();await click('Confirm lineup');await expect(page.getByRole('status')).toContainText('eleven distinct');
    await click('Suggest 4-4-2');await click('Confirm lineup');await page.getByRole('button',{name:'Clubhouse'}).click();await page.getByRole('button',{name:'Kick off'}).click();
    await expect(page.locator('canvas')).toHaveCount(0);await expect(page.getByRole('group',{name:'Speed',exact:true})).toHaveCount(0);await expect(page.getByRole('button',{name:'Pixel art',exact:true})).toHaveCount(0);await expect(page.getByRole('button',{name:'Text',exact:true})).toHaveCount(0);await page.locator('summary').click();await save();const initialEntries=await entries();if(!initialEntries.ok)throw new Error();const checkpoint=initialEntries.value[0]!;
    // Finish the screen entrance animation before measuring highlight layout stability.
    await expect(page.locator('[class*=gameScreen]')).toHaveCSS('transform','none');const statistics=page.getByRole('region',{name:'Match statistics',exact:true});const statisticsBox=await statistics.boundingBox();const beforePreview=await latest();await click('Preview goal');await expect(page.getByText('Art preview - does not affect your match',{exact:true})).toBeVisible();await page.clock.runFor(3500);await page.screenshot({path:'work/match-pixel.png'});expect(await statistics.boundingBox()).toEqual(statisticsBox);await click('Skip highlight');expect(await statistics.boundingBox()).toEqual(statisticsBox);await save();const afterPreview=await latest();expect(canonical(afterPreview)).toBe(canonical(beforePreview));
    await expect(page.getByRole('button',{name:'Finish half',exact:true})).toHaveCount(0);await expect(page.getByRole('button',{name:'Next minute',exact:true})).toHaveCount(0);await click('Play');await expect(page.getByTestId('minute')).toHaveAttribute('data-tick','1');await page.clock.runFor(200);expect(await page.getByTestId('minute').textContent()).not.toBe('01:00');await click('Pause');const pausedClock=await page.getByTestId('minute').textContent();await page.clock.fastForward(20000);await expect(page.getByTestId('minute')).toHaveText(pausedClock!);await playUntil(1,45);await save();await app.close();
    await launch();await click('Load');await page.getByRole('dialog').getByRole('button',{name:'Load',exact:true}).first().click();await expect(page.getByTestId('minute')).toHaveText('45:00');await expect(page.getByRole('button',{name:'Skip highlight',exact:true})).toHaveCount(0);
    await playUntil(45,90);await save();const pixelState=await latest();
    await click('Load');
    // Pick the exact immutable checkpoint through the same public load operation, then its visible row.
    const saveList=await entries();if(!saveList.ok)throw new Error();const index=saveList.value.findIndex(e=>e.commitId===checkpoint.commitId);
    await page.getByRole('dialog').getByRole('button',{name:'Load',exact:true}).nth(index).click();await expect(page.getByTestId('minute')).toHaveText('00:00');
    // Missing Canvas leaves the same commentary-led match playable.
    await page.evaluate(()=>{HTMLCanvasElement.prototype.getContext=()=>null;});await page.locator('summary').click();await click('Preview goal');
    await expect(page.getByText('Highlights are unavailable. Live commentary continues.')).toBeVisible();await expect(page.locator('canvas')).toHaveCount(0);
    await playUntil(0,45);await playUntil(45,90);await save();const textState=await latest();
    expect(canonical(textState.match)).toBe(canonical(pixelState.match));expect(canonical(textState.fixtures)).toBe(canonical(pixelState.fixtures));
    await page.getByRole('button',{name:'Continue',exact:false}).click();
    // One bounded full-season user journey, 13 remaining fixtures.
    for(let round=1;round<14;round++){
      await page.getByRole('button',{name:'Kick off'}).click();if(round===1){await page.getByRole('checkbox',{name:'Continue through half-time'}).check();await playUntil(0,90);await page.getByRole('button',{name:'Continue',exact:false}).click();continue;}await page.getByRole('checkbox',{name:'Continue through half-time'}).uncheck();await playUntil(0,45);await playUntil(45,90);await page.getByRole('button',{name:'Continue',exact:false}).click();
    }
    await expect(page.getByText('Season complete',{exact:true})).toBeVisible();await page.getByRole('button',{name:'League table',exact:true}).click();await expect(page.locator('tbody tr')).toHaveCount(8);expect((await latest()).round).toBe(14);expect(errors).toEqual([]);
    await page.screenshot({path:'work/season-table.png'});
  }finally{await app!.close();}
});
