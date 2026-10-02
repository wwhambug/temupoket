'use strict';

const wait = ms => new Promise(resolve => setTimeout(resolve, ms));

const BattleRecord = {
  value: { win: 0, lose: 0, run: 0, maxStreak: 0 },
  load() {
    try {
      const saved = JSON.parse(localStorage.getItem('temupoket-record'));
      if (saved && ['win', 'lose', 'run'].every(key => Number.isSafeInteger(saved[key]) && saved[key] >= 0)) {
        this.value = {
          win: saved.win, lose: saved.lose, run: saved.run,
          maxStreak: Number.isSafeInteger(saved.maxStreak) && saved.maxStreak >= 0 ? saved.maxStreak : 0
        };
      } else {
        this.save();
      }
    } catch (_) { /* Keep an in-memory record when storage is unavailable or invalid. */ }
  },
  save() {
    try {
      localStorage.setItem('temupoket-record', JSON.stringify(this.value));
    } catch (_) { /* Storage failures must not interrupt the battle. */ }
  },
  add(result) {
    this.value[result]++;
    this.save();
  },
  endStreak(streak) {
    this.value.maxStreak = Math.max(this.value.maxStreak, streak);
    this.save();
  }
};

BattleRecord.load();

// Audio is initialized from a user gesture. The game also works without audio support.
const Sound = {
  context: null,
  play(kind) {
    try {
      const Audio = window.AudioContext || window.webkitAudioContext;
      if (!Audio) return;
      if (!this.context) this.context = new Audio();
      if (this.context.state === 'suspended') this.context.resume().catch(() => {});
      const notes = {
        click: [650], attack: [240, 420], hit: [140, 90], critical: [880, 1047, 1319],
        heal: [440, 550, 660], victory: [523, 659, 784, 1047]
      }[kind] || [440];
      notes.forEach((frequency, index) => {
        const oscillator = this.context.createOscillator();
        const gain = this.context.createGain();
        const start = this.context.currentTime + index * .09;
        oscillator.type = 'square';
        oscillator.frequency.value = frequency;
        gain.gain.setValueAtTime(.035, start);
        gain.gain.exponentialRampToValueAtTime(.001, start + .085);
        oscillator.connect(gain);
        gain.connect(this.context.destination);
        oscillator.start(start);
        oscillator.stop(start + .09);
      });
    } catch (_) { /* Audio must never prevent a turn from completing. */ }
  }
};

class Battle {
  constructor(fighter, difficulty, onReturn, onContinue, { hp = fighter.hp, streak = 0 } = {}) {
    this.streak = streak;
    this.result = null;
    this.difficulty = difficulty;
    this.difficultySettings = {
      easy: { label: '쉬움', damage: .8, defensiveChance: .3 },
      normal: { label: '보통', damage: 1, defensiveChance: .6 },
      hard: { label: '어려움', damage: 1.2, defensiveChance: .85 }
    }[difficulty];
    const opponents = FIGHTERS.filter(candidate => candidate.id !== fighter.id);
    this.player = this.createCombatant(fighter);
    this.player.hp = hp;
    this.enemy = this.createCombatant(opponents[Math.floor(Math.random() * opponents.length)]);
    this.potions = 3;
    this.busy = true;
    this.ended = false;
    this.onReturn = onReturn;
    this.onContinue = onContinue;
    this.menu = document.getElementById('command-menu');
    this.messageBox = document.getElementById('message-box');
    this.messageText = document.getElementById('message-text');
    this.messageHint = document.getElementById('message-hint');
  }

  createCombatant(fighter) {
    return {
      data: fighter, hp: fighter.hp, radiation: 0,
      stages: { attack: 0, defense: 0, speed: 0, accuracy: 0, evasion: 0 }
    };
  }

