'use strict';
(() => {
 const $=id=>document.getElementById(id);
 const svg=document.createElementNS('http://www.w3.org/2000/svg','svg');
 svg.setAttribute('width','0');svg.setAttribute('height','0');svg.style.position='absolute';
 svg.innerHTML='<defs>'+Object.entries(TP.spriteClips).map(([id,path])=>`<clipPath id="clip-${id}" clipPathUnits="objectBoundingBox"><path d="${path}"/></clipPath>`).join('')+'</defs>';document.body.appendChild(svg);
 const clipSprites=()=>document.querySelectorAll('img[src]').forEach(img=>{const id=img.getAttribute('src').split('/').pop().replace('.png','');if(TP.spriteClips[id])img.style.clipPath=`url(#clip-${id})`;});
 const escape=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 let save={best:0,unlocked:TP.starters.map(s=>s.id),settings:{sound:false,fast:false,motion:false}};
 try{const raw=JSON.parse(localStorage.getItem('temupoket-rebuild-v1'));if(raw){save.best=Number(raw.best)||0;save.settings={...save.settings,...raw.settings};}}catch{/* Storage can be unavailable on file URLs. */}
 const persist=()=>{try{localStorage.setItem('temupoket-rebuild-v1',JSON.stringify(save));}catch{}};
 let selected=0,actions=[],pendingReward=null,previousSelection=0,audio;
 const setActions=selectors=>{actions=selectors;selected=0;highlight();};
 const highlight=()=>{actions.forEach((el,i)=>el?.classList.toggle('selected',i===selected));if(TP.run?.phase==='battle'&&!TP.run.busy&&$('settings').hidden)showMove(selected);};
 const tags=types=>types.map(t=>`<span class="type-tag" style="background:${TP.types[t][1]}">${TP.types[t][0]}</span>`).join('');
 const overlay=html=>{$('overlay').innerHTML=html;$('overlay').hidden=false;clipSprites();};
 const resize=()=>{const w=Math.min(1152,$('shell').clientWidth-(innerWidth>700?48:0));const scale=w/960;$('viewport-wrap').style.width=w+'px';$('viewport-wrap').style.height=w*9/16+'px';$('game').style.transform=`scale(${scale})`;};
 addEventListener('resize',resize);resize();
 function sound(type='normal'){
  if(!save.settings.sound)return;
  try{audio||=new (window.AudioContext||window.webkitAudioContext)();if(audio.state==='suspended')audio.resume();const osc=audio.createOscillator(),gain=audio.createGain();osc.type='square';osc.frequency.setValueAtTime(type==='fire'?160:type==='electric'?520:270,audio.currentTime);osc.frequency.exponentialRampToValueAtTime(85,audio.currentTime+.12);gain.gain.setValueAtTime(.025,audio.currentTime);gain.gain.exponentialRampToValueAtTime(.001,audio.currentTime+.15);osc.connect(gain);gain.connect(audio.destination);osc.start();osc.stop(audio.currentTime+.15);}catch{}}
 const pause=ms=>new Promise(resolve=>setTimeout(resolve,ms*(save.settings.fast?.55:1)));
 function say(s){$('battle-text').textContent=s;}
 function float(isPlayer,text,critical=false){const el=document.createElement('span');el.className='damage'+(critical?' critical':'');el.textContent=text;$(isPlayer?'player-actor':'enemy-actor').appendChild(el);setTimeout(()=>el.remove(),850);}
 async function attackAnimation(isPlayer,type){const actor=$(isPlayer?'player-actor':'enemy-actor');actor.classList.remove('idle');actor.classList.add(isPlayer?'lunge-player':'lunge-enemy');sound(type);await pause(220);actor.classList.remove('lunge-player','lunge-enemy');actor.classList.add('idle');}
 function hitAnimation(isPlayer,type,critical){const actor=$(isPlayer?'player-actor':'enemy-actor');actor.classList.add('hit');if(critical)$('battle').classList.add('shake');for(let i=0;i<9;i++){const dot=document.createElement('i');dot.className='particle';dot.style.background=TP.types[type][1];dot.style.setProperty('--dx',`${Math.cos(i*2.4)*65}px`);dot.style.setProperty('--dy',`${Math.sin(i*2.4)*65}px`);actor.appendChild(dot);setTimeout(()=>dot.remove(),500);}setTimeout(()=>{actor.classList.remove('hit');$('battle').classList.remove('shake');},300);}
 function showMove(i){const p=TP.run?.player;if(!p)return;const m=p.moves[i];if(!m)return;const eff=TP.effectiveness(m.type,TP.run.enemy.types);$('move-info').innerHTML=`${tags([m.type])}<p>위력 ${m.power?Math.round(m.power*m.boost):'—'}　명중 ${m.accuracy}%<br>${m.category==='special'?'특수':'물리'}${!m.power?' / 변화':''}　상성 ×${eff}<br><span class="muted">${m.status?TP.statusNames[m.status]:m.heal?'체력 회복':m.buff?'능력치 강화':m.priority?'선제 공격':m.recoil?'반동 피해':m.drain?'체력 흡수':'직접 공격'}</span></p>`;}
 function render(){
  const r=TP.run;if(!r)return;
  [['player',r.player],['enemy',r.enemy]].forEach(([side,c])=>{
   $(side+'-name').textContent=c.name;$(side+'-level').textContent='Lv.'+c.level;$(side+'-types').innerHTML=tags(c.types);$(side+'-hp').textContent=`${Math.ceil(c.hp)} / ${c.stats.hp}`;
   const ratio=Math.max(0,c.hp/c.stats.hp);$(side+'-bar').style.width=ratio*100+'%';$(side+'-bar').style.background=ratio>.5?'#83cc79':ratio>.2?'#e6c469':'#dd7967';$(side+'-status').textContent=c.status?TP.statusNames[c.status.id]:'';
   const actor=$(side+'-actor');Object.keys(TP.statusNames).forEach(s=>actor.classList.toggle(s,c.status?.id===s));
  });
  $('exp-bar').style.width=r.player.xp/r.player.nextXp*100+'%';
  $('stage-label').textContent=`${r.enemy.boss?'BOSS · ':''}STAGE ${String(r.stage).padStart(2,'0')}　 /　 최고 ${save.best}`;
  if(r.phase==='battle'){
   const allEmpty=r.player.moves.every(m=>m.left===0);
   $('moves').innerHTML=r.player.moves.map((m,i)=>`<button class="move ${selected===i?'selected':''}" data-move="${i}" ${r.busy||(!allEmpty&&m.left===0)?'disabled':''}><span class="move-name" style="color:${TP.types[m.type][1]}">${allEmpty?'발버둥':escape(m.name)}</span><small>${TP.types[m.type][0]}　${m.left}/${m.pp}</small></button>`).join('');
   actions=Array.from($('moves').children);actions.forEach((b,i)=>{b.onclick=()=>{selected=i;TP.turn(i);};b.onpointerenter=()=>{if(!r.busy){selected=i;highlight();}};});showMove(selected);
  }
 }
 function setSprite(player){const img=$('player-sprite');img.classList.remove('fallback');img.onerror=()=>{img.onerror=null;img.classList.add('fallback');img.src=`assets/players/${player.id}-front.png`;clipSprites();};img.src=`assets/players/${player.id}-back.png`;img.alt=player.name;clipSprites();}
 function start(id){
  TP.run={stage:1,player:TP.createPlayer(id),enemy:null,phase:'battle',busy:false,kills:0,turns:0,upgrades:[],started:Date.now()};setSprite(TP.run.player);$('battle').hidden=false;nextBattle(false);
 }
 function nextBattle(increment=true){
  const r=TP.run;if(increment)r.stage++;r.enemy=TP.createEnemy(r.stage);r.phase='battle';r.busy=false;r.player.status=null;r.player.stages={atk:0,def:0,spa:0,spd:0,spe:0,evasion:0};r.player.flinched=false;
  save.best=Math.max(save.best,r.stage);persist();
  const biome=r.enemy.boss?'strange-dimension':['grass','forest','cave','volcano','strange-dimension'][Math.floor((r.stage-1)/6)%5];$('landscape').style.backgroundImage=`url('assets/bg/${biome}.png')`;$('shade').style.background=r.enemy.boss?'#11152945':'#0b142210';
  $('overlay').hidden=true;$('enemy-sprite').src=`assets/enemies/${r.enemy.id}.png`;$('enemy-sprite').alt=r.enemy.name;clipSprites();
  ['player','enemy'].forEach(side=>{$(side+'-actor').className='actor idle'+(side==='enemy'&&r.enemy.boss?' boss':'');});selected=0;render();say(r.enemy.boss?`${r.enemy.name}의 강력한 기운! 보스전 시작.`:`야생의 ${r.enemy.name}이(가) 나타났다!`);
 }
 async function victory(){
  const r=TP.run;r.phase='reward';r.kills++;r.enemy.hp=0;$('enemy-actor').classList.add('faint');$('player-actor').classList.add('victory');const xp=TP.awardXp();render();say(`승리! EXP +${xp.amount}${xp.levels?' · 레벨 업! Lv.'+r.player.level:''}`);await pause(850);
  r.player.hp=Math.min(r.player.stats.hp,r.player.hp+Math.round(r.player.stats.hp*.22));r.player.moves.forEach(m=>m.left=Math.min(m.pp,m.left+2));r.player.status=null;r.rewards=TP.rollRewards();r.busy=false;
  overlay(`<span class="eyebrow">STAGE ${r.stage} CLEAR</span><h2>${r.enemy.boss?'보스를 쓰러뜨렸다!':'다음 전투를 위한 선택'}</h2><p class="intro">EXP +${xp.amount}${xp.levels?' · Lv.'+r.player.level+' 레벨 업':''}　 |　HP 22% · PP 2 자동 회복</p><div class="reward-grid">${r.rewards.map((v,i)=>`<button class="reward ${v.rarity==='희귀'?'rare':v.rarity==='전설'?'legend':''}" data-reward="${i}"><span class="rarity">${v.rarity} / ${String(i+1).padStart(2,'0')}</span><strong>${v.name}</strong><p>${v.detail}</p></button>`).join('')}</div><span class="record">하나를 고르면 다음 스테이지로 이동합니다.</span>`);
  const buttons=Array.from($('overlay').querySelectorAll('[data-reward]'));buttons.forEach((b,i)=>b.onclick=()=>chooseReward(r.rewards[i]));setActions(buttons);
 }
 function chooseReward(r){
  if(TP.run.phase!=='reward')return;
  if(r.id==='move'||r.id==='power'){
   pendingReward=r;TP.run.phase='slot';
   overlay(`<span class="eyebrow">${r.id==='move'?'LEARN A MOVE':'UPGRADE A MOVE'}</span><h2>${r.id==='move'?TP.moves[r.move].name+' 습득':'강화할 기술 선택'}</h2><p class="intro">${r.id==='move'?'선택한 기술을 새 기술로 교체합니다.':'위력 +20% · 해당 기술 PP 회복'}</p><div class="reward-grid">${TP.run.player.moves.map((m,i)=>`<button class="reward" data-slot="${i}" ${r.id==='power'&&!m.power?'disabled':''} style="width:25%;padding:15px"><span class="rarity">${TP.types[m.type][0]} / PP ${m.left}/${m.pp}</span><strong style="font-size:18px">${m.name}</strong><p>위력 ${m.power?Math.round(m.power*m.boost):'—'} · ${m.accuracy}%</p></button>`).join('')}</div><button id="back-reward">B / Esc · 보상으로 돌아가기</button>`);
   const slots=Array.from($('overlay').querySelectorAll('[data-slot]'));slots.forEach((b,i)=>b.onclick=()=>{if(r.id==='power'&&!TP.run.player.moves[i].power){say('변화 기술 대신 공격 기술을 선택하세요.');return;}TP.applyReward(r,i);pendingReward=null;nextBattle();});$('back-reward').onclick=backReward;setActions(slots.filter(b=>!b.disabled));return;
  }
  TP.applyReward(r);nextBattle();
 }
 function backReward(){
  const r=TP.run;if(r?.phase!=='slot')return;r.phase='reward';pendingReward=null;
  overlay(`<span class="eyebrow">CHOOSE YOUR BUILD</span><h2>보상 선택</h2><div class="reward-grid">${r.rewards.map((v,i)=>`<button class="reward" data-reward="${i}"><span class="rarity">${v.rarity}</span><strong>${v.name}</strong><p>${v.detail}</p></button>`).join('')}</div>`);const b=Array.from($('overlay').querySelectorAll('[data-reward]'));b.forEach((el,i)=>el.onclick=()=>chooseReward(r.rewards[i]));setActions(b);
 }
 async function finish(won){
  const r=TP.run;r.phase='over';r.busy=true;render();$('player-actor').classList.add('faint');say('동료가 쓰러졌다…');await pause(650);
  overlay(`<span class="eyebrow">RUN COMPLETE</span><h1>${won?'모험 완수':'GAME OVER'}</h1><p class="intro">다음 모험에서는 다른 방식으로.</p><div class="run-stats"><div><b>${r.stage}</b>도달 스테이지</div><div><b>${r.player.level}</b>최종 레벨</div><div><b>${r.kills}</b>쓰러뜨린 적</div><div><b>${r.upgrades.length}</b>획득한 강화</div></div><div class="upgrade-list">${r.upgrades.length?r.upgrades.map(escape).join(' · '):'획득한 강화 없음'}</div><button id="retry" class="primary">다시 시작</button><span class="record">최고 기록 STAGE ${save.best}　 ·　 ${r.turns}턴</span>`);$('retry').onclick=starters;setActions([$('retry')]);
 }
 function starters(){
  TP.run=null;$('battle').hidden=true;$('stage-label').textContent='최고 STAGE '+save.best;$('landscape').style.backgroundImage="url('assets/bg/grass.png')";
  overlay(`<span class="eyebrow">A VERY STRANGE ADVENTURE</span><h1>TEMUPOKET</h1><p class="intro">세계는 정상이다. 당신의 동료만 빼고.　<small>스타터를 선택하면 바로 전투!</small></p><div class="starter-grid">${TP.starters.map(s=>`<button class="starter" data-starter="${s.id}"><img src="assets/players/${s.id}-front.png" alt="${s.name}"><strong>${s.name}</strong><span class="subtitle">${s.subtitle}</span><div>${tags(s.types)}</div><span class="trait">특성 / ${s.trait}</span><p>${s.description}</p></button>`).join('')}</div><span class="record">최고 STAGE ${save.best}　 ·　모든 스타터 해금　 ·　마우스 / 방향키 + Enter</span>`);
  const buttons=Array.from($('overlay').querySelectorAll('[data-starter]'));buttons.forEach(b=>b.onclick=()=>start(b.dataset.starter));setActions(buttons);
 }
 function moveSelection(dir){if(TP.run?.busy&&$('settings').hidden)return;const n=actions.length;if(!n)return;const grid=TP.run?.phase==='battle'&&$('settings').hidden;let delta=dir==='left'?-1:dir==='right'?1:dir==='up'?(grid?-2:-1):(grid?2:1);selected=(selected+delta+n)%n;highlight();}
 function activate(){if(actions[selected]&&!actions[selected].disabled)actions[selected].click();}
 function back(){if(!$('settings').hidden)closeSettings();else if(TP.run?.phase==='slot')backReward();else openSettings();}
 function openSettings(){if(TP.run?.busy)return;previousSelection=selected;$('settings').hidden=false;['sound','fast','motion'].forEach(key=>$(key+'-setting').checked=save.settings[key]);setActions([...$('settings').querySelectorAll('input'),$('close-settings')]);}
 function closeSettings(){$('settings').hidden=true;if(TP.run?.phase==='battle'){render();actions=Array.from($('moves').children);}else actions=Array.from($('overlay').querySelectorAll('button'));selected=Math.min(previousSelection,actions.length-1);highlight();}
 $('settings-button').onclick=openSettings;$('close-settings').onclick=closeSettings;
 ['sound','fast','motion'].forEach(key=>$(key+'-setting').onchange=e=>{save.settings[key]=e.target.checked;$('game').classList.toggle('reduced',save.settings.motion);persist();});$('game').classList.toggle('reduced',save.settings.motion);
 document.querySelectorAll('[data-dir]').forEach(b=>b.onclick=()=>moveSelection(b.dataset.dir));$('touch-a').onclick=activate;$('touch-b').onclick=back;
 addEventListener('keydown',e=>{if(e.repeat)return;const map={ArrowLeft:'left',ArrowRight:'right',ArrowUp:'up',ArrowDown:'down'};if(map[e.key]){e.preventDefault();moveSelection(map[e.key]);}else if(['Enter','a','A',' '].includes(e.key)){e.preventDefault();activate();}else if(['Escape','b','B'].includes(e.key)){e.preventDefault();back();}else if(/^[1-4]$/.test(e.key)&&TP.run?.phase==='battle'&&$('settings').hidden){selected=Number(e.key)-1;TP.turn(selected);}});
 TP.ui={say,float,pause,attackAnimation,hitAnimation,render,victory,finish};
 starters();
})();
