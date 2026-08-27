(() => {
  const rail = document.querySelector('[data-ogham-rail]');
  const beam = document.querySelector('[data-beam]');
  const audio = document.querySelector('audio');
  const current = document.querySelector('[data-current]');
  const remaining = document.querySelector('[data-remaining]');
  const status = document.querySelector('[data-status]');
  const interfaceEl = document.querySelector('.reader-interface');
  const canvas = document.querySelector('[data-reactive-wave]');
  const playBtn = document.querySelector('[data-play-toggle]');
  const seek = document.querySelector('[data-seek]');
  const volume = document.querySelector('[data-volume]');

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
    if (remaining) remaining.textContent = fmt(audio.duration);
    if (seek && !seek.matches(':active')) seek.value = String(p * 1000);
    marks.forEach((m, i) => m.classList.toggle('active', i <= Math.floor(p * (marks.length - 1))));
  }

  let audioCtx, analyser, source, data;
  const initAudioGraph = async () => {
    if (!audio) return;
    if (!audioCtx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      audioCtx = new AC();
      analyser = audioCtx.createAnalyser();
      analyser.fftSize = 1024;
      analyser.smoothingTimeConstant = .82;
      data = new Uint8Array(analyser.frequencyBinCount);
      source = audioCtx.createMediaElementSource(audio);
      source.connect(analyser);
      analyser.connect(audioCtx.destination);
    }
    if (audioCtx.state === 'suspended') await audioCtx.resume();
  };

  const drawWave = () => {
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = Math.max(1, canvas.clientWidth * dpr);
    const h = Math.max(1, canvas.clientHeight * dpr);
    if (canvas.width !== w || canvas.height !== h) { canvas.width = w; canvas.height = h; }
    ctx.clearRect(0,0,w,h);
    const bars = Math.max(28, Math.floor(canvas.clientWidth / 7));
    const gap = 2 * dpr;
    const bw = Math.max(1.4 * dpr, (w - gap * (bars - 1)) / bars);
    const cx = h / 2;
    if (analyser && data) analyser.getByteFrequencyData(data);
    for (let i = 0; i < bars; i++) {
      const idx = analyser ? Math.floor((i / bars) * Math.min(data.length, 220)) : 0;
      const amp = analyser ? data[idx] / 255 : .08 + .03 * Math.sin(i * .8);
      const shaped = Math.max(.08, Math.pow(amp, .72));
      const bh = Math.max(2 * dpr, shaped * h * .82);
      const x = i * (bw + gap);
      const progress = audio && audio.duration ? audio.currentTime / audio.duration : 0;
      const active = i / bars <= progress;
      const grad = ctx.createLinearGradient(0, cx - bh/2, 0, cx + bh/2);
      grad.addColorStop(0, active ? '#00ff78' : '#13ad61');
      grad.addColorStop(.5, active ? '#00f7ff' : '#237b65');
      grad.addColorStop(1, active ? '#9d5cff' : '#4d3667');
      ctx.fillStyle = grad;
      ctx.globalAlpha = active ? .98 : .46;
      ctx.shadowBlur = active && document.body.classList.contains('is-playing') ? 8*dpr : 0;
      ctx.shadowColor = '#00ff78';
      const y = cx - bh/2;
      ctx.beginPath();
      const r = Math.min(bw/2, 2*dpr);
      ctx.roundRect ? ctx.roundRect(x,y,bw,bh,r) : ctx.rect(x,y,bw,bh);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
    ctx.shadowBlur = 0;
    requestAnimationFrame(drawWave);
  };

  if (audio) {
    audio.addEventListener('loadedmetadata', updateProgress);
    audio.addEventListener('timeupdate', updateProgress);
    audio.addEventListener('play', async () => {
      await initAudioGraph();
      document.body.classList.add('is-playing');
      if (status) status.textContent = 'TRANSMITTING';
      if (playBtn) playBtn.setAttribute('aria-label','Pause audio');
    });
    audio.addEventListener('pause', () => {
      document.body.classList.remove('is-playing');
      if (status) status.textContent = audio.ended ? 'COMPLETE' : 'PAUSED';
      if (playBtn) playBtn.setAttribute('aria-label','Play audio');
    });
    audio.addEventListener('ended', () => {
      document.body.classList.remove('is-playing');
      if (status) status.textContent = 'COMPLETE';
      updateProgress();
    });
  }

  if (playBtn && audio) {
    playBtn.addEventListener('click', async () => {
      await initAudioGraph();
      audio.paused ? audio.play() : audio.pause();
    });
  }
  if (seek && audio) {
    seek.addEventListener('input', () => {
      if (audio.duration) audio.currentTime = (+seek.value / 1000) * audio.duration;
    });
  }
  if (volume && audio) {
    volume.value = String(audio.volume * 100);
    volume.addEventListener('input', () => audio.volume = +volume.value / 100);
  }

  if (interfaceEl && matchMedia('(pointer:fine)').matches) {
    addEventListener('pointermove', e => {
      const x = (e.clientX / innerWidth - .5) * 2;
      const y = (e.clientY / innerHeight - .5) * 2;
      interfaceEl.style.setProperty('--rx', `${(-y * 1.2).toFixed(2)}deg`);
      interfaceEl.style.setProperty('--ry', `${(x * 1.2).toFixed(2)}deg`);
    }, { passive: true });
  }

  drawWave();
})();