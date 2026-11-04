// Run against the seeded demo only; credentials are supplied through environment variables.
const assert=require('node:assert/strict');
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
(async()=>{
  const browser=await chromium.launch({headless:true,...(process.env.PLAYWRIGHT_EXECUTABLE?{executablePath:process.env.PLAYWRIGHT_EXECUTABLE}:{})});
  const errors=[];
  try{
    const pages=[];
    for(let i=1;i<=2;i++){
      assert.ok(process.env['DEMO_PASSWORD_'+i],'Supply demo account passwords');
      const context=await browser.newContext();const page=await context.newPage();pages.push(page);
      page.on('pageerror',e=>errors.push(e.message));
      await page.goto(process.env.DEMO_URL||'http://127.0.0.1:8080');
      await page.getByLabel('用户名',{exact:true}).fill(process.env['DEMO_USERNAME_'+i]||'demo_teacher_'+i);
      await page.getByLabel('密码',{exact:true}).fill(process.env['DEMO_PASSWORD_'+i]);
      await page.getByRole('button',{name:'进入班级',exact:true}).click();
      await page.getByRole('heading',{name:'示例班级 · 星光三班',exact:true}).waitFor();
      assert.equal(await page.locator('.student-card').count(),30);
      await page.getByRole('button',{name:'班级设置',exact:true}).click();
      assert.equal(await page.locator('.class-teachers .task').count(),2);
      assert.equal(await page.getByRole('button',{name:'添加老师',exact:true}).count(),i===1?1:0);
    }
    const [owner,co]=pages;
    await owner.getByRole('button',{name:'移出本班',exact:true}).click();
    await owner.locator('.class-teachers').waitFor({state:'detached'});
    await co.reload();
    await co.getByRole('heading',{name:'先给班级起个名字。',exact:true}).waitFor();
    await owner.getByRole('button',{name:'班级设置',exact:true}).click();
    await owner.getByLabel('协作老师用户名',{exact:true}).fill('demo_teacher_2');
    await owner.getByRole('button',{name:'添加老师',exact:true}).click();
    await owner.locator('.class-teachers').waitFor({state:'detached'});
    await co.reload();
    await co.getByRole('heading',{name:'示例班级 · 星光三班',exact:true}).waitFor();
    assert.equal(await co.locator('.student-card').count(),30);
    await owner.setViewportSize({width:390,height:844});
    await owner.getByRole('button',{name:'班级设置',exact:true}).click();
    assert.equal(await owner.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
    assert.deepEqual(errors,[]);
    console.log('PASS: both demo logins, 30 students, owner-only management, UI remove/re-add, shared roster and mobile width');
  }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
