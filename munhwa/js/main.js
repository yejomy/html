/****************************************************
 * ✅ 여기만 내키
 ****************************************************/
const TOUR_SERVICE_KEY = "4959a756bf930cb1697928ba6d8411905df289e01eab2bd2b8b9f207caa528f5";


// ---- Config ----
const HERITAGE_WMS = {
  base: "https://gis-heritage.go.kr/checkKey.do",
  domainParamName: "domain",
  domainValue: "https://gis-heritage.go.kr/",
  service: "WMS",
  version: "1.3.0",
  request: "GetMap",
  layers: "TB_MUSQ_MID",
  styles: "default",
  format: "image/png",
  crs: "EPSG:9020203",
  exceptions: "INIMAGE",
};

const TOUR = {
  base: "https://apis.data.go.kr/B551011/KorService2",
  ops: {
    location: "/locationBasedList1",
    areaBased: "/areaBasedList1",
    searchKeyword: "/searchKeyword1", // ✅ 추천 백업용
    detailCommon: "/detailCommon1",
    detailIntro: "/detailIntro1",
    detailInfo: "/detailInfo1",
  }
};

// ---- DOM helpers ----
const $ = (id) => document.getElementById(id);
const debug = (msg) => { $("debug").textContent = msg; };

const escapeHtml = (s) => String(s ?? "")
  .replaceAll("&","&amp;")
  .replaceAll("<","&lt;")
  .replaceAll(">","&gt;")
  .replaceAll('"',"&quot;")
  .replaceAll("'","&#039;");

function stripTags(html){
  return String(html || "").replace(/<[^>]*>/g, " ").replace(/\s+/g," ").trim();
}

// ---- Proj defs ----
const PROJ_UTMK = "+proj=tmerc +lat_0=38 +lon_0=127.5 +k=0.9996 +x_0=1000000 +y_0=2000000 +ellps=GRS80 +units=m +no_defs";
proj4.defs("EPSG:9020203", PROJ_UTMK);
proj4.defs("EPSG:4326", "+proj=longlat +datum=WGS84 +no_defs");

// ---- State ----
const state = {
  map: null,
  info: null,
  wmsOn: true,
  wmsImg: null,
  currentPos: { lat: 37.5665, lng: 126.9780 },

  markers: [],
  items: [],
  selected: null,

  course: [],
  polyline: null,

  wmsTimer: null,
};

// ---- Chips ----
function bindChips(){
  document.querySelectorAll('.chip[data-key="ctype"]').forEach(chip => {
    chip.addEventListener("click", () => {
      chip.dataset.on = (chip.dataset.on === "1") ? "0" : "1";
    });
  });
}
function getSelectedContentTypes(){
  const selected = [];
  document.querySelectorAll('.chip[data-key="ctype"]').forEach(chip => {
    if(chip.dataset.on === "1") selected.push(chip.dataset.value);
  });
  return selected.length ? selected : ["12","14"];
}

// ---- Region (MVP 박스) ----
function inRegion(lat, lng, region){
  if(region === "ALL") return true;

  if(region === "SEOUL") return lat >= 37.41 && lat <= 37.72 && lng >= 126.76 && lng <= 127.18;
  if(region === "JEJU") return lat >= 33.05 && lat <= 33.60 && lng >= 126.10 && lng <= 126.95;

  if(region === "CHUNGCHEONG") return lat >= 36.0 && lat <= 37.2 && lng >= 126.8 && lng <= 128.6;
  if(region === "JEOLLA") return lat >= 34.4 && lat <= 36.2 && lng >= 125.8 && lng <= 127.9;
  if(region === "GYEONGSANG") return lat >= 34.6 && lat <= 36.7 && lng >= 127.7 && lng <= 129.6;

  if(region === "GG_NORTH") return lat >= 37.45 && lat <= 38.30 && lng >= 126.70 && lng <= 127.75;
  if(region === "GG_WEST")  return lat >= 36.80 && lat <= 37.75 && lng >= 126.20 && lng <= 127.10;
  if(region === "GG_SOUTH") return lat >= 36.70 && lat <= 37.55 && lng >= 126.70 && lng <= 127.80;

  return true;
}

