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
  async function tactics(){
    await click('Tactics');const menu=page.getByRole('dialog',{name:'Tactics',exact:true});await menu.getByRole('button',{name:'4-3-3',exact:true}).click();await menu.getByRole('button',{name:'Attacking',exact:true}).click();await menu.getByRole('button',{name:'Fast',exact:true}).click();await menu.getByRole('button',{name:'High',exact:true}).click();await menu.getByRole('button',{name:'Apply tactics',exact:true}).click();await expect(menu).toHaveCount(0);
  }
  async function substitute(){
    await click('Substitutions');const menu=page.getByRole('dialog',{name:'Substitutions',exact:true});
    await menu.getByRole('group',{name:'On the pitch',exact:true}).getByRole('button').filter({hasText:'DEF'}).first().click();
    await menu.getByRole('group',{name:'Match bench',exact:true}).locator('button:enabled').first().click();await click('Confirm substitution');
    await expect(menu.getByText('Changes: 1/5',{exact:true})).toBeVisible();await menu.getByRole('button',{name:'Close',exact:true}).click();
    await expect(page.getByRole('button',{name:'Play',exact:true})).toBeVisible();
  }
  await launch();
  try {
    // Synthetic standard-pad input verifies the adapter, not physical hardware.
    await page.evaluate(()=>{
      let button=-1;
      window.addEventListener('fcu-test-pad',event=>{button=(event as CustomEvent<number>).detail;});
      Object.defineProperty(navigator,'getGamepads',{configurable:true,value:()=>[{connected:true,mapping:'standard',buttons:Array.from({length:17},(_,i)=>({pressed:i===button})),axes:[0,0]}]});
      window.dispatchEvent(new Event('gamepadconnected'));
    });
    const pad=async(button:number)=>{await page.evaluate(value=>window.dispatchEvent(new CustomEvent('fcu-test-pad',{detail:value})),button);await page.clock.runFor(32);};
    await pad(13);await expect(page.getByRole('button',{name:'Load',exact:true})).toBeFocused();await pad(-1);await pad(0);await expect(page.getByRole('dialog',{name:'Saved careers'})).toBeVisible();await page.clock.runFor(1000);await expect(page.getByRole('dialog',{name:'Saved careers'})).toBeVisible();await pad(-1);await pad(1);await expect(page.getByRole('dialog')).toHaveCount(0);await pad(-1);
    await page.evaluate(()=>{delete (navigator as unknown as {getGamepads?:unknown}).getGamepads;window.dispatchEvent(new Event('gamepaddisconnected'));});
    await page.getByRole('button',{name:'Start a career',exact:true}).focus();
    await expect(page.getByRole('button',{name:'Start a career',exact:true})).toBeFocused();await page.keyboard.press('Enter');await page.getByRole('button',{name:'Begin career'}).click();await page.getByRole('button',{name:'Squad',exact:true}).click();
    await expect(page.getByRole('checkbox')).toHaveCount(22);const selected=page.getByRole('checkbox').filter({visible:true});
    const first=await selected.evaluateAll(nodes=>nodes.findIndex(n=>(n as HTMLInputElement).checked));await selected.nth(first).uncheck();await click('Confirm lineup');await expect(page.getByRole('status')).toContainText('eleven distinct');
    await click('Tactics');const pregame=page.getByRole('dialog',{name:'Tactics',exact:true});await pregame.getByRole('button',{name:'4-3-3',exact:true}).click();await pregame.getByRole('button',{name:'Save setup 1',exact:true}).click();await expect(pregame.getByRole('button',{name:'Use setup 1',exact:true})).toBeEnabled();await pregame.getByRole('button',{name:'4-4-2',exact:true}).click();await pregame.getByRole('button',{name:'Use setup 1',exact:true}).click();await expect(pregame.getByRole('button',{name:'4-3-3',exact:true})).toHaveAttribute('aria-pressed','true');await pregame.getByRole('button',{name:'Apply tactics',exact:true}).click();await expect(page.getByRole('checkbox',{checked:true})).toHaveCount(10);await click('Suggest lineup');await click('Confirm lineup');await click('Choose bench');const bench=page.getByRole('dialog',{name:'Choose bench',exact:true});await bench.getByRole('button',{pressed:true}).last().click();await expect(bench.getByRole('button',{name:'Confirm bench',exact:true})).toBeDisabled();await bench.getByRole('button',{pressed:false}).filter({hasText:'DEF'}).first().click();await click('Confirm bench');await click('Tactics');await page.keyboard.press('ArrowDown');await expect(page.getByRole('dialog')).toContainText('Saved tactical setups');await page.keyboard.press('Escape');await expect(page.getByRole('dialog')).toHaveCount(0);await expect(page.getByRole('button',{name:'Tactics',exact:true})).toBeFocused();await page.getByRole('button',{name:'Clubhouse'}).click();await page.getByRole('button',{name:'Kick off'}).click();
    await expect(page.locator('canvas')).toHaveCount(1);await expect(page.getByRole('group',{name:'Speed',exact:true})).toHaveCount(0);await expect(page.getByRole('button',{name:'Pixel art',exact:true})).toHaveCount(0);await expect(page.getByRole('button',{name:'Text',exact:true})).toHaveCount(0);await page.locator('summary').click();await save();const initialEntries=await entries();if(!initialEntries.ok)throw new Error();const checkpoint=initialEntries.value[0]!;
    // Finish the screen entrance animation before measuring highlight layout stability.
    await expect(page.locator('[class*=gameScreen]')).toHaveCSS('transform','none');const statistics=page.getByRole('region',{name:'Match statistics',exact:true});const statisticsBox=await statistics.boundingBox();const beforePreview=await latest();await click('Preview goal');await expect(page.getByText('Art preview - does not affect your match',{exact:true})).toBeVisible();await page.clock.runFor(3500);await page.screenshot({path:'work/match-pixel.png'});expect(await statistics.boundingBox()).toEqual(statisticsBox);await click('Skip highlight');expect(await statistics.boundingBox()).toEqual(statisticsBox);await save();const afterPreview=await latest();expect(canonical(afterPreview)).toBe(canonical(beforePreview));
    await expect(page.getByRole('button',{name:'Finish half',exact:true})).toHaveCount(0);await expect(page.getByRole('button',{name:'Next minute',exact:true})).toHaveCount(0);await click('Play');await expect(page.getByTestId('minute')).toHaveAttribute('data-tick','1');await page.clock.runFor(200);expect(await page.getByTestId('minute').textContent()).not.toBe('01:00');await click('Pause');const pausedClock=await page.getByTestId('minute').textContent();await page.clock.fastForward(20000);await expect(page.getByTestId('minute')).toHaveText(pausedClock!);await substitute();await tactics();await playUntil(1,45);await save();await app.close();
    await launch();await click('Load');await page.getByRole('dialog').getByRole('button',{name:'Load',exact:true}).first().click();await expect(page.getByTestId('minute')).toHaveText('45:00');await expect(page.getByRole('button',{name:'Skip highlight',exact:true})).toHaveCount(0);
    await playUntil(45,90);await save();const pixelState=await latest();expect(pixelState.presets[0]?.formation).toBe('4-3-3');expect(pixelState.match!.homeBench).toEqual(pixelState.bench);await click('Match report');const report=page.getByRole('dialog',{name:'Match report',exact:true});await expect(report).toContainText('Points earned');await expect(report).toContainText('League position');await page.screenshot({path:'work/result-report.png'});await page.keyboard.press('Escape');await expect(report).toHaveCount(0);
    await click('Load');
    // Pick the exact immutable checkpoint through the same public load operation, then its visible row.
    const saveList=await entries();if(!saveList.ok)throw new Error();const index=saveList.value.findIndex(e=>e.commitId===checkpoint.commitId);
    await page.getByRole('dialog').getByRole('button',{name:'Load',exact:true}).nth(index).click();await expect(page.getByTestId('minute')).toHaveText('00:00');
    // Missing Canvas leaves the same commentary-led match playable.
    await page.evaluate(()=>{HTMLCanvasElement.prototype.getContext=()=>null;});await page.locator('summary').click();await click('Preview goal');
    await expect(page.getByText('Highlights are unavailable. Live commentary continues.')).toBeVisible();await expect(page.locator('canvas')).toHaveCount(0);
    await playUntil(0,1);await click('Pause');await substitute();await tactics();await playUntil(1,45);await playUntil(45,90);await save();const textState=await latest();
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
