// ============================================================
//  ТАБЛИЦА РЕКОРДОВ — localStorage
// ============================================================

const RECORDS_KEY = 'godzilla_records';
const MAX_RECORDS = 8;

// Загрузить рекорды из localStorage
function loadRecords() {
  try {
    return JSON.parse(localStorage.getItem(RECORDS_KEY)) || [];
  } catch(e) {
    return [];
  }
}

// Сохранить новый рекорд
function saveRecord(score, survived) {
  const records = loadRecords();
  const now = new Date();
  const dateStr = now.toLocaleDateString('ru-RU', { day:'2-digit', month:'2-digit', year:'2-digit' });

  records.push({
    score,
    survived,        // сколько боссов победил
    date: dateStr,
  });

  // Сортируем по счёту (лучший сверху), оставляем MAX_RECORDS
  records.sort((a, b) => b.score - a.score);
  records.splice(MAX_RECORDS);

  localStorage.setItem(RECORDS_KEY, JSON.stringify(records));
  return records;
}

// Отобразить экран рекордов
function showRecordsScreen(backScreen) {
  const records = loadRecords();
  const list = document.getElementById('records-list');

  if (records.length === 0) {
    list.innerHTML = '<div class="records-empty">Пока нет ни одного рекорда.<br>Сыграй первый раз!</div>';
  } else {
    const medals = ['🥇','🥈','🥉'];
    list.innerHTML = records.map((r, i) => `
      <div class="record-row">
        <span class="record-rank">${medals[i] || `#${i+1}`}</span>
        <span class="record-name">Годзилла · ${r.survived} из 3 боссов</span>
        <span class="record-score">${r.score} очков</span>
        <span class="record-date">${r.date}</span>
      </div>
    `).join('');
  }

  // Кнопка «Назад» возвращает на нужный экран
  document.getElementById('btn-back').onclick = () => showScreen(backScreen);
  showScreen('records');
}

// Подсчёт очков: оставшийся HP + бонус за победу
function calcScore(heroHp, bossesDefeated) {
  return heroHp * 2 + bossesDefeated * 100;
}
