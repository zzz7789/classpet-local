// Isolated browser fixtures exercise the production build without writing classroom data.
const assert=require('node:assert/strict');
const http=require('node:http');
const fs=require('node:fs');
const path=require('node:path');
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const root=path.resolve(__dirname,'../frontend/dist');
const server=http.createServer((req,res)=>{
  const relative=decodeURIComponent(new URL(req.url,'http://localhost').pathname);
  const target=path.join(root,relative==='/'?'index.html':relative);
  res.setHeader('Content-Type',target.endsWith('.js')?'text/javascript':target.endsWith('.css')?'text/css':target.endsWith('.webp')?'image/webp':'text/html');
  fs.readFile(target,(error,body)=>{res.statusCode=error?404:200;res.end(error?'missing':body)});
});
(async()=>{
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  let browser;
  try{
    browser=await chromium.launch({headless:true,...(process.env.PLAYWRIGHT_EXECUTABLE?{executablePath:process.env.PLAYWRIGHT_EXECUTABLE}:{})});
    const page=await browser.newPage({viewport:{width:1280,height:1000}}),errors=[];
    page.on('pageerror',e=>errors.push(e.message));
    const student=(id,name,points,balance,xp)=>({id,name,points,balance,xp,is_active:true,pet_name:'云朵',species:'cloud-cat',energy:80,mood:80});
    const members=[student('a','小林',45,5,90),student('b','小周',100,100,30),student('c','小吴',100,20,50),student('long','这是一位姓名比较长的测试同学',0,0,0),{...student('removed','已移除同学',999,999,999),is_active:false}];
    const classes=[{id:'c1',name:'萌芽一班'},{id:'c2',name:'新建班级'}];
    let empty=false,requests=0;
    await page.route('**/api/**',async route=>{
      const request=route.request();
      if(request.method()==='POST'){
        const body=request.postDataJSON();
        assert.equal(body.action,'award');
        assert.equal(body.classId,'c1');
        const s=members.find(s=>s.id===body.ids[0]);s.points+=body.delta;s.balance+=body.delta;
        return route.fulfill({json:{ok:true}});
      }
      requests++;
      const query=new URL(request.url()).searchParams;
      const cid=query.get('classId')||'c1',sid=query.get('seatId');
      const roster=empty?[]:cid==='c1'?members:[student('other','新同学',7,7,0)];
      const seat=roster.find(s=>s.id===sid);
      return route.fulfill({json:{user:{name:'测试老师'},account:{},data:{classes,current:classes.find(c=>c.id===cid),members:roster,species:[{id:'cloud-cat',name:'云朵猫',image:'/pets/cloud-cat.webp'}],tasks:[{id:'t1',title:'已关闭作业',status:'closed'}],completions:cid==='c1'?[{student_id:'b',task_id:'t1'},{student_id:'b',task_id:'t2'},{student_id:'a',task_id:'t1'}]:[],products:[],ledger:[],decorations:[],selected:seat?{seat,inventory:[],ledger:[],decorations:[]}:null}}});
    });
    const base=`http://127.0.0.1:${server.address().port}`;
    await page.goto(base);
    await page.getByRole('button',{name:'🏆 排行榜',exact:true}).click();
    const rows=page.locator('.leaderboard-list>li');
    assert.equal(await rows.count(),4);
    assert.deepEqual(await rows.evaluateAll(items=>items.map(i=>Number(i.dataset.rank))),[1,1,3,4]);
    assert.equal(await page.getByText('已移除同学',{exact:true}).count(),0);
    assert.equal(await page.locator('.leaderboard-star').count(),3);
    assert.match(await page.locator('[data-student-id="a"] .leaderboard-score').innerText(),/45/,'rank uses earned points rather than balance');
    await page.getByRole('button',{name:'成长榜',exact:true}).click();
    assert.equal(await rows.first().getAttribute('data-student-id'),'a');
    await page.getByRole('button',{name:'打卡榜',exact:true}).click();
    assert.equal(await rows.first().getAttribute('data-student-id'),'b');
    assert.match(await rows.first().innerText(),/2\s*次打卡/);
    await page.getByRole('button',{name:'积分榜',exact:true}).click();
    const search=page.getByRole('searchbox',{name:'在排行榜查找学生'});
    await search.fill('小林');
    assert.equal(await rows.count(),1);
    assert.equal(await rows.first().getAttribute('data-rank'),'3');
    await rows.first().getByRole('button').click();
    await page.locator('.partner-dialog').getByRole('button',{name:'回答问题 +3',exact:true}).click();
    await page.waitForFunction(()=>document.querySelector('[data-student-id="a"] .leaderboard-score')?.textContent.includes('48'));
    await page.locator('.partner-dialog').getByRole('button',{name:'关闭',exact:true}).click();
    assert.equal(await search.inputValue(),'小林');
    await search.fill('不存在的同学');
    await page.getByText('没有找到这位学生。',{exact:true}).waitFor();
    await page.getByRole('button',{name:'清空搜索',exact:true}).click();
    assert.equal(await rows.count(),4);
    const before=requests;
    members[0].points=120;
    await page.evaluate(()=>window.dispatchEvent(new Event('focus')));
    await page.waitForFunction(()=>document.querySelector('.leaderboard-list>li')?.dataset.studentId==='a');
    assert.ok(requests>before,'window focus refreshes current rankings');
    await page.waitForFunction(()=>[...document.querySelectorAll('.leaderboard img')].every(i=>i.complete&&i.naturalWidth>0));
    await page.locator('.toast').waitFor({state:'hidden'});
    fs.mkdirSync(path.resolve(__dirname,'../docs/screenshots'),{recursive:true});
    await page.screenshot({path:path.resolve(__dirname,'../docs/screenshots/leaderboard-desktop.png'),fullPage:true});
    for(const width of [390,320]){
      await page.setViewportSize({width,height:844});
      assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true,`no page overflow at ${width}px`);
      const scores=await page.locator('.leaderboard-score').evaluateAll(items=>items.every(el=>el.scrollWidth<=el.clientWidth));
      assert.equal(scores,true,'scores remain readable');
      if(width===390)await page.screenshot({path:path.resolve(__dirname,'../docs/screenshots/leaderboard-mobile.png'),fullPage:true});
    }
    await page.getByRole('searchbox',{name:'在排行榜查找学生'}).fill('小林');
    await page.getByRole('button',{name:'成长榜',exact:true}).click();
    await page.getByRole('combobox',{name:'选择班级'}).selectOption('c2');
    await page.getByRole('button',{name:'🏆 排行榜',exact:true}).click();
    assert.equal(await page.getByRole('button',{name:'积分榜',exact:true}).getAttribute('aria-pressed'),'true');
    assert.equal(await page.getByRole('searchbox',{name:'在排行榜查找学生'}).inputValue(),'');
    assert.equal(await rows.count(),1);
    assert.equal(await rows.first().getAttribute('data-student-id'),'other');
    empty=true;
    await page.reload();
    await page.getByRole('button',{name:'🏆 排行榜',exact:true}).click();
    await page.getByText('添加学生，开启班级排行榜。',{exact:true}).waitFor();
    await page.getByRole('button',{name:'添加学生名单',exact:true}).click();
    await page.getByRole('heading',{name:'添加学生',exact:true}).waitFor();
    assert.deepEqual(errors,[]);
    console.log('PASS: leaderboard navigation, ties, three metrics, full-class search ranks, pet award updates, focus refresh, class isolation/reset, single/empty states, local images, desktop/390px/320px layout, no JS errors');
  }finally{
    await browser?.close();
    await new Promise(resolve=>server.close(resolve));
  }
})().catch(e=>{console.error(e);process.exitCode=1});
