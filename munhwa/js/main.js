/****************************************************
 * js/main.js (FULL WORKING)
 ****************************************************/

/** ✅ 너 serviceKey를 여기에 넣어 */
const TOUR_SERVICE_KEY = "YOUR_TOURAPI_KEY_HERE";

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
    searchKeyword: "/searchKeyword1",
    location: "/locationBasedList1",
    detailCommon: "/detailCommon1",
    detailIntro: "/detailIntro1",
    detailInfo: "/detailInfo1",
  }
};

const $ = (id) => document.getElementById(id);
const status = (msg) => { const el = $("debug"); if(el) el.textContent = msg; };

function escapeHtml(s){
  return String(s ?? "")
    .replaceAll("&","&amp;")
    .replaceAll("<","&lt;")
    .replaceAll(">","&gt;")
    .replaceAll('"',"&quot;")
    .replaceAll("'","&#039;");
}
function stripTags(html){
  return String(html || "").replace(/<[^>]*>/g, " ").replace(/\s+/g," ").trim();
}

// proj4 defs
const PROJ_UTMK = "+proj=tmerc +lat_0=38 +lon_0=127.5 +k=0.9996 +x_0=1000000 +y_0=2000000 +ellps=GRS80 +units=m +no_defs";
proj4.defs("EPSG:9020203", PROJ_UTMK);
proj4.defs("EPSG:4326", "+proj=longlat +datum=WGS84 +no_defs");

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

// -------- TourAPI helpers --------
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
  const json = await res.json();

  const code = json?.response?.header?.resultCode;
  const msg  = json?.response?.header?.resultMsg;
  if(code && code !== "0000"){
    throw new Error(`TourAPI ${code}: ${msg || "Unknown error"}`);
  }
  return json;
}
function normalizeItems(json){
  const items = json?.response?.body?.items?.item ?? [];
  return Array.isArray(items) ? items : (items ? [items] : []);
}
function pickRandom(arr, n){
  const copy = [...arr];
  for(let i = copy.length - 1; i > 0; i--){
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy.slice(0, n);
}

// -------- Region (MVP 박스) --------
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

// -------- Chips --------
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

// -------- Map init + WMS overlay --------
function initMap(){
  const center = new kakao.maps.LatLng(state.currentPos.lat, state.currentPos.lng);
  state.map = new kakao.maps.Map($("map"), { center, level: 7 });
  state.info = new kakao.maps.InfoWindow({ removable: true });
  state.wmsImg = $("wmsOverlay");

  kakao.maps.event.addListener(state.map, "idle", () => {
    if(!state.wmsOn) return;
    if(state.wmsTimer) clearTimeout(state.wmsTimer);
    state.wmsTimer = setTimeout(updateWmsOverlay, 120);
  });

  updateWmsOverlay();
  status("지도 준비됨");
}

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

function setupMapRelayoutOnScroll(){
  const el = document.querySelector(".mapWrap");
  if(!el || !window.IntersectionObserver) return;

  const io = new IntersectionObserver((entries) => {
    for(const e of entries){
      if(e.isIntersecting && state.map){
        state.map.relayout();
        if(state.wmsOn) updateWmsOverlay();
      }
    }
  }, { threshold: 0.15 });

  io.observe(el);
}

// -------- Geo --------
function moveToMyLocation(){
  if(!navigator.geolocation){
    status("이 브라우저는 위치 권한을 지원하지 않음");
    return;
  }
  navigator.geolocation.getCurrentPosition(
    (pos) => {
      state.currentPos = { lat: pos.coords.latitude, lng: pos.coords.longitude };
      state.map.setCenter(new kakao.maps.LatLng(state.currentPos.lat, state.currentPos.lng));
      status(`내 위치: ${state.currentPos.lat.toFixed(5)}, ${state.currentPos.lng.toFixed(5)}`);
    },
    (err) => status(`위치 실패: ${err.message}`),
    { enableHighAccuracy: true, timeout: 8000 }
  );
}

// -------- Today Picks (무조건 뜨는 방식) --------
async function loadTodayPicks(){
  const picksEl = $("picksList");
  if(picksEl) picksEl.innerHTML = `<div class="muted">추천 불러오는 중...</div>`;
  status("오늘의 추천 불러오는 중...");

  const keywords = ["문화유산","박물관","고궁","성곽","유적","전통","한옥","사찰","정원","왕릉"];
  const keyword = keywords[Math.floor(Math.random() * keywords.length)];

  try{
    const json = await fetchJson(buildUrl(TOUR.ops.searchKeyword, {
      ...baseParams(),
      keyword,
      numOfRows: 200,
      pageNo: 1,
      arrange: "A",
    }));
    const items = normalizeItems(json);

    const filtered = items.filter(it =>
      /(궁|성곽|성|유적|문화|박물관|기념관|전통|한옥|세계|사찰|정원|왕릉|문화재)/.test(String(it.title || ""))
    );
    const pool = filtered.length >= 10 ? filtered : items;
    const picks = pickRandom(pool, Math.min(10, pool.length));
    picks.forEach(p => p._pickAreaName = p.addr1 ? String(p.addr1).split(" ")[0] : "추천");

    renderPicks(picks);
    status(`추천 ${picks.length}개 완료 (키워드: ${keyword})`);
  }catch(e){
    console.error(e);
    if(picksEl) picksEl.innerHTML = `<div class="muted">추천 실패: ${escapeHtml(e.message)}</div>`;
    status(`추천 실패: ${e.message}`);
  }
}

function renderPicks(items){
  const el = $("picksList");
  if(!el) return;
  el.innerHTML = "";

  if(items.length === 0){
    el.innerHTML = `<div class="muted">추천 결과가 없어요.</div>`;
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
    div.addEventListener("click", async () => selectItem(it));
    el.appendChild(div);
  });
}

