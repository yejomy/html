const CONFIG = {
  BASE_URL: "https://apis.data.go.kr/6260000/FoodService/getFoodKr",
  DATA_GO_KR_SERVICE_KEY: "4959a756bf930cb1697928ba6d8411905df289e01eab2bd2b8b9f207caa528f5",
  PAGE_SIZE: 10,

  DEFAULT_CENTER: { lat: 35.1796, lng: 129.0756 },
  NEARBY_TOP_N: 6,
  NEARBY_MAX_KM: 6,
  GOOD_TOP_RATIO: 0.25,

  FAV_STORAGE_KEY: "busan_food_favorites_v1",
};

// DOM
const $list = document.getElementById("list");
const $detail = document.getElementById("detail");
const $q = document.getElementById("q");
const $btnMore = document.getElementById("btnMore");
const $btnReload = document.getElementById("btnReload");
const $btnClear = document.getElementById("btnClear");
const $status = document.getElementById("status");
const $countText = document.getElementById("countText");
const $mapHint = document.getElementById("mapHint");

const $btnMyLoc = document.getElementById("btnMyLoc");
const $nearbyMeta = document.getElementById("nearbyMeta");
const $nearbyList = document.getElementById("nearbyList");

const $tabAll = document.getElementById("tabAll");
const $tabGood = document.getElementById("tabGood");
const $tabFav = document.getElementById("tabFav");

const $btnFavShowOnMap = document.getElementById("btnFavShowOnMap");

// State
let pageNo = 1;
let totalCount = null;

let rawItems = [];
let viewItems = [];
let selectedId = null;

let activeTab = "all"; // all | good | fav

let myPos = null;
let nearbyItems = [];

// favorites: Set of ids
let favoriteIds = new Set();
let showFavMarkers = true;

// Kakao map
let map = null;
let marker = null;               // selected marker(기존)
let favoriteMarkers = new Map(); // id -> kakao.maps.Marker

// ---------------- utils
function setStatus(msg) { $status.textContent = msg || ""; }