  async start() {
    Music.start('battle');
    document.getElementById('battle-difficulty').textContent = `난이도: ${this.difficultySettings.label}`;
    const streakLabel = document.getElementById('battle-streak');
    streakLabel.textContent = this.streak > 0 ? `${this.streak}연승 도전 중` : '';
    streakLabel.hidden = this.streak === 0;
    for (const side of ['player', 'enemy']) {
      const fighter = this[side].data;
      document.getElementById(`${side}-name`).textContent = fighter.name;
      document.getElementById(`${side}-type`).textContent = fighter.type;
      const sprite = this.sprite(this[side]);
      sprite.src = `assets/${fighter.id}-${side === 'player' ? 'back' : 'front'}.png`;
      sprite.alt = `${fighter.name} ${side === 'player' ? '뒷모습' : '앞모습'}`;
      sprite.classList.remove('fainted', 'attack', 'hit', 'heal');
    }
    this.updateHP();
    this.menu.replaceChildren();
    await this.say(`${this.streak > 0 ? `${this.streak}연승 도전! ` : ''}야생의 ${this.enemy.data.name}이(가) 나타났다!`);
    this.busy = false;
    this.showCommands();
  }

  sprite(combatant) {
    return document.getElementById(combatant === this.player ? 'player-sprite' : 'enemy-sprite');
  }

  say(message) {
    this.messageText.textContent = message;
    this.messageHint.hidden = false;
    this.messageBox.disabled = false;
    this.messageBox.focus({ preventScroll: true });
    return new Promise(resolve => {
      this.messageBox.onclick = () => {
        Sound.play('click');
        this.messageBox.onclick = null;
        this.messageBox.disabled = true;
        this.messageHint.hidden = true;
        resolve();
      };
    });
  }

  addButton(label, action, options = {}) {
    const button = document.createElement('button');
    button.textContent = label;
    if (options.wide) button.className = 'wide';
    if (options.description) {
      const detail = document.createElement('span');
      detail.className = 'move-details';
      detail.textContent = options.description;
      button.append(detail);
    }
    button.disabled = !!options.disabled;
    button.onclick = () => {
      if (this.busy) return;
      Sound.play('click');
      action();
    };
    this.menu.append(button);
    if (this.menu.children.length === 1) button.focus({ preventScroll: true });
  }

  showCommands() {
    this.menu.replaceChildren();
    this.messageText.textContent = `${this.player.data.name}은(는) 무엇을 할까?`;
    this.addButton('싸운다', () => this.showMoves());
    this.addButton('가방', () => this.showBag());
    this.addButton('도망간다', () => this.runTurn({ kind: 'escape' }), { wide: true });
  }

  showMoves() {
    this.menu.replaceChildren();
    for (const move of this.player.data.moves) {
      this.addButton(move.name, () => this.runTurn({ kind: 'move', move }), {
        description: `위력 ${move.power} · 명중 ${move.accuracy}% / ${move.description}`
      });
    }
    this.addButton('돌아가기', () => this.showCommands(), { wide: true });
  }

  showBag() {
    this.menu.replaceChildren();
    this.addButton(`상처약 × ${this.potions}`, () => this.runTurn({ kind: 'potion' }), {
      wide: true, disabled: this.potions === 0, description: 'HP 50 회복'
    });
    this.addButton('돌아가기', () => this.showCommands(), { wide: true });
  }

  updateHP() {
    for (const side of ['player', 'enemy']) {
      const fighter = this[side];
      const percent = fighter.hp / fighter.data.hp * 100;
      const bar = document.getElementById(`${side}-hp-bar`);
      bar.style.width = `${percent}%`;
      bar.style.backgroundColor = percent <= 20 ? '#ce5551' : percent <= 50 ? '#e2b244' : '#56a56a';
      const track = bar.parentElement;
      track.setAttribute('aria-valuemin', '0');
      track.setAttribute('aria-valuemax', String(fighter.data.hp));
      track.setAttribute('aria-valuenow', String(fighter.hp));
      document.getElementById(`${side}-hp-text`).textContent = `HP ${fighter.hp} / ${fighter.data.hp}`;
    }
  }

  stat(fighter, name) {
    return fighter.data[name] * (1 + fighter.stages[name] * .15);
  }

  chooseEnemyMove() {
    const moves = this.enemy.data.moves;
    const defensive = moves.filter(move => move.effect === 'heal' || move.effect === 'defenseUp');
    const choices = this.enemy.hp <= this.enemy.data.hp * .4 && defensive.length
      && Math.random() < this.difficultySettings.defensiveChance
      ? defensive : moves;
    return choices[Math.floor(Math.random() * choices.length)];
  }

