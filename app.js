(() => {
  'use strict';

  const STORAGE_KEY = 'englishRunner.player.v1';
  const DAY_MS = 24 * 60 * 60 * 1000;
  const TARGET_WEIGHT = 72;

  const vocabulary = [
    { word: 'abandon', answers: ['포기하다', '유지하다', '발견하다'], correct: 0 },
    { word: 'achieve', answers: ['피하다', '달성하다', '잊어버리다'], correct: 1 },
    { word: 'maintain', answers: ['유지하다', '감소하다', '나누다'], correct: 0 },
    { word: 'confident', answers: ['지친', '자신감 있는', '불공평한'], correct: 1 },
    { word: 'improve', answers: ['개선하다', '멈추다', '숨기다'], correct: 0 }
  ];

  const defaultState = () => ({
    createdAt: Date.now(),
    lastVisit: Date.now(),
    lastDecayAt: Date.now(),
    weight: 98.4,
    skin: 62,
    streak: 0,
    totalWords: 0,
    todayWords: 0,
    lastStudyDate: '',
    questionIndex: 0
  });

  let state = loadState();
  let selectedAnswer = false;
  let toastTimer;

  const ui = {
    dayCount: document.querySelector('#dayCount'),
    weightValue: document.querySelector('#weightValue'),
    weightDelta: document.querySelector('#weightDelta'),
    skinLabel: document.querySelector('#skinLabel'),
    skinMeter: document.querySelector('#skinMeter'),
    streakValue: document.querySelector('#streakValue'),
    wordCount: document.querySelector('#wordCount'),
    missionWords: document.querySelector('#missionWords'),
    missionProgress: document.querySelector('#missionProgress'),
    phaseLabel: document.querySelector('#phaseLabel'),
    debutProgress: document.querySelector('#debutProgress'),
    debutPercent: document.querySelector('#debutPercent'),
    conditionText: document.querySelector('#conditionText'),
    returnCard: document.querySelector('#returnCard'),
    returnMessage: document.querySelector('#returnMessage'),
    studyDialog: document.querySelector('#studyDialog'),
    infoDialog: document.querySelector('#infoDialog'),
    questionWord: document.querySelector('#questionWord'),
    answerList: document.querySelector('#answerList'),
    feedback: document.querySelector('#feedback'),
    nextWord: document.querySelector('#nextWord'),
    toast: document.querySelector('#toast')
  };

  function loadState() {
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
      return saved ? { ...defaultState(), ...saved } : defaultState();
    } catch (error) {
      console.warn('저장 데이터를 읽지 못해 초기화합니다.', error);
      return defaultState();
    }
  }

  function saveState() {
    state.lastVisit = Date.now();
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }

  function localDateKey(timestamp = Date.now()) {
    const date = new Date(timestamp);
    return `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`;
  }

  function applyAbsenceDecay(now = Date.now()) {
    const base = state.lastDecayAt || state.lastVisit || now;
    const fullDaysAway = Math.floor((now - base) / DAY_MS);

    if (fullDaysAway < 1) return null;

    const appliedDays = Math.min(fullDaysAway, 14);
    const weightGain = +(appliedDays * 0.18).toFixed(1);
    const skinLoss = appliedDays * 4;

    state.weight = Math.min(115, +(state.weight + weightGain).toFixed(1));
    state.skin = Math.max(10, state.skin - skinLoss);
    state.todayWords = 0;
    state.streak = fullDaysAway > 1 ? 0 : state.streak;
    state.lastDecayAt = now;
    saveState();

    return { fullDaysAway, appliedDays, weightGain, skinLoss };
  }

  function applyStudyReward() {
    const today = localDateKey();
    const yesterday = localDateKey(Date.now() - DAY_MS);

    if (state.lastStudyDate !== today) {
      state.streak = state.lastStudyDate === yesterday ? state.streak + 1 : 1;
      state.lastStudyDate = today;
    }

    state.totalWords += 1;
    state.todayWords += 1;
    state.weight = Math.max(TARGET_WEIGHT, +(state.weight - 0.02).toFixed(2));
    state.skin = Math.min(100, state.skin + 0.4);
    state.lastDecayAt = Date.now();
    saveState();
  }

  function getSkinLabel(score) {
    if (score >= 90) return '아이돌 광채';
    if (score >= 75) return '깨끗함';
    if (score >= 55) return '관리 필요';
    if (score >= 35) return '트러블 발생';
    return '집중 관리';
  }

  function getPhase() {
    const progressByWords = Math.min(100, (state.totalWords / 10000) * 100);
    const progressByWeight = Math.min(100, Math.max(0, ((98.4 - state.weight) / (98.4 - TARGET_WEIGHT)) * 100));
    const progress = Math.round((progressByWords * 0.65) + (progressByWeight * 0.35));

    if (progress >= 90) return { name: '데뷔조 센터', progress };
    if (progress >= 65) return { name: '상위권 연습생', progress };
    if (progress >= 35) return { name: '성장 중인 연습생', progress };
    return { name: '초보 연습생', progress: Math.max(8, progress) };
  }

  function render() {
    const phase = getPhase();
    const elapsedDays = Math.max(1, Math.floor((Date.now() - state.createdAt) / DAY_MS) + 1);

    ui.dayCount.textContent = elapsedDays;
    ui.weightValue.textContent = state.weight.toFixed(1);
    ui.weightDelta.textContent = `목표 ${TARGET_WEIGHT.toFixed(1)} kg · ${Math.max(0, state.weight - TARGET_WEIGHT).toFixed(1)} kg 남음`;
    ui.skinLabel.textContent = getSkinLabel(state.skin);
    ui.skinMeter.style.width = `${state.skin}%`;
    ui.streakValue.textContent = state.streak;
    ui.wordCount.textContent = state.totalWords.toLocaleString('ko-KR');
    ui.missionWords.textContent = Math.min(state.todayWords, 20);
    ui.missionProgress.style.width = `${Math.min(100, (state.todayWords / 20) * 100)}%`;
    ui.phaseLabel.textContent = phase.name;
    ui.debutProgress.style.width = `${phase.progress}%`;
    ui.debutPercent.textContent = `${phase.progress}%`;

    if (state.skin < 40) ui.conditionText.textContent = '피부 트러블이 심해졌습니다';
    else if (state.todayWords >= 20) ui.conditionText.textContent = '오늘의 러닝 완료';
    else if (state.streak >= 3) ui.conditionText.textContent = `${state.streak}일 연속 성장 중`;
    else ui.conditionText.textContent = '오늘도 달릴 준비 완료';
  }

  function showReturnReport(report) {
    if (!report) return;
    ui.returnMessage.textContent = `${report.fullDaysAway}일 동안 학습 기록이 없어 체중이 ${report.weightGain.toFixed(1)} kg 늘고 피부 점수가 ${report.skinLoss} 감소했습니다.`;
    ui.returnCard.hidden = false;
  }

  function renderQuestion() {
    selectedAnswer = false;
    const question = vocabulary[state.questionIndex % vocabulary.length];
    ui.questionWord.textContent = question.word;
    ui.answerList.innerHTML = '';
    ui.feedback.textContent = '';
    ui.nextWord.hidden = true;

    question.answers.forEach((answer, index) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'answer-button';
      button.textContent = `${index + 1}. ${answer}`;
      button.addEventListener('click', () => checkAnswer(index, question.correct));
      ui.answerList.appendChild(button);
    });
  }

  function checkAnswer(selected, correct) {
    if (selectedAnswer) return;
    selectedAnswer = true;

    [...ui.answerList.children].forEach((button, index) => {
      button.disabled = true;
      if (index === correct) button.classList.add('correct');
      if (index === selected && selected !== correct) button.classList.add('wrong');
    });

    if (selected === correct) {
      applyStudyReward();
      ui.feedback.textContent = '정답! 러닝 속도와 성장 경험치가 올랐습니다.';
      ui.feedback.style.color = 'var(--mint)';
      render();
    } else {
      ui.feedback.textContent = '오답입니다. 정답을 확인하고 다음 단어로 이동하세요.';
      ui.feedback.style.color = 'var(--danger)';
    }

    ui.nextWord.hidden = false;
  }

  function showToast(message) {
    clearTimeout(toastTimer);
    ui.toast.textContent = message;
    ui.toast.classList.add('show');
    toastTimer = setTimeout(() => ui.toast.classList.remove('show'), 2200);
  }

  document.querySelector('#startStudy').addEventListener('click', () => {
    renderQuestion();
    ui.studyDialog.showModal();
  });

  document.querySelector('#nextWord').addEventListener('click', () => {
    state.questionIndex = (state.questionIndex + 1) % vocabulary.length;
    saveState();
    renderQuestion();
  });

  document.querySelector('#openInfo').addEventListener('click', () => ui.infoDialog.showModal());
  document.querySelector('#closeReturn').addEventListener('click', () => { ui.returnCard.hidden = true; });

  document.querySelector('#simulateDay').addEventListener('click', () => {
    state.lastDecayAt -= DAY_MS;
    const report = applyAbsenceDecay();
    render();
    ui.infoDialog.close();
    showReturnReport(report);
  });

  document.querySelector('#resetData').addEventListener('click', () => {
    localStorage.removeItem(STORAGE_KEY);
    state = defaultState();
    saveState();
    render();
    ui.infoDialog.close();
    ui.returnCard.hidden = true;
    showToast('프로토타입 데이터를 초기화했습니다.');
  });

  document.querySelectorAll('.care-button').forEach((button) => {
    button.addEventListener('click', () => {
      const action = button.dataset.action;
      if (action === 'skin') {
        if (state.totalWords < 3) {
          showToast('단어 3개를 외우면 무료 피부관리가 열립니다.');
          return;
        }
        state.skin = Math.min(100, state.skin + 8);
        saveState();
        render();
        showToast('피부관리 완료: 피부 상태 +8');
        return;
      }
      showToast('다음 개발 단계에서 연결될 메뉴입니다.');
    });
  });

  document.querySelectorAll('.nav-item').forEach((button) => {
    button.addEventListener('click', () => {
      document.querySelectorAll('.nav-item').forEach((item) => item.classList.remove('active'));
      button.classList.add('active');
      if (button.dataset.nav !== 'home') showToast('현재는 홈 화면 프로토타입만 구현되어 있습니다.');
    });
  });

  const report = applyAbsenceDecay();
  render();
  showReturnReport(report);
  window.addEventListener('pagehide', saveState);
})();
