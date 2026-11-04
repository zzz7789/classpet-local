<script setup>
import {ref,computed,onMounted,onUnmounted,watch,nextTick} from 'vue';
import {levelInfo} from './game.js';
import PetFeedback from './PetFeedback.vue';
import PetDraw from './PetDraw.vue';
import Leaderboard from './Leaderboard.vue';
import PetActor from './PetActor.vue';
import PetSceneDecor from './PetSceneDecor.vue';
import {growthStage,interactionMessages} from './pet-motion.js';
const drawHistory=ref([]);
import {growthFeedback,itemFeedback} from './feedback.js';
const data=ref(null),classId=ref(''),studentId=ref(''),tab=ref('home'),petTab=ref('pet'),busy=ref(false),error=ref(''),toast=ref(''),modal=ref(''),batch=ref(false),selected=ref([]),taskId=ref(''),search=ref(''),newClass=ref(false),authMode=ref('login'),retry=ref(null),generalDialog=ref(null),partnerDialog=ref(null);
let refreshTimer,toastTimer,feedbackKey=0,interactionIndex=0;
const effects=ref({});
const effectTimers=new Map();
function showEffect(id,effect){
  clearTimeout(effectTimers.get(id));
  effects.value={...effects.value,[id]:{...effect,key:++feedbackKey}};
  effectTimers.set(id,setTimeout(()=>{delete effects.value[id];effectTimers.delete(id)},3200));
}
function clearEffects(){for(const timer of effectTimers.values())clearTimeout(timer);effectTimers.clear();effects.value={}}
const members=computed(()=>data.value?.members?.filter(x=>x.is_active)||[]);
const roster=computed(()=>members.value.filter(x=>x.name.includes(search.value)));
const tasks=computed(()=>data.value?.tasks||[]);
const activeTask=computed(()=>tasks.value.find(x=>x.id===taskId.value)||tasks.value[0]);
const eligible=computed(()=>members.value.filter(s=>!activeTask.value?.target||activeTask.value.target===s.id));
const doneIds=computed(()=>new Set((data.value?.completions||[]).filter(x=>x.task_id===activeTask.value?.id).map(x=>x.student_id)));
const undone=computed(()=>eligible.value.filter(s=>!doneIds.value.has(s.id)));
const profile=computed(()=>data.value?.selected?.seat?.id===studentId.value?data.value.selected:null);
const pet=computed(()=>profile.value?.seat);
const level=computed(()=>levelInfo(pet.value?.xp||0));
const stage=computed(()=>growthStage(pet.value?.xp||0));
const ownsDecor=id=>profile.value?.decorations?.some(d=>d.id===id)||false;
const wearsDecor=id=>pet.value?.decor?.includes(id)||false;
const bagItems=computed(()=>data.value?.products?.filter(p=>quantity(p.id)>0)||[]);
const form=e=>Object.fromEntries(new FormData(e.target));
const date=s=>s?new Date(s).toLocaleString('zh-CN',{month:'numeric',day:'numeric',hour:'2-digit',minute:'2-digit'}):'不限时';
const petName=name=>({'皮卡丘':'暖暖金毛','小火龙':'团团小熊猫','杰尼龟':'泡泡海龟'}[name]||name);
const species=id=>data.value?.species?.find(s=>s.id===id);
const quantity=id=>profile.value?.inventory?.find(i=>i.item===id)?.quantity||0;
const uuid=()=>crypto.randomUUID?.()||Array.from(crypto.getRandomValues(new Uint8Array(16)),b=>b.toString(16).padStart(2,'0')).join('');
const toggle=id=>selected.value=selected.value.includes(id)?selected.value.filter(x=>x!==id):[...selected.value,id];
function selectAll(list,checked){selected.value=checked?list.slice(0,50).map(s=>s.id):[]}
function allSelected(list){return list.length>0&&list.slice(0,50).every(s=>selected.value.includes(s.id))}
async function load(c=classId.value,s=studentId.value){const response=await fetch('/api/state'+(c?'?classId='+encodeURIComponent(c)+(s?'&seatId='+encodeURIComponent(s):''):''),{cache:'no-store'});const body=await response.json();if(response.status===401){data.value={login:true};return}if(!response.ok)throw Error(body.error||'读取失败，请重试');const state={...body.data,user:body.user,account:body.account};if(!c&&state.classes.length){const id=state.classes[0].id;classId.value=id;localStorage.setItem('classpet-local-class',id);return load(id,'')}data.value=state}
async function boot(){const saved=localStorage.getItem('classpet-local-class')||'';classId.value=saved;try{await load(saved,'')}catch{classId.value='';try{await load('','')}catch(e){error.value=e.message}}}
async function chooseClass(id){drawHistory.value=[];clearEffects();classId.value=id;localStorage.setItem('classpet-local-class',id);studentId.value='';selected.value=[];tab.value='home';newClass.value=false;error.value='';try{await load(id,'')}catch(e){error.value=e.message}}
async function openStudent(id){studentId.value=id;petTab.value='pet';error.value='';try{await load(classId.value,id)}catch(e){error.value=e.message;studentId.value=''}}
function closePet(){studentId.value='';error.value='';load(classId.value,'').catch(e=>error.value=e.message)}
function switchTab(id){tab.value=id;selected.value=[];batch.value=false;error.value=''}
async function account(action,payload={}){drawHistory.value=[];clearEffects();if(busy.value)return;busy.value=true;error.value='';try{const response=await fetch('/api/account',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action,...payload})});const result=await response.json();if(!response.ok)throw Error(result.error||'账号操作失败');modal.value='';studentId.value='';retry.value=null;if(action==='logout'){data.value={login:true};classId.value='';localStorage.removeItem('classpet-local-class');toast.value='已退出老师账号'}else if(action==='changePassword'){await load(classId.value,'');toast.value='密码已修改，其他设备需重新登录'}else{classId.value='';localStorage.removeItem('classpet-local-class');await load('','');toast.value=action==='register'?'账号已创建':'欢迎回来'}}catch(e){error.value=e.message}finally{busy.value=false}}
async function mutate(action,payload={},old=null){if(busy.value)return;if(retry.value&&!old){error.value='请先重试上次操作或刷新核对';return}busy.value=true;error.value='';const before=members.value.map(s=>({...s}));const request=old||{body:{...payload,action,classId:classId.value},key:uuid()};try{let response;try{response=await fetch('/api/action',{method:'POST',headers:{'Content-Type':'application/json','Idempotency-Key':request.key},body:JSON.stringify(request.body)})}catch{retry.value=request;throw Error('网络中断，重试上次操作不会重复加分')}const result=await response.json();if(response.status===401){data.value={login:true};throw Error('登录已过期，请重新登录')}retry.value=null;if(!response.ok)throw Error(result.error||'操作未完成');let c=classId.value,s=studentId.value;if(result.classId){c=result.classId;s='';classId.value=c;studentId.value='';localStorage.setItem('classpet-local-class',c);newClass.value=false;tab.value='home'}if(action==='toggleStudent'){s='';studentId.value=''}if(action==='createTask')taskId.value=result.taskId||'';modal.value='';selected.value=[];toast.value=action==='importStudents'?'学生和伙伴已添加':action==='completeTasks'?'已确认完成，积分已到账':action==='award'?'积分已发放':'已保存';await load(c,s);if(c===request.body.classId){const body=request.body;if(body.action==='feed'&&studentId.value===body.seatId){petTab.value='pet';const product=data.value.products.find(p=>p.id===body.item);const growth=growthFeedback(before,members.value,[body.seatId])[0];showEffect(body.seatId,{kind:'feed',...itemFeedback(product),detail:product?.id==='ball'&&growth?.kind!=='level'?'心情提升，玩得真开心！':growth?.message||'能量补充完成！'});toast.value='补给已使用'}if(['award','completeTasks'].includes(body.action)){for(const effect of growthFeedback(before,members.value,body.ids||[body.seatId]))showEffect(effect.id,effect)}if(body.action==='interact')showEffect(body.seatId,{kind:'interact',message:interactionMessages(before.find(s=>s.id===body.seatId)?.species)[interactionIndex++%3]})}}catch(e){error.value=e.message}finally{busy.value=false}}
const award=(ids,delta,reason,classroom=false)=>mutate('award',{ids,delta,reason,classroom});
const petAction=(action,body={})=>mutate(action,{seatId:studentId.value,...body});
function renamePet(){const name=prompt('伙伴的新名字',petName(pet.value.pet_name));if(name)petAction('renamePet',{name})}
function renameStudent(){const name=prompt('学生姓名',pet.value.name);if(name)mutate('renameStudent',{seatId:studentId.value,name})}
function removeStudent(){if(confirm('从名单移除 '+pet.value.name+'？积分和伙伴会保留，可在班级设置中恢复。'))mutate('toggleStudent',{seatId:studentId.value})}
function saveTask(e){const v=form(e);mutate('createTask',{...v,reward:Number(v.reward),due:v.due?new Date(v.due).toISOString():null})}
function customAward(e){const v=form(e);award([studentId.value],Number(v.delta),v.reason)}
function exportCsv(){const quote=v=>'"'+String(typeof v==='string'&&/^[=+@\-]/.test(v)?"'"+v:v??'').replaceAll('"','""')+'"';const content='\ufeff'+[['时间','学生','积分变化','原因'],...(data.value.ledger||[]).map(l=>[date(l.created),l.student,l.delta,l.reason])].map(r=>r.map(quote).join(',')).join('\r\n');const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([content],{type:'text/csv;charset=utf-8'}));a.download='积分记录.csv';a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000)}
watch(modal,async value=>{await nextTick();if(value&&!generalDialog.value?.open)generalDialog.value?.showModal()});
watch(studentId,async value=>{await nextTick();if(value&&!partnerDialog.value?.open)partnerDialog.value?.showModal()});
watch(toast,value=>{clearTimeout(toastTimer);if(value)toastTimer=setTimeout(()=>toast.value='',3500)});
const refresh=()=>{if(data.value&&!data.value.login&&!busy.value&&!document.hidden)load().catch(()=>{})};
onMounted(()=>{boot();refreshTimer=setInterval(refresh,30000);window.addEventListener('focus',refresh)});
onUnmounted(()=>{clearEffects();clearInterval(refreshTimer);clearTimeout(toastTimer);window.removeEventListener('focus',refresh)});
</script>

