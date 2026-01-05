(() => {
  const form = document.getElementById("joinForm");
  const inputs = Array.from(form.querySelectorAll(".input"));

  const pwMsg = document.getElementById("pwMsg");
  const termsMsg = document.getElementById("termsMsg");
  const submitBtn = document.getElementById("submitBtn");

  const allAgree = document.getElementById("allAgree");
  const agrees = Array.from(document.querySelectorAll(".agree"));

  const goLogin = document.getElementById("goLogin");

  // ✅ 디버그(왜 안되는지 보여줄 메세지) - 없으면 만들어줌
  let debugMsg = document.getElementById("debugMsg");
  if (!debugMsg) {
    debugMsg = document.createElement("p");
    debugMsg.id = "debugMsg";
    debugMsg.className = "error";
    debugMsg.style.marginTop = "-4px";
    submitBtn.insertAdjacentElement("beforebegin", debugMsg);
  }

  // ✅ 각 field마다 우측 체크 아이콘(span) 만들기
  inputs.forEach((inp) => {
    const field = inp.closest(".field");
    if (!field) return;
    if (field.querySelector(".field-check")) return;

    const check = document.createElement("span");
    check.className = "field-check";
    check.textContent = "✓";
    field.appendChild(check);
  });

  const isFilled = (input) => input.value.trim().length > 0;

  const isEmailValid = (val) => {
    const v = val.trim();
    // 최소한의 이메일 형태: a@b.c
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
  };

  const digitsOnly = (val) => val.replace(/\D/g, "");

  const isPhoneValid = (val) => {
    const digits = digitsOnly(val);
    return digits.length === 11; // 010xxxxxxxx
  };

  function syncFieldState(input) {
    const field = input.closest(".field");
    const check = field?.querySelector(".field-check");
    if (!check) return;

    const ok = isFilled(input);
    check.classList.toggle("is-on", ok);
    input.classList.toggle("is-filled", ok);
  }

  function validatePasswords() {
    const pw = form.password.value.trim();
    const pw2 = form.password2.value.trim();

    if (!pw && !pw2) {
      pwMsg.textContent = "";
      return { ok: false, reason: "비밀번호를 입력해주세요." };
    }

    if (pw.length < 8) {
      pwMsg.textContent = "비밀번호는 8자 이상이어야 해요.";
      return { ok: false, reason: "비밀번호 8자 이상" };
    }

    if (pw !== pw2) {
      pwMsg.textContent = "비밀번호가 일치하지 않아요.";
      return { ok: false, reason: "비밀번호 확인 불일치" };
    }

    pwMsg.textContent = "";
    return { ok: true };
  }

  function requiredTermsOk() {
    const required = agrees.filter(a => a.dataset.required === "true");
    return required.every(a => a.checked);
  }

  function getBlockReason() {
    if (!isFilled(form.name)) return "이름을 입력해주세요.";
    if (!isEmailValid(form.email.value)) return "이메일 형식을 확인해주세요. (예: test@email.com)";
    if (!isFilled(form.username) || form.username.value.trim().length < 4) return "아이디는 4자 이상 입력해주세요.";

    const pwRes = validatePasswords();
    if (!pwRes.ok) return pwRes.reason;

    if (!isPhoneValid(form.phone.value)) return "휴대폰 번호는 숫자 11자리로 입력해주세요.";
    if (!requiredTermsOk()) return "(필수) 약관 2개에 동의해주세요.";

    return ""; // 통과
  }

  function syncSubmit() {
    const reason = getBlockReason();
    const ok = reason === "";

    submitBtn.disabled = !ok;
    submitBtn.classList.toggle("is-disabled", !ok);

    // 약관 메시지
    termsMsg.textContent = requiredTermsOk() ? "" : "(필수) 약관에 동의해주세요.";

    // ✅ 왜 비활성인지 안내(개발중엔 켜두고, 나중에 숨겨도 됨)
    debugMsg.textContent = ok ? "" : `회원가입 완료가 비활성인 이유: ${reason}`;
  }

  // 입력 이벤트
  inputs.forEach((inp) => {
    inp.addEventListener("input", () => {
      // 휴대폰은 숫자만 남기기
      if (inp.name === "phone") {
        inp.value = digitsOnly(inp.value);
      }

      syncFieldState(inp);
      syncSubmit();
    });

    inp.addEventListener("blur", () => {
      syncFieldState(inp);
      syncSubmit();
    });

    // 초기 반영
    syncFieldState(inp);
  });

  // 약관: 전체동의
  allAgree.addEventListener("change", () => {
    agrees.forEach(a => (a.checked = allAgree.checked));
    syncSubmit();
  });

  // 약관: 개별 체크 시 전체동의 상태 업데이트
  agrees.forEach((a) => {
    a.addEventListener("change", () => {
      allAgree.checked = agrees.every(x => x.checked);
      syncSubmit();
    });
  });

  // 로그인 링크
  goLogin.addEventListener("click", (e) => {
    e.preventDefault();
    location.href = "./login.html";
  });

  // submit
  form.addEventListener("submit", (e) => {
    e.preventDefault();

    const reason = getBlockReason();
    if (reason) {
      syncSubmit();
      return;
    }

    location.href = "./home.html";
  });

  // 초기
  syncSubmit();
})();
