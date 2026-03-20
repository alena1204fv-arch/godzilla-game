// ============================================================
//  ДАННЫЕ МОНСТРОВ
// ============================================================
const MONSTERS = [
  {
    name: 'Малый Ящер',
    emoji: '🦎',
    hp: 60,
    minAttack: 6,
    maxAttack: 12,
    attackInterval: 2200,
  },
  {
    name: 'Огненный Дракон',
    emoji: '🐉',
    hp: 120,
    minAttack: 12,
    maxAttack: 20,
    attackInterval: 1700,
  },
  {
    name: 'Кинг Гидора',
    emoji: '👾',
    hp: 200,
    minAttack: 20,
    maxAttack: 32,
    attackInterval: 1300,
  }
];

// Спецатаки Годзиллы — зависят от уровня
const SPECIALS = [
  { name: 'Огненное дыхание 🔥', minDmg: 35, maxDmg: 50 },
  { name: 'Удар хвостом 🌀',     minDmg: 45, maxDmg: 65 },
  { name: 'Атомный луч ☢️',      minDmg: 60, maxDmg: 90 },
];

// ============================================================
//  СОСТОЯНИЕ ИГРЫ
// ============================================================
const HERO_MAX_HP    = 150;
const SPECIAL_MAX    = 5;   // сколько ударов нужно для заряда

let currentLevel     = 0;
let heroHp           = HERO_MAX_HP;
let enemyHp          = 0;
let enemyMaxHp       = 0;
let enemyTimer       = null;
let fightActive      = false;
let specialCharge    = 0;   // 0..SPECIAL_MAX
let bossesDefeated   = 0;

// ============================================================
//  ЭЛЕМЕНТЫ DOM
// ============================================================
const screens = {
  load:    document.getElementById('screen-load'),
  menu:    document.getElementById('screen-menu'),
  records: document.getElementById('screen-records'),
  walk:    document.getElementById('screen-walk'),
  fight:   document.getElementById('screen-fight'),
  win:     document.getElementById('screen-win'),
  lose:    document.getElementById('screen-lose'),
};

const heroChar      = document.getElementById('hero-char');
const enemyChar     = document.getElementById('enemy-char');
const enemyNameEl   = document.getElementById('enemy-name');
const heroHpBar     = document.getElementById('hero-hp-bar');
const heroHpLabel   = document.getElementById('hero-hp-label');
const enemyHpBar    = document.getElementById('enemy-hp-bar');
const enemyHpLabel  = document.getElementById('enemy-hp-label');
const fightLog      = document.getElementById('fight-log');
const walkHpBar     = document.getElementById('hp-bar');
const walkHpLabel   = document.getElementById('hp-label');
const levelLabel    = document.getElementById('level-label');
const walkMsg       = document.getElementById('walk-msg');
const enemyWalk     = document.getElementById('enemy-walk');
const btnAttack     = document.getElementById('btn-attack');
const btnSpecial    = document.getElementById('btn-special');
const specialBar    = document.getElementById('special-bar');

// ============================================================
//  ПЕРЕКЛЮЧЕНИЕ ЭКРАНОВ
// ============================================================
function showScreen(name) {
  Object.values(screens).forEach(s => s.classList.remove('active'));
  screens[name].classList.add('active');
}

// ============================================================
//  ЭКРАН ЗАГРУЗКИ
// ============================================================
function runLoadScreen() {
  const bar      = document.getElementById('load-bar');
  const loadText = document.getElementById('load-text');
  const messages = ['Пробуждаем Годзиллу...', 'Созываем монстров...', 'Готовим арену...', 'Вперёд!'];
  let progress   = 0;
  let msgIdx     = 0;

  const interval = setInterval(() => {
    progress += randInt(4, 9);
    if (progress >= 100) progress = 100;
    bar.style.width = progress + '%';

    // Меняем текст по этапам
    const stage = Math.floor(progress / 25);
    if (stage < messages.length && messages[stage] !== loadText.textContent) {
      loadText.textContent = messages[stage];
    }

    if (progress >= 100) {
      clearInterval(interval);
      setTimeout(() => {
        showScreen('menu');
        playMenuMusic();
      }, 400);
    }
  }, 80);
}

// ============================================================
//  СТАРТ / РЕСТАРТ
// ============================================================
function startGame() {
  initAudio();
  currentLevel   = 0;
  heroHp         = HERO_MAX_HP;
  bossesDefeated = 0;
  specialCharge  = 0;
  updateSpecialBar();
  startWalk();
}

// ============================================================
//  ХОДЬБА
// ============================================================
function startWalk() {
  showScreen('walk');
  playWalkMusic();

  const monster = MONSTERS[currentLevel];
  levelLabel.textContent = `Монстр ${currentLevel + 1} из ${MONSTERS.length}`;
  walkMsg.textContent    = '';

  // Рисуем дома в фоне
  buildCityBackground();

  enemyWalk.textContent = monster.emoji;
  enemyWalk.classList.remove('appear');
  updateWalkHpBar();

  setTimeout(() => {
    walkMsg.textContent = `⚠️ Появился ${monster.name}!`;
    enemyWalk.classList.add('appear');
    sfxMonsterAppear();
  }, 1500);

  setTimeout(() => startFight(), 3200);
}

