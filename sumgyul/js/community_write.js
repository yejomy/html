(() => {
  /* ===== routes ===== */
  const routes = {
    home: "./home.html",
    stability: "./stability.html",
    record: "./record.html",
    community: "./community.html",
    my: "./my.html",
  };

  /* ===== storage keys ===== */
  const COMMUNITY_KEY = "sbg_community_posts_v4";
  const DRAFT_KEY = "sbg_community_write_draft_v2";

  /* ===== utils ===== */
  const uid = (p="p") => `${p}_${Math.random().toString(16).slice(2)}_${Date.now()}`;
  const rand = (arr) => arr[Math.floor(Math.random() * arr.length)];

  // 랜덤 작성자(아이디+로고+색)
  const avatarEmojis = ["🙂","😌","🌿","🌙","☁️","🫶","✨","🍵","🧸","🌼"];
  const colorPool = ["#2d5a51","#f1762c","#6b7280","#0ea5e9","#8b5cf6","#22c55e","#ef4444","#f59e0b"];
  function makeAuthor(){
    const num = Math.floor(1000 + Math.random() * 9000);
    return { id: `user${num}`, badge: rand(avatarEmojis), color: rand(colorPool) };
  }

  function loadJSON(key, fallback){
    try { return JSON.parse(localStorage.getItem(key) || JSON.stringify(fallback)); }
    catch { return fallback; }
  }
  function saveJSON(key, value){
    localStorage.setItem(key, JSON.stringify(value));
  }

  /* ===== DOM ===== */
  const backBtn = document.getElementById("backBtn");
  const submitBtn = document.getElementById("submitBtn");

  const catEl = document.getElementById("cat");
  const titleEl = document.getElementById("title");
  const bodyEl = document.getElementById("body");

  const imgFileEl = document.getElementById("imgFile");
  const preview = document.getElementById("preview");
  const ratioBox = document.getElementById("ratioBox");
  const previewImg = document.getElementById("previewImg");
  const removeImgBtn = document.getElementById("removeImgBtn");

  const tabWrap = document.getElementById("tabWrap");

  /* ===== state ===== */
  let dirty = false;
  let imageDataUrl = "";
  let imageW = 0;
  let imageH = 0;

  function confirmLeave(){
    if (!dirty) return true;
    return confirm("작성 중인 내용이 사라져요. 이동할까요?");
  }

  function go(url){
    // 키보드 내려서 레이아웃 점프 최소화
    try { document.activeElement?.blur?.(); } catch {}
    window.location.href = url;
  }

  /* ===== 뒤로가기 ===== */
  backBtn?.addEventListener("click", () => {
    if (!confirmLeave()) return;
    go(routes.community);
  });

  /* ===== tab nav ===== */
  document.querySelectorAll(".tabbar .tab").forEach((btn) => {
    btn.addEventListener("click", () => {
      if (!confirmLeave()) return;
      const key = btn.dataset.tab;
      const url = routes[key];
      if (!url) return;

      // 커뮤니티 탭도 community.html로 이동
      go(url);
    });
  });

  /* ===== 키보드(포커스) 시 탭바 슬라이드 ===== */
  function enterKeyboardMode(){
    document.body.classList.add("cw-kb");
  }
  function exitKeyboardMode(){
    document.body.classList.remove("cw-kb");
  }

  document.addEventListener("focusin", (e) => {
    const t = e.target;
    if (t && t.matches("input, textarea, select")) enterKeyboardMode();
  });
  document.addEventListener("focusout", (e) => {
    const t = e.target;
    if (t && t.matches("input, textarea, select")) {
      setTimeout(() => {
        const a = document.activeElement;
        if (a && a.matches("input, textarea, select")) return;
        exitKeyboardMode();
      }, 50);
    }
  });

  /* ===== beforeunload ===== */
  window.addEventListener("beforeunload", (e) => {
    if (!dirty) return;
    e.preventDefault();
    e.returnValue = "";
  });

  /* ===== draft ===== */
  function saveDraft(){
    saveJSON(DRAFT_KEY, {
      category: catEl.value,
      title: titleEl.value,
      body: bodyEl.value,
      imageDataUrl,
      imageW,
      imageH,
    });
  }

  function setDirty(){
    dirty = true;
    saveDraft();
  }

  // draft 복원
  const d = loadJSON(DRAFT_KEY, {});
  if (d.category) catEl.value = d.category;
  if (d.title) titleEl.value = d.title;
  if (d.body) bodyEl.value = d.body;
  if (d.imageDataUrl){
    imageDataUrl = d.imageDataUrl;
    imageW = Number(d.imageW || 0);
    imageH = Number(d.imageH || 0);

    // ratio 적용
    if (imageW > 0 && imageH > 0) {
      ratioBox.style.aspectRatio = `${imageW} / ${imageH}`;
    } else {
      ratioBox.style.aspectRatio = "1 / 1";
    }

    previewImg.src = imageDataUrl;
    preview.hidden = false;
  }

  ["change","input"].forEach(evt => {
    catEl?.addEventListener(evt, setDirty);
    titleEl?.addEventListener(evt, setDirty);
    bodyEl?.addEventListener(evt, setDirty);
  });

  /* ===== 이미지 업로드: 원본 비율 유지 + 저장 ===== */
  imgFileEl?.addEventListener("change", () => {
    const file = imgFileEl.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      const url = String(reader.result || "");
      if (!url) return;

      // 원본 비율 구하기
      const img = new Image();
      img.onload = () => {
        imageDataUrl = url;
        imageW = img.naturalWidth || 0;
        imageH = img.naturalHeight || 0;

        // 프리뷰: 원본 비율 그대로
        if (imageW > 0 && imageH > 0) {
          ratioBox.style.aspectRatio = `${imageW} / ${imageH}`;
        } else {
          ratioBox.style.aspectRatio = "1 / 1";
        }

        previewImg.src = imageDataUrl;
        preview.hidden = false;

        setDirty();
      };
      img.src = url;
    };
    reader.readAsDataURL(file);
  });

  removeImgBtn?.addEventListener("click", () => {
    imageDataUrl = "";
    imageW = 0;
    imageH = 0;

    if (imgFileEl) imgFileEl.value = "";
    preview.hidden = true;
    previewImg.src = "";
    ratioBox.style.aspectRatio = "1 / 1";

    setDirty();
  });

  /* ===== 등록 ===== */
  function validate(){
    const t = (titleEl.value || "").trim();
    const b = (bodyEl.value || "").trim();
    if (!t) return "제목을 입력해줘!";
    if (!b) return "내용을 입력해줘!";
    return "";
  }

  function savePost(){
    const posts = loadJSON(COMMUNITY_KEY, []);
    const author = makeAuthor();

    const post = {
      id: uid("p"),
      category: catEl.value,

      // 작성자 랜덤
      authorId: author.id,
      authorBadge: author.badge,
      authorColor: author.color,

      title: titleEl.value.trim(),
      body: bodyEl.value.trim(),

      // ✅ 이미지 원본 비율 정보까지 같이 저장
      imageUrl: imageDataUrl,
      imageW,
      imageH,

      createdAt: Date.now(),
      likeCount: 0,
      comments: [],
    };

    posts.unshift(post);
    saveJSON(COMMUNITY_KEY, posts);
  }

  submitBtn?.addEventListener("click", () => {
    const msg = validate();
    if (msg) return alert(msg);

    savePost();

    // draft 제거 + dirty 해제
    localStorage.removeItem(DRAFT_KEY);
    dirty = false;

    go(routes.community);
  });

  // 첫 로드 시 탭바 위치 안정화(혹시 모를 repaint)
  setTimeout(() => {
    if (tabWrap) tabWrap.style.transform = "translateY(0)";
  }, 0);
})();
