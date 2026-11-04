<script setup>
import {computed,ref} from 'vue';
import {levelInfo} from './game.js';
import {rankingModes,rankStudents} from './leaderboard.js';
const props=defineProps({members:{type:Array,default:()=>[]},completions:{type:Array,default:()=>[]},species:{type:Array,default:()=>[]},className:String});
const emit=defineEmits(['openStudent','addStudents']);
const mode=ref('points'),search=ref('');
const currentMode=computed(()=>rankingModes.find(m=>m.id===mode.value));
const ranked=computed(()=>rankStudents(props.members,props.completions,mode.value));
const filtered=computed(()=>ranked.value.filter(s=>s.name.includes(search.value.trim())));
const leaders=computed(()=>ranked.value.slice(0,3));
const portrait=s=>props.species.find(p=>p.id===s.species)?.image||'/pets/partner.webp';
</script>

<template>
  <section class="leaderboard" aria-label="班级排行榜">
    <div class="simple-intro">
      <div><h1>班级排行榜</h1><p class="muted">{{className}} · 和伙伴一起，记录每一次进步。</p></div>
      <span class="leaderboard-mark" aria-hidden="true">🏆</span>
    </div>
    <div class="leaderboard-modes" role="group" aria-label="排行依据">
      <button v-for="option in rankingModes" :key="option.id" :aria-pressed="mode===option.id" @click="mode=option.id">{{option.label}}</button>
    </div>
    <p class="leaderboard-rule">{{currentMode.description}} 同分并列，下一名顺延；仅统计在册学生。</p>
    <section v-if="!ranked.length" class="empty-class">
      <img src="/pets/partner.webp" alt="萌宠伙伴" /><h2>添加学生，开启班级排行榜。</h2>
      <p class="muted">奖励积分、养育伙伴、完成作业，都能留下成长的足迹。</p>
      <button class="primary" @click="emit('addStudents')">添加学生名单</button>
    </section>
    <template v-else>
      <div v-if="!search.trim()" class="leaderboard-podium" aria-label="榜单前三位学生">
        <button v-for="s in leaders" :key="s.id" class="leaderboard-star" :class="'place-'+s.rank" :aria-label="'查看'+s.name+'的伙伴，第'+s.rank+'名，'+s.score+currentMode.unit" @click="emit('openStudent',s.id)">
          <span class="leaderboard-medal">{{s.rank===1?'🥇':s.rank===2?'🥈':'🥉'}} <span>第 {{s.rank}} 名</span></span>
          <img :src="portrait(s)" alt="" /><strong>{{s.name}}</strong>
          <span class="leaderboard-star-score">{{s.score}} <small>{{currentMode.unit}}</small></span>
        </button>
      </div>
      <section class="card leaderboard-roster" aria-label="完整排名">
        <div class="leaderboard-tools">
          <h2>全班排名 <small>{{ranked.length}} 位学生</small></h2>
          <input v-model="search" type="search" aria-label="在排行榜查找学生" placeholder="查找学生姓名" />
        </div>
        <p v-if="search.trim()" class="muted" role="status">找到 {{filtered.length}} 位学生，名次保持全班排名。</p>
        <div v-if="filtered.length" class="leaderboard-columns" aria-hidden="true"><span>名次</span><span>学生与伙伴</span><span>{{mode==='points'?'累计积分':mode==='xp'?'累计经验':'完成次数'}}</span></div>
        <ol class="leaderboard-list" aria-label="学生排名">
          <li v-for="s in filtered" :key="s.id" :data-student-id="s.id" :data-rank="s.rank">
            <button class="leaderboard-student" @click="emit('openStudent',s.id)">
              <span class="leaderboard-rank" :class="{'in-top':s.rank<=3}" :aria-label="'第'+s.rank+'名'">{{s.rank}}</span>
              <span class="leaderboard-person"><img :src="portrait(s)" alt="" /><span><strong>{{s.name}}</strong><small>Lv.{{levelInfo(s.xp).level}} · 余额 {{s.balance}} 积分</small></span></span>
              <span class="leaderboard-score">{{s.score}}<small>{{currentMode.unit}}</small></span>
            </button>
          </li>
        </ol>
        <div v-if="!filtered.length" class="no-data"><p>没有找到这位学生。</p><button class="outline" @click="search=''">清空搜索</button></div>
        <p class="muted leaderboard-note">点击学生可以查看伙伴、发放奖励。数据会随班级操作更新，并每30秒自动刷新。</p>
      </section>
    </template>
  </section>
</template>

