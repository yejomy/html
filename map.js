// ✅ 검색 키워드
const SEARCH_KEYS = ["애월", "남원", "성산"];

// ====== 코스 데이터 ======
const COURSES = {
  east: [
    {
      id: "e1",
      title: "성산일출봉 → 섭지코지 해안 코스",
      desc: "풍경/바다/사진맛 코스. 바람 좋은 날 추천!",
      level: "중",
      tags: ["성산", "해안", "사진"],
      image: "./images/location1.jpg",
      start: { name: "성산일출봉", lat: 33.4588, lng: 126.9423 },
      end: { name: "섭지코지", lat: 33.4241, lng: 126.9270 },
    },
    {
      id: "e2",
      title: "월정리 → 김녕 해변 라이드",
      desc: "초보도 부담 없는 평지 위주 해변길",
      level: "하",
      tags: ["월정리", "카페", "평지"],
      image: "./images/location2.jpg",
      start: { name: "월정리", lat: 33.5569, lng: 126.7959 },
      end: { name: "김녕", lat: 33.5577, lng: 126.7592 },
    },
    {
      id: "e3",
      title: "표선 → 남원 바닷길",
      desc: "긴 직선 바닷길 + 노을 예쁨",
      level: "중",
      tags: ["표선", "남원", "노을", "장거리"],
      image: "./images/location3.jpg",
      start: { name: "표선", lat: 33.3266, lng: 126.8327 },
      end: { name: "남원", lat: 33.2803, lng: 126.7198 },
    },
  ],
  west: [
    {
      id: "w1",
      title: "한림 → 애월 카페 로드",
      desc: "카페/포토스팟 많은 인기 구간",
      level: "중",
      tags: ["애월", "카페", "핫플"],
      image: "./images/location4.jpg",
      start: { name: "한림", lat: 33.4091, lng: 126.2580 },
      end: { name: "애월", lat: 33.4629, lng: 126.3111 },
    },
    {
      id: "w2",
      title: "협재 → 금능 해변 코스",
      desc: "물색 미친 구간. 쉬엄쉬엄 가도 최고",
      level: "하",
      tags: ["협재", "바다", "휴식"],
      image: "./images/location5.jpg",
      start: { name: "협재", lat: 33.3943, lng: 126.2397 },
      end: { name: "금능", lat: 33.3906, lng: 126.2276 },
    },
  ],
};

let region = "east";

// ✅ 카카오 지도 관련 전역
let map;
let routeLine;
let startMarker;
let endMarker;
let meMarker;
let selectedCourse = null;

const $ = (sel) => document.querySelector(sel);
const norm = (s) => String(s || "").trim().toLowerCase();

// ===== 공통 유틸 =====
function kmFromHaversine(a, b) {
  const R = 6371;
  const toRad = (d) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const s1 = Math.sin(dLat / 2);
  const s2 = Math.sin(dLng / 2);
  const q =
    s1 * s1 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * s2 * s2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(q)));
}

function formatTime(hours) {
  const totalMin = Math.max(1, Math.round(hours * 60));
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  if (h <= 0) return `${m}분`;
  return `${h}시간 ${m}분`;
}

function setRouteCard(course, km, speedKmh) {
  $("#routeTitle").textContent = course ? course.title : "코스를 선택해 주세요";
  $("#routeRegion").textContent = region === "east" ? "동부" : "서부";
  $("#routeKm").textContent = course ? `${km.toFixed(1)}km` : "-";
  $("#routeTime").textContent = course ? formatTime(km / speedKmh) : "-";
  $("#routeLevel").textContent = course ? course.level : "-";
  $("#routeHint").textContent = course
    ? `${course.start.name} → ${course.end.name} (속도 ${speedKmh}km/h 기준)`
    : "코스 카드 클릭 → 지도에 루트 표시";

  const navBtn = $("#routeNavBtn");
  if (navBtn) {
    navBtn.disabled = !course;
  }
}

function setRegion(next, { silent = false } = {}) {
  region = next;

  document.querySelectorAll(".seg__btn").forEach((b) => {
    const active = b.dataset.region === region;
    b.classList.toggle("is-active", active);
    b.setAttribute("aria-selected", active ? "true" : "false");
  });

  $("#routeRegion").textContent = region === "east" ? "동부" : "서부";
  if (!silent) renderCards();
}

function findKeyFromQuery(q) {
  const qq = norm(q);
  if (!qq) return null;
  for (const k of SEARCH_KEYS) {
    if (qq.startsWith(norm(k))) return k;
  }
  return null;
}

function allCoursesWithRegion() {
  return [
    ...COURSES.east.map((c) => ({ ...c, __region: "east" })),
    ...COURSES.west.map((c) => ({ ...c, __region: "west" })),
  ];
}

