// 5초 후 네이버로 자동 이동
const REDIRECT_URL = "https://www.naver.com";
const DELAY = 5000; // 5초

function redirectNow() {
  window.location.href = REDIRECT_URL;
}

// 버튼 클릭 시 즉시 이동
document.addEventListener("DOMContentLoaded", () => {
  const btn = document.getElementById("goNowBtn");
  if (btn) btn.addEventListener("click", redirectNow);

  // 자동 이동 타이머
  setTimeout(redirectNow, DELAY);
});