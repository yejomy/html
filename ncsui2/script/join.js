// join.js (최종본: 요청사항 전체 포함)
window.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("joinForm");
  if (!form) return;

  const submitBtn = form.querySelector('button[type="submit"]');
  const pwMsg = document.getElementById("pwMsg");
  const termsMsg = document.getElementById("termsMsg");

  const goLogin = document.getElementById("goLogin");

  // 약관
  const allAgree = document.getElementById("allAgree");
  const agreeBoxes = Array.from(document.querySelectorAll(".agree"));

  // 입력들
  const inputs = Array.from(document.querySelectorAll(".input"));

  // ✅ 모든 필드 필수
  const REQUIRED_FIELDS = ["name", "email", "username", "password", "password2", "phone"];

  // ----------------------------
  // 유틸
  // ----------------------------
  const val = (name) => String(form.elements[name]?.value ?? "").trim();
  const phoneDigits = () => val("phone").replace(/\D/g, ""); // 숫자만
  const isPhone11Digits = () => phoneDigits().length === 11;

  const passwordsMatch = () => {
    const p1 = val("password");
    const p2 = val("password2");
    return p1.length > 0 && p1 === p2;
  };

  const allRequiredFilled = () => REQUIRED_FIELDS.every((name) => val(name).length > 0);

  const requiredTermsChecked = () =>
    agreeBoxes
      .filter((cb) => cb.dataset.required === "true")
      .every((cb) => cb.checked);

  const setSubmitEnabled = (enabled) => {
    if (!submitBtn) return;
    submitBtn.disabled = !enabled;
    submitBtn.classList.toggle("is-disabled", !enabled);
    submitBtn.setAttribute("aria-disabled", String(!enabled));
  };

  // ----------------------------
  // 1) 체크 아이콘 자동 생성(우측)
  // ----------------------------
  inputs.forEach((input) => {
    const parent = input.parentElement;
    if (!parent) return;

    // field-check 이미 있으면 생성 안 함(중복 방지)
    if (parent.querySelector(".field-check")) return;

    const check = document.createElement("span");
    check.className = "field-check";
    check.setAttribute("aria-hidden", "true");
    check.innerHTML = `
      <svg viewBox="0 0 24 24" width="18" height="18">
        <path d="M20 6L9 17l-5-5" fill="none" stroke="currentColor" stroke-width="2.6"
              stroke-linecap="round" stroke-linejoin="round"/>
      </svg>
    `;
    parent.appendChild(check);
  });

  // ----------------------------
  // 2) 입력 완료 UI(.is-filled + 체크아이콘)
  // ----------------------------
  const setFilledUI = (input) => {
    const parent = input.parentElement;
    const check = parent?.querySelector(".field-check");
    const hasValue = input.value.trim().length > 0;

    input.classList.toggle("is-filled", hasValue);
    if (check) check.classList.toggle("is-on", hasValue);
  };

  // ----------------------------
  // 3) 약관 전체/개별 동기화
  // ----------------------------
  const syncAllAgreeFromChildren = () => {
    if (!allAgree) return;
    allAgree.checked = agreeBoxes.length > 0 && agreeBoxes.every((x) => x.checked);
  };

  if (allAgree) {
    allAgree.addEventListener("change", () => {
      agreeBoxes.forEach((cb) => (cb.checked = allAgree.checked));
      if (termsMsg) termsMsg.textContent = "";
      validateAll();
    });
  }

  agreeBoxes.forEach((cb) => {
    cb.addEventListener("change", () => {
      syncAllAgreeFromChildren();
      if (termsMsg) termsMsg.textContent = "";
      validateAll();
    });
  });

  // ----------------------------
  // 4) 검증 + 버튼 활성화
  // ----------------------------
  const validateAll = () => {
    if (pwMsg) pwMsg.textContent = "";
    if (termsMsg) termsMsg.textContent = "";

    // 비밀번호 불일치 메시지(둘 다 입력됐을 때만)
    const p1 = val("password");
    const p2 = val("password2");
    if (pwMsg && p1.length > 0 && p2.length > 0 && p1 !== p2) {
      pwMsg.textContent = "비밀번호가 일치하지 않아요.";
    }

    const ok =
      allRequiredFilled() &&
      isPhone11Digits() &&          // ✅ 휴대폰 숫자 11자리 필수
      passwordsMatch() &&
      requiredTermsChecked();

    setSubmitEnabled(ok);
    return ok;
  };

  // 입력 이벤트 연결 + 초기 상태 반영
  inputs.forEach((input) => {
    input.addEventListener("input", () => {
      setFilledUI(input);
      validateAll();
    });
    // 자동완성/뒤로가기 대비
    setFilledUI(input);
  });

  // 초기 버튼 상태
  validateAll();

  // ----------------------------
  // 5) 맨 밑 로그인 텍스트 클릭 → login.html (JS)
  // ----------------------------
  if (goLogin) {
    goLogin.addEventListener("click", (e) => {
      e.preventDefault();
      window.location.href = "./login.html";
    });
  }

  // ----------------------------
  // 6) 회원가입 완료 → home.html (JS)
  // ----------------------------
  form.addEventListener("submit", (e) => {
    e.preventDefault();

    const ok = validateAll();
    if (!ok) {
      // 상황별 안내(최소한만)
      if (!allRequiredFilled()) {
        alert("모든 정보를 입력해주세요.");
        return;
      }
      if (!isPhone11Digits()) {
        alert("휴대폰 번호는 숫자 11자리로 입력해주세요. (예: 01012345678)");
        return;
      }
      if (!passwordsMatch()) {
        alert("비밀번호 확인이 필요해요.");
        return;
      }
      if (!requiredTermsChecked()) {
        if (termsMsg) termsMsg.textContent = "필수 약관에 동의해주세요.";
        return;
      }
      return;
    }

    window.location.href = "./home.html";
  });
});
