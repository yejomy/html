(() => {
  const btnHamburger = document.getElementById('btnHamburger');
  const btnCloseNav = document.getElementById('btnCloseNav');
  const backdrop = document.getElementById('backdrop');
  const sidenav = document.getElementById('sidenav');

  const searchInput = document.getElementById('searchInput');
  const btnHeaderSearch = document.getElementById('btnHeaderSearch');
  const btnMyPage = document.getElementById('btnMyPage');

  const heroTitle = document.getElementById('heroTitle');
  const heroDesc = document.getElementById('heroDesc');
  const heroBg = document.getElementById('heroBg');
  const heroYear = document.getElementById('heroYear');
  const heroType = document.getElementById('heroType');
  const heroRating = document.getElementById('heroRating');

  const heroVideoWrap = document.getElementById('heroVideoWrap');
  const heroVideoFrame = document.getElementById('heroVideoFrame');

  const modal = document.getElementById('previewModal');
  const modalTitle = document.getElementById('modalTitle');
  const modalMeta = document.getElementById('modalMeta');
  const modalDesc = document.getElementById('modalDesc');
  const modalHero = document.getElementById('modalHero');

  const TMDB_KEY = '53065a6bea39d69f476c32c8ed552246';
  const TMDB_BASE = 'https://api.themoviedb.org/3/';
  const LANG = 'ko-KR';

  const IMG_W1280 = 'https://image.tmdb.org/t/p/w1280';
  const IMG_W780  = 'https://image.tmdb.org/t/p/w780';

  const SECTIONS = [
    { key: 'now_playing',  endpoint: `movie/now_playing?language=${LANG}&page=1`,                 typeHint: 'movie' },
    { key: 'only_netflix', endpoint: `discover/tv?with_networks=213&language=${LANG}&page=1`,     typeHint: 'tv'    },
    { key: 'new_trending', endpoint: `trending/all/week?language=${LANG}`,                        typeHint: null     },
    { key: 'popular',      endpoint: `movie/top_rated?language=${LANG}&page=1`,                   typeHint: 'movie' },
    { key: 'action',       endpoint: `discover/movie?with_genres=28&language=${LANG}&page=1`,     typeHint: 'movie' },
    { key: 'comedy',       endpoint: `discover/movie?with_genres=35&language=${LANG}&page=1`,     typeHint: 'movie' },
    { key: 'horror',       endpoint: `discover/movie?with_genres=27&language=${LANG}&page=1`,     typeHint: 'movie' },
    { key: 'romance',      endpoint: `discover/movie?with_genres=10749&language=${LANG}&page=1`,  typeHint: 'movie' },
    { key: 'documentary',  endpoint: `discover/movie?with_genres=99&language=${LANG}&page=1`,     typeHint: 'movie' },
  ];

  const DATA = Object.fromEntries(SECTIONS.map(s => [s.key, []]));

  function tmdbUrl(endpoint) {
    const url = new URL(endpoint, TMDB_BASE);
    url.searchParams.set('api_key', TMDB_KEY);
    return url.toString();
  }
  const img = (path, big=false) => path ? `${big ? IMG_W1280 : IMG_W780}${path}` : null;

  function escapeHtml(s) {
    return String(s ?? '')
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#039;');
  }
  function shortText(s, n = 120){
    const t = String(s || '').replace(/\s+/g,' ').trim();
    return t.length > n ? t.slice(0, n) + '…' : t;
  }

  function normalize(raw, typeHint) {
    const mediaType = typeHint || raw.media_type || (raw.name ? 'tv' : 'movie');
    const title = mediaType === 'tv'
      ? (raw.name || raw.original_name || '제목 없음')
      : (raw.title || raw.original_title || '제목 없음');

    const dateStr = mediaType === 'tv' ? raw.first_air_date : raw.release_date;
    const year = dateStr ? String(dateStr).slice(0, 4) : '—';

    return {
      id: `tmdb-${mediaType}-${raw.id}`,
      tmdbId: raw.id,
      mediaType,
      title,
      year,
      rating: (typeof raw.vote_average === 'number') ? raw.vote_average : null,
      overview: raw.overview || '설명이 없습니다.',
      backdrop: img(raw.backdrop_path, true) || img(raw.poster_path, true),
      cardBg:  img(raw.backdrop_path) || img(raw.poster_path),
    };
  }

  // ===== nav open/close =====
  function openNav() {
    document.body.classList.add('is-nav-open');
    btnHamburger?.setAttribute('aria-expanded', 'true');
    sidenav?.setAttribute('aria-hidden', 'false');
  }
  function closeNav() {
    document.body.classList.remove('is-nav-open');
    btnHamburger?.setAttribute('aria-expanded', 'false');
    sidenav?.setAttribute('aria-hidden', 'true');
  }

  btnHamburger?.addEventListener('click', () => {
    const open = document.body.classList.toggle('is-nav-open');
    btnHamburger.setAttribute('aria-expanded', String(open));
    sidenav?.setAttribute('aria-hidden', String(!open));
  });
  btnCloseNav?.addEventListener('click', closeNav);
  backdrop?.addEventListener('click', closeNav);
  window.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeNav(); });

  btnHeaderSearch?.addEventListener('click', () => {
    openNav();
    setTimeout(() => searchInput?.focus(), 30);
  });

  btnMyPage?.addEventListener('click', () => {
    closeNav();
    document.getElementById('sec-popular')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  });

  // ===== Header menu active (글자색만) =====
  function setHeaderActive(sectionKey) {
    document.querySelectorAll('.hlink').forEach(x => x.classList.remove('is-active'));
    const link = document.querySelector(`.hlink[data-nav="${sectionKey}"]`);
    if (link) link.classList.add('is-active');
  }

  // click scroll
  document.querySelectorAll('.hlink').forEach(a => {
    a.addEventListener('click', (e) => {
      const href = a.getAttribute('href');
      if (!href?.startsWith('#')) return;
      e.preventDefault();

      const map = {
        '#sec-home': 'home',
        '#sec-only-netflix': 'series',
        '#sec-now-playing': 'movies',
        '#sec-new-trending': 'new',
        '#sec-popular': 'my',
        '#sec-action': 'country',
      };
      setHeaderActive(map[href] || 'home');
      document.querySelector(href)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  });

  // IntersectionObserver: 스크롤 따라 active 자동 변경
  const obsTargets = document.querySelectorAll('[data-section]');
  const io = new IntersectionObserver((entries) => {
    // 가장 많이 보이는 섹션을 active로
    const visible = entries
      .filter(e => e.isIntersecting)
      .sort((a,b) => b.intersectionRatio - a.intersectionRatio)[0];
    if (visible?.target) {
      const key = visible.target.getAttribute('data-section');
      if (key) setHeaderActive(key);
    }
  }, { threshold: [0.35, 0.55, 0.75] });

  obsTargets.forEach(el => io.observe(el));

  // ===== modal =====
  function openPreview(item) {
    modalTitle.textContent = item.title;
    modalMeta.textContent = [
      item.year,
      item.mediaType === 'tv' ? 'TV' : 'Movie',
      (typeof item.rating === 'number') ? `★ ${item.rating.toFixed(1)}` : '★ —'
    ].filter(Boolean).join(' • ');

    modalDesc.textContent = item.overview;

    const imgUrl = item.backdrop || item.cardBg;
    modalHero.style.background = imgUrl
      ? `linear-gradient(180deg, rgba(0,0,0,.10), rgba(0,0,0,.82)), url('${imgUrl}') center/cover no-repeat`
      : `radial-gradient(1100px 320px at 20% 20%, rgba(246,196,69,.24), transparent 55%), linear-gradient(180deg, rgba(0,0,0,.10), rgba(0,0,0,.78))`;

    if (typeof modal.showModal === 'function') modal.showModal();
    else alert(`${item.title}\n\n${modalMeta.textContent}\n\n${item.overview}`);
  }

  let HERO_ITEM = null;
  document.getElementById('btnMore')?.addEventListener('click', () => { if (HERO_ITEM) openPreview(HERO_ITEM); });
  document.getElementById('btnPlay')?.addEventListener('click', () => { if (HERO_ITEM) openPreview(HERO_ITEM); });

  // ===== Cards =====
  function cardTemplate(item) {
    const bgStyle = item.cardBg ? `style="background-image:url('${item.cardBg.replaceAll("'", "%27")}')"` : '';
    const rating = (typeof item.rating === 'number') ? `★ ${item.rating.toFixed(1)}` : '★ —';
    const hoverDesc = escapeHtml(shortText(item.overview, 160));

    return `
      <article class="card" tabindex="0" role="button" aria-label="${escapeHtml(item.title)}" data-id="${escapeHtml(item.id)}">
        <div class="card__img" ${bgStyle} aria-hidden="true"></div>
        <div class="card__shade" aria-hidden="true"></div>

        <div class="card__meta">
          <div class="card__title">${escapeHtml(item.title)}</div>
          <div class="card__sub">
            <span class="pill">${escapeHtml(item.year)}</span>
            <span class="pill">${escapeHtml(item.mediaType === 'tv' ? 'TV' : 'Movie')}</span>
            <span class="pill">${escapeHtml(rating)}</span>
          </div>
        </div>

        <div class="card__hover" aria-hidden="true">
          <div class="card__hoverDesc">${hoverDesc}</div>
        </div>
      </article>
    `;
  }

  function bindRailInteractions(rowKey) {
    const row = document.querySelector(`.row[data-row="${rowKey}"]`);
    if (!row) return;
    const rail = row.querySelector('.rail');

    row.querySelectorAll('[data-scroll]').forEach(btn => {
      btn.addEventListener('click', () => {
        const dir = btn.getAttribute('data-scroll');
        const dx = dir === 'left'
          ? -Math.max(380, rail.clientWidth * 0.75)
          :  Math.max(380, rail.clientWidth * 0.75);
        rail.scrollBy({ left: dx, behavior: 'smooth' });
      });
    });

    rail.addEventListener('click', (e) => {
      const card = e.target.closest('.card');
      if (!card) return;
      const id = card.getAttribute('data-id');
      const items = DATA[rowKey] ?? [];
      const found = items.find(x => x.id === id);
      if (found) openPreview(found);
    });
  }

  function renderRow(rowKey) {
    const row = document.querySelector(`.row[data-row="${rowKey}"]`);
    if (!row) return;
    const rail = row.querySelector('.rail');
    const items = DATA[rowKey] ?? [];
    rail.innerHTML = items.map(cardTemplate).join('');
  }

  // ===== Search =====
  let searchRaf = null;
  function applySearch() {
    const q = searchInput.value.trim().toLowerCase();
    document.querySelectorAll('.row').forEach(row => {
      const key = row.getAttribute('data-row');
      const items = DATA[key] ?? [];
      const rail = row.querySelector('.rail');
      const cards = Array.from(rail.querySelectorAll('.card'));

      cards.forEach((card, idx) => {
        const item = items[idx];
        if (!item) return;
        const hay = `${item.title} ${item.year} ${item.mediaType} ${item.overview}`.toLowerCase();
        card.style.display = (q === '' || hay.includes(q)) ? '' : 'none';
      });
    });
  }
  searchInput?.addEventListener('input', () => {
    if (searchRaf) cancelAnimationFrame(searchRaf);
    searchRaf = requestAnimationFrame(applySearch);
  });

  // ===== TMDB fetch =====
  async function fetchList(endpoint, typeHint) {
    const res = await fetch(tmdbUrl(endpoint));
    if (!res.ok) throw new Error(`TMDB fail: ${res.status}`);
    const json = await res.json();
    return (json.results ?? []).map(r => normalize(r, typeHint));
  }

  function pickRandom(arr) {
    if (!arr?.length) return null;
    return arr[Math.floor(Math.random() * arr.length)];
  }

  // ===== Hero: 이미지 → 3초 후 트레일러 =====
  let heroVideoTimer = null;
  function resetHeroVideo() {
    if (heroVideoTimer) clearTimeout(heroVideoTimer);
    heroVideoTimer = null;
    heroVideoWrap?.classList.remove('is-show');
    if (heroVideoFrame) heroVideoFrame.src = ''; // 이전 영상 정지
  }

  async function fetchTrailerKey(item) {
    const base = item.mediaType === 'tv' ? `tv/${item.tmdbId}/videos` : `movie/${item.tmdbId}/videos`;

    // 1) ko-KR 먼저
    const res1 = await fetch(tmdbUrl(`${base}?language=${LANG}`)).catch(() => null);
    const json1 = res1 && res1.ok ? await res1.json() : { results: [] };

    // 2) 없으면 en-US fallback
    let results = json1.results || [];
    if (!results.length) {
      const res2 = await fetch(tmdbUrl(`${base}?language=en-US`)).catch(() => null);
      const json2 = res2 && res2.ok ? await res2.json() : { results: [] };
      results = json2.results || [];
    }

    const pick = results
      .filter(v => v.site === 'YouTube')
      .sort((a,b) => (b.official?1:0) - (a.official?1:0))
      .find(v => ['Trailer','Teaser'].includes(v.type)) || results.find(v => v.site === 'YouTube');

    return pick?.key || null;
  }

  function setHero(item) {
    if (!item) return;
    HERO_ITEM = item;

    heroTitle.textContent = item.title;
    heroDesc.textContent = item.overview || '설명이 없습니다.';
    heroYear.textContent = item.year || '—';
    heroType.textContent = item.mediaType === 'tv' ? 'TV' : 'Movie';
    heroRating.textContent = (typeof item.rating === 'number') ? `★ ${item.rating.toFixed(1)}` : '★ —';

    const bg = item.backdrop || item.cardBg;
    if (bg) {
      heroBg.style.background = `
        radial-gradient(1100px 520px at 20% 10%, rgba(246,196,69,.14), transparent 58%),
        radial-gradient(900px 520px at 90% 20%, rgba(255,222,122,.06), transparent 60%),
        linear-gradient(180deg, rgba(0,0,0,.10), rgba(0,0,0,.88)),
        url('${bg.replaceAll("'", "%27")}') center/cover no-repeat
      `;
    }

    // ✅ 이미지 먼저 보이고 → 3초 후 영상 시도
    resetHeroVideo();
    heroVideoTimer = setTimeout(async () => {
      try {
        const key = await fetchTrailerKey(item);
        if (!key) return;

        // YouTube muted autoplay
        const src =
          `https://www.youtube.com/embed/${key}` +
          `?autoplay=1&mute=1&controls=0&rel=0&playsinline=1&modestbranding=1` +
          `&loop=1&playlist=${key}`;

        heroVideoFrame.src = src;
        heroVideoWrap.classList.add('is-show');
      } catch (_) {
        // 실패 시 이미지만 유지
      }
    }, 3000);
  }

  async function init() {
    try {
      const results = await Promise.all(
        SECTIONS.map(s => fetchList(s.endpoint, s.typeHint).catch(() => []))
      );

      SECTIONS.forEach((s, idx) => {
        DATA[s.key] = results[idx] || [];
        renderRow(s.key);
        bindRailInteractions(s.key);
      });

      const heroPool = [
        ...(DATA.new_trending || []),
        ...(DATA.popular || []),
        ...(DATA.now_playing || []),
      ];
      const picked = pickRandom(heroPool) || DATA.now_playing?.[0];
      if (picked) setHero(picked);

    } catch (e) {
      console.error(e);
      heroTitle.textContent = '로드 실패';
      heroDesc.textContent = 'TMDB 데이터를 불러오지 못했습니다. Live Server로 실행해보세요.';
      heroYear.textContent = '—';
      heroType.textContent = '—';
      heroRating.textContent = '★ —';
      resetHeroVideo();
    }
  }

  init();
})();
