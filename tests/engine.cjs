'use strict';
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict'),path=require('node:path');
const root=path.resolve(__dirname,'..');
const context=vm.createContext({window:{},console});context.window=context;
for(const file of ['data.js','battle.js'])vm.runInContext(fs.readFileSync(path.join(root,'js',file),'utf8'),context,{filename:file});
const TP=context.TP;
TP.ui={say(){},float(){},render(){},attackAnimation:async()=>{},hitAnimation(){},pause:async()=>{},finish:async()=>{TP.run.phase='over';},victory:async()=>{TP.run.phase='reward';TP.run.kills++;TP.awardXp();}};
function runFor(id,stage=1){TP.run={player:TP.createPlayer(id),enemy:TP.createEnemy(stage),stage,phase:'battle',busy:false,turns:0,kills:0,upgrades:[]};return TP.run;}
(async()=>{
 assert.ok(Object.keys(TP.moves).length>=20);
 assert.equal(TP.effectiveness('fire',['grass']),2);assert.equal(TP.effectiveness('psychic',['dark']),0);assert.equal(TP.effectiveness('electric',['water','flying']),4);
 assert.equal(new Set(TP.starters.map(s=>JSON.stringify(s.stats))).size,4);
 for(const id of TP.starters.map(s=>s.id)){
  const r=runFor(id);const before=r.player.moves[0].left;await TP.turn(0);assert.equal(r.player.moves[0].left,before-1);assert.ok(r.enemy.hp<r.enemy.stats.hp||r.player.hp<r.player.stats.hp);if(r.phase==='battle')assert.equal(r.busy,false);
 }
 const r=runFor('jiwoo');assert.ok(TP.applyStatus(r.enemy,'poison'));assert.equal(TP.applyStatus(r.enemy,'sleep'),false);const old=r.enemy.hp;await TP.endTurn(r.enemy,r.player,false);assert.ok(r.enemy.hp<old);
 const fire=TP.enemies.find(e=>e.types.includes('fire'));assert.equal(TP.applyStatus({...fire,status:null},'burn'),false);
 r.player.xp=1000;const xp=TP.awardXp();assert.ok(xp.levels>0);assert.ok(r.player.stats.hp>112);
 for(const n of [10,20,30]){const b=TP.createEnemy(n);assert.ok(b.boss);assert.equal(b.moves.length,4);assert.ok(b.stats.hp>TP.createEnemy(n-1).stats.hp);}
 for(const reward of TP.rewards){const r=runFor('crumb');const v={...reward,move:'surf',type:'water'};TP.applyReward(v,0);assert.equal(r.upgrades.length,1);assert.ok(r.player.hp<=r.player.stats.hp);}
 for(let i=0;i<50;i++){runFor('jiwoo',i%2?10:3);const choices=TP.rollRewards();assert.equal(choices.length,3);assert.equal(new Set(choices.map(x=>x.id)).size,3);if(TP.run.enemy.boss)assert.ok(choices.some(x=>x.rarity==='전설'));}
 // All PP depleted still has an actionable attack, and defeat terminates the run.
 let depleted=runFor('jiwoo');depleted.player.moves.forEach(m=>m.left=0);await TP.turn(0);assert.equal(depleted.turns,1);
 let dead=runFor('jiwoo');dead.player.hp=0;await TP.turn(0);assert.equal(dead.phase,'over');
 const samples={};
 for(const starter of TP.starters){let wins=0,totalTurns=0;
  for(let t=0;t<30;t++){const game=runFor(starter.id);
   while(game.phase==='battle'&&game.turns<60){const options=game.player.moves.map((m,i)=>({i,m,score:m.left&&m.power?TP.preview(game.player,game.enemy,m):0})).sort((a,b)=>b.score-a.score);await TP.turn(options[0].i);}
   if(game.phase==='reward')wins++;totalTurns+=game.turns;
  }samples[starter.id]={wins,outOf:30,averageTurns:+(totalTurns/30).toFixed(1)};
 }
 console.log('PASS: combat, PP fallback, types, statuses, levels, all rewards, bosses, defeat.');console.log('First-battle simulations:',JSON.stringify(samples));
})().catch(e=>{console.error(e);process.exitCode=1;});
