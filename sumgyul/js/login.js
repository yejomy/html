(() => {
  // =========================
  // 기본 라우팅/로그인
  // =========================
  const loginForm = document.getElementById("loginForm");
  const idInput = document.getElementById("idInput");
  const pwInput = document.getElementById("pwInput");
  const errorMsg = document.getElementById("errorMsg");

  const joinBtn = document.getElementById("joinBtn");
  const linkBtns = document.querySelectorAll(".link-btn");
  const socialBtns = document.querySelectorAll(".social-btn");

  const routes = {
    home: "./home.html",
    join: "./join.html",
  };

  const socialLinks = {
    kakao: "https://www.kakaocorp.com",
    naver: "https://www.naver.com",
    facebook: "https://www.facebook.com",
    apple: "https://www.apple.com",
    google: "https://www.google.com",
  };

  const go = (url) => (window.location.href = url);
  const openNew = (url) => window.open(url, "_blank", "noopener,noreferrer");

  loginForm?.addEventListener("submit", (e) => {
    e.preventDefault();
    const idVal = (idInput?.value || "").trim();
    const pwVal = (pwInput?.value || "").trim();

    if (!idVal || !pwVal) {
      if (errorMsg) errorMsg.textContent = "아이디(또는 이메일)와 비밀번호를 모두 입력해주세요.";
      (!idVal ? idInput : pwInput)?.focus();
      return;
    }
    if (errorMsg) errorMsg.textContent = "";
    go(routes.home);
  });

  joinBtn?.addEventListener("click", () => go(routes.join));

  linkBtns.forEach((btn) => {
    btn.addEventListener("click", () => {
      const key = btn.dataset.go;
      if (key === "home") go(routes.home);
    });
  });

  socialBtns.forEach((btn) => {
    btn.addEventListener("click", () => {
      const key = btn.dataset.social;
      const url = socialLinks[key];
      if (url) openNew(url);
    });
  });

  // =========================
  // 모달 공통 유틸
  // =========================
  function setupModal(modalId, openBtnId) {
    const modal = document.getElementById(modalId);
    const openBtn = document.getElementById(openBtnId);
    let lastFocus = null;

    if (!modal || !openBtn) {
      return { modal, open: () => {}, close: () => {}, isReady: false };
    }

    const open = () => {
      lastFocus = document.activeElement;
      modal.classList.add("is-open");
      modal.setAttribute("aria-hidden", "false");
      document.body.style.overflow = "hidden";
      // 첫 input으로 포커스
      modal.querySelector("input")?.focus();
    };

    const close = () => {
      modal.classList.remove("is-open");
      modal.setAttribute("aria-hidden", "true");
      document.body.style.overflow = "";
      lastFocus?.focus();
    };

    openBtn.addEventListener("click", open);

    modal.addEventListener("click", (e) => {
      const t = e.target;
      if (t?.dataset?.close === modalId) close();
      if (t?.closest?.(`[data-close="${modalId}"]`)) close();
    });

    window.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && modal.classList.contains("is-open")) close();
    });

    return { modal, open, close, isReady: true };
  }

  // =========================
  // (A) 아이디 찾기 모달: "입력 → 결과" 완전 전환
  // =========================
  const idModalCtrl = setupModal("idModal", "openIdModal");

  const idFindForm = document.getElementById("idFindForm");
  const idFindMsg = document.getElementById("idFindMsg");
  const foundId = document.getElementById("foundId");

  const idStepForm = document.getElementById("idStepForm");
  const idStepResult = document.getElementById("idStepResult");
  const idGoLoginBtn = document.getElementById("idGoLoginBtn");

  function showIdStep(step) {
    if (!idStepForm || !idStepResult) return;

    if (step === 1) {
      // 입력 화면만
      idStepForm.style.display = "block";
      idStepResult.style.display = "none";
    } else {
      // 결과 화면만
      idStepForm.style.display = "none";
      idStepResult.style.display = "block";
    }
  }

  // 혹시 초기 렌더 꼬여도 1단계로 시작
  showIdStep(1);

  // 아이디찾기 버튼 클릭 시: 항상 입력 화면만 보이게 초기화
  document.getElementById("openIdModal")?.addEventListener("click", () => {
    idFindForm?.reset();
    if (idFindMsg) idFindMsg.textContent = "";
    showIdStep(1);
  });

  // 조회하기: 유효성 검사 후 결과 화면만 보이게
  idFindForm?.addEventListener("submit", (e) => {
    e.preventDefault();

    const name = (idFindForm.name?.value || "").trim();
    const email = (idFindForm.email?.value || "").trim();
    const phoneDigits = (idFindForm.phone?.value || "").replace(/\D/g, "");

    // 입력값 정리
    if (idFindForm.phone) idFindForm.phone.value = phoneDigits;

    if (!name) {
      if (idFindMsg) idFindMsg.textContent = "이름을 입력해주세요.";
      return;
    }
    if (!email) {
      if (idFindMsg) idFindMsg.textContent = "이메일을 입력해주세요.";
      return;
    }
    if (!/^\S+@\S+\.\S+$/.test(email)) {
      if (idFindMsg) idFindMsg.textContent = "이메일 형식을 확인해주세요.";
      return;
    }
    if (phoneDigits.length !== 11) {
      if (idFindMsg) idFindMsg.textContent = "휴대폰 번호는 숫자 11자리로 입력해주세요.";
      return;
    }

    if (idFindMsg) idFindMsg.textContent = "";

    //  데모 결과 (여기 API 붙이면 됨)
    if (foundId) foundId.textContent = `${name}_user`;

    // 결과 화면만 보이게
    showIdStep(2);
  });

  // 로그인으로 돌아가기: 모달 닫고 로그인 input 포커스
  idGoLoginBtn?.addEventListener("click", () => {
    idModalCtrl.close();
    setTimeout(() => idInput?.focus(), 0);
  });

  // =========================
  // (B) 비밀번호 찾기 모달 (기존 유지)
  // =========================
  const pwModalCtrl = setupModal("pwModal", "openPwModal");

  const pwVerifyForm = document.getElementById("pwVerifyForm");
  const pwResetForm = document.getElementById("pwResetForm");
  const pwVerifyMsg = document.getElementById("pwVerifyMsg");
  const pwResetMsg = document.getElementById("pwResetMsg");
  const pwBackBtn = document.getElementById("pwBackBtn");

  const showPwStep = (step) => {
    if (!pwVerifyForm || !pwResetForm) return;
    if (step === 1) {
      pwVerifyForm.hidden = false;
      pwResetForm.hidden = true;
    } else {
      pwVerifyForm.hidden = true;
      pwResetForm.hidden = false;
    }
  };

  document.getElementById("openPwModal")?.addEventListener("click", () => {
    pwVerifyMsg && (pwVerifyMsg.textContent = "");
    pwResetMsg && (pwResetMsg.textContent = "");
    pwVerifyForm?.reset();
    pwResetForm?.reset();
    showPwStep(1);
  });

  pwVerifyForm?.addEventListener("submit", (e) => {
    e.preventDefault();

    const account = (pwVerifyForm.account?.value || "").trim();
    const phoneDigits = (pwVerifyForm.phone?.value || "").replace(/\D/g, "");
    if (pwVerifyForm.phone) pwVerifyForm.phone.value = phoneDigits;

    if (!account) {
      if (pwVerifyMsg) pwVerifyMsg.textContent = "아이디 또는 이메일을 입력해주세요.";
      return;
    }
    if (phoneDigits.length !== 11) {
      if (pwVerifyMsg) pwVerifyMsg.textContent = "휴대폰 번호는 숫자 11자리로 입력해주세요.";
      return;
    }

    if (pwVerifyMsg) pwVerifyMsg.textContent = "";
    showPwStep(2);

    setTimeout(() => pwResetForm?.querySelector("input")?.focus(), 0);
  });

  pwResetForm?.addEventListener("submit", (e) => {
    e.preventDefault();

    const newPw = (pwResetForm.newPw?.value || "").trim();
    const newPw2 = (pwResetForm.newPw2?.value || "").trim();

    if (newPw.length < 8) {
      if (pwResetMsg) pwResetMsg.textContent = "비밀번호는 8자 이상이어야 해요.";
      return;
    }
    if (newPw !== newPw2) {
      if (pwResetMsg) pwResetMsg.textContent = "비밀번호가 일치하지 않아요.";
      return;
    }

    if (pwResetMsg) pwResetMsg.textContent = "";
    pwModalCtrl.close();
    setTimeout(() => idInput?.focus(), 0);
  });

  pwBackBtn?.addEventListener("click", () => {
    if (pwResetMsg) pwResetMsg.textContent = "";
    showPwStep(1);
    setTimeout(() => pwVerifyForm?.querySelector("input")?.focus(), 0);
  });
})();
