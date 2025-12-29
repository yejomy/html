// 5초 후 네이버로 자동 이동
const REDIRECT_URL = "https://www.naver.com";
const DELAY = 5000; // 5초

setTimeout(() => {
  window.location.href = REDIRECT_URL;
}, DELAY);
