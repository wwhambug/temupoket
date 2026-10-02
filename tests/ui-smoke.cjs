'use strict';
// Dependency-free DOM harness: executes production scripts, handlers and game flow.
// It checks runtime wiring, not browser layout or pixel rendering.
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..');
class Element {
 constructor(tag,attrs={}){this.tagName=tag;this.attrs=attrs;this.children=[];this.style={setProperty(k,v){this[k]=v;}};this.dataset={};this.hidden='hidden'in attrs;this.disabled='disabled'in attrs;this.checked=false;this.textContent='';this.className=attrs.class||'';this._html='';for(const [k,v]of Object.entries(attrs))if(k.startsWith('data-'))this.dataset[k.slice(5)]=v;
 this.classList={toggle:(c,on)=>{const a=this.className.split(' ').filter(Boolean);const v=on??!a.includes(c);this.className=[...a.filter(x=>x!==c),...(v?[c]:[])].join(' ');},add:(...cs)=>cs.forEach(c=>this.classList.toggle(c,true)),remove:(...cs)=>cs.forEach(c=>this.classList.toggle(c,false))};}
 set innerHTML(s){this._html=s;this.children=parse(s);for(const c of this.children)c.parent=this;}
 get innerHTML(){return this._html;}
 setAttribute(k,v){this.attrs[k]=v;} getAttribute(k){return this.attrs[k]??null;}
 set src(v){this.attrs.src=v;} get src(){return this.attrs.src;}
 appendChild(c){c.parent=this;this.children.push(c);return c;} remove(){if(this.parent)this.parent.children=this.parent.children.filter(c=>c!==this);}
 querySelectorAll(selector){const rules=selector.split(',').map(s=>s.trim());const found=[];const walk=e=>{for(const c of e.children){if(rules.some(rule=>matches(c,rule)))found.push(c);walk(c);}};walk(this);return found;}
 click(){if(this.disabled)return;if(this.tagName==='input'){this.checked=!this.checked;this.onchange?.({target:this});}this.onclick?.({target:this});}
 get clientWidth(){return 1200;}
}
function matches(e,s){const m=s.match(/^([\w-]+)?(?:\[([\w-]+)\])?$/);return !!m&&(!m[1]||e.tagName===m[1])&&(!m[2]||m[2]in e.attrs);}
function parse(html){const holder=new Element('fragment'),stack=[holder];for(const m of html.matchAll(/<\/?([\w-]+)([^>]*?)>/g)){const tag=m[1];if(m[0].startsWith('</')){if(stack.length>1)stack.pop();continue;}const attrs={};for(const a of m[2].matchAll(/([\w-]+)(?:="([^"]*)"|='([^']*)')?/g))attrs[a[1]]=a[2]??a[3]??'';const el=new Element(tag,attrs);stack.at(-1).appendChild(el);if(!['img','input','meta','link','br','hr'].includes(tag)&&!m[0].endsWith('/>'))stack.push(el);}return holder.children;}
const body=new Element('body');body.innerHTML=fs.readFileSync(path.join(root,'index.html'),'utf8').match(/<body>([\s\S]*)<\/body>/)[1];
const document={body,createElement:tag=>new Element(tag),createElementNS:(ns,tag)=>new Element(tag),querySelectorAll:s=>body.querySelectorAll(s),getElementById:id=>{const walk=e=>e.attrs.id===id?e:e.children.map(walk).find(Boolean);return walk(body);}};
const store=new Map(),events={};let errors=[];const ctx=vm.createContext({document,console:{...console,error:(...x)=>errors.push(x.join(' '))},innerWidth:1200,addEventListener:(k,f)=>events[k]=f,localStorage:{getItem:k=>store.get(k)||null,setItem:(k,v)=>store.set(k,v)},setTimeout:(fn)=>setTimeout(fn,0),window:{}});ctx.window=ctx;
for(const f of ['data.js','sprite-clips.js','battle.js','main.js'])vm.runInContext(fs.readFileSync(path.join(root,'js',f),'utf8'),ctx,{filename:f});
const $=document.getElementById,settle=()=>new Promise(r=>setTimeout(r,50));
(async()=>{
 assert.equal($('overlay').querySelectorAll('button').length,4);
 $('overlay').querySelectorAll('button')[0].click();assert.equal(ctx.TP.run.phase,'battle');assert.equal($('moves').children.length,4);assert.equal($('overlay').hidden,true);assert.ok($('player-sprite').src.endsWith('jiwoo-back.png'));
 $('settings-button').click();assert.equal($('settings').hidden,false);$('fast-setting').click();$('close-settings').click();assert.equal($('settings').hidden,true);assert.equal(JSON.parse([...store.values()][0]).settings.fast,true);
 ctx.TP.run.enemy.hp=1;$('moves').children[0].click();await settle();assert.equal(ctx.TP.run.phase,'reward');assert.equal($('overlay').querySelectorAll('button').length,3);
 const old=ctx.TP.run.stage;let reward=$('overlay').querySelectorAll('button')[0];reward.click();if(ctx.TP.run.phase==='slot')$('overlay').querySelectorAll('button')[0].click();assert.equal(ctx.TP.run.stage,old+1);
 // Force both slot-choice flows rather than relying on randomized rewards.
 const originalRoll=ctx.TP.rollRewards;
 for(const id of ['move','power']){ctx.TP.rollRewards=()=>[{...ctx.TP.rewards.find(r=>r.id===id),move:'surf'},ctx.TP.rewards[0],ctx.TP.rewards[1]];await ctx.TP.ui.victory();$('overlay').querySelectorAll('button')[0].click();assert.equal(ctx.TP.run.phase,'slot');$('overlay').querySelectorAll('button').find(b=>'slot'in b.dataset&&!b.disabled).click();assert.equal(ctx.TP.run.phase,'battle');if(id==='move')assert.equal(ctx.TP.run.player.moves[0].id,'surf');if(id==='power')assert.ok(ctx.TP.run.player.moves[0].boost>1);}
 ctx.TP.rollRewards=originalRoll;
 // Exercise specified boss stages through normal reward transition.
 for(const stage of [10,20,30]){ctx.TP.run.stage=stage-1;ctx.TP.run.phase='reward';ctx.TP.run.rewards=[ctx.TP.rewards[0]];ctx.TP.run.enemy.hp=0;await ctx.TP.ui.victory();$('overlay').querySelectorAll('button').find(b=>!['move','power'].includes(ctx.TP.run.rewards[Number(b.dataset.reward)]?.id))?.click();if(ctx.TP.run.phase==='slot')$('overlay').querySelectorAll('button')[0].click();assert.equal(ctx.TP.run.stage,stage);assert.equal(ctx.TP.run.enemy.boss,true);}
 await ctx.TP.ui.finish(false);assert.equal(ctx.TP.run.phase,'over');assert.ok($('retry'));$('retry').click();assert.equal(ctx.TP.run,null);assert.equal($('overlay').querySelectorAll('button').length,4);
 // All starters resolve their back paths; missing back has a front/mirror handler.
 for(let i=0;i<4;i++){const b=$('overlay').querySelectorAll('button')[i];b.click();assert.ok(fs.existsSync(path.join(root,$('player-sprite').src)));$('player-sprite').onerror();assert.ok($('player-sprite').className.includes('fallback'));await ctx.TP.ui.finish(false);$('retry').click();}
 assert.equal(errors.length,0);console.log('PASS: scripts load without runtime errors; starter, turn, victory, 3 rewards, slots, bosses 10/20/30, settings/save, game over/retry, 8 player paths and back fallback.');
})().catch(e=>{console.error(e);process.exitCode=1;});
