import assert from 'node:assert/strict';
import {rankingModes,rankStudents} from '../frontend/src/leaderboard.js';

const members=[
  {id:'b',name:'小林',points:100,balance:5,xp:30,is_active:1},
  {id:'a',name:'小林',points:100,balance:100,xp:50,is_active:true},
  {id:'c',name:'小周',points:80,balance:80,xp:50,is_active:true},
  {id:'d',name:'已移除',points:999,balance:999,xp:999,is_active:0},
  {id:'e',name:'新同学',balance:0,xp:0,is_active:true}
];
const original=structuredClone(members);
assert.deepEqual(rankStudents(),[]);
assert.deepEqual(rankStudents(members).map(s=>[s.id,s.score,s.rank]),[['a',100,1],['b',100,1],['c',80,3],['e',0,4]]);
assert.deepEqual(rankStudents(members,[],'unknown').map(s=>s.id),['a','b','c','e']);
assert.deepEqual(members,original,'ranking does not mutate the class roster');
assert.deepEqual(rankStudents([...members].reverse()),rankStudents(members),'ties have a stable name/id order');
assert.deepEqual(rankStudents(members).filter(s=>s.id==='c').map(s=>s.rank),[3],'searching after ranking preserves the class rank');
assert.deepEqual(rankStudents(members.filter(s=>s.id==='e')).map(s=>[s.score,s.rank]),[[0,1]]);
assert.deepEqual(rankStudents(members.map(s=>({...s,points:0}))).map(s=>s.rank),[1,1,1,1]);
assert.deepEqual(rankStudents(members,[],'xp').map(s=>[s.score,s.rank]),[[50,1],[50,1],[30,3],[0,4]]);
const completions=[{student_id:'a',task_id:'t1'},{student_id:'a',task_id:'t1'},{student_id:'a',task_id:'t2'},{student_id:'b',task_id:'t1'},{student_id:'d',task_id:'t1'},{student_id:'other-class',task_id:'t1'}];
assert.deepEqual(rankStudents(members,completions,'completed').map(s=>[s.id,s.score,s.rank]),[['a',2,1],['b',1,2],['c',0,3],['e',0,3]]);
assert.deepEqual(rankStudents(members,[],'completed').map(s=>s.rank),[1,1,1,1]);
const all=Array.from({length:500},(_,i)=>({id:String(i),name:'同学'+i,is_active:true,points:i}));
assert.equal(rankStudents(all).length,500);
assert.equal(rankStudents(all)[0].score,499);
assert.equal(rankStudents(all).at(-1).rank,500);
assert.equal(rankingModes.length,3);
console.log('PASS: leaderboard totals, ties, stable ordering, active roster, growth, unique homework, search ranks, empty/zero/single/500 students and immutable input');