// -------- Nearby (map center based) --------
async function loadNearby(){
  const radius = Math.max(500, Number($("radius")?.value || 5000));
  const region = $("regionSelect")?.value || "ALL";
  const q = ($("qInput")?.value || "").trim().toLowerCase();
  const types = getSelectedContentTypes();

  const center = state.map.getCenter();
  const lat = center.getLat();
  const lng = center.getLng();

  status("주변 데이터 불러오는 중...");

  try{
    let all = [];
    for(const ctype of types){
      const json = await fetchJson(buildUrl(TOUR.ops.location, {
        ...baseParams(),
        mapX: lng,
        mapY: lat,
        radius,
        contentTypeId: ctype,
        numOfRows: 80,
        pageNo: 1,
      }));
      all.push(...normalizeItems(json));
    }

    all = all.filter(it => {
      const ilat = Number(it.mapy);
      const ilng = Number(it.mapx);
      if(!Number.isFinite(ilat) || !Number.isFinite(ilng)) return false;
      return inRegion(ilat, ilng, region);
    });

    if(q) all = all.filter(it => String(it.title||"").toLowerCase().includes(q));

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

    status(`주변 ${state.items.length}건 완료`);
  }catch(e){
    console.error(e);
    status(`주변 실패: ${e.message}`);
  }
}

// -------- Details --------
async function fetchDetails(contentId, contentTypeId){
  const [commonR, introR, infoR] = await Promise.allSettled([
    fetchJson(buildUrl(TOUR.ops.detailCommon, {
      ...baseParams(),
      contentId,
      defaultYN:"Y",
      firstImageYN:"Y",
      areacodeYN:"Y",
      catcodeYN:"Y",
      addrinfoYN:"Y",
      mapinfoYN:"Y",
      overviewYN:"Y",
    })),
    fetchJson(buildUrl(TOUR.ops.detailIntro, {
      ...baseParams(),
      contentId,
      contentTypeId: contentTypeId || "",
    })),
    fetchJson(buildUrl(TOUR.ops.detailInfo, {
      ...baseParams(),
      contentId,
      contentTypeId: contentTypeId || "",
    })),
  ]);

  const extract = (settled) => {
    if(settled.status !== "fulfilled") return null;
    const item = settled.value?.response?.body?.items?.item ?? null;
    if(!item) return null;
    return Array.isArray(item) ? item[0] : item;
  };

  return { common: extract(commonR), intro: extract(introR), info: extract(infoR) };
}

