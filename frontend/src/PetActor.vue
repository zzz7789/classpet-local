<script setup>
import {ref, computed, watch, onMounted, onUnmounted} from 'vue';
import {motionState, motionSheet, framePosition, growthStage, idleDelay, motionSequence} from './pet-motion.js';
const props = defineProps({species:String, portrait:String, name:String, xp:{type:Number,default:0}, effect:Object, active:{type:Boolean,default:false}});
const host = ref(null), ready = ref(false), assetState = ref('loading'), frame = ref(0), reduced = ref(false), playing = ref('idle');
const state = computed(() => (!props.active || reduced.value) ? 'idle' : playing.value);
const stage = computed(() => growthStage(props.xp));
const sheet = computed(() => motionSheet(props.species));
const position = computed(() => framePosition(state.value, frame.value));
let timer, observer, media, loader, mounted = false, visible = false, step = 0, nextGesture = 0;
function stop(){clearTimeout(timer);timer = undefined;}
function canAnimate(){return mounted && props.active && ready.value && !reduced.value && visible && !document.hidden;}
function begin(next){playing.value = next;step = 0;frame.value = 0;}
function schedule(){
  stop();
  if (!canAnimate()) return;
  const sequence = motionSequence(props.species, playing.value);
  timer = setTimeout(() => {
    if (!canAnimate()) return;
    step++;
    if (step >= sequence.length) {
      if (playing.value !== 'idle') {
        begin('idle');nextGesture = Date.now() + idleDelay(props.species);
      } else if (!props.effect && Date.now() >= nextGesture) {
        begin('interact');
      } else begin('idle');
    } else frame.value = sequence[step].frame;
    schedule();
  }, sequence[step].duration);
}
function reset(){
  begin(props.active && !reduced.value ? motionState(props.effect) : 'idle');
  nextGesture = Date.now() + idleDelay(props.species);schedule();
}
function preference(){reduced.value = media.matches;reset();}
watch(() => props.effect?.key, reset);
watch(() => props.active, reset);
watch(sheet, () => {
  ready.value = false;assetState.value = 'loading';stop();begin('idle');
  nextGesture = Date.now() + idleDelay(props.species);
  if(loader){loader.onload = null;loader.onerror = null;}
  loader = new Image();
  loader.onload = () => {ready.value = true;assetState.value = 'ready';reset();};
  loader.onerror = () => {ready.value = false;assetState.value = 'error';stop();};
  loader.src = sheet.value;
}, {immediate:true});
onMounted(() => {
  mounted = true;media = window.matchMedia('(prefers-reduced-motion: reduce)');
  preference();media.addEventListener('change', preference);
  observer = new IntersectionObserver(entries => {visible = entries[0].isIntersecting;schedule();});
  observer.observe(host.value);document.addEventListener('visibilitychange', schedule);
});
onUnmounted(() => {
  mounted = false;stop();observer?.disconnect();media?.removeEventListener('change', preference);
  document.removeEventListener('visibilitychange', schedule);
  if(loader){loader.onload = null;loader.onerror = null;}
});
</script>
<template>
  <span ref="host" class="pet-actor" :class="'stage-'+stage.id" :data-stage="stage.id" :data-motion="state" :data-frame="frame" :data-ready="ready" :data-asset-state="assetState" :data-sheet="sheet" role="img" :aria-label="name">
    <span v-if="ready" class="pet-frames" aria-hidden="true" :style="{backgroundImage:`url(${sheet})`,backgroundPosition:position}"></span>
    <img v-else class="pet-fallback" :src="portrait" alt="" aria-hidden="true" />
  </span>
</template>