// ---- Fetch helpers ----
function baseParams(){
  return {
    serviceKey: TOUR_SERVICE_KEY,
    MobileOS: "ETC",
    MobileApp: "HeritageTripMVP",
    _type: "json",
  };
}
function buildUrl(opPath, params){
  const u = new URL(TOUR.base + opPath);
  Object.entries(params).forEach(([k,v]) => u.searchParams.set(k, String(v)));
  return u.toString();
}
async function fetchJson(url){
  const res = await fetch(url);
  if(!res.ok) throw new Error(`HTTP ${res.status}`);
  return await res.json();
}
function normalizeItems(json){
  const items = json?.response?.body?.items?.item ?? [];
  return Array.isArray(items) ? items : (items ? [items] : []);
}

// ---- Map init ----
function initMap(){
  const center = new kakao.maps.LatLng(state.currentPos.lat, state.currentPos.lng);
  state.map = new kakao.maps.Map($("map"), { center, level: 7 });
  state.info = new kakao.maps.InfoWindow({ removable: true });
  state.wmsImg = $("wmsOverlay");

  kakao.maps.event.addListener(state.map, "idle", () => {
    if(!state.wmsOn) return;
    if(state.wmsTimer) clearTimeout(state.wmsTimer);
    state.wmsTimer = setTimeout(() => updateWmsOverlay(), 120);
  });

  updateWmsOverlay();
  debug("지도 준비됨.");
}

// ---- WMS overlay ----
function updateWmsOverlay(){
  if(!state.map || !state.wmsOn) return;

  const bounds = state.map.getBounds();
  const sw = bounds.getSouthWest();
  const ne = bounds.getNorthEast();

  const [swX, swY] = proj4("EPSG:4326", "EPSG:9020203", [sw.getLng(), sw.getLat()]);
  const [neX, neY] = proj4("EPSG:4326", "EPSG:9020203", [ne.getLng(), ne.getLat()]);
  const bbox = `${swX},${swY},${neX},${neY}`;

  const rect = $("map").getBoundingClientRect();
  const width = Math.max(256, Math.floor(rect.width));
  const height = Math.max(256, Math.floor(rect.height));

  const u = new URL(HERITAGE_WMS.base);
  u.searchParams.set(HERITAGE_WMS.domainParamName, HERITAGE_WMS.domainValue);
  u.searchParams.set("service", HERITAGE_WMS.service);
  u.searchParams.set("version", HERITAGE_WMS.version);
  u.searchParams.set("request", HERITAGE_WMS.request);
  u.searchParams.set("LAYERS", HERITAGE_WMS.layers);
  u.searchParams.set("styles", HERITAGE_WMS.styles);
  u.searchParams.set("bBox", bbox);
  u.searchParams.set("width", String(width));
  u.searchParams.set("height", String(height));
  u.searchParams.set("format", HERITAGE_WMS.format);
  u.searchParams.set("crs", HERITAGE_WMS.crs);
  u.searchParams.set("exceptions", HERITAGE_WMS.exceptions);

  state.wmsImg.src = u.toString();
}

// ---- Geolocation (선택) ----
function moveToMyLocation(){
  if(!navigator.geolocation){
    debug("이 브라우저는 위치 권한을 지원하지 않음.");
    return;
  }
  navigator.geolocation.getCurrentPosition(
    (pos) => {
      state.currentPos = { lat: pos.coords.latitude, lng: pos.coords.longitude };
      state.map.setCenter(new kakao.maps.LatLng(state.currentPos.lat, state.currentPos.lng));
      debug(`내 위치로 이동: ${state.currentPos.lat.toFixed(5)}, ${state.currentPos.lng.toFixed(5)}`);
      if(state.wmsOn) updateWmsOverlay();
    },
    (err) => debug(`위치 실패: ${err.message}`),
    { enableHighAccuracy: true, timeout: 8000 }
  );
}

/* -----------------------------
 * ✅ 오늘의 추천 10개 (안 뜨던 문제 해결)
 * - areaBasedList1: numOfRows=40 받아서 랜덤 1개
 * - 실패/빈값이면 searchKeyword1로 백업
 * ----------------------------- */
