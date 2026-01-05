(() => {
  const slides = Array.from(document.querySelectorAll(".slide"));
  const dots = Array.from(document.querySelectorAll(".dot"));
  const skipBtn = document.getElementById("skipBtn");

  const TOTAL = slides.length;
  const INTERVAL_MS = 4000;
  const SWIPE_THRESHOLD = 50; // px (이 이상 움직이면 스와이프로 인정)

  let idx = 0;
  let timer = null;

  // swipe state
  let startX = 0;
  let startY = 0;
  let dragging = false;

  function goLogin() {
    stopAuto();
    window.location.href = "./login.html";
  }

  function render(nextIdx) {
    idx = Math.max(0, Math.min(TOTAL - 1, nextIdx));

    slides.forEach((s, i) => {
      s.classList.toggle("active", i === idx);
      s.setAttribute("aria-hidden", i === idx ? "false" : "true");
    });

    dots.forEach((d, i) => d.classList.toggle("active", i === idx));
  }

  function next() {
    if (idx < TOTAL - 1) {
      render(idx + 1);
    } else {
      goLogin();
    }
  }

  function prev() {
    if (idx > 0) render(idx - 1);
  }

  function startAuto() {
    stopAuto();
    timer = setInterval(() => {
      next();
    }, INTERVAL_MS);
  }

  function stopAuto() {
    if (timer) clearInterval(timer);
    timer = null;
  }

  // dots 클릭 이동
  dots.forEach((dot, i) => {
    dot.addEventListener("click", () => {
      render(i);
      startAuto(); // 타이머 리셋
    });
  });

  // SKIP
  skipBtn.addEventListener("click", goLogin);

  // =========================
  // Swipe / Drag (touch + mouse)
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

    // 세로 스크롤 제스처는 무시(가로로만 처리)
    if (Math.abs(dy) > Math.abs(dx)) return;

    if (dx <= -SWIPE_THRESHOLD) {
      // 왼쪽으로 스와이프 = 다음
      next();
      startAuto();
    } else if (dx >= SWIPE_THRESHOLD) {
      // 오른쪽으로 스와이프 = 이전
      prev();
      startAuto();
    }
  }

  // touch
  swipeTarget.addEventListener("touchstart", (e) => {
    const t = e.touches[0];
    onStart(t.clientX, t.clientY);
  }, { passive: true });

  swipeTarget.addEventListener("touchend", (e) => {
    const t = e.changedTouches[0];
    onEnd(t.clientX, t.clientY);
  });

  // mouse (desktop drag)
  swipeTarget.addEventListener("mousedown", (e) => {
    onStart(e.clientX, e.clientY);
  });

  window.addEventListener("mouseup", (e) => {
    onEnd(e.clientX, e.clientY);
  });

  // 탭 비활성화 시 타이머 정지/재개
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) stopAuto();
    else startAuto();
  });

  // init
  render(0);
  startAuto();
})();
