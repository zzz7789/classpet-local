import assert from 'node:assert/strict';
import {levelInfo} from '../frontend/src/game.js';
assert.deepEqual(levelInfo(0),{level:1,current:0,next:20});
assert.deepEqual(levelInfo(20),{level:2,current:0,next:30});
assert.deepEqual(levelInfo(50),{level:3,current:0,next:40});
assert.equal(levelInfo(90).level,4);
assert.equal(levelInfo(19).level,1);
console.log('PASS: growth thresholds match backend rules');

const {growthFeedback}=await import('../frontend/src/feedback.js');
const initial=[{id:'a',xp:19,balance:10},{id:'b',xp:0,balance:5}];
assert.deepEqual(growthFeedback(initial,[{id:'a',xp:22,balance:13}],['a']),[{id:'a',kind:'level',message:'升级啦！Lv.2 ✨'}]);
assert.deepEqual(growthFeedback(initial,[{id:'b',xp:3,balance:8}],['b']),[{id:'b',kind:'reward',message:'+3 积分，太棒啦！'}]);
assert.equal(growthFeedback(initial,initial,['a']).length,0,'unchanged/idempotent refresh must not celebrate');
assert.equal(growthFeedback(initial,[{id:'b',xp:3,balance:8}],['a']).length,0,'unrelated updates must not celebrate');
assert.equal(growthFeedback(initial,[{id:'a',xp:19,balance:7}],['a']).length,0,'deductions must not celebrate');
assert.deepEqual(growthFeedback(initial,[{id:'b',xp:8,balance:5}],['b']),[{id:'b',kind:'reward',message:'+8 经验，充满力量！'}]);
assert.equal(growthFeedback(initial,[{id:'a',xp:22,balance:13},{id:'b',xp:3,balance:8}],['a','b']).length,2);
console.log('PASS: rewards, feeding, level-up, batches and unchanged/unrelated/deduction guards');

const {pickStudent}=await import('../frontend/src/draw.js');
const drawMembers=[{id:'a'},{id:'b'},{id:'c'}];
assert.equal(pickStudent([],[]),null);
let history=[];
for(let i=0;i<3;i++){const result=pickStudent(drawMembers,history,()=>0);assert.ok(!history.includes(result.winner.id));history=result.history}
assert.deepEqual(history,['a','b','c']);
assert.deepEqual(pickStudent(drawMembers,history,()=>0).history,['a']);
assert.equal(pickStudent([{id:'c'}],['a','b'],()=>0).winner.id,'c');
assert.equal(pickStudent(drawMembers,[],()=>.999).winner.id,'c');
console.log('PASS: drawing without replacement, round reset, empty and changed roster');

const {itemFeedback}=await import('../frontend/src/feedback.js');
for(const id of ['apple','cake']){assert.equal(itemFeedback({id,name:'点心'}).action,'eat');assert.equal(itemFeedback({id,name:'点心'}).image,'/items/'+id+'.webp')}
assert.equal(itemFeedback({id:'milk',name:'牛奶'}).action,'drink');
assert.match(itemFeedback({id:'milk',name:'牛奶'}).message,/喝/);
assert.equal(itemFeedback({id:'ball',name:'球'}).action,'play');
assert.match(itemFeedback({id:'ball',name:'球'}).message,/玩球/);
assert.doesNotMatch(itemFeedback({id:'ball',name:'球'}).message,/吃/);
assert.equal(itemFeedback(null).image,null);
console.log('PASS: foods, milk and ball use distinct purpose-appropriate feedback');

for(const id of ['cookie','meal'])assert.equal(itemFeedback({id,name:'口粮'}).action,'serve','bowls are served at the feet');

const {motionState,motionSheet,framePosition}=await import('../frontend/src/pet-motion.js');
assert.equal(motionState(), 'idle');
for(const action of ['eat','serve','drink'])assert.equal(motionState({kind:'feed',action}), 'eat');
for(const kind of ['interact','level','reward'])assert.equal(motionState({kind}), 'interact');
assert.equal(motionState({kind:'feed',action:'play'}), 'interact');
assert.equal(motionSheet('electric'), '/pets/motion/partner.webp');
assert.equal(framePosition('eat',2), '100% 50%');
assert.equal(framePosition('interact',0), '0% 100%');
console.log('PASS: pet action mapping and atlas frame coordinates');
