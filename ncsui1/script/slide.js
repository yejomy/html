document.addEventListener('DOMContentLoaded', () => {
  const swiper = new Swiper('.swiper', {
    loop: false, // 반복 ❌
    autoplay: {
      delay: 3000,
      disableOnInteraction: false,
    },
    pagination: {
      el: '.swiper-pagination',
      clickable: true,
    },

    // ✅ 마지막 슬라이드 도달 시 autoplay 중지
    on: {
      reachEnd: function () {
        this.autoplay.stop();
      },
    },
  });

  document.querySelector('.start-button').addEventListener('click', () => {
    window.location.href = 'https://www.naver.com';
  });
});

