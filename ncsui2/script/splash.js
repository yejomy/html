const slides = [...document.querySelectorAll(".slide")];
const total = slides.length;

let index = 0;
const AUTO_MS = 4000;
let timer = null;

function updateDots() {
  // 모든 dot 상태 업데이트(활성 슬라이드 기준)
  document.querySelectorAll(".dot").forEach((dot) => {
    const go = Number(dot.dataset.go);
    dot.classList.toggle("is-active", go === index);
    dot.setAttribute("aria-selected", go === index ? "true" : "false");
  });
}

function show(nextIndex) {
  index = Math.max(0, Math.min(total - 1, nextIndex));

  slides.forEach((slide, i) => {
    const active = i === index;
    slide.classList.toggle("is-active", active);
    slide.setAttribute("aria-hidden", active ? "false" : "true");
  });

  updateDots();
}

function startAutoOnce() {
  // 혹시 남아있는 타이머 제거
  if (timer) clearInterval(timer);

  timer = setInterval(() => {
    // 마지막(3번째)이면 멈춤
    if (index >= total - 1) {
      clearInterval(timer);
      timer = null;
      return;
    }
    show(index + 1);
  }, AUTO_MS);
}

// dot 클릭으로 이동 (수동 이동하면 자동 타이머는 유지하되, 마지막이면 멈춤)
document.addEventListener("click", (e) => {
  const dot = e.target.closest(".dot");
  if (!dot) return;

  const go = Number(dot.dataset.go);
  if (!Number.isFinite(go)) return;

  show(go);

  // 마지막 슬라이드면 자동 멈춤
  if (go >= total - 1 && timer) {
    clearInterval(timer);
    timer = null;
  }
});

// 시작
show(0);
startAutoOnce();
