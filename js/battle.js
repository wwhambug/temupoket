'use strict';
(() => {
 const clone = x => JSON.parse(JSON.stringify(x));
 const stageFactor = n => 1 + .085 * (n - 1);
 const stages = () => ({atk:0,def:0,spa:0,spd:0,spe:0,evasion:0});
 const makeMoves = ids => ids.map(id => ({id,...clone(TP.moves[id]),left:TP.moves[id].pp,boost:1}));
 TP.createPlayer = id => {
  const base=clone(TP.starters.find(s=>s.id===id));
  return {...base,baseStats:clone(base.stats),hp:base.stats.hp,level:5,xp:0,nextXp:32,status:null,stages:stages(),moves:makeMoves(base.moves),mods:{hp:1,atk:1,def:1,spa:1,spd:1,spe:1},crit:0,leech:0,statusBonus:0,regen:0};
 };
 TP.createEnemy = n => {
  const boss=n%10===0;
  const pool=TP.enemies.slice(0,n<4?4:n<7?6:8);
  // Deterministic variety across the route, randomized order within each biome.
  const base=clone(boss?TP.enemies[8+(Math.floor(n/10)%2===0?1:0)]:pool[(n-1+Math.floor(Math.random()*3))%pool.length]);
  const f=stageFactor(n);
  const stats=Object.fromEntries(Object.entries(base.stats).map(([k,v])=>[k,Math.round(v*f*(k==='hp'?1.4:1))]));
  return {...base,stats,hp:stats.hp,level:4+n,status:null,stages:stages(),moves:makeMoves(base.moves.slice(0,boss?4:n<4?2:n<7?3:4)),trait:boss?'심연의 의지':n>=15?'굳건함':n>=7?'야생의 본능':'야생',enraged:false};
 };
 TP.rebuildStats = p => {
  const growth=1+.085*(p.level-5);
  p.stats=Object.fromEntries(Object.entries(p.baseStats).map(([k,v])=>[k,Math.round(v*growth*p.mods[k])]));
 };
 TP.stat = (c,key) => {
  let v=c.stats[key];const s=c.stages[key]||0;v*=s>=0?(2+s)/2:2/(2-s);
  if(key==='spe'&&(c.status?.id==='paralysis'||c.status?.id==='slow'))v*=.55;
  if(key==='atk'&&c.status?.id==='burn')v*=.65;
  if(c.id==='jiwoo'&&key==='atk'&&c.hp<c.stats.hp*.4)v*=1.4;
  if(c.id==='nuke'&&key==='spa')v*=1.15;
  if(c.enraged&&['atk','spa'].includes(key))v*=1.2;
  return v;
 };
 TP.preview = (attacker,defender,m) => {
  const eff=TP.effectiveness(m.type,defender.types),special=m.category==='special';
  const stab=attacker.types.includes(m.type)?1.35:1;
  return (((2*attacker.level/5+2)*m.power*(m.boost||1)*TP.stat(attacker,special?'spa':'atk')/TP.stat(defender,special?'spd':'def')/35)+3)*eff*stab;
 };
 TP.ai = (e,p) => {
  const usable=e.moves.filter(m=>m.left>0);
  if(!usable.length)return {id:'struggle',...TP.moves.struggle,left:999,boost:1};
  const scored=usable.map(m=>{
   let score=m.power?TP.preview(e,p,m):0;
   if(m.heal)score=e.hp/e.stats.hp<.45&&m.left>m.pp-2?35:0;
   if(m.status&&!p.status)score+=m.power?8:18;
   if(m.buff)score=e.stages[m.buff]<1?16:0;
   if(m.priority&&TP.stat(e,'spe')<TP.stat(p,'spe'))score+=5;
   return {m,score:score*(.8+Math.random()*.4)};
  }).sort((a,b)=>b.score-a.score);
  return Math.random()<.12?usable[Math.floor(Math.random()*usable.length)]:scored[0].m;
 };
 TP.statusNames={burn:'화상',poison:'독',paralysis:'마비',sleep:'수면',slow:'감속'};
 TP.applyStatus = (target,id) => {
  if(target.status)return false;
  if((id==='burn'&&target.types.includes('fire'))||(id==='paralysis'&&target.types.includes('electric'))||(id==='slow'&&target.types.includes('ice')))return false;
  target.status={id,turns:id==='sleep'?2:4};return true;
 };
 TP.act = async (attacker,target,m,isPlayer) => {
  const ui=TP.ui;
  if(attacker.hp<=0||target.hp<=0)return;
  if(attacker.flinched){attacker.flinched=false;ui.say(`${attacker.name}은(는) 움찔했다!`);await ui.pause(450);return;}
  if(attacker.status?.id==='sleep'){ui.say(`${attacker.name}은(는) 잠들어 있다…`);await ui.pause(450);return;}
  if(attacker.status?.id==='paralysis'&&Math.random()<.2){ui.say(`${attacker.name}은(는) 마비로 움직일 수 없다!`);await ui.pause(450);return;}
  m.left=Math.max(0,m.left-1);ui.render();ui.say(`${attacker.name}의 ${m.name}!`);
  await ui.attackAnimation(isPlayer,m.type);
  const dodge=target.id==='crumb'?.15:0;
  const accuracy=m.accuracy/100*(1-dodge)/(1+.14*target.stages.evasion);
  if(Math.random()>accuracy){ui.float(!isPlayer,'빗나감');ui.say('공격이 빗나갔다!');await ui.pause(400);return;}
  if(m.heal){const amount=Math.min(attacker.stats.hp-attacker.hp,Math.round(attacker.stats.hp*m.heal));attacker.hp+=amount;ui.float(isPlayer,`+${amount}`);ui.say('체력을 회복했다!');}
  if(m.buff){attacker.stages[m.buff]=Math.min(4,attacker.stages[m.buff]+m.amount);if(m.buff==='def')attacker.stages.spd=Math.min(4,attacker.stages.spd+1);ui.float(isPlayer,'강화');ui.say(`${m.name} — 능력치가 상승했다!`);}
  if(m.power){
   const critical=Math.random()<.06+(attacker.crit||0)+(m.crit||0);
   const eff=TP.effectiveness(m.type,target.types);
   let damage=eff===0?0:Math.max(1,Math.round(TP.preview(attacker,target,m)*(.9+Math.random()*.2)*(critical?1.6:1)));
   if(target.id==='martiallaw')damage=Math.round(damage*.88);
   if(target.trait==='굳건함')damage=Math.round(damage*.92);
   damage=Math.min(target.hp,damage);target.hp-=damage;
   ui.hitAnimation(!isPlayer,m.type,critical);ui.float(!isPlayer,critical?`${damage} CRIT!`:`${damage}`,critical);
   let detail=critical?'급소에 맞았다! ':'';detail+=eff>1?'효과가 굉장했다!':eff===0?'효과가 없다…':eff<1?'효과가 별로다…':'';
   if(detail)ui.say(detail);
   const heal=Math.round(damage*((m.drain||0)+(attacker.leech||0)));
   if(heal){attacker.hp=Math.min(attacker.stats.hp,attacker.hp+heal);ui.float(isPlayer,`+${heal}`);}
   if(m.recoil){const recoil=Math.max(1,Math.round(damage*m.recoil));attacker.hp=Math.max(0,attacker.hp-recoil);ui.float(isPlayer,`-${recoil}`);}
   if(m.flinch&&target.hp>0&&Math.random()<m.flinch)target.flinched=true;
  }
  if(m.status&&target.hp>0&&TP.effectiveness(m.type,target.types)>0&&Math.random()<Math.min(1,(m.chance||1)+(attacker.statusBonus||0))&&TP.applyStatus(target,m.status)){ui.say(`${target.name} — ${TP.statusNames[m.status]}!`);}
  ui.render();await ui.pause(450);
 };
 TP.endTurn = async (c,opponent,isPlayer) => {
  c.flinched=false;
  if(c.hp<=0)return;
  if(c.status){
   const s=c.status;
   if(s.id==='burn'||s.id==='poison'){
    const damage=Math.max(1,Math.round(c.stats.hp*(s.id==='poison'?.09:.06)*(1+(opponent.statusBonus||0))));
    c.hp=Math.max(0,c.hp-damage);TP.ui.float(isPlayer,`-${damage}`);TP.ui.say(`${c.name}은(는) ${TP.statusNames[s.id]} 피해를 받았다.`);TP.ui.render();await TP.ui.pause(250);
   }
   s.turns--;if(s.turns<=0){c.status=null;TP.ui.say(`${c.name}의 상태이상이 풀렸다!`);}
  }
  if(c.regen&&c.hp>0)c.hp=Math.min(c.stats.hp,c.hp+Math.round(c.stats.hp*c.regen));
  if(c.boss&&!c.enraged&&c.hp>0&&c.hp<c.stats.hp*.45){c.enraged=true;c.status=null;TP.ui.say('보스의 의지가 타오른다! 공격 강화 · 상태이상 해제');TP.ui.float(false,'각성! ',true);}
  TP.ui.render();
 };
 TP.turn = async index => {
  const run=TP.run;if(!run||run.phase!=='battle'||run.busy)return;
  const p=run.player,e=run.enemy;
  let m=p.moves[index];
  if(p.moves.every(x=>x.left===0))m={id:'struggle',...TP.moves.struggle,left:999,boost:1};
  if(!m||m.left<=0)return;
  run.busy=true;run.turns++;TP.ui.render();
  const em=TP.ai(e,p);
  const pFirst=(m.priority||0)!==(em.priority||0)?(m.priority||0)>(em.priority||0):TP.stat(p,'spe')>=TP.stat(e,'spe');
  if(pFirst){await TP.act(p,e,m,true);await TP.act(e,p,em,false);}else{await TP.act(e,p,em,false);await TP.act(p,e,m,true);}
  await TP.endTurn(p,e,true);await TP.endTurn(e,p,false);
  if(p.hp<=0){await TP.ui.finish(false);return;}
  if(e.hp<=0){await TP.ui.victory();return;}
  run.busy=false;TP.ui.render();TP.ui.say('어떤 기술을 사용할까?');
 };
 TP.awardXp = () => {
  const p=TP.run.player;const amount=18+TP.run.stage*5+(TP.run.enemy.boss?25:0);p.xp+=amount;let levels=0;
  while(p.xp>=p.nextXp){p.xp-=p.nextXp;p.nextXp=Math.round(p.nextXp*1.12);p.level++;levels++;const old=p.stats.hp;TP.rebuildStats(p);p.hp+=p.stats.hp-old;}
  return {amount,levels};
 };
 TP.rollRewards = () => {
  const boss=TP.run.enemy.boss;const pool=TP.rewards.filter(r=>boss||r.rarity!=='전설'||Math.random()<.12);
  const chosen=[];
  while(chosen.length<3){const r=clone(pool[Math.floor(Math.random()*pool.length)]);if(chosen.some(x=>x.id===r.id))continue;
   if(r.id==='move'){const ids=Object.keys(TP.moves).filter(k=>!TP.run.player.moves.some(m=>m.id===k)&&k!=='struggle');r.move=ids[Math.floor(Math.random()*ids.length)];r.detail=`${TP.moves[r.move].name} 습득 · 슬롯 선택`;}
   if(r.id==='type'){const types=Object.keys(TP.types).filter(t=>!TP.run.player.types.includes(t));if(!types.length)continue;r.type=types[Math.floor(Math.random()*types.length)];r.detail=`${TP.types[r.type][0]} 타입 추가 · 타입 일치 보너스`;}
   chosen.push(r);
  }
  if(boss&&!chosen.some(r=>r.rarity==='전설'))chosen[2]=clone(TP.rewards.find(r=>r.id==='regen'));
  return chosen;
 };
 TP.applyReward = (r,slot=0) => {
  const p=TP.run.player,oldHp=p.stats.hp;
  if(['atk','spa'].includes(r.id))p.mods[r.id]*=1.12;
  if(r.id==='hp')p.mods.hp*=1.15;
  if(r.id==='speed')p.mods.spe*=1.15;
  if(r.id==='defense'){p.mods.def*=1.12;p.mods.spd*=1.12;}
  TP.rebuildStats(p);if(r.id==='hp')p.hp+=p.stats.hp-oldHp;
  if(r.id==='heal'){p.hp=p.stats.hp;p.moves.forEach(m=>m.left=m.pp);}
  if(r.id==='crit')p.crit=Math.min(.6,p.crit+.12);
  if(r.id==='leech')p.leech=Math.min(.3,p.leech+.1);
  if(r.id==='status')p.statusBonus=Math.min(.6,p.statusBonus+.2);
  if(r.id==='regen')p.regen=Math.min(.15,p.regen+.05);
  if(r.id==='type')p.types.push(r.type);
  if(r.id==='power'){p.moves[slot].boost*=1.2;p.moves[slot].left=p.moves[slot].pp;}
  if(r.id==='move')p.moves[slot]=makeMoves([r.move])[0];
  TP.run.upgrades.push(r.name+(r.id==='move'?` (${TP.moves[r.move].name})`:''));
 };
})();
