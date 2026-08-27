(() => {
  const rail = document.querySelector('[data-ogham-rail]');
  const beam = document.querySelector('[data-beam]');
  const audio = document.querySelector('audio');
  const current = document.querySelector('[data-current]');
  const remaining = document.querySelector('[data-remaining]');
  const status = document.querySelector('[data-status]');
  const interfaceEl = document.querySelector('.reader-interface');

  if (rail) {
    for (let i = 0; i < 14; i++) {
      const m = document.createElement('span');
      m.className = `ogham-mark ${i % 3 === 0 ? 'across' : (i % 2 ? 'right' : 'left')}`;
      rail.appendChild(m);
    }
  }

  const marks = [...document.querySelectorAll('.ogham-mark')];
  const fmt = s => {
    if (!Number.isFinite(s)) return '00:00';
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${String(m).padStart(2,'0')}:${String(sec).padStart(2,'0')}`;
  };

  function updateProgress() {
    if (!audio || !audio.duration) return;
    const p = Math.max(0, Math.min(1, audio.currentTime / audio.duration));
    if (beam) beam.style.height = `${p * 100}%`;
    if (current) current.textContent = fmt(audio.currentTime);
    if (remaining) remaining.textContent = `-${fmt(audio.duration - audio.currentTime)}`;
    marks.forEach((m, i) => m.classList.toggle('active', i <= Math.floor(p * (marks.length - 1))));
  }

  if (audio) {
    audio.addEventListener('loadedmetadata', updateProgress);
    audio.addEventListener('timeupdate', updateProgress);
    audio.addEventListener('play', () => {
      document.body.classList.add('is-playing');
      if (status) status.textContent = 'TRANSMITTING';
    });
    audio.addEventListener('pause', () => {
      document.body.classList.remove('is-playing');
      if (status) status.textContent = audio.ended ? 'COMPLETE' : 'PAUSED';
    });
    audio.addEventListener('ended', () => {
      document.body.classList.remove('is-playing');
      if (status) status.textContent = 'COMPLETE';
      updateProgress();
    });
  }

  if (interfaceEl && matchMedia('(pointer:fine)').matches) {
    addEventListener('pointermove', e => {
      const x = (e.clientX / innerWidth - .5) * 2;
      const y = (e.clientY / innerHeight - .5) * 2;
      interfaceEl.style.setProperty('--rx', `${(-y * 1.2).toFixed(2)}deg`);
      interfaceEl.style.setProperty('--ry', `${(x * 1.2).toFixed(2)}deg`);
    }, { passive: true });
  }
})();
