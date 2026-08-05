(() => {
  'use strict';

  const NAME_KEY = 'englishRunner.characterName.v1';
  const MIN_LENGTH = 2;
  const MAX_LENGTH = 12;

  const characterTitle = document.querySelector('#characterTitle');
  const resetButton = document.querySelector('#resetData');

  const overlay = document.createElement('section');
  overlay.className = 'name-onboarding';
  overlay.hidden = true;
  overlay.setAttribute('aria-labelledby', 'nameOnboardingTitle');
  overlay.innerHTML = `
    <div class="name-onboarding__panel pixel-panel">
      <p class="eyebrow">NEW TRAINEE</p>
      <div class="name-onboarding__portrait" aria-hidden="true">
        <span class="name-onboarding__hair"></span>
        <span class="name-onboarding__face"></span>
        <span class="name-onboarding__glasses name-onboarding__glasses--left"></span>
        <span class="name-onboarding__glasses name-onboarding__glasses--right"></span>
        <span class="name-onboarding__bridge"></span>
        <span class="name-onboarding__body"></span>
      </div>
      <h2 id="nameOnboardingTitle">연습생의 이름을 정해주세요.</h2>
      <p class="name-onboarding__copy">앞으로 단어를 외우며 함께 성장할 캐릭터입니다. 이름은 나중에 변경 기능을 추가할 예정입니다.</p>
      <form class="name-onboarding__form" novalidate>
        <label for="characterNameInput">캐릭터 이름</label>
        <div class="name-onboarding__input-row">
          <input
            id="characterNameInput"
            name="characterName"
            type="text"
            minlength="${MIN_LENGTH}"
            maxlength="${MAX_LENGTH}"
            autocomplete="off"
            enterkeyhint="done"
            placeholder="2~12자로 입력"
            aria-describedby="characterNameHelp characterNameError"
          />
          <span class="name-onboarding__counter"><b>0</b>/${MAX_LENGTH}</span>
        </div>
        <p class="name-onboarding__help" id="characterNameHelp">한글, 영문, 숫자를 사용할 수 있습니다.</p>
        <p class="name-onboarding__error" id="characterNameError" aria-live="polite"></p>
        <button class="primary-button name-onboarding__submit" type="submit">
          <span>이 이름으로 시작</span>
          <small>GAME START</small>
        </button>
      </form>
    </div>
  `;

  document.body.appendChild(overlay);

  const form = overlay.querySelector('.name-onboarding__form');
  const input = overlay.querySelector('#characterNameInput');
  const counter = overlay.querySelector('.name-onboarding__counter b');
  const error = overlay.querySelector('#characterNameError');

  function normalizeName(value) {
    return value.replace(/\s+/g, ' ').trim();
  }

  function readName() {
    return normalizeName(localStorage.getItem(NAME_KEY) || '');
  }

  function setCharacterName(name) {
    localStorage.setItem(NAME_KEY, name);
    if (characterTitle) characterTitle.textContent = name;
  }

  function updateCounter() {
    counter.textContent = Array.from(input.value).length;
  }

  function validateName(value) {
    const name = normalizeName(value);
    const length = Array.from(name).length;

    if (!name) return '이름을 입력해 주세요.';
    if (length < MIN_LENGTH) return `이름은 ${MIN_LENGTH}자 이상이어야 합니다.`;
    if (length > MAX_LENGTH) return `이름은 ${MAX_LENGTH}자 이하로 입력해 주세요.`;
    if (/[<>]/.test(name)) return '이름에 사용할 수 없는 문자가 포함되어 있습니다.';
    return '';
  }

  function openOnboarding() {
    input.value = '';
    error.textContent = '';
    updateCounter();
    overlay.hidden = false;
    document.body.classList.add('onboarding-open');
    window.setTimeout(() => input.focus(), 50);
  }

  function closeOnboarding() {
    overlay.hidden = true;
    document.body.classList.remove('onboarding-open');
  }

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    const name = normalizeName(input.value);
    const validationMessage = validateName(name);

    if (validationMessage) {
      error.textContent = validationMessage;
      input.setAttribute('aria-invalid', 'true');
      input.focus();
      return;
    }

    input.removeAttribute('aria-invalid');
    setCharacterName(name);
    closeOnboarding();
  });

  input.addEventListener('input', () => {
    error.textContent = '';
    input.removeAttribute('aria-invalid');
    updateCounter();
  });

  if (resetButton) {
    resetButton.addEventListener('click', () => {
      localStorage.removeItem(NAME_KEY);
      window.setTimeout(openOnboarding, 0);
    });
  }

  const savedName = readName();
  if (savedName) setCharacterName(savedName);
  else openOnboarding();
})();
