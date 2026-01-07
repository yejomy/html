/* =========================================================
   부산 맛집 정보 서비스 (공공데이터포털 FoodService + 카카오맵)
   - endpoint: https://apis.data.go.kr/6260000/FoodService/getFoodKr
   - 필요한 키:
     1) DATA_GO_KR_SERVICE_KEY (Encoding Key 권장)
     2) 카카오맵 JavaScript Key (index.html script appkey)
   ========================================================= */

const CONFIG = {
  BASE_URL: "https://apis.data.go.kr/6260000/FoodService/getFoodKr",
  DATA_GO_KR_SERVICE_KEY: "4959a756bf930cb1697928ba6d8411905df289e01eab2bd2b8b9f207caa528f5", // 🔴 여기에 입력
  PAGE_SIZE: 10,
  DEFAULT_CENTER: { lat: 35.1796, lng: 129.0756 }, // 부산 시청 근처
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

// State
let pageNo = 1;
let totalCount = null;
let rawItems = [];
let filteredItems = [];
let selectedId = null;

// Kakao map
let map = null;
let marker = null;

// ---------- Utilities ----------
function setStatus(msg) {
  $status.textContent = msg || "";
}

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

function normalizeItem(it) {
  // 공공데이터에서 흔히 쓰는 키들을 최대한 흡수
  const id = pickFirst(it, ["UC_SEQ", "uc_seq", "ID", "id"], String(Math.random()));
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

  return {
    id, title, gugun, addr, tel, homepage, menu, hours, desc, img, thumb,
    lat: Number.isFinite(lat) ? lat : null,
    lng: Number.isFinite(lng) ? lng : null,
    __raw: it
  };
}

function buildUrl({ pageNo, numOfRows, resultType = "json" }) {
  const url = new URL(CONFIG.BASE_URL);
  url.searchParams.set("serviceKey", CONFIG.DATA_GO_KR_SERVICE_KEY);
  url.searchParams.set("pageNo", String(pageNo));
  url.searchParams.set("numOfRows", String(numOfRows));
  url.searchParams.set("resultType", resultType);
  return url.toString();
}

// ---------- Data Fetch ----------
async function fetchPage(nextPageNo) {
  if (!CONFIG.DATA_GO_KR_SERVICE_KEY || CONFIG.DATA_GO_KR_SERVICE_KEY.startsWith("YOUR_")) {
    throw new Error("DATA_GO_KR_SERVICE_KEY를 app.js에 입력해 주세요.");
  }

  const endpoint = buildUrl({
    pageNo: nextPageNo,
    numOfRows: CONFIG.PAGE_SIZE,
    resultType: "json",
  });

  // NOTE: 일부 환경에서 CORS/Mixed content 이슈가 날 수 있습니다.
  // - 가능하면 https로 호출
  // - 로컬 개발 시 프록시(예: Vite/webpack devServer)로 우회 권장
  const res = await fetch(endpoint);
  if (!res.ok) throw new Error(`API 요청 실패: ${res.status}`);

  const data = await res.json();

  // 응답 구조는 환경/버전에 따라 조금 다를 수 있어 방어적으로 처리
  // 보통: data.getFoodKr.item / data.getFoodKr.items / data.response.body.items.item 등
  let items = [];
  let tc = null;

  if (data?.getFoodKr) {
    tc = Number(data.getFoodKr.totalCount ?? data.getFoodKr.totalCnt ?? null);
    items =
      data.getFoodKr.item ||
      data.getFoodKr.items ||
      data.getFoodKr.body?.items?.item ||
      [];
  } else if (data?.response?.body) {
    tc = Number(data.response.body.totalCount ?? null);
    items = data.response.body.items?.item ?? [];
  }

  if (!Array.isArray(items)) items = [items].filter(Boolean);

  return { items, totalCount: Number.isFinite(tc) ? tc : null, raw: data };
}

// ---------- Render ----------
function renderList() {
  $list.innerHTML = "";

  const q = ($q.value || "").trim().toLowerCase();
  filteredItems = !q
    ? rawItems
    : rawItems.filter((it) => {
        const hay = `${it.title} ${it.menu} ${it.gugun} ${it.addr}`.toLowerCase();
        return hay.includes(q);
      });

  $countText.textContent =
    totalCount !== null ? `표시 ${filteredItems.length} / 전체 ${totalCount}` : `표시 ${filteredItems.length}`;

  if (filteredItems.length === 0) {
    $list.innerHTML = `<div style="padding:12px;color:var(--muted);font-size:13px;">검색 결과가 없습니다.</div>`;
    return;
  }

  for (const it of filteredItems) {
    const el = document.createElement("div");
    el.className = `card ${String(it.id) === String(selectedId) ? "card--active" : ""}`;
    el.setAttribute("role", "listitem");
    el.dataset.id = it.id;

    const thumbHtml = it.thumb
      ? `<img src="${escapeHtml(it.thumb)}" alt="${escapeHtml(it.title)}" loading="lazy" />`
      : `<span>${escapeHtml(it.title).slice(0, 1)}</span>`;

    const badges = [
      it.gugun ? `<span class="badge badge--cyan">${escapeHtml(it.gugun)}</span>` : "",
      it.menu ? `<span class="badge badge--magenta">${escapeHtml(it.menu).slice(0, 18)}${it.menu.length > 18 ? "…" : ""}</span>` : "",
    ].filter(Boolean).join("");

    el.innerHTML = `
      <div class="thumb">${thumbHtml}</div>
      <div class="card__body">
        <div class="card__title">${escapeHtml(it.title)}</div>
        <div class="card__meta">${escapeHtml(it.addr || "주소 정보 없음")}</div>
        <div class="badges">${badges}</div>
      </div>
    `;

    el.addEventListener("click", () => {
      selectedId = it.id;
      renderList();
      renderDetail(it);
      moveMapTo(it);
    });

    $list.appendChild(el);
  }
}

function renderDetail(it) {
  if (!it) return;

  const imgHtml = it.img
    ? `<img src="${escapeHtml(it.img)}" alt="${escapeHtml(it.title)}" loading="lazy" />`
    : "";

  const homepageHtml = it.homepage
    ? `<a class="link" href="${escapeHtml(it.homepage)}" target="_blank" rel="noreferrer">공식 홈페이지</a>`
    : `<span style="color:var(--muted);font-size:13px;">공식 홈페이지 없음</span>`;

  $detail.classList.remove("detail--empty");
  $detail.innerHTML = `
    <div class="hero">
      <div class="hero__img">${imgHtml}</div>
      <div>
        <div class="hero__title">${escapeHtml(it.title)}</div>
        <div class="hero__addr">${escapeHtml(it.addr || "주소 정보 없음")}</div>

        <div class="kv">
          <div class="kv__k">대표메뉴</div>
          <div class="kv__v">${escapeHtml(it.menu || "정보 없음")}</div>
        </div>
        <div class="kv">
          <div class="kv__k">문의</div>
          <div class="kv__v">${escapeHtml(it.tel || "정보 없음")}</div>
        </div>
        <div class="kv">
          <div class="kv__k">운영시간</div>
          <div class="kv__v">${escapeHtml(it.hours || "정보 없음")}</div>
        </div>
        <div class="kv">
          <div class="kv__k">홈페이지</div>
          <div class="kv__v">${homepageHtml}</div>
        </div>
      </div>
    </div>

    <div class="desc">
      ${escapeHtml(it.desc || "소개 정보가 없습니다.")}
    </div>
  `;

  $mapHint.textContent = it.lat && it.lng
    ? `위치: ${it.lat.toFixed(5)}, ${it.lng.toFixed(5)}`
    : `좌표 정보가 없어 기본 위치(부산)로 표시합니다.`;
}

// ---------- Kakao Map ----------
function initKakaoMap() {
  return new Promise((resolve, reject) => {
    if (!window.kakao || !window.kakao.maps) {
      reject(new Error("카카오맵 SDK를 불러오지 못했습니다. index.html의 appkey를 확인하세요."));
      return;
    }
    kakao.maps.load(() => {
      const container = document.getElementById("map");
      const options = {
        center: new kakao.maps.LatLng(CONFIG.DEFAULT_CENTER.lat, CONFIG.DEFAULT_CENTER.lng),
        level: 6,
      };
      map = new kakao.maps.Map(container, options);

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

// ---------- App Flow ----------
async function loadFirstPage() {
  pageNo = 1;
  totalCount = null;
  rawItems = [];
  filteredItems = [];
  selectedId = null;

  $detail.classList.add("detail--empty");
  $detail.innerHTML = `
    <div class="empty">
      <div class="empty__icon">🍜</div>
      <div class="empty__title">맛집을 선택해 주세요</div>
      <div class="empty__desc">왼쪽 목록에서 항목을 클릭하면 상세 정보와 지도가 표시됩니다.</div>
    </div>
  `;

  setStatus("불러오는 중…");

  const { items, totalCount: tc } = await fetchPage(pageNo);
  totalCount = tc;

  rawItems = items.map(normalizeItem);
  renderList();

  setStatus("");
}

async function loadMore() {
  // totalCount를 모르면 그냥 계속 더 가져오고, 알면 초과 시 중단
  if (totalCount !== null && rawItems.length >= totalCount) {
    setStatus("더 이상 불러올 데이터가 없습니다.");
    return;
  }

  setStatus("추가 로딩…");
  const next = pageNo + 1;

  const { items, totalCount: tc } = await fetchPage(next);
  if (totalCount === null) totalCount = tc;

  const nextItems = items.map(normalizeItem);
  rawItems = rawItems.concat(nextItems);
  pageNo = next;

  renderList();
  setStatus("");
}

// ---------- Events ----------
$q.addEventListener("input", () => {
  renderList();
});

$btnMore.addEventListener("click", async () => {
  try {
    await loadMore();
  } catch (e) {
    console.error(e);
    setStatus(e.message || "추가 로딩 실패");
  }
});

$btnReload.addEventListener("click", async () => {
  try {
    await loadFirstPage();
  } catch (e) {
    console.error(e);
    setStatus(e.message || "로딩 실패");
  }
});

$btnClear.addEventListener("click", () => {
  $q.value = "";
  renderList();
});

// ---------- Boot ----------
(async function boot() {
  try {
    await initKakaoMap();
    await loadFirstPage();
  } catch (e) {
    console.error(e);
    setStatus(e.message || "초기화 실패");
  }
})();