function renderCards() {
  const qRaw = $("#q").value || "";
  const key = findKeyFromQuery(qRaw);

  let items = [];
  let note = "";

  if (key) {
    const kk = norm(key);
    items = allCoursesWithRegion().filter((c) => {
      const blob = norm(
        `${c.title} ${c.desc} ${c.tags.join(" ")} ${c.start.name} ${c.end.name}`
      );
      return blob.includes(kk);
    });

    if (items[0]?.__region && items[0].__region !== region) {
      setRegion(items[0].__region, { silent: true });
    }
  } else {
    const qq = norm(qRaw);
    if (qq && !SEARCH_KEYS.some((k) => norm(k) === qq)) {
      note = " · 검색은 (애월/남원/성산)만 지원";
    }
    items = COURSES[region].map((c) => ({ ...c, __region: region }));
  }

  $("#countLabel").textContent = `${items.length}개${note}`;

  const wrap = $("#cards");
  wrap.innerHTML = "";

  items.forEach((c) => {
    const km = kmFromHaversine(c.start, c.end);
    const speedKmh = Number($("#speed").value || 18);
    const hasImg = !!c.image;

    const el = document.createElement("article");
    el.className = "course";
    el.dataset.id = c.id;

    el.innerHTML = `
      <div class="course__media">
        ${hasImg ? `<img src="${c.image}" alt="" loading="lazy" decoding="async" onerror="this.style.display='none'">` : ""}
      </div>

      <div class="course__body">
        <div class="course__left">
          <h3 class="course__title">${c.title}</h3>
          <p class="course__desc">${c.desc}</p>
          <div class="course__tags">
            ${c.tags.map((t) => `<span class="tag">#${t}</span>`).join("")}
          </div>
        </div>

        <div class="course__right">
          <span class="pill">${c.level}</span>
          <div class="small">${km.toFixed(1)}km · ${formatTime(km / speedKmh)}</div>
        </div>
      </div>
    `;

    el.addEventListener("click", () => selectCourse(c));
    wrap.appendChild(el);
  });
}

// ===== 카카오 지도 =====
function ensureMap() {
  if (map) return;

  const container = document.getElementById("map");
  map = new kakao.maps.Map(container, {
    center: new kakao.maps.LatLng(33.3617, 126.5292),
    level: 9,
  });

  const zoomControl = new kakao.maps.ZoomControl();
  map.addControl(zoomControl, kakao.maps.ControlPosition.RIGHT);
}

function clearRoute() {
  if (routeLine) {
    routeLine.setMap(null);
    routeLine = null;
  }
}

function setMarkers(course) {
  if (startMarker) startMarker.setMap(null);
  if (endMarker) endMarker.setMap(null);

  startMarker = new kakao.maps.Marker({
    position: new kakao.maps.LatLng(course.start.lat, course.start.lng),
    map,
  });

  endMarker = new kakao.maps.Marker({
    position: new kakao.maps.LatLng(course.end.lat, course.end.lng),
    map,
  });

  const iw1 = new kakao.maps.InfoWindow({
    content: `<div style="padding:4px 8px;font-size:12px;">출발: ${course.start.name}</div>`,
  });
  const iw2 = new kakao.maps.InfoWindow({
    content: `<div style="padding:4px 8px;font-size:12px;">도착: ${course.end.name}</div>`,
  });

  iw1.open(map, startMarker);
  iw2.open(map, endMarker);
}

function attachRouteClickToKakaoMap() {
  if (!routeLine || !selectedCourse) return;

  kakao.maps.event.addListener(routeLine, "click", () => {
    openKakaoRoutePage(selectedCourse);
  });
}

// 지도에 그냥 직선이라도 그리는 fallback
function drawFallbackLine(start, end) {
  clearRoute();

  const path = [
    new kakao.maps.LatLng(start.lat, start.lng),
    new kakao.maps.LatLng(end.lat, end.lng),
  ];

  routeLine = new kakao.maps.Polyline({
    path,
    map,
    strokeWeight: 5,
    strokeOpacity: 0.9,
    strokeColor: "#ff7a00",
  });

  const bounds = new kakao.maps.LatLngBounds();
  path.forEach((p) => bounds.extend(p));
  map.setBounds(bounds);

  // 직선 경로라도 클릭하면 상세 길찾기 열리도록
  attachRouteClickToKakaoMap();
}

// ✅ 카카오 모빌리티 길찾기 API (자전거)
async function drawRouteKakao(start, end) {
  clearRoute();

  const url = "https://apis-navi.kakaomobility.com/v1/directions/bicycle";
  const params = new URLSearchParams({
    origin: `${start.lng},${start.lat}`,
    destination: `${end.lng},${end.lat}`,
  });

  const res = await fetch(`${url}?${params}`, {
    method: "GET",
    headers: {
      // 🔑 여기에 카카오 REST API 키 넣기 (KakaoAK {REST_KEY})
      Authorization: "KakaoAK YOUR_KAKAO_REST_API_KEY",
      "Content-Type": "application/json",
    },
  });

  if (!res.ok) throw new Error("kakao directions failed");

  const data = await res.json();
  const roads = data?.routes?.[0]?.sections?.[0]?.roads;
  if (!roads || !roads.length) {
    throw new Error("no route");
  }

  const path = [];
  roads.forEach((road) => {
    const v = road.vertexes;
    for (let i = 0; i < v.length; i += 2) {
      const lng = v[i];
      const lat = v[i + 1];
      path.push(new kakao.maps.LatLng(lat, lng));
    }
  });

  routeLine = new kakao.maps.Polyline({
    path,
    map,
    strokeWeight: 5,
    strokeOpacity: 0.9,
    strokeColor: "#ff7a00",
  });

  const bounds = new kakao.maps.LatLngBounds();
  path.forEach((p) => bounds.extend(p));
  map.setBounds(bounds);

  // 경로 자체를 탭하면 카카오맵 상세 길찾기 열리게
  attachRouteClickToKakaoMap();
}

// ✅ 카카오맵 웹/앱 상세 길찾기 페이지 열기
function openKakaoRoutePage(course) {
  const { start, end } = course;
  const url =
    `https://map.kakao.com/?` +
    `sName=${encodeURIComponent(start.name)}&` +
    `eName=${encodeURIComponent(end.name)}&` +
    `sX=${start.lng}&sY=${start.lat}&` +
    `eX=${end.lng}&eY=${end.lat}`;

  window.open(url, "_blank");
}

// ✅ 코스 선택 시: 카드/지도/경로/버튼 업데이트
async function selectCourse(course) {
  ensureMap();

  const courseRegion =
    course.__region ||
    (COURSES.east.some((c) => c.id === course.id) ? "east" : "west");
  if (courseRegion !== region) setRegion(courseRegion, { silent: true });

  const speedKmh = Number($("#speed").value || 18);
  const km = kmFromHaversine(course.start, course.end);

  selectedCourse = course;
  setRouteCard(course, km, speedKmh);
  setMarkers(course);

  try {
    await drawRouteKakao(course.start, course.end);
  } catch (e) {
    console.warn("카카오 길찾기 실패 → 직선 라인 표시", e);
    drawFallbackLine(course.start, course.end);
  }
}

// ✅ 내 위치 버튼
function locateMe() {
  ensureMap();

  if (!navigator.geolocation) {
    alert("이 브라우저는 위치 서비스를 지원하지 않아요.");
    return;
  }

  navigator.geolocation.getCurrentPosition(
    (pos) => {
      const { latitude, longitude } = pos.coords;

      if (meMarker) meMarker.setMap(null);

      meMarker = new kakao.maps.Marker({
        position: new kakao.maps.LatLng(latitude, longitude),
        map,
        zIndex: 999,
      });

      map.setCenter(new kakao.maps.LatLng(latitude, longitude));
      map.setLevel(6);
    },
    () => alert("위치 권한을 허용해 주세요."),
    { enableHighAccuracy: true, timeout: 8000 }
  );
}

// ✅ 하단 탭
function bindTabs() {
  document.querySelectorAll(".tabbar .tab").forEach((btn) => {
    btn.addEventListener("click", () => {
      const page = btn.dataset.page;
      if (page === "home") window.location.href = "./home.html";
      if (page === "commu") window.location.href = "./commu.html";
      if (page === "addr") window.location.href = "./location.html";
      if (page === "rank") window.location.href = "./rank.html";
      if (page === "my") window.location.href = "./my.html";
    });
  });
}

// ✅ 초기화
window.addEventListener("DOMContentLoaded", () => {
  document.querySelectorAll(".seg__btn").forEach((b) => {
    b.addEventListener("click", () => setRegion(b.dataset.region));
  });

  $("#q").addEventListener("input", renderCards);
  $("#q").addEventListener("change", renderCards);

  $("#speed").addEventListener("change", renderCards);
  $("#btnLocate").addEventListener("click", locateMe);

  bindTabs();
  ensureMap();

  const speedKmh = Number($("#speed").value || 18);
  setRouteCard(null, 0, speedKmh);
  renderCards();

  // 길찾기 버튼 → 카카오맵 상세 페이지
  const navBtn = $("#routeNavBtn");
  if (navBtn) {
    navBtn.addEventListener("click", () => {
      if (!selectedCourse) return;
      openKakaoRoutePage(selectedCourse);
    });
  }
});
