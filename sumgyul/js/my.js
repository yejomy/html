(() => {
  /* ===== routes ===== */
  const routes = {
    home: "./home.html",
    stability: "./stability.html",
    record: "./record.html",
    community: "./community.html",
    my: "./my.html",
    post: "./community_post.html",
    write: "./community_write.html",
    diary: "./diary.html", // ✅ 추가: 오늘 기록하기 이동용
  };

  /* ===== tab nav ===== */
  document.querySelectorAll(".tabbar .tab").forEach((btn) => {
    btn.addEventListener("click", () => {
      const key = btn.dataset.tab;
      const url = routes[key];
      if (!url) return;
      if (btn.classList.contains("is-active")) return;
      window.location.href = url;
    });
  });

  /* ===== drawer ===== */
  const drawer = document.getElementById("drawer");
  const openDrawerBtn = document.getElementById("openDrawerBtn");

  function openDrawer() {
    drawer?.classList.add("is-open");
    drawer?.setAttribute("aria-hidden", "false");
    document.body.style.overflow = "hidden";
  }
  function closeDrawer() {
    drawer?.classList.remove("is-open");
    drawer?.setAttribute("aria-hidden", "true");
    document.body.style.overflow = "";
  }

  openDrawerBtn?.addEventListener("click", openDrawer);
  drawer?.addEventListener("click", (e) => {
    if (e.target.closest("[data-close='drawer']")) closeDrawer();
  });
  window.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && drawer?.classList.contains("is-open")) closeDrawer();
  });

  // ✅ 왼쪽 메뉴: '오늘 기록하기' -> diary.html
  document.getElementById("drawerWriteBtn")?.addEventListener("click", () => {
    window.location.href = routes.diary;
  });

  // ✅ 왼쪽 메뉴: '내정보' -> my.html
  document.getElementById("drawerToMy")?.addEventListener("click", () => {
    window.location.href = routes.my;
  });

  // 기존(다른 페이지에서 가져온 흔적) id들이 있어도 오류 없이 넘어가게 유지
  document.getElementById("drawerToCommunity")?.addEventListener("click", () => {
    window.location.href = routes.community;
  });
  document.getElementById("drawerToRecord")?.addEventListener("click", () => {
    window.location.href = routes.record;
  });
  document.getElementById("drawerToStability")?.addEventListener("click", () => {
    window.location.href = routes.stability;
  });

  /* ===== top search (아이콘 → 상단 검색폼) ===== */
  const openTopSearchBtn = document.getElementById("openTopSearchBtn");
  const closeTopSearchBtn = document.getElementById("closeTopSearchBtn");
  const topbarTitle = document.getElementById("topbarTitle");
  const topbarRight = document.getElementById("topbarRight");
  const topSearchForm = document.getElementById("topSearchForm");
  const topSearchInput = document.getElementById("topSearchInput");

  function openTopSearch() {
    topbarTitle.style.display = "none";
    topbarRight.style.display = "none";
    topSearchForm.classList.remove("is-hidden");
    setTimeout(() => topSearchInput.focus(), 0);
  }
  function closeTopSearch() {
    topSearchForm.classList.add("is-hidden");
    topbarTitle.style.display = "";
    topbarRight.style.display = "";
    topSearchInput.value = "";
  }

  openTopSearchBtn?.addEventListener("click", openTopSearch);
  closeTopSearchBtn?.addEventListener("click", closeTopSearch);

  // MY 페이지 검색: (예시) 커뮤니티/일기에서 키워드 검색 페이지로 보내기
  topSearchForm?.addEventListener("submit", (e) => {
    e.preventDefault();
    const q = (topSearchInput.value || "").trim();
    if (!q) return;
    // 지금은 커뮤니티 페이지 검색으로 넘김(원하면 my 내부 필터로 바꿔줄게)
    window.location.href = `${routes.community}?q=${encodeURIComponent(q)}`;
  });

  /* ===== profile ===== */
  const PROFILE_KEY = "sbg_profile_v1";
  const myNameEl = document.getElementById("myName");
  const myBioEl = document.getElementById("myBio");

  // ✅ 추가: 이미지 요소/파일 input
  const avatarImgEl = document.getElementById("avatarImg");
  const avatarInputEl = document.getElementById("avatarInput");

  function loadProfile() {
    try { return JSON.parse(localStorage.getItem(PROFILE_KEY) || "{}"); }
    catch { return {}; }
  }
  function saveProfile(p) {
    localStorage.setItem(PROFILE_KEY, JSON.stringify(p));
  }
  function renderProfile() {
    const p = loadProfile();
    if (p.name) myNameEl.textContent = p.name;
    if (p.bio) myBioEl.textContent = p.bio;
    // ✅ 저장된 avatar(베이스64)가 있으면 그걸로 표시
    if (p.avatar && avatarImgEl) avatarImgEl.src = p.avatar;
  }

  // ✅ 프로필 수정: 이름/소개/이미지 모두 변경
  document.getElementById("editProfileBtn")?.addEventListener("click", () => {
    const p = loadProfile();

    const name = prompt("표시 이름을 입력하세요", p.name || "숨결록 님");
    if (name === null) return;

    const bio = prompt("한 줄 소개를 입력하세요", p.bio || "오늘도 천천히, 괜찮아");
    if (bio === null) return;

    // 우선 텍스트는 저장(이미지 선택 취소해도 이름/소개는 반영되게)
    const next = { ...p, name, bio };
    saveProfile(next);
    renderProfile();

    // 이미지도 같이 바꾸도록 파일 선택 열기
    if (avatarInputEl) {
      avatarInputEl.value = ""; // 같은 파일 재선택 가능하게 초기화
      avatarInputEl.click();

      avatarInputEl.onchange = () => {
        const file = avatarInputEl.files && avatarInputEl.files[0];
        if (!file) {
          // 이미지 선택 안 하면 텍스트만 반영된 상태 유지
          return;
        }

        const reader = new FileReader();
        reader.onload = () => {
          const avatar = reader.result; // base64 dataURL
          const updated = { ...loadProfile(), name, bio, avatar };
          saveProfile(updated);
          renderProfile();
        };
        reader.readAsDataURL(file);
      };
    }
  });

  /* ===== counters (로컬 스토리지 기반) ===== */
  // 커뮤니티 글: community.js에서 쓰는 키
  const COMMUNITY_KEY = "sbg_community_posts_v3";
  // 일기 키는 프로젝트마다 다를 수 있어서, 일단 흔한 후보들로 카운트
  const DIARY_KEYS = [
    "sbg_diary_entries_v1",
    "sbg_diary_entries_v2",
    "sbg_diary_v1",
    "diaryEntries",
    "sbg_diary_entries",
  ];

  function safeParse(key, fallback) {
    try { return JSON.parse(localStorage.getItem(key) || JSON.stringify(fallback)); }
    catch { return fallback; }
  }

  function countDiary() {
    for (const k of DIARY_KEYS) {
      const v = safeParse(k, null);
      if (!v) continue;
      if (Array.isArray(v)) return v.length;
      if (typeof v === "object") return Object.keys(v).length;
    }
    return 0;
  }

  function countCommunityPosts() {
    const posts = safeParse(COMMUNITY_KEY, []);
    return Array.isArray(posts) ? posts.length : 0;
  }

  // “연속 기록”은 지금 데이터 구조가 확정이 아니라서: 임시로 0~7 정도 보여주고 싶으면 여기서 계산/저장하면 됨
  const STREAK_KEY = "sbg_streak_v1";
  function loadStreak() {
    const v = Number(localStorage.getItem(STREAK_KEY) || "0");
    return Number.isFinite(v) ? v : 0;
  }

  function renderCounts() {
    const diaryCount = countDiary();
    const commCount = countCommunityPosts();
    const streak = loadStreak();

    document.getElementById("diaryCount").textContent = String(diaryCount);
    document.getElementById("communityCount").textContent = String(commCount);
    document.getElementById("streakDays").textContent = String(streak);

    document.getElementById("myDiaryMeta").textContent = `${diaryCount}개`;
    document.getElementById("myPostMeta").textContent = `${commCount}개`;
  }

  /* ===== today check (간단 토글) ===== */
  const CHECK_KEY = "sbg_my_checks_v1";
  function loadChecks(){ return safeParse(CHECK_KEY, {}); }
  function saveChecks(v){ localStorage.setItem(CHECK_KEY, JSON.stringify(v)); }

  function renderChecks(){
    const m = loadChecks();
    document.querySelectorAll("[data-check]").forEach(btn => {
      const k = btn.getAttribute("data-check");
      const on = !!m[k];
      btn.classList.toggle("is-on", on);
    });
  }

  document.querySelector(".checkGrid")?.addEventListener("click", (e) => {
    const btn = e.target.closest("[data-check]");
    if (!btn) return;
    const k = btn.getAttribute("data-check");
    const m = loadChecks();
    m[k] = !m[k];
    saveChecks(m);
    renderChecks();
  });

  /* ===== settings toggles ===== */
  const SET_KEY = "sbg_my_settings_v1";
  function loadSet(){ return safeParse(SET_KEY, { notify:true, lock:false }); }
  function saveSet(v){ localStorage.setItem(SET_KEY, JSON.stringify(v)); }

  const toggleNotify = document.getElementById("toggleNotify");
  const toggleLock = document.getElementById("toggleLock");

  function renderSettings(){
    const s = loadSet();
    if (toggleNotify) toggleNotify.checked = !!s.notify;
    if (toggleLock) toggleLock.checked = !!s.lock;
  }

  toggleNotify?.addEventListener("change", () => {
    const s = loadSet();
    s.notify = toggleNotify.checked;
    saveSet(s);
  });
  toggleLock?.addEventListener("change", () => {
    const s = loadSet();
    s.lock = toggleLock.checked;
    saveSet(s);
  });

  /* ===== buttons ===== */
  document.getElementById("goRecordBtn")?.addEventListener("click", () => {
    window.location.href = routes.record;
  });

  document.getElementById("goMyDiary")?.addEventListener("click", () => {
    // 지금은 기록 탭으로 보냄 (나중에 "내 일기 목록" 페이지 만들면 연결)
    window.location.href = routes.record;
  });

  document.getElementById("goMyPosts")?.addEventListener("click", () => {
    window.location.href = routes.community;
  });

  document.getElementById("goSaved")?.addEventListener("click", () => {
    alert("저장한 글 기능은 다음 단계에서 붙일게 🙂");
  });

  document.getElementById("exportBtn")?.addEventListener("click", () => {
    const profile = loadProfile();
    const comm = safeParse(COMMUNITY_KEY, []);
    const diaryN = countDiary();

    const txt = [
      "숨결록 데이터 내보내기",
      "--------------------",
      `이름: ${profile.name || "숨결록 님"}`,
      `한줄소개: ${profile.bio || "오늘도 천천히, 괜찮아"}`,
      "",
      `일기 개수(추정): ${diaryN}`,
      `커뮤니티 글 개수: ${Array.isArray(comm) ? comm.length : 0}`,
      "",
      "※ 실제 일기 원문 내보내기는 일기 저장 키 확정 후 연결합니다.",
    ].join("\n");

    const blob = new Blob([txt], { type:"text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "sbg_export.txt";
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  });

  document.getElementById("resetBtn")?.addEventListener("click", () => {
    const ok = confirm("로컬 데이터를 초기화할까요?\n(커뮤니티/설정/프로필 등 저장된 값이 삭제될 수 있어요)");
    if (!ok) return;

    // MY 관련
    localStorage.removeItem(PROFILE_KEY);
    localStorage.removeItem(SET_KEY);
    localStorage.removeItem(CHECK_KEY);

    // 커뮤니티 관련(원하면 유지로 바꿀 수 있음)
    localStorage.removeItem(COMMUNITY_KEY);
    localStorage.removeItem("sbg_community_likes_v3");

    alert("초기화 완료. 새로고침하면 반영돼요.");
    window.location.reload();
  });

  /* ===== init ===== */
  renderProfile();
  renderCounts();
  renderChecks();
  renderSettings();
})();