<template>
  <div v-if="!data" class="loading">
    <h2>萌宠伙伴</h2><p class="muted">正在连接本地服务…</p><p v-if="error" class="alert danger">{{error}}</p><button class="outline" @click="boot">重新连接</button>
  </div>
  <div v-else-if="data.login" class="simple-onboard">
    <div class="overline">欢迎来到萌宠成长乐园</div><h1>萌宠伙伴</h1><p class="muted">老师用自己的账号管理整个班级，学生不用登录。</p>
    <p v-if="error" role="alert" class="alert danger">{{error}}</p>
    <div class="login-friends" aria-hidden="true"><img src="/pets/cloud-cat.webp" alt="" /><img src="/pets/leaf-rabbit.webp" alt="" /><img src="/pets/mushroom-bear.webp" alt="" /></div><section class="card"><h2>{{authMode==='register'?'创建老师账号':'老师登录'}}</h2>
      <form class="form" @submit.prevent="account(authMode,form($event))">
        <label class="full">用户名<input name="username" autocomplete="username" minlength="3" maxlength="30" required placeholder="老师用户名" /></label>
        <label class="full">密码<input name="password" type="password" :autocomplete="authMode==='register'?'new-password':'current-password'" :minlength="authMode==='register'?8:1" maxlength="128" required placeholder="登录密码" /></label>
        <button class="primary" :disabled="busy">{{busy?'请稍候…':authMode==='register'?'创建账号':'进入班级'}}</button>
      </form>
      <button class="auth-switch" :disabled="busy" @click="authMode=authMode==='login'?'register':'login';error=''">{{authMode==='register'?'已有账号？直接登录':'第一次使用？创建老师账号'}}</button>
    </section><p class="muted">本地独立运行，不需要 OpenAI 账号。</p>
  </div>
  <div v-else-if="!data.current||newClass" class="simple-onboard">
    <div class="overline">一起学习，一起长大</div><h1>先给班级起个名字。</h1><p class="muted">接着填学生名单，就能开始养伙伴、记奖励。</p>
    <p v-if="error" class="alert danger">{{error}}</p>
    <section class="card"><form class="form" @submit.prevent="mutate('createClass',form($event))"><label>班级名称<input name="name" required maxlength="50" placeholder="例如：七年级一班" /></label><button class="primary" :disabled="busy">创建班级</button></form></section>
    <button v-if="data.classes?.length" class="outline section" @click="newClass=false">返回班级</button>
    <div class="onboard-pets"><img v-for="s in data.species" :key="s.id" :src="s.image" :alt="s.name" /></div>
    <button class="auth-switch" :disabled="busy" @click="account('logout')">退出老师账号</button>
  </div>
  <div v-else class="simple-shell">
    <header class="simple-header"><div class="simple-brand"><span aria-hidden="true">🐾</span> 萌宠伙伴</div><div class="actions"><select v-if="data.classes.length>1" aria-label="选择班级" :value="classId" @change="chooseClass($event.target.value)"><option v-for="c in data.classes" :key="c.id" :value="c.id">{{c.name}}</option></select><button class="outline" @click="modal='settings'">班级设置</button></div></header>
    <nav class="simple-tabs"><button v-for="[id,icon,label] in [['home','🐾','班级宠物'],['tasks','🌟','作业打卡'],['leaderboard','🏆','排行榜'],['records','🍀','积分记录']]" :key="id" :class="{active:tab===id}" @click="switchTab(id)">{{icon}} {{label}}</button></nav>
    <main class="simple-main">
      <p v-if="error" role="alert" class="alert danger">{{error}}</p>
      <div v-if="retry" class="alert"><button class="primary" :disabled="busy" @click="mutate(retry.body.action,{},retry)">重试上次操作</button> <button class="outline" @click="load().then(()=>{retry=null;error=''})">刷新核对</button></div>
      <template v-if="tab==='home'">
        <div class="simple-intro"><div><div class="overline">一起学习，一起长大</div><h1>{{data.current.name}}</h1><p class="muted">每一次小进步，都陪着伙伴长大一点点。</p></div><div class="actions"><button class="soft" :disabled="busy||!members.length" @click="modal='draw'">✋ 宠物举爪抽答</button><button class="outline" @click="batch=!batch;selected=[]">{{batch?'取消多选':'批量加分'}}</button><button class="primary" @click="modal='add'">＋ 添加学生</button></div></div>
        <div v-if="members.length" class="simple-tools"><input v-model="search" aria-label="查找学生" placeholder="查找学生姓名" /><span class="muted">{{members.length}} 位学生 · 每个人都有自己的伙伴</span></div>
        <div v-if="batch" class="batch-bar"><label><input type="checkbox" :checked="allSelected(roster)" @change="selectAll(roster,$event.target.checked)" />全选</label><span class="muted">已选 {{selected.length}} 人</span><button class="primary" :disabled="busy||!selected.length" @click="award(selected,3,'课堂回答',true)">回答问题 +3</button><button class="soft" :disabled="busy||!selected.length" @click="award(selected,10,'课堂表现')">课堂表现 +10</button><span class="muted">每批最多50人</span></div>
        <div class="student-grid"><article v-for="s in roster" :key="s.id" class="student-card" :class="{picked:selected.includes(s.id)}"><label v-if="batch" class="student-check"><input :aria-label="'选择'+s.name" type="checkbox" :checked="selected.includes(s.id)" @change="toggle(s.id)" /></label><button class="student-main" @click="batch?toggle(s.id):openStudent(s.id)"><div class="student-scene" :class="effects[s.id] ? 'react-'+effects[s.id].kind : ''"><PetFeedback :effect="effects[s.id]" /><PetSceneDecor :xp="s.xp" :equipped="s.decor||[]" /><PetActor :xp="s.xp" :species="s.species" :portrait="species(s.species)?.image" :name="petName(s.pet_name)" :effect="effects[s.id]" /><span class="student-level">Lv.{{levelInfo(s.xp).level}}</span></div><div class="student-info"><strong>{{s.name}}</strong><span>{{s.balance}} 积分</span></div><div class="student-petname">{{petName(s.pet_name)}}</div></button><button v-if="!batch" class="student-answer" :disabled="busy" @click="award([s.id],3,'课堂回答',true)">＋3 回答问题</button></article></div>
        <section v-if="!members.length" class="empty-class"><img src="/pets/partner.webp" alt="萌宠伙伴" /><h2>把学生名单填进来，就能开始了。</h2><p class="muted">每行一个名字，自动为每人分配一只伙伴。</p><button class="primary" @click="modal='add'">添加学生名单</button></section>
        <p v-else-if="!roster.length" class="no-data">没有找到这位学生。</p>
      </template>
      <template v-else-if="tab==='tasks'">
        <div class="simple-intro"><div><div class="overline">HOMEWORK / 作业打卡</div><h1>勾上完成的学生，直接加分。</h1><p class="muted">老师确认即可，不需要学生提交申请。</p></div><button class="primary" @click="modal='task'">＋ 新增作业</button></div>
        <section v-if="!tasks.length" class="card empty-class"><h2>先添加一项作业</h2><p class="muted">比如“今日数学作业”，完成后每人奖励10积分。</p><button class="primary" @click="modal='task'">新增作业</button></section>
        <section v-else class="card"><div class="simple-tools"><select aria-label="选择作业" :value="activeTask.id" @change="taskId=$event.target.value;selected=[]"><option v-for="t in tasks" :key="t.id" :value="t.id">{{t.title}}{{t.status==='closed'?'（已关闭）':''}}</option></select><span class="badge">完成 +{{activeTask.reward}} 积分</span><span class="muted">{{doneIds.size}} / {{eligible.length}} 人已完成</span></div>
          <p v-if="activeTask.description" class="muted">{{activeTask.description}}</p>
          <div v-if="activeTask.status==='open'" class="batch-bar"><label><input type="checkbox" :checked="allSelected(undone)" @change="selectAll(undone,$event.target.checked)" />选择未完成的学生</label><button class="primary" :disabled="busy||!selected.length" @click="mutate('completeTasks',{taskId:activeTask.id,ids:selected})">确认完成 ({{selected.length}})</button></div>
          <div class="homework-grid"><label v-for="s in eligible" :key="s.id" class="homework-student" :class="{done:doneIds.has(s.id)}"><input type="checkbox" :checked="doneIds.has(s.id)||selected.includes(s.id)" :disabled="busy||doneIds.has(s.id)||activeTask.status==='closed'" @change="toggle(s.id)" /><span>{{s.name}}</span><small>{{doneIds.has(s.id)?'已完成':'待确认'}}</small></label></div>
          <p v-if="!members.length" class="muted">先在“班级宠物”添加学生。</p>
          <details class="simple-details"><summary>更多操作</summary><button class="outline" :disabled="busy" @click="mutate('closeTask',{taskId:activeTask.id,reopen:activeTask.status==='closed'})">{{activeTask.status==='closed'?'重新开放这项作业':'关闭这项作业'}}</button></details>
        </section>
      </template>
      <Leaderboard v-else-if="tab==='leaderboard'" :key="classId" :members="data.members" :completions="data.completions" :species="data.species" :class-name="data.current.name" @open-student="openStudent" @add-students="modal='add'" />
      <section v-else class="card"><div class="row"><h2>最近积分记录</h2><button class="outline" @click="exportCsv">导出表格</button></div><div v-for="l in data.ledger" :key="l.id" class="task"><div><strong>{{l.student}} · {{l.reason}}</strong><small>{{date(l.created)}}</small></div><span :class="l.delta>0?'ledger-positive':'ledger-negative'">{{l.delta>0?'+':''}}{{l.delta}}</span></div><p v-if="!data.ledger?.length" class="no-data">还没有积分变化。</p><p class="muted">展示最近200条，完整数据可在班级设置中备份。</p></section>
      <footer class="simple-footer">{{busy?'正在保存…':'已自动保存到本地数据库'}} · 老师管理，全班一起成长</footer>
    </main>
  </div>

  <dialog v-if="studentId" ref="partnerDialog" class="partner-dialog" @cancel.prevent="closePet">
    <div class="row"><div><div class="overline">PARTNER / 伙伴档案</div><h2>{{pet?.name||'学生伙伴'}} <span class="badge">{{pet?pet.balance+' 积分':''}}</span></h2></div><button class="outline" @click="closePet">关闭</button></div>
    <div class="partner-tabs"><button v-for="[id,label] in [['pet','伙伴'],['shop','补给'],['bag','背包'],['home','小窝'],['records','记录']]" :key="id" :class="{active:petTab===id}" @click="petTab=id">{{label}}</button></div>
    <p v-if="error" role="alert" class="alert danger">{{error}}</p>
    <div v-if="retry" class="alert"><button class="primary" :disabled="busy" @click="mutate(retry.body.action,{},retry)">重试上次操作</button></div>
    <p v-if="!profile" class="loading">正在打开伙伴…</p>
    <template v-else-if="petTab==='pet'">
      <div class="petScene" :class="effects[pet.id] ? 'react-'+effects[pet.id].kind : ''"><PetSceneDecor :xp="pet.xp" :equipped="pet.decor||[]" /><PetFeedback :effect="effects[pet.id]" /><span v-if="!effects[pet.id]" class="bubble">点点我，今天也一起加油吧！</span><button class="pet" style="border:0;padding:0;background:transparent" :disabled="busy" aria-label="与伙伴互动" @click="petAction('interact')"><PetActor active :xp="pet.xp" :species="pet.species" :portrait="species(pet.species)?.image" :name="petName(pet.pet_name)" :effect="effects[pet.id]" /></button><div v-if="!effects[pet.id]" class="scene-label">🌼 伙伴的秘密花园</div></div>
      <div class="growth-journey"><strong>{{stage.name}}伙伴 · Lv.{{stage.level}}</strong><span>{{stage.nextLevel?'到 Lv.'+stage.nextLevel+' 解锁下一阶段外观':'成熟形态已解锁，继续一起成长吧'}}</span><div class="growth-steps"><span :class="{reached:stage.level>=1}">幼年 Lv.1</span><span :class="{reached:stage.level>=3}">成长 Lv.3</span><span :class="{reached:stage.level>=6}">成熟 Lv.6</span></div></div><div class="pet-summary"><div class="petname">{{petName(pet.pet_name)}} <span class="badge">Lv.{{level.level}}</span></div><button class="outline" :disabled="busy" @click="renamePet">改名字</button></div>
      <div class="stat"><div class="statline"><span>成长经验</span><span>{{level.current}} / {{level.next}}</span></div><div class="track"><div class="fill" :style="{width:Math.min(100,level.current/level.next*100)+'%',background:'#91ac6a'}"></div></div></div>
      <div class="stat"><div class="statline"><span>能量</span><span>{{pet.energy}} / 100</span></div><div class="track"><div class="fill" :style="{width:pet.energy+'%',background:'#76a58d'}"></div></div></div>
      <div class="quick"><button class="primary" @click="petTab='bag'">喂食 / 玩耍</button><button class="soft" @click="petTab='shop'">买点补给</button><button class="outline" :disabled="busy" @click="award([pet.id],3,'课堂回答',true)">回答问题 +3</button></div>
      <details class="simple-details partner-picker">
        <summary>更换伙伴 · {{data.species.length}} 只伙伴可选</summary>
        <p class="muted">挑一只新伙伴，积分、经验和背包都会保留。</p>
        <form @submit.prevent="petAction('changeSpecies',form($event))">
          <fieldset :key="pet.id+':'+pet.species" :disabled="busy" class="species-options">
            <legend class="species-legend">选择伙伴</legend>
            <label v-for="s in data.species" :key="s.id" class="species-option">
              <input type="radio" name="species" :value="s.id" :checked="s.id===pet.species" required />
              <span class="species-tile"><img :src="s.image" alt="" /><strong>{{s.name}}</strong><small>{{s.type}}伙伴<span v-if="s.id===pet.species"> · 当前伙伴</span></small></span>
            </label>
          </fieldset>
          <button class="outline" :disabled="busy">更换伙伴</button>
        </form>
      </details>
      <details class="simple-details"><summary>其他奖励与学生管理</summary><form class="form" @submit.prevent="customAward"><label>积分<input name="delta" type="number" value="10" min="-100" max="100" required /></label><label>原因<input name="reason" value="课堂表现" maxlength="100" required /></label><button class="primary" :disabled="busy">确认</button></form><p class="muted">填负数可纠正积分，原有记录会保留。</p><div class="actions"><button class="outline" :disabled="busy" @click="renameStudent">修改学生姓名</button><button class="outline danger" :disabled="busy" @click="removeStudent">从名单移除</button></div></details>
    </template>
    <template v-else-if="petTab==='shop'||petTab==='bag'">
      <p class="muted">{{petTab==='bag'?'点“使用”给伙伴补充能量，获得经验。':'用积分换补给，买好后在“背包”里使用。'}}</p>
      <div class="items"><div v-for="p in petTab==='bag'?bagItems:data.products" :key="p.id" class="card item"><div class="emoji"><img class="sprite-item" :src="'/items/'+p.id+'.webp'" :alt="p.name" /></div><strong>{{p.name}}</strong><p class="muted">经验 +{{p.xp}} · 能量 +{{p.energy}}</p><p class="price">{{petTab==='bag'?'剩余 '+quantity(p.id)+' 份':p.price+' 积分'}}</p><button class="primary" :disabled="busy||(petTab==='shop'&&pet.balance<p.price)" @click="petAction(petTab==='bag'?'feed':'buy',{item:p.id})">{{petTab==='bag'?'使用':'购买'}}</button></div></div>
      <div v-if="petTab==='bag'&&!bagItems.length" class="no-data">背包暂时是空的。<button class="soft" @click="petTab='shop'">去买补给</button></div>
    </template>
    <template v-else-if="petTab==='home'">
      <div class="habitat-preview petScene"><PetSceneDecor :xp="pet.xp" :equipped="pet.decor||[]" /><PetActor active :xp="pet.xp" :species="pet.species" :portrait="species(pet.species)?.image" :name="petName(pet.pet_name)" /></div>
      <h3>给伙伴布置一个小窝</h3><p class="muted">购买后永久拥有并自动摆好，随时可以收起或重新布置。使用现有积分，不影响成长经验。</p>
      <div class="decor-shop"><article v-for="d in data.decorations||[]" :key="d.id" class="decor-card"><img :src="d.image" :alt="d.name" /><strong>{{d.name}}</strong><span class="muted">{{ownsDecor(d.id)?(wearsDecor(d.id)?'已布置':'已拥有'):d.price+' 积分'}}</span><button :class="ownsDecor(d.id)?'outline':'primary'" :disabled="busy||!!retry||(!ownsDecor(d.id)&&pet.balance<d.price)" @click="petAction(ownsDecor(d.id)?'equipDecoration':'buyDecoration',{item:d.id,equipped:!wearsDecor(d.id)})">{{ownsDecor(d.id)?(wearsDecor(d.id)?'收起来':'布置小窝'):'购买并布置'}}</button></article></div>
    </template>
    <section v-else class="card"><h2>这个伙伴的积分记录</h2><div v-for="l in profile.ledger" :key="l.id" class="task"><div><strong>{{l.reason}}</strong><small>{{date(l.created)}}</small></div><span :class="l.delta>0?'ledger-positive':'ledger-negative'">{{l.delta>0?'+':''}}{{l.delta}}</span></div><p v-if="!profile.ledger.length" class="no-data">暂无积分变化</p></section>
  </dialog>

  <dialog v-if="modal" ref="generalDialog" @cancel.prevent="modal=''">
    <button class="outline close" @click="modal=''">关闭</button><p v-if="error" role="alert" class="alert danger">{{error}}</p>
    <template v-if="modal==='add'"><h2>添加学生</h2><p class="muted">每行一个名字，也可以直接粘贴名单。</p><form @submit.prevent="mutate('importStudents',form($event))"><textarea name="names" required maxlength="5000" placeholder="张三&#10;李四&#10;王五"></textarea><p class="hint">每人自动分配一只宠物和一份口粮。</p><button class="primary" :disabled="busy">添加到班级</button></form></template>
    <template v-else-if="modal==='task'"><h2>新增作业</h2><form class="form" @submit.prevent="saveTask"><label>作业名称<input name="title" :value="new Date().toLocaleDateString('zh-CN',{month:'numeric',day:'numeric'})+'作业'" required maxlength="60" /></label><label>完成奖励<input name="reward" type="number" value="10" min="1" max="100" required /></label><details class="simple-details full"><summary>更多设置（可不填）</summary><label>截止时间<input name="due" type="datetime-local" /></label><label>适用学生<select name="target"><option value="">全班</option><option v-for="s in members" :key="s.id" :value="s.id">{{s.name}}</option></select></label><label>作业说明<textarea name="description" maxlength="1000"></textarea></label></details><button class="primary" :disabled="busy">添加作业</button></form><p class="muted">勾选完成的学生，由老师直接确认加分。</p></template>
    <template v-else-if="modal==='draw'"><PetDraw :members="members" :species="data.species" :history="drawHistory" :busy="busy||!!retry" @drawn="drawHistory=$event" @award="award([$event],3,'课堂回答',true)" /></template>
    <template v-else><h2>班级设置</h2><form class="form" @submit.prevent="mutate('renameClass',form($event))"><label>班级名称<input name="name" :value="data.current.name" required maxlength="50" /></label><button class="outline" :disabled="busy">保存名称</button></form><div class="actions"><button class="soft" @click="modal='';newClass=true">再建一个班级</button><a class="outline" :href="'/api/state?export=1&classId='+encodeURIComponent(classId)">备份班级数据</a></div>
      <section class="class-teachers">
        <h3>本班老师</h3>
        <p class="muted">共同管理学生、作业、奖励和伙伴；班级创建者负责添加、移除老师。</p>
        <div v-for="t in data.teachers||[]" :key="t.id" class="task"><div><strong>{{t.username}}</strong><small>{{t.is_owner?'班级创建者':'协作老师'}}</small></div><button v-if="data.canManageTeachers&&!t.is_owner" class="outline" :disabled="busy" @click="mutate('removeTeacher',{teacherId:t.id})">移出本班</button></div>
        <form v-if="data.canManageTeachers" class="form" @submit.prevent="mutate('addTeacher',form($event))"><label>协作老师用户名<input name="username" required maxlength="30" placeholder="填写已注册的老师用户名" /></label><button class="primary" :disabled="busy">添加老师</button></form>
        <p class="muted">新老师先在登录页注册自己的账号，加入后重新登录或刷新页面即可看到本班。</p>
      </section>
      <details v-if="data.members.some(s=>!s.is_active)" class="simple-details"><summary>已移除的学生</summary><div v-for="s in data.members.filter(s=>!s.is_active)" :key="s.id" class="task"><strong>{{s.name}}</strong><button class="outline" :disabled="busy" @click="mutate('toggleStudent',{seatId:s.id})">恢复到名单</button></div></details>
      <details class="simple-details"><summary>老师账号与密码</summary><p class="muted">当前账号：{{data.account.username}}</p><form class="form" @submit.prevent="account('changePassword',form($event))"><label>当前密码<input name="currentPassword" type="password" autocomplete="current-password" required maxlength="128" /></label><label>新密码<input name="password" type="password" autocomplete="new-password" required minlength="8" maxlength="128" /></label><button class="outline" :disabled="busy">修改密码</button></form></details><p class="muted section">数据保存在本机 MySQL，浏览器刷新和容器重启都不会清空。</p><button class="outline" :disabled="busy" @click="account('logout')">退出老师账号</button>
    </template>
  </dialog>
  <div v-if="toast" class="toast" role="status">{{toast}}</div>
</template>

