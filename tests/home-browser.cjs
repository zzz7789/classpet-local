// Uses only credentials produced by home-integration.py for its isolated classroom.
const fs=require('fs'),assert=require('node:assert/strict'),crypto=require('crypto');
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
(async()=>{
 const receipt=JSON.parse(fs.readFileSync(process.argv[2]||'backups/home-test-receipt.json','utf8'));
 const base=process.env.TEST_URL||'http://127.0.0.1:8080';
 const browser=await chromium.launch({headless:true,executablePath:process.env.PLAYWRIGHT_EXECUTABLE});
 try{
  const page=await browser.newPage({viewport:{width:1280,height:1000}}),errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  const call=async(path,data)=>{const r=await page.request.post(base+path,{headers:{Origin:base,'Idempotency-Key':crypto.randomUUID()},data});assert.equal(r.status(),200,await r.text());return r.json()};
  await call('/api/account',{action:'login',username:receipt.username,password:receipt.password});
  const state=async()=>{const r=await page.request.get(base+'/api/state?classId='+receipt.cid+'&seatId='+receipt.sid);assert.equal(r.status(),200);return (await r.json()).data};
  let data=await state();
  // Awards supply coins; actual experience comes from using food. Keep that rule.
  while(data.selected.seat.xp<200){
    await call('/api/action',{action:'award',classId:receipt.cid,ids:[receipt.sid],delta:80,reason:'隔离成长验收'});
    await call('/api/action',{action:'buy',classId:receipt.cid,seatId:receipt.sid,item:'meal'});
    await call('/api/action',{action:'feed',classId:receipt.cid,seatId:receipt.sid,item:'meal'});
    data=await state();
  }
  await page.addInitScript(id=>localStorage.setItem('classpet-local-class',id),receipt.cid);
  await page.goto(base);await page.locator('.student-main').filter({hasText:data.selected.seat.name}).click();
  await page.locator('.partner-dialog .pet-actor[data-stage="mature"]').waitFor();
  await page.getByRole('button',{name:'小窝',exact:true}).click();
  await page.locator('.decor-card').first().waitFor();assert.equal(await page.locator('.decor-card').count(),4);
  await page.waitForFunction(()=>[...document.querySelectorAll('.decor-card>img')].every(i=>i.complete&&i.naturalWidth>0));
  const rug=page.locator('.decor-card').filter({hasText:'花花地毯'});
  await rug.getByRole('button',{name:'购买并布置'}).click();
  await rug.getByRole('button',{name:'收起来'}).waitFor();
  data=await state();assert.equal(data.selected.seat.balance,50);assert.ok(data.selected.seat.decor.includes('rug'));
  await rug.getByRole('button',{name:'收起来'}).click();await rug.getByRole('button',{name:'布置小窝'}).waitFor();
  assert.ok(!(await state()).selected.seat.decor.includes('rug'));
  await rug.getByRole('button',{name:'布置小窝'}).click();await rug.getByRole('button',{name:'收起来'}).waitFor();
  assert.equal((await state()).selected.seat.balance,50,'re-equipping is free');
  const scarf=page.locator('.decor-card').filter({hasText:'薄荷小围巾'});
  assert.equal(await scarf.getByRole('button',{name:'购买并布置'}).isDisabled(),true,'unaffordable decor is disabled');
  await page.screenshot({path:'docs/screenshots/growth-home-desktop.png',fullPage:true});
  await page.setViewportSize({width:390,height:844});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
  await page.screenshot({path:'docs/screenshots/growth-home-mobile.png',fullPage:true});
  await page.getByRole('button',{name:'伙伴',exact:true}).click();
  await page.locator('.partner-dialog .growth-crown').waitFor();assert.match(await page.locator('.growth-journey').innerText(),/成熟/);
  await page.screenshot({path:'docs/screenshots/growth-mature-mobile.png',fullPage:true});
  assert.deepEqual(errors,[]);
  console.log('PASS: real isolated account; mature stage; four decor assets; buy/unload/re-equip and balance; mobile layout; no JS errors.');
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