// Генерирует дома разной высоты в фоне
function buildCityBackground() {
  const bg = document.getElementById('bg-layer');
  bg.innerHTML = '';
  const totalWidth = 820 * 4;  // 4x ширина для скролла
  let x = 0;
  while (x < totalWidth) {
    const w = randInt(28, 60);
    const h = randInt(30, 110);
    const el = document.createElement('div');
    el.className = 'bg-building';
    el.style.left   = x + 'px';
    el.style.width  = w + 'px';
    el.style.height = h + 'px';
    // Разрушенные дома на поздних уровнях
    if (currentLevel >= 1 && Math.random() < 0.3) {
      el.style.background    = '#1a0f00';
      el.style.borderColor   = '#2a1a00';
      el.style.borderTopLeftRadius  = randInt(0, 8) + 'px';
      el.style.borderTopRightRadius = randInt(0, 8) + 'px';
    }
    bg.appendChild(el);
    x += w + randInt(4, 18);
  }
}

function updateWalkHpBar() {
  const pct = Math.max(0, (heroHp / HERO_MAX_HP) * 100);
  walkHpBar.style.width      = pct + '%';
  walkHpBar.style.background = pct > 50 ? '#00cc66' : pct > 25 ? '#ffaa00' : '#ff3300';
  walkHpLabel.textContent    = heroHp;
}

// ============================================================
//  БОЙ — старт
// ============================================================
function startFight() {
  const monster  = MONSTERS[currentLevel];
  enemyHp        = monster.hp;
  enemyMaxHp     = monster.hp;
  fightActive    = true;

  enemyChar.textContent   = monster.emoji;
  enemyChar.className     = '';
  heroChar.className      = '';
  enemyNameEl.textContent = monster.name;

  // Показываем нужную спецатаку для этого уровня
  const spec = SPECIALS[currentLevel];
  btnSpecial.textContent = `⚡ ${spec.name}`;

  updateFightBars();
  updateSpecialBar();
  fightLog.innerHTML = `<div class="log-system">⚔️ Бой с ${monster.name}!</div>`;
  btnAttack.disabled  = false;

  showScreen('fight');
  playFightMusic();

  enemyTimer = setInterval(() => {
    if (fightActive) enemyAttacks();
  }, monster.attackInterval);
}

// ============================================================
//  HP-БАРЫ В БОЮ
// ============================================================
function updateFightBars() {
  const hp   = Math.max(0, heroHp);
  const ep   = Math.max(0, enemyHp);
  const hPct = (hp / HERO_MAX_HP) * 100;
  const ePct = (ep / enemyMaxHp)  * 100;

  heroHpBar.style.width  = hPct + '%';
  enemyHpBar.style.width = ePct + '%';
  heroHpBar.style.background  = hPct > 50 ? '#00cc66' : hPct > 25 ? '#ffaa00' : '#ff3300';
  enemyHpBar.style.background = ePct > 50 ? '#ff4444' : ePct > 25 ? '#ff8800' : '#ffcc00';
  heroHpLabel.textContent  = hp;
  enemyHpLabel.textContent = ep;
}

// ============================================================
//  ШКАЛА СПЕЦАТАКИ
// ============================================================
function updateSpecialBar() {
  const pct = (specialCharge / SPECIAL_MAX) * 100;
  specialBar.style.width = pct + '%';
  const isFull = specialCharge >= SPECIAL_MAX;
  specialBar.classList.toggle('full', isFull);
  btnSpecial.disabled = !isFull;
}

// ============================================================
//  ОБЫЧНАЯ АТАКА ИГРОКА
// ============================================================
function playerAttacks() {
  if (!fightActive) return;

  const dmg = randInt(15, 30);
  enemyHp -= dmg;

  triggerAnim(heroChar,  'attack');
  triggerAnim(enemyChar, 'hit');
  sfxPlayerAttack();
  setTimeout(sfxEnemyHit, 120);
  spawnDmgNumber(dmg, 'enemy', false);
  addLog(`Годзилла бьёт — <b>${dmg}</b> урона`, 'log-hero');
  updateFightBars();

  // Заряжаем спецатаку
  if (specialCharge < SPECIAL_MAX) {
    specialCharge++;
    updateSpecialBar();
  }

  if (enemyHp <= 0) monsterDies();
}