  async animate(fighter, animation, duration) {
    const sprite = this.sprite(fighter);
    sprite.classList.add(animation);
    await wait(duration);
    sprite.classList.remove(animation);
  }

  async shakeField() {
    const field = document.querySelector('.battle-field');
    if (!field) return;
    field.classList.add('shake');
    try {
      await wait(300);
    } finally {
      field.classList.remove('shake');
    }
  }

  async changeStage(fighter, stat, amount) {
    const labels = { attack: '공격', defense: '방어', speed: '스피드', accuracy: '명중률', evasion: '회피율' };
    const before = fighter.stages[stat];
    fighter.stages[stat] = Math.max(-3, Math.min(3, before + amount));
    if (before === fighter.stages[stat]) {
      await this.say(`${fighter.data.name}의 ${labels[stat]}은(는) 더 이상 ${amount > 0 ? '오르지' : '내려가지'} 않는다!`);
    } else {
      await this.say(`${fighter.data.name}의 ${labels[stat]}이(가) 1단계 ${amount > 0 ? '올랐다' : '내려갔다'}!`);
    }
  }

  async heal(fighter, amount) {
    const restored = Math.min(amount, fighter.data.hp - fighter.hp);
    fighter.hp += restored;
    this.updateHP();
    Sound.play('heal');
    await this.animate(fighter, 'heal', 600);
    await this.say(`${fighter.data.name}의 HP가 ${restored} 회복되었다!`);
  }

  async useMove(attacker, defender, move) {
    await this.say(`${attacker.data.name}의 ${move.name}!`);
    Sound.play('attack');
    await this.animate(attacker, 'attack', 350);
    // Six steps span -3 through +3; every step modifies accuracy/evasion by 15%.
    const accuracy = move.accuracy * (1 + attacker.stages.accuracy * .15)
      * (1 - defender.stages.evasion * .15);
    const roll = Math.floor(Math.random() * 100) + 1;
    if (roll > accuracy) {
      await this.say(`${attacker.data.name}의 공격은 빗나갔다!`);
      return;
    }

    let dealt = 0;
    if (move.power > 0) {
      const multiplier = TYPE_MATCHUPS[attacker.data.type]?.[defender.data.type] || 1;
      // SPEC.md's damage formula does not include defense.
      let damage = Math.max(1, Math.round(move.power * this.stat(attacker, 'attack') / 25
        * (.85 + Math.random() * .15) * multiplier));
      const critical = Math.random() < 1 / 16;
      if (critical) damage = Math.round(damage * 1.5);
      if (attacker === this.enemy) damage = Math.max(1, Math.round(damage * this.difficultySettings.damage));
      dealt = Math.min(defender.hp, damage);
      defender.hp -= dealt;
      this.updateHP();
      Sound.play(critical ? 'critical' : 'hit');
      await Promise.all([
        this.animate(defender, 'hit', 600),
        dealt > 0 ? this.shakeField() : Promise.resolve()
      ]);
      await this.say(`${defender.data.name}에게 ${dealt} 데미지!`);
      if (critical) await this.say('급소에 맞았다!');
      if (multiplier === 1.5) await this.say('효과가 굉장했다!');
      if (multiplier === .75) await this.say('효과가 별로인 듯하다...');
    }

    switch (move.effect) {
      case 'attackDown':
        if (defender.hp > 0) await this.changeStage(defender, 'attack', -1);
        break;
      case 'speedDown':
        if (defender.hp > 0) await this.changeStage(defender, 'speed', -1);
        break;
      case 'accuracyDown':
        if (defender.hp > 0) await this.changeStage(defender, 'accuracy', -1);
        break;
      case 'evasionUp': await this.changeStage(attacker, 'evasion', 1); break;
      case 'defenseUp': await this.changeStage(attacker, 'defense', 1); break;
      case 'heal': await this.heal(attacker, move.amount); break;
      case 'radiation':
        if (defender.hp > 0) {
          defender.radiation = 3;
          await this.say(`${defender.data.name}에게 방사능낙진! 3턴간 지속 데미지를 받는다!`);
        }
        break;
      case 'recoilHalf':
      case 'recoil': {
        const recoil = move.effect === 'recoilHalf' ? Math.round(dealt * .5) : move.amount;
        const lost = Math.min(attacker.hp, recoil);
        attacker.hp -= lost;
        this.updateHP();
        Sound.play('hit');
        await Promise.all([
          this.animate(attacker, 'hit', 600),
          lost > 0 ? this.shakeField() : Promise.resolve()
        ]);
        await this.say(`${attacker.data.name}도 반동으로 ${lost} 데미지를 받았다!`);
        break;
      }
    }
  }

