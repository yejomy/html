(() => {
  /* =========================================================
     1) Today 날짜
     ========================================================= */
  const todayDate = document.getElementById("todayDate");
  if (todayDate) {
    const d = new Date();
    const yy = String(d.getFullYear()).slice(-2);
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    todayDate.textContent = `${yy}.${mm}.${dd}`;
  }

  /* =========================================================
     2) 안정 카드: 4개 이미지 중 랜덤 1개만 보이기
     ========================================================= */
  const actionImgs = Array.from(
    document.querySelectorAll("#actionIconWrap .actionImg")
  );

  const ACTION_MODAL = {
    breath: {
      title: "숨쉬기",
      body: "4초 들이마시고, 7초 멈추고, 8초 내쉬어봐요.\n지금 이 순간에 집중해도 괜찮아",
    },
    color: {
      title: "색찾기",
      body: "주변에서 보이는 색 5가지를 찾아봐요.\n색을 찾을수록 마음이 현재로 돌아와요",
    },
    tap: {
      title: "두드리기",
      body: "턱/이마/어깨를 손끝으로 가볍게 톡톡 두드려봐요.\n몸의 감각에 집중하면 긴장이 풀려요",
    },
    scan: {
      title: "시각스캔",
      body: "눈에 보이는 물건 5가지를 천천히 관찰해요.\n모양/색/질감을 하나씩 묘사해봐요",
    },
  };

  let currentActionKey = null;

  function pickRandomActionCard() {
    if (!actionImgs.length) return;

    actionImgs.forEach((img) => img.classList.remove("is-active"));

    const pick = actionImgs[Math.floor(Math.random() * actionImgs.length)];
    pick.classList.add("is-active");
    currentActionKey = pick.dataset.key || null;
  }

  pickRandomActionCard();

  /* =========================================================
     3) 모달 열기/닫기 + 선택된 카드에 맞는 내용 넣기
     ========================================================= */
  const actionCard = document.getElementById("actionCard");
  const modal = document.getElementById("modal");

  const modalTitleEl = modal?.querySelector(".modal-title");
  const modalP = modal?.querySelector(".modal-p");

  function openModal() {
    if (!modal) return;

    const data =
      (currentActionKey && ACTION_MODAL[currentActionKey]) || {
        title: "안정 카드",
        body: "지금 이 순간에 집중해보자. 천천히 숨을 쉬어도 괜찮아",
      };

    if (modalTitleEl) modalTitleEl.textContent = data.title;
    if (modalP) modalP.textContent = data.body;

    modal.classList.add("is-open");
    modal.setAttribute("aria-hidden", "false");
    document.body.style.overflow = "hidden";
  }

  function closeModal() {
    if (!modal) return;
    modal.classList.remove("is-open");
    modal.setAttribute("aria-hidden", "true");
    document.body.style.overflow = "";
  }

  actionCard?.addEventListener("click", openModal);
  actionCard?.addEventListener("keydown", (e) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      openModal();
    }
  });

  modal?.addEventListener("click", (e) => {
    if (e.target.closest("[data-close='true']")) closeModal();
  });

  window.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && modal?.classList.contains("is-open")) closeModal();
  });

/* =========================================================
   4) 오늘의 작은성취: 클릭하면 체크 토글 + 원래 순서 복구
   ========================================================= */
const achTrack = document.getElementById("achTrack");

// 초기 순서 기억(원복용)
const initialAchOrder = Array.from(achTrack?.children ?? []);

function restoreAchOrder() {
  if (!achTrack) return;
  initialAchOrder.forEach((el) => achTrack.appendChild(el));
}

function setAchDone(cardEl, done) {
  cardEl.classList.toggle("is-done", done);

  if (done) {
    achTrack?.appendChild(cardEl); // 완료면 맨 뒤로
  } else {
    // ✅ 해제면 원래 순서로 복구(완료카드는 다시 뒤로)
    restoreAchOrder();
    Array.from(achTrack.children).forEach((el) => {
      if (el.classList.contains("is-done")) achTrack.appendChild(el);
    });
  }
}

achTrack?.addEventListener("click", (e) => {
  const card = e.target.closest(".achCard");
  if (!card) return;

  const isDone = card.classList.contains("is-done");
  setAchDone(card, !isDone);
});

  /* =========================================================
     5) 가이드 바텀시트
     ========================================================= */
  const openGuideBtn = document.getElementById("openGuideBtn");
  const overlay = document.getElementById("guideOverlay");
  const closeGuideBtn = document.getElementById("closeGuideBtn");

  function openGuide() {
    if (!overlay) return;
    overlay.classList.add("is-open");
    overlay.setAttribute("aria-hidden", "false");
    document.body.style.overflow = "hidden";
  }

  function closeGuide() {
    if (!overlay) return;
    overlay.classList.remove("is-open");
    overlay.setAttribute("aria-hidden", "true");
    document.body.style.overflow = "";
  }

  openGuideBtn?.addEventListener("click", openGuide);
  closeGuideBtn?.addEventListener("click", closeGuide);

  overlay?.addEventListener("click", (e) => {
    if (e.target.closest("[data-close='guide']")) closeGuide();
  });

  window.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && overlay?.classList.contains("is-open")) closeGuide();
  });

  // 아코디언: 하나만 열리게
  document.querySelectorAll(".acc__head").forEach((head) => {
    head.addEventListener("click", () => {
      const acc = head.closest(".acc");
      const panel = acc?.querySelector(".acc__panel");
      const isOpen = head.classList.contains("is-open");

      document.querySelectorAll(".acc__head").forEach((h) => h.classList.remove("is-open"));
      document.querySelectorAll(".acc__panel").forEach((p) => p.classList.remove("is-open"));

      if (!isOpen) {
        head.classList.add("is-open");
        panel?.classList.add("is-open");
        head.setAttribute("aria-expanded", "true");
      } else {
        head.setAttribute("aria-expanded", "false");
      }
    });
  });

  /* =========================================================
     6) LEFT DRAWER (햄버거)
     ========================================================= */
  const openDrawerBtn = document.getElementById("openDrawerBtn");
  const drawer = document.getElementById("drawer");

  function openDrawer() {
    if (!drawer) return;
    drawer.classList.add("is-open");
    drawer.setAttribute("aria-hidden", "false");
    document.body.style.overflow = "hidden";
  }

  function closeDrawer() {
    if (!drawer) return;
    drawer.classList.remove("is-open");
    drawer.setAttribute("aria-hidden", "true");
    document.body.style.overflow = "";
  }

  openDrawerBtn?.addEventListener("click", openDrawer);

  drawer?.addEventListener("click", (e) => {
    if (e.target.closest("[data-close='drawer']")) closeDrawer();
  });

  window.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && drawer?.classList.contains("is-open")) closeDrawer();
  });

  /* =========================================================
     7) 탭 이동
     ========================================================= */
  const routes = {
    home: "./home.html",
    stability: "./stability.html",
    record: "./record.html",
    community: "./community.html",
    my: "./my.html",
  };

  document.querySelectorAll(".tabbar .tab").forEach((btn) => {
    btn.addEventListener("click", () => {
      const key = btn.dataset.tab;
      const url = routes[key];
      if (!url) return;
      if (btn.classList.contains("is-active")) return;
      window.location.href = url;
    });
  });
})();
