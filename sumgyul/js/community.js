(() => {
  /* =========================
     Routes
     ========================= */
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

  /* =========================
     Drawer
     ========================= */
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
  document.getElementById("drawerWriteBtn")?.addEventListener("click", () => {
    window.location.href = "./record.html";
  });

  /* =========================
     Storage Keys
     ========================= */
  const DIARY_KEY = "sbg_diary_entries_v1";        // record/diary와 동일
  const COMMUNITY_KEY = "sbg_community_posts_v1";  // 커뮤니티 게시글

  function loadDiary() {
    try { return JSON.parse(localStorage.getItem(DIARY_KEY) || "{}"); }
    catch { return {}; }
  }
  function loadPosts() {
    try { return JSON.parse(localStorage.getItem(COMMUNITY_KEY) || "[]"); }
    catch { return []; }
  }
  function savePosts(posts) {
    localStorage.setItem(COMMUNITY_KEY, JSON.stringify(posts));
  }

  /* =========================
     Utils
     ========================= */
  function uid() {
    return `p_${Math.random().toString(16).slice(2)}_${Date.now()}`;
  }
  function timeAgo(ts) {
    const d = Date.now() - ts;
    const m = Math.floor(d / 60000);
    if (m < 1) return "방금";
    if (m < 60) return `${m}분 전`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h}시간 전`;
    const day = Math.floor(h / 24);
    return `${day}일 전`;
  }
  function esc(s) {
    return String(s)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function typeLabel(t) {
    if (t === "diary") return "일기공유";
    if (t === "question") return "질문";
    return "정보/팁";
  }

  /* =========================
     Seed (처음 진입시 샘플 몇개)
     ========================= */
  function seedIfEmpty() {
    const posts = loadPosts();
    if (posts.length) return;

    const seeded = [
      {
        id: uid(),
        type: "tips",
        title: "지하철에서 공황 올라올 때 저는 이렇게 해요",
        body: "1) 손에 차가운 물병 쥐기\n2) 숨을 길게 내쉬기(4초)\n3) 눈으로 주변 사물 5개 찾기\n조금이라도 도움되면 좋겠어요.",
        createdAt: Date.now() - 1000 * 60 * 60 * 5,
        comments: [
          { id: uid(), text: "오 5개 찾기(그라운딩) 저도 효과 있었어요!", createdAt: Date.now() - 1000 * 60 * 20 },
        ],
        diaryAttach: null,
      },
      {
        id: uid(),
        type: "question",
        title: "심장 두근거림이 계속되면 병원 가야할까요?",
        body: "불안할 때마다 심장이 빨라져요. 검사 한 번 해보는 게 좋을까요?",
        createdAt: Date.now() - 1000 * 60 * 60 * 30,
        comments: [
          { id: uid(), text: "저는 한 번 검사 받고 ‘정상’ 확인하니 불안이 좀 줄었어요.", createdAt: Date.now() - 1000 * 60 * 60 * 3 },
        ],
        diaryAttach: null,
      },
    ];
    savePosts(seeded);
  }
  seedIfEmpty();

  /* =========================
     Filter chips
     ========================= */
  let activeFilter = "all";
  document.querySelectorAll(".chip").forEach((chip) => {
    chip.addEventListener("click", () => {
      document.querySelectorAll(".chip").forEach((c) => c.classList.remove("is-on"));
      chip.classList.add("is-on");
      activeFilter = chip.dataset.filter || "all";
      renderFeed();
    });
  });

  /* =========================
     Feed render
     ========================= */
  const postList = document.getElementById("postList");
  const emptyHint = document.getElementById("emptyHint");

  function renderFeed() {
    const posts = loadPosts()
      .slice()
      .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));

    const filtered = activeFilter === "all"
      ? posts
      : posts.filter((p) => p.type === activeFilter);

    postList.innerHTML = "";

    if (!filtered.length) {
      if (emptyHint) emptyHint.textContent = "아직 글이 없어요. 첫 글을 남겨볼까요?";
      return;
    }
    if (emptyHint) emptyHint.textContent = "";

    const frag = document.createDocumentFragment();

    filtered.forEach((p) => {
      const el = document.createElement("div");
      el.className = "post";

      const isDiary = p.type === "diary" && p.diaryAttach;
      const badge = isDiary ? `<span class="badge diary">요약일기 포함</span>` : `<span class="badge">${typeLabel(p.type)}</span>`;

      el.innerHTML = `
        <div class="postTop">
          <div class="postType">${esc(typeLabel(p.type))}</div>
          <div class="postTime">${esc(timeAgo(p.createdAt || Date.now()))}</div>
        </div>
        <div class="postTitle">${esc(p.title || "제목 없음")}</div>
        <div class="postBody">${esc(p.body || "")}</div>
        <div class="postMeta">
          <div class="metaLeft">
            ${badge}
            <span>댓글 ${(p.comments || []).length}개</span>
          </div>
          <button class="openBtn" type="button" data-open="${esc(p.id)}">열기</button>
        </div>
      `;

      frag.appendChild(el);
    });

    postList.appendChild(frag);
  }

  document.getElementById("refreshBtn")?.addEventListener("click", renderFeed);
  renderFeed();

  /* =========================
     Detail modal (open post + comments)
     ========================= */
  const detailModal = document.getElementById("detailModal");
  const detailBox = document.getElementById("detailBox");
  const commentList = document.getElementById("commentList");
  const commentCount = document.getElementById("commentCount");
  const commentInput = document.getElementById("commentInput");
  const commentSendBtn = document.getElementById("commentSendBtn");
  const commentHint = document.getElementById("commentHint");
  let currentPostId = null;

  function openModal(modal) {
    modal?.classList.add("is-open");
    modal?.setAttribute("aria-hidden", "false");
    document.body.style.overflow = "hidden";
  }
  function closeModal(modal) {
    modal?.classList.remove("is-open");
    modal?.setAttribute("aria-hidden", "true");
    document.body.style.overflow = "";
  }

  function getPostById(id) {
    return loadPosts().find((p) => p.id === id);
  }

  function renderDetail(post) {
    if (!post) return;

    const diaryBlock = (post.type === "diary" && post.diaryAttach)
      ? `
        <div class="diaryPreview">
          <div class="t1">공유된 요약 일기</div>
          <div class="t2">${esc(post.diaryAttach.preview || "")}</div>
        </div>
      ` : "";

    detailBox.innerHTML = `
      <div class="detailTitle">${esc(post.title || "")}</div>
      <div class="detailBody">${esc(post.body || "")}</div>
      ${diaryBlock}
      <div class="detailMeta">
        <div>${esc(typeLabel(post.type))}</div>
        <div>${esc(timeAgo(post.createdAt || Date.now()))}</div>
      </div>
    `;

    const comments = post.comments || [];
    commentCount.textContent = `${comments.length}개`;

    commentList.innerHTML = "";
    if (!comments.length) {
      commentList.innerHTML = `<div class="hint">첫 댓글을 남겨주세요.</div>`;
      return;
    }

    const frag = document.createDocumentFragment();
    comments
      .slice()
      .sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0))
      .forEach((c) => {
        const el = document.createElement("div");
        el.className = "comment";
        el.innerHTML = `
          <div class="commentTop">
            <div class="commentName">익명</div>
            <div class="commentTime">${esc(timeAgo(c.createdAt || Date.now()))}</div>
          </div>
          <div class="commentText">${esc(c.text || "")}</div>
        `;
        frag.appendChild(el);
      });

    commentList.appendChild(frag);
  }

  postList?.addEventListener("click", (e) => {
    const btn = e.target.closest("[data-open]");
    if (!btn) return;
    const id = btn.getAttribute("data-open");
    const post = getPostById(id);
    currentPostId = id;
    renderDetail(post);
    commentHint.textContent = "";
    commentInput.value = "";
    openModal(detailModal);
    setTimeout(() => commentInput?.focus(), 0);
  });

  commentSendBtn?.addEventListener("click", () => {
    const text = (commentInput?.value || "").trim();
    if (!text) {
      commentHint.textContent = "댓글을 입력해 주세요.";
      return;
    }
    const posts = loadPosts();
    const post = posts.find((p) => p.id === currentPostId);
    if (!post) return;

    post.comments = post.comments || [];
    post.comments.push({ id: uid(), text, createdAt: Date.now() });
    savePosts(posts);

    commentInput.value = "";
    commentHint.textContent = "등록했어요.";
    renderDetail(post);
    renderFeed();
  });

  document.querySelectorAll("[data-close='detail']").forEach((x) => {
    x.addEventListener("click", () => closeModal(detailModal));
  });

  /* =========================
     Compose modal (create post + optional diary attach)
     ========================= */
  const composeModal = document.getElementById("composeModal");
  const openComposeBtn = document.getElementById("openComposeBtn");
  const publishBtn = document.getElementById("publishBtn");
  const composeTitle = document.getElementById("composeTitle");
  const composeBody = document.getElementById("composeBody");
  const composeHint = document.getElementById("composeHint");

  const attachWrap = document.getElementById("attachWrap");
  const openDiaryPickerBtn = document.getElementById("openDiaryPickerBtn");
  const attachedDiaryCard = document.getElementById("attachedDiaryCard");
  const anonymizeChk = document.getElementById("anonymizeChk");

  let composeType = "tips";
  let attachedDiary = null;

  function setComposeType(t) {
    composeType = t;
    document.querySelectorAll(".segBtn").forEach((b) => b.classList.toggle("is-on", b.dataset.type === t));
    attachWrap.hidden = (t !== "diary");
  }

  document.querySelectorAll(".segBtn").forEach((b) => {
    b.addEventListener("click", () => setComposeType(b.dataset.type || "tips"));
  });

  function openCompose() {
    composeTitle.value = "";
    composeBody.value = "";
    composeHint.textContent = "";
    attachedDiary = null;
    attachedDiaryCard.innerHTML = `<div class="attachEmpty">선택된 일기가 없어요</div>`;
    anonymizeChk.checked = true;
    setComposeType("tips");
    openModal(composeModal);
  }
  openComposeBtn?.addEventListener("click", openCompose);
  document.querySelectorAll("[data-close='compose']").forEach((x) => {
    x.addEventListener("click", () => closeModal(composeModal));
  });

  function diaryPreviewFromEntry(entry) {
    // 안전하게 요약: 길이 제한 + 민감정보 노출 최소화
    const parts = [];
    if (entry.emoji) parts.push(`감정: ${entry.emoji}`);
    if (typeof entry.intensity === "number") parts.push(`강도: ${entry.intensity}/10`);
    if (Array.isArray(entry.tags) && entry.tags.length) parts.push(`상태: ${entry.tags.slice(0, 3).join(", ")}`);
    const text = (entry.eventText || entry.text || "").trim();
    if (text) parts.push(text.split("\n").slice(0, 2).join("\n"));
    return parts.join("\n");
  }

  publishBtn?.addEventListener("click", () => {
    const title = (composeTitle.value || "").trim();
    const body = (composeBody.value || "").trim();

    if (!title || !body) {
      composeHint.textContent = "제목과 내용을 입력해 주세요.";
      return;
    }

    if (composeType === "diary" && !attachedDiary) {
      composeHint.textContent = "일기공유 글은 ‘내 일기 선택’을 해주세요.";
      return;
    }

    const post = {
      id: uid(),
      type: composeType,
      title,
      body,
      createdAt: Date.now(),
      comments: [],
      diaryAttach: null,
    };

    if (composeType === "diary" && attachedDiary) {
      const preview = anonymizeChk.checked
        ? diaryPreviewFromEntry(attachedDiary.entry)
        : (attachedDiary.entry.text || attachedDiary.entry.eventText || "");

      post.diaryAttach = {
        date: attachedDiary.date,
        preview: (preview || "").slice(0, 400),
        moodClass: attachedDiary.entry.moodClass || null,
      };
    }

    const posts = loadPosts();
    posts.push(post);
    savePosts(posts);

    closeModal(composeModal);
    renderFeed();
  });

  /* =========================
     Diary picker
     ========================= */
  const pickerModal = document.getElementById("pickerModal");
  const pickerList = document.getElementById("pickerList");
  const pickerHint = document.getElementById("pickerHint");

  function openPicker() {
    const diary = loadDiary();
    const list = Object.entries(diary)
      .map(([date, entry]) => ({ date, entry }))
      .sort((a, b) => (b.entry.savedAt || 0) - (a.entry.savedAt || 0));

    pickerList.innerHTML = "";
    if (!list.length) {
      pickerHint.textContent = "저장된 일기가 없어요. 먼저 기록을 남겨주세요.";
      openModal(pickerModal);
      return;
    }
    pickerHint.textContent = "";

    const frag = document.createDocumentFragment();
    list.forEach(({ date, entry }) => {
      const el = document.createElement("div");
      el.className = "pickItem";

      const tagText = Array.isArray(entry.tags) && entry.tags.length ? entry.tags.slice(0, 2).join(", ") : "태그 없음";
      const text = (entry.text || entry.eventText || "").trim();

      el.innerHTML = `
        <div class="pickTop">
          <div class="pickDate">${esc(date)}</div>
          <div class="pickTag">${esc(tagText)}</div>
        </div>
        <div class="pickText">${esc(text)}</div>
        <button class="smallBtn pickBtn" type="button" data-pick="${esc(date)}">이 일기 선택</button>
      `;
      frag.appendChild(el);
    });
    pickerList.appendChild(frag);

    openModal(pickerModal);
  }

  openDiaryPickerBtn?.addEventListener("click", openPicker);

  pickerList?.addEventListener("click", (e) => {
    const btn = e.target.closest("[data-pick]");
    if (!btn) return;
    const date = btn.getAttribute("data-pick");
    const diary = loadDiary();
    const entry = diary[date];
    if (!entry) return;

    attachedDiary = { date, entry };

    const preview = diaryPreviewFromEntry(entry);
    attachedDiaryCard.innerHTML = `
      <div class="postType">선택됨 · ${esc(date)}</div>
      <div class="postBody" style="-webkit-line-clamp:3">${esc(preview)}</div>
    `;

    closeModal(pickerModal);
    setComposeType("diary");
  });

  document.querySelectorAll("[data-close='picker']").forEach((x) => {
    x.addEventListener("click", () => closeModal(pickerModal));
  });

  /* =========================
     Search modal (community posts + comments)
     ========================= */
  const openSearchBtn = document.getElementById("openSearchBtn");
  const searchModal = document.getElementById("searchModal");
  const searchInput = document.getElementById("searchInput");
  const searchHint = document.getElementById("searchHint");
  const searchResults = document.getElementById("searchResults");

  function openSearch() {
    openModal(searchModal);
    searchInput.value = "";
    renderSearch("");
    setTimeout(() => searchInput?.focus(), 0);
  }
  function closeSearch() {
    closeModal(searchModal);
  }

  openSearchBtn?.addEventListener("click", openSearch);
  document.querySelectorAll("[data-close='search']").forEach((x) => x.addEventListener("click", closeSearch));

  function renderSearch(q) {
    const query = (q || "").trim().toLowerCase();
    const posts = loadPosts().slice().sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));

    const results = query
      ? posts.filter((p) => {
          const text = `${p.title || ""} ${p.body || ""}`.toLowerCase();
          const comments = (p.comments || []).map((c) => c.text).join(" ").toLowerCase();
          return text.includes(query) || comments.includes(query);
        })
      : posts;

    searchHint.textContent = query ? `검색 결과: ${results.length}개` : `전체 글: ${results.length}개`;
    searchResults.innerHTML = "";

    if (!results.length) {
      searchResults.innerHTML = `<div class="hint">검색 결과가 없어요.</div>`;
      return;
    }

    const frag = document.createDocumentFragment();
    results.slice(0, 30).forEach((p) => {
      const el = document.createElement("div");
      el.className = "resultItem";
      const tagText = `${typeLabel(p.type)} · 댓글 ${(p.comments || []).length}개`;

      el.innerHTML = `
        <div class="resultTop">
          <div class="resultDate">${esc(timeAgo(p.createdAt || Date.now()))}</div>
          <div class="resultTags">${esc(tagText)}</div>
        </div>
        <div class="resultText">${esc(p.title || "")} — ${esc(p.body || "")}</div>
        <button class="smallBtn resultBtn" type="button" data-open="${esc(p.id)}">열기</button>
      `;
      frag.appendChild(el);
    });

    searchResults.appendChild(frag);
  }

  searchInput?.addEventListener("input", (e) => renderSearch(e.target.value));
  searchResults?.addEventListener("click", (e) => {
    const btn = e.target.closest("[data-open]");
    if (!btn) return;
    const id = btn.getAttribute("data-open");
    const post = getPostById(id);
    if (!post) return;
    closeSearch();
    currentPostId = id;
    renderDetail(post);
    openModal(detailModal);
  });

})();