function renderDetails(baseItem, details){
  const box = $("detailBox");
  if(!box) return;

  const title = baseItem?.title || "";
  const addr = baseItem?.addr1 || "";
  const img = baseItem?.firstimage || baseItem?.firstimage2 || "";

  const common = details?.common || {};
  const intro = details?.intro || {};

  const openTime = intro.usetime || intro.usetimeculture || intro.usetimeleports || intro.opentime || "";
  const restDay  = intro.restdate || intro.restdateculture || intro.restdateleports || "";
  const parking  = intro.parking || intro.parkingculture || intro.parkingleports || "";
  const fee      = intro.usefee || intro.usefeeculture || intro.usefeeleports || "";
  const homepage = stripTags(common.homepage || "");
  const overview = stripTags(common.overview || "");

  box.innerHTML = `
    <div class="detailHeader">
      <div class="detailTitle"><b>${escapeHtml(title)}</b></div>
      <div class="muted">${escapeHtml(addr)}</div>
    </div>

    ${img ? `<img class="detailImg" src="${escapeHtml(img)}" alt="image" />` : ""}

    <div class="detailGrid">
      <div class="detailRow"><span class="k">운영시간</span><span class="v">${escapeHtml(stripTags(openTime) || "정보없음")}</span></div>
      <div class="detailRow"><span class="k">휴무</span><span class="v">${escapeHtml(stripTags(restDay) || "정보없음")}</span></div>
      <div class="detailRow"><span class="k">주차</span><span class="v">${escapeHtml(stripTags(parking) || "정보없음")}</span></div>
      <div class="detailRow"><span class="k">요금</span><span class="v">${escapeHtml(stripTags(fee) || "정보없음")}</span></div>
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

// -------- Markers & List --------
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
    kakao.maps.event.addListener(marker, "click", async () => selectItem(it));
    state.markers.push(marker);
  });
}

function renderList(){
  const el = $("list");
  if(!el) return;
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
    div.addEventListener("click", async () => selectItem(it));
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

  status("상세 불러오는 중...");
  try{
    const details = await fetchDetails(String(it.contentid), String(it.contenttypeid || ""));
    renderDetails(it, details);
    status("상세 표시 완료");
  }catch(e){
    console.error(e);
    $("detailBox").innerHTML = `<div class="muted">상세 실패: ${escapeHtml(e.message)}</div>`;
    status(`상세 실패: ${e.message}`);
  }
}

// -------- Course --------
function companionKey(){
  const v = $("companionSelect")?.value || "SOLO";
  if(v === "KID") return "kid";
  if(v === "COUPLE") return "couple";
  if(v === "FRIEND") return "friend";
  return "solo";
}
function scoreItem(it, companion){
  const title = String(it.title || "").toLowerCase();
  const ctype = String(it.contenttypeid || "");
  let score = 0;

  if(/(궁|성곽|성|사적|유적|문화재|박물관|기념관|전시|세계유산|전통|한옥)/.test(title)) score += 25;
  if(ctype === "14") score += 12;
  if(ctype === "12") score += 8;

  if(companion === "kid" && /체험|키즈|어린이|과학관|아쿠아|동물/.test(title)) score += 25;
  if(companion === "couple" && /야경|산책|공원|전망|드라이브|해변|카페/.test(title)) score += 18;
  if(companion === "friend" && /전시|시장|거리|페스티벌|축제/.test(title)) score += 12;
  if(companion === "solo" && /역사|박물관|기념관|전시/.test(title)) score += 14;

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

function renderCourse(meta){
  const summary = $("courseSummary");
  const list = $("courseList");
  if(!summary || !list) return;

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
    div.addEventListener("click", async () => selectItem(it));
    list.appendChild(div);
  });
}

function buildCourse(){
  if(state.items.length === 0){
    status("먼저 주변 데이터를 불러와야 코스를 만들 수 있어요");
    return;
  }

  const companion = companionKey();
  const total = Math.max(60, Number($("totalMinutes")?.value || 240));

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

  // nearest ordering from currentPos
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

  status("코스 생성 완료");
}

function clearCourse(){
  state.course = [];
  clearPolyline();
  if ($("courseSummary")) $("courseSummary").textContent = "아직 코스가 없어요.";
  if ($("courseList")) $("courseList").innerHTML = "";
  status("코스 비움");
}

function clearAll(){
  clearMarkers();
  state.items = [];
  state.selected = null;

  if ($("list")) $("list").innerHTML = `<div class="muted">아직 불러온 데이터가 없어요.</div>`;
  if ($("detailBox")) $("detailBox").innerHTML = `<div class="muted">아직 선택된 장소가 없어요.</div>`;

  clearCourse();
  status("초기화 완료");
}

// -------- Events --------
function bindEvents(){
  $("refreshPicksBtn")?.addEventListener("click", loadTodayPicks);
  $("loadBtn")?.addEventListener("click", loadNearby);
  $("clearBtn")?.addEventListener("click", clearAll);

  $("buildCourseBtn")?.addEventListener("click", buildCourse);
  $("clearCourseBtn")?.addEventListener("click", clearCourse);

  $("toggleWmsBtn")?.addEventListener("click", () => {
    state.wmsOn = !state.wmsOn;
    $("wmsOverlay").style.display = state.wmsOn ? "block" : "none";
    if(state.wmsOn) updateWmsOverlay();
    status(`WMS ${state.wmsOn ? "ON" : "OFF"}`);
  });

  $("locBtn")?.addEventListener("click", moveToMyLocation);

  $("qInput")?.addEventListener("keydown", (e) => {
    if(e.key === "Enter") loadNearby();
  });

  bindChips();
}

// ✅ Boot: kakao.maps.load는 딱 1번만
kakao.maps.load(() => {
  initMap();
  bindEvents();
  clearAll();
  setupMapRelayoutOnScroll();
  loadTodayPicks();
});
