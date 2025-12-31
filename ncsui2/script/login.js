window.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("loginForm");
  const joinBtn = document.getElementById("joinBtn");

  // 로그인 -> home.html
  form.addEventListener("submit", (e) => {
    e.preventDefault();

    // TODO: 여기서 실제 로그인 검증/요청 붙이면 됨
    // 지금은 화면 이동만
    window.location.href = "./home.html";
  });

  // 회원가입 -> join.html
  joinBtn.addEventListener("click", () => {
    window.location.href = "./join.html";
  });

  // 소셜 로고 클릭 -> 새창 이동
  document.getElementById("kakaoBtn").addEventListener("click", () => {
    window.open("https://www.kakao.com", "_blank", "noopener,noreferrer");
  });

  document.getElementById("googleBtn").addEventListener("click", () => {
    window.open("https://www.google.com", "_blank", "noopener,noreferrer");
  });

  document.getElementById("fbBtn").addEventListener("click", () => {
    window.open("https://www.facebook.com", "_blank", "noopener,noreferrer");
  });
});
