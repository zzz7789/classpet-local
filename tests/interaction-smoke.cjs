// Browser smoke test with isolated API fixtures; never writes classroom data.
const assert=require('node:assert/strict');
const http=require('node:http');
const fs=require('node:fs');
const path=require('node:path');
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const root=path.resolve(__dirname,'../frontend/dist');
const server=http.createServer((req,res)=>{
  const file=path.join(root,new URL(req.url,'http://localhost').pathname);
  const target=file===root+path.sep?path.join(root,'index.html'):file;
  res.setHeader('Content-Type',target.endsWith('.js')?'text/javascript':target.endsWith('.css')?'text/css':target.endsWith('.svg')?'image/svg+xml':target.endsWith('.webp')?'image/webp':'text/html');
  fs.readFile(target,(error,body)=>{res.statusCode=error?404:200;res.end(error?'missing':body)});
});
(async()=>{
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  const browser=await chromium.launch({headless:true,...(process.env.PLAYWRIGHT_EXECUTABLE?{executablePath:process.env.PLAYWRIGHT_EXECUTABLE}:{})});
  try{
    const page=await browser.newPage();
    const errors=[];page.on('pageerror',e=>errors.push(e.message));
    const seat={id:'a',name:'测试同学',pet_name:'云朵',species:'cloud-cat',xp:16,balance:10,energy:80,mood:80,is_active:true};
    let allProducts=false,itemId='cookie',fail=false,quantity=2,feedCount=0,drawMode=false,overflowMode=false;
    await page.route('**/api/**',async route=>{
      if(route.request().method()==='POST'){
        if(fail)return route.fulfill({status:400,json:{error:'测试奖励失败'}});
        const body=route.request().postDataJSON();
        if(body.action==='award'){seat.balance+=body.delta;seat.xp+=body.delta}
        if(body.action==='feed'){seat.xp+=5;seat.energy=Math.min(100,seat.energy+10);quantity--;feedCount++}
        return route.fulfill({json:{ok:true}});
      }
      const selected=new URL(route.request().url()).searchParams.has('seatId');
      const members=overflowMode?Array.from({length:40},(_,i)=>({...seat,id:'overflow-'+i,name:'测试同学'+(i+1)})):drawMode?[seat,{...seat,id:'b',name:'小林'},{...seat,id:'c',name:'小周'}]:[seat];
      return route.fulfill({json:{user:{name:'测试老师'},account:{},data:{classes:[{id:'c',name:'互动测试班'}],current:{id:'c',name:'互动测试班'},members,species:[{id:'cloud-cat',name:'云朵猫',image:'/pets/cloud-cat.webp'}],tasks:[],completions:[],products:(allProducts?['cookie','apple','milk','cake','meal','ball']:[itemId]).map(id=>({id,name:{cookie:'小饼干',apple:'苹果',milk:'牛奶',cake:'蛋糕',meal:'营养餐',ball:'玩具球'}[id],xp:5,energy:10,price:10})),ledger:[],selected:selected?{seat,inventory:[{item:itemId,quantity}]}:null}}});
    });
    await page.goto(`http://127.0.0.1:${server.address().port}`);
    await page.waitForFunction(()=>document.querySelector('.student-scene .pet-actor')?.dataset.ready==='true');
    const actor=page.locator('.student-scene .pet-actor').first();
    const garden=await page.locator('.student-scene').first().evaluate(el=>getComputedStyle(el).backgroundImage);
    const firstFrame=await actor.getAttribute('data-frame');
    await page.waitForTimeout(1400);
    assert.equal(await actor.getAttribute('data-frame'),firstFrame,'classroom pets remain still before opening');
    assert.equal(await page.locator('.student-scene').first().evaluate(el=>getComputedStyle(el).backgroundImage),garden,'garden remains fixed while pose changes');
    await page.getByRole('button',{name:'＋3 回答问题',exact:true}).click();
    await page.getByText('+3 积分，太棒啦！',{exact:true}).waitFor();
    await page.getByRole('button',{name:'＋3 回答问题',exact:true}).click();
    await page.getByText('升级啦！Lv.2 ✨',{exact:true}).waitFor();
    await page.locator('.student-main').click();
    await page.waitForFunction(()=>{const actor=document.querySelector('.partner-dialog .pet-actor');return actor?.dataset.ready==='true'&&actor.dataset.frame!=='0'});
    await page.getByRole('button',{name:'与伙伴互动'}).click();
    await page.locator('.partner-dialog').getByText('轻轻抬爪，和你打招呼。',{exact:true}).waitFor();
    await page.getByRole('button',{name:'与伙伴互动'}).click();
    await page.locator('.partner-dialog').getByText('挥挥小爪，今天也想陪着你。',{exact:true}).waitFor();
    assert.equal(await page.locator('.partner-dialog .pet-actor').getAttribute('data-motion'),'interact');
    await page.waitForTimeout(3350);
    assert.equal(await page.locator('.partner-dialog .pet-actor').getAttribute('data-motion'),'idle');
    assert.equal(await page.locator('.pet-feedback').count(),0,'effects expire');
    fail=true;
    await page.locator('.partner-dialog').getByRole('button',{name:'回答问题 +3',exact:true}).click();
    await page.locator('.partner-dialog').getByRole('alert').waitFor();
    assert.equal(await page.locator('.pet-feedback').count(),0,'failed requests do not celebrate');
    await page.emulateMedia({reducedMotion:'reduce'});
    await page.waitForFunction(()=>document.querySelector('.partner-dialog .pet-actor').dataset.frame==='0');
    await page.waitForTimeout(1200);
    assert.equal(await page.locator('.partner-dialog .pet-actor').getAttribute('data-frame'),'0');
    fail=false;
    await page.getByRole('button',{name:'与伙伴互动'}).click();
    await page.locator('.partner-dialog .pet-feedback').waitFor();
    assert.equal(await page.locator('.partner-dialog .pet').evaluate(el=>getComputedStyle(el).animationName),'none');
    await page.setViewportSize({width:390,height:844});
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
    await page.getByRole('button',{name:'喂食 / 玩耍',exact:true}).click();
    fail=true;
    await page.getByRole('button',{name:'使用',exact:true}).click();
    await page.locator('.partner-dialog').getByRole('alert').waitFor();
    assert.equal(await page.getByRole('button',{name:'使用',exact:true}).count(),1,'failed feed keeps bag open');
    assert.equal(feedCount,0);
    fail=false;
    seat.xp=49;
    await page.getByRole('button',{name:'使用',exact:true}).click();
    await page.locator('.partner-dialog .feedback-feed').waitFor();
    assert.equal(await page.getByRole('button',{name:'使用',exact:true}).count(),0,'successful feed leaves bag');
    assert.equal(await page.locator('.partner-dialog .feeding-item').getAttribute('src'),'/items/cookie.webp');
    assert.match(await page.locator('.partner-dialog .feeding-detail').innerText(),/Lv.3/);
    assert.equal(feedCount,1);
    assert.equal(await page.locator('.partner-dialog .feeding-item').evaluate(el=>getComputedStyle(el).animationName),'none','reduced motion keeps feedback static');
    await page.emulateMedia({reducedMotion:'no-preference'});
    await page.getByRole('button',{name:'喂食 / 玩耍',exact:true}).click();
    await page.getByRole('button',{name:'使用',exact:true}).click();
    await page.locator('.partner-dialog .feeding-item').waitFor();
    assert.equal(await page.locator('.partner-dialog .feeding-item').evaluate(el=>getComputedStyle(el).animationName),'serving-bowl');
    assert.equal(feedCount,2);
    assert.equal(await page.locator('.partner-dialog .pet-actor').getAttribute('data-motion'),'eat');
    await page.getByRole('button',{name:'喂食 / 玩耍',exact:true}).click();
    await page.getByText('背包暂时是空的。',{exact:false}).waitFor();
    fs.mkdirSync(path.resolve(__dirname,'../docs/screenshots'),{recursive:true});
    for(const [id,animation] of [['milk','drinking-delivery'],['ball','playing-ball']]){
      itemId=id;quantity=1;await page.reload();await page.locator('.student-main').click();
      await page.getByRole('button',{name:'喂食 / 玩耍',exact:true}).click();
      await page.getByRole('button',{name:'使用',exact:true}).click();
      const effect=page.locator('.partner-dialog .action-'+(id==='ball'?'play':'drink'));await effect.waitFor();
      assert.equal(await effect.locator('.feeding-item').evaluate(el=>getComputedStyle(el).animationName),animation);
      assert.equal(await page.locator('.partner-dialog .pet').evaluate(el=>getComputedStyle(el).animationName),'none','garden and container stay still while animal poses change');
      await effect.locator('.feeding-item').evaluate(async img=>{if(!img.complete)await new Promise(resolve=>img.addEventListener('load',resolve,{once:true}));if(!img.naturalWidth)throw Error('item image missing');await Promise.all(img.getAnimations().map(animation=>animation.ready));img.getAnimations().forEach(animation=>{animation.pause();animation.currentTime=850})});
      if(id==='ball')assert.match(await effect.locator('.feeding-detail').innerText(),/心情提升/);
      await page.screenshot({path:path.resolve(__dirname,'../docs/screenshots/generated-'+id+'-feedback.png')});
    }
    allProducts=true;await page.reload();await page.locator('.student-main').click();
    await page.getByRole('button',{name:'买点补给',exact:true}).click();
    for(const mobile of [false,true]){
      await page.setViewportSize(mobile?{width:390,height:844}:{width:1280,height:900});
      const images=page.locator('.partner-dialog .sprite-item');
      assert.equal(await images.count(),6);
      await page.waitForFunction(()=>Array.from(document.querySelectorAll('.partner-dialog .sprite-item')).every(img=>img.complete&&img.naturalWidth>0));
      assert.deepEqual(await images.evaluateAll(imgs=>imgs.map(img=>img.getAttribute('src'))),['cookie','apple','milk','cake','meal','ball'].map(id=>'/items/'+id+'.webp'));
      assert.equal(await page.locator('img[src$=".svg"]').count(),0,'shop has no SVG images');
      assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
      await page.screenshot({path:path.resolve(__dirname,'../docs/screenshots/generated-supplies-'+(mobile?'mobile':'desktop')+'.png'),fullPage:true});
    }
    allProducts=false;
    drawMode=true;
    await page.reload();
    fs.mkdirSync(path.resolve(__dirname,'../docs/screenshots'),{recursive:true});
    for(const mobile of [false,true]){
      await page.setViewportSize(mobile?{width:390,height:844}:{width:1280,height:900});
      await page.locator('.student-scene .pet-actor').first().waitFor();
      await page.waitForFunction(()=>Array.from(document.querySelectorAll('.student-scene .pet-actor')).every(el=>el.dataset.ready==='true'));
      assert.equal(await page.locator('.student-scene .pet-actor').count(),3,'fixture shows three animated pet cards');
      assert.equal(await page.locator('.student-scene .pet-actor').evaluateAll(actors=>actors.every(el=>el.dataset.ready==='true')),true,'generated motion atlases load');
      assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
      await page.screenshot({path:path.resolve(__dirname,'../docs/screenshots/plush-classroom-'+(mobile?'mobile':'desktop')+'.png'),fullPage:true});
    }
    const balanceBeforeDraw=seat.balance;
    const drawn=[];
    for(let i=0;i<3;i++){
      await page.getByRole('button',{name:'✋ 宠物举爪抽答',exact:true}).click();
      await page.getByRole('button',{name:'开始抽答',exact:true}).click();
      assert.equal(await page.locator('.draw-camp.drawing').count(),1);
      assert.equal(await page.locator('.draw-sprite').first().evaluate(el=>getComputedStyle(el).animationName),'none','draw highlights cards without moving portrait');
      assert.equal(await page.getByRole('button',{name:'正在举爪…'}).isDisabled(),true);
      await page.locator('.draw-pet.chosen').waitFor();
      const name=await page.locator('.draw-result strong').innerText();
      assert.ok(!drawn.includes(name),'closing and reopening retains this round');drawn.push(name);
      await page.getByRole('button',{name:'关闭',exact:true}).click();
    }
    assert.equal(seat.balance,balanceBeforeDraw,'drawing never awards automatically');
    await page.getByRole('button',{name:'✋ 宠物举爪抽答',exact:true}).click();
    await page.getByRole('button',{name:'开始抽答',exact:true}).click();
    await page.locator('.draw-pet.chosen').waitFor();
    await page.getByText('本轮还有 2 位未抽到',{exact:true}).waitFor();
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
    await page.getByRole('button',{name:'回答完成 +3',exact:true}).click();
    await page.locator('.pet-draw').waitFor({state:'detached'});
    assert.equal(seat.balance,balanceBeforeDraw+3,'teacher explicitly confirms the reward');
    overflowMode=true;
    await page.addInitScript(()=>{Math.random=()=>.99999});
    for(const mobile of [false,true]){
      await page.setViewportSize(mobile?{width:390,height:844}:{width:1280,height:900});
      await page.emulateMedia({reducedMotion:mobile?'reduce':'no-preference'});
      await page.reload();
      await page.getByRole('button',{name:'✋ 宠物举爪抽答',exact:true}).click();
      assert.equal(await page.locator('.draw-pet').count(),40);
      assert.equal(await page.locator('.draw-pet').last().evaluate(el=>el.getBoundingClientRect().top>el.parentElement.getBoundingClientRect().bottom),true,'last student starts outside the visible camp');
      await page.getByRole('button',{name:'开始抽答',exact:true}).click();
      await page.locator('.draw-pet.chosen').waitFor();
      await page.waitForFunction(()=>{
        const card=document.querySelector('.draw-pet.chosen');
        const rect=card.getBoundingClientRect(),camp=card.parentElement.getBoundingClientRect();
        return document.activeElement===card&&rect.top>=camp.top&&rect.bottom<=camp.bottom&&rect.top>=0&&rect.bottom<=innerHeight;
      });
      assert.equal(await page.locator('.draw-pet.chosen').getAttribute('aria-label'),'抽中同学：测试同学40');
    }
    await page.route('**/pets/motion/*.webp',route=>route.abort());
    await page.reload();
    await page.locator('.student-scene .pet-fallback').first().waitFor();
    await page.waitForFunction(()=>document.querySelector('.student-scene .pet-fallback')?.naturalWidth>0);
    assert.equal(await page.locator('.student-scene .pet-frames').count(),0,'failed atlas keeps portrait fallback');
    assert.deepEqual(errors,[]);
    console.log('PASS: browser interactions, feeding animation, success returns to pet, failure retains bag, feeding level-up and last item consumption');
    console.log('PASS: classroom draw animation, no repeats across reopen, round reset, mobile layout and explicit award');
    console.log('PASS: offscreen winner scroll and keyboard focus with 40 students on desktop and mobile/reduced motion');
  }finally{await browser.close();server.close()}
})().catch(e=>{console.error(e);server.close();process.exitCode=1});


