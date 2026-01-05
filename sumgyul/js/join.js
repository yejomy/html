(() => {
  /* =========================================
     CONFIG
  ========================================== */
  const ROUTES = {
    login: "./login.html",
    home: "./home.html",
  };

  /* =========================================
     DOM
  ========================================== */
  const form = document.getElementById("joinForm");
  const submitBtn = document.getElementById("submitBtn");

  const pwMsg = document.getElementById("pwMsg");
  const termsMsg = document.getElementById("termsMsg");

  const allAgree = document.getElementById("allAgree");
  const agrees = Array.from(document.querySelectorAll(".agree"));

  const goLogin = document.getElementById("goLogin");

  const inputs = Array.from(form.querySelectorAll(".input"));

  /* =========================================
     (Optional) Debug
  ========================================== */
  let debugMsg = document.getElementById("debugMsg");
  if (!debugMsg) {
    debugMsg = document.createElement("p");
    debugMsg.id = "debugMsg";
    debugMsg.style.margin = "8px 0 0";
    debugMsg.style.fontSize = "12px";
    debugMsg.style.color = "rgba(43,43,43,.45)";
    // form 아래쪽에 붙이기 (기존 동작 유지 성격)
    form.appendChild(debugMsg);
  }

  /* =========================================
     Helpers
  ========================================== */
  const go = (key) => {
    const url = ROUTES[key] ?? key;
    if (!url) return;
    location.href = url;
  };

  const isFilled = (inputLike) => {
    if (!inputLike) return false;
    return String(inputLike.value ?? "").trim().length > 0;
  };

  const digitsOnly = (val) => String(val ?? "").replace(/\D/g, "");

  const isEmailValid = (val) => {
    const v = String(val ?? "").trim();
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
  };

  const isPhoneValid = (val) => digitsOnly(val).length === 11;

  function syncFieldState(input) {
    const field = input.closest(".field");
    const check = field?.querySelector(".field-check");
    if (!field || !check) return;

    const filled = isFilled(input);
    input.classList.toggle("is-filled", filled);
    check.classList.toggle("is-on", filled);
  }

  function ensureFieldChecks() {
    // ✅ 각 field마다 우측 체크 아이콘(span) 만들기 (기존 기능 유지)
    inputs.forEach((inp) => {
      const field = inp.closest(".field");
      if (!field) return;
      if (field.querySelector(".field-check")) return;

      const check = document.createElement("span");
      check.className = "field-check";
      check.textContent = "✓";
      field.appendChild(check);
    });
  }

  function validatePasswords() {
    const p1 = form.password?.value ?? "";
    const p2 = form.password2?.value ?? "";

    if (!isFilled(form.password) || !isFilled(form.password2)) {
      pwMsg.textContent = "";
      return { ok: false, reason: "비밀번호/비밀번호 확인을 입력해주세요." };
    }

    if (p1.length < 8) {
      pwMsg.textContent = "비밀번호는 8자 이상이어야 해요.";
      return { ok: false, reason: "비밀번호 8자 미만" };
    }

    if (p1 !== p2) {
      pwMsg.textContent = "비밀번호가 일치하지 않아요.";
      return { ok: false, reason: "비밀번호 확인 불일치" };
    }

    pwMsg.textContent = "";
    return { ok: true, reason: "" };
  }

  function requiredTermsOk() {
    const required = agrees.filter((a) => a.dataset.required === "true");
    return required.every((a) => a.checked);
  }

  function getBlockReason() {
    if (!isFilled(form.name)) return "이름을 입력해주세요.";
    if (!isEmailValid(form.email?.value)) return "이메일 형식을 확인해주세요. (예: test@email.com)";
    if (!isFilled(form.username) || form.username.value.trim().length < 4) return "아이디는 4자 이상 입력해주세요.";

    const pwRes = validatePasswords();
    if (!pwRes.ok) return pwRes.reason;

    if (!isPhoneValid(form.phone?.value)) return "휴대폰 번호는 숫자 11자리로 입력해주세요.";
    if (!requiredTermsOk()) return "(필수) 약관 2개에 동의해주세요.";

    return "";
  }

  function syncSubmit() {
    const reason = getBlockReason();
    const ok = reason === "";

    submitBtn.disabled = !ok;
    submitBtn.classList.toggle("is-disabled", !ok);

    termsMsg.textContent = ok ? "" : (reason.includes("약관") ? reason : "");
    debugMsg.textContent = ok ? "✅ 제출 가능" : `⛔ ${reason}`;
  }

  /* =========================================
     Events
  ========================================== */
  // 입력 변화: 체크표시/filled/submit 동기화
  inputs.forEach((inp) => {
    inp.addEventListener("input", () => {
      // 전화번호는 숫자만 유지 (기존 기능 유지)
      if (inp.name === "phone") inp.value = digitsOnly(inp.value);

      syncFieldState(inp);
      syncSubmit();
    });

    inp.addEventListener("blur", () => {
      syncFieldState(inp);
      syncSubmit();
    });
  });

  // 약관: 전체동의 → 개별 토글
  allAgree.addEventListener("change", () => {
    const checked = allAgree.checked;
    agrees.forEach((a) => (a.checked = checked));
    syncSubmit();
  });

  // 약관: 개별 체크 → 전체동의 상태 업데이트
  agrees.forEach((a) => {
    a.addEventListener("change", () => {
      allAgree.checked = agrees.every((x) => x.checked);
      syncSubmit();
    });
  });

  // 로그인 링크
  goLogin.addEventListener("click", (e) => {
    e.preventDefault();
    go("login");
  });

  // submit
  form.addEventListener("submit", (e) => {
    e.preventDefault();

    const reason = getBlockReason();
    if (reason) {
      syncSubmit();
      return;
    }

    go("home");
  });

  /* =========================================
     Init
  ========================================== */
  ensureFieldChecks();
  inputs.forEach(syncFieldState);
  syncSubmit();
})();
