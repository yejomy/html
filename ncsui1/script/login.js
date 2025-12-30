document.addEventListener("DOMContentLoaded", () => {
  const loginForm = document.getElementById("loginForm");
  const userIdInput = document.getElementById("userId");
  const passwordInput = document.getElementById("password");
  const signupBtn = document.getElementById("signupBtn");

  // 로그인 처리 예시
  loginForm.addEventListener("submit", (e) => {
    e.preventDefault();

    const id = userIdInput.value.trim();
    const pw = passwordInput.value.trim();

    if (!id) {
      alert("아이디를 입력해주세요.");
      userIdInput.focus();
      return;
    }

    if (!pw) {
      alert("비밀번호를 입력해주세요.");
      passwordInput.focus();
      return;
    }

    // TODO: 실제 로그인 API 연동
    alert(`로그인 시도: ${id}`);
  });

  // 회원가입 버튼
  signupBtn.addEventListener("click", () => {
    // TODO: 회원가입 페이지로 이동
    // location.href = "signup.html";
    alert("회원가입 페이지로 이동하도록 연결하세요.");
  });

  // 소셜 로그인 버튼 클릭 처리
  document.querySelectorAll(".social-btn").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.preventDefault();
      const provider = btn.getAttribute("aria-label") || "소셜";
      alert(`${provider} 로그인 연동을 구현하세요.`);
    });
  });
});
