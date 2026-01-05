(() => {
  const slides = Array.from(document.querySelectorAll(".slide"));
  const dots = Array.from(document.querySelectorAll(".dot"));
  const skipBtn = document.getElementById("skipBtn");

  const TOTAL = slides.length;
  const INTERVAL_MS = 4000;
  const SWIPE_THRESHOLD = 50; // px

  let idx = 0;
  let timer = null;

  // swipe state
  let startX = 0;
  let startY = 0;
  let dragging = false;

  const clamp = (n, min, max) => Math.max(min, Math.min(max, n));

  function goLogin() {
    stopAuto();
    window.location.href = "./login.html";
  }

  function render(nextIdx) {
    idx = clamp(nextIdx, 0, TOTAL - 1);

    slides.forEach((s, i) => {
      const active = i === idx;
      s.classList.toggle("is-active", active);
      s.setAttribute("aria-hidden", active ? "false" : "true");
    });

    dots.forEach((d, i) => {
      d.classList.toggle("is-active", i === idx);
      d.setAttribute("aria-current", i === idx ? "true" : "false");
    });
  }

  function next() {
    if (idx < TOTAL - 1) render(idx + 1);
    else goLogin();
  }

  function prev() {
    if (idx > 0) render(idx - 1);
  }

  function startAuto() {
    stopAuto();
    timer = setInterval(next, INTERVAL_MS);
  }

  function stopAuto() {
    if (!timer) return;
    clearInterval(timer);
    timer = null;
  }

  // dots click
  dots.forEach((dot) => {
    dot.addEventListener("click", () => {
      const to = Number(dot.dataset.dot);
      render(Number.isFinite(to) ? to : 0);
      startAuto();
    });
  });

  // skip
  skipBtn?.addEventListener("click", goLogin);

  // =========================
  // Swipe / Drag
  // =========================
  const swipeTarget = document.querySelector(".onboarding");

  function onStart(x, y) {
    startX = x;
    startY = y;
    dragging = true;
  }

  function onEnd(x, y) {
    if (!dragging) return;
    dragging = false;

    const dx = x - startX;
    const dy = y - startY;

    // vertical gesture ignore
    if (Math.abs(dy) > Math.abs(dx)) return;

    if (dx <= -SWIPE_THRESHOLD) {
      next();
      startAuto();
      return;
    }

    if (dx >= SWIPE_THRESHOLD) {
      prev();
      startAuto();
    }
  }

  // touch
  swipeTarget?.addEventListener("touchstart", (e) => {
    const t = e.touches[0];
    onStart(t.clientX, t.clientY);
  }, { passive: true });

  swipeTarget?.addEventListener("touchend", (e) => {
    const t = e.changedTouches[0];
    onEnd(t.clientX, t.clientY);
  });

  // mouse
  swipeTarget?.addEventListener("mousedown", (e) => onStart(e.clientX, e.clientY));
  window.addEventListener("mouseup", (e) => onEnd(e.clientX, e.clientY));

  // tab visibility
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) stopAuto();
    else startAuto();
  });

  // init
  render(0);
  startAuto();
})();
