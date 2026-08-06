(() => {
  'use strict';

  const DATA = window.ENGLISH_RUNNER_DATA;
  const STORAGE_KEY = 'englishRunner.player.v2';
  const LEGACY_KEY = 'englishRunner.player.v1';
  const NAME_KEY = 'englishRunner.characterName.v1';
  const TARGET_WEIGHT = 72;
  const KST_OFFSET_MS = 9 * 60 * 60 * 1000;

  const defaultState = () => ({
    createdAt: Date.now(),
    lastVisit: Date.now(),
    lastTrainingDate: seoulDateKey(),
    weight: 98.4,
    body: 28,
    skin: 62,
    vocal: 42,
    performance: 38,
    discipline: 35,
    streak: 0,
    talent: 120,
    totalWords: 0,
    todayWords: 0,
    masteredWordIds: [],
    reviewWordIds: [],
    retakes: {},
    passedRetakes: 0,
    completedToday: {},
    selectedLevel: 'middle',
    ownedItems: [],
    equippedItems: [],
    lastProcessedDate: seoulDateKey()
  });

  let state = loadState();
  let ptIndex = 0;
  let runSession = null;
  let transitionLocked = false;
  let toastTimer = 0;
  let activeShopCategory = DATA.shopCategories[0];

  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];

  const ui = {
    talentValue: $('#talentValue'), shopTalentValue: $('#shopTalentValue'), dayCount: $('#dayCount'),
    weightValue: $('#weightValue'), weightDelta: $('#weightDelta'), bodyLabel: $('#bodyLabel'), bodyMeter: $('#bodyMeter'),
    skinLabel: $('#skinLabel'), skinMeter: $('#skinMeter'), vocalLabel: $('#vocalLabel'), vocalMeter: $('#vocalMeter'),
    performanceLabel: $('#performanceLabel'), performanceMeter: $('#performanceMeter'), englishMeter: $('#englishMeter'),
    disciplineMeter: $('#disciplineMeter'), streakValue: $('#streakValue'), wordCount: $('#wordCount'), phaseLabel: $('#phaseLabel'),
    debutPercent: $('#debutPercent'), debutProgress: $('#debutProgress'), conditionText: $('#conditionText'), routineDone: $('#routineDone'),
    directiveList: $('#directiveList'), returnCard: $('#returnCard'), returnMessage: $('#returnMessage'), infoDialog: $('#infoDialog'),
    pauseDialog: $('#pauseDialog'), speedList: $('#speedList'), selectedSpeedText: $('#selectedSpeedText'), selectedLevelText: $('#selectedLevelText'),
    retakeList: $('#retakeList'), shopCategories: $('#shopCategories'), shopGrid: $('#shopGrid'), toast: $('#toast')
  };

  function seoulDateKey(timestamp = Date.now()) {
    const date = new Date(timestamp + KST_OFFSET_MS);
    return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}-${String(date.getUTCDate()).padStart(2, '0')}`;
  }

  function dateKeyToUtc(key) {
    const [year, month, day] = key.split('-').map(Number);
    return Date.UTC(year, month - 1, day);
  }

  function daysBetweenKeys(from, to) {
    return Math.max(0, Math.floor((dateKeyToUtc(to) - dateKeyToUtc(from)) / 86400000));
  }

  function migrateLegacy(legacy) {
    const base = defaultState();
    if (!legacy) return base;
    return {
      ...base,
      createdAt: legacy.createdAt || base.createdAt,
      lastVisit: legacy.lastVisit || base.lastVisit,
      weight: Number.isFinite(legacy.weight) ? legacy.weight : base.weight,
      skin: Number.isFinite(legacy.skin) ? legacy.skin : base.skin,
      streak: Number.isFinite(legacy.streak) ? legacy.streak : base.streak,
      totalWords: Number.isFinite(legacy.totalWords) ? legacy.totalWords : base.totalWords,
      todayWords: Number.isFinite(legacy.todayWords) ? legacy.todayWords : base.todayWords,
      lastTrainingDate: legacy.lastStudyDate || base.lastTrainingDate
    };
  }

  function loadState() {
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
      if (saved) return { ...defaultState(), ...saved };
      const legacy = JSON.parse(localStorage.getItem(LEGACY_KEY));
      return migrateLegacy(legacy);
    } catch (error) {
      console.warn('저장 데이터를 읽지 못해 초기 상태로 시작합니다.', error);
      return defaultState();
    }
  }

  function saveState() {
    state.lastVisit = Date.now();
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }

  function clamp(value, min = 0, max = 100) { return Math.min(max, Math.max(min, value)); }

  function getLabel(value, labels) {
    if (value >= 85) return labels[4];
    if (value >= 65) return labels[3];
    if (value >= 45) return labels[2];
    if (value >= 25) return labels[1];
    return labels[0];
  }

  function getDebutProgress() {
    const english = Math.min(100, state.totalWords / 20);
    return Math.round((state.body + state.skin + state.vocal + state.performance + state.discipline + english) / 6);
  }

  function getPhase(progress) {
    if (progress >= 85) return '데뷔조 센터';
    if (progress >= 65) return '데뷔조 후보';
    if (progress >= 45) return '성장 연습생';
    if (progress >= 25) return '기초 연습생';
    return '원석 연습생';
  }

  function getRetakeEntries() { return Object.values(state.retakes).sort((a, b) => b.wrongCount - a.wrongCount); }

  function applyAbsenceDecay() {
    const today = seoulDateKey();
    const lastTraining = state.lastTrainingDate || state.lastProcessedDate || today;
    const elapsed = daysBetweenKeys(lastTraining, today);
    const missedDays = Math.max(0, elapsed - 1);
    if (state.lastProcessedDate === today || missedDays === 0) {
      state.lastProcessedDate = today;
      saveState();
      return null;
    }
    const applied = Math.min(missedDays, 14);
    const weightGain = Number((applied * 0.18).toFixed(1));
    state.weight = Math.min(115, Number((state.weight + weightGain).toFixed(1)));
    state.body = clamp(state.body - applied * 3, 10);
    state.skin = clamp(state.skin - applied * 4, 10);
    state.vocal = clamp(state.vocal - applied * 3, 10);
    state.performance = clamp(state.performance - applied * 3, 10);
    state.discipline = clamp(state.discipline - applied * 5, 5);
    state.streak = 0;
    state.todayWords = 0;
    state.completedToday = {};
    state.lastProcessedDate = today;
    saveState();
    return { missedDays, applied, weightGain };
  }

  function markTraining(activity, talent = 0) {
    const today = seoulDateKey();
    const previous = state.lastTrainingDate;
    const yesterdayKey = seoulDateKey(Date.now() - 86400000);
    if (previous !== today) state.streak = previous === yesterdayKey ? state.streak + 1 : 1;
    state.lastTrainingDate = today;
    state.lastProcessedDate = today;
    state.completedToday[activity] = true;
    state.talent += talent;
    state.discipline = clamp(state.discipline + 2);
    saveState();
  }

  function renderHome() {
    const progress = getDebutProgress();
    const elapsedDays = Math.max(1, daysBetweenKeys(seoulDateKey(state.createdAt), seoulDateKey()) + 1);
    ui.dayCount.textContent = elapsedDays;
    ui.talentValue.textContent = state.talent.toLocaleString('ko-KR');
    ui.shopTalentValue.textContent = state.talent.toLocaleString('ko-KR');
    ui.weightValue.textContent = state.weight.toFixed(1);
    ui.weightDelta.textContent = `목표 ${TARGET_WEIGHT.toFixed(1)} kg · ${Math.max(0, state.weight - TARGET_WEIGHT).toFixed(1)} kg 남음`;
    ui.bodyLabel.textContent = getLabel(state.body, ['초기 상태', '관리 필요', '변화 시작', '균형 잡힘', '무대 체형']);
    ui.skinLabel.textContent = getLabel(state.skin, ['집중 관리', '트러블', '관리 필요', '깨끗함', '아이돌 광채']);
    ui.vocalLabel.textContent = getLabel(state.vocal, ['호흡 부족', '기초 단계', '안정 중', '무대 준비', '라이브 강점']);
    ui.performanceLabel.textContent = getLabel(state.performance, ['몸치 단계', '기초 단계', '리듬 적응', '안무 소화', '센터 퍼포먼스']);
    ui.streakValue.textContent = state.streak;
    ui.wordCount.textContent = state.totalWords.toLocaleString('ko-KR');
    ui.phaseLabel.textContent = getPhase(progress);
    ui.debutPercent.textContent = `${progress}%`;
    ui.debutProgress.style.width = `${progress}%`;
    ui.bodyMeter.style.width = `${state.body}%`;
    ui.skinMeter.style.width = `${state.skin}%`;
    ui.vocalMeter.style.width = `${state.vocal}%`;
    ui.performanceMeter.style.width = `${state.performance}%`;
    ui.englishMeter.style.width = `${Math.min(100, state.totalWords / 20)}%`;
    ui.disciplineMeter.style.width = `${state.discipline}%`;
    if (state.skin < 35 || state.body < 25) ui.conditionText.textContent = '아직 관리가 많이 필요합니다.';
    else if (progress >= 65) ui.conditionText.textContent = '데뷔조다운 분위기가 보이기 시작합니다.';
    else if (Object.keys(state.completedToday).length >= 3) ui.conditionText.textContent = '오늘 컨디션이 좋습니다.';
    else ui.conditionText.textContent = '조금씩 연습생다운 모습이 보입니다.';
    renderDirectives();
    renderCareValues();
  }

  function renderDirectives() {
    const completedCount = DATA.directives.filter((item) => state.completedToday[item.id]).length;
    ui.routineDone.textContent = completedCount;
    ui.directiveList.innerHTML = '';
    DATA.directives.forEach((item) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = `directive-item${state.completedToday[item.id] ? ' is-complete' : ''}`;
      button.innerHTML = `<span class="check-box">${state.completedToday[item.id] ? '✓' : ''}</span><span>${item.label}</span><b>${state.completedToday[item.id] ? '완료' : '시작 ›'}</b>`;
      button.addEventListener('click', () => showView(item.destination));
      ui.directiveList.appendChild(button);
    });
  }

  function renderSpeedList() {
    ui.speedList.innerHTML = '';
    DATA.levels.forEach((level) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = `speed-card card${state.selectedLevel === level.id ? ' is-selected' : ''}`;
      button.innerHTML = `<span class="speed-number"><b>${level.speed}</b><small>km/h</small></span><span class="speed-copy"><small>${level.label} 단어</small><strong>${level.title}</strong><span>예상 ${level.questions}문제 · 최근 정답률 ${level.recentAccuracy}%</span></span><span class="speed-reward">×${level.reward}<small>보상</small></span>`;
      button.addEventListener('click', () => { state.selectedLevel = level.id; saveState(); renderSpeedList(); });
      ui.speedList.appendChild(button);
    });
    const selected = DATA.levels.find((level) => level.id === state.selectedLevel) || DATA.levels[1];
    ui.selectedSpeedText.textContent = `${selected.speed} km/h`;
    ui.selectedLevelText.textContent = `${selected.label} · ${selected.title}`;
  }

  function renderPt() {
    const word = DATA.words[ptIndex % DATA.words.length];
    const level = DATA.levels.find((item) => item.id === word.level);
    $('#ptIndex').textContent = ptIndex + 1;
    $('#ptTotal').textContent = DATA.words.length;
    $('#ptProgress').style.width = `${((ptIndex + 1) / DATA.words.length) * 100}%`;
    $('#ptLevel').textContent = level?.label || word.level;
    $('#ptCategory').textContent = word.category;
    $('#ptWord').textContent = word.word;
    $('#ptPronunciation').textContent = word.pronunciation;
    $('#ptMeaning').textContent = word.meaningPrimary;
    $('#ptExampleEn').textContent = word.exampleEn;
    $('#ptExampleKo').textContent = word.exampleKo;
  }

  function addReviewWord(word) {
    if (!state.reviewWordIds.includes(word.id)) state.reviewWordIds.push(word.id);
    const existing = state.retakes[word.id] || { wordId: word.id, wrongCount: 0, mastery: 0, lastWrongDate: seoulDateKey() };
    state.retakes[word.id] = { ...existing, wrongCount: existing.wrongCount + 1, lastWrongDate: seoulDateKey(), mastery: Math.max(0, existing.mastery - 10) };
  }

  function startRun(customWords = null) {
    const level = DATA.levels.find((item) => item.id === state.selectedLevel) || DATA.levels[1];
    const levelWords = customWords || DATA.words.filter((word) => word.level === level.id);
    const pool = levelWords.length ? levelWords : DATA.words;
    runSession = { level, questions: Array.from({ length: 8 }, (_, index) => pool[index % pool.length]), index: 0, correct: 0, combo: 0, bestCombo: 0, responseTimes: [], startedQuestionAt: performance.now(), wrongWordIds: new Set(), paused: false };
    showView('run');
    renderRunQuestion();
  }

  function renderRunQuestion() {
    if (!runSession || runSession.index >= runSession.questions.length) { finishRun(); return; }
    transitionLocked = false;
    const word = runSession.questions[runSession.index];
    $('#runLevel').textContent = runSession.level.label;
    $('#runSpeed').textContent = `${runSession.level.speed} km/h`;
    $('#comboValue').textContent = runSession.combo;
    $('#runQuestionIndex').textContent = runSession.index + 1;
    $('#runQuestionTotal').textContent = runSession.questions.length;
    $('#runProgress').style.width = `${(runSession.index / runSession.questions.length) * 100}%`;
    $('#runTitle').textContent = word.word;
    $('#runFeedback').textContent = '';
    $('#runFeedback').className = 'run-feedback';
    $('#choiceGrid').innerHTML = '';
    runSession.startedQuestionAt = performance.now();
    word.meanings.forEach((meaning, index) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'choice-button';
      button.textContent = meaning;
      button.addEventListener('click', () => answerRun(index, button));
      $('#choiceGrid').appendChild(button);
    });
  }

  function answerRun(selectedIndex, selectedButton) {
    if (!runSession || transitionLocked || runSession.paused) return;
    transitionLocked = true;
    const word = runSession.questions[runSession.index];
    const correctIndex = word.meanings.indexOf(word.meaningPrimary);
    runSession.responseTimes.push((performance.now() - runSession.startedQuestionAt) / 1000);
    $$('.choice-button').forEach((button) => { button.disabled = true; });
    if (selectedIndex === correctIndex) {
      runSession.correct += 1;
      runSession.combo += 1;
      runSession.bestCombo = Math.max(runSession.bestCombo, runSession.combo);
      selectedButton.classList.add('is-correct');
      $('#runFeedback').textContent = '정답 · 속도 유지';
      $('#runFeedback').className = 'run-feedback is-correct';
      state.totalWords += 1;
      state.todayWords += 1;
    } else {
      runSession.combo = 0;
      selectedButton.classList.add('is-wrong');
      $$('.choice-button')[correctIndex]?.classList.add('is-correct');
      $('#runFeedback').textContent = `오답 · ${word.meaningPrimary}`;
      $('#runFeedback').className = 'run-feedback is-wrong';
      runSession.wrongWordIds.add(word.id);
      addReviewWord(word);
    }
    $('#comboValue').textContent = runSession.combo;
    saveState();
    window.setTimeout(() => { runSession.index += 1; renderRunQuestion(); }, 550);
  }

  function finishRun() {
    if (!runSession) return;
    const total = runSession.questions.length;
    const accuracy = Math.round((runSession.correct / total) * 100);
    const average = runSession.responseTimes.length ? runSession.responseTimes.reduce((a, b) => a + b, 0) / runSession.responseTimes.length : 0;
    const talent = Math.round((8 + runSession.correct * 2) * runSession.level.reward);
    const distance = (runSession.level.speed * (total * 4 / 3600)).toFixed(2);
    const bodyChange = Math.max(1, Math.round(runSession.level.speed / 4));
    state.body = clamp(state.body + bodyChange);
    state.weight = Math.max(TARGET_WEIGHT, Number((state.weight - runSession.correct * 0.015).toFixed(2)));
    markTraining('run', talent);
    $('#resultTotal').textContent = total;
    $('#resultCorrect').textContent = runSession.correct;
    $('#resultAccuracy').textContent = `${accuracy}%`;
    $('#resultResponse').textContent = `${average.toFixed(1)}s`;
    $('#resultCombo').textContent = runSession.bestCombo;
    $('#resultDistance').textContent = `${distance}km`;
    $('#resultTalent').textContent = talent;
    $('#resultRetakes').textContent = runSession.wrongWordIds.size;
    $('#resultBodyChange').textContent = `+${bodyChange}`;
    $('#resultComment').textContent = accuracy >= 80 ? '안정적인 러닝이었습니다. 다음 속도에도 도전할 수 있습니다.' : '약점이 확인되었습니다. 다음 훈련에서 바로 교정할 수 있습니다.';
    renderAll();
    showView('result');
  }

  function renderRetakes() {
    const entries = getRetakeEntries();
    $('#retakeCountHero').textContent = entries.length;
    $('#retakeCountTraining').textContent = `${entries.length}개`;
    $('#passedRetakes').textContent = `${state.passedRetakes} words`;
    ui.retakeList.innerHTML = '';
    if (!entries.length) {
      ui.retakeList.innerHTML = '<div class="empty-state card"><span>✓</span><h2>현재 리테이크가 없습니다.</h2><p>개별 러닝에서 반복해서 틀린 단어가 이곳에 모입니다.</p></div>';
      return;
    }
    entries.forEach((entry) => {
      const word = DATA.words.find((item) => item.id === entry.wordId);
      if (!word) return;
      const label = document.createElement('label');
      label.className = 'retake-item card';
      label.innerHTML = `<input type="checkbox" class="retake-checkbox" value="${word.id}" /><span class="retake-word"><strong>${word.word}</strong><small>${word.meaningPrimary}</small></span><span class="retake-meta"><b>${entry.wrongCount}회 오답</b><small>${entry.lastWrongDate}</small></span><span class="mastery-badge">${entry.mastery}%</span>`;
      ui.retakeList.appendChild(label);
    });
  }

  function selectedRetakeWords() {
    const ids = $$('.retake-checkbox:checked').map((input) => Number(input.value));
    return DATA.words.filter((word) => ids.includes(word.id));
  }

  function renderCareValues() {
    $('#careSkinValue').textContent = Math.round(state.skin);
    $('#careVocalValue').textContent = Math.round(state.vocal);
    $('#carePerformanceValue').textContent = Math.round(state.performance);
    $('#careSkinMeter').style.width = `${state.skin}%`;
    $('#careVocalMeter').style.width = `${state.vocal}%`;
    $('#carePerformanceMeter').style.width = `${state.performance}%`;
    $$('[data-care]').forEach((button) => {
      const key = button.dataset.care === 'dance' ? 'dance' : button.dataset.care;
      button.classList.toggle('is-completed', Boolean(state.completedToday[key]));
      if (button.matches('.secondary-button') && state.completedToday[key]) button.textContent = '오늘 훈련 완료 ✓';
    });
  }

  function completeCare(type) {
    const activity = type === 'dance' ? 'dance' : type;
    if (state.completedToday[activity]) { showToast('오늘 이미 완료한 관리입니다.'); return; }
    if (type === 'skin') state.skin = clamp(state.skin + 8);
    if (type === 'vocal') state.vocal = clamp(state.vocal + 8);
    if (type === 'dance') state.performance = clamp(state.performance + 8);
    markTraining(activity, 8);
    renderAll();
    showToast(`${type === 'skin' ? '피부관리' : type === 'vocal' ? '발성연습' : '춤연습'} 완료 · +8 달란트`);
  }

  function renderShop() {
    ui.shopCategories.innerHTML = '';
    DATA.shopCategories.forEach((category) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.role = 'tab';
      button.className = activeShopCategory === category ? 'is-active' : '';
      button.textContent = category;
      button.addEventListener('click', () => { activeShopCategory = category; renderShop(); });
      ui.shopCategories.appendChild(button);
    });
    ui.shopGrid.innerHTML = '';
    DATA.shopItems.filter((item) => item.category === activeShopCategory).forEach((item) => {
      const owned = state.ownedItems.includes(item.id);
      const equipped = state.equippedItems.includes(item.id);
      const card = document.createElement('article');
      card.className = 'shop-item card';
      card.innerHTML = `<div class="item-placeholder">${item.symbol}</div><div class="item-copy"><small>${item.category}</small><h2>${item.name}</h2>${item.condition ? `<p>해금: ${item.condition}</p>` : '<p>즉시 구매 가능</p>'}</div><div class="item-buy"><strong>✦ ${item.price}</strong><button type="button">${equipped ? '착용 중' : owned ? '착용' : '구매'}</button></div>`;
      card.querySelector('button').addEventListener('click', () => buyOrEquip(item));
      ui.shopGrid.appendChild(card);
    });
  }

  function buyOrEquip(item) {
    const owned = state.ownedItems.includes(item.id);
    if (!owned) {
      if (state.talent < item.price) { showToast('달란트가 부족합니다.'); return; }
      state.talent -= item.price;
      state.ownedItems.push(item.id);
      showToast(`${item.name} 구매 완료`);
    } else if (!state.equippedItems.includes(item.id)) {
      state.equippedItems.push(item.id);
      showToast(`${item.name} 착용 완료`);
    } else {
      state.equippedItems = state.equippedItems.filter((id) => id !== item.id);
      showToast(`${item.name} 착용 해제`);
    }
    saveState();
    renderAll();
  }

  function showView(view) {
    const target = $(`[data-view="${view}"]`);
    if (!target) return;
    $$('.app-view').forEach((section) => section.classList.toggle('is-active', section === target));
    $$('.nav-item').forEach((button) => button.classList.toggle('is-active', button.dataset.nav === view));
    document.body.classList.toggle('is-workout', view === 'run');
    window.scrollTo({ top: 0, behavior: 'auto' });
    if (view === 'speed') renderSpeedList();
    if (view === 'pt') renderPt();
    if (view === 'retake') renderRetakes();
    if (view === 'shop') renderShop();
  }

  function showReturnReport(report) {
    if (!report) return;
    ui.returnMessage.textContent = `${report.missedDays}일 동안 훈련 기록이 없어 체중이 ${report.weightGain.toFixed(1)} kg 늘고 피부·보컬·퍼포먼스 컨디션이 낮아졌습니다. 지금부터 다시 관리하면 회복할 수 있습니다.`;
    ui.returnCard.hidden = false;
  }

  function showToast(message) {
    window.clearTimeout(toastTimer);
    ui.toast.textContent = message;
    ui.toast.classList.add('is-visible');
    toastTimer = window.setTimeout(() => ui.toast.classList.remove('is-visible'), 2300);
  }

  function renderAll() { renderHome(); renderSpeedList(); renderRetakes(); renderCareValues(); renderShop(); }

  function bindEvents() {
    document.addEventListener('click', (event) => { const goButton = event.target.closest('[data-go]'); if (goButton) showView(goButton.dataset.go); });
    $$('.nav-item').forEach((button) => button.addEventListener('click', () => showView(button.dataset.nav)));
    $$('[data-training]').forEach((button) => button.addEventListener('click', () => showView(button.dataset.training === 'pt' ? 'pt' : 'speed')));
    $$('[data-placeholder]').forEach((button) => button.addEventListener('click', () => showToast(`${button.dataset.placeholder}은 다음 콘텐츠 단계에서 연결됩니다.`)));
    $$('[data-care]').forEach((button) => button.addEventListener('click', () => completeCare(button.dataset.care)));
    $('#beginRun').addEventListener('click', () => startRun());
    $('#rememberWord').addEventListener('click', () => {
      const word = DATA.words[ptIndex];
      if (!state.masteredWordIds.includes(word.id)) {
        state.masteredWordIds.push(word.id); state.totalWords += 1; state.todayWords += 1; markTraining('pt', 2); showToast('기억 완료 · 단어 기록과 달란트가 올랐습니다.');
      } else showToast('이미 기억 완료한 단어입니다.');
      ptIndex = (ptIndex + 1) % DATA.words.length; renderPt(); renderAll();
    });
    $('#reviewWord').addEventListener('click', () => { const word = DATA.words[ptIndex]; addReviewWord(word); saveState(); ptIndex = (ptIndex + 1) % DATA.words.length; renderPt(); renderRetakes(); showToast('리테이크 목록에 추가했습니다.'); });
    $('#previousPt').addEventListener('click', () => { ptIndex = (ptIndex - 1 + DATA.words.length) % DATA.words.length; renderPt(); });
    $('#nextPt').addEventListener('click', () => { ptIndex = (ptIndex + 1) % DATA.words.length; renderPt(); });
    $('#playPronunciation').addEventListener('click', () => showToast('발음 음원은 단어 데이터 연결 단계에서 추가됩니다.'));
    $('#pauseRun').addEventListener('click', () => { if (!runSession) return; runSession.paused = true; ui.pauseDialog.showModal(); });
    ui.pauseDialog.addEventListener('close', () => { if (runSession) { runSession.paused = false; runSession.startedQuestionAt = performance.now(); } });
    $('#quitRun').addEventListener('click', () => { runSession = null; ui.pauseDialog.close(); showView('training'); });
    $('#selectAllRetakes').addEventListener('change', (event) => { $$('.retake-checkbox').forEach((input) => { input.checked = event.target.checked; }); });
    $('#startSelectedRetake').addEventListener('click', () => { const words = selectedRetakeWords(); if (!words.length) return showToast('훈련할 단어를 선택하세요.'); startRun(words); });
    $('#quickRetake').addEventListener('click', () => { const words = getRetakeEntries().map((entry) => DATA.words.find((word) => word.id === entry.wordId)).filter(Boolean); if (!words.length) return showToast('현재 리테이크 단어가 없습니다.'); startRun(words); });
    $('#openInfo').addEventListener('click', () => ui.infoDialog.showModal());
    $('#closeReturn').addEventListener('click', () => { ui.returnCard.hidden = true; });
    $('#simulateDay').addEventListener('click', () => { const fakeDate = seoulDateKey(Date.now() - 4 * 86400000); state.lastTrainingDate = fakeDate; state.lastProcessedDate = fakeDate; const report = applyAbsenceDecay(); ui.infoDialog.close(); renderAll(); showReturnReport(report); });
    $('#resetData').addEventListener('click', () => { localStorage.removeItem(STORAGE_KEY); localStorage.removeItem(LEGACY_KEY); localStorage.removeItem(NAME_KEY); window.location.reload(); });
    window.addEventListener('pagehide', saveState);
  }

  const report = applyAbsenceDecay();
  bindEvents();
  renderAll();
  showReturnReport(report);
  showView('home');
})();
