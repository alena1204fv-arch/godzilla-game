// ============================================================
//  ЗВУКОВОЙ ДВИЖОК — Web Audio API
//  Всё генерируется кодом, никаких MP3-файлов не нужно
// ============================================================

const AudioCtx = window.AudioContext || window.webkitAudioContext;
let ctx = null;         // создаётся при первом взаимодействии
let muted = false;
let bgNode = null;      // текущая фоновая музыка
let bgGain = null;

// Инициализация контекста (нужно вызвать после клика пользователя)
function initAudio() {
  if (!ctx) ctx = new AudioCtx();
  if (ctx.state === 'suspended') ctx.resume();
}

// ============================================================
//  УТИЛИТЫ
// ============================================================

// Создаёт осциллятор с огибающей (envelope)
function playTone({ freq = 440, type = 'sine', start = 0,
                    duration = 0.2, gainPeak = 0.3,
                    attackTime = 0.01, releaseTime = 0.1,
                    detune = 0 } = {}) {
  if (!ctx || muted) return;
  const t   = ctx.currentTime + start;
  const osc = ctx.createOscillator();
  const g   = ctx.createGain();
  osc.connect(g);
  g.connect(ctx.destination);
  osc.type            = type;
  osc.frequency.value = freq;
  osc.detune.value    = detune;
  g.gain.setValueAtTime(0, t);
  g.gain.linearRampToValueAtTime(gainPeak, t + attackTime);
  g.gain.setValueAtTime(gainPeak, t + duration - releaseTime);
  g.gain.linearRampToValueAtTime(0, t + duration);
  osc.start(t);
  osc.stop(t + duration);
}

// Шумовой буфер (для ударов, взрывов)
function playNoise({ start = 0, duration = 0.15, gainPeak = 0.2,
                     filterFreq = 1000, releaseTime = 0.1 } = {}) {
  if (!ctx || muted) return;
  const t      = ctx.currentTime + start;
  const bufLen = ctx.sampleRate * duration;
  const buf    = ctx.createBuffer(1, bufLen, ctx.sampleRate);
  const data   = buf.getChannelData(0);
  for (let i = 0; i < bufLen; i++) data[i] = Math.random() * 2 - 1;

  const src    = ctx.createBufferSource();
  const filter = ctx.createBiquadFilter();
  const g      = ctx.createGain();
  src.buffer   = buf;
  filter.type  = 'bandpass';
  filter.frequency.value = filterFreq;
  src.connect(filter);
  filter.connect(g);
  g.connect(ctx.destination);
  g.gain.setValueAtTime(gainPeak, t);
  g.gain.linearRampToValueAtTime(0, t + releaseTime);
  src.start(t);
  src.stop(t + duration);
}

// Останавливает фоновую музыку
function stopBg() {
  if (bgNode) {
    try { bgNode.stop(); } catch(e) {}
    bgNode = null;
  }
  if (bgGain) {
    try { bgGain.disconnect(); } catch(e) {}
    bgGain = null;
  }
}

// Запускает зацикленную мелодию (массив нот [{f, t, dur}])
function loopMelody(notes, tempo = 1.0, vol = 0.15) {
  if (!ctx || muted) return;
  stopBg();

  // Считаем длину одного цикла
  const totalDuration = notes.reduce((max, n) => Math.max(max, n.t + n.dur), 0) * tempo + 0.05;

  bgGain = ctx.createGain();
  bgGain.gain.value = vol;
  bgGain.connect(ctx.destination);

  let startTime = ctx.currentTime;

  function scheduleOnce(offset) {
    const oscs = [];
    notes.forEach(n => {
      const osc = ctx.createOscillator();
      const g   = ctx.createGain();
      osc.connect(g);
      g.connect(bgGain);
      osc.type            = n.type || 'square';
      osc.frequency.value = n.f;
      osc.detune.value    = n.detune || 0;
      const t0 = offset + n.t * tempo;
      const t1 = t0 + n.dur * tempo;
      g.gain.setValueAtTime(0, t0);
      g.gain.linearRampToValueAtTime(n.v || 0.5, t0 + 0.01);
      g.gain.setValueAtTime(n.v || 0.5, t1 - 0.04);
      g.gain.linearRampToValueAtTime(0, t1);
      osc.start(t0);
      osc.stop(t1);
      oscs.push(osc);
    });
    bgNode = oscs[0]; // для возможности остановки
    return offset + totalDuration;
  }

  let next = scheduleOnce(startTime);

  // Планировщик: каждые 200 мс проверяем, нужно ли запланировать следующий цикл
  const interval = setInterval(() => {
    if (!bgGain) { clearInterval(interval); return; }
    if (ctx.currentTime + 0.5 > next) {
      next = scheduleOnce(next);
    }
  }, 200);
}

