const swiper = new Swiper('.swiper', {
  effect: 'fade',
  fadeEffect: {
    crossFade: true  // ← 중요!
  },
  direction: 'horizontal',
  loop: true,
  autoplay: {
    delay: 3000,
    disableOnInteraction: false,
  },
  pagination: {
    el: '.swiper-pagination',
    clickable: true,
  },
});


// 일시정지 / 재생 버튼
const toggleBtn = document.querySelector('.swiper-toggle');
let isPaused = false;

toggleBtn.addEventListener('click', () => {
  if (isPaused) {
    swiper.autoplay.start();
    toggleBtn.textContent = '❚❚'; // 일시정지 아이콘
    toggleBtn.setAttribute('aria-label', '슬라이드 일시정지');
  } else {
    swiper.autoplay.stop();
    toggleBtn.textContent = '▶';   // 재생 아이콘
    toggleBtn.setAttribute('aria-label', '슬라이드 재생');
  }
  isPaused = !isPaused;
});
