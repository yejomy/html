(function () {
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

  // ✅ 너 Apps Script URL
  const scriptURL =
    "https://script.google.com/macros/s/AKfycbxf6oyB2MSa3J-6YgJME-klqYiduqlTNBNBV3Pid7pma2uIhowNsRTNOWYzfseBqtNRPA/exec";

  // Footer year
  const yearNow = $("#yearNow");
  if (yearNow) yearNow.textContent = String(new Date().getFullYear());

  // ===== Video: muted autoplay, play once, keep last frame =====
  const howVideo = $("#howVideo");
  if (howVideo) {
    howVideo.loop = false;
    howVideo.muted = true;

    const tryPlay = async () => {
      try {
        await howVideo.play();
      } catch (_) {}
    };
    tryPlay();

    howVideo.addEventListener("ended", () => {
      howVideo.pause(); // 마지막 프레임 유지
    });

    // 모바일 정책 대응: 첫 인터랙션에 재시도
    const kick = () => {
      tryPlay();
      window.removeEventListener("touchstart", kick);
      window.removeEventListener("click", kick);
      window.removeEventListener("scroll", kick);
    };
    window.addEventListener("touchstart", kick, { once: true });
    window.addEventListener("click", kick, { once: true });
    window.addEventListener("scroll", kick, { once: true });
  }

  // ===== Countdown: next 22:00 local time =====
  const digits = {
    h1: $("#cd_h1"),
    h2: $("#cd_h2"),
    m1: $("#cd_m1"),
    m2: $("#cd_m2"),
    s1: $("#cd_s1"),
    s2: $("#cd_s2"),
  };
  const bar = $("#cd_bar");

  function pad2(n) {
    const s = String(n);
    return s.length === 1 ? "0" + s : s;
  }

  function getNextTenPM(now = new Date()) {
    const target = new Date(now);
    target.setHours(22, 0, 0, 0);
    if (now.getTime() >= target.getTime()) target.setDate(target.getDate() + 1);
    return target;
  }

  function updateCountdown() {
    const now = new Date();
    const target = getNextTenPM(now);
    const diffMs = target.getTime() - now.getTime();

    const totalSec = Math.max(0, Math.floor(diffMs / 1000));
    const hh = Math.floor(totalSec / 3600);
    const mm = Math.floor((totalSec % 3600) / 60);
    const ss = totalSec % 60;

    const hh2 = pad2(hh);
    const mm2 = pad2(mm);
    const ss2 = pad2(ss);

    if (digits.h1) digits.h1.textContent = hh2[0];
    if (digits.h2) digits.h2.textContent = hh2[1];
    if (digits.m1) digits.m1.textContent = mm2[0];
    if (digits.m2) digits.m2.textContent = mm2[1];
    if (digits.s1) digits.s1.textContent = ss2[0];
    if (digits.s2) digits.s2.textContent = ss2[1];

    // 진행바 (22:00 기준 24h)
    const start = new Date(target);
    start.setDate(target.getDate() - 1);
    start.setHours(22, 0, 0, 0);

    const span = target.getTime() - start.getTime();
    const passed = now.getTime() - start.getTime();
    const pct = Math.min(100, Math.max(0, (passed / span) * 100));
    if (bar) bar.style.width = pct.toFixed(2) + "%";
  }

  updateCountdown();
  setInterval(updateCountdown, 250);

  // ===== Open window UI (표시만) + 테스트용: 버튼은 항상 활성화 =====
  const openStatusEl = $("#openStatus");
  const submitBtn = $("#submitBtn");

  const OPEN_WINDOW_SECONDS = 60; // 나중에 다시 막을 때 사용

  function getTodayTenPM(now = new Date()) {
    const t = new Date(now);
    t.setHours(22, 0, 0, 0);
    return t;
  }

  function isOpenNow(now = new Date()) {
    const ten = getTodayTenPM(now);
    const start = ten.getTime();
    const end = start + OPEN_WINDOW_SECONDS * 1000;
    const cur = now.getTime();
    return cur >= start && cur < end;
  }

  function getNextOpenStart(now = new Date()) {
    const ten = getTodayTenPM(now);
    if (now.getTime() < ten.getTime()) return ten;
    const nxt = new Date(ten);
    nxt.setDate(nxt.getDate() + 1);
    return nxt;
  }

  function updateOpenUI() {
    const now = new Date();
    const open = isOpenNow(now);

    // ✅ 테스트용: 항상 누를 수 있게 고정
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.style.opacity = "1";
      submitBtn.style.cursor = "pointer";
    }

    // 상태 문구는 표시만
    if (openStatusEl) {
      if (open) {
        openStatusEl.classList.add("is-open");
        openStatusEl.classList.remove("is-closed");
        openStatusEl.textContent = "지금 오픈! (22:00 이벤트 응모 가능)";
      } else {
        openStatusEl.classList.add("is-closed");
        openStatusEl.classList.remove("is-open");

        const nextStart = getNextOpenStart(now);
        const diffMs = nextStart.getTime() - now.getTime();
        const totalSec = Math.max(0, Math.floor(diffMs / 1000));
        const hh = Math.floor(totalSec / 3600);
        const mm = Math.floor((totalSec % 3600) / 60);
        const ss = totalSec % 60;

        openStatusEl.textContent = `오픈까지 ${pad2(hh)}:${pad2(mm)}:${pad2(ss)} 남았습니다.`;
      }
    }
  }

  updateOpenUI();
  setInterval(updateOpenUI, 250);

  // ===== Gift number mapping (번호 입력 → 사은품명 표시) =====
  // ✅ 시트 헤더가 answer 라면, HTML hidden input name="answer" 로 맞추는 걸 추천
  const gifts = {
    "1": "애플워치 SE3",
    "2": "신세계 상품권 2만원권",
    "3": "매직마우스",
    "4": "에어태그",
    "5": "스타벅스 아메리카노 쿠폰",
    "6": "바나나맛우유",
  };

  const giftGrid = $("#giftGrid");
  const quizAnswer = $("#quizAnswer");
  const quizAnswerHidden = $("#quizAnswerHidden"); // HTML에서 name="answer" 추천
  const selectedGiftInput = $("#selectedGift");
  const preview = $("#quizAnswerPreview");

  function setSelectedByNumber(no) {
    const n = String(no).trim();

    if (quizAnswer) quizAnswer.value = n;
    if (quizAnswerHidden) quizAnswerHidden.value = n;

    const giftName = gifts[n] || "";
    if (selectedGiftInput) selectedGiftInput.value = giftName;

    if (preview) {
      preview.textContent = giftName
        ? `선택 사은품: ${giftName}`
        : "번호를 입력하면 사은품명이 표시됩니다.";
    }

    if (giftGrid) {
      $$(".giftItem", giftGrid).forEach((btn) => {
        btn.classList.toggle("is-selected", btn.dataset.no === n);
      });
    }
  }

  // 카드 클릭 시 번호 자동입력
  if (giftGrid) {
    giftGrid.addEventListener("click", (e) => {
      const btn = e.target.closest(".giftItem");
      if (!btn) return;
      setSelectedByNumber(btn.dataset.no || "");
    });
  }

  // 번호 직접 입력
  if (quizAnswer) {
    quizAnswer.addEventListener("input", () => {
      const cleaned = quizAnswer.value.replace(/[^\d]/g, "").slice(0, 1);
      quizAnswer.value = cleaned;
      setSelectedByNumber(cleaned);
    });
  }

  setSelectedByNumber("");

  // ===== Form submit (Google Sheet) - 테스트용: 오픈체크 없음 =====
  const form = $("#contactForm");
  const formStatus = $("#formStatus");
  const submittedAt = $("#submittedAt");

  if (!form) return;

  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const n = (quizAnswer?.value || "").trim();
    const giftName = gifts[n];

    if (!giftName) {
      if (formStatus) formStatus.textContent = "사은품 번호(1~6)를 정확히 입력해주세요.";
      quizAnswer?.focus();
      return;
    }

    // hidden 값 동기화
    if (submittedAt) submittedAt.value = new Date().toISOString();
    if (quizAnswerHidden) quizAnswerHidden.value = n;
    if (selectedGiftInput) selectedGiftInput.value = giftName;

    try {
      if (submitBtn) submitBtn.disabled = true;
      if (formStatus) formStatus.textContent = "전송 중...";

      const res = await fetch(scriptURL, {
        method: "POST",
        body: new FormData(form),
      });

      if (!res.ok) throw new Error("전송 실패");

      if (formStatus) formStatus.textContent = "응모가 완료되었습니다!";
      form.reset();
      setSelectedByNumber("");
    } catch (err) {
      console.error(err);
      if (formStatus) formStatus.textContent = "전송 오류! 잠시 후 다시 시도해주세요.";
    } finally {
      // 테스트용: 버튼 다시 풀기
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.style.opacity = "1";
        submitBtn.style.cursor = "pointer";
      }
    }
  });
})();