  async endOfTurn() {
    // Apply both combatants' end-of-turn damage before checking the result.
    const affected = [this.player, this.enemy].filter(fighter => fighter.hp > 0 && fighter.radiation > 0);
    for (const fighter of affected) {
      fighter.hp = Math.max(0, fighter.hp - 8);
      fighter.radiation--;
    }
    this.updateHP();
    for (const fighter of affected) {
      Sound.play('hit');
      await Promise.all([this.animate(fighter, 'hit', 600), this.shakeField()]);
      await this.say(`${fighter.data.name}은(는) 방사능낙진으로 8 데미지를 받았다!`);
      if (fighter.radiation === 0 && fighter.hp > 0) {
        await this.say(`${fighter.data.name}의 방사능낙진이 해제되었다!`);
      }
    }
  }

  async checkResult() {
    if (this.ended) return true;
    if (this.player.hp > 0 && this.enemy.hp > 0) return false;
    this.ended = true;
    this.result = this.player.hp === 0 ? 'lose' : 'win';
    BattleRecord.add(this.result);
    if (this.result === 'lose') this.endStreak();
    for (const fighter of [this.player, this.enemy]) {
      if (fighter.hp === 0) this.sprite(fighter).classList.add('fainted');
    }
    // If recoil or radiation knocks out both fighters, the player loses.
    if (this.player.hp === 0) {
      await this.say('눈앞이 캄캄해졌다...');
    } else {
      Sound.play('victory');
      await this.say(`야생의 ${this.enemy.data.name}을(를) 쓰러뜨렸다!`);
    }
    this.showReplay();
    return true;
  }

  showReplay() {
    this.menu.replaceChildren();
    this.busy = false;
    if (this.result === 'win') {
      this.addButton('연속 도전', () => this.onContinue(this));
    }
    this.addButton('다시 싸우기', this.onReturn, { wide: this.result !== 'win' });
  }

  endStreak() {
    BattleRecord.endStreak(this.streak);
    this.streak = 0;
  }

  async runTurn(action) {
    if (this.busy || this.ended) return;
    if (action.kind === 'potion' && this.potions === 0) return;
    this.busy = true;
    this.menu.replaceChildren();

    if (action.kind === 'escape') {
      if (Math.random() < .5) {
        this.ended = true;
        this.result = 'run';
        BattleRecord.add('run');
        this.endStreak();
        await this.say('무사히 도망쳤다!');
        this.showReplay();
        return;
      }
      await this.say('도망칠 수 없었다!');
      await this.useMove(this.enemy, this.player, this.chooseEnemyMove());
      if (await this.checkResult()) return;
    } else if (action.kind === 'potion') {
      this.potions--;
      await this.say('상처약을 사용했다!');
      await this.heal(this.player, 50);
      await this.useMove(this.enemy, this.player, this.chooseEnemyMove());
      if (await this.checkResult()) return;
    } else {
      const enemyMove = this.chooseEnemyMove();
      const playerSpeed = this.stat(this.player, 'speed');
      const enemySpeed = this.stat(this.enemy, 'speed');
      const playerFirst = playerSpeed > enemySpeed || (playerSpeed === enemySpeed && Math.random() < .5);
      const turns = playerFirst
        ? [[this.player, this.enemy, action.move], [this.enemy, this.player, enemyMove]]
        : [[this.enemy, this.player, enemyMove], [this.player, this.enemy, action.move]];
      for (const [attacker, defender, move] of turns) {
        await this.useMove(attacker, defender, move);
        if (await this.checkResult()) return;
      }
    }
    await this.endOfTurn();
    if (await this.checkResult()) return;
    this.busy = false;
    this.showCommands();
  }
}