<style scoped>
.leaderboard-mark{font-size:48px;line-height:1}
.leaderboard-modes{display:flex;gap:8px;flex-wrap:wrap}
.leaderboard-modes button{padding:11px 22px;border:2px solid #d3e7d6;border-radius:16px;background:#fffefa;color:#557265;font-weight:700}
.leaderboard-modes button[aria-pressed=true]{background:#4c9b7b;border-color:#428a6d;color:#fff}
.leaderboard-rule{color:#557265;font-size:12px;line-height:1.9;margin:14px 0 24px}
.leaderboard-podium{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:18px;margin-bottom:28px}
.leaderboard-star{display:flex;flex-direction:column;align-items:center;min-width:0;padding:18px 12px 20px;border:2px solid #d3e7d6;border-bottom:7px solid #b9d9c7;border-radius:24px;background:#fffefa;color:#45534d;gap:6px}
.leaderboard-star.place-1{border-color:#edda9f;border-bottom-color:#e5bf65;background:#fffbec}
.leaderboard-star.place-2{border-color:#ccdfdf;border-bottom-color:#a7c6ca}
.leaderboard-medal{font-size:24px;display:flex;gap:7px;align-items:center}
.leaderboard-medal>span{font-size:12px;font-weight:700;color:#557265}
.leaderboard-star>img{width:104px;height:104px;object-fit:contain}
.leaderboard-star>strong{font-size:17px;overflow-wrap:anywhere}
.leaderboard-star-score{font-weight:800;font-size:24px;color:#36765c;font-variant-numeric:tabular-nums}
.leaderboard-star-score small{font-size:12px;font-weight:500}
.leaderboard-tools{display:flex;justify-content:space-between;align-items:center;gap:14px;flex-wrap:wrap;margin-bottom:16px}
.leaderboard-tools h2{margin:0}
.leaderboard-tools h2 small{font-weight:400;font-size:12px;color:#64796e;margin-left:8px}
.leaderboard-tools input{padding:11px 16px;border:2px solid #d8e7d9;border-radius:25px;background:#fffefa;max-width:100%;min-width:0;color:#45534d}
.leaderboard-columns,.leaderboard-student{display:grid;grid-template-columns:58px minmax(0,1fr) minmax(76px,auto);align-items:center;gap:14px}
.leaderboard-columns{font-size:12px;color:#64796e;padding:0 12px 12px;border-bottom:2px dashed #d9e9d7}
.leaderboard-columns>span:last-child{text-align:right}
.leaderboard-list{list-style:none;margin:0;padding:0}
.leaderboard-list>li+li{border-top:1px solid #e5eee0}
.leaderboard-student{width:100%;padding:14px 12px;text-align:left;background:transparent;color:#45534d;border-radius:12px}
.leaderboard-student:hover{background:#edf8ef}
.leaderboard-rank{width:36px;height:36px;display:grid;place-items:center;font-weight:800;font-size:16px;border-radius:12px;color:#64796e;font-variant-numeric:tabular-nums}
.leaderboard-rank.in-top{background:#fff1cc;color:#7d692c}
.leaderboard-person{display:flex;align-items:center;gap:12px;min-width:0}
.leaderboard-person>img{width:48px;height:48px;object-fit:contain;flex:none;background:#edf5e9;border-radius:16px}
.leaderboard-person>span{min-width:0}
.leaderboard-person strong{display:block;overflow-wrap:anywhere;font-size:14px}
.leaderboard-person small{display:block;font-size:11px;color:#64796e;margin-top:5px;line-height:1.7}
.leaderboard-score{text-align:right;font-size:22px;font-weight:800;color:#36765c;font-variant-numeric:tabular-nums;overflow-wrap:anywhere}
.leaderboard-score small{display:block;color:#64796e;font-size:11px;font-weight:400;margin-top:3px}
.leaderboard-note{margin:18px 0 0}
@media(max-width:600px){
  .leaderboard .simple-intro{flex-direction:row;align-items:center}
  .leaderboard-mark{font-size:34px}
  .leaderboard-modes{gap:7px}
  .leaderboard-modes button{flex:1;padding:10px 8px}
  .leaderboard-podium{gap:8px;margin-bottom:22px}
  .leaderboard-star{padding:12px 5px;border-radius:18px;gap:5px}
  .leaderboard-star>img{width:70px;max-width:100%;height:70px}
  .leaderboard-star>strong{font-size:13px}
  .leaderboard-medal{font-size:19px;gap:3px;flex-direction:column}
  .leaderboard-medal>span{font-size:11px}
  .leaderboard-star-score{font-size:19px}
  .leaderboard-star-score small{display:block;font-size:10px}
  .leaderboard-tools{gap:14px}
  .leaderboard-tools input{width:100%}
  .leaderboard-columns,.leaderboard-student{grid-template-columns:32px minmax(0,1fr) 62px;gap:8px;padding-left:0;padding-right:0}
  .leaderboard-rank{width:30px;height:30px;font-size:14px}
  .leaderboard-person{gap:7px}
  .leaderboard-person>img{width:36px;height:36px;border-radius:12px}
  .leaderboard-score{font-size:19px}
}
</style>
