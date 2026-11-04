import {levelInfo} from './game.js';

// Use confirmed state changes, including on an idempotent retry.
export function growthFeedback(before,after,ids){
  const previous=new Map(before.map(s=>[s.id,s]));
  return after.filter(s=>ids.includes(s.id)&&previous.has(s.id)).flatMap(s=>{
    const old=previous.get(s.id),level=levelInfo(s.xp).level;
    if(level>levelInfo(old.xp).level)return [{id:s.id,kind:'level',message:`升级啦！Lv.${level} ✨`}];
    if(s.balance>old.balance)return [{id:s.id,kind:'reward',message:`+${s.balance-old.balance} 积分，太棒啦！`}];
    if(s.xp>old.xp)return [{id:s.id,kind:'reward',message:`+${s.xp-old.xp} 经验，充满力量！`}];
    return [];
  });
}

export const petLines=['嘿嘿，见到你真开心！','摸摸头，快乐加倍！','今天也一起加油吧！','收到你的鼓励啦！'];

// Presentation follows item purpose without changing inventory rules.
export function itemFeedback(product){
  if(!product)return {action:'eat',image:null,message:'补给收到啦，好满足！'};
  const action=product.id==='ball'?'play':product.id==='milk'?'drink':['cookie','meal'].includes(product.id)?'serve':'eat';
  const message=action==='play'?'一起玩球，真开心！':action==='drink'?'喝一口牛奶，补充能量！':'尝尝'+product.name+'，好满足！';
  return {action,image:'/items/'+product.id+'.webp',message};
}
