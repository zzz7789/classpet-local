export function levelInfo(xp){let level=1;while(level<100&&xp>=20+10*(level-1)){xp-=20+10*(level-1);level++}return {level,current:xp,next:20+10*(level-1)}}