// ============================================================
//  МЕЛОДИИ
// ============================================================

// Меню — спокойная, торжественная
const MELODY_MENU = [
  {f:220,t:0,   dur:0.4, type:'triangle', v:0.6},
  {f:277,t:0.4, dur:0.4, type:'triangle', v:0.6},
  {f:330,t:0.8, dur:0.4, type:'triangle', v:0.6},
  {f:440,t:1.2, dur:0.8, type:'triangle', v:0.7},
  {f:392,t:2.0, dur:0.4, type:'triangle', v:0.5},
  {f:330,t:2.4, dur:0.4, type:'triangle', v:0.5},
  {f:294,t:2.8, dur:0.8, type:'triangle', v:0.5},
  // бас
  {f:110,t:0,   dur:1.6, type:'sine', v:0.3},
  {f:110,t:1.6, dur:1.6, type:'sine', v:0.3},
];

// Ходьба — ритмичная, маршевая
const MELODY_WALK = [
  {f:330,t:0,    dur:0.22, type:'square', v:0.4},
  {f:392,t:0.25, dur:0.22, type:'square', v:0.4},
  {f:440,t:0.5,  dur:0.22, type:'square', v:0.5},
  {f:494,t:0.75, dur:0.22, type:'square', v:0.4},
  {f:440,t:1.0,  dur:0.22, type:'square', v:0.4},
  {f:392,t:1.25, dur:0.22, type:'square', v:0.4},
  {f:330,t:1.5,  dur:0.45, type:'square', v:0.5},
  // контрмелодия
  {f:165,t:0,    dur:0.5,  type:'sawtooth', v:0.25},
  {f:165,t:0.5,  dur:0.5,  type:'sawtooth', v:0.25},
  {f:196,t:1.0,  dur:0.5,  type:'sawtooth', v:0.25},
  {f:165,t:1.5,  dur:0.5,  type:'sawtooth', v:0.25},
];

// Бой — напряжённая, быстрая
const MELODY_FIGHT = [
  {f:494,t:0,    dur:0.15, type:'sawtooth', v:0.5},
  {f:466,t:0.17, dur:0.15, type:'sawtooth', v:0.5},
  {f:494,t:0.34, dur:0.15, type:'sawtooth', v:0.5},
  {f:523,t:0.51, dur:0.3,  type:'sawtooth', v:0.6},
  {f:494,t:0.85, dur:0.15, type:'sawtooth', v:0.4},
  {f:440,t:1.02, dur:0.15, type:'sawtooth', v:0.4},
  {f:466,t:1.19, dur:0.15, type:'sawtooth', v:0.4},
  {f:494,t:1.36, dur:0.5,  type:'sawtooth', v:0.5},
  // ударный бас
  {f:82, t:0,    dur:0.12, type:'square', v:0.6},
  {f:82, t:0.5,  dur:0.12, type:'square', v:0.6},
  {f:82, t:0.85, dur:0.12, type:'square', v:0.6},
  {f:82, t:1.36, dur:0.12, type:'square', v:0.6},
];

// ============================================================
//  ЗВУКОВЫЕ ЭФФЕКТЫ
// ============================================================

function sfxPlayerAttack() {
  if (muted) return;
  initAudio();
  // Короткий удар — нарастающий свист + шум
  playTone({ freq: 200, type: 'sawtooth', duration: 0.08, gainPeak: 0.4, releaseTime: 0.07 });
  playTone({ freq: 400, type: 'sawtooth', start: 0.04, duration: 0.1, gainPeak: 0.5, releaseTime: 0.08 });
  playNoise({ duration: 0.12, gainPeak: 0.3, filterFreq: 800, releaseTime: 0.1 });
}

function sfxEnemyAttack() {
  if (muted) return;
  initAudio();
  playTone({ freq: 120, type: 'square', duration: 0.1, gainPeak: 0.4, releaseTime: 0.08 });
  playNoise({ duration: 0.15, gainPeak: 0.35, filterFreq: 400, releaseTime: 0.12 });
}

function sfxHeroHit() {
  if (muted) return;
  initAudio();
  playTone({ freq: 180, type: 'square', duration: 0.18, gainPeak: 0.5, releaseTime: 0.15 });
  playNoise({ duration: 0.2, gainPeak: 0.4, filterFreq: 300, releaseTime: 0.18 });
}

