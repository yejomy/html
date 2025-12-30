(() => {
  const form = document.getElementById("loginForm");
  const signupBtn = document.getElementById("signupBtn");

  if (!form || !signupBtn) return;

  /* 회원가입 버튼 */
  signupBtn.addEventListener("click", () => {
    window.location.href = "./resgister.html"; // ✅ 오타 수정
  });

  /* 로그인 submit */
  form.addEventListener("submit", (e) => {
    e.preventDefault();

    const fd = new FormData(form);
    const username = (fd.get("username") || "").toString().trim();
    const password = (fd.get("password") || "").toString();

    if (!username) {
      shake(form.querySelector('input[name="username"]'));
      return;
    }

    if (!password) {
      shake(form.querySelector('input[name="password"]'));
      return;
    }

    // ✅ 로그인 성공 처리 (임시)
    window.location.href = "./home.html";
  });

  /* 간편 로그인 */
  document.querySelectorAll(".social__btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      const provider = btn.dataset.provider;
      alert(`${provider} 간편로그인 (예시)`);
    });
  });

  /* 흔들림 애니메이션 */
  function shake(el) {
    if (!el) return;
    el.focus();
    el.style.transition = "transform 0.08s";
    el.style.transform = "translateX(-6px)";
    setTimeout(() => (el.style.transform = "translateX(6px)"), 80);
    setTimeout(() => (el.style.transform = "translateX(-4px)"), 160);
    setTimeout(() => (el.style.transform = "translateX(4px)"), 240);
    setTimeout(() => (el.style.transform = "translateX(0)"), 320);
  }
})();
