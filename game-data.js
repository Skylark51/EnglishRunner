window.ENGLISH_RUNNER_DATA = Object.freeze({
  levels: [
    { id: 'elementary', label: '초등', speed: 4, title: '워밍업 워킹', difficulty: 1, reward: 1, recentAccuracy: 94, questions: 10 },
    { id: 'middle', label: '중등', speed: 6, title: '파워 워킹', difficulty: 2, reward: 1.25, recentAccuracy: 81, questions: 10 },
    { id: 'high', label: '고등', speed: 8, title: '데일리 러닝', difficulty: 3, reward: 1.6, recentAccuracy: 68, questions: 10 },
    { id: 'advanced', label: '심화', speed: 10, title: '하이 스피드 러닝', difficulty: 4, reward: 2, recentAccuracy: 52, questions: 10 }
  ],
  words: [
    { id: 1, word: 'dream', meaningPrimary: '꿈', meanings: ['꿈', '도구', '규칙', '무대'], level: 'elementary', speed: 4, category: 'noun', pronunciation: '/driːm/', exampleEn: 'Keep your dream alive.', exampleKo: '네 꿈을 계속 간직해라.' },
    { id: 2, word: 'practice', meaningPrimary: '연습하다', meanings: ['연습하다', '포기하다', '감추다', '대신하다'], level: 'elementary', speed: 4, category: 'verb', pronunciation: '/ˈpræktɪs/', exampleEn: 'We practice every morning.', exampleKo: '우리는 매일 아침 연습한다.' },
    { id: 3, word: 'abandon', meaningPrimary: '포기하다', meanings: ['유지하다', '포기하다', '발견하다', '달성하다'], level: 'middle', speed: 6, category: 'verb', pronunciation: '/əˈbændən/', exampleEn: 'Do not abandon your dream.', exampleKo: '네 꿈을 포기하지 마라.' },
    { id: 4, word: 'confident', meaningPrimary: '자신감 있는', meanings: ['자신감 있는', '불공평한', '고립된', '지친'], level: 'middle', speed: 6, category: 'adjective', pronunciation: '/ˈkɑːnfɪdənt/', exampleEn: 'He looks more confident on stage.', exampleKo: '그는 무대에서 더 자신감 있어 보인다.' },
    { id: 5, word: 'maintain', meaningPrimary: '유지하다', meanings: ['감소시키다', '유지하다', '설득하다', '예측하다'], level: 'high', speed: 8, category: 'verb', pronunciation: '/meɪnˈteɪn/', exampleEn: 'Maintain a steady pace.', exampleKo: '일정한 속도를 유지해라.' },
    { id: 6, word: 'discipline', meaningPrimary: '자기 통제', meanings: ['자기 통제', '장식', '경쟁자', '소문'], level: 'high', speed: 8, category: 'noun', pronunciation: '/ˈdɪsəplɪn/', exampleEn: 'Discipline builds lasting habits.', exampleKo: '자기 통제는 지속되는 습관을 만든다.' },
    { id: 7, word: 'resilient', meaningPrimary: '회복력이 있는', meanings: ['회복력이 있는', '명백한', '우연한', '부족한'], level: 'advanced', speed: 10, category: 'adjective', pronunciation: '/rɪˈzɪliənt/', exampleEn: 'A resilient trainee returns stronger.', exampleKo: '회복력이 있는 연습생은 더 강해져 돌아온다.' },
    { id: 8, word: 'meticulous', meaningPrimary: '꼼꼼한', meanings: ['충동적인', '꼼꼼한', '유연한', '일시적인'], level: 'advanced', speed: 10, category: 'adjective', pronunciation: '/məˈtɪkjələs/', exampleEn: 'She is meticulous about every detail.', exampleKo: '그녀는 모든 세부 사항에 꼼꼼하다.' }
  ],
  directives: [
    { id: 'pt', label: '단어 PT 10개', destination: 'pt' },
    { id: 'run', label: '개별 러닝 1회', destination: 'speed' },
    { id: 'retake', label: '리테이크 5개', destination: 'retake' },
    { id: 'skin', label: '피부관리', destination: 'care' },
    { id: 'vocal', label: '발성연습', destination: 'care' },
    { id: 'dance', label: '춤연습', destination: 'care' }
  ],
  shopCategories: ['공연 의상', '연습복', '헤어', '액세서리', '피부관리', '훈련 장비', '연습실'],
  shopItems: [
    { id: 'stage-jacket', category: '공연 의상', name: '스타라이트 재킷', price: 180, symbol: 'SJ', condition: '위클리 평가 C 이상' },
    { id: 'training-set', category: '연습복', name: '모닝 트레이닝 세트', price: 80, symbol: 'TS', condition: '' },
    { id: 'parted-hair', category: '헤어', name: '내추럴 가르마', price: 140, symbol: 'HR', condition: '피부 60 이상' },
    { id: 'thin-glasses', category: '액세서리', name: '슬림 프레임 안경', price: 95, symbol: 'GL', condition: '' },
    { id: 'care-kit', category: '피부관리', name: '데일리 케어 키트', price: 45, symbol: 'SK', condition: '' },
    { id: 'running-shoes', category: '훈련 장비', name: '에어 러닝화', price: 160, symbol: 'RN', condition: '개별 러닝 3회' },
    { id: 'mirror-wall', category: '연습실', name: '전면 연습 거울', price: 220, symbol: 'MR', condition: 'DAY 7' }
  ]
});

(() => {
  const storageKey = 'englishRunner.player.v2';
  try {
    const state = JSON.parse(localStorage.getItem(storageKey));
    if (!state?.lastProcessedDate || !state?.lastTrainingDate) return;
    const completed = Object.keys(state.completedToday || {}).length;
    if (completed > 0 || state.lastTrainingDate >= state.lastProcessedDate) return;
    const [year, month, day] = state.lastProcessedDate.split('-').map(Number);
    const previous = new Date(Date.UTC(year, month - 1, day) - 86400000);
    state.lastTrainingDate = `${previous.getUTCFullYear()}-${String(previous.getUTCMonth() + 1).padStart(2, '0')}-${String(previous.getUTCDate()).padStart(2, '0')}`;
    localStorage.setItem(storageKey, JSON.stringify(state));
  } catch (error) {
    console.warn('일일 상태 보정 데이터를 읽지 못했습니다.', error);
  }
})();
