import assert from 'node:assert/strict';
import {growthStage, interactionMessages, petPersonality, idleDelay, motionSequence, motionState} from '../frontend/src/pet-motion.js';

for (const [xp,id,level,nextLevel] of [[0,'baby',1,3],[19,'baby',1,3],[20,'baby',2,3],[49,'baby',2,3],[50,'growing',3,6],[139,'growing',4,6],[199,'growing',5,6],[200,'mature',6,null]]) {
  assert.deepEqual(growthStage(xp),{id,name:{baby:'幼年',growing:'成长',mature:'成熟'}[id],level,nextLevel});
}
assert.equal(growthStage(-10).level,1);
assert.equal(growthStage(undefined).id,'baby');
const species = ['electric','fire','water','leaf-rabbit','moon-fox','ice-penguin','star-owl','mushroom-bear','cloud-cat'];
for (const id of species) {
  const lines = interactionMessages(id);
  assert.equal(new Set(lines).size,3);
  assert.ok(lines.every(line => !/舔爪|摇尾|抖耳|跳|飞/.test(line)), 'copy matches the existing wave atlas');
  assert.ok(idleDelay(id,()=>0) >= 8000, 'spontaneous gestures remain occasional');
  assert.equal(idleDelay(id,()=>0.5)-idleDelay(id,()=>0),1500);
  for (const state of ['idle','eat','interact']) {
    const sequence = motionSequence(id,state);
    assert.equal(sequence[0].frame,0);
    assert.equal(sequence.at(-1).frame,0,'return to a resting pose');
    assert.ok(sequence.every(step => step.frame>=0 && step.frame<=2 && step.duration>0));
    assert.ok(sequence.some(step => step.frame===1));
    assert.ok(sequence.some(step => step.frame===2));
  }
}
assert.match(interactionMessages('ice-penguin').join(''),/鳍/);
assert.match(interactionMessages('star-owl').join(''),/翅膀/);
assert.notEqual(petPersonality('water').beat,petPersonality('electric').beat);
assert.ok(idleDelay('water',()=>0)>idleDelay('electric',()=>0));
assert.equal(motionState({kind:'feed',action:'drink'}),'eat');
assert.equal(motionState({kind:'feed',action:'play'}),'interact');
assert.equal(interactionMessages('unknown'),interactionMessages('cloud-cat'));
console.log('PASS: growth boundaries, restrained personality timing, atlas-safe sequences and species-appropriate copy');