function escapeHtml(str) {
  return String(str ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function pickFirst(obj, keys, fallback = "") {
  for (const k of keys) {
    if (obj && obj[k] !== undefined && obj[k] !== null && String(obj[k]).trim() !== "") {
      return obj[k];
    }
  }
  return fallback;
}

// Haversine distance (km)
function distanceKm(a, b) {
  const R = 6371;
  const dLat = (b.lat - a.lat) * Math.PI / 180;
  const dLng = (b.lng - a.lng) * Math.PI / 180;
  const lat1 = a.lat * Math.PI / 180;
  const lat2 = b.lat * Math.PI / 180;

  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;

  return 2 * R * Math.asin(Math.sqrt(s));
}

function computeGoodScore(it) {
  const scoreRaw = pickFirst(it.__raw, ["SCORE", "RATING", "STAR", "REVIEW_SCORE", "POINT"], "");
  const scoreNum = Number(scoreRaw);
  if (Number.isFinite(scoreNum) && scoreNum > 0) return scoreNum * 100;

  const text = String(it.desc || "").toLowerCase();
  let score = 0;
  score += Math.min(text.length, 1200) / 12;
  const keywords = ["인기", "추천", "유명", "맛집", "베스트", "대표", "시그니처", "단골", "명물", "별미"];
  for (const kw of keywords) if (text.includes(kw)) score += 8;
  if (it.img) score += 6;
  if (it.menu) score += 4;
  return score;
}

function normalizeItem(it) {
  const id = String(pickFirst(it, ["UC_SEQ", "uc_seq", "ID", "id"], Math.random()));
  const title = pickFirst(it, ["MAIN_TITLE", "main_title", "TITLE", "title"], "이름 없음");
  const gugun = pickFirst(it, ["GUGUN_NM", "gugun_nm", "GUGUN", "gugun"], "");
  const addr = pickFirst(it, ["ADDR1", "ADDR", "address", "ADDR2"], "");
  const tel = pickFirst(it, ["CNTCT_TEL", "TEL", "tel"], "");
  const homepage = pickFirst(it, ["HOMEPAGE_URL", "HOMEPAGE", "homepage"], "");
  const menu = pickFirst(it, ["RPRSNTV_MENU", "MENU", "menu"], "");
  const hours = pickFirst(it, ["USAGE_DAY_WEEK_AND_TIME", "OPERATING_HOURS", "hours"], "");
  const desc = pickFirst(it, ["ITEMCNTNTS", "DESC", "contents", "CONTENT"], "");
  const img = pickFirst(it, ["MAIN_IMG_NORMAL", "MAIN_IMG", "IMG_URL", "img"], "");
  const thumb = pickFirst(it, ["MAIN_IMG_THUMB", "THUMB", "thumb"], img);

  const lat = Number(pickFirst(it, ["LAT", "lat", "Y", "y"], ""));
  const lng = Number(pickFirst(it, ["LNG", "lng", "X", "x"], ""));

  const normalized = {
    id, title, gugun, addr, tel, homepage, menu, hours, desc, img, thumb,
    lat: Number.isFinite(lat) ? lat : null,
    lng: Number.isFinite(lng) ? lng : null,
    __raw: it
  };
  normalized.goodScore = computeGoodScore(normalized);
  return normalized;
}

function buildUrl({ pageNo, numOfRows, resultType = "json" }) {
  const url = new URL(CONFIG.BASE_URL);
  url.searchParams.set("serviceKey", CONFIG.DATA_GO_KR_SERVICE_KEY);
  url.searchParams.set("pageNo", String(pageNo));
  url.searchParams.set("numOfRows", String(numOfRows));
  url.searchParams.set("resultType", resultType);
  return url.toString();
}

// ---------------- favorites (localStorage)
function loadFavorites() {
  try {
    const raw = localStorage.getItem(CONFIG.FAV_STORAGE_KEY);
    if (!raw) return;
    const arr = JSON.parse(raw);
    if (Array.isArray(arr)) favoriteIds = new Set(arr.map(String));
  } catch (_) { /* ignore */ }
}

function saveFavorites() {
  try {
    localStorage.setItem(CONFIG.FAV_STORAGE_KEY, JSON.stringify([...favoriteIds]));
  } catch (_) { /* ignore */ }
}

function isFav(id) {
  return favoriteIds.has(String(id));
}

function toggleFav(id) {
  const sid = String(id);
  if (favoriteIds.has(sid)) favoriteIds.delete(sid);
  else favoriteIds.add(sid);
  saveFavorites();

  // 탭이 즐겨찾기면 리스트 갱신(없어진 항목 즉시 제거)
  renderList();

  // 즐겨찾기 마커 동기화
  syncFavoriteMarkers();
}

// ---------------- API
async function fetchPage(nextPageNo) {
  if (!CONFIG.DATA_GO_KR_SERVICE_KEY || CONFIG.DATA_GO_KR_SERVICE_KEY.startsWith("YOUR_")) {
    throw new Error("DATA_GO_KR_SERVICE_KEY를 app.js에 입력해 주세요.");
  }

  const endpoint = buildUrl({ pageNo: nextPageNo, numOfRows: CONFIG.PAGE_SIZE, resultType: "json" });
  const res = await fetch(endpoint);
  if (!res.ok) throw new Error(`API 요청 실패: ${res.status}`);
  const data = await res.json();

  let items = [];
  let tc = null;

  if (data?.getFoodKr) {
    tc = Number(data.getFoodKr.totalCount ?? data.getFoodKr.totalCnt ?? null);
    items = data.getFoodKr.item || data.getFoodKr.items || data.getFoodKr.body?.items?.item || [];
  } else if (data?.response?.body) {
    tc = Number(data.response.body.totalCount ?? null);
    items = data.response.body.items?.item ?? [];
  }

  if (!Array.isArray(items)) items = [items].filter(Boolean);
  return { items, totalCount: Number.isFinite(tc) ? tc : null };
}

// ---------------- Tabs
function setActiveTab(tab) {
  activeTab = tab;

  $tabAll.classList.toggle("tab--active", tab === "all");
  $tabAll.setAttribute("aria-selected", tab === "all" ? "true" : "false");

  $tabGood.classList.toggle("tab--active", tab === "good");
  $tabGood.setAttribute("aria-selected", tab === "good" ? "true" : "false");

  $tabFav.classList.toggle("tab--active", tab === "fav");
  $tabFav.setAttribute("aria-selected", tab === "fav" ? "true" : "false");

  renderList();
}

// ---------------- Nearby
function renderNearby() {
  $nearbyList.innerHTML = "";

  if (!myPos) {
    $nearbyMeta.textContent = "위치 권한을 허용하면 가까운 맛집을 보여줘요.";
    return;
  }
  if (nearbyItems.length === 0) {
    $nearbyMeta.textContent = "근처에 표시할 맛집이 없어요(좌표 데이터/거리 제한 확인).";
    return;
  }

  $nearbyMeta.textContent = `내 위치 기준 ${CONFIG.NEARBY_MAX_KM}km 이내 TOP ${Math.min(CONFIG.NEARBY_TOP_N, nearbyItems.length)} 추천`;

  for (const it of nearbyItems.slice(0, CONFIG.NEARBY_TOP_N)) {
    const el = document.createElement("div");
    el.className = "pill";
    const km = it.__distanceKm;

    el.innerHTML = `
      <div class="pill__t">${escapeHtml(it.title)}</div>
      <div class="pill__m">${escapeHtml(it.addr || "주소 정보 없음")}</div>
      <div class="pill__b">
        ${it.gugun ? `<span class="chip chip--cyan">${escapeHtml(it.gugun)}</span>` : ""}
        <span class="chip chip--magenta">${Number.isFinite(km) ? `${km.toFixed(1)}km` : "-"}</span>
      </div>
    `;

    el.addEventListener("click", () => selectItem(it.id));
    $nearbyList.appendChild(el);
  }
}

function recomputeNearby() {
  if (!myPos) return;

  nearbyItems = rawItems
    .filter((it) => it.lat && it.lng)
    .map((it) => ({ ...it, __distanceKm: distanceKm(myPos, { lat: it.lat, lng: it.lng }) }))
    .filter((it) => it.__distanceKm <= CONFIG.NEARBY_MAX_KM)
    .sort((a, b) => a.__distanceKm - b.__distanceKm);

  renderNearby();
}

function requestMyLocation() {
  if (!navigator.geolocation) {
    setStatus("이 브라우저는 위치 기능을 지원하지 않습니다.");
    return;
  }

  setStatus("내 위치 확인 중…");
  navigator.geolocation.getCurrentPosition(
    (pos) => {
      myPos = { lat: pos.coords.latitude, lng: pos.coords.longitude };
      setStatus("");
      recomputeNearby();

      if (map && marker) {
        const p = new kakao.maps.LatLng(myPos.lat, myPos.lng);
        map.setCenter(p);
        marker.setPosition(p);
        $mapHint.textContent = `내 위치: ${myPos.lat.toFixed(5)}, ${myPos.lng.toFixed(5)}`;
      }
    },
    () => setStatus("위치 권한이 거부되었거나 위치를 가져오지 못했습니다."),
    { enableHighAccuracy: true, timeout: 8000, maximumAge: 30000 }
  );
}

// ---------------- list filtering
function applyFilters() {
  const q = ($q.value || "").trim().toLowerCase();
  let items = rawItems;

  if (q) {
    items = items.filter((it) => {
      const hay = `${it.title} ${it.menu} ${it.gugun} ${it.addr}`.toLowerCase();
      return hay.includes(q);
    });
  }

  if (activeTab === "good") {
    const sorted = [...items].sort((a, b) => b.goodScore - a.goodScore);
    const take = Math.max(1, Math.floor(sorted.length * CONFIG.GOOD_TOP_RATIO));
    items = sorted.slice(0, take);
  } else if (activeTab === "fav") {
    items = items.filter((it) => isFav(it.id));
  }

  viewItems = items;
}

function renderList() {
  applyFilters();
  $list.innerHTML = "";

  const tabName = activeTab === "all" ? "전체" : activeTab === "good" ? "후기평 좋은곳" : "즐겨찾기";
  const favCount = favoriteIds.size;

  $countText.textContent =
    totalCount !== null
      ? `표시 ${viewItems.length} / 전체 ${totalCount} · 탭: ${tabName} · 즐겨찾기 ${favCount}`
      : `표시 ${viewItems.length} · 탭: ${tabName} · 즐겨찾기 ${favCount}`;

  if (viewItems.length === 0) {
    $list.innerHTML = `<div style="padding:12px;color:var(--muted);font-size:13px;">결과가 없습니다.</div>`;
    return;
  }

  for (const it of viewItems) {
    const el = document.createElement("div");
    el.className = `card ${String(it.id) === String(selectedId) ? "card--active" : ""}`;
    el.setAttribute("role", "listitem");
    el.dataset.id = it.id;

    const thumbHtml = it.thumb
      ? `<img src="${escapeHtml(it.thumb)}" alt="${escapeHtml(it.title)}" loading="lazy" />`
      : `<span>${escapeHtml(it.title).slice(0, 1)}</span>`;

    const badgeMenu = it.menu
      ? `<span class="badge badge--magenta">${escapeHtml(it.menu).slice(0, 18)}${it.menu.length > 18 ? "…" : ""}</span>`
      : "";
    const badgeGugun = it.gugun ? `<span class="badge badge--cyan">${escapeHtml(it.gugun)}</span>` : "";
    const badgeScore = activeTab === "good" ? `<span class="badge">추천지수 ${Math.round(it.goodScore)}</span>` : "";

    const favOn = isFav(it.id);
    const favBtnClass = favOn ? "favBtn favBtn--on" : "favBtn";

    el.innerHTML = `
      <div class="thumb">${thumbHtml}</div>
      <div class="card__body">
        <div class="card__topRow">
          <div class="card__title">${escapeHtml(it.title)}</div>
          <button class="${favBtnClass}" type="button" aria-label="즐겨찾기">
            <span class="favBtn__icon">${favOn ? "❤️" : "🤍"}</span>
          </button>
        </div>
        <div class="card__meta">${escapeHtml(it.addr || "주소 정보 없음")}</div>
        <div class="badges">${badgeGugun}${badgeMenu}${badgeScore}</div>
      </div>
    `;

    // 카드 클릭 -> 상세
    el.addEventListener("click", (e) => {
      // 하트 버튼 누른 경우는 상세 이동 막고 즐겨찾기만 토글
      if (e.target.closest(".favBtn")) return;
      selectItem(it.id);
    });

    // 하트 버튼 클릭
    el.querySelector(".favBtn").addEventListener("click", (e) => {
      e.stopPropagation();
      toggleFav(it.id);
      // 리스트 안에서 즉시 아이콘만 바꾸고 싶으면 renderList() 대신 조작해도 되지만, 여기선 단순하게 갱신
    });

    $list.appendChild(el);
  }
}

// ---------------- selection helper (리스트/지도/상세 연동)
function findItemById(id) {
  const sid = String(id);
  return rawItems.find((x) => String(x.id) === sid) || null;
}

function selectItem(id) {
  const it = findItemById(id);
  if (!it) return;

  selectedId = it.id;
  renderList();
  renderDetail(it);
  moveMapTo(it);

  // 선택 항목이 리스트에 있으면 스크롤로 보이게
  const node = $list.querySelector(`[data-id="${CSS.escape(String(it.id))}"]`);
  if (node) node.scrollIntoView({ block: "nearest", behavior: "smooth" });
}

// ---------------- detail
function renderDetail(it) {
  const imgHtml = it.img ? `<img src="${escapeHtml(it.img)}" alt="${escapeHtml(it.title)}" loading="lazy" />` : "";
  const homepageHtml = it.homepage
    ? `<a class="link" href="${escapeHtml(it.homepage)}" target="_blank" rel="noreferrer">공식 홈페이지</a>`
    : `<span style="color:var(--muted);font-size:13px;">공식 홈페이지 없음</span>`;

  const distHtml = (myPos && it.lat && it.lng)
    ? `<span class="scoreTag">내 위치에서 ${distanceKm(myPos, {lat: it.lat, lng: it.lng}).toFixed(1)}km</span>`
    : "";

  $detail.classList.remove("detail--empty");
  $detail.innerHTML = `
    <div class="hero">
      <div class="hero__img">${imgHtml}</div>
      <div>
        <div class="hero__title">${escapeHtml(it.title)}</div>
        <div class="hero__addr">${escapeHtml(it.addr || "주소 정보 없음")}</div>

        <div class="scoreBox">
          <span class="scoreTag">추천지수 ${Math.round(it.goodScore)}</span>
          ${distHtml}
          <span class="scoreTag">${isFav(it.id) ? "즐겨찾기 ★" : "즐겨찾기 없음"}</span>
        </div>

        <div class="kv"><div class="kv__k">대표메뉴</div><div class="kv__v">${escapeHtml(it.menu || "정보 없음")}</div></div>
        <div class="kv"><div class="kv__k">문의</div><div class="kv__v">${escapeHtml(it.tel || "정보 없음")}</div></div>
        <div class="kv"><div class="kv__k">운영시간</div><div class="kv__v">${escapeHtml(it.hours || "정보 없음")}</div></div>
        <div class="kv"><div class="kv__k">홈페이지</div><div class="kv__v">${homepageHtml}</div></div>
      </div>
    </div>

    <div class="desc">${escapeHtml(it.desc || "소개 정보가 없습니다.")}</div>
  `;

  $mapHint.textContent = it.lat && it.lng
    ? `위치: ${it.lat.toFixed(5)}, ${it.lng.toFixed(5)}`
    : `좌표 정보가 없어 기본 위치(부산)로 표시합니다.`;
}

// ---------------- Kakao map
function initKakaoMap() {
  return new Promise((resolve, reject) => {
    if (!window.kakao || !window.kakao.maps) {
      reject(new Error("카카오맵 SDK를 불러오지 못했습니다. index.html의 appkey를 확인하세요."));
      return;
    }
    kakao.maps.load(() => {
      const container = document.getElementById("map");
      map = new kakao.maps.Map(container, {
        center: new kakao.maps.LatLng(CONFIG.DEFAULT_CENTER.lat, CONFIG.DEFAULT_CENTER.lng),
        level: 6,
      });

      // 선택 마커
      marker = new kakao.maps.Marker({
        position: new kakao.maps.LatLng(CONFIG.DEFAULT_CENTER.lat, CONFIG.DEFAULT_CENTER.lng),
      });
      marker.setMap(map);

      resolve();
    });
  });
}

function moveMapTo(it) {
  if (!map || !marker) return;
  const lat = it.lat ?? CONFIG.DEFAULT_CENTER.lat;
  const lng = it.lng ?? CONFIG.DEFAULT_CENTER.lng;
  const pos = new kakao.maps.LatLng(lat, lng);
  map.setCenter(pos);
  marker.setPosition(pos);
}

// ---------------- favorites markers (지도 표시)
function clearFavoriteMarkers() {
  for (const [, mk] of favoriteMarkers) mk.setMap(null);
  favoriteMarkers.clear();
}

function syncFavoriteMarkers() {
  if (!map) return;

  // 표시 OFF면 다 지움
  if (!showFavMarkers) {
    clearFavoriteMarkers();
    return;
  }

  // 현재 rawItems 중 즐겨찾기인 것(좌표 있는 것)만 표시
  const favItems = rawItems.filter((it) => isFav(it.id) && it.lat && it.lng);

  // 1) 없어졌거나 즐겨찾기 해제된 마커 제거
  for (const [id, mk] of favoriteMarkers) {
    const still = favItems.some((it) => String(it.id) === String(id));
    if (!still) {
      mk.setMap(null);
      favoriteMarkers.delete(id);
    }
  }

  // 2) 새로 생긴 즐겨찾기 마커 추가
  for (const it of favItems) {
    if (favoriteMarkers.has(it.id)) continue;

    const mk = new kakao.maps.Marker({
      position: new kakao.maps.LatLng(it.lat, it.lng),
      // 기본 마커 사용(원하면 이미지마커로 커스텀 가능)
    });

    mk.setMap(map);

    // 마커 클릭하면 상세/리스트 연동
    kakao.maps.event.addListener(mk, "click", () => {
      selectItem(it.id);
    });

    favoriteMarkers.set(it.id, mk);
  }
}

// 즐겨찾기 마커 전체가 보이도록 지도 범위 맞추기
function fitMapToFavoriteMarkers() {
  if (!map) return;
  const items = rawItems.filter((it) => isFav(it.id) && it.lat && it.lng);
  if (items.length === 0) {
    setStatus("즐겨찾기(좌표 포함) 항목이 없습니다.");
    return;
  }

  const bounds = new kakao.maps.LatLngBounds();
  for (const it of items) bounds.extend(new kakao.maps.LatLng(it.lat, it.lng));
  map.setBounds(bounds);
}

// ---------------- App flow
async function loadFirstPage() {
  pageNo = 1;
  totalCount = null;
  rawItems = [];
  viewItems = [];
  selectedId = null;

  setStatus("불러오는 중…");
  const { items, totalCount: tc } = await fetchPage(pageNo);
  totalCount = tc;
  rawItems = items.map(normalizeItem);

  if (myPos) recomputeNearby();
  renderList();

  // 즐겨찾기 마커 동기화
  syncFavoriteMarkers();

  setStatus("");
}

async function loadMore() {
  if (totalCount !== null && rawItems.length >= totalCount) {
    setStatus("더 이상 불러올 데이터가 없습니다.");
    return;
  }

  setStatus("추가 로딩…");
  const next = pageNo + 1;
  const { items, totalCount: tc } = await fetchPage(next);
  if (totalCount === null) totalCount = tc;

  rawItems = rawItems.concat(items.map(normalizeItem));
  pageNo = next;

  if (myPos) recomputeNearby();
  renderList();

  // 즐겨찾기 마커 동기화
  syncFavoriteMarkers();

  setStatus("");
}

// ---------------- Events
$q.addEventListener("input", () => renderList());
$btnMore.addEventListener("click", () => loadMore().catch(e => setStatus(e.message || "추가 로딩 실패")));
$btnReload.addEventListener("click", () => loadFirstPage().catch(e => setStatus(e.message || "로딩 실패")));
$btnClear.addEventListener("click", () => { $q.value = ""; renderList(); });

$btnMyLoc.addEventListener("click", () => requestMyLocation());
$tabAll.addEventListener("click", () => setActiveTab("all"));
$tabGood.addEventListener("click", () => setActiveTab("good"));
$tabFav.addEventListener("click", () => setActiveTab("fav"));

// 즐겨찾기 지도 표시 토글 + 범위 맞추기
$btnFavShowOnMap.addEventListener("click", () => {
  showFavMarkers = !showFavMarkers;
  $btnFavShowOnMap.textContent = showFavMarkers ? "즐겨찾기 지도표시" : "즐겨찾기 숨김";
  syncFavoriteMarkers();
  if (showFavMarkers) fitMapToFavoriteMarkers();
});

// ---------------- Boot
(async function boot() {
  try {
    loadFavorites();
    await initKakaoMap();
    await loadFirstPage();
    renderNearby();
  } catch (e) {
    console.error(e);
    setStatus(e.message || "초기화 실패");
  }
})();
