// app.js (또는 네가 쓰는 js 파일)
// - 탭바 이동: data-page 값 기반으로 라우팅 (addr -> location.html 등)
// - 만들기 버튼: btnCreate 클릭 처리
// - 좋아요 버튼: .stat[aria-label="좋아요"] 토글 + 카운트 변경 + aria-pressed

(() => {
  "use strict";

  // ===== 1) 라우팅 테이블 =====
  // HTML의 data-page 값이 뭐든, 여기만 맞추면 된다.
  // (중요) 네 주소 탭은 data-page="addr" 인 경우가 많아서 addr -> location.html로 매핑!
  const ROUTES = {
    home: "./home.html",
    commu: "./commu.html",
    // ✅ 주소 탭 케이스들 모두 커버
    addr: "./location.html",
    rank: "./rank.html",
    my: "./my.html",
  };

  // ===== 유틸 =====
  const $all = (sel, root = document) => Array.from(root.querySelectorAll(sel));

  function go(href) {
    if (!href) return;
    window.location.href = href;
  }

  function getNumber(text) {
    const n = Number(String(text || "").replace(/,/g, "").trim());
    return Number.isFinite(n) ? n : 0;
  }

  function formatNumber(n) {
    return Number(n || 0).toLocaleString("ko-KR");
  }

  // ===== 2) DOMContentLoaded =====
  window.addEventListener("DOMContentLoaded", () => {
    // ---- 만들기 버튼 ----
    const btnCreate = document.getElementById("btnCreate");
    if (btnCreate) {
      btnCreate.addEventListener("click", (e) => {
        e.preventDefault();
        alert("만들기(업로드) 화면은 다음 단계에서 연결해줄게 😎");
      });
    }

    // ---- 탭바 이동 (이벤트 위임: 탭이 동적으로 생겨도 안전) ----
    const tabbar = document.querySelector(".tabbar");
    if (tabbar) {
      tabbar.addEventListener("click", (e) => {
        const btn = e.target.closest(".tab");
        if (!btn) return;

        // 버튼/링크 모두 대응
        const page = btn.dataset.page;
        const hrefFromData = ROUTES[page];

        // 혹시 HTML에 data-href 같은 걸 따로 쓸 수도 있으니 우선순위로 지원
        const hrefOverride = btn.dataset.href;

        // a 태그면 기본 href가 있을 수 있으니 필요 시만 preventDefault
        const finalHref = hrefOverride || hrefFromData;

        if (finalHref) {
          e.preventDefault();
          go(finalHref);
        }
      });
    }

    // ---- 좋아요 토글 + 카운트 ----
    // .stat[aria-label="좋아요"] 안에 숫자 span이 있다고 가정
    $all('.stat[aria-label="좋아요"]').forEach((likeBtn) => {
      likeBtn.addEventListener("click", (e) => {
        e.preventDefault();

        const countEl = likeBtn.querySelector("span");
        if (!countEl) return;

        const current = getNumber(countEl.textContent);
        const isLiked = likeBtn.classList.toggle("is-liked");
        const next = isLiked ? current + 1 : Math.max(0, current - 1);

        countEl.textContent = formatNumber(next);
        likeBtn.setAttribute("aria-pressed", isLiked ? "true" : "false");
      });
    });
  });
})();
