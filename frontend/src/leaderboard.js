export const rankingModes=[
  {id:'points',label:'积分榜',unit:'积分',description:'累计奖励减去扣分；购买补给和装扮不影响排名。'},
  {id:'xp',label:'成长榜',unit:'经验',description:'按伙伴累计经验排序，喂食和玩耍都能帮助伙伴成长。'},
  {id:'completed',label:'打卡榜',unit:'次打卡',description:'按已完成的作业次数排序，已关闭作业的打卡也会保留。'}
];

export function rankStudents(members=[],completions=[],mode='points'){
  const metric=rankingModes.some(m=>m.id===mode)?mode:'points';
  const completed=new Map();
  for(const entry of completions){
    if(!completed.has(entry.student_id))completed.set(entry.student_id,new Set());
    completed.get(entry.student_id).add(entry.task_id);
  }
  const ranked=members.filter(s=>s.is_active).map(s=>({
    ...s,
    score:metric==='completed'?(completed.get(s.id)?.size||0):Number(s[metric]||0)
  })).sort((a,b)=>b.score-a.score||a.name.localeCompare(b.name,'zh-CN')||a.id.localeCompare(b.id));
  let rank=0;
  return ranked.map((s,index)=>{
    if(index===0||s.score!==ranked[index-1].score)rank=index+1;
    return {...s,rank};
  });
}
