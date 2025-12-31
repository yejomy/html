(() => {
  const TMDB = {
    apiKey: "53065a6bea39d69f476c32c8ed552246",
    base: "https://api.themoviedb.org/3",
    language: "ko-KR",
    page: 1,
    imgPoster: "https://image.tmdb.org/t/p/w500",
    imgBackdrop: "https://image.tmdb.org/t/p/w1280",
  };

  const app = document.getElementById("appShell");
  const backdrop = document.getElementById("backdrop");

  const btnMenu = document.getElementById("btnMenu");
  const btnSearch = document.getElementById("btnSearch");
  const btnCollapse = document.getElementById("btnCollapse");
  const searchInput = document.getElementById("searchInput");

  const heroBg = document.getElementById("heroBg");
  const heroBadge = document.getElementById("heroBadge");
  const heroTitle = document.getElementById("heroTitle");
  const heroDesc = document.getElementById("heroDesc");
  const heroMeta = document.getElementById("heroMeta");

  const modal = document.getElementById("previewModal");
  const modalTitle = document.getElementById("modalTitle");
  const modalMeta = document.getElementById("modalMeta");
  const modalDesc = document.getElementById("modalDesc");
  const modalHero = document.getElementById("modalHero");

  const grids = {
    now_playing: document.getElementById("grid_now_playing"),
    trending: document.getElementById("grid_trending"),
    top_rated: document.getElementById("grid_top_rated"),
    action: document.getElementById("grid_action"),
    comedy: document.getElementById("grid_comedy"),
    horror: document.getElementById("grid_horror"),
  };

  let allItemsByGrid = {};   // { gridKey: items[] }
  let heroItem = null;

  // ---------- Helpers ----------
  const esc = (s) =>
    String(s ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");

  const toYear = (dateStr) => (dateStr ? String(dateStr).slice(0, 4) : "");
  const posterUrl = (path) => (path ? `${TMDB.imgPoster}${path}` : "");
  const backdropUrl = (path) => (path ? `${TMDB.imgBackdrop}${path}` : "");

  function chip(text) {
    const span = document.createElement("span");
    span.className = "chip";
    span.textContent = text;
    return span;
  }

  function setHero(item, badgeText) {
    heroItem = item;

    heroBadge.textContent = badgeText;
    heroTitle.textContent = item?.title || item?.name || "Untitled";
    heroDesc.textContent = item?.overview?.trim() ? item.overview : "설명이 없습니다.";

    heroMeta.innerHTML = "";
    const y = toYear(item?.release_date);
    if (y) heroMeta.appendChild(chip(y));
    if (typeof item?.vote_average === "number") heroMeta.appendChild(chip(`★ ${item.vote_average.toFixed(1)}`));
    heroMeta.appendChild(chip("TMDB"));

    const bg = backdropUrl(item?.backdrop_path) || posterUrl(item?.poster_path);
    heroBg.style.background = bg
      ? `linear-gradient(180deg, rgba(0,0,0,.15), rgba(0,0,0,.72)), url("${bg}") center/cover no-repeat`
      : `linear-gradient(180deg, rgba(0,0,0,.25), rgba(0,0,0,.70))`;
  }

  function cardTemplate(item) {
    const title = item?.title || item?.name || "Untitled";
    const y = toYear(item?.release_date);
    const rating = typeof item?.vote_average === "number" ? item.vote_average.toFixed(1) : "";
    const tag = y || (rating ? `★ ${rating}` : "TMDB");

    const img = posterUrl(item?.poster_path) || backdropUrl(item?.backdrop_path);
    const bgStyle = img ? `background-image:url('${img}')` : "";

    return `
      <article class="card" tabindex="0" role="button"
        aria-label="${esc(title)}"
        data-id="${esc(item.id)}">
        <div class="card__img" style="${bgStyle}" aria-hidden="true"></div>
        <div class="card__shade" aria-hidden="true"></div>
        <div class="card__meta">
          <div class="card__title">${esc(title)}</div>
          <div class="card__tag">${esc(tag)}</div>
        </div>
      </article>
    `;
  }

  function openPreview(item) {
    const title = item?.title || item?.name || "Untitled";
    const y = toYear(item?.release_date);
    const rating = typeof item?.vote_average === "number" ? item.vote_average.toFixed(1) : "-";

    modalTitle.textContent = title;
    modalMeta.textContent = `${y || "—"} • ★ ${rating} • TMDB`;
    modalDesc.textContent = item?.overview?.trim() ? item.overview : "설명이 없습니다.";

    const bg = backdropUrl(item?.backdrop_path) || posterUrl(item?.poster_path);
    modalHero.style.background = bg
      ? `linear-gradient(180deg, rgba(0,0,0,.12), rgba(0,0,0,.78)), url("${bg}") center/cover no-repeat`
      : `linear-gradient(180deg, rgba(0,0,0,.12), rgba(0,0,0,.78))`;

    if (typeof modal.showModal === "function") modal.showModal();
    else alert(`${title}\n\n${modalMeta.textContent}\n\n${modalDesc.textContent}`);
  }

  // ---------- TMDB Fetch ----------
  async function fetchJson(path, params = {}) {
    const url = new URL(`${TMDB.base}${path}`);
    url.searchParams.set("api_key", TMDB.apiKey);
    url.searchParams.set("language", TMDB.language);
    url.searchParams.set("page", String(TMDB.page));
    Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, String(v)));

    const res = await fetch(url.toString());
    if (!res.ok) throw new Error(`TMDB fetch failed: ${res.status} ${res.statusText}`);
    return res.json();
  }

  async function fetchList(typeKey) {
    // 섹션별 endpoint
    switch (typeKey) {
      case "now_playing":
        return (await fetchJson("/movie/now_playing")).results || [];
      case "top_rated":
        return (await fetchJson("/movie/top_rated")).results || [];
      case "trending":
        return (await fetchJson("/trending/all/week", { language: TMDB.language })).results || [];
      case "action":
        return (await fetchJson("/discover/movie", { with_genres: 28 })).results || [];
      case "comedy":
        return (await fetchJson("/discover/movie", { with_genres: 35 })).results || [];
      case "horror":
        return (await fetchJson("/discover/movie", { with_genres: 27 })).results || [];
      default:
        return (await fetchJson("/movie/now_playing")).results || [];
    }
  }

  function renderGrid(gridKey, items) {
    allItemsByGrid[gridKey] = items.slice();

    // “한 줄에 5개” 느낌 살리려면 섹션당 15~20개 정도가 적당
    const sliced = items.slice(0, 20);
    grids[gridKey].innerHTML = sliced.map(cardTemplate).join("");

    // click -> modal (event delegation)
    grids[gridKey].onclick = (e) => {
      const card = e.target.closest(".card");
      if (!card) return;
      const id = card.getAttribute("data-id");
      const found = allItemsByGrid[gridKey].find(x => String(x.id) === String(id));
      if (found) openPreview(found);
    };
  }

  function pickHeroFrom(items) {
    const sorted = [...items].sort((a, b) => (b.popularity || 0) - (a.popularity || 0));
    return sorted.find(x => x.backdrop_path) || sorted[0] || null;
  }

  async function loadHome() {
    // 로딩 UI
    heroBadge.textContent = "HOME";
    heroTitle.textContent = "Loading...";
    heroDesc.textContent = "TMDB에서 섹션 데이터를 불러오는 중입니다.";
    heroMeta.innerHTML = "";

    // 여러 섹션 동시에 로드
    const keys = Object.keys(grids);
    const results = await Promise.allSettled(keys.map(k => fetchList(k)));

    results.forEach((r, idx) => {
      const key = keys[idx];
      const items = r.status === "fulfilled" ? r.value : [];
      renderGrid(key, items);
    });

    // hero는 now_playing에서 하나 뽑아주자
    const heroCandidate = pickHeroFrom(allItemsByGrid.now_playing || []);
    if (heroCandidate) setHero(heroCandidate, "NOW PLAYING");
    else {
      heroTitle.textContent = "No results";
      heroDesc.textContent = "데이터가 비어있습니다.";
    }

    applySearch(); // 검색 적용
  }

  // ---------- Search (전체 섹션 필터) ----------
  let raf = null;
  function applySearch() {
    const q = (searchInput.value || "").trim().toLowerCase();

    Object.keys(grids).forEach((gridKey) => {
      const gridEl = grids[gridKey];
      const items = allItemsByGrid[gridKey] || [];
      const cards = Array.from(gridEl.querySelectorAll(".card"));

      cards.forEach((card) => {
        const id = card.getAttribute("data-id");
        const item = items.find(x => String(x.id) === String(id));
        const title = (item?.title || item?.name || "").toLowerCase();
        const show = q === "" || title.includes(q);
        card.style.display = show ? "" : "none";
      });
    });
  }

  searchInput?.addEventListener("input", () => {
    if (raf) cancelAnimationFrame(raf);
    raf = requestAnimationFrame(applySearch);
  });

  // ---------- UI Events ----------
  btnCollapse?.addEventListener("click", () => {
    app.classList.toggle("is-collapsed");
  });

  btnMenu?.addEventListener("click", () => {
    const open = app.classList.toggle("is-nav-open");
    btnMenu.setAttribute("aria-expanded", String(open));
    backdrop.classList.toggle("is-visible", open);
  });

  backdrop?.addEventListener("click", closeNav);
  function closeNav() {
    app.classList.remove("is-nav-open");
    backdrop.classList.remove("is-visible");
    btnMenu?.setAttribute("aria-expanded", "false");
  }

  btnSearch?.addEventListener("click", () => {
    if (!app.classList.contains("is-nav-open")) {
      app.classList.add("is-nav-open");
      backdrop.classList.add("is-visible");
      btnMenu?.setAttribute("aria-expanded", "true");
    }
    setTimeout(() => searchInput?.focus(), 50);
  });

  // nav route
  document.querySelectorAll(".nav__item").forEach(a => {
    a.addEventListener("click", async (e) => {
      e.preventDefault();
      document.querySelectorAll(".nav__item").forEach(x => x.classList.remove("is-active"));
      a.classList.add("is-active");

      const route = a.getAttribute("data-route") || "home";
      closeNav();

      // home는 섹션 다 보여주는 페이지
      if (route === "home") {
        await loadHome();
        return;
      }

      // 특정 메뉴 누르면: 해당 섹션만 맨 위로 강조(스크롤 이동 + hero 교체)
      const items = await fetchList(route);
      if (items.length) setHero(pickHeroFrom(items), route.toUpperCase());

      // home 그리드도 같이 최신화해버리기 (원하면 여기서만 업데이트하도록 바꿔도 됨)
      await loadHome();

      // 해당 섹션으로 스크롤
      const targetId = {
        now_playing: "grid_now_playing",
        popular: "grid_trending",   // popular 섹션 따로 만들고 싶으면 그리드 하나 더 추가하면 됨
        top_rated: "grid_top_rated",
        upcoming: "grid_now_playing",
      }[route];

      const targetEl = targetId ? document.getElementById(targetId) : null;
      targetEl?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  });

  // hero buttons
  document.getElementById("btnMore")?.addEventListener("click", () => {
    if (heroItem) openPreview(heroItem);
  });
  document.getElementById("btnPlay")?.addEventListener("click", () => {
    if (heroItem) openPreview(heroItem);
  });

  window.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closeNav();
  });

  // init
  loadHome().catch((err) => {
    console.error(err);
    heroTitle.textContent = "Error";
    heroDesc.textContent = "TMDB 호출 실패 (apikey/네트워크) 확인";
  });
})();
