(() => {
  'use strict';

  const NAME_KEY = 'englishRunner.characterName.v1';
  const MIN_LENGTH = 2;
  const MAX_LENGTH = 12;
  const characterTitle = document.querySelector('#characterTitle');

  const overlay = document.createElement('section');
  overlay.className = 'name-onboarding';
  overlay.hidden = true;
  overlay.setAttribute('aria-labelledby', 'nameOnboardingTitle');
  overlay.innerHTML = `
    <div class="name-onboarding__panel card">
      <p class="eyebrow">NEW TALENT FOUND</p>
      <div class="name-onboarding__ribbon">YOUR DREAM STARTS HERE</div>
      <div class="name-onboarding__portrait" aria-hidden="true">
        <span class="name-onboarding__hair"></span>
        <span class="name-onboarding__face"></span>
        <span class="name-onboarding__glasses name-onboarding__glasses--left"></span>
        <span class="name-onboarding__glasses name-onboarding__glasses--right"></span>
        <span class="name-onboarding__bridge"></span>
        <span class="name-onboarding__body"></span>
        <span class="name-onboarding__label">PIXEL ASSET<br />PLACEHOLDER</span>
      </div>
      <h1 id="nameOnboardingTitle">새로운 원석을 발견했습니다.</h1>
      <p class="name-onboarding__copy">재능은 충분합니다. 이제 디렉터님의 관리가 필요합니다. 이 연습생이 무대에서 사용할 이름을 정해주세요.</p>
      <form class="name-onboarding__form" novalidate>
        <label for="characterNameInput">연습생 이름</label>
        <div class="name-onboarding__input-row">
          <input id="characterNameInput" name="characterName" type="text" minlength="${MIN_LENGTH}" maxlength="${MAX_LENGTH}" autocomplete="off" enterkeyhint="done" placeholder="2~12자로 입력" aria-describedby="characterNameHelp characterNameError" />
          <span class="name-onboarding__counter"><b>0</b>/${MAX_LENGTH}</span>
        </div>
        <p class="name-onboarding__help" id="characterNameHelp">한글, 영문, 숫자를 사용할 수 있습니다.</p>
        <p class="name-onboarding__error" id="characterNameError" aria-live="polite"></p>
        <button class="primary-button name-onboarding__submit" type="submit"><span>트레이닝 시작</span><small>PROJECT DEBUT</small></button>
      </form>
    </div>`;
  document.body.appendChild(overlay);

  const form = overlay.querySelector('form');
  const input = overlay.querySelector('input');
  const counter = overlay.querySelector('.name-onboarding__counter b');
  const error = overlay.querySelector('.name-onboarding__error');

  const normalizeName = (value) => value.replace(/\s+/g, ' ').trim();
  const readName = () => normalizeName(localStorage.getItem(NAME_KEY) || '');

  function setName(name) {
    localStorage.setItem(NAME_KEY, name);
    if (characterTitle) characterTitle.textContent = name;
  }

  function validate(value) {
    const name = normalizeName(value);
    const length = Array.from(name).length;
    if (!name) return '이름을 입력해 주세요.';
    if (length < MIN_LENGTH) return `${MIN_LENGTH}자 이상 입력해 주세요.`;
    if (length > MAX_LENGTH) return `${MAX_LENGTH}자 이하로 입력해 주세요.`;
    if (/[<>]/.test(name)) return '사용할 수 없는 문자가 포함되어 있습니다.';
    return '';
  }

  function open() {
    input.value = '';
    counter.textContent = '0';
    error.textContent = '';
    overlay.hidden = false;
    document.body.classList.add('onboarding-open');
    window.setTimeout(() => input.focus(), 60);
  }

  function close() {
    overlay.hidden = true;
    document.body.classList.remove('onboarding-open');
  }

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    const name = normalizeName(input.value);
    const message = validate(name);
    if (message) {
      error.textContent = message;
      input.setAttribute('aria-invalid', 'true');
      input.focus();
      return;
    }
    input.removeAttribute('aria-invalid');
    setName(name);
    close();
  });

  input.addEventListener('input', () => {
    counter.textContent = Array.from(input.value).length;
    error.textContent = '';
    input.removeAttribute('aria-invalid');
  });

  const savedName = readName();
  if (savedName) setName(savedName);
  else open();
})();