// ============================================================
//  СПЕЦАТАКА ИГРОКА
// ============================================================
function playerSpecial() {
  if (!fightActive || specialCharge < SPECIAL_MAX) return;

  const spec = SPECIALS[currentLevel];
  const dmg  = randInt(spec.minDmg, spec.maxDmg);
  enemyHp   -= dmg;

  triggerAnim(heroChar, 'special');
  triggerAnim(enemyChar, 'hit');
  sfxPlayerAttack();
  setTimeout(sfxEnemyHit, 200);
  spawnDmgNumber(dmg, 'enemy', true);
  addLog(`${spec.name} — <b>${dmg}</b> урона!`, 'log-system');
  updateFightBars();

  // Сбрасываем заряд
  specialCharge = 0;
  updateSpecialBar();

  if (enemyHp <= 0) monsterDies();
}

// ============================================================
//  АТАКА МОНСТРА
// ============================================================
function enemyAttacks() {
  const monster = MONSTERS[currentLevel];
  const dmg = randInt(monster.minAttack, monster.maxAttack);
  heroHp -= dmg;

  triggerAnim(enemyChar, 'attack');
  triggerAnim(heroChar,  'hit');
  sfxEnemyAttack();
  setTimeout(sfxHeroHit, 120);
  spawnDmgNumber(dmg, 'hero', false);
  addLog(`${monster.name} бьёт — <b>${dmg}</b> урона`, 'log-enemy');
  updateFightBars();
  updateWalkHpBar();

  if (heroHp <= 0) {
    heroHp = 0;
    heroDies();
  }
}

// ============================================================
//  МОНСТР УМИРАЕТ
// ============================================================
function monsterDies() {
  fightActive = false;
  clearInterval(enemyTimer);
  btnAttack.disabled  = true;
  btnSpecial.disabled = true;

  triggerAnim(enemyChar, 'dead');
  sfxEnemyDie();
  stopMusic();
  bossesDefeated++;
  addLog(`${MONSTERS[currentLevel].name} повержен! 🎉`, 'log-system');

  setTimeout(() => {
    currentLevel++;
    if (currentLevel >= MONSTERS.length) {
      // Победа — сохраняем рекорд
      const score = calcScore(heroHp, bossesDefeated);
      saveRecord(score, bossesDefeated);
      sfxVictory();
      document.getElementById('win-score').textContent = `Счёт: ${score} очков`;
      showScreen('win');
    } else {
      startWalk();
    }
  }, 1600);
}

// ============================================================
//  ГОДЗИЛЛА УМИРАЕТ
// ============================================================
function heroDies() {
  fightActive = false;
  clearInterval(enemyTimer);
  btnAttack.disabled  = true;
  btnSpecial.disabled = true;

  triggerAnim(heroChar, 'dead');
  sfxHeroDie();
  stopMusic();

  // Сохраняем рекорд даже при поражении
  const score = calcScore(0, bossesDefeated);
  saveRecord(score, bossesDefeated);

  addLog('Годзилла пал... 💀', 'log-system');

  setTimeout(() => {
    document.getElementById('lose-msg').textContent =
      `Годзилла пал в бою с ${MONSTERS[currentLevel].name}...`;
    showScreen('lose');
  }, 1600);
}

// ============================================================
//  ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ
// ============================================================
function randInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function triggerAnim(el, cls) {
  el.classList.remove('attack', 'hit', 'dead', 'special');
  void el.offsetWidth;
  el.classList.add(cls);
}

function spawnDmgNumber(dmg, target, isSpecial) {
  const area = document.getElementById('fight-area');
  const el   = document.createElement('div');
  el.className   = `dmg-float ${isSpecial ? 'dmg-special' : 'dmg-' + target}`;
  el.textContent = `-${dmg}`;
  el.style.left  = target === 'enemy' ? '62%' : '6%';
  el.style.top   = '12%';
  area.appendChild(el);
  setTimeout(() => el.remove(), 950);
}

function addLog(html, cls) {
  const lines = fightLog.querySelectorAll('div');
  if (lines.length >= 4) lines[0].remove();
  const div = document.createElement('div');
  div.className = cls;
  div.innerHTML = html;
  fightLog.appendChild(div);
}

// ============================================================
//  СОБЫТИЯ
// ============================================================
document.getElementById('btn-start').addEventListener('click', startGame);
document.getElementById('btn-records').addEventListener('click', () => {
  showRecordsScreen('menu');
});
document.getElementById('btn-restart-win').addEventListener('click', startGame);
document.getElementById('btn-restart-lose').addEventListener('click', startGame);
document.getElementById('btn-records-win').addEventListener('click', () => {
  showRecordsScreen('win');
});

btnAttack.addEventListener('click', playerAttacks);
btnSpecial.addEventListener('click', playerSpecial);

document.addEventListener('keydown', (e) => {
  if (e.code === 'Space') {
    e.preventDefault();
    playerAttacks();
  }
  if (e.code === 'Enter') {
    e.preventDefault();
    playerSpecial();
  }
});

// Запуск: сначала экран загрузки, потом меню
document.addEventListener('DOMContentLoaded', () => {
  initAudio();
  runLoadScreen();
});

document.addEventListener('click', () => {
  if (!ctx) { initAudio(); }
}, { once: true });
