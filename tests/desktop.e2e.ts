import { test, expect, _electron as electron, type ElectronApplication, type Page } from '@playwright/test';
import { mkdtemp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { canonical } from '../packages/contracts/src/index.ts';
test('offline career, lineup, text/3D equivalence, WebGL recovery and full exhibition season',async()=>{
  const data=await mkdtemp(join(tmpdir(),'fcu-e2e-'));
  let app!:ElectronApplication;
  let page!:Page;
  const errors:string[]=[];
  async function launch(){app=await electron.launch({args:['.'],timeout:15000,env:{...process.env,FCU_USER_DATA:data}});page=await app.firstWindow();page.on('pageerror',e=>errors.push(e.message));await page.context().setOffline(true);}
  const click=async(name:string)=>page.getByRole('button',{name,exact:true}).click();
  const save=async()=>{await click('Save');await expect(page.getByRole('status')).toHaveText('Saved to disk.');};
  const entries=()=>page.evaluate(()=>window.fcu.list());
  const latest=async()=>{const list=await entries();if(!list.ok)throw new Error(list.error);const entry=list.value[0]!;const result=await page.evaluate(e=>window.fcu.load(e.careerId,e.commitId),entry);if(!result.ok)throw new Error(result.error);return result.value;};
  await launch();
  try {
    await page.getByRole('button',{name:'Begin career'}).click();await page.getByRole('button',{name:'02Squad'}).click();
    await expect(page.getByRole('checkbox')).toHaveCount(22);const selected=page.getByRole('checkbox').filter({visible:true});
    const first=await selected.evaluateAll(nodes=>nodes.findIndex(n=>(n as HTMLInputElement).checked));await selected.nth(first).uncheck();await click('Confirm lineup');await expect(page.getByRole('status')).toContainText('eleven distinct');
    await click('Suggest 4-4-2');await click('Confirm lineup');await page.getByRole('button',{name:'01Home'}).click();await page.getByRole('button',{name:'Kick off'}).click();
    await expect(page.locator('canvas')).toHaveCount(1);await save();const initialEntries=await entries();if(!initialEntries.ok)throw new Error();const checkpoint=initialEntries.value[0]!;
    await page.screenshot({path:'work/match-3d.png'});
    await click('Finish half');await expect(page.getByTestId('minute')).toHaveText('Half-time');await save();await app.close();
    await launch();await click('Load');await page.getByRole('dialog').getByRole('button',{name:'Load',exact:true}).first().click();await expect(page.getByTestId('minute')).toHaveText('Half-time');
    await click('Finish half');await expect(page.getByTestId('minute')).toHaveText('Full time');await save();const threeState=await latest();
    await click('Load');
    // Pick the exact immutable checkpoint through the same public load operation, then its visible row.
    const saveList=await entries();if(!saveList.ok)throw new Error();const index=saveList.value.findIndex(e=>e.commitId===checkpoint.commitId);
    await page.getByRole('dialog').getByRole('button',{name:'Load',exact:true}).nth(index).click();await expect(page.getByTestId('minute')).toHaveText("0'");
    await click('Text');await click('Finish half');await expect(page.getByTestId('minute')).toHaveText('Half-time');await click('Finish half');await expect(page.getByTestId('minute')).toHaveText('Full time');await save();const textState=await latest();
    expect(canonical(textState.match)).toBe(canonical(threeState.match));expect(canonical(textState.fixtures)).toBe(canonical(threeState.fixtures));
    await click('3D');await expect(page.locator('canvas')).toHaveCount(1);
    await page.locator('canvas').evaluate(canvas=>{const context=(canvas as HTMLCanvasElement).getContext('webgl2');const extension=context?.getExtension('WEBGL_lose_context');if(!extension)throw new Error('No real context-loss extension');extension.loseContext();});
    await expect(page.getByText('3D is unavailable. Text play remains available and your career is unchanged.')).toBeVisible();await expect(page.locator('canvas')).toHaveCount(0);
    await click('Continue →');
    // One bounded full-season user journey, 13 remaining fixtures.
    for(let round=1;round<14;round++){
      await page.getByRole('button',{name:'Kick off'}).click();await click('Text');await click('Finish half');await expect(page.getByTestId('minute')).toHaveText('Half-time');await click('Finish half');await expect(page.getByTestId('minute')).toHaveText('Full time');await click('Continue →');
    }
    await expect(page.getByText('Season complete',{exact:true})).toBeVisible();await page.getByRole('button',{name:'03League table'}).click();await expect(page.locator('tbody tr')).toHaveCount(8);expect((await latest()).round).toBe(14);expect(errors).toEqual([]);
    await page.screenshot({path:'work/season-table.png'});
  }finally{await app!.close();}
});
