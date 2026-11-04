<script setup>
import {ref,computed,onUnmounted,nextTick} from 'vue';
import {pickStudent} from './draw.js';
const props=defineProps({members:Array,species:Array,history:Array,busy:Boolean});
const emit=defineEmits(['drawn','award']);
const running=ref(false),winnerId=ref('');
const camp=ref(null),highlightId=ref('');
const winner=computed(()=>props.members.find(s=>s.id===winnerId.value));
const remaining=computed(()=>props.members.filter(s=>!props.history.includes(s.id)).length);
let timer,highlightTimer;
function draw(){
  if(running.value||props.busy||!props.members.length)return;
  winnerId.value='';running.value=true;
  if(!window.matchMedia('(prefers-reduced-motion: reduce)').matches){let index=0;highlightId.value=props.members[0].id;highlightTimer=setInterval(()=>{highlightId.value=props.members[++index%props.members.length].id},180)}
  timer=setTimeout(async()=>{
    const result=pickStudent(props.members,props.history);
    if(result){winnerId.value=result.winner.id;emit('drawn',result.history)}
    clearInterval(highlightTimer);highlightId.value='';running.value=false;
    await nextTick();
    const card=camp.value?.querySelector('.draw-pet.chosen');
    if(card){
      card.focus({preventScroll:true});
      card.scrollIntoView({block:'center',inline:'nearest',behavior:window.matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth'});
    }
  },1600);
}
onUnmounted(()=>{clearTimeout(timer);clearInterval(highlightTimer)});
</script>

<template>
  <section class="pet-draw">
    <h2>谁的小爪举起来啦？</h2>
    <p class="muted">本轮不重复，全班轮完再开始新一轮。记录保留到刷新页面或切换班级。</p>
    <div class="draw-result" role="status" aria-live="polite">
      <template v-if="running">小伙伴们正在举爪……</template>
      <template v-else-if="winner"><strong>{{winner.name}}</strong><span>{{winner.pet_name}} 举爪啦，请你来试试！</span></template>
      <template v-else>准备好了吗？让伙伴帮我们选一位同学。</template>
    </div>
    <div ref="camp" class="draw-camp" :class="{drawing:running}">
      <div v-for="s in members" :key="s.id" class="draw-pet" tabindex="-1" :aria-label="(!running&&winnerId===s.id?'抽中同学：':'同学：')+s.name" :class="{highlighted:running&&highlightId===s.id,chosen:!running&&winnerId===s.id,visited:history.includes(s.id)&&winnerId!==s.id}">
        <div class="draw-sprite"><img :src="species.find(p=>p.id===s.species)?.image" :alt="s.pet_name" /><span class="raised-paw" aria-hidden="true">✋</span></div>
        <span>{{s.name}}</span>
      </div>
    </div>
    <p class="muted">{{members.length?'本轮还有 '+remaining+' 位未抽到'+(remaining?'':'，下次开启新一轮'):'先添加学生，再邀请伙伴举爪吧。'}}</p>
    <div class="actions">
      <button class="primary" :disabled="running||busy||!members.length" @click="draw">{{running?'正在举爪…':winner?'再抽一位':'开始抽答'}}</button>
      <button v-if="winner&&!running" class="soft" :disabled="busy" @click="emit('award',winner.id)">回答完成 +3</button>
    </div>
    <p class="draw-note">抽中只负责点名；点击“回答完成”才会发放课堂奖励。</p>
  </section>
</template>