const AREA_CODES = [
  { code: 1, name: "서울" },
  { code: 6, name: "부산" },
  { code: 4, name: "대구" },
  { code: 2, name: "인천" },
  { code: 5, name: "광주" },
  { code: 3, name: "대전" },
  { code: 7, name: "울산" },
  { code: 31, name: "경기" },
  { code: 34, name: "충남" },
  { code: 39, name: "제주" },
  { code: 38, name: "전남" },
  { code: 36, name: "경남" },
];

function pickRandom(arr, n){
  const copy = [...arr];
  for(let i = copy.length - 1; i > 0; i--){
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy.slice(0, n);
}

async function pickByKeyword(area, ctype){
  const keywords = ["문화유산","박물관","고궁","성곽","유적","전통"];
  const keyword = keywords[Math.floor(Math.random() * keywords.length)];

  const params = {
    ...baseParams(),
    keyword,
    numOfRows: 40,
    pageNo: 1,
    contentTypeId: ctype,
    arrange: "A",
    areaCode: area.code
  };

  try{
    const json = await fetchJson(buildUrl(TOUR.ops.searchKeyword, params));
    const items = normalizeItems(json);
    if(items.length === 0) return null;
    return items[Math.floor(Math.random() * items.length)];
  }catch{
    return null;
  }
}

async function loadTodayPicks(){
  debug("오늘의 추천 불러오는 중...");

  const pickAreas = pickRandom(AREA_CODES, 10);
  const types = ["12","14"]; // 관광지/문화시설 반반

  const results = [];

  for(let i=0; i<pickAreas.length; i++){
    const area = pickAreas[i];
    const ctype = types[i % types.length];

    const params = {
      ...baseParams(),
      areaCode: area.code,
      contentTypeId: ctype,
      numOfRows: 40,  // ✅ 넉넉히 받아서
      pageNo: 1,
      arrange: "A"
    };

    try{
      const json = await fetchJson(buildUrl(TOUR.ops.areaBased, params));
      const items = normalizeItems(json);

      if(items.length > 0){
        const picked = items[Math.floor(Math.random() * items.length)];
        picked._pickAreaName = area.name;
        results.push(picked);
      } else {
        const fallback = await pickByKeyword(area, ctype);
        if(fallback){
          fallback._pickAreaName = area.name;
          results.push(fallback);
        }
      }
    }catch(e){
      const fallback = await pickByKeyword(area, ctype);
      if(fallback){
        fallback._pickAreaName = area.name;
        results.push(fallback);
      } else {
        console.warn("Pick failed:", area.name, e.message);
      }
    }
  }

  renderPicks(results);
  debug(`오늘의 추천 ${results.length}개 불러옴`);
}

function renderPicks(items){
  const el = $("picksList");
  el.innerHTML = "";

  if(items.length === 0){
    el.innerHTML = `<div class="muted">추천을 불러오지 못했어요. (키/호출제한/오퍼레이션 이슈일 수 있음)</div>`;
    return;
  }

  items.forEach((it, idx) => {
    const div = document.createElement("div");
    div.className = "item";
    div.innerHTML = `
      <div class="top">
        <b>${idx+1}. ${escapeHtml(it.title || "(제목없음)")}</b>
        <span class="badge">${escapeHtml(it._pickAreaName || "")}</span>
      </div>
      <div class="muted">${escapeHtml(it.addr1 || "")}</div>
    `;
    div.addEventListener("click", async () => {
      await selectItem(it);
    });
    el.appendChild(div);
  });
}

/* -----------------------------
 * 주변 불러오기: 내 위치가 아니라 "지도 중심" 기준
 * ----------------------------- */
async function loadNearby(){
  const radius = Math.max(500, Number($("radius").value || 5000));
  const region = $("regionSelect").value;
  const q = ($("qInput").value || "").trim().toLowerCase();
  const types = getSelectedContentTypes();

  const center = state.map.getCenter();
  const lat = center.getLat();
  const lng = center.getLng();

  debug("주변 데이터 불러오는 중...");

  let all = [];
  for(const ctype of types){
    const params = {
      ...baseParams(),
      mapX: lng,
      mapY: lat,
      radius,
      contentTypeId: ctype,
      numOfRows: 80,
      pageNo: 1,
    };
    const json = await fetchJson(buildUrl(TOUR.ops.location, params));
    all.push(...normalizeItems(json));
  }

  all = all.filter(it => {
    const ilat = Number(it.mapy);
    const ilng = Number(it.mapx);
    if(!Number.isFinite(ilat) || !Number.isFinite(ilng)) return false;
    return inRegion(ilat, ilng, region);
  });

  if(q) all = all.filter(it => String(it.title || "").toLowerCase().includes(q));

  const seen = new Set();
  const uniq = [];
  for(const it of all){
    const id = String(it.contentid || "");
    if(!id || seen.has(id)) continue;
    seen.add(id);
    uniq.push(it);
  }

  state.items = uniq;
  clearMarkers();
  renderMarkers();
  renderList();

  debug(`주변 ${state.items.length}건 불러옴`);
}

/* -----------------------------
 * 상세
 * ----------------------------- */
async function fetchDetails(contentId, contentTypeId){
  const commonParams = {
    ...baseParams(),
    contentId,
    defaultYN:"Y",
    firstImageYN:"Y",
    areacodeYN:"Y",
    catcodeYN:"Y",
    addrinfoYN:"Y",
    mapinfoYN:"Y",
    overviewYN:"Y",
  };
  const introParams = { ...baseParams(), contentId, contentTypeId: contentTypeId || "" };
  const infoParams  = { ...baseParams(), contentId, contentTypeId: contentTypeId || "" };

  const [commonR, introR, infoR] = await Promise.allSettled([
    fetchJson(buildUrl(TOUR.ops.detailCommon, commonParams)),
    fetchJson(buildUrl(TOUR.ops.detailIntro, introParams)),
    fetchJson(buildUrl(TOUR.ops.detailInfo, infoParams)),
  ]);

  return {
    common: extractItem(commonR),
    intro: extractItem(introR),
    info: extractItem(infoR),
  };
}

function extractItem(settled){
  if(settled.status !== "fulfilled") return null;
  const json = settled.value;
  const item = json?.response?.body?.items?.item ?? null;
  if(!item) return null;
  return Array.isArray(item) ? item[0] : item;
}

function pickText(v){ return stripTags(String(v || "")); }

function renderDetails(baseItem, details){
  const box = $("detailBox");
  const title = baseItem?.title || "";
  const addr = baseItem?.addr1 || "";
  const img = baseItem?.firstimage || baseItem?.firstimage2 || "";

  const common = details?.common || {};
  const intro = details?.intro || {};

  const openTime =
    intro.usetime || intro.usetimeculture || intro.usetimeleports || intro.opentime || "";

  const restDay =
    intro.restdate || intro.restdateculture || intro.restdateleports || "";

  const parking =
    intro.parking || intro.parkingculture || intro.parkingleports || "";

  const fee =
    intro.usefee || intro.usefeeculture || intro.usefeeleports || "";

  const homepage = pickText(common.homepage);
  const overview = pickText(common.overview);

  box.innerHTML = `
    <div class="detailHeader">
      <div class="detailTitle"><b>${escapeHtml(title)}</b></div>
      <div class="muted">${escapeHtml(addr)}</div>
    </div>

    ${img ? `<img class="detailImg" src="${escapeHtml(img)}" alt="image" />` : ""}

    <div class="detailGrid">
      <div class="detailRow"><span class="k">운영시간</span><span class="v">${escapeHtml(pickText(openTime) || "정보없음")}</span></div>
      <div class="detailRow"><span class="k">휴무</span><span class="v">${escapeHtml(pickText(restDay) || "정보없음")}</span></div>
      <div class="detailRow"><span class="k">주차</span><span class="v">${escapeHtml(pickText(parking) || "정보없음")}</span></div>
      <div class="detailRow"><span class="k">요금</span><span class="v">${escapeHtml(pickText(fee) || "정보없음")}</span></div>
    </div>

    ${homepage ? `<div class="muted" style="margin-top:8px">홈페이지: ${escapeHtml(homepage)}</div>` : ""}
    ${overview ? `<div class="detailOverview">${escapeHtml(overview).slice(0, 600)}${overview.length>600?"...":""}</div>` : ""}
  `;

  injectDetailCssOnce();
}

let detailCssInjected = false;
function injectDetailCssOnce(){
  if(detailCssInjected) return;
  detailCssInjected = true;
  const style = document.createElement("style");
  style.textContent = `
    .detailHeader{display:flex;flex-direction:column;gap:6px}
    .detailTitle{font-size:13px}
    .detailImg{width:100%;border-radius:12px;border:1px solid rgba(255,255,255,.10)}
    .detailGrid{display:flex;flex-direction:column;gap:8px;margin-top:10px}
    .detailRow{display:flex;gap:10px;align-items:flex-start}
    .detailRow .k{width:72px;color:var(--muted);font-size:12px}
    .detailRow .v{flex:1;font-size:12px;line-height:1.45}
    .detailOverview{margin-top:10px;font-size:12px;line-height:1.6;opacity:.95}
  `;
  document.head.appendChild(style);
}

/* -----------------------------
 * 마커/목록
 * ----------------------------- */
function clearMarkers(){
  state.markers.forEach(m => m.setMap(null));
  state.markers = [];
}

function renderMarkers(){
  if(!state.map) return;

  state.items.forEach(it => {
    const lat = Number(it.mapy);
    const lng = Number(it.mapx);
    if(!Number.isFinite(lat) || !Number.isFinite(lng)) return;

    const marker = new kakao.maps.Marker({ position: new kakao.maps.LatLng(lat, lng) });
    marker.setMap(state.map);

    kakao.maps.event.addListener(marker, "click", async () => {
      await selectItem(it);
    });

    state.markers.push(marker);
  });
}

function renderList(){
  const el = $("list");
  el.innerHTML = "";

  if(state.items.length === 0){
    el.innerHTML = `<div class="muted">아직 불러온 데이터가 없어요.</div>`;
    return;
  }

  state.items.forEach(it => {
    const div = document.createElement("div");
    div.className = "item";
    div.innerHTML = `
      <div class="top">
        <b>${escapeHtml(it.title || "(제목없음)")}</b>
        <span class="badge">type ${escapeHtml(it.contenttypeid || "")}</span>
      </div>
      <div class="muted">${escapeHtml(it.addr1 || "")}</div>
    `;
    div.addEventListener("click", async () => await selectItem(it));
    el.appendChild(div);
  });
}

async function selectItem(it){
  state.selected = it;

  const lat = Number(it.mapy);
  const lng = Number(it.mapx);
  if(Number.isFinite(lat) && Number.isFinite(lng)){
    state.map.panTo(new kakao.maps.LatLng(lat, lng));
  }

  debug("상세 정보 불러오는 중...");
  try{
    const details = await fetchDetails(String(it.contentid), String(it.contenttypeid || ""));
    renderDetails(it, details);
    debug("상세 정보 표시 완료.");
  }catch(e){
    console.error(e);
    $("detailBox").innerHTML = `<div class="muted">상세 정보 로드 실패: ${escapeHtml(e.message)}</div>`;
    debug(`상세 로드 실패: ${e.message}`);
  }
}

/* -----------------------------
 * 코스 추천 (기존 로직 유지)
 * ----------------------------- */
function companionKey(){
  const v = $("companionSelect").value;
  if(v === "KID") return "kid";
  if(v === "COUPLE") return "couple";
  if(v === "FRIEND") return "friend";
  return "solo";
}
function scoreItem(it, companion){
  const title = String(it.title || "").toLowerCase();
  const ctype = String(it.contenttypeid || "");
  let score = 0;

  const heritageHint = /(궁|성곽|성|사적|유적|문화재|박물관|기념관|전시|세계유산|전통|한옥)/.test(title);
  if(heritageHint) score += 25;
  if(ctype === "14") score += 12;
  if(ctype === "12") score += 8;

  if(companion === "kid"){
    if(/체험|키즈|어린이|과학관|아쿠아|동물/.test(title)) score += 25;
  }
  if(companion === "couple"){
    if(/야경|산책|공원|전망|드라이브|해변|카페/.test(title)) score += 18;
  }
  if(companion === "friend"){
    if(/전시|시장|거리|페스티벌|축제/.test(title)) score += 12;
  }
  if(companion === "solo"){
    if(/역사|박물관|기념관|전시/.test(title)) score += 14;
  }
  if(it.addr1) score += 3;
  return score;
}
function estStay(it){
  const ctype = String(it.contenttypeid || "");
  const t = String(it.title || "");
  if(ctype === "14" || /(박물관|기념관|전시|미술관|과학관)/.test(t)) return 90;
  if(ctype === "12") return 60;
  return 45;
}
function haversineKm(aLat, aLng, bLat, bLng){
  const R = 6371;
  const toRad = d => d * Math.PI / 180;
  const dLat = toRad(bLat - aLat);
  const dLng = toRad(bLng - aLng);
  const s1 = Math.sin(dLat/2), s2 = Math.sin(dLng/2);
  const aa = s1*s1 + Math.cos(toRad(aLat))*Math.cos(toRad(bLat))*s2*s2;
  return 2 * R * Math.asin(Math.sqrt(aa));
}
function estimateTravelMinutesKm(km){
  const speed = 30;
  return Math.round((km / speed) * 60);
}

function clearPolyline(){
  if(state.polyline){
    state.polyline.setMap(null);
    state.polyline = null;
  }
}
function drawCoursePolyline(){
  clearPolyline();
  if(!state.map || state.course.length < 2) return;

  const path = [
    new kakao.maps.LatLng(state.currentPos.lat, state.currentPos.lng),
    ...state.course.map(it => new kakao.maps.LatLng(Number(it.mapy), Number(it.mapx)))
  ];
  state.polyline = new kakao.maps.Polyline({
    path,
    strokeWeight: 4,
    strokeOpacity: 0.9,
    strokeStyle: "solid"
  });
  state.polyline.setMap(state.map);
}

function buildCourse(){
  if(state.items.length === 0){
    debug("먼저 주변 데이터를 불러와야 코스를 만들 수 있어.");
    return;
  }
  const companion = companionKey();
  const total = Math.max(60, Number($("totalMinutes").value || 240));

  const scored = state.items
    .map(it => ({ it, score: scoreItem(it, companion) }))
    .sort((a,b) => b.score - a.score)
    .slice(0, 40);

  let remain = total;
  const picks = [];
  for(const {it} of scored){
    const stay = estStay(it);
    if(picks.length === 0){
      picks.push({it, stay});
      remain -= stay;
      continue;
    }
    if(picks.length >= 6) break;
    if(remain - stay < 30) continue;
    picks.push({it, stay});
    remain -= stay;
    if(picks.length >= 3 && remain <= 30) break;
  }

  const ordered = [];
  let cur = { lat: state.currentPos.lat, lng: state.currentPos.lng };
  const left = [...picks];
  while(left.length){
    let bestIdx = 0;
    let bestDist = Infinity;
    for(let i=0;i<left.length;i++){
      const it = left[i].it;
      const lat = Number(it.mapy), lng = Number(it.mapx);
      const d = haversineKm(cur.lat, cur.lng, lat, lng);
      if(d < bestDist){ bestDist = d; bestIdx = i; }
    }
    const next = left.splice(bestIdx,1)[0];
    ordered.push(next);
    cur = { lat: Number(next.it.mapy), lng: Number(next.it.mapx) };
  }

  let travelKm = 0;
  cur = { lat: state.currentPos.lat, lng: state.currentPos.lng };
  for(const p of ordered){
    const lat = Number(p.it.mapy), lng = Number(p.it.mapx);
    travelKm += haversineKm(cur.lat, cur.lng, lat, lng);
    cur = { lat, lng };
  }
  const travelMin = estimateTravelMinutesKm(travelKm);
  const stayMin = ordered.reduce((a,p)=>a+p.stay,0);
  const totalEst = travelMin + stayMin;

  state.course = ordered.map(p => ({ ...p.it, _stay: p.stay }));
  renderCourse({ travelKm, travelMin, stayMin, totalEst, budget: total });
  drawCoursePolyline();

  if(state.course.length > 0){
    const bounds = new kakao.maps.LatLngBounds();
    bounds.extend(new kakao.maps.LatLng(state.currentPos.lat, state.currentPos.lng));
    state.course.forEach(it => bounds.extend(new kakao.maps.LatLng(Number(it.mapy), Number(it.mapx))));
    state.map.setBounds(bounds);
  }

  debug("코스 생성 완료.");
}

function renderCourse(meta){
  const summary = $("courseSummary");
  const list = $("courseList");
  list.innerHTML = "";

  if(state.course.length === 0){
    summary.textContent = "아직 코스가 없어요.";
    return;
  }

  summary.textContent =
    `선택 ${state.course.length}곳 · 체류 ${meta.stayMin}분 + 이동 ${meta.travelMin}분(약 ${meta.travelKm.toFixed(1)}km) = 총 ${meta.totalEst}분 / 예산 ${meta.budget}분`;

  state.course.forEach((it, idx) => {
    const div = document.createElement("div");
    div.className = "item";
    div.innerHTML = `
      <div class="top">
        <b>${idx+1}. ${escapeHtml(it.title || "")}</b>
        <span class="badge">stay ${escapeHtml(it._stay)}m</span>
      </div>
      <div class="muted">${escapeHtml(it.addr1 || "")}</div>
    `;
    div.addEventListener("click", async () => await selectItem(it));
    list.appendChild(div);
  });
}

function clearCourse(){
  state.course = [];
  $("courseSummary").textContent = "아직 코스가 없어요.";
  $("courseList").innerHTML = "";
  clearPolyline();
  debug("코스 비움.");
}

function clearAll(){
  clearMarkers();
  state.items = [];
  state.selected = null;
  $("list").innerHTML = `<div class="muted">아직 불러온 데이터가 없어요.</div>`;
  $("detailBox").innerHTML = `<div class="muted">아직 선택된 장소가 없어요.</div>`;
  clearCourse();
  debug("초기화 완료.");
}

// ---- Events ----
function bindEvents(){
  $("loadBtn").addEventListener("click", async () => {
    try{ await loadNearby(); }catch(e){ console.error(e); debug(`주변 로드 실패: ${e.message}`); }
  });
  $("clearBtn").addEventListener("click", clearAll);

  $("buildCourseBtn").addEventListener("click", buildCourse);
  $("clearCourseBtn").addEventListener("click", clearCourse);

  $("toggleWmsBtn").addEventListener("click", () => {
    state.wmsOn = !state.wmsOn;
    $("wmsOverlay").style.display = state.wmsOn ? "block" : "none";
    if(state.wmsOn) updateWmsOverlay();
    debug(`WMS ${state.wmsOn ? "ON" : "OFF"}`);
  });

  $("locBtn").addEventListener("click", moveToMyLocation);
  $("refreshPicksBtn").addEventListener("click", () => loadTodayPicks().catch(e => debug(`추천 실패: ${e.message}`)));

  $("qInput").addEventListener("keydown", (e) => {
    if(e.key === "Enter") $("loadBtn").click();
  });

  bindChips();
}

// ---- Boot ----
kakao.maps.load(() => {
  initMap();
  bindEvents();
  clearAll();

  setupMapRelayoutOnScroll();   // ✅ 추가

  loadTodayPicks().catch(e => {
    console.error(e);
    debug(`추천 로드 실패: ${e.message}`);
  });

  debug("준비됨. (추천 먼저 로드됨)");
});


  // ✅ 앱 시작 시 추천 10개 먼저 로드
  loadTodayPicks().catch(e => {
    console.error(e);
    debug(`추천 로드 실패: ${e.message}`);
  });

  debug("준비됨. (추천 먼저 로드됨)");

  function setupMapRelayoutOnScroll(){
  const el = document.querySelector(".mapWrap");
  if(!el || !window.IntersectionObserver) return;

  const io = new IntersectionObserver((entries) => {
    for (const e of entries){
      if(e.isIntersecting && state.map){
        // 지도 컨테이너가 화면에 들어오면 레이아웃 갱신
        state.map.relayout();
        if(state.wmsOn) updateWmsOverlay();
      }
    }
  }, { threshold: 0.15 });

  io.observe(el);
}

});
