import { test, expect, _electron as electron, type ElectronApplication, type Page } from '@playwright/test';
import { mkdtemp,rename,writeFile,unlink } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join,dirname,resolve } from 'node:path';
import { canonical } from '../packages/contracts/src/index.ts';
test('offline career, lineup, commentary clock, highlight recovery and full exhibition season',async()=>{
  const data=await mkdtemp(join(tmpdir(),'fcu-e2e-'));
  let app!:ElectronApplication;
  let page!:Page;
  const errors:string[]=[];
  async function launch(){app=await electron.launch({args:['.'],timeout:15000,env:{...process.env,FCU_USER_DATA:data}});page=await app.firstWindow();page.on('pageerror',e=>errors.push(e.message));await page.context().setOffline(true);await page.clock.install({time:new Date(0)});await page.clock.pauseAt(new Date(1000));}
  const click=async(name:string)=>page.getByRole('button',{name,exact:true}).click();
  const save=async()=>{await click('Save');await expect(page.getByRole('status')).toHaveText('Saved to disk.');};
  const advance=async()=>{const date=page.getByTestId('career-date'),before=await date.getAttribute('datetime');await page.getByRole('button',{name:'Advance to next event',exact:false}).click();await expect(date).not.toHaveAttribute('datetime',before!);};
  const entries=()=>page.evaluate(()=>window.fcu.list());
  const latest=async()=>{const list=await entries();if(!list.ok)throw new Error(list.error);const entry=list.value[0]!;const result=await page.evaluate(e=>window.fcu.load(e.careerId,e.commitId),entry);if(!result.ok)throw new Error(result.error);return result.value;};
  async function playUntil(_from:number,to:number){
    const resume=async()=>{
      if(await page.getByRole('button',{name:'Skip highlight',exact:true}).count())await click('Skip highlight');
      if(await page.locator('[data-decision="true"]').count())await page.getByRole('button',{name:/Continue short-handed|Acknowledge dismissal/}).click();
      const phase=await page.getByTestId('minute').getAttribute('data-phase');
      await click(phase==='interval'?'Continue':'Play');
    };
    let tick=Number(await page.getByTestId('minute').getAttribute('data-tick'));
    await resume();
    // The clock is accelerated; all simulation and incident decisions use the real worker.
    for(;tick<100;){
      const previous=tick;
      await expect(page.getByTestId('minute')).toHaveAttribute('data-tick',String(previous+1));
      tick=Number(await page.getByTestId('minute').getAttribute('data-tick'));
      const phase=await page.getByTestId('minute').getAttribute('data-phase');
      if(phase==='finished'||(to===45&&phase==='interval')||(to===1&&tick===1))return;
      if(await page.locator('[data-decision="true"]').count())await resume();
      else if(phase==='interval'&&!await page.getByRole('checkbox',{name:'Continue through half-time'}).isChecked())await click('Continue');
      else {await page.clock.fastForward(6001);await page.clock.runFor(50);}
    }
    throw Error('Match did not reach its phase boundary');
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
    await pad(13);await expect(page.getByRole('button',{name:'FCU Dream Club',exact:true})).toBeFocused();await pad(-1);await pad(13);await expect(page.getByRole('button',{name:'Load',exact:true})).toBeFocused();await pad(-1);await pad(0);await expect(page.getByRole('dialog',{name:'Saved careers'})).toBeVisible();await page.clock.runFor(1000);await expect(page.getByRole('dialog',{name:'Saved careers'})).toBeVisible();await pad(-1);await pad(1);await expect(page.getByRole('dialog')).toHaveCount(0);await pad(-1);
    await page.evaluate(()=>{delete (navigator as unknown as {getGamepads?:unknown}).getGamepads;window.dispatchEvent(new Event('gamepaddisconnected'));});
    await click('SFX On');await expect(page.getByRole('button',{name:'SFX Off',exact:true})).toHaveAttribute('aria-pressed','false');
    await page.getByRole('button',{name:'Start a career',exact:true}).focus();
    await expect(page.getByRole('button',{name:'Start a career',exact:true})).toBeFocused();await page.keyboard.press('Enter');await page.getByRole('button',{name:'Eight-club exhibition',exact:true}).click();await page.getByRole('button',{name:'Begin career'}).click();await page.getByRole('button',{name:'Squad',exact:true}).click();
    await expect(page.getByRole('checkbox')).toHaveCount(22);const selected=page.getByRole('checkbox').filter({visible:true});
    const first=await selected.evaluateAll(nodes=>nodes.findIndex(n=>(n as HTMLInputElement).checked));await selected.nth(first).uncheck();await click('Confirm lineup');await expect(page.getByRole('status')).toContainText('eleven distinct');
    await click('Tactics');const pregame=page.getByRole('dialog',{name:'Tactics',exact:true});await pregame.getByRole('button',{name:'4-3-3',exact:true}).click();await pregame.getByRole('button',{name:'Save setup 1',exact:true}).click();await expect(pregame.getByRole('button',{name:'Use setup 1',exact:true})).toBeEnabled();await pregame.getByRole('button',{name:'4-4-2',exact:true}).click();await pregame.getByRole('button',{name:'Use setup 1',exact:true}).click();await expect(pregame.getByRole('button',{name:'4-3-3',exact:true})).toHaveAttribute('aria-pressed','true');await pregame.getByRole('button',{name:'Apply tactics',exact:true}).click();await expect(page.getByRole('checkbox',{checked:true})).toHaveCount(10);await click('Suggest lineup');await click('Confirm lineup');await click('Choose bench');const bench=page.getByRole('dialog',{name:'Choose bench',exact:true});await bench.getByRole('button',{pressed:true}).last().click();await expect(bench.getByRole('button',{name:'Confirm bench',exact:true})).toBeEnabled();await bench.getByRole('button',{pressed:false}).filter({hasText:'DEF'}).first().click();await click('Confirm bench');await click('Tactics');await page.keyboard.press('ArrowDown');await expect(page.getByRole('dialog')).toContainText('Saved tactical setups');await page.keyboard.press('Escape');await expect(page.getByRole('dialog')).toHaveCount(0);await expect(page.getByRole('button',{name:'Tactics',exact:true})).toBeFocused();await page.getByRole('button',{name:'Clubhouse'}).click();await page.getByRole('button',{name:'Kick off'}).click();
    await expect(page.getByRole('img',{name:'Blue and red teams line up with the referees before kickoff.'})).toBeVisible();await expect(page.getByRole('group',{name:'Speed',exact:true})).toHaveCount(0);await expect(page.getByRole('button',{name:'Pixel art',exact:true})).toHaveCount(0);await expect(page.getByRole('button',{name:'Text',exact:true})).toHaveCount(0);await page.locator('summary').click();await save();const initialEntries=await entries();if(!initialEntries.ok)throw new Error();const checkpoint=initialEntries.value[0]!;
    // Finish the screen entrance animation before measuring highlight layout stability.
    await expect(page.locator('[class*=gameScreen]')).toHaveCSS('transform','none');const statistics=page.getByRole('region',{name:'Match statistics',exact:true});const statisticsBox=await statistics.boundingBox();const beforePreview=await latest();await click('Preview goal');await expect(page.getByText('Art preview - does not affect your match',{exact:true})).toBeVisible();await page.clock.runFor(1000);await expect(page.getByRole('img',{name:'A footballer prepares a shot in a packed stadium.'})).toBeVisible();await page.clock.runFor(2500);await expect(page.getByRole('img',{name:'The scorer raises both arms; the ball is inside the net.'})).toBeVisible();await page.screenshot({path:'work/match-pixel.png'});expect(await statistics.boundingBox()).toEqual(statisticsBox);await click('Skip highlight');expect(await statistics.boundingBox()).toEqual(statisticsBox);await save();const afterPreview=await latest();expect(canonical(afterPreview)).toBe(canonical(beforePreview));
    await expect(page.getByRole('button',{name:'Finish half',exact:true})).toHaveCount(0);await expect(page.getByRole('button',{name:'Next minute',exact:true})).toHaveCount(0);await click('Play');await expect(page.getByTestId('minute')).toHaveAttribute('data-tick','1');await page.clock.runFor(200);expect(await page.getByTestId('minute').textContent()).not.toBe('01:00');await click('Pause');const pausedClock=await page.getByTestId('minute').textContent();await page.clock.fastForward(20000);await expect(page.getByTestId('minute')).toHaveText(pausedClock!);
    await app.evaluate(({powerMonitor})=>{powerMonitor.emit('suspend');});await expect.poll(async()=>(await latest()).match?.tick).toBe(1);const suspendedEntries=await entries();expect(suspendedEntries.ok&&suspendedEntries.value[0]?.kind).toBe('auto');
    await app.evaluate(({powerMonitor})=>{powerMonitor.emit('resume');});await page.clock.fastForward(20000);await expect(page.getByTestId('minute')).toHaveText(pausedClock!);await substitute();await tactics();await playUntil(1,45);await save();await app.close();
    await launch();await expect(page.getByRole('button',{name:'SFX Off',exact:true})).toBeEnabled();await click('Load');await page.getByRole('dialog').getByRole('button',{name:'Load',exact:true}).first().click();await expect(page.getByTestId('minute')).toHaveAttribute('data-phase','interval');await expect(page.getByRole('button',{name:'Skip highlight',exact:true})).toHaveCount(0);
    await playUntil(45,90);await save();const pixelState=await latest();expect(pixelState.presets[0]?.formation).toBe('4-3-3');expect(pixelState.match!.homeBench).toEqual(pixelState.bench);await click('Match report');const report=page.getByRole('dialog',{name:'Match report',exact:true});await expect(report).toContainText('Points earned');await expect(report).toContainText('League position');await page.screenshot({path:'work/result-report.png'});await page.keyboard.press('Escape');await expect(report).toHaveCount(0);
    await click('Load');
    // Pick the exact immutable checkpoint through the same public load operation, then its visible row.
    const saveList=await entries();if(!saveList.ok)throw new Error();const index=saveList.value.findIndex(e=>e.commitId===checkpoint.commitId);
    await page.getByRole('dialog').getByRole('button',{name:'Load',exact:true}).nth(index).click();await expect(page.getByTestId('minute')).toHaveText('00:00');
    // A failed artwork load leaves the same commentary-led match playable.
    await page.getByRole('img',{name:'Blue and red teams line up with the referees before kickoff.'}).dispatchEvent('error');
    await expect(page.getByText('Highlights are unavailable. Live commentary continues.')).toBeVisible();await expect(page.getByRole('img',{name:'A footballer prepares a shot in a packed stadium.'})).toHaveCount(0);
    await playUntil(0,1);await click('Pause');await substitute();await tactics();await playUntil(1,45);await playUntil(45,90);await save();const textState=await latest();
    expect(canonical(textState.match)).toBe(canonical(pixelState.match));expect(canonical(textState.fixtures)).toBe(canonical(pixelState.fixtures));
    await page.getByRole('button',{name:'Continue',exact:false}).click();
    await click('Scouting');let market=page.getByRole('dialog',{name:'Scouting'});
    await market.getByRole('button',{name:/Sam Bellwick/}).click();await market.getByRole('button',{name:'Assign scout (7 days)',exact:true}).click();await click('Negotiate');await click('Submit bid');await page.keyboard.press('Escape');
    await advance();await page.getByRole('region',{name:'Club news'}).getByRole('button',{name:/Sam Bellwick/}).click();await click('Review final costs');await click('Confirm registration');await expect(market.getByRole('status')).toContainText('Signing completed');await page.keyboard.press('Escape');
    await click('Scouting');market=page.getByRole('dialog',{name:'Scouting'});await market.getByRole('button',{name:/Morgan Bellwick/}).click();await click('Negotiate');await market.getByLabel('Deal type').selectOption('loan');await market.getByLabel('Your wage contribution').selectOption('50');await click('Request loan');await page.keyboard.press('Escape');
    await advance();await page.getByRole('region',{name:'Club news'}).getByRole('button',{name:/Morgan Bellwick/}).click();await click('Review final costs');await click('Confirm registration');await expect(market.getByRole('status')).toContainText('Loan registered');await page.keyboard.press('Escape');await save();
    const signed=await latest();expect(signed.players.filter(p=>p.clubId===signed.clubId)).toHaveLength(24);expect(signed.loans[0]?.share).toBe(50);
    // One bounded full-season user journey, 13 remaining fixtures with real squad changes.
    for(let round=1;round<14;round++){
      while(!await page.getByRole('button',{name:/Kick off/}).count())await advance();await click('Squad');await click('Suggest lineup');
      if(round===1){const incoming=page.getByRole('checkbox',{name:'Start Sam Bellwick',exact:true});if(!await incoming.isChecked()){await page.locator('label').filter({has:page.getByRole('checkbox',{checked:true})}).filter({hasText:'DEF'}).first().getByRole('checkbox').uncheck();await incoming.check();}}
      await click('Confirm lineup');await click('Clubhouse');
      await page.getByRole('button',{name:'Kick off'}).click();if(round===1){await save();const changed=await latest();expect([...(changed.match?.homeLineup??[]),...(changed.match?.awayLineup??[])]).toContain(signed.players.find(p=>p.name==='Sam Bellwick')!.id);await page.getByRole('checkbox',{name:'Continue through half-time'}).check();await playUntil(0,90);await page.getByRole('button',{name:'Continue',exact:false}).click();continue;}await page.getByRole('checkbox',{name:'Continue through half-time'}).uncheck();await playUntil(0,45);await playUntil(45,90);await page.getByRole('button',{name:'Continue',exact:false}).click();
    }
    await expect(page.getByText('Season complete',{exact:true})).toBeVisible();await page.getByRole('button',{name:'League table',exact:true}).click();await expect(page.locator('tbody tr')).toHaveCount(8);expect((await latest()).round).toBe(14);expect(errors).toEqual([]);
    await page.screenshot({path:'work/season-table.png'});await click('Clubhouse');let end=await latest();while(end.loans[0]?.status==='active'){await advance();await save();end=await latest();}expect(end.date).toBe('2027-06-30');expect(end.players.find(p=>p.id===end.loans[0]!.playerId)!.clubId).toBe(end.loans[0]!.parent);expect(errors).toEqual([]);
  }finally{await app!.close();}
});

