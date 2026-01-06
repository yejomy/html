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

  /* ===== drawer ===== */
  const drawer = document.getElementById("drawer");
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
  document.getElementById("openDrawerBtn")?.addEventListener("click", openDrawer);
  drawer?.addEventListener("click", (e) => {
    if (e.target.closest("[data-close='drawer']")) closeDrawer();
  });
  window.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && drawer?.classList.contains("is-open")) closeDrawer();
  });

  // ✅ 오늘 기록하기 -> diary.html
  document.getElementById("drawerWriteBtn")?.addEventListener("click", () => {
    window.location.href = "./diary.html";
  });

  // ✅ 내 정보 -> my.html
  document.getElementById("drawerToMy")?.addEventListener("click", () => {
    window.location.href = routes.my;
  });

  /* ===== top search ===== */
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
    searchQuery = "";
    renderAll();
  }

  openTopSearchBtn?.addEventListener("click", openTopSearch);
  closeTopSearchBtn?.addEventListener("click", closeTopSearch);

  /* ===== storage (✅ v4로 올려서 기존 중복 데이터 자동 무시) ===== */
  const COMMUNITY_KEY = "sbg_community_posts_v4";
  const LIKES_KEY = "sbg_community_likes_v4";

  function loadPosts() {
    try { return JSON.parse(localStorage.getItem(COMMUNITY_KEY) || "[]"); }
    catch { return []; }
  }
  function savePosts(posts) {
    localStorage.setItem(COMMUNITY_KEY, JSON.stringify(posts));
  }
  function loadLikes() {
    try { return JSON.parse(localStorage.getItem(LIKES_KEY) || "{}"); }
    catch { return {}; }
  }
  function saveLikes(likes) {
    localStorage.setItem(LIKES_KEY, JSON.stringify(likes));
  }

  /* ===== utils ===== */
  const rand = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
  const uid = (p="p") => `${p}_${Math.random().toString(16).slice(2)}_${Date.now()}`;
  const esc = (s) => String(s)
    .replaceAll("&","&amp;")
    .replaceAll("<","&lt;")
    .replaceAll(">","&gt;")
    .replaceAll('"',"&quot;")
    .replaceAll("'","&#039;");

  function timeAgo(ts) {
    const d = Date.now() - ts;
    const m = Math.floor(d / 60000);
    if (m < 1) return "방금";
    if (m < 60) return `${m}분 전`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h}시간 전`;
    return `${Math.floor(h / 24)}일 전`;
  }

  function catLabel(c) {
    if (c === "tips") return "꿀팁";
    if (c === "question") return "고민&질문";
    if (c === "comfort") return "위로";
    if (c === "routine") return "루틴";
    return "전체";
  }

  /* ===== data ===== */
  const authorPool = [
    { name:"작은용기", sub:"몸이 먼저 안심해야" },
    { name:"하루한줄", sub:"괜찮지 않아도 괜찮아" },
    { name:"숨고르기", sub:"불안 올라오면 물부터" },
    { name:"조용한밤", sub:"오늘도 기록으로 버텼다" },
    { name:"천천히걷기", sub:"5분 산책이 힘이 됨" },
    { name:"눈웃음에이", sub:"천천히 해도 괜찮다" },
  ];

  // ✅ 카테고리별 서로 다른 글 (요구 개수 정확히)
  const templates = {
    tips: [
      { t:"불안 올라오기 전 미리 막는 호흡 루틴", b:"불안이 커지기 전에 4초 들숨 / 6초 날숨을 5번만 해도 확실히 다르더라구요. 특히 밤에 효과 있었어요." },
      { t:"생각 폭주할 때는 ‘논리’보다 감각이 먼저", b:"불안할 때 생각을 이기려 하면 더 커졌어요. 대신 차가운 물로 손 씻기/발바닥 감각에 집중했더니 확 내려갔어요." },
      { t:"불안한 날엔 목표를 ‘반’으로 줄이기", b:"해야 할 일을 다 하려다 무너졌어요. 그래서 요즘은 딱 1개만 성공하면 성공으로 쳐요. 자책이 줄었어요." },
      { t:"잠들기 30분 전 SNS/뉴스 끊기", b:"자극적인 정보가 심박을 올리더라구요. 잠들기 전 30분만 끊어도 몸이 훨씬 조용해졌어요." },
      { t:"불안 기록은 ‘한 줄’로만", b:"길게 쓰면 감정에 더 빠져요. ‘지금 불안 7/10, 이유: 내일 일정’처럼 한 줄만 쓰니 생각이 정리됐어요." },
    ],
    question: [
      { t:"잠을 못 자면 다음날 불안이 폭발해요", b:"수면이 깨지면 가슴이 벌렁거리고 생각이 멈추질 않아요. 다들 이런 날 어떻게 버티세요?" },
      { t:"불안할 때 혼자 있는 게 더 무서운 이유가 뭘까요?", b:"사람 피하고 싶은데 막상 혼자 있으면 더 무서워요. 저만 이런가요?" },
      { t:"공황 올 것 같은 ‘초기 신호’ 오면 뭐부터 하세요?", b:"초기 신호가 오면 미리 막는 루틴이 있나요? 다들 첫 행동이 궁금해요." },
      { t:"약 말고 생활습관으로 효과 본 게 있을까요?", b:"약에 의존하고 싶진 않은데, 루틴/습관으로 도움이 된 방법이 있으면 공유 부탁해요." },
      { t:"불안 때문에 약속 취소가 반복돼요", b:"미안한 마음도 크고… 회피가 습관될까 겁나요. 이 패턴 어떻게 끊으셨어요?" },
      { t:"밤에만 유독 불안해지는 이유가 뭘까요?", b:"낮엔 괜찮은데 밤만 되면 심해져요. 비슷한 경험 있으신 분들 원인이 뭐였나요?" },
      { t:"불안이 ‘나아지고 있다’는 기준이 있나요?", b:"완전히 없어지진 않는데, 이게 좋아지고 있는 건지 모르겠어요. 어떤 기준으로 판단하셨나요?" },
    ],
    comfort: [
      { t:"오늘 아무것도 못 해도 괜찮아요", b:"불안한 하루를 버텼다면 그걸로 충분해요. 오늘은 그 자체로 잘한 거예요." },
      { t:"불안은 약해서 생기는 게 아니래요", b:"몸이 나를 지키려다 경보를 과하게 울리는 거라고 하더라구요. 당신이 이상한 게 아니에요." },
      { t:"지금 이 순간이 영원하진 않아요", b:"감정은 파도처럼 올라왔다 내려가요. 지금은 그 중간일 뿐이에요." },
      { t:"불안해도 당신은 안전해요", b:"느낌이 위험한 거지, 실제로 위험한 건 아니에요. 숨을 한 번만 길게 내쉬어봐요." },
      { t:"오늘은 쉬어도 되는 날이에요", b:"회복에도 에너지가 필요해요. 멈춤도 앞으로 가는 과정이에요." },
      { t:"잘 버티고 있다는 사실 잊지 마세요", b:"지금 이만큼 견디는 것도 쉬운 일 아니에요. 여기까지 온 것만으로도 충분해요." },
    ],
    routine: [
      { t:"아침 햇빛 5분이 하루를 바꿨어요", b:"눈 뜨자마자 창가에 서서 빛을 보는 것만으로도 불안이 덜했어요. 몸이 먼저 깨어나는 느낌!" },
      { t:"불안한 날엔 ‘5분 산책’이 제일 확실했어요", b:"속도가 아니라 ‘밖에 나갔다’는 게 중요하더라구요. 5분만 걸어도 생각이 정리돼요." },
      { t:"자기 전 루틴을 고정하니 밤 불안이 줄었어요", b:"같은 순서로 움직이니까 몸이 먼저 안심해요. (세안→물→스트레칭→불 끄기) 단순할수록 좋아요." },
      { t:"불안 기록은 밤 말고 낮에 했어요", b:"밤에 쓰면 감정에 더 빠져 힘들었어요. 낮에 3분만 정리하고 밤엔 쉬는 게 더 좋았어요." },
      { t:"루틴이 깨진 날은 ‘실패’ 대신 ‘리셋’으로", b:"실패로 기록하면 다음날도 무너져요. 그래서 그냥 ‘리셋’이라고 쓰고 다시 시작했어요." },
    ],
  };

  const commentPool = [
    "저도 비슷해요… 읽고 조금 안심됐어요.",
    "공감… 특히 밤이 더 힘들죠.",
    "저는 카페인 줄이니 덜했어요.",
    "호흡 4-6 도움이 됐어요.",
    "검사 정상 확인하니 마음이 조금 편해졌어요.",
    "글 고마워요. 저도 버텨볼게요.",
    "‘지금 안전해’ 반복 은근 효과 있더라구요.",
    "혼자가 아니라는 게 위로가 돼요.",
  ];

  function makeComments(baseTs) {
    const n = rand(8, 40);
    const arr = [];
    for (let i=0;i<n;i++){
      arr.push({
        id: uid("c"),
        text: commentPool[rand(0, commentPool.length - 1)],
        createdAt: baseTs + i * 1000 * 60 * rand(1, 4),
      });
    }
    return arr;
  }

  // ✅ “중복 없이” 템플릿을 각 1번씩만 생성 (총 23개)
  function seedRich(force=false) {
    const existing = loadPosts();
    if (existing.length && !force) return;

    const now = Date.now();
    const posts = [];
    const cats = ["tips","question","comfort","routine"];

    cats.forEach((cat) => {
      (templates[cat] || []).forEach((tpl, idx) => {
        const author = authorPool[rand(0, authorPool.length - 1)];

        const createdAt =
          now
          - (1000*60*60*rand(2, 240))
          - rand(0, 1000*60*40)
          - (idx * 1000 * 60 * rand(7, 20));

        const hasImage = rand(1,100) <= 35;
        const imageUrl = hasImage ? `./images/community_sample_${rand(1,6)}.jpg` : "";

        posts.push({
          id: uid("p"),
          category: cat,
          authorName: author.name,
          authorSub: author.sub,
          title: tpl.t,
          body: tpl.b,
          imageUrl,
          createdAt,
          likeCount: rand(3, 260),
          comments: makeComments(createdAt + 1000*60*15),
        });
      });
    });

    posts.sort((a,b) => (b.createdAt||0) - (a.createdAt||0));
    savePosts(posts);
  }

  /* ===== state ===== */
  let activeCat = "popular";
  let activeSort = "hot";
  let searchQuery = "";

  /* ===== elements ===== */
  const bestList = document.getElementById("bestList");
  const postList = document.getElementById("postList");
  const emptyHint = document.getElementById("emptyHint");

  document.getElementById("fabWriteBtn")?.addEventListener("click", () => {
    window.location.href = routes.write;
  });

  // top tabs
  document.querySelectorAll(".topTab").forEach((btn) => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".topTab").forEach(b => b.classList.remove("is-active"));
      btn.classList.add("is-active");
      activeCat = btn.dataset.cat || "all";
      renderAll();
    });
  });

  // chips sort
  document.querySelectorAll(".chip").forEach((btn) => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".chip").forEach(b => b.classList.remove("is-on"));
      btn.classList.add("is-on");
      activeSort = btn.dataset.sort || "hot";
      renderAll();
    });
  });

  topSearchForm?.addEventListener("submit", (e) => {
    e.preventDefault();
    searchQuery = (topSearchInput.value || "").trim();
    renderAll();
  });

  function calcHotScore(p){
    const ageH = Math.max(1, (Date.now() - p.createdAt) / (1000*60*60));
    const like = p.likeCount || 0;
    const c = (p.comments || []).length;
    return (like * 1.2 + c * 2.2) / Math.pow(ageH, 0.25);
  }

  function getFilteredPosts(){
    let posts = loadPosts().slice();
    const likesMap = loadLikes();

    const q = (searchQuery || "").toLowerCase();
    if (q){
      posts = posts.filter(p => {
        const inText = `${p.title} ${p.body}`.toLowerCase().includes(q);
        const inComments = (p.comments||[]).some(c => (c.text||"").toLowerCase().includes(q));
        return inText || inComments;
      });
    }

    if (activeCat !== "all" && activeCat !== "popular"){
      posts = posts.filter(p => p.category === activeCat);
    }

    posts.forEach(p => {
      p._hot = calcHotScore(p);
      p._liked = !!likesMap[p.id];
    });

    if (activeSort === "new"){
      posts.sort((a,b) => (b.createdAt||0) - (a.createdAt||0));
    } else if (activeSort === "comment"){
      posts.sort((a,b) => (b.comments?.length||0) - (a.comments?.length||0));
    } else if (activeSort === "like"){
      posts.sort((a,b) => (b.likeCount||0) - (a.likeCount||0));
    } else {
      posts.sort((a,b) => (b._hot||0) - (a._hot||0));
    }

    if (activeCat === "popular") posts = posts.slice(0, 30);
    return posts;
  }

  // ✅ 베스트 fallback 이미지 4개 (너가 바꿔 끼우면 됨)
  const bestFallbackImgs = [
    "./images/home_diary1.png",
    "./images/home_diary2.png",
    "./images/stable_kit_1.png",
    "./images/home_diary4.png",
  ];

  function renderBest(){
    const posts = loadPosts().slice();
    posts.forEach(p => p._hot = calcHotScore(p));
    posts.sort((a,b) => (b._hot||0) - (a._hot||0));
    const best = posts.slice(0,4);

    bestList.innerHTML = "";
    const frag = document.createDocumentFragment();

    best.forEach((p, idx) => {
      const row = document.createElement("div");
      row.className = "bestRow";

      const bestImg = p.imageUrl ? p.imageUrl : (bestFallbackImgs[idx] || bestFallbackImgs[0]);

      row.innerHTML = `
        <div class="bestLeft">
          <div class="bestRank">${idx+1}</div>
          <div class="bestText">
            <div class="bestTitle">${esc(p.title)}</div>
            <div class="bestMeta">
              <span>${esc(p.authorName)}</span>
              <span>·</span>
              <span>좋아요 ${p.likeCount || 0}</span>
              <span>·</span>
              <span>댓글 ${(p.comments||[]).length}</span>
            </div>
          </div>
        </div>
        <div class="bestThumb">
          <img src="${esc(bestImg)}" alt=""
            onerror="this.remove(); this.closest('.bestThumb').classList.add('is-empty'); this.closest('.bestThumb').textContent='이미지';" />
        </div>
      `;

      row.addEventListener("click", () => {
        window.location.href = `${routes.post}?id=${encodeURIComponent(p.id)}`;
      });

      frag.appendChild(row);
    });

    bestList.appendChild(frag);
  }

  function toggleLike(postId){
    const likes = loadLikes();
    const posts = loadPosts();
    const p = posts.find(x => x.id === postId);
    if (!p) return;

    const liked = !!likes[postId];
    if (liked){
      delete likes[postId];
      p.likeCount = Math.max(0, (p.likeCount||0) - 1);
    } else {
      likes[postId] = true;
      p.likeCount = (p.likeCount||0) + 1;
    }

    saveLikes(likes);
    savePosts(posts);
  }

  function heartSvg(){
    return `
      <svg class="heartIcon" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
        <path d="M12 21s-6.7-4.35-9.33-7.38C.8 11.45 1.5 7.5 5.4 6.5c2-.5 3.9.4 4.6 1.6.7-1.2 2.6-2.1 4.6-1.6 3.9 1 4.6 4.95 2.73 7.12C18.7 16.65 12 21 12 21z"/>
      </svg>
    `;
  }

  function renderFeed(){
    const posts = getFilteredPosts();
    postList.innerHTML = "";

    if (!posts.length){
      emptyHint.textContent = searchQuery
        ? `“${searchQuery}” 검색 결과가 없어요.`
        : "결과가 없어요.";
      return;
    }
    emptyHint.textContent = "";

    const frag = document.createDocumentFragment();

    posts.forEach(p => {
      const card = document.createElement("article");
      card.className = "postCard";
      card.dataset.open = p.id;

      const media = p.imageUrl
        ? `<div class="postMedia"><img src="${esc(p.imageUrl)}" alt="" onerror="this.closest('.postMedia').remove();" /></div>`
        : "";

      card.innerHTML = `
        <div class="postTop">
          <div class="author">
            <div class="avatar" aria-hidden="true"></div>
            <div class="authorText">
              <div class="authorName">${esc(p.authorName)}</div>
              <div class="authorMeta">${esc(timeAgo(p.createdAt))} · ${esc(p.authorSub || "")}</div>
            </div>
          </div>
          <div class="catBadge">${esc(catLabel(p.category))}</div>
        </div>

        <div class="postTitle">${esc(p.title)}</div>
        <div class="postBody">${esc(p.body)}</div>
        ${media}

        <div class="postActions">
          <button class="actionBtn ${p._liked ? "is-liked":""}" type="button" data-like="${esc(p.id)}" aria-label="좋아요">
            ${heartSvg()}
            <span>좋아요</span>
            <span>${p.likeCount || 0}</span>
          </button>

          <button class="actionBtn" type="button" data-open="${esc(p.id)}">
            <span class="actionDot" aria-hidden="true"></span>
            <span>댓글</span>
            <span>${(p.comments||[]).length}</span>
          </button>

          <button class="actionBtn" type="button" data-share="${esc(p.id)}">
            <span class="actionDot" aria-hidden="true"></span>
            <span>공유</span>
          </button>
        </div>
      `;

      frag.appendChild(card);
    });

    postList.appendChild(frag);
  }

  postList?.addEventListener("click", (e) => {
    const likeBtn = e.target.closest("[data-like]");
    if (likeBtn){
      e.preventDefault();
      e.stopPropagation();
      const id = likeBtn.getAttribute("data-like");
      toggleLike(id);
      renderAll();
      return;
    }

    const shareBtn = e.target.closest("[data-share]");
    if (shareBtn){
      e.preventDefault();
      e.stopPropagation();
      alert("공유는 다음 단계에서 연결해줄게 🙂");
      return;
    }

    const openTarget = e.target.closest("[data-open]") || e.target.closest(".postCard");
    if (openTarget){
      const id = openTarget.getAttribute("data-open") || openTarget.dataset.open;
      if (!id) return;
      window.location.href = `${routes.post}?id=${encodeURIComponent(id)}`;
    }
  });

  function renderAll(){
    renderBest();
    renderFeed();
  }

  /* ===== init ===== */
  seedRich(false);
  renderAll();
})();
