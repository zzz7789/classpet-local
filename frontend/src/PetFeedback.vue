<script setup>
defineProps({effect:Object});
</script>

<template>
  <span v-if="effect" :key="effect.key" class="pet-feedback" :class="['feedback-'+effect.kind,effect.action?'action-'+effect.action:'']" role="status">
    <span class="feedback-message">{{effect.message}}</span>
    <template v-if="effect.kind==='feed'">
      <img v-if="effect.image" class="feeding-item" :src="effect.image" alt="" />
      <span class="feeding-detail">{{effect.detail}}</span>
    </template>
    <span class="feedback-face" aria-hidden="true">{{effect.kind==='interact'?'♥':'✦'}}</span>
    <span v-if="effect.kind!=='interact'" class="feedback-stars" aria-hidden="true"><i v-for="n in 5" :key="n" :style="{'--n':n}">★</i></span>
  </span>
</template>
