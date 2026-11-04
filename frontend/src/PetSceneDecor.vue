<script setup>
import {computed} from 'vue';
import {growthStage} from './pet-motion.js';
const props=defineProps({xp:{type:Number,default:0},equipped:{type:Array,default:()=>[]}});
const stage=computed(()=>growthStage(props.xp));
</script>
<template>
  <span class="scene-decor" aria-hidden="true">
    <img v-for="id in equipped" :key="id" :src="'/decor/'+id+'.webp'" :class="'decor-'+id" alt="" />
    <img v-if="stage.id==='growing'" class="growth-star" src="/decor/growth-star.webp" alt="" />
    <img v-if="stage.id==='mature'" class="growth-crown" src="/decor/growth-crown.webp" alt="" />
  </span>
</template>
