export function pickStudent(members,drawn,random=Math.random){
  if(!members.length)return null;
  const remaining=members.filter(s=>!drawn.includes(s.id));
  const pool=remaining.length?remaining:members;
  const winner=pool[Math.floor(random()*pool.length)];
  return {winner,history:[...(remaining.length?drawn:[]),winner.id]};
}
