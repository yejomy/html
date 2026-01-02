const slides = [...document.querySelectorAll(".slide")];
const total = slides.length;

let index = 0;
const AUTO_MS = 4000; // 모든 단계 4초
let autoTimer = null;      // 자동 슬라이드용
let redirectTimer = null;  // 마지막 화면에서 login으로 가는 타이머

function updateDots() {
  // 모든 dot 상태 업데이트(활성 슬라이드 기준)
  document.querySelectorAll(".dot").forEach((dot) => {
    const go = Number(dot.dataset.go);
    const isActive = go === index;
    dot.classList.toggle("is-active", isActive);
    dot.setAttribute("aria-selected", isActive ? "true" : "false");
  });
}

function show(nextIndex) {
  // 인덱스 보정
  index = Math.max(0, Math.min(total - 1, nextIndex));

  // 슬라이드 표시/숨김
  slides.forEach((slide, i) => {
    const active = i === index;
    slide.classList.toggle("is-active", active);
    slide.setAttribute("aria-hidden", active ? "false" : "true");
  });

  updateDots();

  // ⭐ 마지막 슬라이드가 화면에 뜬 순간, 4초 후 login.html로 이동 예약
  if (index === total - 1 && !redirectTimer) {
    redirectTimer = setTimeout(() => {
      window.location.href = "login.html";
    }, AUTO_MS); // 4초
  }
}

function startAutoOnce() {
  // 혹시 남아있는 타이머 제거
  if (autoTimer) clearInterval(autoTimer);

  autoTimer = setInterval(() => {
    // 마지막 슬라이드에 도달하면 자동 넘김은 멈춤
    if (index >= total - 1) {
      clearInterval(autoTimer);
      autoTimer = null;
      return;
    }

    // 다음 슬라이드로 이동
    show(index + 1);
  }, AUTO_MS);
}

// dot 클릭으로 이동
document.addEventListener("click", (e) => {
  const dot = e.target.closest(".dot");
  if (!dot) return;

  const go = Number(dot.dataset.go);
  if (!Number.isFinite(go)) return;

  show(go);
});

// 시작: 1번 슬라이드 보여주고, 4초마다 자동 슬라이드
show(0);
startAutoOnce();
