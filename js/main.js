'use strict';

let currentScreen = document.getElementById('title-screen');
let transitioning = false;
let battle = null;
let difficulty = 'normal';

const helpButton = document.getElementById('help-button');
const helpModal = document.getElementById('help-modal');
const helpCloseButton = document.getElementById('help-close-button');

helpButton.onclick = () => {
  if (transitioning) return;
  helpModal.showModal();
  helpCloseButton.focus();
};
helpCloseButton.onclick = () => helpModal.close();
// Native dialog handles Escape and keeps keyboard focus inside the overlay.
helpModal.addEventListener('close', () => helpButton.focus());

const musicToggle = document.getElementById('music-toggle');
function updateMusicToggle() {
  musicToggle.textContent = Music.muted ? 'BGM 켜기' : 'BGM 끄기';
}
updateMusicToggle();
musicToggle.onclick = () => {
  Music.toggle();
  updateMusicToggle();
};

function updateRecordDisplay() {
  const { win, lose, run, maxStreak } = BattleRecord.value;
  const total = win + lose + run;
  const record = total === 0
    ? '아직 전적이 없습니다'
    : `${total}전 ${win}승 ${lose}패 ${run}도주`;
  document.getElementById('battle-record').textContent = record
    + (maxStreak > 0 ? ` · 최고 ${maxStreak}연승` : '');
}

updateRecordDisplay();

async function showScreen(id) {
  currentScreen.classList.add('fade-out');
  await wait(180);
  currentScreen.hidden = true;
  currentScreen.classList.remove('fade-out');
  currentScreen = document.getElementById(id);
  currentScreen.hidden = false;
}

async function selectFighter(fighter) {
  if (transitioning) return;
  transitioning = true;
  Sound.play('click');
  battle = new Battle(fighter, difficulty, returnToTitle, continueBattle);
  await showScreen('battle-screen');
  transitioning = false;
  await battle.start();
}

async function continueBattle(previous) {
  if (transitioning || battle !== previous || previous.result !== 'win' || previous.busy) return;
  previous.busy = true;
  battle = new Battle(previous.player.data, previous.difficulty, returnToTitle, continueBattle, {
    hp: previous.player.hp,
    streak: previous.streak + 1
  });
  await battle.start();
}

async function returnToTitle() {
  if (transitioning) return;
  transitioning = true;
  if (battle) battle.endStreak();
  Music.start('title');
  Sound.play('click');
  updateRecordDisplay();
  await showScreen('title-screen');
  battle = null;
  transitioning = false;
  document.getElementById('start-button').focus();
}

for (const fighter of FIGHTERS) {
  const card = document.createElement('button');
  card.className = 'fighter-card';
  const image = document.createElement('img');
  image.src = `assets/${fighter.id}-front.png`;
  image.alt = `${fighter.name} 앞모습`;
  const name = document.createElement('strong');
  name.textContent = fighter.name;
  const type = document.createElement('span');
  type.className = 'type';
  type.textContent = fighter.type;
  const description = document.createElement('span');
  description.className = 'description';
  description.textContent = fighter.description;
  const stats = document.createElement('span');
  stats.className = 'stats';
  stats.textContent = `HP ${fighter.hp} / 공격 ${fighter.attack} / 방어 ${fighter.defense} / 스피드 ${fighter.speed}`;
  card.append(image, name, type, description, stats);
  card.onclick = () => selectFighter(fighter);
  document.getElementById('fighter-cards').append(card);
}

for (const card of document.querySelectorAll('[data-difficulty]')) {
  card.onclick = async () => {
    if (transitioning) return;
    transitioning = true;
    Sound.play('click');
    difficulty = card.dataset.difficulty;
    await showScreen('select-screen');
    transitioning = false;
    document.querySelector('.fighter-card').focus();
  };
}

document.getElementById('difficulty-back-button').onclick = returnToTitle;

document.getElementById('start-button').onclick = async () => {
  if (transitioning) return;
  transitioning = true;
  Music.start('title');
  Sound.play('click');
  await showScreen('difficulty-screen');
  transitioning = false;
  document.querySelector('[data-difficulty="normal"]').focus();
};
