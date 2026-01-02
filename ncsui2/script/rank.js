(() => {
  "use strict";

  const ROUTES = {
    home: "./home.html",
    commu: "./commu.html",
    addr: "./location.html",
    rank: "./rank.html",
    my: "./my.html",
  };

  const $ = (sel) => document.querySelector(sel);
  const userHref = (handle) => `./user.html?u=${encodeURIComponent(handle)}`;

  const badgeUse = (id, size = 20) =>
    `<svg width="${size}" height="${size}" viewBox="0 0 64 64" aria-hidden="true"><use href="#${id}"></use></svg>`;

  // ===== 더미 데이터(나중에 서버/DB 붙일 자리) =====
  const state = {
    bestPost: {
      img: "./images/location2.jpg", // 네가 원하는 이미지로 바꿔도 됨
      author: "김이나",
      time: "10분 전",
      title: "월정리 바다 미쳤다… 이 코스는 꼭 가야함",
      like: 126,
      comment: 18,
      view: 542,
      href: "./commu.html", // 나중에 게시글 상세로
    },
    me: {
      rank: 12,
      total: 1248,
      badges: [
        { icon: "b-gyul", name: "귤라이더", rarity: "Epic" },
        { icon: "b-rider", name: "헬멧러너", rarity: "Rare" },
        { icon: "b-pin", name: "핀 마스터", rarity: "Common" },
        { icon: "b-chat", name: "소통 요정", rarity: "Rare" },
        { icon: "b-camera", name: "포토헌터", rarity: "Rare" },
        { icon: "b-crown", name: "킹메이커", rarity: "Epic" },
      ],
    },
    explorerTop3: [
      { handle: "jeju_explorer", name: "제주탐험왕", meta: "총 128km · 9코스", chip: "탐험 포인트", score: 982 },
      { handle: "wind_rider", name: "바람맞는라이더", meta: "총 112km · 7코스", chip: "신규 코스", score: 910 },
      { handle: "coast_lover", name: "해안러버", meta: "총 96km · 6코스", chip: "해안 루트", score: 844 },
    ],
    socialTop3: [
      { handle: "comment_fairy", name: "댓글요정", meta: "댓글 88 · 좋아요 240", chip: "소통 점수", score: 780 },
      { handle: "warm_words", name: "따뜻한한마디", meta: "댓글 74 · 좋아요 198", chip: "공감왕", score: 728 },
      { handle: "meme_maker", name: "밈장인", meta: "댓글 51 · 좋아요 310", chip: "좋아요 폭발", score: 702 },
    ],
    curatorTop3: [
      { handle: "course_director", name: "코스디렉터", meta: "추천 12 · 저장 210", chip: "큐레이션", score: 860 },
      { handle: "hotplace_route", name: "찐맛집코스", meta: "추천 9 · 저장 180", chip: "핫플", score: 812 },
      { handle: "beginner_safe", name: "초보친화", meta: "추천 8 · 저장 156", chip: "안전 루트", score: 776 },
    ],
    hall: [
      { title: "시즌 챔피언", badge: "Legend", handle: "hyunmoo", name: "현무", desc: "3시즌 연속 TOP10" },
      { title: "제주 완주왕", badge: "Legend", handle: "wheel_god", name: "바퀴신", desc: "제주 전역 50코스" },
      { title: "소통 레전드", badge: "Legend", handle: "sunny", name: "햇살", desc: "누적 좋아요 5K" },
      { title: "큐레이터 원탑", badge: "Legend", handle: "organizer", name: "정리왕", desc: "저장수 10K" },
      { title: "크라운 홀더", badge: "Legend", handle: "crown", name: "왕관", desc: "주간 1위 8회" },
    ],
  };

  const medalLabel = (i) => (i === 0 ? "1st" : i === 1 ? "2nd" : "3rd");

  function renderBest() {
    const b = state.bestPost;
    const a = $("#bestCard");
    if (!a) return;
    a.href = b.href;

    $("#bestImg").src = b.img;
    $("#bestAuthor").textContent = b.author;
    $("#bestTime").textContent = b.time;
    $("#bestTitle").textContent = b.title;
    $("#bestLike").textContent = String(b.like);
    $("#bestComment").textContent = String(b.comment);
    $("#bestView").textContent = String(b.view);
  }

  function renderMe() {
    $("#myRank").textContent = `#${state.me.rank}`;
    $("#totalUsers").textContent = state.me.total.toLocaleString("ko-KR");
    $("#myBadges").textContent = state.me.badges.length.toLocaleString("ko-KR");

    // 대표 배지 = 첫 번째
    const hero = state.me.badges[0];
    const heroIcon = document.querySelector(".badge-hero__icon");
    if (heroIcon) heroIcon.innerHTML = `<use href="#${hero.icon}"></use>`;
    $("#heroBadgeName").textContent = hero.name;
    $("#heroBadgeRarity").textContent = hero.rarity;

    // 미니 배지 6개
    const mini = $("#miniBadges");
    mini.innerHTML = "";
    state.me.badges.slice(0, 6).forEach((b, idx) => {
      const token = document.createElement("div");
      token.className = "badge-token" + (idx % 3 === 0 ? " is-tilt" : idx % 3 === 1 ? " is-tilt2" : "");
      token.title = `${b.name} · ${b.rarity}`;
      token.innerHTML = badgeUse(b.icon, 20);
      mini.appendChild(token);
    });
  }

  function renderPodium(el, items) {
    el.innerHTML = "";
    items.forEach((u, i) => {
      const card = document.createElement("article");
      card.className = "rank-card";
      card.innerHTML = `
        <div class="rank-left">
          <div class="medal" aria-label="${i + 1}위"><b>${medalLabel(i)}</b></div>
          <div class="user">
            <p class="user__name">
              <a href="${userHref(u.handle)}" aria-label="${u.name} 프로필 보기">${u.name}</a>
            </p>
            <div class="user__meta">${u.meta}</div>
          </div>
        </div>
        <div class="rank-right">
          <div class="chip">${u.chip}</div>
          <div class="score">${u.score.toLocaleString("ko-KR")} 점</div>
        </div>
      `;
      el.appendChild(card);
    });
  }

  function renderHall(el, items) {
    el.innerHTML = "";
    items.forEach((h) => {
      const card = document.createElement("article");
      card.className = "hall-card";
      card.innerHTML = `
        <div class="hall-card__top">
          <p class="hall-card__title">${h.title}</p>
          <span class="hall-card__badge">${h.badge}</span>
        </div>
        <div class="hall-card__name">
          <a href="${userHref(h.handle)}" aria-label="${h.name} 프로필 보기">${h.name}</a>
        </div>
        <div class="hall-card__desc">${h.desc}</div>
      `;
      el.appendChild(card);
    });
  }

  function bindTabs() {
    const tabbar = document.querySelector(".tabbar");
    if (!tabbar) return;
    tabbar.addEventListener("click", (e) => {
      const btn = e.target.closest(".tab");
      if (!btn) return;
      const page = btn.dataset.page;
      const href = ROUTES[page];
      if (href) window.location.href = href;
    });
  }

  window.addEventListener("DOMContentLoaded", () => {
    renderBest();
    renderMe();
    renderPodium($("#podiumExplorer"), state.explorerTop3);
    renderPodium($("#podiumSocial"), state.socialTop3);
    renderPodium($("#podiumCurator"), state.curatorTop3);
    renderHall($("#hall"), state.hall);
    bindTabs();
  });
})();