test('chooses an earned Dream player by keyboard and stops audio on exit',async()=>{
 const data=await mkdtemp(join(tmpdir(),'fcu-dream-audio-'));
 const app=await electron.launch({args:['.'],env:{...process.env,FCU_USER_DATA:data}});
 try{const page=await app.firstWindow();await page.context().setOffline(true);
  await page.evaluate(()=>{
   const Original=window.Audio,clips:HTMLAudioElement[]=[];
   Object.defineProperty(window,'fcuAuditionClips',{value:clips});
   window.Audio=class extends Original{constructor(src?:string){super(src);clips.push(this);}};
  });
  const audible=()=>page.evaluate(()=>(window as unknown as {fcuAuditionClips:HTMLAudioElement[]}).fcuAuditionClips.filter(clip=>clip.loop&&!clip.paused).length);
  await page.evaluate(()=>{let pressed=-1;Object.defineProperty(navigator,'getGamepads',{configurable:true,value:()=>[{connected:true,mapping:'standard',buttons:Array.from({length:16},(_,i)=>({pressed:i===pressed})),axes:[0,0]}]});window.addEventListener('fcu-pad',event=>{pressed=(event as CustomEvent<number>).detail;});window.dispatchEvent(new Event('gamepadconnected'));});
  const pad=async(button:number)=>{await page.evaluate(async value=>{window.dispatchEvent(new CustomEvent('fcu-pad',{detail:value}));await new Promise<void>(resolve=>requestAnimationFrame(()=>requestAnimationFrame(()=>resolve())));},button);};
  const confirmPad=async()=>{await pad(0);await pad(-1);};
  await page.getByRole('button',{name:'FCU Dream Club',exact:true}).click();const name=page.getByLabel('Club',{exact:true});await name.focus();await confirmPad();
  const editor=page.getByRole('dialog',{name:'Controller text entry',exact:true});await expect(editor).toBeVisible();
  await editor.getByRole('button',{name:'Clear',exact:true}).focus();await confirmPad();await editor.getByRole('button',{name:'f',exact:true}).focus();await confirmPad();await editor.getByRole('button',{name:'c',exact:true}).focus();await confirmPad();
  await editor.getByRole('button',{name:'Apply',exact:true}).focus();await confirmPad();await expect(name).toHaveValue('fc');await expect(name).toBeFocused();
  await confirmPad();await editor.getByLabel('Value',{exact:true}).fill('Cancelled');await pad(1);await pad(-1);await expect(editor).toHaveCount(0);await expect(name).toHaveValue('fc');
  const tier=page.getByRole('combobox',{name:'Opponent tier',exact:true});await tier.focus();await confirmPad();const options=page.getByRole('dialog',{name:'Choose an option',exact:true});await options.getByRole('button',{name:'Club (65-74)',exact:true}).focus();await confirmPad();await expect(tier).toHaveValue('club');await expect(tier).toBeFocused();
  await page.evaluate(()=>{delete (navigator as unknown as {getGamepads?:unknown}).getGamepads;window.dispatchEvent(new Event('gamepaddisconnected'));});
  await page.getByRole('button',{name:'Begin Dream Club',exact:true}).click();
  for(let fixture=0;fixture<3;fixture++){await page.getByRole('button',{name:'Instant result',exact:true}).click();await expect(page.getByRole('button',{name:'Instant result',exact:true})).toBeEnabled();}
  await page.getByRole('button',{name:'Reveal earned choices',exact:true}).click();
  const choices=page.getByRole('group',{name:'Choose one player',exact:true});await expect(choices.getByRole('button')).toHaveCount(3);
  await expect(choices.getByRole('button').first()).toBeFocused();await expect(choices).toContainText('Best active player in this role');
  const earned=await choices.getByRole('button').first().locator('strong').textContent();
  await page.keyboard.press('Enter');await expect(choices).toHaveCount(0);await expect(page.getByRole('button',{name:'Play next fixture',exact:true})).toBeFocused();
  await page.getByRole('button',{name:'Collection and active squad',exact:true}).click();
  const collection=page.getByRole('region',{name:'Collection and active squad',exact:true});
  await expect(collection.getByLabel('Find a collected player')).toBeFocused();await collection.getByLabel('Find a collected player').fill(earned!);
  await expect(collection.getByRole('checkbox')).toHaveCount(1);await collection.getByRole('checkbox').check();
  await collection.getByRole('button',{name:'Confirm active squad',exact:true}).click();await expect(collection).toHaveCount(0);
  await expect(page.getByRole('checkbox',{name:'Start '+earned,exact:true})).toBeVisible();await page.getByRole('button',{name:'Back',exact:true}).first().click();
  await page.getByRole('button',{name:'Play next fixture',exact:true}).click();await page.getByRole('button',{name:'Play',exact:true}).click();
  await expect.poll(audible).toBe(1);
  const beforeSuspend=await page.evaluate(()=>window.fcu.dreamList());if(!beforeSuspend.ok)throw Error(beforeSuspend.error);
  await app.evaluate(({powerMonitor})=>{powerMonitor.emit('suspend');});await expect(page.getByRole('button',{name:'Play',exact:true})).toBeVisible();await expect.poll(audible).toBe(0);
  const minute=await page.getByTestId('minute').getAttribute('data-tick');
  await expect.poll(async()=>{const entries=await page.evaluate(()=>window.fcu.dreamList());return entries.ok?entries.value[0]?.commitId:null;}).not.toBe(beforeSuspend.value[0]?.commitId);
  const restored=await page.evaluate(async()=>{const entries=await window.fcu.dreamList();if(!entries.ok||!entries.value[0])return null;const entry=entries.value[0],loaded=await window.fcu.dreamLoad(entry.careerId,entry.commitId);return loaded.ok?loaded.value.game.match?.tick:null;});expect(restored).toBe(Number(minute));
  await app.evaluate(({powerMonitor})=>{powerMonitor.emit('resume');});await expect(page.getByRole('button',{name:'Play',exact:true})).toBeVisible();await expect.poll(audible).toBe(0);
  const folder=resolve(data,'dream-saves'),backup=resolve(data,'dream-save-recovery');if(dirname(folder)!==resolve(data)||dirname(backup)!==resolve(data))throw Error('Unexpected isolated test path');
  await rename(folder,backup);await writeFile(folder,'blocked destination');
  try{await page.getByRole('button',{name:'Title screen',exact:true}).click();await expect(page.getByText('The checkpoint could not be saved. Retry Save before continuing or revealing choices.',{exact:true})).toBeVisible();await expect(page.getByRole('button',{name:'Start a career',exact:true})).toHaveCount(0);}finally{await unlink(folder);await rename(backup,folder);}
  await page.getByRole('button',{name:'Save',exact:true}).click();await expect(page.getByRole('button',{name:'Play',exact:true})).toBeVisible();
  await page.getByRole('button',{name:'Play',exact:true}).click();await expect.poll(audible).toBe(1);await page.getByRole('button',{name:'Title screen',exact:true}).click();
  await expect(page.getByRole('button',{name:'Start a career',exact:true})).toBeVisible();await expect.poll(audible).toBe(0);
  await page.getByRole('button',{name:'FCU Dream Club',exact:true}).click();await page.getByRole('button',{name:'Load',exact:true}).click();await page.getByRole('region',{name:'Saved checkpoints',exact:true}).getByRole('button',{name:'Load',exact:true}).first().click();await page.getByRole('button',{name:'Continue',exact:true}).click();await expect(page.getByTestId('minute')).toHaveAttribute('data-tick',String(Number(minute)+1));

 }finally{await app.close();}
});test('keeps the game open on a failed closing checkpoint and recovers after retry',async()=>{
 const data=await mkdtemp(join(tmpdir(),'fcu-close-'));let app=await electron.launch({args:['.'],env:{...process.env,FCU_USER_DATA:data}}),closed=false;
 try{let page=await app.firstWindow();await page.context().setOffline(true);await page.getByRole('button',{name:'Start a career',exact:true}).click();await page.getByRole('button',{name:'Eight-club exhibition',exact:true}).click();await page.getByRole('button',{name:'Begin career',exact:true}).click();await page.getByRole('button',{name:'Kick off',exact:true}).click();await page.getByRole('button',{name:'Play',exact:true}).click();await expect(page.getByTestId('minute')).toHaveAttribute('data-tick','1');await page.getByRole('button',{name:'Pause',exact:true}).click();
  const folder=resolve(data,'saves'),backup=resolve(data,'closing-recovery');if(dirname(folder)!==resolve(data)||dirname(backup)!==resolve(data))throw Error('Unexpected isolated test path');
  await rename(folder,backup);await writeFile(folder,'blocked destination');
  try{await app.evaluate(({dialog})=>{dialog.showMessageBox=async()=>({response:1,checkboxChecked:false});});await app.evaluate(({BrowserWindow})=>BrowserWindow.getAllWindows()[0]!.close());await expect(page.getByRole('status')).toHaveText('The save operation failed. Progress is unsaved; retry Save or choose another checkpoint.');expect(await app.evaluate(({BrowserWindow})=>BrowserWindow.getAllWindows().length)).toBe(1);}finally{await unlink(folder);await rename(backup,folder);}
  const exit=app.waitForEvent('close');await app.evaluate(({BrowserWindow})=>BrowserWindow.getAllWindows()[0]!.close());await exit;closed=true;
  app=await electron.launch({args:['.'],env:{...process.env,FCU_USER_DATA:data}});closed=false;page=await app.firstWindow();await page.context().setOffline(true);await page.getByRole('button',{name:'Load',exact:true}).click();await page.getByRole('dialog').getByRole('button',{name:'Load',exact:true}).first().click();await expect(page.getByTestId('minute')).toHaveAttribute('data-tick','1');
 }finally{if(!closed)await app.close();}
});
