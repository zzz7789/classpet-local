import {levelInfo} from './game.js';

export function growthStage(xp = 0) {
  const {level} = levelInfo(Math.max(0, Number(xp) || 0));
  if (level < 3) return {id:'baby', name:'幼年', level, nextLevel:3};
  if (level < 6) return {id:'growing', name:'成长', level, nextLevel:6};
  return {id:'mature', name:'成熟', level, nextLevel:null};
}

const personalities = {
  electric: {pause:8000, beat:330, messages:['抬起小爪，和你打个招呼！','挥挥小爪，今天也陪着你。','开心地眯起眼睛，收到你的关心啦！']},
  fire: {pause:10500, beat:380, messages:['举起小爪，想和你做朋友！','轻轻挥爪，和你说声你好。','眯眼笑一笑，见到你真开心！']},
  water: {pause:14000, beat:520, messages:['慢慢抬起小脚，向你问好。','挥挥小脚，今天也不着急。','开心地眯起眼睛，谢谢你的陪伴！']},
  'leaf-rabbit': {pause:9000, beat:300, messages:['举起小爪，和你打招呼！','挥挥小爪，今天也要加油。','眯起眼睛，露出开心的笑容。']},
  'moon-fox': {pause:11500, beat:410, messages:['轻轻抬爪，向你问好。','挥挥小爪，欢迎来陪我！','开心地眯眼，记住这份温暖。']},
  'ice-penguin': {pause:10000, beat:360, messages:['抬起小鳍，向你问好！','挥挥小鳍，见到你真开心。','笑眯眯地回应你的陪伴。']},
  'star-owl': {pause:12500, beat:440, messages:['抬起小翅膀，和你问好。','挥挥小翅膀，欢迎你来！','眯起眼睛，开心地看着你。']},
  'mushroom-bear': {pause:12000, beat:460, messages:['抬起软软的小爪，向你问好。','挥挥小爪，慢慢陪你长大。','开心地眯起眼睛，谢谢你来看我！']},
  'cloud-cat': {pause:11000, beat:390, messages:['轻轻抬爪，和你打招呼。','挥挥小爪，今天也想陪着你。','满足地眯起眼睛，收到你的喜欢啦！']},
};
export function petPersonality(species) { return personalities[species] || personalities['cloud-cat']; }
export function interactionMessages(species) { return petPersonality(species).messages; }
export function idleDelay(species, random = Math.random) { return petPersonality(species).pause + Math.floor(random() * 3000); }
export function motionSequence(species, state) {
  const beat = petPersonality(species).beat;
  if (state === 'idle') return [{frame:0, duration:2400}, {frame:1, duration:140}, {frame:2, duration:900}, {frame:0, duration:1200}];
  // Settle back into the neutral pose rather than looping a raised paw or open mouth.
  return [0,1,2,1,0].map(frame => ({frame, duration:state === 'eat' ? 360 : beat}));
}

export function motionState(effect) {
  if (!effect) return 'idle';
  if (effect.kind === 'feed') return effect.action === 'play' ? 'interact' : 'eat';
  return ['interact', 'level', 'reward'].includes(effect.kind) ? 'interact' : 'idle';
}
export function motionSheet(species) {
  return '/pets/motion/' + (species === 'electric' ? 'partner' : species) + '.webp';
}
export function framePosition(state, frame) {
  return `${frame * 50}% ${['idle', 'eat', 'interact'].indexOf(state) * 50}%`;
}
