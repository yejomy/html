(function () {
  const form = document.getElementById("signupForm");
  const goLogin = document.getElementById("goLogin");

  goLogin.addEventListener("click", () => {
    // 로그인 페이지로 이동
    location.href = "./login.html";
  });

  form.addEventListener("submit", (e) => {
    e.preventDefault();

    const fd = new FormData(form);
    const username = fd.get("username")?.trim();
    const email = fd.get("email")?.trim();
    const password = fd.get("password");
    const confirm = fd.get("passwordConfirm");
    const agree = fd.get("agree");

    if (!username || !email || !password || !confirm) {
      alert("모든 항목을 입력해주세요.");
      return;
    }

    if (password !== confirm) {
      alert("비밀번호가 일치하지 않습니다.");
      return;
    }

    if (!agree) {
      alert("약관 동의가 필요합니다.");
      return;
    }

    // TODO: 서버 API 연동
    alert("회원가입 완료 (예시)");
    location.href = "./home.html";
  });
})();