function sfxEnemyHit() {
  if (muted) return;
  initAudio();
  playTone({ freq: 600, type: 'square', duration: 0.05, gainPeak: 0.3 });
  playTone({ freq: 300, type: 'square', start: 0.05, duration: 0.1, gainPeak: 0.2, releaseTime: 0.08 });
  playNoise({ duration: 0.1, gainPeak: 0.25, filterFreq: 1200, releaseTime: 0.08 });
}

function sfxEnemyDie() {
  if (muted) return;
  initAudio();
  // Нисходящий глиссандо
  if (!ctx) return;
  const t = ctx.currentTime;
  const osc = ctx.createOscillator();
  const g   = ctx.createGain();
  osc.connect(g); g.connect(ctx.destination);
  osc.type = 'sawtooth';
  osc.frequency.setValueAtTime(600, t);
  osc.frequency.exponentialRampToValueAtTime(60, t + 0.6);
  g.gain.setValueAtTime(0.5, t);
  g.gain.linearRampToValueAtTime(0, t + 0.6);
  osc.start(t); osc.stop(t + 0.6);
  playNoise({ duration: 0.4, gainPeak: 0.4, filterFreq: 600, releaseTime: 0.35 });
}

function sfxHeroDie() {
  if (muted) return;
  initAudio();
  if (!ctx) return;
  const t = ctx.currentTime;
  // Тяжёлое падение
  const osc = ctx.createOscillator();
  const g   = ctx.createGain();
  osc.connect(g); g.connect(ctx.destination);
  osc.type = 'sawtooth';
  osc.frequency.setValueAtTime(300, t);
  osc.frequency.exponentialRampToValueAtTime(30, t + 1.0);
  g.gain.setValueAtTime(0.6, t);
  g.gain.linearRampToValueAtTime(0, t + 1.0);
  osc.start(t); osc.stop(t + 1.0);
  playNoise({ duration: 0.6, gainPeak: 0.5, filterFreq: 200, releaseTime: 0.5 });
}

function sfxVictory() {
  if (muted) return;
  initAudio();
  // Восходящий фанфарный аккорд
  const notes = [262, 330, 392, 523, 659];
  notes.forEach((f, i) => {
    playTone({ freq: f, type: 'triangle', start: i * 0.12,
               duration: 0.6 - i * 0.05, gainPeak: 0.4, releaseTime: 0.3 });
  });
  // Финальный длинный тон
  playTone({ freq: 784, type: 'triangle', start: 0.7, duration: 0.8, gainPeak: 0.5, releaseTime: 0.5 });
}

function sfxMonsterAppear() {
  if (muted) return;
  initAudio();
  if (!ctx) return;
  const t = ctx.currentTime;
  const osc = ctx.createOscillator();
  const g   = ctx.createGain();
  osc.connect(g); g.connect(ctx.destination);
  osc.type = 'sawtooth';
  osc.frequency.setValueAtTime(80, t);
  osc.frequency.exponentialRampToValueAtTime(200, t + 0.3);
  osc.frequency.exponentialRampToValueAtTime(100, t + 0.6);
  g.gain.setValueAtTime(0.5, t);
  g.gain.linearRampToValueAtTime(0, t + 0.6);
  osc.start(t); osc.stop(t + 0.6);
}

// ============================================================
//  УПРАВЛЕНИЕ ФОНОВОЙ МУЗЫКОЙ
// ============================================================

function playMenuMusic()  {
  initAudio();
  if (!muted) loopMelody(MELODY_MENU,  1.2, 0.12);
}
function playWalkMusic()  {
  initAudio();
  if (!muted) loopMelody(MELODY_WALK,  0.8, 0.13);
}
function playFightMusic() {
  initAudio();
  if (!muted) loopMelody(MELODY_FIGHT, 0.7, 0.14);
}
function stopMusic() { stopBg(); }

// ============================================================
//  КНОПКА MUTE
// ============================================================

function toggleMute() {
  muted = !muted;
  const btn = document.getElementById('btn-mute');
  if (muted) {
    stopBg();
    btn.textContent = '🔇';
    btn.title = 'Включить звук';
  } else {
    btn.textContent = '🔊';
    btn.title = 'Выключить звук';
    // Возобновляем текущую музыку
    const activeScreen = document.querySelector('.screen.active')?.id;
    if (activeScreen === 'screen-menu')  playMenuMusic();
    if (activeScreen === 'screen-walk')  playWalkMusic();
    if (activeScreen === 'screen-fight') playFightMusic();
  }
}
